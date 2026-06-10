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

// RAWG slug → Steam appid (RAWG /stores endpoint'i store URL'lerini verir)
async function getSteamAppIdBySlug(slug) {
  try {
    const res = await fetch(
      `${RAWG_BASE}/games/${slug}/stores?key=${RAWG_KEY}`,
      { next: { revalidate: 86400 } }   // 24 saat cache — store URL'leri nadiren değişir
    );
    if (!res.ok) return null;
    const data       = await res.json();
    const steamStore = (data.results || []).find(s => s.store_id === 1); // 1 = Steam
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

// İsim tabanlı arama — slug ile tam eşleşme bulunamazsa fallback
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

// ITAD'dan en ucuz fiyatı (indirimli olanı) çek
async function fetchLowestPriceFromITAD(appid, title) {
  if (!ITAD_KEY) return null;
  try {
    let gameId = null;

    // 1. Steam AppID ile ITAD lookup (en güvenilir yöntem)
    if (appid) {
      const lookupRes = await fetch(
        `${ITAD}/games/lookup/v1?key=${ITAD_KEY}&appid=${encodeURIComponent(appid)}`,
        { next: { revalidate: 86400 } }
      );
      if (lookupRes.ok) {
        const lookupData = await lookupRes.json();
        if (lookupData?.found && lookupData.game?.id) {
          gameId = lookupData.game.id;
        }
      }
    }

    // 2. Fallback: İsim ile arama
    if (!gameId && title) {
      const searchRes = await fetch(
        `${ITAD}/games/search/v1?key=${ITAD_KEY}&title=${encodeURIComponent(title)}&limit=5`,
        { next: { revalidate: 3600 } }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const nt = (title || '').toLowerCase()
          .replace(/[:\-–]/g, ' ')
          .replace(/\b(game of the year|goty|definitive|complete|gold|platinum|deluxe|premium|standard|remastered|remake|anniversary|edition|bundle|pack|collection|director.s cut)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();

        const best = searchData.find(g => {
          const gt = (g.title || '').toLowerCase()
            .replace(/[:\-–]/g, ' ')
            .replace(/\b(game of the year|goty|definitive|complete|gold|platinum|deluxe|premium|standard|remastered|remake|anniversary|edition|bundle|pack|collection|director.s cut)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
          return gt === nt || gt.startsWith(nt) || nt.startsWith(gt);
        }) || searchData[0];

        gameId = best?.id || null;
      }
    }

    if (!gameId) return null;

    // 3. Fiyat tekliflerini çek
    const priceRes = await fetch(
      `${ITAD}/games/prices/v3?key=${ITAD_KEY}&country=TR`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify([gameId]),
        next:    { revalidate: 1800 },
      }
    );
    if (!priceRes.ok) return null;
    const priceData = await priceRes.json();
    const deals = priceData?.[0]?.deals || [];

    // 4. En düşük fiyatı veren takip ettiğimiz mağazayı bul
    let bestDeal = null;
    for (const deal of deals) {
      const info = storeInfo(deal.shop?.id, deal.shop?.name);
      if (!info) continue; // Takip etmediğimiz mağazaları ele

      const amt = deal.price?.amount ?? 0;
      const currency = deal.price?.currency || 'TRY';
      
      // Kur çevrim güvenlik kontrolü
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

    // 1. Slug varsa AppID bul
    if (slug) {
      appid = await getSteamAppIdBySlug(slug);
    }

    // 2. Birincil yöntem: ITAD üzerinden takip edilen mağazalar arasında en ucuz fiyatı ara
    const itadPrice = await fetchLowestPriceFromITAD(appid, name || slug);
    if (itadPrice) {
      return NextResponse.json(itadPrice);
    }

    // 3. Fallback 1: AppID varsa doğrudan Steam API'den çek
    if (appid) {
      const price = await fetchPriceByAppId(appid);
      if (price) return NextResponse.json(price);
    }

    // 4. Fallback 2: İsim araması ile doğrudan Steam'den çek
    if (name && hasSteam) {
      const price = await fetchPriceByName(name);
      if (price) return NextResponse.json(price);
    }

    return NextResponse.json({ price: null });
  } catch {
    return NextResponse.json({ price: null });
  }
}
