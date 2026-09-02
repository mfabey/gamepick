import { NextResponse } from 'next/server';
import { guard } from '../../lib/rate-guard';

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL    = 'llama-3.3-70b-versatile';

// Bellekte basit cache (serverless warm state)
const _cache = new Map();

function isValidApiKey(key) {
  return key && key.trim() !== '' && !key.startsWith('buraya_') && key !== 'placeholder';
}

async function getFallbackAiData(name, description, lang = 'tr') {
  let translatedDesc = '';
  const isTr = lang === 'tr';

  // Sadece Türkçe ise çeviri yap
  if (isTr) {
    try {
      const cleanDesc = description.replace(/<[^>]+>/g, '').trim();
      if (cleanDesc) {
        // Split into chunks of maximum 450 characters to stay within MyMemory's 500-char limit
        const sentences = cleanDesc.match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [cleanDesc];
        const chunks = [];
        let currentChunk = "";
        
        for (const sentence of sentences) {
          if ((currentChunk + sentence).length > 450) {
            if (currentChunk.trim()) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = sentence;
          } else {
            currentChunk += sentence;
          }
        }
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }

        // Limit fallback translation to top 3 chunks (approx 1200-1350 chars max) to avoid API spamming
        const activeChunks = chunks.slice(0, 3);
        const promises = activeChunks.map(async (chunk) => {
          try {
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|tr`;
            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();
              const translatedText = data?.responseData?.translatedText;
              // Ensure the result is valid and doesn't contain limit warning messages
              if (translatedText && 
                  !translatedText.includes("LIMIT EXCEEDED") && 
                  !translatedText.includes("MYMEMORY WARNING")) {
                return translatedText;
              }
            }
          } catch (e) {
            console.error("Chunk translation fetch error:", e.message);
          }
          return chunk; // fallback to original chunk text
        });

        const translatedChunks = await Promise.all(promises);
        translatedDesc = translatedChunks.join(' ');
      }
    } catch (err) {
      console.error("Fallback translation error:", err);
    }
  }

  if (!translatedDesc) {
    translatedDesc = description.replace(/<[^>]+>/g, '').trim().slice(0, 1000);
  }

  const ozet = isTr
    ? `${name}, sürükleyici hikayesi, etkileyici atmosferi ve derin oynanış dinamikleriyle dikkat çeken popüler bir yapımdır. Kendi türünün başarılı örneklerinden biri olarak kabul edilir.`
    : `${name} is a popular game known for its immersive story, impressive atmosphere, and deep gameplay mechanics. It is considered one of the successful examples of its genre.`;
    
  const duygu = isTr
    ? `Oyuncular genel olarak yapımın tasarımını, atmosferini ve sunduğu deneyimi oldukça olumlu karşılıyor. Toplulukta beğeni toplamış bir oyundur.`
    : `Players generally receive the design, atmosphere, and overall experience of the game very positively. It is a highly acclaimed title in the community.`;
    
  const etiketler = isTr
    ? ['macera', 'aksiyon', 'hikaye-odaklı', 'popüler', 'sürükleyici']
    : ['adventure', 'action', 'story-rich', 'popular', 'immersive'];

  return {
    ozet,
    aciklama: translatedDesc,
    duygu,
    etiketler,
  };
}

// GET /api/ai-game?appid=271590&name=GTA+V&description=...&lang=tr
export async function GET(request) {
  // Groq çağrısı yapıyor, kimliksiz — bkz. ai/chat.
  const kapi = await guard(request, 'aiSearch');
  if (kapi) return kapi;

  const { searchParams } = new URL(request.url);
  const appid       = searchParams.get('appid');
  const name        = searchParams.get('name')        || '';
  const description = searchParams.get('description') || '';
  const lang        = searchParams.get('lang')        || 'tr';

  if (!appid || !name) {
    return NextResponse.json({ error: 'appid ve name gerekli' }, { status: 400 });
  }

  const cacheKey = `${appid}_${lang}`;

  // Cache'den döndür
  if (_cache.has(cacheKey)) return NextResponse.json(_cache.get(cacheKey));

  // API anahtarı yoksa veya placeholder ise doğrudan fallback çalıştır
  if (!isValidApiKey(GROQ_KEY)) {
    const fallbackData = await getFallbackAiData(name, description, lang);
    _cache.set(cacheKey, fallbackData);
    return NextResponse.json(fallbackData);
  }

  try {
    // ── Steam yorumlarını al (opsiyonel) ────────────────────────────────────
    let reviewText = '';
    try {
      if (/^\d+$/.test(appid)) {
        const rRes  = await fetch(
          `https://store.steampowered.com/appreviews/${appid}?json=1&num_per_page=12&language=all&filter=helpful`,
          { next: { revalidate: 7200 } }
        );
        const rData = await rRes.json();
        reviewText  = (rData?.reviews || [])
          .slice(0, 8)
          .map(r => r.review?.replace(/\n/g, ' ').slice(0, 180))
          .filter(Boolean)
          .join(' | ');
      }
    } catch { /* yorumlar opsiyonel */ }

    // ── Açıklamayı temizle ──────────────────────────────────────────────────
    const cleanDesc = description
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 600);

    const isTr = lang === 'tr';
    const systemContent = isTr
      ? 'Sen bir oyun eleştirmenisin. Her zaman geçerli JSON formatında, sade Türkçe yanıt ver.'
      : 'You are a video game critic. Always reply in valid JSON format only, in simple English.';

    const userPrompt = isTr ? `
Oyun: ${name}
Açıklama (İngilizce): ${cleanDesc}
${reviewText ? `\nOyuncu Yorumları: ${reviewText}` : ''}

Aşağıdaki JSON formatında TAM Türkçe yanıt üret:
{
  "ozet": "Oyunun 2-3 cümlelik açık ve merak uyandırıcı Türkçe özeti",
  "aciklama": "Açıklama (İngilizce) bölümünü doğal, akıcı Türkçeye çevir. Birebir çeviri değil, doğal Türkçe olsun. Tüm içeriği kapsasın.",
  "duygu": "Yorumlara göre oyuncuların genel izlenimi — sevdikleri ve eleştirdikleri (1-2 cümle)",
  "etiketler": ["etiket1","etiket2",...,"etiket12"]
}

Etiketler için şu listeden OYUNA UYGUN olanları seç (8-15 adet, küçük harfli, Türkçe).
Listede olmayan ama oyuna çok uygun özgün etiketler de ekleyebilirsin:

• TÜR: aksiyon, macera, rpg, strateji, simülasyon, bulmaca, korku, spor, yarış, platform, dövüş, nişancı
• TARİHSEL DÖNEM: kovboy, western, ortaçağ, viking, samuray, ninja, korsan, antik-yunan, roma, mısır, şövalye, rönesans, ww2, birinci-dünya-savaşı, soğuk-savaş, gelecek
• TEMA: uzay, deniz, savaş, tarih, fantezi, bilim-kurgu, zombi, vahşi-doğa, şehir, suç, mitoloji, ejderha, vampir, cadı, siberpunk, distopya, apokaliptik, steampunk, anime, japon, çizgi-roman
• ORTAM: orman, çöl, kar, ada, okyanusun-altı, uzay-istasyonu, dungeon, bataklık, şehir-harabeleri, yeraltı
• OYNANŞ: açık-dünya, çok-oyunculu, hikaye-odaklı, rekabetçi, co-op, sandbox, roguelike, hayatta-kalma, yapım, crafting, keşif, gizlilik, at-binme, uçuş, iki-boyutlu, üst-görünüş, sinematik, gerilim, gizem, dedektif, atmosferik, retro, piksel, indie

Oyunun arka plan bilgilerine göre özellikle ÖZGÜn, AYIRT EDİCİ etiketler seç.
Sadece JSON döndür. Başka hiçbir metin ekleme.`.trim() : `
Game: ${name}
Description: ${cleanDesc}
${reviewText ? `\nPlayer Reviews: ${reviewText}` : ''}

Generate a response in the following JSON format in English:
{
  "ozet": "A 2-3 sentence engaging summary of the game in English",
  "aciklama": "Leave this field empty",
  "duygu": "General player consensus based on reviews - what they liked and disliked (1-2 sentences in English)",
  "etiketler": ["tag1","tag2",...,"tag12"]
}

Select appropriate tags in English (8-15 tags, lowercase). You can choose from standard tags (action, adventure, rpg, strategy, shooter, cowboy, sci-fi, horror, survival, open-world, rich-story, multiplayer, co-op) or custom ones. Only return JSON. Do not add any other text.
`.trim();

    const candidateModels = ['openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'openai/gpt-oss-20b', 'groq/compound', MODEL];
    let aiData = null;
    for (const modelName of candidateModels) {
      try {
        const aiRes = await fetch(GROQ_URL, {
          method:  'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_KEY}`,
            'Content-Type':  'application/json',
            'User-Agent':    'GamerisenAI/2.0 (gamerisen.com)'
          },
          body: JSON.stringify({
            model:       modelName,
            max_tokens:  800,
            temperature: 0.7,
            messages: [
              { role: 'system',  content: systemContent },
              { role: 'user',    content: userPrompt },
            ],
          }),
        });

        if (aiRes.ok) {
          aiData = await aiRes.json();
          break;
        }
      } catch (e) {}
    }

    if (!aiData) {
      throw new Error('Groq model yanıtı alınamadı.');
    }

    const rawText = aiData?.choices?.[0]?.message?.content || '';

    // JSON'u raw içinden çıkar
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON bulunamadı: ' + rawText.slice(0, 100));

    const parsed = JSON.parse(jsonMatch[0]);

    const result = {
      ozet:      parsed.ozet      || null,
      aciklama:  parsed.aciklama  || null,
      duygu:     parsed.duygu     || null,
      etiketler: Array.isArray(parsed.etiketler) ? parsed.etiketler.slice(0, 15) : [],
    };

    if (!result.ozet) {
      throw new Error('Dönen AI verisi geçersiz veya eksik.');
    }

    _cache.set(cacheKey, result);
    return NextResponse.json(result);

  } catch (err) {
    console.error('AI-game hatası, yerel fallback çalıştırılıyor:', err.message);
    const fallbackData = await getFallbackAiData(name, description, lang);
    _cache.set(cacheKey, fallbackData);
    return NextResponse.json(fallbackData);
  }
}
