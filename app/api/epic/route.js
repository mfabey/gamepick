import { NextResponse } from 'next/server';

// Edge runtime — Vercel'in edge ağını kullanır (AWS Lambda değil)
// Epic'in IP engeli Lambda'yı etkiler, Edge farklı IP aralığı kullanır
export const runtime = 'edge';

const GQL_ENDPOINTS = [
  'https://store.epicgames.com/graphql',
  'https://store-site-backend-static-ipv4.ak.epicgames.com/graphql',
];
const COUNTRY = 'TR';
const LOCALE  = 'tr';

const HEADERS = {
  'Content-Type':    'application/json',
  'Accept':          'application/json, text/plain, */*',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8',
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Origin':          'https://store.epicgames.com',
  'Referer':         'https://store.epicgames.com/',
};

const SEARCH_QUERY = `
query searchStoreQuery(
  $allowCountries: String
  $category: String
  $count: Int
  $country: String
  $keywords: String
  $locale: String
  $onSale: Boolean
  $sortBy: String
  $sortDir: String
  $start: Int
  $withPrice: Boolean
) {
  Catalog {
    searchStore(
      allowCountries: $allowCountries
      category: $category
      count: $count
      country: $country
      keywords: $keywords
      locale: $locale
      onSale: $onSale
      sortBy: $sortBy
      sortDir: $sortDir
      start: $start
      withPrice: $withPrice
    ) {
      elements {
        title
        id
        namespace
        description
        effectiveDate
        productSlug
        urlSlug
        keyImages { type url }
        seller { name }
        price(country: "TR") {
          totalPrice {
            discountPrice
            originalPrice
            discount
            currencyCode
          }
        }
        categories { path }
        tags { id name }
      }
      paging { count total }
    }
  }
}`;

async function queryEpic({ count = 24, start = 0, sortBy = 'releaseDate', sortDir = 'DESC', keywords, onSale }) {
  const variables = {
    allowCountries: COUNTRY,
    country:        COUNTRY,
    locale:         LOCALE,
    category:       'games/edition/base',
    count,
    start,
    sortBy,
    sortDir,
    withPrice:      true,
  };
  if (keywords) variables.keywords = keywords;
  if (onSale)   variables.onSale   = true;

  const body = JSON.stringify({ operationName: 'searchStoreQuery', variables, query: SEARCH_QUERY });

  let lastError;
  for (const gql of GQL_ENDPOINTS) {
    try {
      const res = await fetch(gql, { method: 'POST', headers: HEADERS, body });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(`Epic GQL [${gql}] ${res.status}:`, text.slice(0, 200));
        lastError = new Error(`HTTP ${res.status}`);
        continue; // sıradaki endpoint'i dene
      }

      const json = await res.json();
      if (json.errors?.length) {
        console.error('Epic GQL errors:', JSON.stringify(json.errors));
        lastError = new Error(json.errors[0].message);
        continue;
      }

      const resultCount = json?.data?.Catalog?.searchStore?.elements?.length ?? 0;
      console.log(`Epic GQL OK [${gql}] — ${resultCount} oyun`);
      return json;
    } catch (e) {
      console.error(`Epic GQL [${gql}] fetch hatası:`, e.message);
      lastError = e;
    }
  }

  throw lastError || new Error('Tüm Epic endpoint\'leri başarısız');
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get('section');
  const q       = searchParams.get('q');
  const slug    = searchParams.get('slug');
  const page    = parseInt(searchParams.get('page') || '1');
  const num     = parseInt(searchParams.get('num')  || '24');
  const start   = (page - 1) * num;

  try {
    // ── Tek oyun detayı ──────────────────────────────────────────────────────
    if (slug) {
      const data  = await queryEpic({ count: 10, keywords: slug.replace(/-/g, ' ') });
      const items = data?.data?.Catalog?.searchStore?.elements || [];
      const match = items.find(i =>
        (i.urlSlug     || '').toLowerCase() === slug.toLowerCase() ||
        (i.productSlug || '').toLowerCase() === slug.toLowerCase()
      ) || items[0];

      if (!match) return NextResponse.json({ error: 'Oyun bulunamadı' }, { status: 404 });
      return NextResponse.json({ game: formatEpicDetail(match) });
    }

    // ── Ücretsiz oyunlar ─────────────────────────────────────────────────────
    if (section === 'free') {
      const res = await fetch(
        'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=tr&country=TR&allowCountries=TR',
        { headers: HEADERS }
      );
      if (!res.ok) throw new Error(`Epic free HTTP ${res.status}`);
      const freeData = await res.json();
      const elements = freeData?.data?.Catalog?.searchStore?.elements || [];
      const results  = elements
        .filter(item => (item.price?.totalPrice?.discountPrice ?? -1) === 0)
        .map(formatEpicItem);
      return NextResponse.json({ results, total: results.length });
    }

    // ── Yeni çıkanlar ────────────────────────────────────────────────────────
    if (section === 'new') {
      const data  = await queryEpic({ count: num, start, sortBy: 'releaseDate', sortDir: 'DESC' });
      const items = data?.data?.Catalog?.searchStore?.elements || [];
      const total = data?.data?.Catalog?.searchStore?.paging?.total || 0;
      return NextResponse.json({ results: items.map(formatEpicItem), total });
    }

    // ── İndirimli ────────────────────────────────────────────────────────────
    if (section === 'sale') {
      const data  = await queryEpic({ count: num, start, onSale: true });
      const items = data?.data?.Catalog?.searchStore?.elements || [];
      const total = data?.data?.Catalog?.searchStore?.paging?.total || 0;
      return NextResponse.json({ results: items.map(formatEpicItem), total });
    }

    // ── Arama veya genel listeleme ───────────────────────────────────────────
    const data  = await queryEpic({ count: num, start, sortBy: 'releaseDate', sortDir: 'DESC', keywords: q || undefined });
    const items = data?.data?.Catalog?.searchStore?.elements || [];
    const total = data?.data?.Catalog?.searchStore?.paging?.total || 0;
    return NextResponse.json({ results: items.map(formatEpicItem), total, source: 'epic' });

  } catch (err) {
    console.error('Epic API hatası:', err.message);
    return NextResponse.json({ error: err.message, results: [] }, { status: 500 });
  }
}

