import { NextResponse } from 'next/server';

const RAWG_KEY = process.env.RAWG_API_KEY;
const BASE     = 'https://api.rawg.io/api';

// RAWG store ID'leri
const STEAM_STORE_ID = 1;
const EPIC_STORE_ID  = 11;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) return NextResponse.json({ error: 'slug eksik' }, { status: 400 });

  try {
    // 3 endpoint paralel: detail + screenshots + store URLs
    const [detail, shots, storesData] = await Promise.all([
      fetch(`${BASE}/games/${slug}?key=${RAWG_KEY}`, { next: { revalidate: 3600 } }).then(r => r.json()),
      fetch(`${BASE}/games/${slug}/screenshots?key=${RAWG_KEY}`, { next: { revalidate: 3600 } }).then(r => r.json()).catch(() => ({ results: [] })),
      fetch(`${BASE}/games/${slug}/stores?key=${RAWG_KEY}`, { next: { revalidate: 3600 } }).then(r => r.json()).catch(() => ({ results: [] })),
    ]);

    if (detail.detail === 'Not found.') {
      return NextResponse.json({ error: 'Oyun bulunamadi' }, { status: 404 });
    }

    // /stores endpoint'inden URL'leri al (store_id ile eşleştir)
    const storeResults  = storesData.results || [];
    const steamStoreRow = storeResults.find(s => s.store_id === STEAM_STORE_ID);
    const epicStoreRow  = storeResults.find(s => s.store_id === EPIC_STORE_ID);

    // Steam appid — URL'den regex ile çıkar
    const steamUrl   = steamStoreRow?.url || null;
    const steamAppId = steamUrl?.match(/store\.steampowered\.com\/app\/(\d+)/)?.[1] || null;

    // Epic URL
    const epicUrl = epicStoreRow?.url || null;

    // hasSteam/hasEpic için de detail.stores'a fallback (liste endpoint'i bunu zaten veriyor)
    const detailStores = detail.stores || [];
    const hasSteam = !!steamAppId || detailStores.some(s => s.store?.slug === 'steam');
    const hasEpic  = !!epicStoreRow  || detailStores.some(s => s.store?.slug === 'epic-games');

    const game = {
      id:           `rawg_${detail.id}`,
      rawgId:       detail.id,
      rawgSlug:     detail.slug,
      name:         detail.name,
      image:        detail.background_image,
      description:  detail.description_raw || '',
      metacritic:   detail.metacritic   || null,
      rating:       detail.rating       || 0,
      totalReviews: detail.ratings_count || 0,
      developer:    detail.developers?.[0]?.name || null,
      publisher:    detail.publishers?.[0]?.name || null,
      released:     detail.released  || null,
      playtime:     detail.playtime  || null,
      genres:       (detail.genres   || []).map(g => g.name),
      tags:         (detail.tags     || []).map(t => t.name).slice(0, 15),
      platforms:    (detail.platforms|| []).map(p => p.platform.name),
      screenshots:  (shots.results   || []).map(s => s.image).filter(Boolean).slice(0, 6),
      hasSteam,
      hasEpic,
      steamAppId:   steamAppId || null,
      epicUrl:      epicUrl ? epicUrl.replace('/en-US/', '/tr/') : (hasEpic ? `https://store.epicgames.com/tr/p/${slug}` : null),
      steamUrl:     steamAppId ? `https://store.steampowered.com/app/${steamAppId}` : null,
      source:       steamAppId ? 'steam' : hasEpic ? 'epic' : 'rawg',
    };

    return NextResponse.json({ game });

  } catch (err) {
    console.error('RAWG game detail hatasi:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
