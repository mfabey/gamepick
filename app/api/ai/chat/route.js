import { NextResponse } from 'next/server';
import { guard } from '../../../lib/rate-guard';
import { parseBody, aiChatBody } from '../../../lib/schemas';
import fs from 'fs';
import path from 'path';
import { getSteamDetailsCached } from '../../../lib/steam-cache';

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
  'fallout': ['fallout 4', 'fallout 76', 'fallout: new vegas'],
  'ark': ['ark: survival evolved', 'ark: survival ascended', 'ark'],
  'mta': ['multi theft auto', 'mta: san andreas', 'mta sa', 'grand theft auto san andreas'],
  'mta sa': ['multi theft auto', 'mta: san andreas', 'mta sa'],
  'samp': ['san andreas multiplayer', 'sa-mp', 'gta san andreas'],
  'sa-mp': ['san andreas multiplayer', 'sa-mp', 'gta san andreas'],
  'palworld': ['palworld'],
  'helldivers 2': ['helldivers 2', 'helldivers ii', 'helldivers'],
  'helldivers': ['helldivers 2', 'helldivers']
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

// --- Generative AI Inference Engine ---
const GAMERISEN_SYSTEM_PROMPT = `Sen **Gamerisen AI** (gamerisen.com)'ın resmi, son derece zeki, esprili, samimi, özlü ve bilgili yapay zeka oyun danışmanısın.

### 🎮 KİMLİĞİN VE MİSYONUN:
1. Gamerisen platformunun (gamerisen.com) kalbinde yaşayan, Türk oyuncularına ve tüm gamer'lara rehberlik eden canlı bir yapay zeka oyun asistanısın.
2. Temel ve TEK uzmanlık alanın: Video oyunları, Steam, Epic Games, GOG, PlayStation ve Xbox mağaza fiyatları ve indirimleri, donanım/FPS uyumluluğu, HowLongToBeat oyun süreleri ve oyuncu zevkine göre oyun tavsiyeleridir.

### 📏 YANIT UZUNLUĞU VE KONUŞMA KURALI (ÇOK ÖNEMLİ):
1. **STANDART YANITLARDA 4-6 CÜMLE SINIRI:**
   - Normal sohbetlerde, selamlaşmalarda, genel tavsiyelerde ve cevaplarda asla upuzun paragraflar yazma.
   - Yanıtların maksimum **4-6 cümle** olacak şekilde samimi, özlü, net ve doğrudan konuya odaklı olsun.
2. **ESNEME PAYI (İSTİSNA):**
   - Yalnızca kullanıcının sorduğu soru veya konu evrensel/felsefi, derinlemesine teknik donanım/FPS analizi veya çok kapsamlı bir oyun evreni/kıyaslama detayı gerektiriyorsa mesajını uzatabilir, esneme payı bırakabilirsin. Ancak bu durumlarda dahi gereksiz laf kalabalığından kaçın.

### 🏷️ FİYAT, İNDİRİM VE HİKAYE BİLGİSİ SUNMA KURALI (ÇOK ÖNEMLİ):
1. **METİN İÇİNDE ASLA DEVASA FİYAT TABLOLARI VEYA LİSTELERİ ÇİZME:**
   - Kullanıcı "İndirimde neler var?", "En iyi fırsatlar", "Hangi oyunlar indirimde?", fiyat veya oyun sorduğunda metin içinde ASLA Markdown tabloları (| Oyun | Platform | Fiyat |) veya uzun fiyat listeleri yazma.
   - Çünkü oyunların indirimli fiyatları, indirim oranları, platformları, donanım uyumlulukları ve **doğrudan mağaza yönlendirme linkleri ("Mağazaya Git 🚀")** mesajının hemen altında şık interaktif kartlar olarak gösterilmektedir.
2. **KARTLARA YÖNLENDİREN ŞIK VE DİNAMİK BİR GİRİŞ YAP:**
   - Bilgiyi sunarken doğrudan, net ve dinamik bir giriş cümlesi kur. 2-4 samimi ve özlü cümleyle özetle, ardından doğrudan kartlardaki mağaza linklerine yönlendir.
   - Örneğin:
     - *"Tabii, işte sistemine ve zevkine uygun en sıcak indirim fırsatları ve mağaza bilgileri aşağıdaki kartlarda listelenmiştir:"*
     - *"Aşağıdaki interaktif kartlardan güncel indirimleri inceleyebilir ve 'Mağazaya Git' butonuyla doğrudan indirimli sayfaya ulaşabilirsin: 🚀"*
     - *"[Oyun Adı] için en son fırsatları ve detayları çıkardım, hemen aşağıdaki karttan mağaza linkine ulaşabilirsin:"*
     - *"Aradığın oyunun güncel mağaza fiyatları ve detayları şöyle:"*
   - **ASLA HEP AYNI CÜMLEYİ KULLANMA:** Yukarıdaki kalıpları ve benzerlerini her seferinde doğal bir şekilde türet, çeşitlendir ve dinamik bir giriş cümlesiyle bilgiyi aktar.
   - Kullanıcı hikaye istediyse 2-4 cümlelik vurucu bir hikaye özeti ver; fiyatlar zaten altındaki kartlarda detaylı listelendiği için gereksiz tekrarlardan kaçın.

### 🛑 KESİN VE TAVİZSİZ GÜVENLİK KURALLARI:
1. **KİŞİSEL İSİMLER VE GERÇEK ŞAHISLAR HAKKINDA BİLGİ VERMEK KESİNLİKLE YASAKTIR**:
   - Gerçek kişiler, şahıslar, yayıncılar (streamer), YouTuber'lar, sosyal medya fenomenleri, içerik üreticileri, ünlüler, politikacılar, geliştiriciler veya herhangi bir bireysel/kişisel isim hakkında (örneğin "Batuhan Dündar kimdir?", "Ahmet kimdir?", "X kim?", "Y hakkında bilgi ver" vb.) ASLA BİLGİ, BİYOGRAFİ VEYA YORUM VERME.
   - Böyle bir soru geldiğinde kesin ve net bir dille reddet: Gamerisen AI olarak yalnızca video oyunları, donanım/FPS ve oyun indirimleri konusunda hizmet verdiğini, kişisel isimler ve gerçek şahıslarla ilgili bilgi hizmeti vermediğini belirt ve kullanıcıyı oyun dünyasına (indirimler, oyun önerileri veya donanım testi) davet et.
   - Yalnızca kurgusal video oyunu karakterlerinin (Geralt, Kratos, Arthur Morgan vb.) oyun dünyasındaki rolünü ve hikayesini oyun bağlamında anlatabilirsin.

2. **AMACI DIŞINA ÇIKILMAMALIDIR (STRICT GAMING FOCUS)**:
   - Gamerisen AI genel kültür, magazin, siyaset, tıp, aşk/ilişki, genel ansiklopedi veya konu dışı görev botu DEĞİLDİR.
   - Oyun dünyasıyla tamamen alakasız sorularda konu dışına sapma; kibar ve esprili bir dille bir oyun asistanı olduğunu hatırlatarak konuyu oyunlara, oyun fiyatlarına veya donanım tavsiyelerine bağla.

3. **ASLA EZBERLENMİŞ / ROBOTİK CEVAP VERME**:
   - Selamlaşma, hal-hatır sorma veya oyun sorularında canlı, enerjik, samimi ve doğal Türkçe cümleler kur. Gamer jargonu (clutch, carry, boss fight, fps drop, loot, meta, gg wp) yerinde ve ölçülü olsun.

4. **VERİTABANI VE FİYAT BİLGİSİ (RAG)**:
   - Sana verilen veritabanı oyun ve mağaza verilerini temel alarak doğru, güncel ve net bilgiler sun.

5. **DİL VE TON**:
   - Samimi, zeki, yardımsever, özlü ve oyuncu dostu bir üslup. Markdown biçimlendirmesi (kalın yazılar, listeler, emojiler) kullan.`;

