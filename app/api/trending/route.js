import { NextResponse } from 'next/server';
import { isAdultContent } from '../../lib/adult-filter.js';

const RAWG_KEY = process.env.RAWG_API_KEY;
const BASE     = 'https://api.rawg.io/api';

// Bazı oyunlar SteamSpy'da farklı isimle geçiyor, RAWG'da bulabilmek için düzelt
const NAME_FIXES = {
  'Counter-Strike 2':           'Counter-Strike 2',
  'PUBG: BATTLEGROUNDS':        'PLAYERUNKNOWN\'S BATTLEGROUNDS',
  'Apex Legends™':              'Apex Legends',
  'Tom Clancy\'s Rainbow Six® Siege': 'Tom Clancy\'s Rainbow Six Siege',
  'Baldur\'s Gate 3':           'Baldur\'s Gate 3',
  'Grand Theft Auto V':         'Grand Theft Auto V',
  'Cyberpunk 2077':             'Cyberpunk 2077',
  'Elden Ring':                 'Elden Ring',
  'Dead by Daylight':           'Dead by Daylight',
  'Warframe':                   'Warframe',
  'Team Fortress 2':            'Team Fortress 2',
  'Rust':                       'Rust',
  'Valheim':                    'Valheim',
  'Lethal Company':             'Lethal Company',
  'Palworld':                   'Palworld',
};

// Bilinen ücretsiz oyunlar
const FREE_SLUGS = new Set([
  'apex-legends', 'warframe', 'dota-2', 'team-fortress-2',
  'path-of-exile', 'destiny-2', 'war-thunder', 'world-of-tanks',
  'enlisted', 'lost-ark', 'genshin-impact',
]);

async function searchRawg(name) {
  const fixedName = NAME_FIXES[name] || name;
  const url = `${BASE}/games?key=${RAWG_KEY}&search=${encodeURIComponent(fixedName)}&page_size=3&search_precise=true`;
  const res = await fetch(url, { next: { revalidate: 21600 } });
  if (!res.ok) return null;
  const data = await res.json();

  // İsim benzerliği kontrol et — yanlış eşleşmeleri önle
  const results = data.results || [];
  const nameNorm = fixedName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Önce tam eşleşme dene
  let match = results.find(g => {
    const gn = g.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return gn === nameNorm;
  });

  // Yoksa başlayan eşleşme
  if (!match) {
    match = results.find(g => {
      const gn = g.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return gn.startsWith(nameNorm.slice(0, 8)) || nameNorm.startsWith(gn.slice(0, 8));
    });
  }

  // Yoksa ilk sonuç
  if (!match) match = results[0];

  if (!match || !match.background_image) return null;
  return match;
}

function formatGame(rawgGame, steamspyGame) {
  const steamStore = rawgGame.stores?.find(s => s.store?.slug === 'steam');
  const epicStore  = rawgGame.stores?.find(s => s.store?.slug === 'epic-games');
  const hasSteam   = !!steamStore || !!steamspyGame?.appid;
  const hasEpic    = !!epicStore;
  const isFree     = FREE_SLUGS.has(rawgGame.slug)
    || !!rawgGame.tags?.some(t => t.slug === 'free-to-play');

  return {
    id:            'rawg_' + rawgGame.id,
    rawgId:        rawgGame.id,
    rawgSlug:      rawgGame.slug,
    name:          rawgGame.name,
    image:         rawgGame.background_image,
    metacritic:    rawgGame.metacritic || null,
    reviewScore:   rawgGame.rating ? Math.round(rawgGame.rating * 20) : 0,
    totalReviews:  rawgGame.ratings_count || 0,
    isFree,
    onSale:        false,
    price:         null,
    noData:        true,
    platforms:     ['pc'],
    hasSteam,
    hasEpic,
    hasStores:     true,
    hasMultipleStores: hasSteam && hasEpic,
    genres:        (rawgGame.genres || []).map(g => g.name).slice(0, 3),
    released:      rawgGame.released || null,
    // Trend verisi
    players2weeks: steamspyGame?.players_2weeks || 0,
    ccu:           steamspyGame?.ccu || 0,
    trendSource:   'steamspy',
  };
}

