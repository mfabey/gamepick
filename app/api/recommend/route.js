import { NextResponse } from 'next/server';

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function groq(messages, maxTokens = 300) {
  const res = await fetch(GROQ_URL, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:       'llama-3.1-8b-instant',
      max_tokens:  maxTokens,
      temperature: 0.7,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

// POST /api/recommend
// Body: { moods, budget }                                  → ruh hali bazlı arama önerisi
// Body: { mode:'summary', gameTitle, genres, description } → oyun özeti + gizli etiketler
export async function POST(request) {
  const body = await request.json();

  if (!GROQ_KEY) {
    return NextResponse.json({
      message:     'AI önerileri için GROQ_API_KEY gerekli.',
      searchQuery: body.moods || 'popular',
    });
  }

  try {
    // ── Mod 1: Oyun özeti ve gizli etiket üretimi ──────────────────────────
    if (body.mode === 'summary') {
      const prompt = `Sen bir oyun eleştirmenisin. Aşağıdaki oyun hakkında Türkçe 2-3 cümlelik özlü bir özet yaz.
Ardından JSON formatında yanıt ver.

Oyun: ${body.gameTitle}
Türler: ${body.genres}
Açıklama: ${body.description}

Yanıtı YALNIZCA şu JSON formatında ver (başka hiçbir şey ekleme):
{
  "summary": "Türkçe 2-3 cümle özet. Oyunun hissettirdiği şeylere odaklan.",
  "tags": ["etiket1", "etiket2", "etiket3", "etiket4"]
}

tags örnekleri: "Sakin tempo", "Yüksek adrenalin", "Solo deneyim", "Açık dünya", "Bağımlılık yapıcı", "Kısa seanslar", "Zorlayıcı ama adil", "Film kalitesi", "Klostrofobik", "Sonsuz içerik"`;

      const text = await groq([
        { role: 'system', content: 'Her zaman geçerli JSON döndür.' },
        { role: 'user',   content: prompt },
      ], 300);

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return NextResponse.json(jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: text, tags: [] });
      } catch {
        return NextResponse.json({ summary: text, tags: [] });
      }
    }

    // ── Mod 2: Ruh hali bazlı arama sorgusu üretimi ────────────────────────
    const prompt = `Bir oyun platformu asistanısın. Kullanıcının ruh haline ve bütçesine göre en uygun oyun türünü belirle.

Ruh hali: ${body.moods}
Bütçe: ${body.budget} TL

YALNIZCA şu JSON formatında yanıtla:
{
  "message": "Türkçe 1 cümlelik kısa öneri mesajı (kullanıcıya hitap et)",
  "searchQuery": "english search terms for RAWG API (max 3 words)"
}`;

    const text = await groq([
      { role: 'system', content: 'Her zaman geçerli JSON döndür.' },
      { role: 'user',   content: prompt },
    ], 150);

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return NextResponse.json(jsonMatch ? JSON.parse(jsonMatch[0]) : {
        message:     'Ruh haline göre oyunlar seçildi.',
        searchQuery: body.moods || 'popular',
      });
    } catch {
      return NextResponse.json({
        message:     'Ruh haline göre oyunlar seçildi.',
        searchQuery: body.moods || 'popular',
      });
    }

  } catch (err) {
    console.error('Groq API hatası:', err.message);
    return NextResponse.json({
      message:     'AI şu an meşgul. Popüler oyunlar listeleniyor.',
      searchQuery: 'popular games',
    });
  }
}
