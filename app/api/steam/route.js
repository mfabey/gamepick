import { NextResponse } from 'next/server';

const CC   = 'TR';
const LANG = 'turkish';

// ── Döviz kuru (USD → TRY) ────────────────────────────────────────────────
let _rate   = 0;
let _rateAt = 0;

async function getRate() {
  const now = Date.now();
  if (_rate > 0 && now - _rateAt < 4 * 3600 * 1000) return _rate;
  try {
    const r = await fetch(
      'https://api.frankfurter.app/latest?from=USD&to=TRY',
      { next: { revalidate: 14400 } }
    );
    const d  = await r.json();
    _rate    = d.rates?.TRY || 38;
    _rateAt  = now;
  } catch {
    if (!_rate) _rate = 38; // ilk çağrı fallback
  }
  return _rate;
}

// ── Fiyat ayrıştırıcı ─────────────────────────────────────────────────────
function parsePrice(priceObj, rate) {
  if (!priceObj) return { price: null, original: null, discount: 0, isFree: false };

  const final    = priceObj.final    ?? priceObj.final_price    ?? 0;
  const initial  = priceObj.initial  ?? priceObj.original_price ?? final;
  const discount = priceObj.discount_percent ?? 0;

  if (final === 0 && initial === 0) return { price: 0, original: 0, discount, isFree: true };

  const currency = (priceObj.currency || '').toUpperCase();
  const isUsd    = currency === 'USD' || (currency !== 'TRY' && final > 0 && final < 10000);

  if (isUsd && rate > 0) {
    return {
      price:    Math.round(final   / 100 * rate),
      original: Math.round(initial / 100 * rate),
      discount, isFree: false,
    };
  }
  return {
    price:    Math.round(final   / 100),
    original: Math.round(initial / 100),
    discount, isFree: false,
  };
}

// ── Route handler ──────────────────────────────────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q       = searchParams.get('q');
  const section = searchParams.get('section');
  const appid   = searchParams.get('appid');
  const page    = parseInt(searchParams.get('page') || '1');
  const num     = parseInt(searchParams.get('num')  || '24');

  try {
    const rate = await getRate();

    // ── Tek oyun detayı ──────────────────────────────────────────────────
    if (appid) {
      const res = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=${CC}&l=${LANG}`,
        { cache: 'no-store' }           // cache sorunlarını engelle
      );
      if (!res.ok) throw new Error(`Steam appdetails HTTP ${res.status}`);

      const raw = await res.json();

      // Steam bazen string, bazen int key döndürür — her ikisini dene
      const data =
        raw?.[String(appid)]?.data ??
        raw?.[Number(appid)]?.data ??
        Object.values(raw || {})[0]?.data;

      if (!data) {
        return NextResponse.json({ error: 'Oyun bulunamadı.' }, { status: 404 });
      }

      return NextResponse.json({ game: formatAppDetail(data, rate) });
    }

    // ── Bölüm bazlı ──────────────────────────────────────────────────────
    if (section) {
      const res = await fetch(
        `https://store.steampowered.com/api/featuredcategories/?cc=${CC}&l=${LANG}`,
        { next: { revalidate: 600 } }
      );
      if (!res.ok) throw new Error(`Steam featuredcategories HTTP ${res.status}`);
      const data = await res.json();

      let items = [];

      if (section === 'all') {
        // Tüm kategorileri birleştir — tekrarları kaldır
        const seen = new Set();
        for (const cat of ['top_sellers', 'new_releases', 'specials', 'featured_win', 'coming_soon']) {
          for (const item of (data?.[cat]?.items || [])) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              items.push(item);
            }
          }
        }
      } else {
        const MAP = {
          featured:   'featured_win',
          topsellers: 'top_sellers',
          new:        'new_releases',
          specials:   'specials',
        };
        items = data?.[MAP[section] || section]?.items || [];
      }

      const results = items.slice(0, num).map(item => formatFeaturedItem(item, rate));
      return NextResponse.json({ results, total: results.length });
    }

    // ── Arama ────────────────────────────────────────────────────────────
    const start = (page - 1) * num;
    const term  = q || 'action';
    const res   = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}` +
      `&l=${LANG}&cc=${CC}&num=${num}&start=${start}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) throw new Error(`Steam storesearch HTTP ${res.status}`);
    const data    = await res.json();
    const results = (data?.items || []).map(item => formatSearchItem(item, rate));

    return NextResponse.json({ results, total: data?.total || 0 });

  } catch (err) {
    console.error('Steam API hatası:', err.message);
    return NextResponse.json({ error: err.message, results: [] }, { status: 500 });
  }
}