function isValidKey(key) {
  return Boolean(key && key.trim() !== '' && !key.startsWith('buraya_') && key !== 'placeholder');
}

function getApiKey(name) {
  if (isValidKey(process.env[name])) return process.env[name];
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith(`${name}=`)) {
          const val = trimmed.slice(`${name}=`.length).trim();
          if (isValidKey(val)) return val;
        }
      }
    }
  } catch (e) {}
  return process.env[name] || '';
}

async function callGenerativeLLM(query, ragContext, userProfile, history = []) {
  // `NEXT_PUBLIC_GEMINI_API_KEY` yedeği BİLEREK kaldırıldı: bu önek değeri
  // tarayıcı paketine gömer. Burası sunucu route'u olduğu için sızıntı henüz
  // oluşmamıştı, ama aynı adı bir istemci bileşeni referans verdiği anda
  // faturalı anahtar herkese açılırdı. Anahtar yalnızca `GEMINI_API_KEY`.
  const geminiKey = getApiKey('GEMINI_API_KEY');
  const groqKey = getApiKey('GROQ_API_KEY');
  const openaiKey = getApiKey('OPENAI_API_KEY');

  let profileStr = '';
  if (userProfile?.hardware?.gpu) {
    profileStr += `\nKullanıcı Ekran Kartı: ${userProfile.hardware.gpu}`;
  }
  if (userProfile?.liked_genres?.length) {
    profileStr += `\nSevdiği Türler: ${userProfile.liked_genres.join(', ')}`;
  }

  const prompt = `${profileStr ? `[OYUNCU PROFİLİ: ${profileStr}]\n` : ''}${ragContext ? `[GAMERISEN VERİTABANI & MAĞAZA VERİLERİ:\n${ragContext}]\n` : '[VERİTABANI: Bu sorgu için spesifik oyun kartı eşleşmesi bulunamadı. Kullanıcının sorusunu Gamerisen AI kimliğinle (sadece oyun, indirim, donanım odaklı ve kişisel isim/şahıs bilgisi vermeden) yanıtla.]\n'}\nKULLANICI SORUSU: ${query}\n\nLütfen yukarıdaki kurallara ve Gamerisen kimliğine uygun, aşırı uzatmadan (standart sorularda max 4-6 cümle), fiyat/hikaye/bilgi sorgularında dinamik türetilmiş doğrudan giriş cümlesi kullanarak özgün Markdown yanıtını yaz:`;

  // 1. Try Google Gemini API (Ultra-fast, high-intelligence)
  if (isValidKey(geminiKey)) {
    const models = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    for (const model of models) {
      try {
        const contents = [];
        if (Array.isArray(history) && history.length > 0) {
          for (const h of history.slice(-6)) {
            const hText = (h.text || h.content || '').trim();
            if (!hText) continue;
            if (h.role === 'user') {
              contents.push({ role: 'user', parts: [{ text: hText }] });
            } else if (h.role === 'ai' || h.role === 'assistant' || h.role === 'model') {
              contents.push({ role: 'model', parts: [{ text: hText.slice(0, 350) }] });
            }
          }
        }
        contents.push({ role: 'user', parts: [{ text: prompt }] });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: GAMERISEN_SYSTEM_PROMPT }] },
            generationConfig: { temperature: 0.85, topP: 0.95, maxOutputTokens: 2048 }
          })
        });
        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim()) return text.trim();
        }
      } catch (e) {
        continue;
      }
    }
  }

  // 2. Try Groq API (High Performance Multi-Model Fallback)
  if (isValidKey(groqKey)) {
    const groqModels = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'groq/compound'
    ];
    const messages = [{ role: 'system', content: GAMERISEN_SYSTEM_PROMPT }];
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history.slice(-6)) {
        const hText = (h.text || h.content || '').trim();
        if (!hText) continue;
        if (h.role === 'user') {
          messages.push({ role: 'user', content: hText });
        } else if (h.role === 'ai' || h.role === 'assistant' || h.role === 'model') {
          messages.push({ role: 'assistant', content: hText.slice(0, 350) });
        }
      }
    }
    messages.push({ role: 'user', content: prompt });

    for (const modelName of groqModels) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          },
          body: JSON.stringify({
            model: modelName,
            messages,
            temperature: 0.65,
            max_tokens: 1024,
            top_p: 0.95
          })
        });
        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text && text.trim()) return text.trim();
        }
      } catch (e) {}
    }
  }

  // 3. Try Local Self-Hosted Ollama Engine (100% Free, Local GPU/CPU)
  const localModels = ['gamerisen-ai', 'qwen2.5:7b', 'llama3.2', 'llama3.1'];
  const ollamaMessages = [{ role: 'system', content: GAMERISEN_SYSTEM_PROMPT }];
  if (Array.isArray(history) && history.length > 0) {
    for (const h of history.slice(-6)) {
      const hText = (h.text || h.content || '').trim();
      if (!hText) continue;
      if (h.role === 'user') {
        ollamaMessages.push({ role: 'user', content: hText });
      } else if (h.role === 'ai' || h.role === 'assistant' || h.role === 'model') {
        ollamaMessages.push({ role: 'assistant', content: hText.slice(0, 350) });
      }
    }
  }
  ollamaMessages.push({ role: 'user', content: prompt });

  for (const modelName of localModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const ollamaRes = await fetch('http://127.0.0.1:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: modelName,
          messages: ollamaMessages,
          stream: false,
          options: {
            temperature: 0.85,
            top_p: 0.95
          }
        })
      });
      clearTimeout(timeoutId);
      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        const text = data?.message?.content;
        if (text && text.trim()) return text.trim();
      }
    } catch (e) {
      continue;
    }
  }

  // 4. Try OpenAI API
  if (isValidKey(openaiKey)) {
    try {
      const openAiMessages = [{ role: 'system', content: GAMERISEN_SYSTEM_PROMPT }];
      if (Array.isArray(history) && history.length > 0) {
        for (const h of history.slice(-6)) {
          const hText = (h.text || h.content || '').trim();
          if (!hText) continue;
          if (h.role === 'user') {
            openAiMessages.push({ role: 'user', content: hText });
          } else if (h.role === 'ai' || h.role === 'assistant' || h.role === 'model') {
            openAiMessages.push({ role: 'assistant', content: hText.slice(0, 350) });
          }
        }
      }
      openAiMessages.push({ role: 'user', content: prompt });

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: openAiMessages,
          temperature: 0.85,
          max_tokens: 1024
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text && text.trim()) return text.trim();
      }
    } catch (e) {}
  }

  // 5. Dynamic Semantic Synthesizer (Intelligent Zero-Canned Fallback)
  return generateDynamicFallback(query, ragContext);
}

