import { NextResponse } from 'next/server';
import { isAdultContent, isAdultTitleOrSlug } from '../../lib/adult-filter.js';
import { FALLBACK_GAMES } from '../../lib/fallback-games.js';
import { getUsdToTry } from '../../lib/exchange.js';

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

function cleanNameForMatch(name) {
  const trMap = {
    '\u00e7': 'c', '\u011f': 'g', '\u0131': 'i', 'i': 'i', '\u00f6': 'o', '\u015f': 's', '\u00fc': 'u',
    '\u00c7': 'c', '\u011e': 'g', 'I': 'i', '\u0130': 'i', '\u00d6': 'o', '\u015e': 's', '\u00dc': 'u'
  };
  if (!name) return '';
  return name.replace(/[\u00e7\u011f\u0131i\u00f6\u015f\u00fc\u00c7\u011eI\u0130\u00d6\u015e\u00dc]/g, m => trMap[m]).toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function searchRawg(name) {
  const fixedName = NAME_FIXES[name] || name;
  const url = `${BASE}/games?key=${RAWG_KEY}&search=${encodeURIComponent(fixedName)}&page_size=3&search_precise=true`;
  const res = await fetch(url, { next: { revalidate: 21600 } });
  if (!res.ok) return null;
  const data = await res.json();

  // İsim benzerliği kontrol et — yanlış eşleşmeleri önle
  const results = data.results || [];
  const nameNorm = cleanNameForMatch(fixedName);

  // Önce tam eşleşme dene
  let match = results.find(g => {
    const gn = cleanNameForMatch(g.name);
    return gn === nameNorm;
  });

  // Yoksa başlayan eşleşme
  if (!match) {
    match = results.find(g => {
      const gn = cleanNameForMatch(g.name);
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
  onSale:        true,
  price:         149,
  original:      298,
  discount:      50,
  noData:        false,
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

const STATIC_FALLBACK_GAMES = [
  {
    id:            'rawg_326243',
    rawgId:        326243,
    rawgSlug:      'elden-ring',
    name:          'Elden Ring',
    image:         'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg',
    metacritic:    96,
    reviewScore:   95,
    totalReviews:  85200,
    isFree:        false,
    onSale:        false,
    price:         null,
    noData:        true,
    platforms:     ['pc'],
    hasSteam:      true,
    hasEpic:       false,
    hasStores:     true,
    genres:        ['Aksiyon', 'RPG'],
    released:      '2022-02-25',
    trendSource:   'static-fallback',
  },
  {
    id:            'rawg_3498',
    rawgId:        3498,
    rawgSlug:      'grand-theft-auto-v',
    name:          'Grand Theft Auto V',
    image:         'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/271590/header.jpg',
    metacritic:    96,
    reviewScore:   92,
    totalReviews:  124300,
    isFree:        false,
    onSale:        false,
    price:         null,
    noData:        true,
    platforms:     ['pc'],
    hasSteam:      true,
    hasEpic:       true,
    hasStores:     true,
    genres:        ['Aksiyon', 'Macera'],
    released:      '2013-09-17',
    trendSource:   'static-fallback',
  },
  {
    id:            'rawg_41494',
    rawgId:        41494,
    rawgSlug:      'cyberpunk-2077',
    name:          'Cyberpunk 2077',
    image:         'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg',
    metacritic:    86,
    reviewScore:   80,
    totalReviews:  45600,
    isFree:        false,
    onSale:        false,
    price:         null,
    noData:        true,
    platforms:     ['pc'],
    hasSteam:      true,
    hasEpic:       true,
    hasStores:     true,
    genres:        ['RPG', 'Aksiyon'],
    released:      '2020-12-10',
    trendSource:   'static-fallback',
  },
  {
    id:            'rawg_968329',
    rawgId:        968329,
    rawgSlug:      'lethal-company',
    name:          'Lethal Company',
    image:         'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1966720/header.jpg',
    metacritic:    null,
    reviewScore:   97,
    totalReviews:  24500,
    isFree:        false,
    onSale:        false,
    price:         null,
    noData:        true,
    platforms:     ['pc'],
    hasSteam:      true,
    hasEpic:       false,
    hasStores:     true,
    genres:        ['Bağımsız', 'Aksiyon'],
    released:      '2023-10-23',
    trendSource:   'static-fallback',
  },
  {
    id:            'rawg_718135',
    rawgId:        718135,
    rawgSlug:      'palworld',
    name:          'Palworld',
    image:         'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1623730/header.jpg',
    metacritic:    70,
    reviewScore:   90,
    totalReviews:  43200,
    isFree:        false,
    onSale:        false,
    price:         null,
    noData:        true,
    platforms:     ['pc'],
    hasSteam:      true,
    hasEpic:       false,
    hasStores:     true,
    genres:        ['Aksiyon', 'RPG', 'Bağımsız'],
    released:      '2024-01-19',
    trendSource:   'static-fallback',
  },
  {
    id:            'rawg_977316',
    rawgId:        977316,
    rawgSlug:      'balatro',
    name:          'Balatro',
    image:         'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2379780/header.jpg',
    metacritic:    90,
    reviewScore:   96,
    totalReviews:  8700,
    isFree:        false,
    onSale:        false,
    price:         null,
    noData:        true,
    platforms:     ['pc'],
    hasSteam:      true,
    hasEpic:       false,
    hasStores:     true,
    genres:        ['Bağımsız', 'Klasik'],
    released:      '2024-02-20',
    trendSource:   'static-fallback',
  },
  {
    id:            'rawg_976564',
    rawgId:        976564,
    rawgSlug:      'helldivers-2',
    name:          'Helldivers 2',
    image:         'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/553850/header.jpg',
    metacritic:    82,
    reviewScore:   88,
    totalReviews:  65400,
    isFree:        false,
    onSale:        false,
    price:         null,
    noData:        true,
    platforms:     ['pc'],
    hasSteam:      true,
    hasEpic:       false,
    hasStores:     true,
    genres:        ['Aksiyon', 'Nişancı'],
    released:      '2024-02-08',
    trendSource:   'static-fallback',
  },
  {
    id:            'rawg_496652',
    rawgId:        496652,
    rawgSlug:      'manor-lords',
    name:          'Manor Lords',
    image:         'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1363080/header.jpg',
    metacritic:    null,
    reviewScore:   88,
    totalReviews:  19200,
    isFree:        false,
    onSale:        false,
    price:         null,
    noData:        true,
    platforms:     ['pc'],
    hasSteam:      true,
    hasEpic:       false,
    hasStores:     true,
    genres:        ['Strateji', 'Simülasyon'],
    released:      '2024-04-26',
    trendSource:   'static-fallback',
  },
  {
    id:            'rawg_427930',
    rawgId:        427930,
    rawgSlug:      'phasmophobia',
    name:          'Phasmophobia',
    image:         'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/739630/header.jpg',
    metacritic:    null,
    reviewScore:   96,
    totalReviews:  41500,
    isFree:        false,
    onSale:        false,
    price:         null,
    noData:        true,
    platforms:     ['pc'],
    hasSteam:      true,
    hasEpic:       false,
    hasStores:     true,
    genres:        ['Aksiyon', 'Korku', 'Bağımsız'],
    released:      '2020-09-18',
    trendSource:   'static-fallback',
  },
  {
    id:            'rawg_4970',
    rawgId:        4970,
    rawgSlug:      'baldurs-gate-3',
    name:          "Baldur's Gate 3",
    image:         'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/header.jpg',
    metacritic:    96,
    reviewScore:   96,
    totalReviews:  56200,
    isFree:        false,
    onSale:        false,
    price:         null,
    noData:        true,
    platforms:     ['pc'],
    hasSteam:      true,
    hasEpic:       false,
    hasStores:     true,
    genres:        ['RPG', 'Strateji'],
    released:      '2023-08-03',
    trendSource:   'static-fallback',
  },
  {
    id:            'rawg_965470',
    rawgId:        965470,
    rawgSlug:      'counter-strike-2',
    name:          'Counter-Strike 2',
    image:         'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/730/header.jpg',
    metacritic:    null,
    reviewScore:   88,
    totalReviews:  764300,
    isFree:        true,
    onSale:        false,
    price:         null,
    noData:        true,
    platforms:     ['pc'],
    hasSteam:      true,
    hasEpic:       false,
    hasStores:     true,
    genres:        ['Aksiyon', 'Nişancı'],
    released:      '2023-09-27',
    trendSource:   'static-fallback',
  }
];

function generateSlug(text) {
  const trMap = {
    '\u00e7': 'c', '\u011f': 'g', '\u0131': 'i', 'i': 'i', '\u00f6': 'o', '\u015f': 's', '\u00fc': 'u',
    '\u00c7': 'c', '\u011e': 'g', 'I': 'i', '\u0130': 'i', '\u00d6': 'o', '\u015e': 's', '\u00dc': 'u'
  };
  let slug = text.replace(/[\u00e7\u011f\u0131i\u00f6\u015f\u00fc\u00c7\u011eI\u0130\u00d6\u015e\u00dc]/g, m => trMap[m]).toLowerCase();
  return slug.replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}

async function fetchSteamSpecials() {
  try {
    const rate = await getUsdToTry();
    const res = await fetch('https://store.steampowered.com/api/featuredcategories/?cc=tr&l=tr', { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.specials?.items || [];

    // Filtrelenmiş adult öğeleri
    const cleanItems = items.filter(item => !isAdultTitleOrSlug(item.name, item.name));

    // Tekilleştirme: Aynı oyunun farklı edisyonlarını ve mükerrer paketlerini filtrele
    const seenNames = new Set();
    const uniqueItems = [];

    function normalizeForDedupe(name) {
      return name.toLowerCase()
        .replace(/[:\-–]/g, ' ')
        .replace(/\b(premium|edition|deluxe|goty|complete|enhanced|bundle|pack|remastered|remaster|standard|ultimate|gold|director's cut|directors cut)\b/gi, '')
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '');
    }

    for (const item of cleanItems) {
      const norm = normalizeForDedupe(item.name);
      if (seenNames.has(norm)) continue;
      seenNames.add(norm);
      uniqueItems.push(item);
    }

    return uniqueItems.map(item => {
      const slug = generateSlug(item.name);
      const isFree = item.final_price === 0 || (!item.final_price && !item.original_price);

      const priceUSD = item.final_price ? item.final_price / 100 : null;
      const originalUSD = item.original_price ? item.original_price / 100 : null;

      const price = priceUSD ? Math.round(priceUSD * rate) : null;
      const original = originalUSD ? Math.round(originalUSD * rate) : null;

      const g = {
        id:           'rawg_' + item.id,
        rawgId:       item.id,
        rawgSlug:     slug,
        name:         item.name,
        image:        item.header_image || item.large_capsule_image || item.small_capsule_image,
        metacritic:   null,
        reviewScore:  0,
        totalReviews: 0,
        isFree,
        onSale:       item.discounted || false,
        price,
        original,
        discount:     item.discount_percent || 0,
        noData:       false,
        platforms:    ['pc'],
        source:       'steam',
        hasSteam:     true,
        hasEpic:      false,
        hasStores:    true,
        hasMultipleStores: false,
        epicUrl:      null,
        steamUrl:     `https://store.steampowered.com/app/${item.id}`,
        genres:       [],
        released:     new Date().toISOString().slice(0, 10),
      };

      // Fallback_games ile eşleştirip detayları (tür, metacritic vb.) doldur
      const dbMatch = FALLBACK_GAMES.find(dg => dg.rawgId === item.id);
      if (dbMatch) {
        g.genres = dbMatch.genres || [];
        g.metacritic = dbMatch.metacritic || null;
        g.reviewScore = dbMatch.reviewScore || 0;
        g.totalReviews = dbMatch.totalReviews || 0;
      }
      return g;
    });
  } catch (err) {
    console.error(`Failed to fetch Steam specials:`, err);
    return [];
  }
}

export async function GET() {
  try {
    let results = await fetchSteamSpecials();

    if (results.length > 0) {
      // Listeyi her 6 saatte bir kaydırarak güncelliğini koruyalım (6-hour rotation)
      const hoursSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60));
      const seed = Math.floor(hoursSinceEpoch / 6);
      const offset = (seed * 3) % results.length;
      results = [...results.slice(offset), ...results.slice(0, offset)];
    }

    // Meccha Chameleon'u en başa ekleyelim ve listeyi 6 adetle sınırlayalım
    results = [CUSTOM_MECCHA_CHAMELEON, ...results.filter(g => g.rawgSlug !== 'meccha-chameleon').slice(0, 5)];

    return NextResponse.json({
      results,
      total:  results.length,
      source: 'steam-specials',
      label:  'İndirim Fırsatları',
    });

  } catch (err) {
    console.warn('Trending fetch error, fallback to static popular list:', err.message);
    const results = [CUSTOM_MECCHA_CHAMELEON, ...STATIC_FALLBACK_GAMES.slice(0, 5)];
    return NextResponse.json({
      results,
      total:  results.length,
      source: 'static-fallback',
      label:  'İndirim Fırsatları',
    });
  }
}
