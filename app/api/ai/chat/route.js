import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// --- In-Memory Database Loading ---
function loadDatabase() {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'games_db.json');
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading games_db.json:', e);
  }
  return [];
}

function loadCustomKnowledge() {
  try {
    const ckPath = path.join(process.cwd(), 'data', 'custom_knowledge.json');
    if (fs.existsSync(ckPath)) {
      const data = fs.readFileSync(ckPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {}
  return [];
}

// --- Text Normalization & Dialogue Engine ---
function normalizeText(text) {
  if (!text) return '';
  let clean = text.toLowerCase();
  clean = clean.replace(/İ/g, 'i').replace(/I/g, 'ı').replace(/ı/g, 'i');
  clean = clean.replace(/[\u0300-\u036f]/g, '');
  const trMap = {
    'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
    'â': 'a', 'î': 'i', 'û': 'u', 'é': 'e'
  };
  return clean.split('').map(c => trMap[c] || c).join('');
}

// --- Hardware Compatibility Estimator ---
function estimateHardware(game, userGpu) {
  if (!userGpu) return null;
  const gpuNorm = normalizeText(userGpu);
  let tier = 2;
  
  if (/rtx\s*40\d\d|rtx\s*3080|rtx\s*3090|rx\s*7\d00|rx\s*6800|rx\s*6900/.test(gpuNorm)) tier = 4;
  else if (/rtx\s*30\d\d|rtx\s*20\d\d|rx\s*6600|rx\s*6700|gtx\s*1080/.test(gpuNorm)) tier = 3;
  else if (/gtx\s*16\d\d|gtx\s*1060|rx\s*580|rx\s*570|gtx\s*1050\s*ti/.test(gpuNorm)) tier = 2;
  else if (/gtx\s*750|gtx\s*950|intel\s*iris|intel\s*uhd|vega/.test(gpuNorm)) tier = 1;
  else if (/gt\s*710|gt\s*730|hd\s*graphics/.test(gpuNorm)) tier = 0;

  const reqGpu = normalizeText(game.req_gpu || game.title);
  const isDemanding = /cyberpunk|red dead|alan wake 2|starfield|black myth|hogwarts|last of us/.test(reqGpu);

  if (tier >= 3) {
    return {
      status: '🟢 Mükemmel & Akıcı',
      fps_estimate: '60 - 90+ FPS',
      preset: 'Ultra / Yüksek Grafikler'
    };
  } else if (tier === 2) {
    return {
      status: isDemanding ? '🟡 Oynanabilir (FSR/DLSS ile)' : '🟢 Akıcı 60 FPS',
      fps_estimate: isDemanding ? '45 - 60 FPS' : '60+ FPS',
      preset: isDemanding ? 'Orta Grafikler' : 'Yüksek Grafikler'
    };
  } else if (tier === 1) {
    return {
      status: isDemanding ? '🟠 Düşük FPS / Zorlanabilir' : '🟡 30 - 45 FPS',
      fps_estimate: isDemanding ? '25 - 35 FPS' : '45 - 60 FPS',
      preset: 'Düşük Grafikler (720p / 1080p FSR)'
    };
  } else {
    return {
      status: '⚪ Tanınmayan / Giriş Seviyesi',
      fps_estimate: 'Test Edilmeli',
      preset: 'En Düşük Ayarlar'
    };
  }
}

// --- Next.js Route POST Handler ---
export async function POST(req) {
  try {
    const body = await req.json();
    const userQuery = (body.message || '').trim();
    const userProfile = body.profile || {};
    const sessionId = body.session_id || `sess_${Date.now()}`;

    if (!userQuery) {
      return NextResponse.json({ error: 'Mesaj boş olamaz' }, { status: 400 });
    }

    const normQ = normalizeText(userQuery);
    const gamesDb = loadDatabase();
    const customKnowledge = loadCustomKnowledge();
    const userGpu = userProfile?.hardware?.gpu;

    // 0. Check Learned Custom Knowledge
    for (const item of customKnowledge) {
      const qTokens = normalizeText(item.question).split(/\s+/);
      const userTokens = normQ.split(/\s+/);
      const matchCount = qTokens.filter(t => userTokens.includes(t)).length;
      if (matchCount / qTokens.length >= 0.75) {
        return NextResponse.json({
          response: item.answer,
          session_id: sessionId,
          games: []
        });
      }
    }

    // 1. Natural Turkish Dialogue & Smalltalk Classification
    const isIdentity = /^(kimsin|sen kimsin|kimsin sen|nesin|sen nesin|nesin sen|adin ne|adın ne|ismin ne|sen ne ayaksin|ne ayaksin|gamerisen nedir|gamerisen ai nedir|bu bot ne|bu site ne|ne ise yararsin|ne is yaparsin|neler yapabilirsin|gorevin ne)$/i.test(normQ) ||
      /\b(sen kimsin|kimsin sen|ne ise yararsin|neler yapabilirsin|gamerisen nedir|gamerisen ai nedir|adin ne|ismin ne)\b/i.test(normQ);

    const isGreeting = /^(sa|s a|selam|selamlar|merhaba|merhabalar|mrb|hey|hello|hi|gunaydin|iyi gunler|iyi aksamlar|iyi geceler|tunaydin|selamun aleykum)$/i.test(normQ) ||
      /\b(selam|selamlar|merhaba|merhabalar|gunaydin|iyi gunler|iyi aksamlar|selamun aleykum)\b/i.test(normQ);

    const isHowAreYou = /^(nasilsin|naber|napiyon|nasil gidiyor|ne haber|keyifler nasil|durumlar nasil|iyi misin|iyi misiniz)$/i.test(normQ) ||
      /\b(nasilsin|naber|napiyon|nasil gidiyor|ne haber|keyifler nasil|hal hatir|durumlar nasil)\b/i.test(normQ);

    const isWhatDoing = /^(napıyorsun|napiyorsun|ne yapıyorsun|ne yapiyorsun|neyle meşgulsün|neyle mesgulsun|ne iş yapıyorsun)$/i.test(normQ) ||
      /\b(napıyorsun|napiyorsun|ne yapıyorsun|ne yapiyorsun|neyle mesgulsun)\b/i.test(normQ);

    const isThanks = /\b(tesekkur|tesekkurler|tesekkur ederim|sag ol|sagol|eyvallah|adamsin|kralsin|harikasin|supersin|mukemmel|eline saglik|helal)\b/i.test(normQ);

    const isJoke = /^(saka yap|fikra anlat|espri yap|guldur beni|komik bir sey soyle)$/i.test(normQ) ||
      /\b(saka yap|fikra anlat|espri yap|guldur beni)\b/i.test(normQ);

    const isFarewell = /^(gorusuruz|hoscakal|bay bay|bye bye|bye|kendine iyi bak|iyi geceler|ben kacar|kactim ben)$/i.test(normQ) ||
      /\b(gorusuruz|hoscakal|bay bay|bye|kendine iyi bak|iyi geceler)\b/i.test(normQ);

    if (isThanks) {
      return NextResponse.json({
        response: 'Rica ederim gamer dostum! 🙏 Ne zaman aklına takılan bir oyun, güncel indirim veya donanım sorusu olursa buradayım. Keyifli oyunlar! 🎮🔥',
        session_id: sessionId,
        games: []
      });
    }
    if (isIdentity) {
      return NextResponse.json({
        response: 'Ben Gamerisen AI! 🤖 Oyunculara bütçelerine en uygun oyunları bulan, canlı mağaza fiyatlarını (Steam, Epic Games, GOG) karşılaştıran ve sistem donanımına göre FPS analizi yapan kişisel oyun asistanıyım. 🎮\n\nAklındaki oyunu, bütçeni veya ekran kartını söyle, hemen bakalım!',
        session_id: sessionId,
        games: []
      });
    }
    if (isGreeting) {
      return NextResponse.json({
        response: 'Selam gamer dostum! 🚀 Gamerisen AI hazır. Aklındaki oyunu, oynamak istediğin türü veya bütçeni söyle, en avantajlı mağaza fırsatlarını bulalım!',
        session_id: sessionId,
        games: []
      });
    }
    if (isHowAreYou) {
      return NextResponse.json({
        response: 'İyiyim gamer dostum, bomba gibiyim! 🕹️ Gamerisen platformunda en popüler oyunları ve mağaza indirimlerini tarıyorum. Hangi oyuna bakalım?',
        session_id: sessionId,
        games: []
      });
    }
    if (isWhatDoing) {
      return NextResponse.json({
        response: 'Gamerisen sunucularında canlı oyun fiyatlarını tarıyor, Steam ve Epic indirimlerini takip ediyorum! 🚀 Senin için hangi oyunu inceleyelim?',
        session_id: sessionId,
        games: []
      });
    }
    if (isJoke) {
      return NextResponse.json({
        response: 'Neden bilgisayar oyuncuları dışarı çıkmaz? Çünkü dışarıda grafikler çok iyi ama hikaye berbat ve yeniden doğma (respawn) yok! 😂🎮',
        session_id: sessionId,
        games: []
      });
    }
    if (isFarewell) {
      return NextResponse.json({
        response: 'Görüşmek üzere gamer dostum! Kendine çok iyi bak, bol FPS\'li ve indirimli günler! 🚀👋',
        session_id: sessionId,
        games: []
      });
    }

    // 2. Story / Lore / Description queries (e.g. 'Witcher 3 hikayesi nasıl?', 'Cyberpunk konusu ne?')
    const isStory = /hikaye|hikayesi|konu|konusu|ne anlatiyor|nasil bir oyun|ozet|ozeti|lore/.test(normQ);
    if (isStory) {
      const cleanTitle = normQ.replace(/\b(hikayesi|hikaye|konusu|konu|nasil|nasıl|ne|nedir|anlat|anlatiyor|ne anlatiyor|hakkinda|bilgi|ver|ozeti|ozet)\b/gi, '').trim();
      const matchedGame = gamesDb.find(g => normalizeText(g.title).includes(cleanTitle) || (cleanTitle.length > 2 && cleanTitle.includes(normalizeText(g.title))));
      
      if (matchedGame) {
        const bestDeal = (matchedGame.deals || [])[0];
        const genres = (matchedGame.genres || ['Aksiyon']).join(', ');
        const storyResponse = `📖 **${matchedGame.title} — Hikaye ve Genel Bakış:**\n\n${matchedGame.description}\n\n• **Türler:** ${genres}\n• **Değerlendirme Puanı:** ⭐ ${matchedGame.rating || 88}/100\n\nAşağıdaki karttan güncel indirimli mağaza fiyatını ve donanım uyumluluğunu inceleyebilirsin! 🚀`;

        return NextResponse.json({
          response: storyResponse,
          session_id: sessionId,
          games: [{
            id: matchedGame.id,
            title: matchedGame.title,
            genres: matchedGame.genres || [],
            description: matchedGame.description || '',
            rating: matchedGame.rating || 88,
            image_url: matchedGame.image_url || '',
            store_url: matchedGame.store_url || `https://store.steampowered.com/search/?term=${encodeURIComponent(matchedGame.title)}`,
            best_deal: bestDeal,
            deals: matchedGame.deals || [],
            currency: 'TL',
            hardware_compatibility: estimateHardware(matchedGame, userGpu)
          }]
        });
      }
    }

    // 3. General Recommendation & "Canım sıkıldı, ne oynasam?" Handling
    const isGeneralRecommendation = /canim sikildi|ne oynasam|ne oynayayim|oyun oner|oyun oneri|tavsiye|bana oyun bul|en iyi oyunlar|populer oyunlar|efsane oyunlar|bomba oyunlar|kafa dagitmalik|ne oynamaliyim/.test(normQ) && !/\d+\s*(?:tl|lira|dolar|\$)/.test(normQ);

    if (isGeneralRecommendation) {
      // Pick top-rated popular games from database (rating >= 88)
      const topPicks = [...gamesDb]
        .filter(g => (g.deals || []).length > 0)
        .sort((a, b) => (b.rating || 80) - (a.rating || 80))
        .slice(0, 4);

      let aiResponse = "🎮 **Gamerisen AI Seçti: İşte Bu Aralar Kesinlikle Oynaman Gereken Efsane Oyunlar!**\n\nKütüphanene mutlaka eklemen gereken, yüksek puanlı ve indirimdeki başyapıtlar:\n\n";
      
      topPicks.forEach((g, i) => {
        const bestDeal = (g.deals || [])[0];
        const dealInfo = bestDeal ? ` — **${bestDeal.current_price} TL** (%${bestDeal.discount} İndirimle!) [${bestDeal.platform}]` : '';
        aiResponse += `${i + 1}. **${g.title}** (⭐ ${g.rating || 88}/100)${dealInfo}\n   *${(g.description || '').slice(0, 110)}...*\n\n`;
      });

      aiResponse += "Aşağıdaki kartlardan tüm mağaza fiyatlarını ve sistem uyumluluğunu detaylıca inceleyebilirsin! 🚀";

      const structuredGames = topPicks.map(g => ({
        id: g.id,
        title: g.title,
        genres: g.genres || ['Aksiyon'],
        description: g.description || '',
        rating: g.rating || 88,
        image_url: g.image_url || '',
        store_url: g.store_url || `https://store.steampowered.com/search/?term=${encodeURIComponent(g.title)}`,
        best_deal: (g.deals || [])[0],
        deals: g.deals || [],
        currency: 'TL',
        hardware_compatibility: estimateHardware(g, userGpu)
      }));

      return NextResponse.json({
        response: aiResponse,
        session_id: sessionId,
        games: structuredGames
      });
    }

    // 4. Parse Price Constraints
    let maxPrice = null;
    let minPrice = null;
    let aroundPrice = null;
    const isFree = /ucretsiz|bedava|free to play|f2p|parasiz|sifir tl/.test(normQ) || /\b0\s*(?:tl|lira)\b/.test(normQ);
    const isCheapest = /en ucuz|en ucuzu|en ucuzlar|en ucuz oyun|en ucuz oyunlar|en kelepir|en hesapli/.test(normQ);
    const isCreatorCallback = /yaratici|yaraticiya|patron|patrona|yapimci/.test(normQ) && /en ucuz|oyun|fiyat|bul|getir/.test(normQ);

    const aroundMatch = normQ.match(/(\d+)\s*(?:tl|lira|liralik|dolar|\$)?\s*(?:ye|ya|e|a)?\s*(?:yakin|yakini|civari|civarinda|civarindaki|bandi|bandinda|bandindaki|dolaylarinda|yaklasik)/);
    const rangeMatch = normQ.match(/(\d+)\s*(?:-|ile|ve|ila)\s*(\d+)\s*(?:tl|lira|liralik|dolar|\$)?\s*(?:arasi|arasinda|arasindaki)?/);
    const budgetMatch = normQ.match(/(\d+)\s*(?:tl|lira|liralik|dolar|\$)?\s*(?:ve|veya)?\s*(?:alti|altinda|altindaki|<|<=|under|kadar)/);

    if (isFree) {
      maxPrice = 0.0;
    } else if (aroundMatch) {
      aroundPrice = parseFloat(aroundMatch[1]);
      minPrice = Math.max(0, aroundPrice * 0.45);
      maxPrice = aroundPrice * 1.55;
    } else if (rangeMatch) {
      minPrice = parseFloat(rangeMatch[1]);
      maxPrice = parseFloat(rangeMatch[2]);
    } else if (budgetMatch) {
      maxPrice = parseFloat(budgetMatch[1]);
    }

    const isConstraint = (maxPrice !== null) || (minPrice !== null) || (aroundPrice !== null) || isFree || isCheapest;

    // 5. Search & Grade Games Database
    let scoredGames = [];

    for (const game of gamesDb) {
      const deals = game.deals || [];
      if (deals.length === 0) continue;

      const bestDeal = deals.reduce((min, d) => (d.current_price < min.current_price ? d : min), deals[0]);
      const price = bestDeal.current_price;

      // Price Filter
      if (isFree && price > 0.0) continue;
      if (maxPrice !== null && price > maxPrice) continue;
      if (minPrice !== null && price < minPrice) continue;

      let score = 0.0;
      const gameTitleNorm = normalizeText(game.title);
      const gameDescNorm = normalizeText(game.description || '');
      const gameGenresNorm = (game.genres || []).map(g => normalizeText(g)).join(' ');

      // Direct Title & Text matching
      if (normQ.includes(gameTitleNorm) || gameTitleNorm.includes(normQ)) score += 5.0;
      const queryWords = normQ.split(/\s+/).filter(w => w.length > 2);
      queryWords.forEach(w => {
        if (gameTitleNorm.includes(w)) score += 2.0;
        if (gameDescNorm.includes(w)) score += 0.5;
        if (gameGenresNorm.includes(w)) score += 2.0;
      });

      // Price closeness / budget match / rating boost
      if (isCheapest) {
        score += 3.0 + (150.0 / (price + 10.0)) + (bestDeal.discount / 25.0);
      } else if (aroundPrice !== null) {
        const closeness = Math.abs(price - aroundPrice);
        score += 2.0 + (3.0 / (1.0 + (closeness / 100.0))) + ((game.rating || 80) / 40.0);
      } else if (maxPrice !== null || minPrice !== null) {
        score += 2.0 + ((game.rating || 80) / 30.0) + (bestDeal.discount / 50.0);
      } else if (isFree) {
        score += 2.0 + ((game.rating || 80) / 30.0);
      }

      if (score > 0.4 || isConstraint) {
        scoredGames.push({
          game,
          best_deal: bestDeal,
          score,
          hw_compat: estimateHardware(game, userGpu)
        });
      }
    }

    scoredGames.sort((a, b) => b.score - a.score);
    let topResults = scoredGames.slice(0, 4);

    // Fallback to top-rated popular games if nothing matched
    if (topResults.length === 0) {
      const fallbackPicks = [...gamesDb]
        .filter(g => (g.deals || []).length > 0)
        .sort((a, b) => (b.rating || 80) - (a.rating || 80))
        .slice(0, 3);

      topResults = fallbackPicks.map(g => ({
        game: g,
        best_deal: (g.deals || [])[0],
        score: 1.0,
        hw_compat: estimateHardware(g, userGpu)
      }));
    }

    // 6. Generate Natural AI Response Text for Valid Results
    let aiResponse = '';
    const bCur = normQ.includes('dolar') || normQ.includes('$') ? '$' : 'TL';

    if (isCreatorCallback) {
      aiResponse = "Baş üstüne yaratıcım! 👑 Kodlarımdaki 'Torpil Yok' kuralını biraz esneterek, senin için piyasadaki neredeyse bedava denebilecek en kelepir başyapıtları ve dev indirimleri listeledim:\n\n";
    } else if (isCheapest) {
      aiResponse = "🔥 **İşte Mağazalardaki En Ucuz Oyunlar ve Kaçırılmayacak Fırsatlar:**\n\nCüzdanı hiç yormayacak, fiyat/performans canavarı en ucuz efsaneler:\n\n";
    } else if (aroundPrice !== null) {
      aiResponse = `🎯 **İşte ${aroundPrice} ${bCur} Civarında & Bu Fiyat Bandındaki En İyi Oyunlar:**\n\nSenin için bütçene en yakın ve popüler başyapıtları derledim:\n\n`;
    } else if (rangeMatch) {
      aiResponse = `🎯 **İşte ${minPrice} - ${maxPrice} ${bCur} Arasındaki En İyi Fırsatlar:**\n\nBu fiyat aralığındaki en popüler ve yüksek puanlı oyunlar:\n\n`;
    } else if (maxPrice !== null) {
      aiResponse = `🔥 **İşte ${maxPrice} ${bCur} Altındaki En İyi Fırsatlar ve İndirimli Başyapıtlar:**\n\nSenin için mağazalardaki en avantajlı oyunları derledim:\n\n`;
    } else if (isFree) {
      aiResponse = "🎁 **Gamerisen AI Seçti: İşte En Popüler Ücretsiz (Free-to-Play) Oyunlar!**\n\nHiç para ödemeden saatlerce keyifle oynayabileceğin kaliteli oyunlar:\n\n";
    } else {
      aiResponse = "🎮 **İşte Aradığın Kriterlere Göre En Uygun Oyun ve Fiyat Sonuçları:**\n\n";
    }

    topResults.forEach((item, i) => {
      const g = item.game;
      const d = item.best_deal;
      const dealInfo = d ? ` — **${d.current_price} TL** (%${d.discount} İndirimle!) [${d.platform}]` : '';
      aiResponse += `${i + 1}. **${g.title}** (⭐ ${g.rating || 88}/100)${dealInfo}\n   *${(g.description || '').slice(0, 110)}...*\n\n`;
    });

    aiResponse += "Aşağıdaki kartlardan tüm mağaza fiyatlarını ve sistem uyumluluğunu detaylıca inceleyebilirsin! 🚀";

    // Format Structured Game Cards for Frontend
    const structuredGames = topResults.map(r => ({
      id: r.game.id,
      title: r.game.title,
      genres: r.game.genres || ['Aksiyon'],
      description: r.game.description || '',
      rating: r.game.rating || 88,
      image_url: r.game.image_url || '',
      store_url: r.game.store_url || `https://store.steampowered.com/search/?term=${encodeURIComponent(r.game.title)}`,
      best_deal: r.best_deal,
      deals: r.game.deals || [],
      currency: 'TL',
      hardware_compatibility: r.hw_compat
    }));

    return NextResponse.json({
      response: aiResponse,
      session_id: sessionId,
      games: structuredGames
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    return NextResponse.json(
      { response: 'Bir hata oluştu, lütfen tekrar deneyin.', games: [] },
      { status: 500 }
    );
  }
}