// ── Yardımcı ─────────────────────────────────────────────────────────────────

function getSlug(item) {
  return item.urlSlug || item.productSlug || item.id;
}

function getImage(item) {
  const priority = ['Thumbnail', 'DieselStoreFrontWide', 'OfferImageWide', 'DieselGameBoxWide', 'DieselStoreFrontTall'];
  for (const type of priority) {
    const img = item.keyImages?.find(k => k.type === type);
    if (img?.url) return img.url;
  }
  return item.keyImages?.[0]?.url || null;
}

function formatEpicItem(item) {
  const price         = item.price?.totalPrice;
  const discountPrice = price?.discountPrice ?? null;
  const originalPrice = price?.originalPrice ?? null;
  const discount      = price?.discount      ?? 0;
  const isFree        = discountPrice === 0;
  const slug          = getSlug(item);

  return {
    id:        `epic_${slug}`,
    epicSlug:  slug,
    name:      item.title,
    image:     getImage(item),
    price:     isFree ? 0 : (discountPrice != null ? Math.round(discountPrice / 100) : null),
    original:  originalPrice != null ? Math.round(originalPrice / 100) : null,
    discount,
    isFree,
    onSale:    discount > 0 && !isFree,
    gamePass:  false,
    noData:    discountPrice == null,
    epicUrl:   `https://store.epicgames.com/en-US/p/${slug}`,
    steamUrl:  null,
    platforms: ['pc'],
    source:    'epic',
  };
}

function formatEpicDetail(item) {
  return {
    ...formatEpicItem(item),
    description: item.description || '',
    developer:   item.seller?.name || null,
    released:    item.effectiveDate ? item.effectiveDate.slice(0, 10) : null,
    genres:      [...new Set(
      (item.categories || []).map(c => c.path?.split('/')?.[1]).filter(Boolean)
    )],
    tags:        (item.tags || []).map(t => t.name).filter(Boolean).slice(0, 15),
    screenshots: (item.keyImages || [])
      .filter(k => ['DieselStoreFrontWide', 'OfferImageWide', 'Screenshot'].includes(k.type))
      .map(k => k.url).filter(Boolean).slice(0, 5),
  };
}
