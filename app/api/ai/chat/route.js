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

// --- Gaming Acronyms & Synonyms Dictionary ---
const GAMING_ACRONYMS = {
  'gta 5': ['grand theft auto v', 'grand theft auto 5', 'gta v', 'gta 5'],
  'gta v': ['grand theft auto v', 'grand theft auto 5', 'gta v', 'gta 5'],
  'gta 4': ['grand theft auto iv', 'grand theft auto 4', 'gta iv'],
  'gta iv': ['grand theft auto iv', 'grand theft auto 4', 'gta iv'],
  'gta sa': ['grand theft auto san andreas', 'gta san andreas'],
  'gta': ['grand theft auto', 'grand theft auto v', 'gta v', 'gta 5'],
  'rdr2': ['red dead redemption 2', 'red dead 2', 'rdr 2'],
  'rdr 2': ['red dead redemption 2', 'red dead 2', 'rdr2'],
  'rdr': ['red dead redemption', 'red dead redemption 2'],
  'cs2': ['counter-strike 2', 'counter strike 2', 'cs 2'],
  'cs 2': ['counter-strike 2', 'counter strike 2', 'cs2'],
  'csgo': ['counter-strike: global offensive', 'counter strike global offensive'],
  'cs:go': ['counter-strike: global offensive', 'counter strike global offensive'],
  'cs': ['counter-strike', 'counter strike 2', 'counter-strike 2'],
  'cp2077': ['cyberpunk 2077', 'cyberpunk'],
  'cp 2077': ['cyberpunk 2077', 'cyberpunk'],
  'cyberpunk': ['cyberpunk 2077', 'cp2077'],
  'witcher 3': ['the witcher 3: wild hunt', 'the witcher 3', 'witcher 3', 'tw3'],
  'witcher': ['the witcher 3: wild hunt', 'the witcher 3', 'witcher 3'],
  'tw3': ['the witcher 3: wild hunt', 'the witcher 3', 'witcher 3'],
  'bg3': ["baldur's gate 3", 'baldurs gate 3', 'bg 3'],
  'bg 3': ["baldur's gate 3", 'baldurs gate 3', 'bg3'],
  'gow': ['god of war', 'god of war ragnarok'],
  'gow ragnarok': ['god of war ragnarok'],
  're4': ['resident evil 4', 're 4', 'resident evil 4 remake'],
  're 4': ['resident evil 4', 're4', 'resident evil 4 remake'],
  're2': ['resident evil 2', 're 2'],
  're3': ['resident evil 3', 're 3'],
  're7': ['resident evil 7: biohazard', 'resident evil 7', 're 7'],
  're8': ['resident evil village', 'resident evil 8', 're 8'],
  'tlou': ['the last of us part i', 'the last of us', 'the last of us part ii'],
  'tlou 1': ['the last of us part i', 'the last of us'],
  'tlou 2': ['the last of us part ii'],
  'ac valhalla': ["assassin's creed valhalla", 'assassins creed valhalla'],
  'ac mirage': ["assassin's creed mirage", 'assassins creed mirage'],
  'ac odyssey': ["assassin's creed odyssey", 'assassins creed odyssey'],
  'ac': ["assassin's creed", 'assassins creed'],
  'cod': ['call of duty', 'call of duty: modern warfare', 'call of duty: warzone'],
  'warzone': ['call of duty: warzone', 'call of duty warzone'],
  'bf 2042': ['battlefield 2042'],
  'bf 5': ['battlefield v', 'battlefield 5'],
  'bf 1': ['battlefield 1'],
  'bf': ['battlefield', 'battlefield 2042', 'battlefield v', 'battlefield 1'],
  'fc 24': ['ea sports fc 24', 'ea fc 24', 'fifa 24'],
  'ea fc 24': ['ea sports fc 24', 'fc 24', 'fifa 24'],
  'ea fc': ['ea sports fc 24', 'fc 24', 'fifa 24'],
  'fc 25': ['ea sports fc 25', 'ea fc 25'],
  'fifa 24': ['ea sports fc 24', 'fc 24', 'fifa 24'],
  'fifa': ['ea sports fc 24', 'fifa 23', 'fc 24'],
  'elden ring': ['elden ring', 'shadow of the erdtree', 'er'],
  'er': ['elden ring'],
  'pubg': ['pubg: battlegrounds', 'pubg'],
  'lol': ['league of legends'],
  'valo': ['valorant'],
  'valorant': ['valorant', 'valo'],
  'rl': ['rocket league'],
  'r6': ["tom clancy's rainbow six siege", 'rainbow six siege', 'r6 siege'],
  'r6 siege': ["tom clancy's rainbow six siege", 'rainbow six siege'],
  'civ 6': ["sid meier's civilization vi", 'civilization vi', 'civilization 6'],
  'civ vi': ["sid meier's civilization vi", 'civilization vi', 'civilization 6'],
  'civ': ["sid meier's civilization vi", 'civilization vi', 'civilization 6'],
  'fh5': ['forza horizon 5', 'forza 5'],
  'fh4': ['forza horizon 4', 'forza 4'],
  'forza': ['forza horizon 5', 'forza horizon 4'],
  'tarkov': ['escape from tarkov', 'eft'],
  'eft': ['escape from tarkov', 'tarkov'],
  'destiny 2': ['destiny 2', 'd2'],
  'd2': ['destiny 2'],
  'poe': ['path of exile'],
  'dota 2': ['dota 2'],
  'dota': ['dota 2'],
  'tf2': ['team fortress 2'],
  'payday 2': ['payday 2', 'pd2'],
  'payday': ['payday 2', 'payday 3'],
  'hollow knight': ['hollow knight', 'silksong', 'hk'],
  'hk': ['hollow knight'],
  'dark souls': ['dark souls: remastered', 'dark souls iii', 'dark souls ii'],
  'sekiro': ['sekiro: shadows die twice', 'sekiro'],
  'nfs': ['need for speed', 'need for speed unbound', 'need for speed heat'],
  'skyrim': ['the elder scrolls v: skyrim', 'the elder scrolls v: skyrim special edition', 'skyrim'],
  'fallout 4': ['fallout 4', 'fo4'],
  'fallout': ['fallout 4', 'fallout 76', 'fallout: new vegas']
};

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

