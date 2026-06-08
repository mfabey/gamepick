import { NextResponse } from 'next/server';
import { getUsdToTry } from '../../lib/exchange';

// Epic Games GraphQL API — Türkiye (TR) fiyatları
// GET /api/epic?q=cyberpunk&num=5
const GQL_URL = 'https://graphql.epicgames.com/graphql';

const SEARCH_QUERY = `
query searchStoreQuery($keywords: String!, $country: String!, $locale: String!) {
  Catalog {
    searchStore(
      keywords: $keywords
      country: $country
      locale: $locale
      category: "games/edition/base|bundles/games|editors|software/edition/base"
      count: 5
      sortBy: "relevancy"
      sortDir: "DESC"
    ) {
      elements {
        title
        id
        namespace
        price(country: $country) {
          totalPrice {
            discountPrice
            originalPrice
            discount
            currencyCode
          }
        }
        productSlug
        urlSlug
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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q   = searchParams.get('q')   || '';
  const num = parseInt(searchParams.get('num') || '5');
  if (!q) return NextResponse.json({ results: [] });

  try {
    const res = await fetch(GQL_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query:     SEARCH_QUERY,
        variables: { keywords: q, country: 'TR', locale: 'tr' },
      }),
      next: { revalidate: 1800 },
    });

    if (!res.ok) return NextResponse.json({ results: [] });
    const data     = await res.json();
    const elements = data?.data?.Catalog?.searchStore?.elements || [];

    // Döviz kuruna ihtiyaç olursa al (çoğu zaman TR → TRY gelir)
    let usdTryRate = null;

    const results = await Promise.all(elements.slice(0, num).map(async el => {
      const tp       = el.price?.totalPrice;
      const rawFinal = tp?.discountPrice  ?? null;
      const rawOrig  = tp?.originalPrice  ?? null;
      const disc     = tp?.discount       ?? 0;
      const currency = tp?.currencyCode   || 'USD';

      let price, original;

      if (currency === 'TRY') {
        // Epic TR → kuruş / 100 = TL
        price    = rawFinal != null ? Math.round(rawFinal / 100) : null;
        original = rawOrig  != null ? Math.round(rawOrig  / 100) : price;
      } else {
        // USD veya başka para birimi → güncel kur ile TRY
        if (!usdTryRate) usdTryRate = await getUsdToTry();
        const factor = currency === 'EUR' ? usdTryRate * 0.93
                     : currency === 'GBP' ? usdTryRate * 0.79
                     : usdTryRate; // USD default
        price    = rawFinal != null ? Math.round((rawFinal / 100) * factor) : null;
        original = rawOrig  != null ? Math.round((rawOrig  / 100) * factor) : price;
      }

      const slug = el.catalogNs?.mappings?.[0]?.pageSlug || el.productSlug || el.urlSlug || '';

      return {
        id:       el.id,
        name:     el.title,
        price,
        original,
        discount: disc,
        isFree:   rawFinal === 0,
        currency: 'TRY',
        epicUrl:  slug ? `https://store.epicgames.com/tr/p/${slug}` : null,
      };
    }));

    // Sadece fiyatı olan veya ücretsiz olanları döndür
    return NextResponse.json({ results: results.filter(r => r.price != null || r.isFree) });

  } catch (err) {
    console.error('Epic API hatası:', err.message);
    return NextResponse.json({ results: [] });
  }
}