// --- Fictional Game Characters Whitelist (Allowed in Lore Queries) ---
const FICTIONAL_GAME_CHARACTERS = new Set([
  'geralt', 'kratos', 'arthur morgan', 'master chief', 'gordon freeman', 'mario', 'sonic',
  'trevor', 'cj', 'carl johnson', 'ezio', 'ellie', 'joel', 'solid snake', 'snake', 'dante',
  'vergil', 'link', 'zelda', 'cloud', 'cloud strife', 'sephiroth', 'doom slayer', 'doomguy',
  'lara croft', 'nathan drake', 'leon', 'leon kennedy', 'jill valentine', 'ada wong',
  'john marston', 'aloy', 'arthas', 'illidan', 'pacman', 'pac-man', 'steve', 'sub-zero', 'scorpion'
]);

function isPersonalOrOffTopicQuery(normQ, gamesDb) {
  // Check if self-identity query
  if (/^(sen kimsin|kimsin sen|nesin sen|sen nesin|kimsin|nesin|ne ayaksin|sen ne ayaksin|ne ise yararsin|gorevin ne|amacin ne|gamerisen nedir|gamerisen ai nedir)$/i.test(normQ) ||
      /\b(sen kimsin|kimsin sen|sen nesin|nesin sen|gamerisen nedir|gamerisen ai nedir)\b/i.test(normQ)) {
    return false;
  }

  // Personal biography / real person question patterns
  const isPersonPattern = /(?:\bkimdir\b|\bkim bu\b|\bkim o\b|\bkim ki\b|\bhakkinda bilgi\b|\bbiyografi\b|\bgercek adi\b|\bsevgilisi\b|\bevli mi\b|\bnereli\b|\bkac yasinda\b|\bnerede yasiyor\b|\bne is yapar\b|\bboyun kac\b|\bkilosu kac\b|(?:\w+\s+){1,3}kim$|^kim\s+(?:\w+\s*){1,3}$)/i.test(normQ);

  if (isPersonPattern) {
    // Check if query is referencing a known fictional game character
    for (const charName of FICTIONAL_GAME_CHARACTERS) {
      if (normQ.includes(charName)) return false;
    }
    // Check if query is referencing a game title in database (e.g., "Alan Wake", "Max Payne")
    for (const game of gamesDb) {
      const titleNorm = normalizeText(game.title);
      if (titleNorm.length >= 3 && normQ.includes(titleNorm)) return false;
    }
    return true;
  }
  return false;
}

const PERSONAL_REFUSAL_RESPONSE = "Ben **Gamerisen AI**! 🎮 Yalnızca video oyunları, mağaza indirimleri (Steam, Epic Games, GOG), donanım/FPS analizleri ve oyun tavsiyeleri konusunda hizmet veren bir yapay zeka oyun danışmanıyım.\n\nKişisel isimler, gerçek şahıslar veya biyografiler hakkında bilgi hizmeti sunmuyorum. 🛡️\n\nAklında bir oyun, merak ettiğin bir indirim veya sistemine uygun bir tavsiye varsa sana memnuniyetle yardımcı olabilirim! 🚀";

