import { NextResponse } from 'next/server';

// Epic Games GraphQL API — Türkiye (TR) fiyatları
// GET /api/epic?q=cyberpunk&num=5
const EPIC_GQL = 'https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=tr&country=TR&allowCountries=TR';
const CATALOG  = 'https://catalog-public-service-prod06.ol.epicgames.com/catalog/api/shared/namespace';

// Epic'in Storefront arama API'si
const SEARCH_URL = 'https://store-site-backend-static-ipv4.ak.epicgames.com/autocomplete?query={QUERY}&locale=tr&country=TR';

// Epic Games arama endpoint (GraphQL)
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
        offerType
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

    const results = elements.slice(0, num).map(el => {
      const tp       = el.price?.totalPrice;
      const priceVal = tp?.discountPrice  ?? null;
      const origVal  = tp?.originalPrice  ?? null;
      const disc     = tp?.discount       ?? 0;
      const cur      = tp?.currencyCode   || 'USD';

      // TRY cinsinden kuruş → TL
      const toTL = (v) => {
        if (v == null) return null;
        return cur === 'USD'
          ? null   // USD döndürüyorsa kullanma — TRY endpoint kullanılmıyor
          : Math.round(v / 100);
      };

      const slug = el.catalogNs?.mappings?.[0]?.pageSlug || el.productSlug || el.urlSlug || '';

      return {
        id:       el.id,
        name:     el.title,
        price:    cur === 'TRY' ? Math.round((priceVal ?? 0) / 100) : null,
        original: cur === 'TRY' ? Math.round((origVal  ?? 0) / 100) : null,
        discount: disc,
        isFree:   priceVal === 0,
        currency: cur,
        epicUrl:  slug ? `https://store.epicgames.com/tr/p/${slug}` : null,
      };
    // Sadece TRY fiyatı olan veya ücretsiz olanları döndür
    }).filter(r => r.price != null || r.isFree);

    return NextResponse.json({ results });
  } catch (err) {
    console.error('Epic API hatası:', err.message);
    return NextResponse.json({ results: [] });
  }
}
