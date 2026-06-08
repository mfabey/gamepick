import { NextResponse } from 'next/server';

const ITAD_KEY = process.env.ITAD_API_KEY;
const ITAD     = 'https://api.isthereanydeal.com';

// ITAD sadece Xbox için
const ALLOWED_STORES = new Set(['xboxgames', 'microsoft', 'xbox']);

const STORE_INFO = {
  xboxgames: { name: 'Xbox', icon: '🎮' },
  microsoft: { name: 'Xbox', icon: '🎮' },
  xbox:      { name: 'Xbox', icon: '🎮' },
};

// ── Döviz kuru (USD → TRY) — bellek cache, 4 saatte bir yenile ────────────
let _rate   = 0;
let _rateAt = 0;

async function getUsdToTry() {
  const now = Date.now();
  if (_rate > 0 && now - _rateAt < 4 * 3600 * 1000) return _rate;
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=TRY', { next: { revalidate: 14400 } });
    const d = await r.json();
    _rate   = d.rates?.TRY || 38;
    _rateAt = now;
  } catch {
    if (!_rate) _rate = 38;
  }
  return _rate;
}

// ── Fiyatı TRY'ye çevir ───────────────────────────────────────────────────
function toTry(amount, currency, rate) {
  if (!amount) return 0;
  const cur = (currency || '').toUpperCase();
  if (cur === 'TRY') return Math.round(amount);
  if (cur === 'USD' || cur === '') return Math.round(amount * rate);
  // Bilinmeyen para birimi — USD gibi davran
  return Math.round(amount * rate);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');
  if (!title)    return NextResponse.json({ error: 'title gerekli' }, { status: 400 });
  if (!ITAD_KEY) return NextResponse.json({ stores: [] });

  try {
    const [, searchRes] = await Promise.all([
      getUsdToTry(),   // döviz kurunu ısıt
      fetch(
        `${ITAD}/games/search/v1?key=${ITAD_KEY}&title=${encodeURIComponent(title)}&limit=3`,
        { next: { revalidate: 3600 } }
      ),
    ]);

    const rate = await getUsdToTry();

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

      const info     = STORE_INFO[sid] || { name: deal.shop?.name || sid, icon: '🛒' };
      const currency = deal.price?.currency || '';
      const amt      = deal.price?.amount   ?? 0;
      const regAmt   = deal.regular?.amount ?? amt;

      const priceTry    = toTry(amt,    currency, rate);
      const originalTry = toTry(regAmt, currency, rate);

      const cur = storeMap[sid];
      if (!cur || priceTry < cur.price) {
        storeMap[sid] = {
          storeId:  sid,
          name:     info.name,
          icon:     info.icon,
          price:    priceTry,
          original: originalTry,
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
