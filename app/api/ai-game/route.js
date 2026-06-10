import { NextResponse } from 'next/server';

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL    = 'llama-3.3-70b-versatile';

// Bellekte basit cache (serverless warm state)
const _cache = new Map();

function isValidApiKey(key) {
  return key && key.trim() !== '' && !key.startsWith('buraya_') && key !== 'placeholder';
}

async function getFallbackAiData(name, description) {
  let translatedDesc = '';
  try {
    const cleanDesc = description.replace(/<[^>]+>/g, '').trim().slice(0, 1000);
    if (cleanDesc) {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanDesc)}&langpair=en|tr`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        translatedDesc = data?.responseData?.translatedText || '';
      }
    }
  } catch (err) {
    console.error("Fallback translation error:", err);
  }

  if (!translatedDesc) {
    translatedDesc = description.replace(/<[^>]+>/g, '').trim().slice(0, 1000);
  }

  const ozet = `${name}, sürükleyici hikayesi, etkileyici atmosferi ve derin oynanış dinamikleriyle dikkat çeken popüler bir yapımdır. Kendi türünün başarılı örneklerinden biri olarak kabul edilir.`;
  const duygu = `Oyuncular genel olarak yapımın tasarımını, atmosferini ve sunduğu deneyimi oldukça olumlu karşılıyor. Toplulukta beğeni toplamış bir oyundur.`;
  const etiketler = ['macera', 'aksiyon', 'hikaye-odaklı', 'popüler', 'sürükleyici'];

  return {
    ozet,
    aciklama: translatedDesc,
    duygu,
    etiketler,
  };
}

// GET /api/ai-game?appid=271590&name=GTA+V&description=...
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const appid       = searchParams.get('appid');
  const name        = searchParams.get('name')        || '';
  const description = searchParams.get('description') || '';

  if (!appid || !name) {
    return NextResponse.json({ error: 'appid ve name gerekli' }, { status: 400 });
  }

  // Cache'den döndür
  if (_cache.has(appid)) return NextResponse.json(_cache.get(appid));

  // API anahtarı yoksa veya placeholder ise doğrudan fallback çalıştır
  if (!isValidApiKey(GROQ_KEY)) {
    const fallbackData = await getFallbackAiData(name, description);
    _cache.set(appid, fallbackData);
    return NextResponse.json(fallbackData);
  }

  try {
    // ── Steam yorumlarını al (opsiyonel) ────────────────────────────────────
    let reviewText = '';
    try {
      // Sadece sayısal appid için Steam reviews çek
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

    const userPrompt = `
Oyun: ${name}
Açıklama (İngilizce): ${cleanDesc}
${reviewText ? `\nOyuncu Yorumları: ${reviewText}` : ''}

Aşağıdaki JSON formatında TAM Türkçe yanıt üret:
{
  "ozet": "Oyunun 2-3 cümlelik açık ve merak uyandırıcı Türkçe özeti",
  "aciklama": "Açıklama (İngilizce) bölümünü doğal, akıcı Türkçeye çevir. Birebir çeviri değil, doğal Türkçe olsun. Tüm içeriği kapsasın.",
  "duygu": "Yorumlara göre oyuncuların genel izlenimi — sevdikleri ve eleştirdikleri (1-2 cümle)",
  "etiketler": ["etiket1","etiket2","etiket3","etiket4","etiket5"]
}

Etiketler için şu listeden uygun olanları seç (5-8 adet, küçük harfli, Türkçe):
• Tür: aksiyon, macera, rpg, strateji, simülasyon, bulmaca, korku, spor, yarış, platform, dövüş
• Tema: uzay, deniz, savaş, tarih, fantezi, bilim-kurgu, zombi, vahşi-doğa, şehir, suç, mitoloji
• Özellik: açık-dünya, çok-oyunculu, hikaye-odaklı, rekabetçi, co-op, sandbox, roguelike, hayatta-kalma

Sadece JSON döndür. Başka hiçbir metin ekleme.`.trim();

    const aiRes = await fetch(GROQ_URL, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       MODEL,
        max_tokens:  600,
        temperature: 0.7,
        messages: [
          { role: 'system',  content: 'Sen bir oyun eleştirmenisin. Her zaman geçerli JSON formatında, sade Türkçe yanıt ver.' },
          { role: 'user',    content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`Groq HTTP ${aiRes.status}: ${errText.slice(0, 200)}`);
    }

    const aiData  = await aiRes.json();
    const rawText = aiData?.choices?.[0]?.message?.content || '';

    // JSON'u raw içinden çıkar
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON bulunamadı: ' + rawText.slice(0, 100));

    const parsed = JSON.parse(jsonMatch[0]);

    const result = {
      ozet:      parsed.ozet      || null,
      aciklama:  parsed.aciklama  || null,
      duygu:     parsed.duygu     || null,
      etiketler: Array.isArray(parsed.etiketler) ? parsed.etiketler.slice(0, 10) : [],
    };

    if (!result.ozet || !result.aciklama) {
      throw new Error('Dönen AI verisi geçersiz veya eksik.');
    }

    _cache.set(appid, result);
    return NextResponse.json(result);

  } catch (err) {
    console.error('AI-game hatası, yerel fallback çalıştırılıyor:', err.message);
    const fallbackData = await getFallbackAiData(name, description);
    _cache.set(appid, fallbackData);
    return NextResponse.json(fallbackData);
  }
}
