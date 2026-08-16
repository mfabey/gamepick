import { NextResponse } from 'next/server';
import { getSteamAppIdBySlug, fetchLowestPriceFromITAD, fetchPriceByAppId } from '../card-price/route.js';
import { isAdultContent, isAdultTitleOrSlug, isSteamDataAdult } from '../../lib/adult-filter.js';
import { FALLBACK_GAMES } from '../../lib/fallback-games.js';
import { rawgJson } from '../../lib/rawg-fetch.js';
import { getUsdToTry, amountToTRY } from '../../lib/exchange.js';
import { getSteamDetailsCached } from '../../lib/steam-cache.js';

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

// ─────────────────────────────────────────────────────────────────────────────
// RAWG çağrılarına ZAMAN AŞIMI.
//
// 3 Ağustos 2026'da RAWG çöktü ve Cloudflare üzerinden HTTP 522 vermeye
// başladı. 522 hemen dönmüyor — Cloudflare origin'i ~22 sn bekliyor. Bu rota
// istek başına iki RAWG çağrısı yaptığı için toplam ~42 sn sürüyordu.
//
// Mobil istemci 12 sn'de vazgeçtiği için (client.js apiGet) uygulamada HİÇBİR
// oyun görünmüyordu.
//
// Yedek yol ZATEN VARDI (aşağıda "proceeding to fallback") ama 42 sn'lik
// hatanın arkasında beklediği için pratikte hiç işe yaramıyordu. Kısa zaman
// aşımı onu çalışır hâle getiriyor.
//
// Hata FIRLATILMAYA devam ediyor: mevcut catch blokları ve yedek mantığı
// bunun üzerine kurulu, sessizce boş sonuç dönmek onları atlatırdı.
// ─────────────────────────────────────────────────────────────────────────────
// Zaman aşımı ve devre kesici PAYLAŞILAN kütüphanede (app/lib/rawg-fetch.js).
// Burada yerel bir kopya tutmak, iki ayrı devre kesici demekti: games rotası
// RAWG'ın çöktüğünü öğrenirken card-price ve trending bunu bilmiyordu, her
// biri ayrı ayrı zaman aşımını ödüyordu. Tek modül = tek durum = tek ceza.
async function fetchRawg(path, params = {}) {
  return rawgJson(rawgUrl(path, params), { revalidate: 300 });
}

function generateSlug(text) {
  const trMap = {
    '\u00e7': 'c', '\u011f': 'g', '\u0131': 'i', 'i': 'i', '\u00f6': 'o', '\u015f': 's', '\u00fc': 'u',
    '\u00c7': 'c', '\u011e': 'g', 'I': 'i', '\u0130': 'i', '\u00d6': 'o', '\u015e': 's', '\u00dc': 'u'
  };
  let slug = text.replace(/[\u00e7\u011f\u0131i\u00f6\u015f\u00fc\u00c7\u011eI\u0130\u00d6\u015e\u00dc]/g, m => trMap[m]).toLowerCase();
  return slug.replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}