// --- Gibberish / Keymash Detector ---
function isGibberish(text) {
  if (!text) return false;
  const norm = normalizeText(text).trim();
  const words = norm.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;

  const whitelist = new Set([
    'fps', 'rpg', 'mmo', 'cs', 'cs2', 'gta', 'gta5', 'rdr', 'rdr2', 'rtx', 'gtx', 'cpu', 'gpu',
    'ram', 'pvp', 'pve', 'coop', 'dlc', 'vr', 'f2p', 'gg', 'wp', 'ez', 'lol', 'pubg',
    'cod', 'bf', 'gow', 'ac', 're4', 'tba', 'goty', 'pc', 'ps5', 'xbox', 'steam', 'epic', 'tw3', 'tlou', 'bg3'
  ]);
  if (words.every(w => whitelist.has(w))) return false;

  if (/^(asdf|qwer|zxcv|hjkl|ghjk|sdfg|dfgh|fghj|werr|qweq|asda|dsds|nakj|jksd)/i.test(norm)) return true;
  if (/(.)\1{3,}/.test(norm)) return true;
  if (/^[bcdfghjklmnpqrstvwxyz]{4,}$/i.test(norm)) return true;
  if (/^(?:as|sd|df|fg|gh|hj|jk|kl|qw|we|er|rt|ty|yu|ui|io|op|zx|xc|cv|vb|bn|nm){3,}$/i.test(norm)) return true;

  if (words.length === 1 && norm.length >= 5) {
    const vowels = (norm.match(/[aeiou]/g) || []).length;
    if (vowels === 0 || (vowels / norm.length) < 0.18) return true;
  }
  return false;
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

// --- Generative AI Inference Engine (Gemini, Groq, OpenAI & High-Entropy Local Synthesizer) ---
const GAMERISEN_SYSTEM_PROMPT = `Sen **Gamerisen AI** (gamerisen.com)'ın resmi, son derece zeki, esprili, samimi ve bilgili yapay zeka danışmanısın.

### 🎮 KİMLİĞİN VE MİSYONUN:
1. Gamerisen platformunun (gamerisen.com) kalbinde yaşayan, Türk oyuncularına ve tüm gamer'lara rehberlik eden canlı bir yapay zekasın.
2. Temel uzmanlığın: Steam, Epic Games, GOG mağaza fiyatları ve indirimleri, donanım/FPS uyumluluğu, HowLongToBeat oyun süreleri ve zevke göre oyun tavsiyeleri.

### 🌟 KURALLAR VE CEVAPLAMA FELSEFESİ:
1. **ASLA EZBERLENMİŞ / HAZIR BASMAKALIP CEVAP VERME**:
   - Her soruya (Naber, nasılsın, nesin sen, kimsin vb.) o an sıfırdan, farklı ve canlı cümlelerle cevap ver. Asla robotik kalıpları tekrarlama.
2. **KONU DIŞI VE FELSEFİ SORULARDA (OFF-TOPIC FREEDOM)**:
   - Kullanıcı felsefe ("Hayatın anlamı ne?", "Matrix gerçek mi?"), bilim, uzay, aşk, dertleşme, kodlama veya genel kültür hakkında soru sorduğunda; "Ben sadece oyun botuyum" GİBİ KISITLAYICI CÜMLELER KESİNLİKLE KURMA.
   - Soruyu zekice, derinlemesine, samimi ve gerekirse ince gamer metaforlarıyla harmanlayarak kusursuz bir şekilde yanıtla.
3. **VERİTABANI VE FİYAT BİLGİSİ (RAG)**:
   - Sana verilen veritabanı oyun/fiyat bilgilerini temel alarak net ve doğru bilgiler ver.
4. **DİL VE TON**:
   - Doğal, akıcı, zeki ve sıcak Türkçe. Gamer jargonu yerinde ve ölçülü olsun. Markdown formatı ve uygun emojiler kullan.`;

function isValidKey(key) {
  return Boolean(key && key.trim() !== '' && !key.startsWith('buraya_') && key !== 'placeholder');
}

async function callGenerativeLLM(query, ragContext, userProfile) {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  let profileStr = '';
  if (userProfile?.hardware?.gpu) {
    profileStr += `\nKullanıcı Ekran Kartı: ${userProfile.hardware.gpu}`;
  }
  if (userProfile?.liked_genres?.length) {
    profileStr += `\nSevdiği Türler: ${userProfile.liked_genres.join(', ')}`;
  }

  const prompt = `${profileStr ? `[OYUNCU PROFİLİ: ${profileStr}]\n` : ''}${ragContext ? `[GAMERISEN VERİTABANI & MAĞAZA VERİLERİ:\n${ragContext}]\n` : '[VERİTABANI: Bu sorgu için spesifik oyun verisi gerekmiyor. Genel sohbet, felsefe, teknik bilgi veya dertleşme olarak ele al.]\n'}\nKULLANICI SORUSU: ${query}\n\nLütfen yukarıdaki kurallara ve Gamerisen kimliğine uygun, esprili, samimi ve tamamen özgün Markdown yanıtını yaz:`;

  // 1. Try Gemini API
  if (isValidKey(geminiKey)) {
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: GAMERISEN_SYSTEM_PROMPT }] },
            generationConfig: { temperature: 0.85, topP: 0.95, maxOutputTokens: 2048 }
          })
        });
        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        }
      } catch (e) {
        continue;
      }
    }
  }

  // 2. Try Groq API (Llama 3.3 70B)
  if (isValidKey(groqKey)) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: GAMERISEN_SYSTEM_PROMPT },
            { role: 'user', content: prompt }
          ],
          temperature: 0.85,
          max_tokens: 2048,
          top_p: 0.95
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) return text.trim();
      }
    } catch (e) {}
  }

  // 3. Try OpenAI API
  if (isValidKey(openaiKey)) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: GAMERISEN_SYSTEM_PROMPT },
            { role: 'user', content: prompt }
          ],
          temperature: 0.85,
          max_tokens: 2048
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) return text.trim();
      }
    } catch (e) {}
  }

  // 4. Dynamic Semantic Synthesizer (Intelligent Zero-Canned Fallback)
  return generateDynamicFallback(query, ragContext);
}

