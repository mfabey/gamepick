import { NextResponse } from 'next/server';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL         = 'claude-haiku-4-5-20251001';

// Bellekte basit cache (serverless warm state)
const _cache = new Map();

// GET /api/ai-game?appid=271590&name=GTA+V&description=...
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const appid       = searchParams.get('appid');
  const name        = searchParams.get('name')        || '';
  const description = searchParams.get('description') || '';

  if (!appid || !name) {
    return NextResponse.json({ error: 'appid ve name gerekli' }, { status: 400 });
  }

  if (!ANTHROPIC_KEY) {
    return NextResponse.json({
      ozet: null, duygu: null, etiketler: [],
      hata: 'ANTHROPIC_API_KEY tanımlı değil',
    });
  }

  // Cache'den döndür
  if (_cache.has(appid)) return NextResponse.json(_cache.get(appid));

  try {
    // ── Steam yorumlarını al ─────────────────────────────────────────────
    let reviewText = '';
    try {
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
    } catch { /* yorumlar opsiyonel */ }

    // ── Açıklamayı temizle ───────────────────────────────────────────────
    const cleanDesc = description
      .replace(/<[^>]+>/g, '')   // HTML etiketleri kaldır
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 600);

    // ── Groq prompt ──────────────────────────────────────────────────────
    const userPrompt = `
Oyun: ${name}
Açıklama: ${cleanDesc}
${reviewText ? `\nOyuncu Yorumları: ${reviewText}` : ''}

Aşağıdaki JSON formatında TAM Türkçe yanıt üret:
{
  "ozet": "Oyunun 2-3 cümlelik açık ve merak uyandırıcı Türkçe özeti",
  "duygu": "Yorumlara göre oyuncuların genel izlenimi — sevdikleri ve eleştirdikleri (1-2 cümle)",
  "etiketler": ["etiket1","etiket2","etiket3","etiket4","etiket5"]
}

Etiketler için şu listeden uygun olanları seç (5-8 adet, küçük harfli, Türkçe):
• Tür: aksiyon, macera, rpg, strateji, simülasyon, bulmaca, korku, spor, yarış, platform, dövüş
• Tema: uzay, deniz, savaş, tarih, fantezi, bilim-kurgu, zombi, vahşi-doğa, şehir, suç, mitoloji
• Özellik: açık-dünya, çok-oyunculu, hikaye-odaklı, rekabetçi, co-op, sandbox, roguelike, hayatta-kalma

Sadece JSON döndür. Başka hiçbir metin ekleme.`.trim();

    const aiRes = await fetch(ANTHROPIC_URL, {
      method:  'POST',
      headers: {
        'x-api-key':         ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens:  600,
        system:      'Sen bir oyun eleştirmenisin. Her zaman geçerli JSON formatında, sade Türkçe yanıt ver.',
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`Anthropic HTTP ${aiRes.status}: ${errText.slice(0, 200)}`);
    }

    const aiData  = await aiRes.json();
    const rawText = aiData?.content?.[0]?.text || '';

    // JSON'u raw içinden çıkar
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON bulunamadı: ' + rawText.slice(0, 100));

    const parsed = JSON.parse(jsonMatch[0]);

    const result = {
      ozet:      parsed.ozet      || null,
      duygu:     parsed.duygu     || null,
      etiketler: Array.isArray(parsed.etiketler) ? parsed.etiketler.slice(0, 10) : [],
    };

    _cache.set(appid, result);
    return NextResponse.json(result);

  } catch (err) {
    console.error('AI-game hatası:', err.message);
    return NextResponse.json({ ozet: null, duygu: null, etiketler: [], hata: err.message });
  }
}
