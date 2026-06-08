import { NextResponse } from 'next/server';

const ITAD_KEY = process.env.ITAD_API_KEY;
const ITAD     = 'https://api.isthereanydeal.com';

// ITAD sadece Epic ve Xbox için — Steam fiyatı Steam'in kendi API'sinden gelir
const ALLOWED_STORES = new Set(['epic', 'epicgames', 'xboxgames', 'microsoft', 'xbox']);

const STORE_INFO = {
  epic:      { name: 'Epic Games', icon: '⚡' },
  epicgames: { name: 'Epic Games', icon: '⚡' },
  xboxgames: { name: 'Xbox',       icon: '🎮' },
  microsoft: { name: 'Xbox',       icon: '🎮' },
  xbox:      { name: 'Xbox',       icon: '🎮' },
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');
  if (!title) return NextResponse.json({ error: 'title gerekli' }, { status: 400 });
  if (!ITAD_KEY) return NextResponse.json({ stores: [] });

  try {
    const searchRes = await fetch(
      `${ITAD}/games/search/v1?key=${ITAD_KEY}&title=${encodeURIComponent(title)}&limit=3`,
      { next: { revalidate: 3600 } }
    );
    if (!searchRes.ok) throw new Error(`ITAD search ${searchRes.status}`);
    const searchData = await searchRes.json();
    const gameId     = searchData?.[0]?.id;
    if (!gameId) return NextResponse.json({ stores: [] });

    const priceRes = await fetch(
      `${ITAD}/games/prices/v3?key=${ITAD_KEY}&country=TR`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify([gameId]),
        next:    { revalidate: 1800 },
      }
    );
    if (!priceRes.ok) throw new Error(`ITAD prices ${priceRes.status}`);
    const priceData = await priceRes.json();
    const deals     = priceData?.[0]?.deals || [];

    const storeMap = {};
    for (const deal of deals) {
      const sid  = String(deal.shop?.id || '').toLowerCase();
      if (!ALLOWED_STORES.has(sid)) continue;
      const info = STORE_INFO[sid] || { name: deal.shop?.name || sid, icon: '🛒' };
      const amt  = deal.price?.amount ?? 0;
      const cur  = storeMap[sid];
      if (!cur || amt < cur.price) {
        storeMap[sid] = {
          storeId:  sid,
          name:     info.name,
          icon:     info.icon,
          price:    Math.round(amt),
          original: Math.round(deal.regular?.amount ?? amt),
          discount: deal.cut || 0,
          url:      deal.url,
          isFree:   amt === 0,
        };
      }
    }

    return NextResponse.json({ stores: Object.values(storeMap) });
  } catch (err) {
    console.error('ITAD hatasi:', err.message);
    return NextResponse.json({ stores: [] });
  }
}
