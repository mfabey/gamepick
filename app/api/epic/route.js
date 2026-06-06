import { NextResponse } from 'next/server';

const GQL     = 'https://store.epicgames.com/graphql';
const COUNTRY = 'TR';
const LOCALE  = 'tr';

// Epic GraphQL sorgusu
async function queryEpic({ count = 24, start = 0, sortBy = 'releaseDate', sortDir = 'DESC', keywords = '', onSale = false }) {
  const body = {
    query: `{
      Catalog {
        searchStore(
          allowCountries: "${COUNTRY}"
          category: "games/edition/base"
          count: ${count}
          start: ${start}
          locale: "${LOCALE}"
          sortBy: "${sortBy}"
          sortDir: "${sortDir}"
          withPrice: true
          ${keywords ? `keywords: "${keywords.replace(/"/g, '\\"')}"` : ''}
          ${onSale    ? 'onSale: true' : ''}
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
            price(country: "${COUNTRY}") {
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
    }`,
  };

  const res = await fetch(GQL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    next:    { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Epic GQL HTTP ${res.status}`);
  return res.json();
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
        { next: { revalidate: 3600 } }
      );
      if (!res.ok) throw new Error(`Epic free HTTP ${res.status}`);
      const freeData = await res.json();
      const elements = freeData?.data?.Catalog?.searchStore?.elements || [];
      const results  = elements
        .filter(item => (item.price?.totalPrice?.discountPrice ?? -1) === 0)
        .map(item => formatEpicItem(item));
      return NextResponse.json({ results, total: results.length });
    }

    // ── Yeni çıkanlar ────────────────────────────────────────────────────────
    if (section === 'new') {
      const data    = await queryEpic({ count: num, start, sortBy: 'releaseDate', sortDir: 'DESC' });
      const items   = data?.data?.Catalog?.searchStore?.elements || [];
      const total   = data?.data?.Catalog?.searchStore?.paging?.total || 0;
      const results = items.map(formatEpicItem);
      return NextResponse.json({ results, total });
    }

    // ── İndirimli ────────────────────────────────────────────────────────────
    if (section === 'sale') {
      const data    = await queryEpic({ count: num, start, sortBy: 'releaseDate', sortDir: 'DESC', onSale: true });
      const items   = data?.data?.Catalog?.searchStore?.elements || [];
      const total   = data?.data?.Catalog?.searchStore?.paging?.total || 0;
      const results = items.map(formatEpicItem);
      return NextResponse.json({ results, total });
    }

    // ── Arama veya genel listeleme ───────────────────────────────────────────
    const keywords = q || '';
    const data     = await queryEpic({ count: num, start, sortBy: 'releaseDate', sortDir: 'DESC', keywords });
    const items    = data?.data?.Catalog?.searchStore?.elements || [];
    const total    = data?.data?.Catalog?.searchStore?.paging?.total || 0;
    const results  = items.map(formatEpicItem);
    return NextResponse.json({ results, total, source: 'epic' });

  } catch (err) {
    console.error('Epic API hatası:', err.message);
    return NextResponse.json({ error: err.message, results: [] }, { status: 500 });
  }
}

// ── Yardımcı fonksiyonlar ─────────────────────────────────────────────────────

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
    id:       `epic_${slug}`,   // Steam ID'leri ile çakışmasın
    epicSlug: slug,
    name:     item.title,
    image:    getImage(item),
    price:    isFree ? 0 : (discountPrice != null ? Math.round(discountPrice / 100) : null),
    original: originalPrice != null ? Math.round(originalPrice / 100) : null,
    discount,
    isFree,
    onSale:   discount > 0 && !isFree,
    gamePass: false,
    noData:   discountPrice == null,
    epicUrl:  `https://store.epicgames.com/en-US/p/${slug}`,
    steamUrl: null,
    platforms: ['pc'],
    source:   'epic',
  };
}

function formatEpicDetail(item) {
  const base = formatEpicItem(item);
  return {
    ...base,
    description: item.description || '',
    developer:   item.seller?.name || null,
    released:    item.effectiveDate ? item.effectiveDate.slice(0, 10) : null,
    genres:      [...new Set(
      (item.categories || [])
        .map(c => c.path?.split('/')?.[1])
        .filter(Boolean)
    )],
    tags: (item.tags || []).map(t => t.name).filter(Boolean).slice(0, 15),
    screenshots: (item.keyImages || [])
      .filter(k => ['DieselStoreFrontWide', 'OfferImageWide', 'Screenshot'].includes(k.type))
      .map(k => k.url)
      .filter(Boolean)
      .slice(0, 5),
  };
}
