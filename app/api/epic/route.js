import { NextResponse } from 'next/server';
import { getUsdToTry } from '../../lib/exchange';

// Epic Games Store fiyatları — iki ayrı endpoint denenir
// GET /api/epic?q=cyberpunk&num=5

// Endpoint 1: Resmi Epic Store GraphQL (tercih edilen)
const GQL_URL = 'https://store.epicgames.com/graphql';

// Endpoint 2: Statik backend (fallback)
const BROWSE_URL = 'https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions';

const SEARCH_QUERY = `
query searchStoreQuery(
  $allowCountries: String
  $category: String
  $count: Int
  $country: String!
  $keywords: String
  $locale: String
  $sortBy: String
  $sortDir: String
) {
  Catalog {
    searchStore(
      allowCountries: $allowCountries
      category: $category
      count: $count
      country: $country
      keywords: $keywords
      locale: $locale
      sortBy: $sortBy
      sortDir: $sortDir
    ) {
      elements {
        title
        id
        namespace
        offerType
        status
        productSlug
        urlSlug
        price(country: $country) {
          totalPrice {
            discountPrice
            originalPrice
            discount
            currencyCode
          }
        }
        catalogNs {
          mappings(pageType: "productHome") {
            pageSlug
            pageType
          }
        }
      }
    }
  }
}`;

// Epic fiyat verisini TRY'ye çevir
async function epicElementToResult(el, usdTryRateRef) {
  const tp       = el.price?.totalPrice;
  const rawFinal = tp?.discountPrice ?? null;
  const rawOrig  = tp?.originalPrice ?? null;
  const disc     = tp?.discount      ?? 0;
  const currency = tp?.currencyCode  || 'USD';

  if (el.status && el.status !== 'ACTIVE') return null;

  let price, original;

  if (currency === 'TRY') {
    price    = rawFinal != null ? Math.round(rawFinal / 100) : null;
    original = rawOrig  != null ? Math.round(rawOrig  / 100) : price;
  } else {
    if (!usdTryRateRef.value) usdTryRateRef.value = await getUsdToTry();
    const rate   = usdTryRateRef.value;
    const factor = currency === 'EUR' ? rate * 0.93
                 : currency === 'GBP' ? rate * 0.79
                 : rate;
    price    = rawFinal != null ? Math.round((rawFinal / 100) * factor) : null;
    original = rawOrig  != null ? Math.round((rawOrig  / 100) * factor) : price;
  }

  if (price == null && rawFinal !== 0) return null;

  const slug = el.catalogNs?.mappings?.[0]?.pageSlug
            || el.productSlug
            || el.urlSlug
            || '';

  return {
    id:       el.id,
    name:     el.title,
    price:    rawFinal === 0 ? 0 : price,
    original: rawFinal === 0 ? 0 : original,
    discount: disc,
    isFree:   rawFinal === 0,
    currency: 'TRY',
    epicUrl:  slug ? `https://store.epicgames.com/tr/p/${slug}` : null,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q   = (searchParams.get('q') || '').trim();
  const num = Math.min(parseInt(searchParams.get('num') || '5'), 10);
  if (!q) return NextResponse.json({ results: [] });

  const rateRef = { value: null }; // getUsdToTry'ı tek seferlik çağır

  // ── Endpoint 1: store.epicgames.com/graphql ──────────────────────────────
  try {
    const res = await fetch(GQL_URL, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json',
        'User-Agent':   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin':       'https://store.epicgames.com',
        'Referer':      'https://store.epicgames.com/',
      },
      body: JSON.stringify({
        query:     SEARCH_QUERY,
        variables: {
          allowCountries: 'TR',
          category:       'games/edition/base|bundles/games|editors',
          count:          num,
          country:        'TR',
          keywords:       q,
          locale:         'tr',
          sortBy:         'relevancy',
          sortDir:        'DESC',
        },
      }),
      next: { revalidate: 1800 },
    });

    if (res.ok) {
      const body = await res.json();
      if (!body?.errors?.length) {
        const elements = body?.data?.Catalog?.searchStore?.elements || [];
        const results  = (await Promise.all(elements.map(el => epicElementToResult(el, rateRef)))).filter(Boolean);
        if (results.length > 0) return NextResponse.json({ results });
      }
    }
  } catch (e) {
    console.warn('Epic GQL Endpoint 1 hata:', e.message);
  }

  // ── Endpoint 2: Farklı GQL host ─────────────────────────────────────────
  try {
    const res2 = await fetch('https://graphql.epicgames.com/graphql', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json',
      },
      body: JSON.stringify({
        query:     SEARCH_QUERY,
        variables: {
          allowCountries: 'TR',
          category:       'games/edition/base|bundles/games|editors',
          count:          num,
          country:        'TR',
          keywords:       q,
          locale:         'tr',
          sortBy:         'relevancy',
          sortDir:        'DESC',
        },
      }),
      next: { revalidate: 1800 },
    });

    if (res2.ok) {
      const body2 = await res2.json();
      if (!body2?.errors?.length) {
        const elements2 = body2?.data?.Catalog?.searchStore?.elements || [];
        const results2  = (await Promise.all(elements2.map(el => epicElementToResult(el, rateRef)))).filter(Boolean);
        if (results2.length > 0) return NextResponse.json({ results: results2 });
      }
    }
  } catch (e) {
    console.warn('Epic GQL Endpoint 2 hata:', e.message);
  }

  return NextResponse.json({ results: [] });
}