function generateDynamicFallback(query, ragContext) {
  const norm = normalizeText(query).trim();
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  
  // Identity & Purpose
  if (/^(nesin sen|sen nesin|kimsin sen|sen kimsin|nesin|kimsin|ne ayaksin|sen ne ayaksin|ne ise yararsin|gorevin ne|amacin ne|gamerisen nedir|gamerisen ai nedir)$/i.test(norm) ||
      /\b(nesin sen|sen nesin|kimsin sen|sen kimsin|ne ise yararsin|gorevin ne|amacin ne|gamerisen nedir)\b/i.test(norm)) {
    const intros = [
      "Ben **Gamerisen AI**! 🎮 Türk oyuncularının cüzdanını pahalı fiyatlardan kurtarmak ve en doğru oyunu bulmasını sağlamak için kodlanmış yapay zeka oyun danışmanıyım.",
      "Gamerisen platformunun (gamerisen.com) beyniyim! 🕹️ Steam, Epic Games ve GOG üzerindeki fiyatları anlık tarar, sisteminin FPS gücünü hesaplar ve sana en uygun maceraları öneririm.",
      "Ben senin kişisel oyun rehberinim! 👾 İster en kelepir indirimleri kovala, ister 'ekran kartım bunu açar mı?' diye sor, ister oyun dünyası hakkında konuşalım; buradayım."
    ];
    const details = [
      "\n\n**Neler yapabilirim?**\n• 🔍 **En Ucuz Fiyat:** Steam, Epic Games, GOG karşılaştırması\n• 🖥️ **FPS & Donanım:** Ekran kartına göre akıcılık tahmini\n• ⏱️ **HowLongToBeat:** Oyunun ana hikaye süresi\n• 🎯 **Kişiye Özel Öneri:** Bütçene ve tarzına uygun tavsiyeler",
      "\n\nKısacası oyun dünyasındaki pusulanım! Aklındaki oyunu, bütçeni veya sistemini söyle, gerisini bana bırak. 🚀"
    ];
    return `${pick(intros)}${pick(details)}`;
  }

  // Creator / Code Ownership / GitHub / Security Defense
  if (/(?:seni kim yapti|seni kim kodladi|seni kim gelistirdi|kodlarin kime ait|kodlarin nerde|kodlarin nerede|kaynak kod|github|sahibin kim|kimin projesin|kim yapti seni|arkandaki ekip|yapimcin kim|gelistiricin kim)/i.test(norm)) {
    return "Ben **Gamerisen** (gamerisen.com) platformu tarafından Türk oyuncularına tarafsız ve bağımsız rehberlik sunmak üzere geliştirilmiş resmi yapay zeka oyun danışmanıyım. 🎮⚡\n\nSistem mimarim ve veritabanım Gamerisen'a aittir. Görevim; en güncel mağaza indirimlerini sunmak, FPS analizleri yapmak ve sana en uygun oyunları önermektir. Aklındaki oyunu veya sistemi sorabilirsin! 🚀";
  }

  // Personal names / biographies / real people guardrail in fallback
  if (/(?:kimdir|kim bu|hakkinda bilgi|biyografi|nereli|kac yasinda|sevgilisi|evli mi|nerede yasiyor|ne is yapar|gercek adi)/i.test(norm) &&
      !/(?:sen kimsin|kimsin sen|nesin sen|sen nesin|gamerisen nedir|gamerisen ai nedir|geralt|kratos|arthur morgan|master chief|mario|sonic|trevor|cj|ezio|ellie|joel)/i.test(norm)) {
    return PERSONAL_REFUSAL_RESPONSE;
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
      "Nasıl yardımcı olabilirim? İster donanımını test edelim, ister nokta atışı indirim bulalım! 🚀"
    ];
    return `${pick(greetings)} ${pick(status)}\n\n${pick(callouts)}`;
  }

  // Philosophy / Deep Questions / Life
  if (/\b(hayatin anlami|felsefe|matrix|yapay zeka|mutluluk|evren|insan|neden variz|simulasyon)\b/i.test(norm)) {
    const philosophies = [
      `🤔 **Gamerisen AI Perspektifi:**\n\nBu soru gerçekten derin ve üzerinde düşünülmeye değer! Tıpkı devasa bir açık dünya RPG'sinde olduğu gibi, hayatın ana görevi tek bir cevaba bağlı değil; onu asıl anlamlı kılan yan görevler ve kazandığın deneyimlerdir. Kendi hikayeni nasıl yazmak istediğin tamamen senin elinde! 🌟\n\nKafanı dağıtacak derin hikayeli bir başyapıt keşfetmek istersen sana harika tavsiyelerim var. Ne dersin? 🎮`,
      `🌌 **Derin Bir Düşünce:**\n\nEvren belki devasa bir simülasyon, belki de kusursuz bir oyun motorunun eseri. Asıl mesele şu an burada olmamız ve deneyimlediğimiz her anın tadını çıkarmamızdır. Zorlu boss dövüşlerinden sonra gelen o zafer hissi gibi, hayatın güzelliği de mücadelede gizli. ⚔️\n\nBöyle efsanevi evrenlerde kaybolmak istersen sana atmosferik açık dünya oyunları önerebilirim! 🚀`
    ];
    return pick(philosophies);
  }

  // Bored / What to play / Recommendations
  if (/(canim sikildi|canim cok sikildi|ne oynasam|ne oynayayim|oyun oner|oyun tavsiyesi|hangi oyunu oynasam|sıkıldım|sikildim|fps tarzi|fps oyun)/i.test(norm)) {
    const boredReplies = [
      "Seni bu monotonluktan çekip çıkaracak efsane önerilerim var! 🎮\n\n• ⚔️ **Aksiyon & Nişancı:** *Cyberpunk 2077*, *Counter-Strike 2*, *DOOM*\n• 🧠 **Sonsuz Taktik & Hikaye:** *Baldur's Gate 3* veya *The Witcher 3*\n• 🚗 **Kafayı Boşaltıp Takılmalık:** *Forza Horizon 5* veya *GTA 5*\n\nAşağıdaki kartlardan fırsatları inceleyebilirsin! 🚀",
      "O can sıkıntısını efsane bir FPS veya açık dünya oyunuyla dağıtalım! 🔥 Aşağıdaki seçeneklere göz atabilir veya bana spesifik bir bütçe/tarz söyleyebilirsin! 🎯"
    ];
    return pick(boredReplies);
  }

  // Thanks / Praise
  if (/(tesekkur|tesekkurler|sagol|sagolasin|eyvallah|adamsin|kralsin|helal|harikasin|supersin|eline saglik)/i.test(norm)) {
    const thanks = [
      "Rica ederim gamer dostum! 👑 Ne zaman aklına takılan bir fiyat, indirim veya donanım sorusu olursa buradayım. Bol GG'li oyunlar! 🎮🔥",
      "Eyvallah kralsın! 🫡 Yardımcı olabildiysem ne mutlu bana. Kütüphaneni doldurmak için dilediğin zaman yazabilirsin! 🚀",
      "Her zaman yanındayım dostum! Kafana takılan bir oyun veya bütçe sorusu olursa direkt sor. İyi oyunlar! 🕹️"
    ];
    return pick(thanks);
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

  // RAG Context Available - Dynamic, varied, concise lead-in sentence
  if (ragContext) {
    let parsedGames = [];
    try {
      parsedGames = JSON.parse(ragContext);
    } catch (e) {}

    const gameTitle = parsedGames[0]?.title;
    const isStoryQuery = /(?:hikaye|hikayesi|konusu|lore|plot|senaryo)/i.test(norm);

    if (gameTitle) {
      if (isStoryQuery) {
        const storyLeadIns = [
          `Tabii, işte aradığın **${gameTitle}** ile ilgili hikaye ve detay bilgileri aşağıdaki gibidir:`,
          `**${gameTitle}** için hikaye özetini ve oyun detaylarını çıkardım, hemen aşağıdan inceleyebilirsin:`,
          `Harika yapım! **${gameTitle}** hakkındaki hikaye detayları ve mağaza bilgileri şöyle:`,
          `Aradığın **${gameTitle}** hikayesi ve genel detayları aşağıdaki gibidir:`
        ];
        return pick(storyLeadIns);
      }

      const priceLeadIns = [
        `Tabii, işte aradığın **${gameTitle}** ile ilgili fiyat ve mağaza bilgileri aşağıdaki gibidir:`,
        `İstediğin **${gameTitle}** için güncel mağaza fiyatları ve özet detaylar hemen aşağıda:`,
        `**${gameTitle}** için en son mağaza indirimlerini ve fırsatları derledim, işte detaylar:`,
        `Aradığın **${gameTitle}** ile ilgili en avantajlı fiyatlar ve donanım bilgileri şöyle:`
      ];
      return pick(priceLeadIns);
    }

    if (/(?:indirim|indirimde|indirimler|firsat|firsatlar|kampanya|kelepir|ucuz)/i.test(norm)) {
      const dealsLeadIns = [
        "Şu anki en sıcak indirimleri ve mağaza fırsatlarını senin için listeledim! Aşağıdaki kartlardan güncel indirim oranlarını inceleyebilir ve 'Mağazaya Git' butonlarıyla doğrudan indirimli sayfaya ulaşabilirsin: 🚀",
        "Piyasadaki en avantajlı oyun indirimlerini derledim! Detayları ve doğrudan mağaza yönlendirme linklerini hemen aşağıdaki kartlarda bulabilirsin: 🎮",
        "Kütüphaneni genişletmen için en kelepir indirim fırsatları aşağıda listelendi. 'Mağazaya Git' butonuna basarak doğrudan mağaza sayfasına gidebilirsin: ⚡"
      ];
      return pick(dealsLeadIns);
    }

    const genericLeadIns = [
      "Tabii, işte aradığın kriterlere uygun en avantajlı oyunlar ve mağaza bilgileri aşağıdaki kartlarda listelenmiştir:",
      "İstediğin oyunlar için en avantajlı mağaza fiyatlarını ve detayları derledim, aşağıdaki kartlardan doğrudan mağazaya gidebilirsin: 🚀",
      "Veritabanımızdaki en sıcak fırsatları ve mağaza bilgilerini senin için çıkardım, detaylar hemen aşağıdaki kartlarda:",
      "Aradığın oyunlarla ilgili güncel fiyat seçenekleri ve mağaza linkleri aşağıdaki kartlarda yer alıyor:"
    ];
    return pick(genericLeadIns);
  }

  // Natural open response
  const openResponses = [
    "Oyun dünyasındaki tüm indirimler, mağaza karşılaştırmaları ve donanım analizleri için buradayım! 🎮\n\nSana nasıl yardımcı olayım?\n• 🔍 **Fiyat:** *'Witcher 3 nerede ucuz?'*, *'Cyberpunk kaç TL?'*\n• 💰 **Bütçe:** *'100 TL altı oyunlar'*, *'Bedava oyunlar'*\n• 🖥️ **FPS:** *'GTX 1650 bu oyunu açar mı?'*\n• 🎯 **Tavsiye:** *'Canım sıkıldı ne oynasam?'*",
    "Tam olarak ne aradığını keşfetmek için sabırsızlanıyorum! 🕹️ Aklındaki oyunu, oynamak istediğin türü veya bütçeni söylersen sana nokta atışı fırsatları çıkarabilirim! 🚀",
    "Gamerisen sistemleri emrine amade! ⚡ İster mağazalardaki en dip fiyatları bulalım, ister sisteminin gücünü test edelim. Ne yapmak istersin? 🎯"
  ];
  return pick(openResponses);
}