function isDlc(game) {
  const name = (game.name || '').toLowerCase();
  if (name.includes(' dlc') || name.endsWith(' dlc') || name.includes('expansion pass') || name.includes('season pass') || name.includes(' soundtrack') || name.includes(' add-on') || name.includes(' addon') || name.includes(' upgrade') || name.includes(' deluxe edition upgrade') || name.includes(' artbook')) return true;
  if (name.includes(' sdk') || name.endsWith(' sdk') || name.includes('modding') || name.includes('tool') || name.includes('server') || name.includes('playtest') || name.includes('demo')) return true;
  if (game.tags && game.tags.some(t => t.slug === 'dlc' || t.slug === 'soundtrack')) return true;
  return false;
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

const STEAM_GENRE_MAP = {
  'action': 'Action',
  'role-playing-games-rpg': 'RPG',
  'strategy': 'Strategy',
  'adventure': 'Adventure',
  'sports': 'Sports',
  'racing': 'Racing',
  'simulation': 'Simulation'
};
const STEAM_TAG_MAP = {
  'shooter': '1662',
  'horror': '1667',
  'platformer': '1625',
  'puzzle': '1664',
  'card': '1738'
};

async function fetchSteamSearchPaginated(searchUrl, isFree = false, isOnSale = false, fetchReleaseDates = false) {
  try {
    const res = await fetch(searchUrl, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.items || [];
    
    const detailedItems = await Promise.all(
      items.map(async (item) => {
        const appidMatch = item.logo.match(/\/apps\/(\d+)\//);
        const appid = appidMatch ? parseInt(appidMatch[1]) : null;
        if (!appid) return null;

        let releasedDate = null;
        try {
          const steamData = await getSteamDetailsCached(appid);
          if (steamData) {
            if (isSteamDataAdult(steamData)) {
              return null;
            }
            if (fetchReleaseDates && steamData.release_date?.coming_soon) {
              return null;
            }
            releasedDate = steamData.release_date?.date || null;
          }
        } catch {}

        const slug = generateSlug(item.name);
        const g = {
          id: 'rawg_' + appid,
          rawgId: appid,
          rawgSlug: slug,
          name: item.name,
          image: appid ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg` : item.logo,
          logo: item.logo,
          metacritic: null,
          reviewScore: 0,
          totalReviews: 0,
          isFree,
          onSale: isOnSale,
          price: null,
          noData: false,
          platforms: ['pc'],
          source: 'steam',
          hasSteam: true,
          hasEpic: false,
          hasStores: true,
          genres: [],
          released: releasedDate
        };

        // Cross-reference with our fallback database for rich metadata
        const dbMatch = FALLBACK_GAMES.find(dg => dg.rawgId === appid);
        if (dbMatch) {
          g.genres = dbMatch.genres || [];
          g.metacritic = dbMatch.metacritic || null;
          g.reviewScore = dbMatch.reviewScore || 0;
          g.totalReviews = dbMatch.totalReviews || 0;
          g.isFree = dbMatch.isFree ?? isFree;
        }

        return g;
      })
    );

    const filtered = detailedItems
      .filter(Boolean)
      .filter(g => !isAdultTitleOrSlug(g.name, g.rawgSlug) && !isDlc(g));

    if (fetchReleaseDates) {
      filtered.sort((a, b) => new Date(b.released || 0) - new Date(a.released || 0));
    }

    return filtered;
  } catch (err) {
    console.error("Steam search fallback failed:", err);
    return [];
  }
}

async function fetchSteamFeatured(category) {
  try {
    const rate = await getUsdToTry();
    const res = await fetch('https://store.steampowered.com/api/featuredcategories/?cc=tr&l=tr', { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data[category]?.items || [];

    // Filtrelenmiş adult öğeleri (hızlı kontrol)
    const fastFilteredItems = items.filter(item => !isAdultTitleOrSlug(item.name, item.name));

    // Ayrıntılı kontrol: Steam içerik tanımlayıcılarını sorgula
    const detailedItems = await Promise.all(
      fastFilteredItems.map(async (item) => {
        try {
          const data = await getSteamDetailsCached(item.id);
          if (data && isSteamDataAdult(data)) {
            return null;
          }
        } catch {}
        return item;
      })
    );
    const cleanItems = detailedItems.filter(Boolean);

    return cleanItems.map(item => {
      const slug = generateSlug(item.name);
      
      const isFree = item.final_price === 0 || (!item.final_price && !item.original_price);

      const price = item.final_price != null ? amountToTRY(item.final_price, item.currency || 'USD', rate) : null;
      const original = item.original_price != null ? amountToTRY(item.original_price, item.currency || 'USD', rate) : null;

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
    });
  } catch (err) {
    console.error(`Failed to fetch Steam featured ${category}:`, err);
    return [];
  }
}

async function fetchSteamNewReleases() {
  try {
    const rate = await getUsdToTry();
    const res = await fetch('https://store.steampowered.com/api/featuredcategories/?cc=tr&l=tr', { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    const newReleases = data.new_releases?.items || [];

    // DLC'leri, Expansion'ları, Soundtrack'leri filtrelemek ve çıkış tarihini almak için paralel cached appdetails kontrolü
    const detailedItems = await Promise.all(
      newReleases.map(async (item) => {
        try {
          const data = await getSteamDetailsCached(item.id);
          if (data && data.type === 'game') {
            return {
              item,
              released: data.release_date?.date || null,
              steamData: data
            };
          }
          return null;
        } catch {
          return null;
        }
      })
    );

    const gamesOnly = detailedItems
      .filter(Boolean)
      .filter(d => !isAdultTitleOrSlug(d.item.name, d.item.name) && !isSteamDataAdult(d.steamData));

    return gamesOnly.map(d => {
      const item = d.item;
      const slug = generateSlug(item.name);
      
      const isFree = item.final_price === 0 && !item.original_price;

      const price = item.final_price != null ? amountToTRY(item.final_price, item.currency || 'USD', rate) : null;
      const original = item.original_price != null ? amountToTRY(item.original_price, item.currency || 'USD', rate) : null;

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
        released:     d.released,
      };
    });
  } catch (err) {
    console.error("Failed to fetch Steam new releases:", err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OYUN MODU FİLTRESİ — Steam mağaza kategorileri (otoriter veri)
// RAWG etiketleri oyun modu için güvenilmez (ör. Witcher 3 yanlışlıkla "multiplayer"
// etiketli olabilir). Steam'in category2 değeri ise resmî/doğru veridir.
//   2 = Tek Oyunculu, 1 = Çok Oyunculu, 9 = Co-op
// ─────────────────────────────────────────────────────────────────────────────
const STEAM_MODE_CAT = { singleplayer: 2, multiplayer: 1, coop: 9 };
const STEAM_MODE_GENRE = {
  'action': 'Action', 'role-playing-games-rpg': 'RPG', 'strategy': 'Strategy',
  'adventure': 'Adventure', 'sports': 'Sports', 'racing': 'Racing', 'simulation': 'Simulation',
};

async function fetchSteamByMode(mode, { genres = '', q = '', section = '', page = 1 } = {}) {
  const cat2 = STEAM_MODE_CAT[mode];
  // Steam mağaza araması iç sayfa boyutu olarak 25 kullanır ve `start` değerini 25'in
  // katlarına yuvarlar. Bu yüzden sayfalamayı 25'lik bloklarla yapmalıyız (24 değil),
  // aksi halde her sayfa aynı bloğu döndürür.
  const STEAM_PAGE = 25;
  const offset = (page - 1) * STEAM_PAGE;
  let url = `https://store.steampowered.com/search/results/?category1=998&category2=${cat2}&cc=tr&l=tr&json=1&start=${offset}&count=${STEAM_PAGE}`;

  // Sıralama / bölüm
  if (section === 'new')        url += '&filter=popularnew';
  else if (section === 'sale')  url += '&specials=1';
  else                          url += '&filter=topsellers';

  // Tür
  const sg = STEAM_MODE_GENRE[genres];
  if (sg) url += `&genre=${encodeURIComponent(sg)}`;

  // Arama terimi
  if (q) url += `&term=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return { results: [], total: 0 };
    const data  = await res.json();
    const items = data.items || [];
    // Steam total_count döndürmediğinden tahmini bir toplam: tam dolu sayfa geldiyse
    // paging açık kalsın (sonraki bloğu da varsay), kısa sayfa geldiyse burada bitsin.
    const total = data.total_count || (offset + items.length + (items.length >= STEAM_PAGE ? STEAM_PAGE : 0));

    const initialGames = items.map(item => {
      const appidMatch = (item.logo || '').match(/\/apps\/(\d+)\//);
      const appid = appidMatch ? parseInt(appidMatch[1]) : null;
      const slug  = generateSlug(item.name);
      return {
        id: 'rawg_' + appid, rawgId: appid, rawgSlug: slug, name: item.name,
        image: appid ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg` : item.logo,
        logo: item.logo, metacritic: null, reviewScore: 0, totalReviews: 0,
        isFree: section === 'free', onSale: section === 'sale', price: null, noData: false,
        platforms: ['pc'], source: 'steam', hasSteam: true, hasEpic: false, hasStores: true,
        genres: [], released: null,
      };
    }).filter(g => g.rawgId && !isAdultTitleOrSlug(g.name, g.rawgSlug));

    // Ayrıntılı kontrol: İçerik tanımlayıcılarını doğrula
    const verifiedGames = await Promise.all(
      initialGames.map(async (g) => {
        try {
          const data = await getSteamDetailsCached(g.rawgId);
          if (data && isSteamDataAdult(data)) {
            return null;
          }
        } catch {}
        return g;
      })
    );
    const results = verifiedGames.filter(Boolean);

    // Fallback veritabanından zengin meta veriyi eşle
    results.forEach(g => {
      const dbMatch = FALLBACK_GAMES.find(dg => dg.rawgId === g.rawgId);
      if (dbMatch) {
        g.genres = dbMatch.genres || [];
        g.metacritic = dbMatch.metacritic || null;
        g.reviewScore = dbMatch.reviewScore || 0;
        g.totalReviews = dbMatch.totalReviews || 0;
      }
    });

    return { results, total };
  } catch {
    return { results: [], total: 0 };
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
  const mode    = searchParams.get('mode')    || '';   // singleplayer | multiplayer | coop
  const store   = searchParams.get('store')   || '';   // steam | epic
  const mc      = searchParams.get('metacritic') || ''; // min metacritic score e.g. "80"
  const tags    = searchParams.get('tags')    || '';   // RAWG etiketleri: story-rich,open-world…
  const price   = searchParams.get('price')   || '';

  // Cevrimdisi/yedek liste devrede mi? Yanitla birlikte istemciye gidiyor.
  let limited = false;

  // ── Oyun modu filtresi: Steam mağaza kategorileri (otoriter veri) ──
  // RAWG etiketleri oyun modu için güvenilmez olduğundan, mod seçiliyse Steam araması
  // önceliklidir ve RAWG anahtarı gerektirmez.
  if (mode && STEAM_MODE_CAT[mode]) {
    let { results: modeResults, total: modeTotal } = await fetchSteamByMode(mode, { genres, q: q.trim(), section, page, num });
    if (store === 'epic') {
      modeResults = [];
    }
    if (mc) {
      const minScore = parseInt(mc);
      modeResults = modeResults.filter(g => g.metacritic >= minScore);
    }
    if (price === 'free') {
      modeResults = modeResults.filter(g => g.isFree);
    }
    if (modeResults.length > 0) {
      return NextResponse.json({ results: modeResults, total: modeTotal, source: 'steam-mode' });
    }
  }

  if (!RAWG_KEY) {
    return NextResponse.json({ error: 'RAWG_API_KEY eksik', results: [] }, { status: 500 });
  }

  let results = [];
  let total = 0;

  try {
    // ── GÜNLÜK FIRSATLAR / İNDİRİMLER (Steam Specials'dan canlı veri çekme) ──
    if (section === 'sale' && !q) {
      const fetchCount = rotate ? 40 : num;
      let url = `https://store.steampowered.com/search/results/?specials=1&category1=998&cc=tr&l=tr&json=1&start=${(page - 1) * fetchCount}&count=${fetchCount}`;
      if (genres) {
        if (STEAM_GENRE_MAP[genres]) url += `&genre=${STEAM_GENRE_MAP[genres]}`;
        if (STEAM_TAG_MAP[genres]) url += `&tags=${STEAM_TAG_MAP[genres]}`;
      }
      const steamDeals = await fetchSteamSearchPaginated(url, false, true);
      if (steamDeals && steamDeals.length > 0) {
        results = steamDeals;
        total = page * fetchCount + 48; // paging'i açık tut
      }
    }

    if (results.length === 0) {
      // Kategori aramalarında filtrelemeden sonra yeterli sayıda oyun kalması için RAWG'dan daha fazla oyun çekelim
      const fetchNum = section === 'sale' ? 60 : (section && section !== '') ? 40 : num;
      const base = { platforms: 4, page, page_size: fetchNum, exclude_additions: true };
      let params = { ...base };

    if (store === 'steam') {
      params.stores = '1';
    } else if (store === 'epic') {
      params.stores = '11';
    }

    if (mc) {
      params.metacritic = `${mc},100`;
    }

    if (price === 'free') {
      params.tags = 'free-to-play';
    }

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
        params.ordering = '-added';
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

    // ── KULLANICININ PUAN EŞİĞİ EN SON UYGULANIYOR ──
    // Yukarıdaki üç dal da params.metacritic'e YAZIYOR: topscore ve sale
    // '70,100', tür-varsayılanı '60,100'. Hepsi 642. satırdaki kullanıcı
    // eşiğinin ÜSTÜNE yazıyordu, yani "90+" seçen bir kullanıcı tür de
    // seçtiyse sessizce 60+ liste alıyordu.
    //
    // Hata eskiydi ama görünmezdi: hiçbir istemci `genres` ile `metacritic`i
    // birlikte göndermiyordu. Mobil filtre sayfası ikisini birden gönderince
    // ekranda çıktı — 90+ seçiliyken 86 puanlı oyunlar listeleniyordu.
    if (mc) params.metacritic = `${mc},100`;

    // Oyun modu filtresi (tek oyunculu / çok oyunculu / co-op) — RAWG tag'leri ile sunucu tarafında
    const MODE_TAG = { singleplayer: 'singleplayer', multiplayer: 'multiplayer', coop: 'co-op' };
    if (mode && MODE_TAG[mode]) {
      params.tags = params.tags ? `${params.tags},${MODE_TAG[mode]}` : MODE_TAG[mode];
    }

    // Serbest etiket filtresi (doğal dil aramasının çıkardığı etiketler)
    if (tags) {
      const clean = tags.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).slice(0, 5).join(',');
      if (clean) params.tags = params.tags ? `${params.tags},${clean}` : clean;
    }

    results = [];
    total = 0;

    try {
      if (section === 'new') {
        if (page === 1) {
          // Yeni Çıkanlar için hem RAWG hem de Steam'den paralel çek
          const [rawgData, steamResults] = await Promise.all([
            fetchRawg('/games', params).catch(() => ({ results: [], count: 0 })),
            fetchSteamNewReleases()
          ]);

          let filteredSteam = steamResults;
          if (store === 'epic') {
            filteredSteam = [];
          }
          if (mc) {
            const minScore = parseInt(mc);
            filteredSteam = filteredSteam.filter(g => g.metacritic >= minScore);
          }

          const rawgResults = (rawgData.results || []).filter(g => !isAdultContent(g) && !isDlc(g)).map(formatRawgGame);
          total = (rawgData.count || 0) + filteredSteam.length;

          // Temizleme: hasStores olanları ve silinenleri filtrele
          const filteredRawg = rawgResults.filter(g => g.hasStores && !KNOWN_DELISTED_SLUGS.has(g.rawgSlug));

          // Tekilleştirme: Hem Steam AppId hem de isim bazlı kontrol et
          const seenAppIds = new Set(filteredSteam.map(g => g.rawgId));
          const seenNames = new Set(filteredSteam.map(g => g.name.toLowerCase().replace(/[^a-z0-9]/g, '')));

          const uniqueRawg = filteredRawg.filter(g => {
            const cleanName = g.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const hasMatch = (g.steamAppId && seenAppIds.has(Number(g.steamAppId))) || seenNames.has(cleanName);
            return !hasMatch;
          });

          // Steam en yeni çıkanlar en üstte olacak şekilde birleştir
          results = [...filteredSteam, ...uniqueRawg];
        } else {
          // page > 1 ise sadece RAWG
          const data = await fetchRawg('/games', params);
          total = data.count || 0;
          const rawgResults = (data.results || []).filter(g => !isAdultContent(g) && !isDlc(g)).map(formatRawgGame);
          results = rawgResults.filter(g => g.hasStores && !KNOWN_DELISTED_SLUGS.has(g.rawgSlug));
        }
      } else {
        // Diğer tüm bölümler/aramalar için normal RAWG
        const data = await fetchRawg('/games', params);
        total = data.count || 0;
        results = (data.results || []).filter(g => !isAdultContent(g) && !isDlc(g)).map(formatRawgGame);
        if (section === 'free') {
          // Ücretsiz oyunlar RAWG'da çoğunlukla mağaza linki olmaz, hasStores şartı arama
          results = results.filter(g => !KNOWN_DELISTED_SLUGS.has(g.rawgSlug));
          if (page === 1) {
            const seenRawgIds = new Set(results.map(g => g.id));
            const extra = STATIC_FREE_GAMES.filter(g => !seenRawgIds.has(g.id));
            results = [...extra, ...results];
            total = total + extra.length;
          }
        } else {
          results = results.filter(g => g.hasStores && !KNOWN_DELISTED_SLUGS.has(g.rawgSlug));
        }
      }
    } catch (err) {
      console.warn('RAWG API fetch failed, proceeding to fallback:', err.message);
    }
    } // end of RAWG wrap block

    // Fallback logic for sections when RAWG is limited or returns no results
    if (results.length === 0) {
      console.log(`Applying paginated fallback for section: ${section || 'all'}, page: ${page}, query: ${q}`);
      // SESSIZ BASARISIZLIK YASAK (tasarim handoff'u). Buraya dusuldugunde
      // istemci bunu BILMELI: yedek yol yalnizca tur/ucretsiz/arama suzuyor,
      // magaza-puan-etiket filtreleri UYGULANMIYOR. Yanit govdesinde bunu
      // soyleyen bir alan yoktu; iki yol da source:'rawg-steam-merge'
      // donduruyordu ve istemci farki anlayamiyordu.
      limited = true;

      const GENRE_MAP = {
        'action': 'Aksiyon',
        'role-playing-games-rpg': 'RPG',
        'strategy': 'Strateji',
        'adventure': 'Macera',
        'shooter': 'Nişancı',
        'puzzle': 'Bulmaca',
        'sports': 'Spor',
        'racing': 'Yarış',
        'horror': 'Korku',
        'platformer': 'Platform',
        'card': 'Kart & Masa',
        'simulation': 'Simülasyon'
      };

      // fetchSteamSearchPaginated is now in module scope

      // Try fetching dynamically from Steam search results first for dynamic categories
      let dynamicResults = [];
      let fetchedDynamically = false;

      if (q.trim()) {
        const url = `https://store.steampowered.com/search/results/?term=${encodeURIComponent(q.trim())}&category1=998&cc=tr&l=tr&json=1&start=${(page-1)*num}&count=${num}`;
        dynamicResults = await fetchSteamSearchPaginated(url, false, false);
        fetchedDynamically = true;
      } else if (section === 'sale') {
        let url = `https://store.steampowered.com/search/results/?specials=1&category1=998&cc=tr&l=tr&json=1&start=${(page-1)*num}&count=${num}`;
        if (genres) {
          if (STEAM_GENRE_MAP[genres]) url += `&genre=${STEAM_GENRE_MAP[genres]}`;
          if (STEAM_TAG_MAP[genres]) url += `&tags=${STEAM_TAG_MAP[genres]}`;
        }
        dynamicResults = await fetchSteamSearchPaginated(url, false, true);
        fetchedDynamically = true;
      } else if (section === 'free') {
        let url = `https://store.steampowered.com/search/results/?genre=Free+to+Play&category1=998&cc=tr&l=tr&json=1&start=${(page-1)*num}&count=${num}`;
        if (genres) {
          if (STEAM_GENRE_MAP[genres]) url += `&genre=${STEAM_GENRE_MAP[genres]}`;
          if (STEAM_TAG_MAP[genres]) url += `&tags=${STEAM_TAG_MAP[genres]}`;
        }
        dynamicResults = await fetchSteamSearchPaginated(url, true, false);
        fetchedDynamically = true;
      } else if (section === 'popular') {
        let url = `https://store.steampowered.com/search/results/?filter=topsellers&category1=998&cc=tr&l=tr&json=1&start=${(page-1)*num}&count=${num}`;
        if (genres) {
          if (STEAM_GENRE_MAP[genres]) url += `&genre=${STEAM_GENRE_MAP[genres]}`;
          if (STEAM_TAG_MAP[genres]) url += `&tags=${STEAM_TAG_MAP[genres]}`;
        }
        dynamicResults = await fetchSteamSearchPaginated(url, false, false);
        fetchedDynamically = true;
      } else if (section === 'new') {
        let url = `https://store.steampowered.com/search/results/?sort_by=Released_DESC&category1=998&cc=tr&l=tr&json=1&start=${(page-1)*num}&count=${num}`;
        if (genres) {
          if (STEAM_GENRE_MAP[genres]) url += `&genre=${STEAM_GENRE_MAP[genres]}`;
          if (STEAM_TAG_MAP[genres]) url += `&tags=${STEAM_TAG_MAP[genres]}`;
        }
        dynamicResults = await fetchSteamSearchPaginated(url, false, false, true);
        fetchedDynamically = true;
      }

      if (fetchedDynamically && dynamicResults.length > 0) {
        results = dynamicResults;
        if (results.length < num) {
          total = (page - 1) * num + results.length;
        } else {
          total = page * num + 48; // keep paging enabled
        }
      } else {
        // Fallback to our local high-quality database (or if dynamic fetching failed/was empty)
        let dbGames = [...FALLBACK_GAMES];
        
        // Filter by genre
        if (genres) {
          const trGenre = GENRE_MAP[genres];
          if (trGenre) {
            dbGames = dbGames.filter(g => g.genres.includes(trGenre));
          }
        }
        
        // Filter by free
        if (section === 'free') {
          dbGames = dbGames.filter(g => g.isFree);
        }

        // Search text matching
        if (q.trim()) {
          const normQ = q.trim().toLowerCase();
          dbGames = dbGames.filter(g => g.name.toLowerCase().includes(normQ) || g.rawgSlug.toLowerCase().includes(normQ));
        }

        // Sort appropriately
        if (section === 'topscore') {
          dbGames.sort((a, b) => (b.metacritic || 0) - (a.metacritic || 0));
        } else if (section === 'popular') {
          dbGames.sort((a, b) => b.totalReviews - a.totalReviews);
        } else if (section === 'new') {
          dbGames.sort((a, b) => new Date(b.released || 0) - new Date(a.released || 0));
        } else {
          // Default sort by metacritic
          dbGames.sort((a, b) => (b.metacritic || 0) - (a.metacritic || 0));
        }

        const startIndex = (page - 1) * num;
        results = dbGames.slice(startIndex, startIndex + num);
        total = dbGames.length;
      }
    }

    // Dönen tüm sonuçların fiyat bilgilerini ve indirim durumlarını arka planda sorgulayıp eşitleyelim
    if (results.length > 0) {
      results = await Promise.all(
        results.map(async (g) => {
          try {
            const appid = await getSteamAppIdBySlug(g.rawgSlug);
            let priceInfo = await fetchLowestPriceFromITAD(appid, g.name);
            if (!priceInfo && appid) {
              priceInfo = await fetchPriceByAppId(appid);
            }
            if (priceInfo) {
              g.price = priceInfo.price;
              g.original = priceInfo.original;
              g.discount = priceInfo.discount;
              g.isFree = priceInfo.isFree;
              g.onSale = priceInfo.discount > 0;
              g.noData = false;
            }
          } catch (e) {
            console.warn('Enrichment failed for game:', g.name, e.message);
          }
          return g;
        })
      );
    }

    // Kategorilere göre tam doğruluk filtresi uygulayalım
    if (section === 'sale') {
      results = results.filter(g => g.onSale && !g.isFree);
    } else if (section === 'free') {
      results = results.filter(g => g.isFree);
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

    // `limited` ve `unavailable` istemcinin "sinirli mod" uyarisini
    // cizmesi icin. unavailable = yedek yolun UYGULAMADIGI filtreler;
    // istemci onlari devre disi GOSTERIYOR, gizlemiyor.
    return NextResponse.json({
      results, total, source: 'rawg-steam-merge',
      limited,
      unavailable: limited ? ['store', 'metacritic', 'tags'] : [],
    });

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
