import { NextResponse } from 'next/server';

const ITAD_KEY = process.env.ITAD_API_KEY;
const ITAD     = 'https://api.isthereanydeal.com';

// ITAD store ID → görüntü bilgisi
const STORE_INFO = {
  steam:        { name: 'Steam',      color: '#1b2838', icon: '💻' },
  epic:         { name: 'Epic Games', color: '#313131', icon: '⚡' },
  xboxgames:    { name: 'Xbox',       color: '#107c10', icon: '🎯' },
  microsoft:    { name: 'Xbox',       color: '#107c10', icon: '🎯' },
  xbox:         { name: 'Xbox',       color: '#107c10', icon: '🎯' },
  gog:          { name: 'GOG',        color: '#7a2ada', icon: '🌙' },
  humble:       { name: 'Humble',     color: '#cc2929', icon: '❤️' },
  gmg:          { name: 'GreenMan',   color: '#1f7a1f', icon: '🟢' },
  wingamestore: { name: 'WinGame',    color: '#e65c00', icon: '🏪' },
};

// GET /api/prices?title=OYUN_ADI
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');

  if (!title) return NextResponse.json({ error: 'title gerekli' }, { status: 400 });

  const psUrl = `https://store.playstation.com/tr-tr/search/${encodeURIComponent(title)}`;

  if (!ITAD_KEY) {
    return NextResponse.json({ stores: [], psUrl, noKey: true });
  }

  try {
    // 1. ITAD'da oyunu ara
    const searchRes = await fetch(
      `${ITAD}/games/search/v1?key=${ITAD_KEY}&title=${encodeURIComponent(title)}&limit=3`,
      { next: { revalidate: 3600 } }
    );
    if (!searchRes.ok) throw new Error(`ITAD search HTTP ${searchRes.status}`);
    const searchData = await searchRes.json();
    const gameId = searchData?.[0]?.id;

    if (!gameId) {
      return NextResponse.json({ stores: [], psUrl, notFound: true });
    }

    // 2. Fiyatları al (Türkiye — TL)
    const priceRes = await fetch(
      `${ITAD}/games/prices/v3?key=${ITAD_KEY}&country=TR`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([gameId]),
        next: { revalidate: 1800 },
      }
    );
    if (!priceRes.ok) throw new Error(`ITAD prices HTTP ${priceRes.status}`);
    const priceData = await priceRes.json();
    const deals = priceData?.[0]?.deals || [];

    // Mağaza başına en ucuz fiyatı al
    const storeMap = {};
    for (const deal of deals) {
      const sid  = deal.shop?.id;
      if (!sid) continue;
      const info = STORE_INFO[sid] || { name: deal.shop?.name || sid, color: '#555', icon: '🛒' };
      const amt  = deal.price?.amount ?? 0;
      const cur  = storeMap[sid];
      if (!cur || amt < cur.price) {
        storeMap[sid] = {
          storeId:  sid,
          name:     info.name,
          color:    info.color,
          icon:     info.icon,
          price:    Math.round(amt),
          original: Math.round(deal.regular?.amount ?? amt),
          discount: deal.cut || 0,
          url:      deal.url,
          isFree:   amt === 0,
        };
      }
    }

    const stores = Object.values(storeMap);
    return NextResponse.json({ stores, psUrl, gameId });

  } catch (err) {
    console.error('ITAD hatası:', err.message);
    return NextResponse.json({ stores: [], psUrl, error: err.message });
  }
}
