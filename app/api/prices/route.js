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
// "Batman: Arkham City" ↔ "Batman Arkham City Game of the Year Edition"
function normalizeTitle(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[:\-–]/g, ' ')
    .replace(/\b(game of the year|goty|definitive|complete|gold|platinum|deluxe|premium|standard|remastered|remake|anniversary|edition|bundle|pack|collection|director.s cut)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ITAD'dan fiyatları çek (gameId ile)
async function fetchDeals(gameId) {
  const priceRes = await fetch(
    `${ITAD}/games/prices/v3?key=${ITAD_KEY}&country=TR`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify([gameId]),
      next:    { revalidate: 1800 },
    }
  );
  if (!priceRes.ok) return [];
  const priceData = await priceRes.json();
  return priceData?.[0]?.deals || [];
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

// GET /api/prices?appid=271590   ← steamAppId ile kesin eşleşme (tercihli)
// GET /api/prices?title=GTA+V    ← isim araması fallback
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const appid = searchParams.get('appid');   // Steam App ID — kesin eşleşme
  const title = searchParams.get('title');   // İsim — fallback

  if (!ITAD_KEY) return NextResponse.json({ stores: [] });
  if (!appid && !title) return NextResponse.json({ stores: [] });

  try {
    let gameId = null;

    // ── Yöntem 1: Steam AppID → ITAD lookup (kesin, isim problemi yok) ──
    if (appid) {
      const lookupRes = await fetch(
        `${ITAD}/games/lookup/v1?key=${ITAD_KEY}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify([{ source: 'steam', id: String(appid) }]),
          next:    { revalidate: 86400 },
        }
      );
      if (lookupRes.ok) {
        const lookupData = await lookupRes.json();
        // Yanıt: { "steam:271590": { game: { id: "..." }, matched: true } }
        const entry = Object.values(lookupData || {})[0];
        if (entry?.matched) gameId = entry.game?.id;
      }
    }

    // ── Yöntem 2: Başlık araması (appid yoksa veya lookup başarısızsa) ──
    if (!gameId && title) {
      const searchRes = await fetch(
        `${ITAD}/games/search/v1?key=${ITAD_KEY}&title=${encodeURIComponent(title)}&limit=5`,
        { next: { revalidate: 3600 } }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const nt = normalizeTitle(title);

        // En iyi başlık eşleşmesini bul (normalize edilmiş)
        const best = searchData.find(g => normalizeTitle(g.title) === nt)
                  || searchData.find(g => normalizeTitle(g.title).startsWith(nt))
                  || searchData.find(g => nt.startsWith(normalizeTitle(g.title)))
                  || searchData[0];

        gameId = best?.id || null;
      }
    }

    if (!gameId) return NextResponse.json({ stores: [] });

    const deals  = await fetchDeals(gameId);
    const stores = dealsToStores(deals);
    return NextResponse.json({ stores });

  } catch (err) {
    console.error('ITAD hatası:', err.message);
    return NextResponse.json({ stores: [] });
  }
}
