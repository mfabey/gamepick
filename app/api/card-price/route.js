import { NextResponse } from 'next/server';

const ITAD_KEY = process.env.ITAD_API_KEY;
const ITAD     = 'https://api.isthereanydeal.com';

// ITAD ile TRY fiyatı çek — Steam dahil tüm mağazalar country=TR ile TRY döner
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') || '';

  if (!name || !ITAD_KEY) return NextResponse.json({ price: null });

  try {
    // 1. ITAD'da oyunu ara
    const searchRes = await fetch(
      `${ITAD}/games/search/v1?key=${ITAD_KEY}&title=${encodeURIComponent(name)}&limit=3`,
      { next: { revalidate: 3600 } }
    );
    if (!searchRes.ok) return NextResponse.json({ price: null });
    const searchData = await searchRes.json();
    const gameId     = searchData?.[0]?.id;
    if (!gameId) return NextResponse.json({ price: null });

    // 2. Fiyatları TRY olarak al
    const priceRes = await fetch(
      `${ITAD}/games/prices/v3?key=${ITAD_KEY}&country=TR`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify([gameId]),
        next:    { revalidate: 1800 },
      }
    );
    if (!priceRes.ok) return NextResponse.json({ price: null });
    const priceData = await priceRes.json();
    const deals     = priceData?.[0]?.deals || [];

    // Steam fiyatını bul
    const steamDeal = deals.find(d => String(d.shop?.id || '').toLowerCase() === 'steam');
    if (!steamDeal) return NextResponse.json({ price: null });

    const amt = steamDeal.price?.amount ?? 0;
    return NextResponse.json({
      price:    Math.round(amt),
      original: Math.round(steamDeal.regular?.amount ?? amt),
      discount: steamDeal.cut || 0,
      isFree:   amt === 0,
    });
  } catch (err) {
    return NextResponse.json({ price: null });
  }
}
