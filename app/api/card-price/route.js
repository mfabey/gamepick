import { NextResponse } from 'next/server';
import { getUsdToTry, amountToTRY } from '../../lib/exchange';

const RAWG_KEY  = process.env.RAWG_API_KEY;
const RAWG_BASE = 'https://api.rawg.io/api';

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

// GET /api/card-price?slug=tomb-raider&hasSteam=true
// slug varsa garantili doğru eşleşme (yanlış oyun sorunu olmaz)
// slug yoksa name ile fallback
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug     = searchParams.get('slug');
  const name     = searchParams.get('name')     || '';
  const hasSteam = searchParams.get('hasSteam') === 'true';

  if (!hasSteam && !slug) return NextResponse.json({ price: null });

  try {
    // ── Yöntem 1: Slug → RAWG /stores → steamAppId (garantili doğru) ──
    if (slug) {
      const appid = await getSteamAppIdBySlug(slug);
      if (appid) {
        const price = await fetchPriceByAppId(appid);
        if (price) return NextResponse.json(price);
      }
    }

    // ── Yöntem 2: İsim araması (fallback) ─────────────────────────────
    if (name && hasSteam) {
      const price = await fetchPriceByName(name);
      if (price) return NextResponse.json(price);
    }

    return NextResponse.json({ price: null });
  } catch {
    return NextResponse.json({ price: null });
  }
}