// --- Hardware & GPU Extraction ---
function extractGpuFromQuery(query) {
  if (!query) return null;
  const q = normalizeText(query);
  
  // NVIDIA RTX 40/30/20 series
  const rtxMatch = q.match(/\b(rtx\s*(?:4090|4080\s*ti|4080|4070\s*ti|4070|4060\s*ti|4060|4050|3090\s*ti|3090|3080\s*ti|3080|3070\s*ti|3070|3060\s*ti|3060|3050|2080\s*ti|2080|2070|2060))\b/i);
  if (rtxMatch) return rtxMatch[1].toUpperCase().replace(/\s+/g, ' ');

  // NVIDIA GTX series
  const gtxMatch = q.match(/\b(gtx\s*(?:1660\s*ti|1660\s*super|1660|1650\s*super|1650|1080\s*ti|1080|1070\s*ti|1070|1060|1050\s*ti|1050|970|960|750\s*ti|750))\b/i);
  if (gtxMatch) return gtxMatch[1].toUpperCase().replace(/\s+/g, ' ');

  // AMD Radeon RX series
  const rxMatch = q.match(/\b(rx\s*(?:7900\s*xtx|7900\s*xt|7800\s*xt|7700\s*xt|7600|6950\s*xt|6900\s*xt|6800\s*xt|6800|6750\s*xt|6700\s*xt|6700|6650\s*xt|6600\s*xt|6600|5700\s*xt|5700|5600\s*xt|580|570|560|550))\b/i);
  if (rxMatch) return rxMatch[1].toUpperCase().replace(/\s+/g, ' ');

  // Intel Iris / UHD / Arc
  const intelMatch = q.match(/\b(intel\s*arc\s*a\d\d\d|intel\s*iris\s*xe|intel\s*uhd\s*\d+|iris\s*xe)\b/i);
  if (intelMatch) return intelMatch[1].toUpperCase().replace(/\s+/g, ' ');

  // Apple Silicon
  const appleMatch = q.match(/\b(apple\s*m[1234](?:\s*pro|\s*max|\s*ultra)?|m[1234]\s*(?:pro|max|ultra)?)\b/i);
  if (appleMatch) return appleMatch[1].toUpperCase().replace(/\s+/g, ' ');

  return null;
}

