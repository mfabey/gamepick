import { NextResponse } from 'next/server';

const ITAD_KEY = process.env.ITAD_API_KEY;
const ITAD     = 'https://api.isthereanydeal.com';

// ITAD sayısal store ID eşleştirmesi (ITAD v3 API'deki gerçek ID'ler)
// Kaynak: ITAD prices API'sinden görülen değerler
const ITAD_STORE_MAP = {
  '16':  { name: 'Epic Games', icon: '⚡' },
  '61':  { name: 'Steam',      icon: '💻' },
  '35':  { name: 'GOG',        icon: '🌌' },
  '37':  { name: 'Humble Bundle', icon: '🙏' },
  '11':  { name: 'Xbox',       icon: '🎮' },  // Microsoft Store olabilir
  '74':  { name: 'Xbox',       icon: '🎮' },  // Xbox Game Pass
};

// Store adına göre fallback eşleştirme
function storeInfo(id, rawName) {
  const sid = String(id);
  if (ITAD_STORE_MAP[sid]) return ITAD_STORE_MAP[sid];

  // Sayısal ID eşleşmezse isimle dene
  const n = (rawName || '').toLowerCase();
  if (n.includes('epic'))      return { name: 'Epic Games',    icon: '⚡' };
  if (n.includes('xbox'))      return { name: 'Xbox',          icon: '🎮' };
  if (n.includes('microsoft')) return { name: 'Xbox',          icon: '🎮' };
  if (n.includes('steam'))     return { name: 'Steam',         icon: '💻' };
  if (n.includes('gog'))       return { name: 'GOG',           icon: '🌌' };
  if (n.includes('humble'))    return { name: 'Humble Bundle', icon: '🙏' };
  return null;
}

// GET /api/prices?title=Cyberpunk+2077
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');
  if (!title)    return NextResponse.json({ error: 'title gerekli' }, { status: 400 });
  if (!ITAD_KEY) return NextResponse.json({ stores: [] });

  try {
    // 1. Oyunu bul
    const searchRes = await fetch(
      `${ITAD}/games/search/v1?key=${ITAD_KEY}&title=${encodeURIComponent(title)}&limit=3`,
      { next: { revalidate: 3600 } }
    );
    if (!searchRes.ok) throw new Error(`ITAD search ${searchRes.status}`);
    const searchData = await searchRes.json();
    const gameId     = searchData?.[0]?.id;
    if (!gameId) return NextResponse.json({ stores: [] });

    // 2. Türkiye fiyatlarını al (TRY)
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

    // 3. Her store için en ucuz fiyatı al — filtre YOK, isimle eşleştir
    const storeMap = {};
    for (const deal of deals) {
      const rawId   = String(deal.shop?.id || '').toLowerCase();
      const rawName = deal.shop?.name || rawId;
      const info    = storeInfo(rawId, rawName);
      if (!info) continue;                    // ilgisiz platform → atla

      const amt = deal.price?.amount ?? 0;
      const key = info.name;                  // normalize isim = anahtar
      const cur = storeMap[key];

      if (!cur || amt < cur.price) {
        storeMap[key] = {
          storeId:  rawId,
          name:     info.name,
          icon:     info.icon,
          price:    Math.round(amt),          // ITAD TR → zaten TRY
          original: Math.round(deal.regular?.amount ?? amt),
          discount: deal.cut || 0,
          url:      deal.url,
          isFree:   amt === 0,
        };
      }
    }

    return NextResponse.json({ stores: Object.values(storeMap) });
  } catch (err) {
    console.error('ITAD hatası:', err.message);
    return NextResponse.json({ stores: [] });
  }
}
