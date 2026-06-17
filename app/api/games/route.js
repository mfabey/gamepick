import { NextResponse } from 'next/server';
import { getSteamAppIdBySlug, fetchLowestPriceFromITAD, fetchPriceByAppId } from '../card-price/route.js';
import { isAdultContent, isAdultTitleOrSlug } from '../../lib/adult-filter.js';

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
  'nişancı':    'shooter',
  'nisanci':    'shooter',
  'arcade':     'arcade',
};

// Türkçe etiket → RAWG tag slug
const TR_TAG = {
  // Oynanış özellikleri
  'açık dünya':      'open-world',
  'acik dunya':      'open-world',
  'açık-dünya':      'open-world',
  'açıkdünya':       'open-world',
  'çok oyunculu':    'multiplayer',
  'cok oyunculu':    'multiplayer',
  'co-op':           'co-op',
  'işbirliği':       'co-op',
  'isbirligi':       'co-op',
  'sandbox':         'sandbox',
  'kum havuzu':      'sandbox',
  'roguelike':       'roguelike',
  'rogue':           'roguelike',
  'hayatta kalma':   'survival',
  'hayatta-kalma':   'survival',
  'hayatta kal':     'survival',
  'ücretsiz':        'free-to-play',
  'ucretsiz':        'free-to-play',
  'hikaye':          'story-rich',
  'hikaye-odaklı':   'story-rich',
  'atmosferik':      'atmospheric',
  'indie':           'indie',
  'bağımsız':        'indie',
  'soulslike':       'souls-like',
  'souls':           'souls-like',
  'soulsborne':      'souls-like',
  'yapım':           'building',
  'yapim':           'building',
  'inşa':            'building',
  'kart':            'card-game',
  'kart oyunu':      'card-game',
  'masa oyunu':      'board-games',
  'masa':            'board-games',
  'gizlilik':        'stealth',
  'gizli':           'stealth',
  'stealth':         'stealth',
  'keşif':           'exploration',
  'kesif':           'exploration',
  'crafting':        'crafting',
  'üretim':          'crafting',
  'uretim':          'crafting',
  'retro':           'retro',
  'piksel':          'pixel-graphics',
  'pixel':           'pixel-graphics',
  'anime':           'anime',
  'çizgi roman':     'comic-book',
  'cizgi roman':     'comic-book',
  'çizgi-roman':     'comic-book',

  // Tarihsel dönem & kültür
  'kovboy':          'western',
  'western':         'western',
  'batı':            'western',
  'vahşi batı':      'western',
  'vahsi bati':      'western',
  'ortaçağ':         'medieval',
  'ortacag':         'medieval',
  'orta çağ':        'medieval',
  'orta cag':        'medieval',
  'şövalye':         'knights',
  'sovalye':         'knights',
  'viking':          'vikings',
  'vikingler':       'vikings',
  'samuray':         'samurai',
  'ninja':           'ninja',
  'korsan':          'pirates',
  'korsan gemisi':   'pirates',
  'piratlık':        'pirates',
  'deniz korsanı':   'pirates',
  'antik':           'historical',
  'roma':            'historical',
  'antik yunan':     'historical',
  'mısır':           'historical',
  'ikinci dünya savaşı': 'world-war-ii',
  'ww2':             'world-war-ii',
  '2. dünya savaşı': 'world-war-ii',
  'birinci dünya savaşı': 'world-war-ii',
  'ww1':             'world-war-ii',
  'savaş':           'war',
  'savas':           'war',
  'tarih':           'historical',
  'tarihi':          'historical',
  'japon':           'japan',
  'japonya':         'japan',
  'japonca':         'japan',

  // Tema
  'zombi':           'zombies',
  'zombie':          'zombies',
  'korku':           'horror',
  'uzay':            'space',
  'uzay gemisi':     'space',
  'fantezi':         'fantasy',
  'fantasy':         'fantasy',
  'bilim kurgu':     'sci-fi',
  'bilim-kurgu':     'sci-fi',
  'siberpunk':       'cyberpunk',
  'cyberpunk':       'cyberpunk',
  'steampunk':       'steampunk',
  'distopya':        'dystopian',
  'apokaliptik':     'post-apocalyptic',
  'kıyamet sonrası': 'post-apocalyptic',
  'kiyamet':         'post-apocalyptic',
  'vampir':          'vampires',
  'ejderha':         'dragons',
  'dragon':          'dragons',
  'büyü':            'magic',
  'buyu':            'magic',
  'cadı':            'witchcraft',
  'cadi':            'witchcraft',
  'suç':             'crime',
  'suc':             'crime',
  'gangster':        'crime',
  'dedektif':        'detective',
  'polisiye':        'detective',
  'gizem':           'mystery',
  'gizemli':         'mystery',
  'gerilim':         'thriller',
  'mitoloji':        'mythology',
  'vahşi doğa':      'nature',
  'vahsi doga':      'nature',
  'hayvan':          'animals',
  'at':              'horses',
  'at binme':        'horses',
  'deniz':           'sailing',
  'okyanus':         'sailing',
  'uzay keşfi':      'space',
};

