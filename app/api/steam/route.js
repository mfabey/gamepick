import { NextResponse } from 'next/server';

const CC = 'TR';   // ülke kodu — Türk lirası fiyatları
const LANG = 'turkish';

// GET /api/steam?q=query&page=1        → arama
// GET /api/steam?section=featured      → öne çıkan
// GET /api/steam?section=topsellers    → çok satanlar
// GET /api/steam?section=new           → yeni çıkanlar
// GET /api/steam?section=specials      → indirimler
// GET /api/steam?appid=271590          → tek oyun detayı

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q       = searchParams.get('q');
  const section = searchParams.get('section');
  const appid   = searchParams.get('appid');
  const page    = parseInt(searchParams.get('page') || '1');
  const num     = parseInt(searchParams.get('num') || '24');

  try {
    // ── Tek oyun detayı ──────────────────────────────────────────────────
    if (appid) {
      const res  = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=${CC}&l=${LANG}`,
        { next: { revalidate: 300 } }
      );
      const raw  = await res.json();
      const data = raw?.[appid]?.data;
      if (!data) return NextResponse.json({ error: 'Oyun bulunamadı.' });

      return NextResponse.json({ game: formatAppDetail(data) });
    }

    // ── Bölüm bazlı (anasayfa) ───────────────────────────────────────────
    if (section) {
      const res  = await fetch(
        `https://store.steampowered.com/api/featuredcategories/?cc=${CC}&l=${LANG}`,
        { next: { revalidate: 600 } }
      );
      const data = await res.json();

      let items = [];
      if (section === 'featured') {
        // Öne çıkan oyunlar
        items = data?.featured_win?.items || [];
      } else if (section === 'topsellers') {
        items = data?.top_sellers?.items || [];
      } else if (section === 'new') {
        items = data?.new_releases?.items || [];
      } else if (section === 'specials') {
        items = data?.specials?.items || [];
      }

      const results = items.slice(0, num).map(formatFeaturedItem);
      return NextResponse.json({ results });
    }

    // ── Arama ────────────────────────────────────────────────────────────
    const start = (page - 1) * num;
    const term  = q || 'action';
    const res   = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=${LANG}&cc=${CC}&num=${num}&start=${start}`,
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    const results = (data?.items || []).map(formatSearchItem);

    return NextResponse.json({
      results,
      total: data?.total || 0,
    });

  } catch (err) {
    console.error('Steam API hatası:', err);
    return NextResponse.json({ error: 'Steam verisi alınamadı.', results: [] }, { status: 500 });
  }
}

// ── Yardımcı formatlayıcılar ──────────────────────────────────────────────

function parsePrice(priceObj) {
  if (!priceObj) return { price: null, original: null, discount: 0, isFree: false };
  if (priceObj.final === 0) return { price: 0, original: 0, discount: 0, isFree: true };

  // Steam fiyatları "kuruş" cinsinden (59900 = 599,00 ₺)
  const price    = Math.round(priceObj.final    / 100);
  const original = Math.round(priceObj.initial  / 100);
  const discount = priceObj.discount_percent || 0;
  return { price, original, discount, isFree: false };
}

function formatSearchItem(item) {
  const priceInfo = parsePrice(item.price);
  return {
    id:         item.id,
    name:       item.name,
    image:      item.tiny_image,
    price:      priceInfo.isFree ? 0 : priceInfo.price,
    original:   priceInfo.original,
    discount:   priceInfo.discount,
    isFree:     priceInfo.isFree,
    onSale:     priceInfo.discount > 0,
    gamePass:   false,
    noData:     priceInfo.price === null,
    steamUrl:   `https://store.steampowered.com/app/${item.id}`,
    platforms:  ['pc'],
    source:     'steam',
  };
}

function formatFeaturedItem(item) {
  const priceInfo = parsePrice(item.final_price !== undefined
    ? { final: item.final_price, initial: item.original_price, discount_percent: item.discount_percent }
    : null
  );
  return {
    id:         item.id,
    name:       item.name,
    image:      item.large_capsule_image || item.header_image || item.small_capsule_image,
    price:      priceInfo.isFree ? 0 : priceInfo.price,
    original:   priceInfo.original,
    discount:   priceInfo.discount,
    isFree:     priceInfo.isFree,
    onSale:     item.discount_percent > 0,
    gamePass:   false,
    noData:     priceInfo.price === null,
    steamUrl:   `https://store.steampowered.com/app/${item.id}`,
    platforms:  ['pc'],
    source:     'steam',
  };
}

function formatAppDetail(data) {
  const priceInfo = parsePrice(data.price_overview);
  return {
    id:          data.steam_appid,
    name:        data.name,
    image:       data.header_image,
    screenshots: data.screenshots?.slice(0, 5).map(s => s.path_full) || [],
    description: data.short_description,
    fullDesc:    data.detailed_description,
    metacritic:  data.metacritic?.score || null,
    released:    data.release_date?.date,
    developer:   data.developers?.[0],
    publisher:   data.publishers?.[0],
    genres:      data.genres?.map(g => g.description) || [],
    categories:  data.categories?.map(c => c.description) || [],
    platforms:   data.platforms,
    price:       priceInfo.isFree ? 0 : priceInfo.price,
    original:    priceInfo.original,
    discount:    priceInfo.discount,
    isFree:      priceInfo.isFree || data.is_free,
    onSale:      priceInfo.discount > 0,
    noData:      priceInfo.price === null,
    steamUrl:    `https://store.steampowered.com/app/${data.steam_appid}`,
    source:      'steam',
  };
}
