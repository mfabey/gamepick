import { NextResponse } from 'next/server';
import { getUsdToTry, amountToTRY } from '../../lib/exchange';

const RAWG_KEY  = process.env.RAWG_API_KEY;
const RAWG_BASE = 'https://api.rawg.io/api';

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

// RAWG slug → Steam appid
async function getSteamAppIdBySlug(slug) {
  try {
    const res = await fetch(
      `${RAWG_BASE}/games/${slug}/stores?key=${RAWG_KEY}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data       = await res.json();
    const steamStore = (data.results || []).find(s => s.store_id === 1);
    const url        = steamStore?.url || '';
    return url.match(/store\.steampowered\.com\/app\/(\d+)/)?.[1] || null;
  } catch { return null; }
}

// Steam appid → TRY fiyat
async function fetchPriceByAppId(appid) {
  const res = await fetch(
    `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=tr&filters=price_overview`,
    { next: { revalidate: 1800 } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.[appid]?.success) return null;
  if (!data[appid].data?.price_overview) return { price: 0, isFree: true };

  const info     = data[appid].data.price_overview;
  const currency = info.currency || 'TRY';
  const rate     = currency !== 'TRY' ? await getUsdToTry() : 1;
  return {
    price:    amountToTRY(info.final,   currency, rate),
    original: amountToTRY(info.initial, currency, rate),
    discount: info.discount_percent ?? 0,
    isFree:   info.final === 0,
    appid,
  };
}

// İsim tabanlı arama fallback
async function fetchPriceByName(name) {
  const sRes = await fetch(
    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(name)}&cc=tr&l=tr&category1=998`,
    { next: { revalidate: 3600 } }
  );
  if (!sRes.ok) return null;
  const sData  = await sRes.json();
  const items  = sData?.items || [];
  const target = name.toLowerCase().trim();

  const match = items.find(i => i.name?.toLowerCase().trim() === target)
             || items.find(i => i.name?.toLowerCase().trim().startsWith(target))
             || items.find(i => target.startsWith(i.name?.toLowerCase().trim() || 'XXXXX'));

  if (!match?.id) return null;
  return fetchPriceByAppId(match.id);
}

// ITAD'dan en ucuz fiyatı çek (edisyonları birleştirerek)
async function fetchLowestPriceFromITAD(appid, title) {
  if (!ITAD_KEY) return null;
  try {
    const gameIds = [];

    // 1. AppID ile Lookup
    if (appid) {
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
    }

    // 2. Title Search ile diğer sürümleri de listeye ekle (Complete, GOTY vb. için)
    const searchTitle = title || '';
    if (searchTitle) {
      const searchRes = await fetch(
        `${ITAD}/games/search/v1?key=${ITAD_KEY}&title=${encodeURIComponent(searchTitle)}&limit=10`,
        { next: { revalidate: 3600 } }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const nt = searchTitle.toLowerCase()
          .replace(/[:\-–]/g, ' ')
          .replace(/\b(game of the year|goty|definitive|complete|gold|platinum|deluxe|premium|standard|remastered|remake|anniversary|edition|bundle|pack|collection|director.s cut)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();

        for (const g of searchData) {
          if (g.type === 'dlc') continue; // DLC'leri kesinlikle geç
          const gt = (g.title || '').toLowerCase()
            .replace(/[:\-–]/g, ' ')
            .replace(/\b(game of the year|goty|definitive|complete|gold|platinum|deluxe|premium|standard|remastered|remake|anniversary|edition|bundle|pack|collection|director.s cut)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
          if (gt === nt || gt.startsWith(nt) || nt.startsWith(gt)) {
            gameIds.push(g.id);
          }
        }
      }
    }

    const uniqueIds = Array.from(new Set(gameIds));
    if (uniqueIds.length === 0) return null;

    // 3. Fiyat tekliflerini çek
    const priceRes = await fetch(
      `${ITAD}/games/prices/v3?key=${ITAD_KEY}&country=TR`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(uniqueIds),
        next:    { revalidate: 1800 },
      }
    );
    if (!priceRes.ok) return null;
    const priceData = await priceRes.json();

    // 4. Tüm edisyonların tekliflerini birleştirip en ucuzunu seç
    let bestDeal = null;
    for (const item of priceData || []) {
      const deals = item.deals || [];
      for (const deal of deals) {
        const info = storeInfo(deal.shop?.id, deal.shop?.name);
        if (!info) continue;

        const amt = deal.price?.amount ?? 0;
        const currency = deal.price?.currency || 'TRY';
        
        let convertedAmt = amt;
        let convertedReg = deal.regular?.amount ?? amt;

        if (currency !== 'TRY') {
          const rate = await getUsdToTry();
          if (currency === 'USD') {
            convertedAmt = amt * rate;
            convertedReg = (deal.regular?.amount ?? amt) * rate;
          } else if (currency === 'EUR') {
            convertedAmt = amt * rate * 0.93;
            convertedReg = (deal.regular?.amount ?? amt) * rate * 0.93;
          }
        }

        const roundedAmt = Math.round(convertedAmt);
        const roundedReg = Math.round(convertedReg);

        if (!bestDeal || roundedAmt < bestDeal.price) {
          bestDeal = {
            price:     roundedAmt,
            original:  roundedReg,
            discount:  deal.cut || 0,
            isFree:    roundedAmt === 0,
            storeName: info.name,
            storeIcon: info.icon,
            appid,
          };
        }
      }
    }

    return bestDeal;
  } catch (err) {
    console.error("ITAD card price lookup error:", err.message);
    return null;
  }
}

// GET /api/card-price?slug=tomb-raider&name=Tomb%20Raider&hasSteam=true
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug     = searchParams.get('slug');
  const name     = searchParams.get('name')     || '';
  const hasSteam = searchParams.get('hasSteam') === 'true';

  if (!hasSteam && !slug) return NextResponse.json({ price: null });

  try {
    let appid = null;

    if (slug) {
      appid = await getSteamAppIdBySlug(slug);
    }

    const itadPrice = await fetchLowestPriceFromITAD(appid, name || slug);
    if (itadPrice) {
      return NextResponse.json(itadPrice);
    }

    if (appid) {
      const price = await fetchPriceByAppId(appid);
      if (price) return NextResponse.json(price);
    }

    if (name && hasSteam) {
      const price = await fetchPriceByName(name);
      if (price) return NextResponse.json(price);
    }

    return NextResponse.json({ price: null });
  } catch {
    return NextResponse.json({ price: null });
  }
}
