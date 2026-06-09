import { NextResponse } from 'next/server';

const RAWG_KEY = process.env.RAWG_API_KEY;
const BASE     = 'https://api.rawg.io/api';

function rawgUrl(path, params = {}) {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('key', RAWG_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function fetchRawg(path, params = {}) {
  const url = rawgUrl(path, params);
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`RAWG ${res.status}`);
  return res.json();
}

// GET /api/dlc?section=new&q=...&page=1&num=24
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get('section') || '';
  const q       = searchParams.get('q')       || '';
  const page    = parseInt(searchParams.get('page') || '1');
  const num     = parseInt(searchParams.get('num')  || '24');

  if (!RAWG_KEY) {
    return NextResponse.json({ error: 'RAWG_API_KEY eksik', results: [] }, { status: 500 });
  }

  try {
    // RAWG'da DLC/ek içerik = "additions" (exclude_additions=false ile gelir,
    // ama bunları izole etmek için parent_platforms + tags kullanıyoruz)
    const base = { platforms: 4, page, page_size: num };

    let params;
    const trimmedQ = q.trim();

    if (trimmedQ) {
      // Arama: DLC/expansion/pack içeren sonuçları getir
      params = { ...base, search: trimmedQ };
    } else if (section === 'new') {
      const today = new Date().toISOString().slice(0, 10);
      params = {
        ...base,
        ordering: '-released',
        dates:    '2020-01-01,' + today,
        tags:     'dlc,expansion,downloadable-content,season-pass',
      };
    } else if (section === 'popular') {
      params = {
        ...base,
        ordering: '-rating',
        tags:     'dlc,expansion,downloadable-content,season-pass',
      };
    } else {
      // Varsayılan: en son eklenen DLC'ler
      params = {
        ...base,
        ordering: '-added',
        tags:     'dlc,expansion,downloadable-content,season-pass',
      };
    }

    const data    = await fetchRawg('/games', params);
    const results = (data.results || []).map(formatDlc);

    return NextResponse.json({ results, total: data.count || 0, source: 'rawg' });

  } catch (err) {
    console.error('DLC API hatası:', err.message);
    return NextResponse.json({ error: err.message, results: [] }, { status: 500 });
  }
}

function formatDlc(game) {
  const steamStore = game.stores?.find(s => s.store?.slug === 'steam');
  const epicStore  = game.stores?.find(s => s.store?.slug === 'epic-games');
  const hasSteam   = !!steamStore;
  const hasEpic    = !!epicStore;

  return {
    id:           'rawg_' + game.id,
    rawgId:       game.id,
    rawgSlug:     game.slug,
    name:         game.name,
    image:        game.background_image,
    metacritic:   game.metacritic    || null,
    reviewScore:  game.rating        ? Math.round(game.rating * 20) : 0,
    totalReviews: game.ratings_count || 0,
    isFree:       false,
    price:        null,
    noData:       true,
    platforms:    ['pc'],
    hasSteam,
    hasEpic,
    epicUrl:      hasEpic ? 'https://store.epicgames.com/tr/p/' + game.slug : null,
    genres:       (game.genres || []).map(g => g.name).slice(0, 3),
    released:     game.released || null,
    isDlc:        true,
  };
}