// Arama sorgusunu Türkçe tür/etiket filtrelerine dönüştür
function trFilter(q) {
  // "kovboy oyunu", "korku oyunları" → "kovboy", "korku" şeklinde temizle
  const cleaned = q.toLowerCase().trim()
    .replace(/\s+(oyunlar[ıiuü]?|oyunu?|game[s]?)\s*$/i, '')
    .trim();

  // Tam cümle eşleşmesi
  if (TR_GENRE[cleaned]) return { genres: TR_GENRE[cleaned], ordering: '-rating' };
  if (TR_TAG[cleaned])   return { tags:   TR_TAG[cleaned],   ordering: '-added'  };

  // Kelime kelime dene — "ortaçağ savaş" → önce "ortaçağ" dene
  const words = cleaned.split(/\s+/);
  for (const word of words) {
    if (word.length < 3) continue;
    if (TR_GENRE[word]) return { genres: TR_GENRE[word], ordering: '-rating' };
    if (TR_TAG[word])   return { tags:   TR_TAG[word],   ordering: '-added'  };
  }

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

const STATIC_FREE_GAMES = [
  { id: 'rawg_730', rawgId: 730, rawgSlug: 'counter-strike-2', name: 'Counter-Strike 2', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/730/header.jpg', metacritic: null, reviewScore: 88, totalReviews: 76400, isFree: true, onSale: false, price: null, noData: false, platforms: ['pc'], source: 'steam', hasSteam: true, hasEpic: false, hasStores: true, genres: ['Aksiyon', 'Nişancı'], released: '2023-09-27' },
  { id: 'rawg_570', rawgId: 570, rawgSlug: 'dota-2', name: 'Dota 2', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/570/header.jpg', metacritic: 90, reviewScore: 82, totalReviews: 32000, isFree: true, onSale: false, price: null, noData: false, platforms: ['pc'], source: 'steam', hasSteam: true, hasEpic: false, hasStores: true, genres: ['Strateji'], released: '2013-07-09' },
  { id: 'rawg_1172470', rawgId: 1172470, rawgSlug: 'apex-legends', name: 'Apex Legends', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1172470/header.jpg', metacritic: 88, reviewScore: 80, totalReviews: 24500, isFree: true, onSale: false, price: null, noData: false, platforms: ['pc'], source: 'steam', hasSteam: true, hasEpic: false, hasStores: true, genres: ['Aksiyon', 'Nişancı'], released: '2020-11-04' },
  { id: 'rawg_578080', rawgId: 578080, rawgSlug: 'pubg-battlegrounds', name: 'PUBG: BATTLEGROUNDS', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/578080/header.jpg', metacritic: 86, reviewScore: 57, totalReviews: 124000, isFree: true, onSale: false, price: null, noData: false, platforms: ['pc'], source: 'steam', hasSteam: true, hasEpic: false, hasStores: true, genres: ['Aksiyon', 'Nişancı'], released: '2017-12-21' },
  { id: 'rawg_230410', rawgId: 230410, rawgSlug: 'warframe', name: 'Warframe', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/230410/header.jpg', metacritic: 69, reviewScore: 87, totalReviews: 18400, isFree: true, onSale: false, price: null, noData: false, platforms: ['pc'], source: 'steam', hasSteam: true, hasEpic: false, hasStores: true, genres: ['Aksiyon', 'RPG'], released: '2013-03-25' },
  { id: 'rawg_440', rawgId: 440, rawgSlug: 'team-fortress-2', name: 'Team Fortress 2', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/440/header.jpg', metacritic: 92, reviewScore: 93, totalReviews: 14500, isFree: true, onSale: false, price: null, noData: false, platforms: ['pc'], source: 'steam', hasSteam: true, hasEpic: false, hasStores: true, genres: ['Aksiyon', 'Nişancı'], released: '2007-10-10' },
  { id: 'rawg_1085660', rawgId: 1085660, rawgSlug: 'destiny-2', name: 'Destiny 2', image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1085660/header.jpg', metacritic: 83, reviewScore: 82, totalReviews: 29500, isFree: true, onSale: false, price: null, noData: false, platforms: ['pc'], source: 'steam', hasSteam: true, hasEpic: false, hasStores: true, genres: ['Aksiyon', 'Nişancı'], released: '2019-10-01' }
];

async function fetchSteamFeatured(category) {
  try {
    const res = await fetch('https://store.steampowered.com/api/featuredcategories/?cc=tr&l=tr', { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data[category]?.items || [];

    // Filtrelenmiş adult öğeleri
    const cleanItems = items.filter(item => !isAdultTitleOrSlug(item.name, item.name));

    return cleanItems.map(item => {
      const slug = item.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      
      const isFree = item.final_price === 0 || (!item.final_price && !item.original_price);

      return {
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
        price:        item.final_price ? item.final_price / 100 : null,
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
    });
  } catch (err) {
    console.error(`Failed to fetch Steam featured ${category}:`, err);
    return [];
  }
}

async function fetchSteamNewReleases() {
  try {
    const res = await fetch('https://store.steampowered.com/api/featuredcategories/', { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    const newReleases = data.new_releases?.items || [];

    // DLC'leri, Expansion'ları, Soundtrack'leri filtrelemek için paralel appdetails kontrolü
    const detailedItems = await Promise.all(
      newReleases.map(async (item) => {
        try {
          const detailRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${item.id}&cc=tr&filters=basic`, { next: { revalidate: 1800 } });
          if (!detailRes.ok) return null;
          const detailData = await detailRes.json();
          const entry = detailData[item.id];
          if (entry && entry.success && entry.data?.type === 'game') {
            return item;
          }
          return null;
        } catch {
          return null;
        }
      })
    );

    const gamesOnly = detailedItems.filter(Boolean).filter(item => !isAdultTitleOrSlug(item.name, item.name));

    return gamesOnly.map(item => {
      const slug = item.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      
      const isFree = item.final_price === 0 && !item.original_price;

      return {
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
        price:        item.final_price ? item.final_price / 100 : null,
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
    });
  } catch (err) {
    console.error("Failed to fetch Steam new releases:", err);
    return [];
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get('section') || '';
  const q       = searchParams.get('q')       || '';
  const genres  = searchParams.get('genres')  || '';
  const page    = parseInt(searchParams.get('page') || '1');
  const num     = parseInt(searchParams.get('num')  || '24');
  const rotate  = searchParams.get('rotate')  === 'true';

  if (!RAWG_KEY) {
    return NextResponse.json({ error: 'RAWG_API_KEY eksik', results: [] }, { status: 500 });
  }

  try {
    // Kategori aramalarında filtrelemeden sonra yeterli sayıda oyun kalması için RAWG'dan daha fazla oyun çekelim
    const fetchNum = section === 'sale' ? 60 : (section && section !== '') ? 40 : num;
    const base = { platforms: 4, page, page_size: fetchNum, exclude_additions: true };
    let params = { ...base };

    const trimmedQ = q.trim();
    if (trimmedQ) {
      // Önce Türkçe tür/etiket eşlemesi dene
      const mapped = trFilter(trimmedQ);
      if (mapped) {
        params = { ...params, ...mapped };
      } else {
        params.search = trimmedQ;
      }
    } else {
      // Kategori/Tür filtresi
      if (genres) {
        if (genres === 'horror') {
          params.tags = 'horror';
        } else if (genres === 'card') {
          params.genres = 'card,board-games';
        } else {
          params.genres = genres;
        }
      }

      // Bölüm filtresi
      if (section === 'new') {
        const today = new Date().toISOString().slice(0, 10);
        params.ordering = '-released';
        params.dates = '2023-01-01,' + today;
      } else if (section === 'topscore') {
        params.ordering = '-metacritic';
        params.metacritic = '70,100';
      } else if (section === 'popular') {
        params.ordering = '-rating';
        params.metacritic = '60,100';
      } else if (section === 'free') {
        if (params.tags) {
          params.tags = params.tags + ',free-to-play';
        } else {
          params.tags = 'free-to-play';
        }
        if (!params.ordering) {
          params.ordering = '-added';
        }
      } else if (section === 'sale') {
        if (!params.ordering) {
          params.ordering = '-added';
        }
        params.metacritic = '70,100';
      } else {
        if (!params.ordering) {
          params.ordering = '-added';
        }
      }

      // Eğer sadece genres seçiliyse ve section yoksa, varsayılan sıralama/metacritic ekleyelim
      if (genres && !section) {
        params.ordering = '-rating';
        params.metacritic = '60,100';
      }
    }

    let results = [];
    let total = 0;

    try {
      if (section === 'new') {
        if (page === 1) {
          // Yeni Çıkanlar için hem RAWG hem de Steam'den paralel çek
          const [rawgData, steamResults] = await Promise.all([
            fetchRawg('/games', params).catch(() => ({ results: [], count: 0 })),
            fetchSteamNewReleases()
          ]);

          const rawgResults = (rawgData.results || []).filter(g => !isAdultContent(g)).map(formatRawgGame);
          total = (rawgData.count || 0) + steamResults.length;

          // Temizleme: hasStores olanları ve silinenleri filtrele
          const filteredRawg = rawgResults.filter(g => g.hasStores && !KNOWN_DELISTED_SLUGS.has(g.rawgSlug));

          // Tekilleştirme: Hem Steam AppId hem de isim bazlı kontrol et
          const seenAppIds = new Set(steamResults.map(g => g.rawgId));
          const seenNames = new Set(steamResults.map(g => g.name.toLowerCase().replace(/[^a-z0-9]/g, '')));

          const uniqueRawg = filteredRawg.filter(g => {
            const cleanName = g.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const hasMatch = (g.steamAppId && seenAppIds.has(Number(g.steamAppId))) || seenNames.has(cleanName);
            return !hasMatch;
          });

          // Steam en yeni çıkanlar en üstte olacak şekilde birleştir
          results = [...steamResults, ...uniqueRawg];
        } else {
          // page > 1 ise sadece RAWG
          const data = await fetchRawg('/games', params);
          total = data.count || 0;
          const rawgResults = (data.results || []).filter(g => !isAdultContent(g)).map(formatRawgGame);
          results = rawgResults.filter(g => g.hasStores && !KNOWN_DELISTED_SLUGS.has(g.rawgSlug));
        }
      } else {
        // Diğer tüm bölümler/aramalar için normal RAWG
        const data = await fetchRawg('/games', params);
        total = data.count || 0;
        results = (data.results || []).filter(g => !isAdultContent(g)).map(formatRawgGame);
        results = results.filter(g => g.hasStores && !KNOWN_DELISTED_SLUGS.has(g.rawgSlug));
      }
    } catch (err) {
      console.warn('RAWG API fetch failed, proceeding to fallback:', err.message);
    }

    // Fallback logic for sections when RAWG is limited or returns no results
    if (results.length === 0) {
      if (section === 'sale') {
        console.log('Falling back to Steam specials...');
        results = await fetchSteamFeatured('specials');
        total = results.length;
      } else if (section === 'popular' || section === 'topscore') {
        console.log('Falling back to Steam top sellers...');
        results = await fetchSteamFeatured('top_sellers');
        total = results.length;
      } else if (section === 'free') {
        console.log('Falling back to static free games...');
        results = STATIC_FREE_GAMES.filter(g => !isAdultTitleOrSlug(g.name, g.rawgSlug));
        total = results.length;
      }
    }

    // İndirim köşesinde (sale) ücretsiz oyunları kaldır, ayrıca gerçek indirim kontrolü yap
    if (section === 'sale' && results.length > 0 && results[0]?.source !== 'steam') {
      results = results.filter(g => !g.isFree);
      
      const saleCheckedResults = await Promise.all(
        results.map(async (g) => {
          try {
            const appid = await getSteamAppIdBySlug(g.rawgSlug);
            // ITAD veya Steam üzerinden en ucuz teklifi bul (kartta gösterilen isme göre)
            let priceInfo = await fetchLowestPriceFromITAD(appid, g.name);
            if (!priceInfo && appid) {
              priceInfo = await fetchPriceByAppId(appid);
            }
            
            // Eğer en ucuz teklif indirimdeyse (discount > 0) ve ücretsiz değilse tut
            if (priceInfo && priceInfo.discount > 0 && priceInfo.price > 0) {
              return g;
            }
            return null;
          } catch {
            return null;
          }
        })
      );
      
      results = saleCheckedResults.filter(Boolean);
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

    return NextResponse.json({ results, total, source: 'rawg-steam-merge' });

  } catch (err) {
    console.error('RAWG/Steam API hatasi:', err.message);
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
