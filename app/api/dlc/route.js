import { NextResponse } from 'next/server';
import { isAdultContent, isAdultTitleOrSlug } from '../../lib/adult-filter.js';
import { parseQuery, listeQuery } from '../../lib/schemas.js';

const RAWG_KEY = process.env.RAWG_API_KEY;
const RAWG_BASE = 'https://api.rawg.io/api';

// Popüler ana oyunların RAWG ID'leri — bunların DLC'lerini çekeceğiz
const POPULAR_GAME_IDS = [
  3498,    // GTA V
  4200,    // Portal 2
  5679,    // The Witcher 3
  12020,   // Left 4 Dead 2
  13536,   // Portal
  28,      // Dota 2
  32,      // Destiny 2
  4828,    // Borderlands 2
  3070,    // Fallout 4
  5562,    // Dishonored
  39730,   // Borderlands 3
  58175,   // Sekiro
  41494,   // Cyberpunk 2077
  58134,   // Red Dead Redemption 2
  28592,   // Hades
  13,      // Half-Life 2
  30,      // Team Fortress 2
  4291,    // Counter-Strike Global Offensive
  3719,    // The Elder Scrolls V Skyrim
  2340,    // The Witcher 2
  2454,    // Batman Arkham City
  818,     // Divinity: Original Sin 2
  5765,    // XCOM 2
  20681,   // Crusader Kings III
  29809,   // Civilization VI
  57,      // Hearts of Iron IV
  34010,   // Monster Hunter World
  802,     // Dying Light
  3302,    // ARK Survival Evolved
  29898,   // Elden Ring
];

function generateSlug(text) {
  const trMap = {
    '\u00e7': 'c', '\u011f': 'g', '\u0131': 'i', 'i': 'i', '\u00f6': 'o', '\u015f': 's', '\u00fc': 'u',
    '\u00c7': 'c', '\u011e': 'g', 'I': 'i', '\u0130': 'i', '\u00d6': 'o', '\u015e': 's', '\u00dc': 'u'
  };
  let slug = text.replace(/[\u00e7\u011f\u0131i\u00f6\u015f\u00fc\u00c7\u011eI\u0130\u00d6\u015e\u00dc]/g, m => trMap[m]).toLowerCase();
  return slug.replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}