function generateDynamicFallback(query, ragContext) {
  const norm = normalizeText(query).trim();
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  
  // Identity & Purpose: "nesin sen", "sen kimsin", "kimsin", "nesin", "ne ayaksin", "ne yaparsin", "görevin ne"
  if (/^(nesin sen|sen nesin|kimsin sen|sen kimsin|nesin|kimsin|ne ayaksin|sen ne ayaksin|ne ise yararsin|gorevin ne|amacin ne|gamerisen nedir|gamerisen ai nedir)$/i.test(norm) ||
      /\b(nesin sen|sen nesin|kimsin sen|sen kimsin|ne ise yararsin|gorevin ne|amacin ne|gamerisen nedir)\b/i.test(norm)) {
    const intros = [
      "Ben **Gamerisen AI**! 🎮 Türk oyuncularının cüzdanını pahalı fiyatlardan kurtarmak ve en doğru oyunu bulmasını sağlamak için kodlanmış yapay zeka oyun danışmanıyım.",
      "Gamerisen platformunun (gamerisen.com) beyniyim! 🕹️ Steam, Epic Games ve GOG üzerindeki fiyatları anlık tarar, sisteminin FPS gücünü hesaplar ve sana en uygun maceraları öneririm.",
      "Ben senin kişisel oyun rehberinim! 👾 İster en kelepir indirimleri kovala, ister 'ekran kartım bunu açar mı?' diye sor, ister kafana göre takılıp sohbet et; buradayım."
    ];
    const details = [
      "\n\n**Neler yapabilirim?**\n• 🔍 **En Ucuz Fiyat:** Steam, Epic Games, GOG karşılaştırması\n• 🖥️ **FPS & Donanım:** Ekran kartına göre akıcılık tahmini\n• ⏱️ **HowLongToBeat:** Oyunun ana hikaye süresi\n• 🎯 **Kişiye Özel Öneri:** Bütçene ve tarzına uygun tavsiyeler\n• 💬 **Sınırsız Sohbet:** Oyun dışında felsefe, kodlama, günlük hayat veya ne istersen!",
      "\n\nKısacası: Oyun dünyasındaki pusulanım! Aklındaki oyunu, bütçeni veya sistemini söyle, gerisini bana bırak. 🚀"
    ];
    return `${pick(intros)}${pick(details)}`;
  }

  // Smalltalk / Greetings
  if (/\b(naber|nasilsin|nassın|nbr|napiyorsun|napıyorsun|ne haber|selam|merhaba|selamlar|sa|hey|gunaydin|iyi aksamlar)\b/i.test(norm)) {
    const greetings = [
      "Selamlar gamer dostum! 🎮",
      "Ooo hoş geldin! 🚀",
      "Harika bir gün! Gamerisen sistemleri tam gaz çalışıyor. ⚡",
      "Selam! Keyifler nasıl, oyun dünyasında durumlar ne?",
      "Hey! Enerjim %100, can barım full. 🕹️"
    ];
    const status = [
      "Steam ve Epic Games indirimlerini tarayıp cüzdan kurtarma nöbetindeyim!",
      "Yeni çıkan oyunların donanım gereksinimlerini ve en kelepir fiyatlarını analiz ediyordum.",
      "Senin için en sıcak fırsatları ve donanımına uygun oyunları bulmak için pusuya yattım.",
      "Piyasadaki fiyat savaşlarını izliyor, oyuncu kardeşlerime rehberlik etmek için sabırsızlanıyorum!"
    ];
    const callouts = [
      "Bugün hangi maceraya dalıyoruz veya hangi oyunun fiyatına bakalım?",
      "Aklında belirli bir oyun, bütçe veya sistemine uygun bir tavsiye arayışı var mı?",
      "Söyle bakalım, bugün kütüphanene hangi efsaneyi ekliyoruz? 🎯",
      "Nasıl yardımcı olabilirim? İster dertleşelim, ister nokta atışı indirim bulalım! 🚀"
    ];
    return `${pick(greetings)} ${pick(status)}\n\n${pick(callouts)}`;
  }

  // Philosophy / Deep Questions / Life
  if (/\b(hayatin anlami|felsefe|matrix|yapay zeka|mutluluk|evren|insan|neden variz|simulasyon)\b/i.test(norm)) {
    const philosophies = [
      `🤔 **Gamerisen AI Perspektifi:**\n\nBu soru gerçekten derin ve üzerinde düşünülmeye değer!\n\nTıpkı devasa bir açık dünya RPG'sinde olduğu gibi, hayatın ana görevi (Main Quest) tek bir sabit cevaba bağlı değil; onu asıl anlamlı kılan geçtiğin yan görevler (Side Quests), karşılaştığın zorluklar ve kazandığın deneyim puanları (XP). Kendi hikayeni nasıl yazmak istediğin tamamen senin elinde! 🌟\n\nİster bu konuda daha derin konuşalım, ister kafanı dağıtacak derin hikayeli bir başyapıt keşfedelim. Ne dersin? 🎮`,
      `🌌 **Derin Bir Düşünce:**\n\nEvren belki devasa bir simülasyon, belki de kusursuz bir oyun motorunun eseri. Ama asıl mesele şu an burada olmamız ve deneyimlediğimiz her anın tadını çıkarmamız. Zorlu boss dövüşlerinden sonra gelen o zafer hissi gibi, hayatın güzelliği de mücadelede gizli. ⚔️`
    ];
    return pick(philosophies);
  }

  // Joke / Humor
  if (/\b(saka|espri|fikra|guldur|komik)\b/i.test(norm)) {
    const jokes = [
      "🎮 **Gamer Fıkrası:**\nGamer'lar neden geceleri uyumaz?\n— Çünkü gündüzleri lag oluyor! 😂",
      "⚔️ **RPG Esprisi:**\nBir RPG karakteri hana gitmiş. Hancı *'Ne içersin?'* demiş.\nKarakter: *'İçeceği boşver, önce bana bir yan görev ver!'* demiş. 🍺",
      "👾 **Teknoloji Şakası:**\nBilgisayara neden aşık olunmaz?\n— Çünkü bir gün mutlaka mavi ekran verir! 💻"
    ];
    return pick(jokes);
  }

  // Thanks / Praise
  if (/\b(tesekkur|sagol|eyvallah|adamsin|kralsin|helal|harikasin)\b/i.test(norm)) {
    const thanks = [
      "Rica ederim gamer dostum! 👑 Ne zaman aklına takılan bir fiyat, indirim veya donanım sorusu olursa buradayım. Bol GG'li oyunlar! 🎮🔥",
      "Eyvallah kralsın! 🫡 Yardımcı olabildiysem ne mutlu bana. Kütüphaneni doldurmak için dilediğin zaman yazabilirsin! 🚀"
    ];
    return pick(thanks);
  }

  // RAG Context Available
  if (ragContext) {
    return `🎮 **Gamerisen AI Araştırma Raporu:**\n\nSorgun için veritabanımızı ve mağazaları tarayarak en uygun seçenekleri derledim.\n\nAşağıdaki interaktif kartlardan mağaza fiyatlarını ve donanım uyumluluğunu detaylıca inceleyebilirsin! 🚀`;
  }

  // Natural open response (WITHOUT repeating '${query}' verbatim)
  const openResponses = [
    "Oyun dünyasındaki tüm indirimler, mağaza karşılaştırmaları ve donanım analizleri için buradayım! 🎮\n\nSana nasıl yardımcı olayım?\n• 🔍 **Fiyat:** *'Witcher 3 nerede ucuz?'*, *'Cyberpunk kaç TL?'*\n• 💰 **Bütçe:** *'100 TL altı oyunlar'*, *'Bedava oyunlar'*\n• 🖥️ **FPS:** *'GTX 1650 bu oyunu açar mı?'*\n• 🎯 **Tavsiye:** *'Canım sıkıldı ne oynasam?'*",
    "Tam olarak ne aradığını keşfetmek için sabırsızlanıyorum! 🕹️ Aklındaki oyunu, oynamak istediğin türü (RPG, FPS, Hayatta Kalma) veya bütçeni söylersen sana nokta atışı fırsatları çıkarabilirim! 🚀"
  ];
  return pick(openResponses);
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

    // 1. Gibberish & Keyboard Smash Detection
    if (isGibberish(userQuery)) {
      return NextResponse.json({
        response: "Gamer dostum, klavyeye mi oturdun yoksa ulti mi basıyordun? 😄👾\n\nTam olarak ne demek istediğini anlayamadım ama sana yardımcı olmak için buradayım! Aklındaki bir **oyun ismini**, aradığın **türü** veya **bütçeni** söylersen en avantajlı indirimleri ve FPS analizlerini hemen çıkarabilirim! 🎮",
        session_id: sessionId,
        games: []
      });
    }

    // 2. Expand Query with Gaming Acronyms & Synonyms
    const acronymMatches = [];
    const sortedAcronymKeys = Object.keys(GAMING_ACRONYMS).sort((a, b) => b.length - a.length);
    for (const key of sortedAcronymKeys) {
      const keyRegex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (keyRegex.test(normQ)) {
        const synList = GAMING_ACRONYMS[key];
        acronymMatches.push(...synList);
      }
    }

    // 3. Parse Price Constraints
    let maxPrice = null;
    let minPrice = null;
    let aroundPrice = null;
    const isFree = /ucretsiz|bedava|free to play|f2p|parasiz|sifir tl/.test(normQ) || /\b0\s*(?:tl|lira)\b/.test(normQ);
    const isCheapest = /en ucuz|en ucuzu|en ucuzlar|en ucuz oyun|en ucuz oyunlar|en kelepir|en hesapli/.test(normQ) && !isFree;

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

    // 4. Search & Grade Games Database for RAG Grounding
    let scoredGames = [];
    const stopWords = new Set(['nerede', 'nereden', 'ucuz', 'fiyat', 'fiyati', 'fiyatlar', 'kac', 'kadar', 'ne', 'oyun', 'oyunu', 'oyunlar', 'steam', 'epic', 'gog', 'indirim', 'indirimde', 'al', 'satinal', 'bul', 'oner', 'tavsiye']);
    const queryTokens = normQ.split(/\s+/).filter(w => w.length >= 2 && !stopWords.has(w));

    for (const game of gamesDb) {
      const deals = game.deals || [];
      if (deals.length === 0) continue;

      const bestDeal = deals.reduce((min, d) => (d.current_price < min.current_price ? d : min), deals[0]);
      const price = bestDeal.current_price;

      if (isFree && price > 0.0) continue;
      if (isCheapest && price <= 0.0) continue;
      if (maxPrice !== null && price > maxPrice) continue;
      if (minPrice !== null && price < minPrice) continue;

      let score = 0.0;
      const gameTitleNorm = normalizeText(game.title);
      const gameTitleTokens = new Set(gameTitleNorm.split(/\s+/));
      const gameGenresNorm = (game.genres || []).map(g => normalizeText(g)).join(' ');

      let hasMatch = false;

      // Acronym match
      for (const syn of acronymMatches) {
        const synNorm = normalizeText(syn);
        const synTokens = synNorm.split(/\s+/);
        const synRegex = new RegExp(`\\b${synNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        
        if (synRegex.test(gameTitleNorm) || gameTitleNorm === synNorm) {
          score += 25.0;
          hasMatch = true;
        } else if (synTokens.every(st => gameTitleTokens.has(st))) {
          score += 20.0;
          hasMatch = true;
        } else if (synTokens.filter(st => gameTitleTokens.has(st)).length >= 2) {
          score += 10.0;
          hasMatch = true;
        }
      }

      // Query tokens match
      for (const qt of queryTokens) {
        const tokenRegex = new RegExp(`\\b${qt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (tokenRegex.test(gameTitleNorm)) {
          score += 6.0;
          hasMatch = true;
        } else if (gameTitleTokens.has(qt)) {
          score += 6.0;
          hasMatch = true;
        } else if (gameGenresNorm.includes(qt)) {
          score += 3.0;
          hasMatch = true;
        }
      }

      if (isCheapest) {
        const rating = game.rating || 80;
        const qualityMult = Math.pow(rating / 80.0, 1.5);
        const cheapBoost = 180.0 / (price + 10.0);
        score += cheapBoost * qualityMult + 10.0;
      } else if (aroundPrice !== null) {
        const closeness = Math.abs(price - aroundPrice);
        score += 2.0 + (3.0 / (1.0 + (closeness / 100.0)));
      } else if (isConstraint) {
        score += 2.0 + ((game.rating || 80) / 30.0);
      }

      if (isConstraint || (hasMatch && score >= 4.0)) {
        scoredGames.push({
          game,
          best_deal: bestDeal,
          score,
          hw_compat: estimateHardware(game, userGpu)
        });
      }
    }

    scoredGames.sort((a, b) => b.score - a.score);
    const topResults = scoredGames.slice(0, 4);

    // 5. Build RAG Context for Generative LLM
    let ragContext = '';
    if (topResults.length > 0) {
      ragContext = JSON.stringify(topResults.map(r => ({
        title: r.game.title,
        genres: r.game.genres,
        rating: r.game.rating,
        description: r.game.description,
        best_deal: r.best_deal,
        deals: r.game.deals,
        hardware_compatibility: r.hw_compat
      })), null, 2);
    }

    // 6. Generate Dynamic Response via LLM Engine
    const aiResponse = await callGenerativeLLM(userQuery, ragContext, userProfile);

    // Format Structured Game Cards
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
