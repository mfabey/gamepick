import { NextResponse } from 'next/server';
import { getUsdToTry, amountToTRY } from '../../lib/exchange';

const ITAD_KEY = process.env.ITAD_API_KEY;
const ITAD     = 'https://api.isthereanydeal.com';

// Yalnızca resmî ve güvenilir ana platformlar (Key reseller / 3. parti satıcılar dahil edilmez)
const ITAD_STORE_MAP = {
  '16':  { name: 'Epic Games',    icon: '⚡' },
  '61':  { name: 'Steam',         icon: '💻' },
  '35':  { name: 'GOG',           icon: '🌌' },
  '37':  { name: 'Humble Bundle', icon: '🙏' },
  '11':  { name: 'Xbox',          icon: '🎮' },
  '74':  { name: 'Xbox',          icon: '🎮' },
};

function storeInfo(id, rawName) {
  const sid = String(id || '');
  if (ITAD_STORE_MAP[sid]) return ITAD_STORE_MAP[sid];
  const n = (rawName || '').toLowerCase();
  if (n.includes('epic'))                           return { name: 'Epic Games',     icon: '⚡' };
  if (n.includes('steam'))                          return { name: 'Steam',          icon: '💻' };
  if (n.includes('gog'))                            return { name: 'GOG',            icon: '🌌' };
  if (n.includes('humble'))                         return { name: 'Humble Bundle',  icon: '🙏' };
  if (n.includes('xbox') || n.includes('microsoft')) return { name: 'Xbox',           icon: '🎮' };
  if (n.includes('playstation') || n.includes('psn')) return { name: 'PlayStation',   icon: '🎮' };
  if (n.includes('nintendo'))                       return { name: 'Nintendo eShop', icon: '🔴' };
  return null;
}

// Karşılaştırma için başlığı normalize et
function normalizeTitle(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[:\-–]/g, ' ')
    .replace(/\b(game of the year|goty|definitive|complete|gold|platinum|deluxe|premium|standard|edition|bundle|pack|collection)\b/gi, '')
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

// Doğrudan Steam API'sinden canlı ve doğru Steam fiyatını çek
async function fetchDirectSteamPrice(appid, title) {
  try {
    let gameData = null;
    let effectiveAppId = appid;

    if (appid) {
      const res = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=tr&filters=basic,price_overview`,
        { next: { revalidate: 1800 } }
      );
      if (res.ok) {
        const data = await res.json();
        const entry = data?.[appid] || (data && typeof data === 'object' ? Object.values(data)[0] : null);
        if (entry?.success && entry.data) {
          gameData = entry.data;
        }
      }
    }

    if (gameData?.is_free === true) {
      return {
        storeId:  '61',
        name:     'Steam',
        icon:     '💻',
        price:    0,
        original: 0,
        discount: 0,
        url:      `https://store.steampowered.com/app/${appid || ''}`,
        isFree:   true,
      };
    }

    if (gameData?.price_overview) {
      const info = gameData.price_overview;
      const currency = info.currency || 'TRY';
      const usdTryRate = currency !== 'TRY' ? await getUsdToTry() : 1;
      return {
        storeId:  '61',
        name:     'Steam',
        icon:     '💻',
        price:    amountToTRY(info.final, currency, usdTryRate),
        original: amountToTRY(info.initial, currency, usdTryRate),
        discount: info.discount_percent ?? 0,
        url:      `https://store.steampowered.com/app/${appid || ''}`,
        isFree:   info.final === 0,
      };
    }

    const searchTerm = title || gameData?.name;
    if (searchTerm) {
      const sRes = await fetch(
        `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(searchTerm)}&cc=tr&l=turkish`,
        { next: { revalidate: 1800 } }
      );
      if (sRes.ok) {
        const sData = await sRes.json();
        const items = sData?.items || [];
        const match = (appid ? items.find(i => String(i.id) === String(appid)) : null)
                   || items.find(i => i.name?.toLowerCase().trim() === searchTerm.toLowerCase().trim())
                   || items[0];

        if (match?.price) {
          effectiveAppId = match.id || appid;
          const currency = match.price.currency || 'USD';
          const usdTryRate = currency !== 'TRY' ? await getUsdToTry() : 1;
          return {
            storeId:  '61',
            name:     'Steam',
            icon:     '💻',
            price:    amountToTRY(match.price.final, currency, usdTryRate),
            original: amountToTRY(match.price.initial, currency, usdTryRate),
            discount: match.price.discount_percent || (match.price.initial > match.price.final ? Math.round((1 - match.price.final / match.price.initial) * 100) : 0),
            url:      `https://store.steampowered.com/app/${effectiveAppId || ''}`,
            isFree:   match.price.final === 0,
          };
        }
      }
    }
  } catch {}
  return null;
}

// GET /api/prices?appid=271590&title=GTA+V
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const appid = searchParams.get('appid');   // Steam App ID
  const title = searchParams.get('title');   // İsim

  if (!appid && !title) return NextResponse.json({ stores: [] });

  try {
    const gameIds = [];

    // ── 1. Steam AppID → ITAD lookup GET (kesin eşleşme) ──
    if (ITAD_KEY && appid) {
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
    if (ITAD_KEY && searchTitle) {
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
            if (gt === nt) {
              gameIds.push(g.id);
            }
          }
          // Fallback: Eşleşme çıkmadıysa, aranılan terimi içeren ilk oyunu veya listedeki ilk ana oyunu ekle
          if (gameIds.length === 0 && (searchData || []).length > 0) {
            const fallback = searchData.find(g => g.type === 'game' && normalizeTitle(g.title).includes(nt))
                          || searchData.find(g => g.type === 'game');
            if (fallback) {
              gameIds.push(fallback.id);
            }
          }
        }
      } catch { /* arama başarısız */ }
    }

    const uniqueIds = Array.from(new Set(gameIds));
    
    // ITAD teklifleri ile doğrudan Steam fiyatını paralel al
    const [deals, directSteam] = await Promise.all([
      uniqueIds.length > 0 ? fetchDeals(uniqueIds) : Promise.resolve([]),
      fetchDirectSteamPrice(appid, title),
    ]);

    const storeList = dealsToStores(deals);

    // Steam fiyatı varsa, storeList içindeki Steam'i doğrudan Steam API'den gelen kesin fiyatla güncelle / ekle
    if (directSteam) {
      const idx = storeList.findIndex(s => s.name === 'Steam' || s.storeId === '61');
      if (idx >= 0) {
        storeList[idx] = directSteam;
      } else {
        storeList.unshift(directSteam);
      }
    }

    return NextResponse.json({ stores: storeList });

  } catch (err) {
    console.error('Prices API hatası:', err.message);
    return NextResponse.json({ stores: [] });
  }
}