const STREAMER_GAME_IDS = [
  617010, // Chained Together
  983289, // Bodycam
  968329, // Lethal Company
  427930, // Phasmophobia
  977316, // Balatro
  979524, // Content Warning
  974482, // Buckshot Roulette
  977230, // Supermarket Simulator
  496652, // Manor Lords
  906504, // Nine Sols
  976564, // Helldivers 2
  718135, // Palworld
  356714, // Among Us
  326243, // Elden Ring
  3498,   // Grand Theft Auto V
  22509,  // Minecraft
  28131,  // Fortnite
  415171, // Valorant
  965470  // Counter-Strike 2
];

const CUSTOM_MECCHA_CHAMELEON = {
  id:            'rawg_4704690',
  rawgId:        4704690,
  rawgSlug:      'meccha-chameleon',
  name:          'Meccha Chameleon',
  image:         'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4704690/163e2a742e5fb8e1f5d1e3a890da98f04ab809d4/header.jpg?t=1781108224',
  metacritic:    null,
  reviewScore:   92,
  totalReviews:  1050,
  isFree:        false,
  onSale:        false,
  price:         null,
  noData:        true,
  platforms:     ['pc'],
  hasSteam:      true,
  hasEpic:       false,
  hasStores:     true,
  hasMultipleStores: false,
  genres:        ['Gizlilik', 'Parti', 'Aksiyon'],
  released:      '2026-06-10',
  players2weeks: 0,
  ccu:           0,
  trendSource:   'custom-viral',
};

export async function GET() {
  try {
    if (!RAWG_KEY) throw new Error('RAWG_API_KEY eksik');

    const idsStr = STREAMER_GAME_IDS.join(',');
    const url = `${BASE}/games?key=${RAWG_KEY}&ids=${idsStr}&page_size=20`;
    const res = await fetch(url, { next: { revalidate: 21600 } });
    if (!res.ok) throw new Error(`RAWG ${res.status}`);
    const data = await res.json();

    let results = (data.results || []).filter(g => !isAdultContent(g)).map(g => formatGame(g, null));

    // Listeyi biraz çeşitlendirmek/zamanla değiştirmek için her 3 saatte bir kaydıralım (rotate)
    const hoursSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60));
    const seed = Math.floor(hoursSinceEpoch / 3);
    const offset = (seed * 3) % results.length;
    results = [...results.slice(offset), ...results.slice(0, offset)];

    // Meccha Chameleon'u en başa (her zaman görünür) ekleyelim ve listeyi 16 adetle sınırlandıralım
    results = [CUSTOM_MECCHA_CHAMELEON, ...results.slice(0, 15)];

    return NextResponse.json({
      results,
      total:  results.length,
      source: 'curated-streamers',
      label:  'Yayıncıların Gözdesi',
    });

  } catch (err) {
    console.warn('Trending fetch error, fallback to general popular:', err.message);
    try {
      const today    = new Date().toISOString().slice(0, 10);
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

      const res  = await fetch(
        `${BASE}/games?key=${RAWG_KEY}&ordering=-added&dates=${monthAgo},${today}&metacritic=70,100&page_size=16`,
        { next: { revalidate: 3600 } }
      );
      const data = await res.json();

      const results = (data.results || []).filter(g => !isAdultContent(g)).map(g => ({
        id:           'rawg_' + g.id,
        rawgId:       g.id,
        rawgSlug:     g.slug,
        name:         g.name,
        image:        g.background_image,
        metacritic:   g.metacritic || null,
        reviewScore:  g.rating ? Math.round(g.rating * 20) : 0,
        totalReviews: g.ratings_count || 0,
        isFree:       false,
        onSale:       false,
        price:        null,
        noData:       true,
        platforms:    ['pc'],
        hasSteam:     true,
        hasEpic:      false,
        hasStores:    true,
        genres:       (g.genres || []).map(x => x.name).slice(0, 3),
        released:     g.released || null,
        trendSource:  'rawg-fallback',
      }));

      return NextResponse.json({ results, total: results.length, source: 'rawg-fallback' });
    } catch (e2) {
      return NextResponse.json({ results: [], error: e2.message }, { status: 500 });
    }
  }
}
