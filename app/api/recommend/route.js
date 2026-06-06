import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/recommend
// Body: { moods, budget } → ruh hali bazlı arama önerisi
// Body: { mode:'summary', gameTitle, genres, description } → oyun özeti + gizli etiketler
export async function POST(request) {
  const body = await request.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      message: 'AI önerileri için ANTHROPIC_API_KEY gerekli.',
      searchQuery: body.moods || 'popular',
    });
  }

  try {
    // Mod 1: Oyun özeti ve gizli etiket üretimi
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

tags için örnekler: "Sakin tempo", "Yüksek adrenalin", "Solo deneyim", "Açık dünya", "Bağımlılık yapıcı", "Kısa seanslar", "Zorlayıcı ama adil", "Film kalitesi", "Klostrofobik", "Sonsuz içerik"`;

      const response = await client.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages:   [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].text.trim();
      try {
        const parsed = JSON.parse(text);
        return NextResponse.json(parsed);
      } catch {
        return NextResponse.json({ summary: text, tags: [] });
      }
    }

    // Mod 2: Ruh hali bazlı arama sorgusu üretimi
    const prompt = `Bir oyun platformu asistanısın. Kullanıcının ruh haline ve bütçesine göre en uygun oyun türünü İngilizce olarak belirle.

Ruh hali: ${body.moods}
Bütçe: ₺${body.budget}

Şunu yap:
1. Türkçe 1 cümlelik kısa bir öneri mesajı yaz (kullanıcıya hitap et)
2. Bu ruh haline uygun İngilizce arama terimi belirle (RAWG API için, max 3 kelime)

YALNIZCA şu JSON formatında yanıtla:
{
  "message": "Türkçe kısa mesaj",
  "searchQuery": "english search terms"
}`;

    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages:   [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text.trim();
    try {
      const parsed = JSON.parse(text);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({
        message:     'Ruh haline göre oyunlar seçildi.',
        searchQuery: body.moods || 'popular',
      });
    }

  } catch (err) {
    console.error('Anthropic API hatası:', err);
    return NextResponse.json({
      message:     'AI şu an meşgul. Popüler oyunlar listeleniyor.',
      searchQuery: 'popular games',
    });
  }
}
