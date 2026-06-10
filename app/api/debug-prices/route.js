import { NextResponse } from 'next/server';

const ITAD_KEY = process.env.ITAD_API_KEY;
const ITAD     = 'https://api.isthereanydeal.com';

// GET /api/debug-prices?title=Grand+Theft+Auto+V
// ITAD'ın ham verisini döndürür — store ID'lerini görmek için
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'Grand Theft Auto V';

  if (!ITAD_KEY) return NextResponse.json({ error: 'ITAD_API_KEY eksik' });

  try {
    const searchRes = await fetch(
      `${ITAD}/games/search/v1?key=${ITAD_KEY}&title=${encodeURIComponent(title)}&limit=3`,
    );
    const searchData = await searchRes.json();
    const gameId     = searchData?.[0]?.id;
    if (!gameId) return NextResponse.json({ error: 'Oyun bulunamadı', searchData });

    const priceRes = await fetch(
      `${ITAD}/games/prices/v3?key=${ITAD_KEY}&country=TR`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify([gameId]),
      }
    );
    const priceData = await priceRes.json();

    // Tüm deal shop ID'lerini listele
    const deals = priceData?.[0]?.deals || [];
    const shopIds = [...new Set(deals.map(d => d.shop?.id))];

    return NextResponse.json({
      game:   searchData[0],
      shopIds,                          // ITAD'ın kullandığı ID'ler
      deals:  deals.slice(0, 15),       // İlk 15 deal
      total:  deals.length,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message });
  }
}