// ── Formatlayıcılar ───────────────────────────────────────────────────────

function formatSearchItem(item, rate) {
  const p         = item.price || {};
  const priceInfo = parsePrice({
    final:            p.final,
    initial:          p.initial,
    discount_percent: p.discount_percent,
    currency:         p.currency,
  }, rate);

  return {
    id:        item.id,
    name:      item.name,
    image:     item.tiny_image,
    price:     priceInfo.isFree ? 0 : priceInfo.price,
    original:  priceInfo.original,
    discount:  priceInfo.discount,
    isFree:    priceInfo.isFree,
    onSale:    priceInfo.discount > 0,
    gamePass:  false,
    noData:    priceInfo.price === null,
    steamUrl:  `https://store.steampowered.com/app/${item.id}`,
    platforms: ['pc'],
    source:    'steam',
  };
}

function formatFeaturedItem(item, rate) {
  const priceInfo = item.final_price !== undefined
    ? parsePrice({
        final:            item.final_price,
        initial:          item.original_price,
        discount_percent: item.discount_percent,
        currency:         item.currency,
      }, rate)
    : { price: null, original: null, discount: 0, isFree: false };

  return {
    id:        item.id,
    name:      item.name,
    image:     item.large_capsule_image || item.header_image || item.small_capsule_image,
    price:     priceInfo.isFree ? 0 : priceInfo.price,
    original:  priceInfo.original,
    discount:  priceInfo.discount,
    isFree:    priceInfo.isFree,
    onSale:    (item.discount_percent || 0) > 0,
    gamePass:  false,
    noData:    priceInfo.price === null,
    steamUrl:  `https://store.steampowered.com/app/${item.id}`,
    platforms: ['pc'],
    source:    'steam',
  };
}

function formatAppDetail(data, rate) {
  const priceInfo = data.price_overview
    ? parsePrice({
        final:            data.price_overview.final,
        initial:          data.price_overview.initial,
        discount_percent: data.price_overview.discount_percent,
        currency:         data.price_overview.currency,
      }, rate)
    : { price: null, original: null, discount: 0, isFree: !!data.is_free };

  return {
    id:          data.steam_appid,
    name:        data.name,
    image:       data.header_image,
    screenshots: (data.screenshots || []).slice(0, 5).map(s => s.path_full).filter(s => typeof s === 'string' && s.length > 0),
    description: data.short_description || '',
    fullDesc:    data.detailed_description || '',
    metacritic:  data.metacritic?.score  || null,
    released:    data.release_date?.date || null,
    developer:   data.developers?.[0]    || null,
    publisher:   data.publishers?.[0]    || null,
    genres:      (data.genres     || []).map(g => g.description),
    categories:  (data.categories || []).map(c => c.description),
    platforms:   data.platforms || {},
    price:       priceInfo.isFree ? 0 : priceInfo.price,
    original:    priceInfo.original,
    discount:    priceInfo.discount,
    isFree:      priceInfo.isFree || !!data.is_free,
    onSale:      priceInfo.discount > 0,
    noData:      priceInfo.price === null,
    steamUrl:    `https://store.steampowered.com/app/${data.steam_appid}`,
    source:      'steam',
  };
}
