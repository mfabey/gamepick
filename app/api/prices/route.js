import { NextResponse } from 'next/server';

const ITAD_KEY = process.env.ITAD_API_KEY;
const ITAD     = 'https://api.isthereanydeal.com';

// ITAD sayısal store ID eşleştirmesi (gerçek değerler)
const ITAD_STORE_MAP = {
  '16':  { name: 'Epic Games',    icon: '⚡' },
  '61':  { name: 'Steam',         icon: '💻' },
  '35':  { name: 'GOG',           icon: '🌌' },
  '37':  { name: 'Humble Bundle', icon: '🙏' },
  '11':  { name: 'Xbox',          icon: '🎮' },
  '74':  { name: 'Xbox',          icon: '🎮' },
};

function storeInfo(id, rawName) {
  const sid = String(id);
  if (ITAD_STORE_MAP[sid]) return ITAD_STORE_MAP[sid];
  const n = (rawName || '').toLowerCase();
  if (n.includes('epic'))      return { name: 'Epic Games',    icon: '⚡' };
  if (n.includes('xbox'))      return { name: 'Xbox',          icon: '🎮' };
  if (n.includes('microsoft')) return { name: 'Xbox',          icon: '🎮' };
  if (n.includes('steam'))     return { name: 'Steam',         icon: '💻' };
  if (n.includes('gog'))       return { name: 'GOG',           icon: '🌌' };
  if (n.includes('humble'))    return { name: 'Humble Bundle', icon: '🙏' };
  return null;
}

// Karşılaştırma için başlığı normalize et
function normalizeTitle(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[:\-–]/g, ' ')
    .replace(/\b(game of the year|goty|definitive|complete|gold|platinum|deluxe|premium|standard|remastered|remake|anniversary|edition|bundle|pack|collection|director.s cut)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ITAD'dan fiyatları çek (gameIds dizisi ile)
async function fetchDeals(gameIds) {
  const priceRes = await fetch(
    `${ITAD}/games/prices/v3?key=${ITAD_KEY}&country=TR`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(gameIds),
      next:    { revalidate: 1800 },
    }
  );
  if (!priceRes.ok) return [];
  const priceData = await priceRes.json();
  const allDeals = [];
  for (const item of priceData || []) {
    if (item.deals) allDeals.push(...item.deals);
  }
  return allDeals;
}

// Deals → store map
function dealsToStores(deals) {
  const storeMap = {};
  for (const deal of deals) {
    const info = storeInfo(deal.shop?.id, deal.shop?.name);
    if (!info) continue;
    const amt = deal.price?.amount ?? 0;
    const key = info.name;
    const cur = storeMap[key];
    if (!cur || amt < cur.price) {
      storeMap[key] = {
        storeId:  String(deal.shop?.id || ''),
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
  return Object.values(storeMap);
}

// GET /api/prices?appid=271590&title=GTA+V
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const appid = searchParams.get('appid');   // Steam App ID
  const title = searchParams.get('title');   // İsim

  if (!ITAD_KEY) return NextResponse.json({ stores: [] });
  if (!appid && !title) return NextResponse.json({ stores: [] });

  try {
    const gameIds = [];

    // ── 1. Steam AppID → ITAD lookup GET (kesin eşleşme) ──
    if (appid) {
      try {
        const lookupRes = await fetch(
          `${ITAD}/games/lookup/v1?key=${ITAD_KEY}&appid=${encodeURIComponent(appid)}`,
          { next: { revalidate: 86400 } }
        );
        if (lookupRes.ok) {
          const lookupData = await lookupRes.json();
          if (lookupData?.found && lookupData.game?.id) {
            gameIds.push(lookupData.game.id);
          }
        }
      } catch { /* lookup başarısız */ }
    }

    // ── 2. İsim araması ile diğer edisyonları bul (Complete, GOTY vb.) ──
    const searchTitle = title || '';
    if (searchTitle) {
      try {
        const searchRes = await fetch(
          `${ITAD}/games/search/v1?key=${ITAD_KEY}&title=${encodeURIComponent(searchTitle)}&limit=10`,
          { next: { revalidate: 3600 } }
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const nt = normalizeTitle(searchTitle);

          for (const g of searchData || []) {
            if (g.type === 'dlc') continue; // DLC'leri filtrele
            const gt = normalizeTitle(g.title);
            if (gt === nt || gt.startsWith(nt) || nt.startsWith(gt)) {
              gameIds.push(g.id);
            }
          }
        }
      } catch { /* arama başarısız */ }
    }

    const uniqueIds = Array.from(new Set(gameIds));
    if (uniqueIds.length === 0) return NextResponse.json({ stores: [] });

    const deals  = await fetchDeals(uniqueIds);
    const stores = dealsToStores(deals);
    return NextResponse.json({ stores });

  } catch (err) {
    console.error('ITAD hatası:', err.message);
    return NextResponse.json({ stores: [] });
  }
}
