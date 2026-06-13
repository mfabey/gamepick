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
  const rotate  = searchParams.get('rotate')  === 'true';

  if (!RAWG_KEY) {
    return NextResponse.json({ error: 'RAWG_API_KEY eksik', results: [] }, { status: 500 });
  }

  try {
    // Kategori aramalarında filtrelemeden sonra yeterli sayıda oyun kalması için RAWG'dan daha fazla oyun çekelim
    const fetchNum = (section && section !== '') ? 40 : num;
    const base = { platforms: 4, page, page_size: fetchNum, exclude_additions: true };
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
    } else if (section === 'sale') {
      params = { ...base, ordering: '-added', metacritic: '70,100' };
    } else {
      params = { ...base, ordering: '-added' };
    }

    const data    = await fetchRawg('/games', params);
    let results = (data.results || []).map(formatRawgGame);

    // Mağazası olmayan oyunları veya satışı olmayan/delisted oyunları tamamen filtrele (arama ve tüm listeler dahil)
    results = results.filter(g => g.hasStores && !KNOWN_DELISTED_SLUGS.has(g.rawgSlug));

    // İndirim köşesinde (sale) ücretsiz oyunları ve tek platformlu oyunları kaldır
    if (section === 'sale') {
      results = results.filter(g => !g.isFree && g.hasMultipleStores);
    }

    // Eğer rotate parametresi aktifse, listeyi zaman tabanlı (her 3 saatte bir) kaydırarak farklı oyunlar gösterelim
    if (rotate && results.length > num) {
      const hoursSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60));
      const seed = Math.floor(hoursSinceEpoch / 3);
      const offset = (seed * 5) % results.length;
      results = [...results.slice(offset), ...results.slice(0, offset)];
    }

    // İstenen limit kadar keselim (slice)
    if (section && section !== '') {
      results = results.slice(0, num);
    }

    return NextResponse.json({ results, total: data.count || 0, source: 'rawg' });

  } catch (err) {
    console.error('RAWG API hatasi:', err.message);
    return NextResponse.json({ error: err.message, results: [] }, { status: 500 });
  }
}

const KNOWN_FREE_SLUGS = new Set([
  'counter-strike-global-offensive',
  'counter-strike-2',
  'dota-2',
  'apex-legends',
  'pubg-battlegrounds',
  'playerunknowns-battlegrounds',
  'destiny-2',
  'warframe',
  'team-fortress-2',
  'lost-ark',
  'the-sims-4',
  'fall-guys-ultimate-knockout',
  'fall-guys',
  'rocket-league',
  'fortnite',
  'genshin-impact',
  'path-of-exile',
  'brawlhalla',
  'valorant',
  'call-of-duty-warzone',
  'overwatch-2',
  'hearthstone',
  'league-of-legends',
  'smite',
  'paladins',
  'war-thunder',
  'world-of-tanks',
  'world-of-warships',
  'unturned',
  'runescape',
  'gwent-the-witcher-card-game',
  'yu-gi-oh-master-duel',
  'fallout-shelter',
  'life-is-strange',
  'life-is-strange-episode-1',
  'life-is-strange-episode-1-2',
  'life-is-strange-2',
  'life-is-strange-2-episode-1',
  'eve-online',
  'albion-online',
  'roblox',
  'vrchat',
]);

const KNOWN_DELISTED_SLUGS = new Set([
  'grand-theft-auto-san-andreas',
  'grand-theft-auto-vice-city',
  'grand-theft-auto-iii',
  'dirt-3',
  'dirt-showdown',
  'grid-2',
  'f1-2018',
  'f1-2019',
  'f1-2020',
  'f1-2021',
  'marvels-avengers',
  'spec-ops-the-line',
  'transformers-devastation',
  'deadpool',
  'prey-2006',
  'driver-san-francisco',
]);

function formatRawgGame(game) {
  const steamStore = game.stores?.find(s => s.store?.slug === 'steam');
  const epicStore  = game.stores?.find(s => s.store?.slug === 'epic-games');
  const hasSteam   = !!steamStore;
  const hasEpic    = !!epicStore;
  const source     = hasSteam ? 'steam' : hasEpic ? 'epic' : 'rawg';
  const hasStores  = !!(game.stores && game.stores.length > 0);
  const isFree     = KNOWN_FREE_SLUGS.has(game.slug) || !!game.tags?.some(t => t.slug === 'free-to-play');

  // PC platformlarımızda (Steam, Epic, GOG) kaç yerde satıldığını kontrol et
  const pcStores = game.stores?.filter(s => {
    const slug = s.store?.slug;
    return slug === 'steam' || slug === 'epic-games' || slug === 'gog';
  }) || [];
  const hasMultipleStores = pcStores.length >= 2;

  return {
    id:           'rawg_' + game.id,
    rawgId:       game.id,
    rawgSlug:     game.slug,
    name:         game.name,
    image:        game.background_image,
    metacritic:   game.metacritic    || null,
    reviewScore:  game.rating        ? Math.round(game.rating * 20) : 0,
    totalReviews: game.ratings_count || 0,
    isFree,
    onSale:       false,
    price:        null,
    noData:       true,
    platforms:    ['pc'],
    source,
    hasSteam,
    hasEpic,
    hasStores,
    hasMultipleStores,
    epicUrl:      hasEpic ? 'https://store.epicgames.com/tr/p/' + game.slug : null,
    steamUrl:     null,
    genres:       (game.genres || []).map(g => g.name).slice(0, 3),
    released:     game.released || null,
  };
}
