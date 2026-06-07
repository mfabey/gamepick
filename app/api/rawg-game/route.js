import { NextResponse } from 'next/server';

const RAWG_KEY = process.env.RAWG_API_KEY;
const BASE     = 'https://api.rawg.io/api';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) return NextResponse.json({ error: 'slug eksik' }, { status: 400 });

  try {
    const [detail, shots] = await Promise.all([
      fetch(`${BASE}/games/${slug}?key=${RAWG_KEY}`, { next: { revalidate: 3600 } }).then(r => r.json()),
      fetch(`${BASE}/games/${slug}/screenshots?key=${RAWG_KEY}`, { next: { revalidate: 3600 } }).then(r => r.json()).catch(() => ({ results: [] })),
    ]);

    if (detail.detail === 'Not found.') {
      return NextResponse.json({ error: 'Oyun bulunamadi' }, { status: 404 });
    }

    // Store URL'lerinden Steam appid cikart
    const steamStoreEntry = detail.stores?.find(s => s.store?.slug === 'steam');
    const epicStoreEntry  = detail.stores?.find(s => s.store?.slug === 'epic-games');
    const steamAppId = steamStoreEntry?.url?.match(/store\.steampowered\.com\/app\/(\d+)/)?.[1] || null;
    const epicUrl    = epicStoreEntry?.url || (epicStoreEntry ? `https://store.epicgames.com/en-US/p/${slug}` : null);

    const game = {
      id:           `rawg_${detail.id}`,
      rawgId:       detail.id,
      rawgSlug:     detail.slug,
      name:         detail.name,
      image:        detail.background_image,
      description:  detail.description_raw || detail.description || '',
      metacritic:   detail.metacritic || null,
      rating:       detail.rating     || 0,
      totalReviews: detail.ratings_count || 0,
      developer:    detail.developers?.[0]?.name || null,
      publisher:    detail.publishers?.[0]?.name || null,
      released:     detail.released || null,
      playtime:     detail.playtime  || null,
      genres:       (detail.genres || []).map(g => g.name),
      tags:         (detail.tags   || []).map(t => t.name).slice(0, 15),
      platforms:    (detail.platforms || []).map(p => p.platform.name),
      screenshots:  (shots.results   || []).map(s => s.image).filter(Boolean).slice(0, 6),
      hasSteam:     !!steamAppId,
      hasEpic:      !!epicStoreEntry,
      steamAppId,
      epicUrl,
      steamUrl:     steamAppId ? `https://store.steampowered.com/app/${steamAppId}` : null,
      source:       steamAppId ? 'steam' : epicStoreEntry ? 'epic' : 'rawg',
    };

    return NextResponse.json({ game });

  } catch (err) {
    console.error('RAWG game detail hatasi:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
