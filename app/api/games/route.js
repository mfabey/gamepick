import { NextResponse } from 'next/server';

const RAWG_KEY = process.env.RAWG_API_KEY;
const BASE     = 'https://api.rawg.io/api';

// Türkçe tür adı → RAWG genre slug
const TR_GENRE = {
  'aksiyon':    'action',
  'macera':     'adventure',
  'rpg':        'role-playing-games-rpg',
  'strateji':   'strategy',
  'simülasyon': 'simulation',
  'simulasyon': 'simulation',
  'bulmaca':    'puzzle',
  'spor':       'sports',
  'yarış':      'racing',
  'yaris':      'racing',
  'platform':   'platformer',
  'dövüş':      'fighting',
  'dovus':      'fighting',
  'atıcılık':   'shooter',
  'aticilik':   'shooter',
  'arcade':     'arcade',
};

// Türkçe etiket → RAWG tag slug
const TR_TAG = {
  'açık dünya':    'open-world',
  'acik dunya':    'open-world',
  'açık-dünya':    'open-world',
  'çok oyunculu':  'multiplayer',
  'cok oyunculu':  'multiplayer',
  'co-op':         'co-op',
  'korku':         'horror',
  'zombi':         'zombie',
  'uzay':          'space',
  'sandbox':       'sandbox',
  'roguelike':     'roguelike',
  'hayatta kalma': 'survival',
  'hayatta-kalma': 'survival',
  'ücretsiz':      'free-to-play',
  'ucretsiz':      'free-to-play',
  'hikaye':        'story',
  'savaş':         'war',
  'savas':         'war',
  'tarih':         'historical',
  'fantezi':       'fantasy',
  'bilim kurgu':   'sci-fi',
  'bilim-kurgu':   'sci-fi',
  'atmosferik':    'atmospheric',
  'indie':         'indie',
  'soulslike':     'souls-like',
  'yapım':         'building',
  'yapim':         'building',
};

// Arama sorgusunu Türkçe tür/etiket filtrelerine dönüştür
function trFilter(q) {
  const lq = q.toLowerCase().trim();
  if (TR_GENRE[lq]) return { genres: TR_GENRE[lq], ordering: '-rating' };
  if (TR_TAG[lq])   return { tags:   TR_TAG[lq],   ordering: '-rating' };
  return null;
}

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
    const base = { platforms: 4, page, page_size: num, exclude_additions: true };
    let params;

    const trimmedQ = q.trim();
    if (trimmedQ) {
      // Önce Türkçe tür/etiket eşlemesi dene
      const mapped = trFilter(trimmedQ);
      if (mapped) {
        params = { ...base, ...mapped };
      } else {
        params = { ...base, search: trimmedQ };
      }
    } else if (section === 'new') {
      const today = new Date().toISOString().slice(0, 10);
      params = { ...base, ordering: '-released', dates: '2023-01-01,' + today };
    } else if (section === 'topscore') {
      params = { ...base, ordering: '-metacritic', metacritic: '70,100' };
    } else if (section === 'popular') {
      params = { ...base, ordering: '-rating', metacritic: '60,100' };
    } else if (section === 'free') {
      params = { ...base, tags: 'free-to-play', ordering: '-added' };
    } else {
      params = { ...base, ordering: '-added' };
    }

    const data    = await fetchRawg('/games', params);
    const results = (data.results || []).map(formatRawgGame);

    return NextResponse.json({ results, total: data.count || 0, source: 'rawg' });

  } catch (err) {
    console.error('RAWG API hatasi:', err.message);
    return NextResponse.json({ error: err.message, results: [] }, { status: 500 });
  }
}

function formatRawgGame(game) {
  const steamStore = game.stores?.find(s => s.store?.slug === 'steam');
  const epicStore  = game.stores?.find(s => s.store?.slug === 'epic-games');
  const hasSteam   = !!steamStore;
  const hasEpic    = !!epicStore;
  const source     = hasSteam ? 'steam' : hasEpic ? 'epic' : 'rawg';

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
    onSale:       false,
    price:        null,
    noData:       true,
    platforms:    ['pc'],
    source,
    hasSteam,
    hasEpic,
    epicUrl:      hasEpic ? 'https://store.epicgames.com/tr/p/' + game.slug : null,
    steamUrl:     null,
    genres:       (game.genres || []).map(g => g.name).slice(0, 3),
    released:     game.released || null,
  };
}