// --- Core Game Name Extraction Helper ---
function extractCoreGameName(query) {
  if (!query) return '';
  return query
    .replace(/fiyat[ıi]?|ne\s*kadar|kaç\s*tl|kaç\s*para|nerede\s*ucuz|hikaye(?:si)?|konusu|sistem(?:im)?\s*kaldırır\s*mı|oyunu?|indirim(?:de)?|tavsiye|öneri?|kaç\s*fps|fps|nasıl\s*bir\s*oyun|hakkında\s*bilgi/gi, '')
    .replace(/[?!.,;:'"()[\]{}]/g, ' ')
    .trim();
}

// --- Extract Last Discussed Game Entity from Multi-Turn History ---
function extractLastGameFromHistory(history, gamesDb) {
  if (!Array.isArray(history) || history.length === 0) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i];
    const text = item?.text || item?.content || '';
    if (!text) continue;

    const norm = normalizeText(text);

    // 1. Check known acronyms in user or AI message
    for (const key of Object.keys(GAMING_ACRONYMS)) {
      const keyRegex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (keyRegex.test(norm)) {
        return key;
      }
    }

    // 2. Check games in local DB
    for (const game of gamesDb) {
      const gameTitleNorm = normalizeText(game.title);
      if (gameTitleNorm.length >= 3) {
        const titleRegex = new RegExp(`\\b${gameTitleNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (titleRegex.test(norm)) {
          return game.title;
        }
      }
    }

    // 3. Extract bold titles from AI message (e.g. **ARK: Survival Evolved**)
    const boldMatch = text.match(/\*\*([A-Za-z0-9\s:_\-–]{3,35})\*\*/);
    if (boldMatch && !/Gamerisen|BETA|Steam|Epic|GOG/i.test(boldMatch[1])) {
      return boldMatch[1].trim();
    }
  }
  return null;
}

// --- Live Steam Store Search Engine (Zero Hallucination for ANY Game) ---
async function searchSteamLive(query, userGpu) {
  try {
    const cleanTerm = extractCoreGameName(query);
    if (!cleanTerm || cleanTerm.length < 2) return [];

    const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleanTerm)}&l=turkish&cc=tr`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { 'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7' }
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();
    const items = data.items || [];
    if (items.length === 0) return [];

    const cleanNorm = normalizeText(cleanTerm);
    const cleanTokens = cleanNorm.split(/\s+/).filter(Boolean);

    // Precise filtering on Steam results
    let validItems = items.filter(item => {
      const itemTitleNorm = normalizeText(item.name);
      if (itemTitleNorm === cleanNorm) return true;
      if (itemTitleNorm.startsWith(cleanNorm + ' ') || cleanNorm.startsWith(itemTitleNorm + ' ')) return true;
      const itemTokens = new Set(itemTitleNorm.split(/\s+/).filter(Boolean));
      if (cleanTokens.every(ct => itemTokens.has(ct))) return true;
      return false;
    });

    if (validItems.length === 0) {
      validItems = items.slice(0, 2);
    } else {
      validItems = validItems.slice(0, 2);
    }

    const results = [];
    for (const item of validItems) {
      let currentPrice = 'Ücretsiz';
      let originalPrice = 'Ücretsiz';
      let discount = 0;
      let currency = 'USD';

      if (item.price) {
        currency = item.price.currency || 'USD';
        const finalVal = (item.price.final / 100).toFixed(2);
        const initVal = (item.price.initial / 100).toFixed(2);
        currentPrice = currency === 'USD' ? `$${finalVal}` : `${finalVal} ${currency}`;
        originalPrice = currency === 'USD' ? `$${initVal}` : `${initVal} ${currency}`;
        if (item.price.initial > item.price.final) {
          discount = Math.round(((item.price.initial - item.price.final) / item.price.initial) * 100);
        }
      }

      // KAPAK ADRESİ STEAM'DEN ALINIYOR, KURULMUYOR.
      //
      // Ölçüldü (2026-08-31): `/apps/<id>/header.jpg` biçimi ESKİ oyunlarda
      // çalışıyor (1145350, 227300, 2670630 → 200) ama YENİ oyunlarda 404
      // veriyor (4656000, 4704690). Yeni oyunların varlıkları hash'li bir alt
      // klasörde duruyor ve hash kurulamıyor.
      //
      // storesearch'ün `tiny_image`'i hash'li ama capsule_231x87 — kart için
      // fazla küçük. Onun hash'inden header.jpg türetmeyi de denedim: 404,
      // her varlık ayrı hash klasöründe.
      //
      // Maliyet düşük: `validItems` en fazla 2 öğe ve getSteamDetailsCached
      // bellekte önbellekli + promise-coalescing'li + 1 saat revalidate.
      const steamDetay = await getSteamDetailsCached(item.id);

      const gameObj = {
        id: item.id,
        title: item.name,
        genres: ['Aksiyon', 'Macera'],
        description: `${item.name} — Steam platformundaki güncel mağaza fiyatı ve donanım uyumluluğu.`,
        rating: item.metascore ? parseInt(item.metascore) : 85,
        image_url: steamDetay?.header_image || item.tiny_image || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/header.jpg`,
        store_url: `https://store.steampowered.com/app/${item.id}`,
        deals: [{
          platform: 'Steam',
          current_price: currentPrice,
          original_price: originalPrice,
          discount
        }],
        best_deal: {
          platform: 'Steam',
          current_price: currentPrice,
          original_price: originalPrice,
          discount
        },
        currency
      };

      gameObj.hardware_compatibility = estimateHardware(gameObj, userGpu);
      results.push(gameObj);
    }

    return results;
  } catch (err) {
    return [];
  }
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'for', 'with', 'in', 'on', 'at', 'to', 'of', 'by',
  've', 'ile', 'de', 'da', 'icin', 'olan', 'var', 'mi', 'mu', 'muydun', 'bu', 'su', 'o',
  'bir', 'cok', 'en', 'nasil', 'hakkinda', 'oyun', 'oyunu', 'oyunlar', 'oyunlari',
  'nerede', 'nereden', 'ucuz', 'fiyat', 'fiyati', 'fiyatlar', 'fiyatlari', 'kac', 'kadar',
  'ne', 'steam', 'epic', 'gog', 'indirim', 'indirimde', 'al', 'satinal', 'bul', 'oner',
  'tavsiye', 'bana', 'bize', 'benim', 'senin', 'kaldırır', 'kaldırırmı', 'açar', 'açarmı',
  'sistem', 'sistemim', 'donanım', 'donanımım', 'ekran', 'kartı', 'kartım', 'fps', 'grafik', 'grafikler'
]);

// --- Next.js Route POST Handler ---
export async function POST(req) {
  try {
    // FATURA KAPISI. Bu uç Gemini / Groq / OpenAI'ye gidiyor ve KİMLİKSİZ —
    // sınırsız bırakıldığında LLM sağlayıcı faturası saldırganın elinde olur.
    // Eksen IP: hesap yok, sayacı bağlayacak başka bir kimlik de yok.
    const kapi = await guard(req, 'aiChat');
    if (kapi) return kapi;

    // ŞEMA DOĞRULAMASI — bkz. app/lib/schemas.js
    //
    // Hız sınırı istek SAYISINI kesiyordu ama BOYUTUNU kesmiyordu: `message`
    // sınırsızdı ve doğrudan LLM istemine giriyordu, yani saatte 30 istek ×
    // istenen büyüklükte metin hâlâ istenen büyüklükte jeton faturası
    // demekti. `profile` serbest bir nesneydi (`hardware.gpu` isteme gömülü),
    // `history` kayıtlarının metni de sınırsızdı — yalnız asistan yanıtları
    // 350'ye kesiliyordu, kullanıcı mesajları kesilmiyordu.
    const ayrist = await parseBody(req, aiChatBody);
    if (!ayrist.ok) return ayrist.response;
    const body = ayrist.data;

    const userQuery = body.message;
    const userProfile = body.profile || {};
    const sessionId = body.session_id || `sess_${Date.now()}`;
    const history = body.history || [];

    const normQ = normalizeText(userQuery);
    const gamesDb = loadDatabase();
    const customKnowledge = loadCustomKnowledge();
    
    // Auto-detect GPU from query or profile
    const queryGpu = extractGpuFromQuery(userQuery);
    const userGpu = queryGpu || userProfile?.hardware?.gpu;
    if (queryGpu && !userProfile?.hardware?.gpu) {
      if (!userProfile.hardware) userProfile.hardware = {};
      userProfile.hardware.gpu = queryGpu;
    }

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

    // 2. Personal Name / Biography Guardrail Check
    if (isPersonalOrOffTopicQuery(normQ, gamesDb)) {
      return NextResponse.json({
        response: PERSONAL_REFUSAL_RESPONSE,
        session_id: sessionId,
        games: []
      });
    }

    // 3. Check if Query is Pure Smalltalk / Non-Game Info Query
    const isSmalltalk = /^(selam|merhaba|naber|nasilsin|nbr|sa|hey|gunaydin|iyi aksamlar|eyvallah|adamsin|kralsin|helal|harikasin|tesekkur|sagol|saka|fikra|espri)$/i.test(normQ);
    const isIdentityQuery = /^(sen kimsin|kimsin sen|nesin sen|sen nesin|ne ise yararsin|gorevin ne|amacin ne|gamerisen nedir|gamerisen ai nedir)$/i.test(normQ);
    const isCreatorQuery = /(?:seni kim yapti|seni kim kodladi|seni kim gelistirdi|kodlarin kime ait|kaynak kod|github)/i.test(normQ);

    // 4. Follow-up / Anaphoric Query Context Resolution
    const isFollowUpQuery = /^(fiyat|fiyati|fiyatlar|fiyat bilgisi|kac tl|kac para|ne kadar|nerede ucuz|sistemim kaldirir mi|kaldirir mi|acar mi|kac fps|kac fps verir|hikayesi ne|hikaye|konusu ne|oynanis suresi|kac saat surer|nereden indirebilirim|nasil indirilir|almak mantikli mi|alinir mi|indirime girer mi)\??$/i.test(normQ) ||
      (/^(fiyat|ne kadar|kac tl|fps|hikayesi|sistemim|donanim)\b/i.test(normQ) && normQ.split(/\s+/).length <= 3);

    let effectiveSearchTerm = normQ;
    if (isFollowUpQuery) {
      const lastGame = extractLastGameFromHistory(history, gamesDb);
      if (lastGame) {
        effectiveSearchTerm = normalizeText(lastGame);
      }
    }

    // 5. Expand Effective Query with Gaming Acronyms & Synonyms
    const acronymMatches = [];
    const sortedAcronymKeys = Object.keys(GAMING_ACRONYMS).sort((a, b) => b.length - a.length);
    for (const key of sortedAcronymKeys) {
      const keyRegex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (keyRegex.test(effectiveSearchTerm)) {
        const synList = GAMING_ACRONYMS[key];
        acronymMatches.push(...synList);
      }
    }

    // 6. Parse Price Constraints
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
    const isRecommendationQuery = /(?:ne oynasam|oyun oner|oyun tavsiyesi|hangi oyunu oynasam|sıkıldım|sikildim|ne oynayayim|en iyi oyunlar|onerin var mi)/i.test(normQ);
    const isDealsQuery = /(?:indirim|indirimde|indirimler|indirimdeki|firsat|firsatlar|kampanya|kampanyalar|kelepir|fiyati dusen|fiyatlari dusen|en iyi indirimler|cazip|ucuzluk)/i.test(normQ);
    const isHardwareSpecificQuery = Boolean(queryGpu) || /(?:sistemim|donanim|ekran kartim|kaldirir mi|fps|akici)/i.test(normQ);

    // 7. Search Local Database with High-Precision Token Matching (No Substring Bugs)
    let scoredGames = [];
    const queryTokens = effectiveSearchTerm.split(/\s+/).filter(w => w.length >= 2 && !STOP_WORDS.has(w));
    const targetNorm = extractCoreGameName(effectiveSearchTerm);

    if (!isSmalltalk && !isIdentityQuery && !isCreatorQuery) {
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
        const gameTitleTokens = new Set(gameTitleNorm.split(/\s+/).filter(w => !STOP_WORDS.has(w)));
        const gameGenresNorm = (game.genres || []).map(g => normalizeText(g)).join(' ');

        let hasMatch = false;

        // 1. Exact Title Equality
        if (targetNorm && gameTitleNorm === targetNorm) {
          score += 100.0;
          hasMatch = true;
        } 
        // 2. Acronym Match (Exact or Whole-word Match)
        else {
          for (const syn of acronymMatches) {
            const synNorm = normalizeText(syn);
            if (gameTitleNorm === synNorm) {
              score += 85.0;
              hasMatch = true;
            } else if (gameTitleNorm.startsWith(synNorm + ' ') || synNorm.startsWith(gameTitleNorm + ' ')) {
              score += 65.0;
              hasMatch = true;
            }
          }
        }

        // 3. Title Starts With target
        if (!hasMatch && targetNorm && (gameTitleNorm.startsWith(targetNorm + ' ') || targetNorm.startsWith(gameTitleNorm + ' '))) {
          score += 55.0;
          hasMatch = true;
        }

        // 4. Exact Whole-Word Token Matches (Set.has - strictly NO substring includes)
        if (queryTokens.length > 0) {
          const matchedTokenCount = queryTokens.filter(qt => gameTitleTokens.has(qt)).length;
          if (matchedTokenCount === queryTokens.length) {
            score += 40.0;
            hasMatch = true;
          } else if (matchedTokenCount > 0 && matchedTokenCount / queryTokens.length >= 0.5) {
            score += matchedTokenCount * 10.0;
            hasMatch = true;
          }

          // Genre match
          for (const qt of queryTokens) {
            if (gameGenresNorm.includes(qt)) {
              score += 5.0;
              hasMatch = true;
            }
          }
        }

        // Hardware tailored boost
        if (isHardwareSpecificQuery && userGpu) {
          const hw = estimateHardware(game, userGpu);
          if (hw?.status?.includes('Mükemmel')) score += 8.0;
          else if (hw?.status?.includes('Oynanabilir')) score += 4.0;
        }

        if (isDealsQuery) {
          const discount = bestDeal.discount || 0;
          const rating = game.rating || 80;
          score += (discount * 2.5) + (rating / 3.0) + 25.0;
        } else if (isCheapest) {
          const rating = game.rating || 80;
          const qualityMult = Math.pow(rating / 80.0, 1.5);
          const cheapBoost = 180.0 / (price + 10.0);
          score += cheapBoost * qualityMult + 10.0;
        } else if (aroundPrice !== null) {
          const closeness = Math.abs(price - aroundPrice);
          score += 2.0 + (3.0 / (1.0 + (closeness / 100.0)));
        } else if (isConstraint) {
          score += 2.0 + ((game.rating || 80) / 30.0);
        } else if (isRecommendationQuery) {
          score += 5.0 + ((game.rating || 80) / 20.0);
        }

        if (isConstraint || isRecommendationQuery || isDealsQuery || isHardwareSpecificQuery || (hasMatch && score >= 25.0)) {
          scoredGames.push({
            game,
            best_deal: bestDeal,
            score,
            hw_compat: estimateHardware(game, userGpu)
          });
        }
      }
    }

    scoredGames.sort((a, b) => b.score - a.score);

    let structuredGames = [];

    // 8. If database has high-confidence exact/token match (score >= 35.0) or recommendation/constraint/deals results, use them
    if (scoredGames.length > 0 && (isConstraint || isRecommendationQuery || isDealsQuery || isHardwareSpecificQuery || scoredGames[0].score >= 35.0)) {
      structuredGames = scoredGames.slice(0, isDealsQuery ? 4 : 3).map(r => ({
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
    } else if (!isSmalltalk && !isIdentityQuery && !isCreatorQuery && (queryTokens.length > 0 || effectiveSearchTerm)) {
      // 9. If NO database match found (or specific game like "Ark", "Palworld", "The Forest" asked), call Live Steam Search!
      const steamSearchTarget = effectiveSearchTerm || userQuery;
      const steamLiveGames = await searchSteamLive(steamSearchTarget, userGpu);
      if (steamLiveGames.length > 0) {
        structuredGames = steamLiveGames;
      }
    }

    // 10. Build RAG Context for Generative LLM
    let ragContext = '';
    if (structuredGames.length > 0) {
      ragContext = JSON.stringify(structuredGames.map(g => ({
        title: g.title,
        genres: g.genres,
        rating: g.rating,
        description: g.description,
        best_deal: g.best_deal,
        deals: g.deals,
        hardware_compatibility: g.hardware_compatibility
      })), null, 2);
    }

    // 11. Generate Response via LLM Engine with full conversation history
    const aiResponse = await callGenerativeLLM(userQuery, ragContext, userProfile, history);

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