// Steam Search API'den DLC listesi çek (category1=21 → DLC)
async function fetchSteamDlcs({ q = '', page = 1, num = 24, section = '' }) {
  try {
    const start = (page - 1) * num;
    let url = `https://store.steampowered.com/search/results/?category1=21&cc=tr&l=tr&json=1&start=${start}&count=${num}`;

    if (q.trim()) {
      url += `&term=${encodeURIComponent(q.trim())}`;
    } else if (section === 'new') {
      url += '&sort_by=Released_DESC&filter=popularnew';
    } else if (section === 'popular') {
      url += '&filter=topsellers';
    } else {
      url += '&sort_by=Released_DESC';
    }

    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.items || [];

    return items
      .filter(item => !isAdultTitleOrSlug(item.name, item.name))
      .map(item => {
        const appidMatch = item.logo?.match(/\/apps\/(\d+)\//);
        const appid = appidMatch ? parseInt(appidMatch[1]) : null;
        const slug = generateSlug(item.name);

        const isFree = item.final_price === 0;
        const onSale = !!item.discounted;
        const price = item.final_price != null ? item.final_price / 100 : null;
        const originalPrice = item.original_price != null ? item.original_price / 100 : null;

        return {
          id: 'steam_dlc_' + (appid || slug),
          rawgId: appid,
          rawgSlug: slug,
          name: item.name,
          image: appid
            ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`
            : item.logo,
          metacritic: null,
          reviewScore: 0,
          totalReviews: 0,
          isFree,
          onSale,
          price,
          originalPrice,
          noData: false,
          platforms: ['pc'],
          source: 'steam',
          hasSteam: true,
          hasEpic: false,
          hasStores: true,
          steamUrl: appid ? `https://store.steampowered.com/app/${appid}` : null,
          genres: [],
          released: null,
          isDlc: true,
        };
      });
  } catch (err) {
    console.error('Steam DLC fetch hatası:', err.message);
    return [];
  }
}

// RAWG'dan popüler oyunların additions/DLC listesini çek
async function fetchRawgAdditions({ page = 1, num = 24 }) {
  if (!RAWG_KEY) return [];

  try {
    // Rastgele bir alt küme seç (her sayfada farklı oyunlar)
    const startIdx = ((page - 1) * 3) % POPULAR_GAME_IDS.length;
    const gameIds = [
      ...POPULAR_GAME_IDS.slice(startIdx, startIdx + 5),
      ...POPULAR_GAME_IDS.slice(0, Math.max(0, 5 - (POPULAR_GAME_IDS.length - startIdx))),
    ].slice(0, 5);

    const additionPromises = gameIds.map(async (gameId) => {
      try {
        const res = await fetch(
          `${RAWG_BASE}/games/${gameId}/additions?key=${RAWG_KEY}&page_size=10`,
          { next: { revalidate: 3600 } }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.results || []).filter(g => g.background_image);
      } catch {
        return [];
      }
    });

    const nestedResults = await Promise.all(additionPromises);
    const allAdditions = nestedResults.flat();

    return allAdditions
      .filter(g => !isAdultContent(g))
      .slice(0, num)
      .map(game => {
        const steamStore = game.stores?.find(s => s.store?.slug === 'steam');
        const epicStore  = game.stores?.find(s => s.store?.slug === 'epic-games');
        const hasSteam   = !!steamStore;
        const hasEpic    = !!epicStore;

        return {
          id: 'rawg_dlc_' + game.id,
          rawgId: game.id,
          rawgSlug: game.slug,
          name: game.name,
          image: game.background_image,
          metacritic: game.metacritic || null,
          reviewScore: game.rating ? Math.round(game.rating * 20) : 0,
          totalReviews: game.ratings_count || 0,
          isFree: false,
          onSale: false,
          price: null,
          noData: true,
          platforms: ['pc'],
          source: hasSteam ? 'steam' : 'rawg',
          hasSteam,
          hasEpic,
          hasStores: !!(game.stores && game.stores.length > 0),
          steamUrl: null,
          epicUrl: hasEpic ? 'https://store.epicgames.com/tr/p/' + game.slug : null,
          genres: (game.genres || []).map(g => g.name).slice(0, 3),
          released: game.released || null,
          isDlc: true,
        };
      });
  } catch (err) {
    console.error('RAWG additions fetch hatası:', err.message);
    return [];
  }
}

// RAWG'dan DLC arama (q ile)
async function searchRawgDlcs({ q, page = 1, num = 24 }) {
  if (!RAWG_KEY || !q.trim()) return [];

  try {
    const url = new URL(`${RAWG_BASE}/games`);
    url.searchParams.set('key', RAWG_KEY);
    url.searchParams.set('search', q.trim());
    url.searchParams.set('platforms', '4');
    url.searchParams.set('page', String(page));
    url.searchParams.set('page_size', String(num));

    const res = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();

    // Adında DLC, expansion, season pass gibi terimler geçenleri filtrele
    const dlcKeywords = /\b(dlc|expansion|season pass|add.?on|pack|episode|content|downloadable)\b/i;
    return (data.results || [])
      .filter(g => g.background_image && dlcKeywords.test(g.name) && !isAdultContent(g))
      .map(game => {
        const steamStore = game.stores?.find(s => s.store?.slug === 'steam');
        const hasSteam   = !!steamStore;
        return {
          id: 'rawg_dlc_' + game.id,
          rawgId: game.id,
          rawgSlug: game.slug,
          name: game.name,
          image: game.background_image,
          metacritic: game.metacritic || null,
          reviewScore: game.rating ? Math.round(game.rating * 20) : 0,
          totalReviews: game.ratings_count || 0,
          isFree: false,
          onSale: false,
          price: null,
          noData: true,
          platforms: ['pc'],
          source: hasSteam ? 'steam' : 'rawg',
          hasSteam,
          hasEpic: false,
          hasStores: !!(game.stores && game.stores.length > 0),
          genres: (game.genres || []).map(g => g.name).slice(0, 3),
          released: game.released || null,
          isDlc: true,
        };
      });
  } catch (err) {
    console.error('RAWG DLC arama hatası:', err.message);
    return [];
  }
}

// GET /api/dlc?section=new&q=...&page=1&num=24
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get('section') || '';
  const q       = searchParams.get('q')       || '';
  // Sayfalama şemadan — gerekçe games/route.js ile aynı.
  const sayfalama = parseQuery(request, listeQuery);
  if (!sayfalama.ok) return sayfalama.response;
  const { page, num } = sayfalama.data;

  try {
    let results = [];

    if (q.trim()) {
      // Arama: Steam + RAWG paralel
      const [steamResults, rawgResults] = await Promise.all([
        fetchSteamDlcs({ q, page, num }),
        searchRawgDlcs({ q, page, num }),
      ]);

      // Tekrar edenleri birleştir (isim bazlı tekilleştirme)
      const seen = new Set();
      for (const item of [...steamResults, ...rawgResults]) {
        const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!seen.has(key)) {
          seen.add(key);
          results.push(item);
        }
      }
    } else {
      // Listeleme: Steam DLC listesi (ana kaynak) + RAWG additions (ek kaynak)
      const [steamResults, rawgResults] = await Promise.all([
        fetchSteamDlcs({ section, page, num }),
        fetchRawgAdditions({ page, num: 12 }),
      ]);

      // Steam önce, RAWG'dan gelen kopyalar olmadıkça ekle
      const seen = new Set(steamResults.map(i => i.name.toLowerCase().replace(/[^a-z0-9]/g, '')));
      const uniqueRawg = rawgResults.filter(i => {
        const key = i.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      results = [...steamResults, ...uniqueRawg].slice(0, num);
    }

    // Yeterli sonuç yoksa Steam arama ile fallback
    if (results.length < 6) {
      const fallback = await fetchSteamDlcs({ section, page: 1, num });
      const seen = new Set(results.map(i => i.name.toLowerCase().replace(/[^a-z0-9]/g, '')));
      for (const item of fallback) {
        const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!seen.has(key)) {
          seen.add(key);
          results.push(item);
        }
      }
    }

    const total = results.length < num
      ? (page - 1) * num + results.length
      : page * num + num; // daha fazla sayfa için

    return NextResponse.json({ results, total, source: 'steam-rawg' });

  } catch (err) {
    console.error('DLC API genel hatası:', err.message);
    return NextResponse.json({ error: err.message, results: [] }, { status: 500 });
  }
}
