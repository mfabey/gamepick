import { NextResponse } from 'next/server';
import { isAdultContent, isAdultTitleOrSlug } from '../../lib/adult-filter.js';
import { FALLBACK_GAMES } from '../../lib/fallback-games.js';
import { getSteamDetailsCached } from '../../lib/steam-cache.js';

const RAWG_KEY = process.env.RAWG_API_KEY;
const BASE     = 'https://api.rawg.io/api';

// RAWG store ID'leri
const STEAM_STORE_ID = 1;
const EPIC_STORE_ID  = 11;

function cleanNameForMatch(name) {
  const trMap = {
    '\u00e7': 'c', '\u011f': 'g', '\u0131': 'i', 'i': 'i', '\u00f6': 'o', '\u015f': 's', '\u00fc': 'u',
    '\u00c7': 'c', '\u011e': 'g', 'I': 'i', '\u0130': 'i', '\u00d6': 'o', '\u015e': 's', '\u00dc': 'u'
  };
  if (!name) return '';
  return name.replace(/[\u00e7\u011f\u0131i\u00f6\u015f\u00fc\u00c7\u011eI\u0130\u00d6\u015e\u00dc]/g, m => trMap[m]).toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function searchSteamGame(slug) {
  try {
    const term = slug.replace(/-/g, ' ');
    const searchRes = await fetch(`https://store.steampowered.com/search/results/?term=${encodeURIComponent(term)}&cc=tr&l=tr&json=1`);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const items = searchData.items || [];
    if (items.length === 0) return null;

    // Eşleşen en yakın oyunu bul veya ilkini al
    const cleanSlug = cleanNameForMatch(slug);
    const match = items.find(i => cleanNameForMatch(i.name) === cleanSlug)
               || items.find(i => cleanNameForMatch(i.name).includes(cleanSlug) || cleanSlug.includes(cleanNameForMatch(i.name)));
    if (!match) return null;
    
    const appidMatch = match.logo.match(/\/apps\/(\d+)\//);
    const appid = appidMatch ? parseInt(appidMatch[1]) : null;
    if (!appid) return null;

    return {
      appid,
      name: match.name,
      logo: match.logo
    };
  } catch (err) {
    console.error("Steam arama hatasi:", err);
    return null;
  }
}

async function fetchSteamDetails(appid, slug) {
  try {
    const d = await getSteamDetailsCached(appid);
    if (!d) return null;
    
    return {
      id:           `rawg_${appid}`,
      rawgId:       appid,
      rawgSlug:     slug,
      name:         d.name,
      image:        d.header_image,
      description:  d.about_the_game || d.detailed_description || '',
      metacritic:   d.metacritic?.score || null,
      rating:       d.recommendations?.total ? 4.5 : 0,
      totalReviews: d.recommendations?.total || 0,
      developer:    d.developers?.[0] || null,
      publisher:    d.publishers?.[0] || null,
      released:     d.release_date?.date || null,
      playtime:     null,
      genres:       (d.genres || []).map(g => g.description),
      tags:         (d.categories || []).map(c => c.description).slice(0, 15),
      platforms:    ['PC'],
      screenshots:  (d.screenshots || []).map(s => s.path_full).slice(0, 6),
      trailer:      d.movies?.[0]?.hls_h264 || d.movies?.[0]?.mp4?.max || d.movies?.[0]?.webm?.max || null,
      // mp4: web için (HLS tarayıcılarda native oynamaz). `trailer` alanına dokunma — mobil onu kullanıyor.
      trailerMp4:   d.movies?.[0]?.id ? `https://video.akamai.steamstatic.com/store_trailers/${d.movies[0].id}/movie_max.mp4` : null,
      hasSteam:     true,
      hasEpic:      false,
      steamAppId:   String(appid),
      epicUrl:      null,
      steamUrl:     `https://store.steampowered.com/app/${appid}`,
      xboxUrl:      null,
      gogUrl:       null,
      playstationUrl: null,
      nintendoUrl:  null,
      officialUrl:  d.website || null,
      source:       'steam',
    };
  } catch (err) {
    console.error("Steam detay hatasi:", err);
    return null;
  }
}

async function trySteamFallback(slug) {
  // Check local fallback games first
  const localMatch = FALLBACK_GAMES.find(g => g.rawgSlug === slug || String(g.rawgId) === slug || g.id === slug || g.id === `rawg_${slug}`);
  if (localMatch) {
    const appid = localMatch.rawgId || parseInt(localMatch.id.replace('rawg_', ''));
    console.log(`Local fallback database hit for slug: ${slug} -> AppID: ${appid}`);
    const details = await fetchSteamDetails(appid, slug);
    if (details) return details;
    
    // Return high quality local match directly if details fetch fails
    return {
      id:           localMatch.id || `rawg_${appid}`,
      rawgId:       appid,
      rawgSlug:     localMatch.rawgSlug || slug,
      name:         localMatch.name,
      image:        localMatch.image,
      description:  'Bu oyunun açıklaması şu anda yüklenemedi. Ancak fiyat ve mağaza bilgilerini aşağıda bulabilirsiniz.',
      metacritic:   localMatch.metacritic || null,
      rating:       localMatch.reviewScore ? localMatch.reviewScore / 20 : 4.5,
      totalReviews: localMatch.totalReviews || 0,
      developer:    null,
      publisher:    null,
      released:     localMatch.released || null,
      playtime:     null,
      genres:       localMatch.genres || [],
      tags:         [],
      platforms:    ['PC'],
      screenshots:  [],
      trailer:      null,
      hasSteam:     true,
      hasEpic:      localMatch.hasEpic || false,
      steamAppId:   String(appid),
      epicUrl:      localMatch.epicUrl || null,
      steamUrl:     `https://store.steampowered.com/app/${appid}`,
      xboxUrl:      null,
      gogUrl:       null,
      playstationUrl: null,
      nintendoUrl:  null,
      officialUrl:  null,
      source:       'steam',
    };
  }

  const match = await searchSteamGame(slug);
  if (match) {
    console.log(`Steam search match found for slug: ${slug} -> AppID: ${match.appid}`);
    const details = await fetchSteamDetails(match.appid, slug);
    if (details) return details;

    // If search succeeded but details failed, build a basic game from the search match!
    return {
      id:           `rawg_${match.appid}`,
      rawgId:       match.appid,
      rawgSlug:     slug,
      name:         match.name,
      image:        `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${match.appid}/header.jpg`,
      description:  'Bu oyunun açıklaması şu anda yüklenemedi. Ancak güncel fiyat ve mağaza bilgilerini aşağıda bulabilirsiniz.',
      metacritic:   null,
      rating:       0,
      totalReviews: 0,
      developer:    null,
      publisher:    null,
      released:     null,
      playtime:     null,
      genres:       [],
      tags:         [],
      platforms:    ['PC'],
      screenshots:  [],
      trailer:      null,
      hasSteam:     true,
      hasEpic:      false,
      steamAppId:   String(match.appid),
      epicUrl:      null,
      steamUrl:     `https://store.steampowered.com/app/${match.appid}`,
      xboxUrl:      null,
      gogUrl:       null,
      playstationUrl: null,
      nintendoUrl:  null,
      officialUrl:  null,
      source:       'steam',
    };
  }

  // If search also fails, return a basic fallback game using the slug
  const nameFromSlug = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    id:           `rawg_fallback_${slug}`,
    rawgId:       null,
    rawgSlug:     slug,
    name:         nameFromSlug,
    image:        'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/0/header.jpg',
    description:  'Bu oyunun açıklaması şu anda yüklenemedi. Ancak güncel fiyat ve mağaza bilgilerini aşağıda bulabilirsiniz.',
    metacritic:   null,
    rating:       0,
    totalReviews: 0,
    developer:    null,
    publisher:    null,
    released:     null,
    playtime:     null,
    genres:       [],
    tags:         [],
    platforms:    ['PC'],
    screenshots:  [],
    hasSteam:     true,
    hasEpic:      false,
    steamAppId:   null,
    epicUrl:      null,
    steamUrl:     null,
    xboxUrl:      null,
    gogUrl:       null,
    playstationUrl: null,
    nintendoUrl:  null,
    officialUrl:  null,
    source:       'steam',
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) return NextResponse.json({ error: 'slug eksik' }, { status: 400 });

  // Direct Steam AppID check (e.g. rawg_12345 or pure numeric)
  let directAppId = null;
  if (slug.startsWith('rawg_')) {
    directAppId = slug.substring(5);
  } else if (/^\d+$/.test(slug)) {
    directAppId = slug;
  }

  if (directAppId) {
    console.log(`Direct ID detected: ${directAppId}`);
    
    // 1. Try RAWG by ID first
    let rawgDetail = null;
    let rawgShots = { results: [] };
    let rawgStores = { results: [] };
    let rawgAdditions = { results: [] };
    let rawgSuccess = false;

    try {
      const [detailRes, shotsRes, storesRes, additionsRes] = await Promise.all([
        fetch(`${BASE}/games/${directAppId}?key=${RAWG_KEY}`, { next: { revalidate: 3600 } }).then(r => r.json()),
        fetch(`${BASE}/games/${directAppId}/screenshots?key=${RAWG_KEY}`, { next: { revalidate: 3600 } }).then(r => r.json()).catch(() => ({ results: [] })),
        fetch(`${BASE}/games/${directAppId}/stores?key=${RAWG_KEY}`, { next: { revalidate: 3600 } }).then(r => r.json()).catch(() => ({ results: [] })),
        fetch(`${BASE}/games/${directAppId}/additions?key=${RAWG_KEY}&page_size=12`, { next: { revalidate: 3600 } }).then(r => r.json()).catch(() => ({ results: [] })),
      ]);

      if (detailRes && !detailRes.detail && !detailRes.error && detailRes.id) {
        rawgDetail = detailRes;
        rawgShots = shotsRes;
        rawgStores = storesRes;
        rawgAdditions = additionsRes;
        rawgSuccess = true;
      }
    } catch (err) {
      console.error('RAWG by ID fetch failed:', err);
    }

    if (rawgSuccess && rawgDetail) {
      if (isAdultContent(rawgDetail)) {
        return NextResponse.json({ error: 'Bu oyun kütüphanede gösterilmemektedir.' }, { status: 403 });
      }
      
      try {
        const storeResults = rawgStores.results || [];
        const detailStores = rawgDetail.stores || [];
        const storeMap = {};
        
        storeResults.forEach(sr => {
          const storeDetail = detailStores.find(ds => ds.store?.id === sr.store_id);
          if (storeDetail) {
            storeMap[storeDetail.store.slug] = sr.url;
          } else {
            if (sr.store_id === 1) storeMap['steam'] = sr.url;
            if (sr.store_id === 11) storeMap['epic-games'] = sr.url;
            if (sr.store_id === 2) storeMap['xbox-store'] = sr.url;
            if (sr.store_id === 3) storeMap['playstation-store'] = sr.url;
            if (sr.store_id === 5) storeMap['gog'] = sr.url;
            if (sr.store_id === 6) storeMap['nintendo'] = sr.url;
          }
        });

        const steamUrl   = storeMap['steam'] || null;
        const steamAppId = steamUrl?.match(/store\.steampowered\.com\/app\/(\d+)/)?.[1] || null;
        const epicUrl = storeMap['epic-games'] || null;
        const hasSteam = !!steamAppId || detailStores.some(s => s.store?.slug === 'steam');
        const hasEpic  = !!epicUrl  || detailStores.some(s => s.store?.slug === 'epic-games');

        let trailer = null;
        let trailerMp4 = null;
        if (steamAppId) {
          try {
            const steamData = await getSteamDetailsCached(steamAppId);
            if (steamData && steamData.movies && steamData.movies.length > 0) {
              trailer = steamData.movies[0].hls_h264 || steamData.movies[0].mp4?.max || steamData.movies[0].webm?.max || null;
              trailerMp4 = steamData.movies[0].id ? `https://video.akamai.steamstatic.com/store_trailers/${steamData.movies[0].id}/movie_max.mp4` : null;
            }
          } catch (e) {
            console.error("Steam trailer fetch failed for rawg game:", e);
          }
        }

        const game = {
          id:           `rawg_${rawgDetail.id}`,
          rawgId:       rawgDetail.id,
          rawgSlug:     rawgDetail.slug,
          name:         rawgDetail.name,
          image:        rawgDetail.background_image,
          description:  rawgDetail.description_raw || '',
          metacritic:   rawgDetail.metacritic   || null,
          rating:       rawgDetail.rating       || 0,
          totalReviews: rawgDetail.ratings_count || 0,
          developer:    rawgDetail.developers?.[0]?.name || null,
          publisher:    rawgDetail.publishers?.[0]?.name || null,
          released:     rawgDetail.released  || null,
          playtime:     rawgDetail.playtime  || null,
          genres:       (rawgDetail.genres   || []).map(g => g.name),
          tags:         (rawgDetail.tags     || []).map(t => t.name).slice(0, 15),
          platforms:    (rawgDetail.platforms|| []).map(p => p.platform.name),
          screenshots:  (rawgShots.results   || []).map(s => s.image).filter(Boolean).slice(0, 6),
          trailer,
          trailerMp4,
          hasSteam,
          hasEpic,
          steamAppId:   steamAppId || null,
          epicUrl:      epicUrl ? epicUrl.replace('/en-US/', '/tr/') : (hasEpic ? `https://store.epicgames.com/tr/p/${rawgDetail.slug}` : null),
          steamUrl:     steamAppId ? `https://store.steampowered.com/app/${steamAppId}` : null,
          xboxUrl:      storeMap['xbox-store'] || storeMap['xbox-360-store'] || null,
          gogUrl:       storeMap['gog'] || null,
          playstationUrl: storeMap['playstation-store'] || null,
          nintendoUrl:  storeMap['nintendo'] || null,
          officialUrl:  rawgDetail.website || null,
          source:       steamAppId ? 'steam' : hasEpic ? 'epic' : 'rawg',
          additions:    (rawgAdditions.results || []).filter(a => a.background_image).slice(0, 12).map(a => ({
            id:       a.id,
            name:     a.name,
            slug:     a.slug,
            image:    a.background_image,
            released: a.released || null,
            rating:   a.rating || 0,
            metacritic: a.metacritic || null,
          })),
        };
        return NextResponse.json({ game });
      } catch (err) {
        console.error('RAWG mapping by ID error:', err);
      }
    }

    // 2. Try Steam details by AppID direct fallback
    const fallbackGame = await fetchSteamDetails(directAppId, slug);
    if (fallbackGame) {
      if (isAdultTitleOrSlug(fallbackGame.name, fallbackGame.rawgSlug)) {
        return NextResponse.json({ error: 'Bu oyun kütüphanede gösterilmemektedir.' }, { status: 403 });
      }
      return NextResponse.json({ game: fallbackGame });
    }

    // 3. Last resort direct ID fallback
    const fallbackObj = await trySteamFallback(slug);
    if (fallbackObj) {
      if (isAdultTitleOrSlug(fallbackObj.name, fallbackObj.rawgSlug)) {
        return NextResponse.json({ error: 'Bu oyun kütüphanede gösterilmemektedir.' }, { status: 403 });
      }
      return NextResponse.json({ game: fallbackObj });
    }
  }

  let detail;
  let shots = { results: [] };
  let storesData = { results: [] };
  let additions = { results: [] };
  let rawgFailed = false;

  try {
    const [detailRes, shotsRes, storesRes, additionsRes] = await Promise.all([
      fetch(`${BASE}/games/${slug}?key=${RAWG_KEY}`, { next: { revalidate: 3600 } }).then(r => r.json()),
      fetch(`${BASE}/games/${slug}/screenshots?key=${RAWG_KEY}`, { next: { revalidate: 3600 } }).then(r => r.json()).catch(() => ({ results: [] })),
      fetch(`${BASE}/games/${slug}/stores?key=${RAWG_KEY}`, { next: { revalidate: 3600 } }).then(r => r.json()).catch(() => ({ results: [] })),
      fetch(`${BASE}/games/${slug}/additions?key=${RAWG_KEY}&page_size=12`, { next: { revalidate: 3600 } }).then(r => r.json()).catch(() => ({ results: [] })),
    ]);

    detail = detailRes;
    shots = shotsRes;
    storesData = storesRes;
    additions = additionsRes;

    if (detail.detail === 'Not found.' || detail.error || !detail.id) {
      rawgFailed = true;
    } else if (isAdultContent(detail)) {
      return NextResponse.json({ error: 'Bu oyun kütüphanede gösterilmemektedir.' }, { status: 403 });
    }
  } catch (err) {
    console.error('RAWG game fetch hatasi veya bulunamadi:', err.message);
    rawgFailed = true;
  }

  // Eğer RAWG'ta bulunamadıysa veya hata alındıysa, Steam fallback'ini dene
  if (rawgFailed) {
    console.log(`"${slug}" RAWG'ta bulunamadı. Steam fallback deneniyor...`);
    const fallbackGame = await trySteamFallback(slug);
    if (fallbackGame) {
      if (isAdultTitleOrSlug(fallbackGame.name, fallbackGame.rawgSlug)) {
        return NextResponse.json({ error: 'Bu oyun kütüphanede gösterilmemektedir.' }, { status: 403 });
      }
      console.log(`"${slug}" Steam üzerinde başarıyla bulundu ve oluşturuldu.`);
      return NextResponse.json({ game: fallbackGame });
    }
    return NextResponse.json({ error: 'Oyun bulunamadi' }, { status: 404 });
  }

  // RAWG'tan başarıyla alındıysa standard eşleme:
  try {
    const storeResults = storesData.results || [];
    const detailStores = detail.stores || [];
    const storeMap = {};
    
    storeResults.forEach(sr => {
      const storeDetail = detailStores.find(ds => ds.store?.id === sr.store_id);
      if (storeDetail) {
        storeMap[storeDetail.store.slug] = sr.url;
      } else {
        if (sr.store_id === 1) storeMap['steam'] = sr.url;
        if (sr.store_id === 11) storeMap['epic-games'] = sr.url;
        if (sr.store_id === 2) storeMap['xbox-store'] = sr.url;
        if (sr.store_id === 3) storeMap['playstation-store'] = sr.url;
        if (sr.store_id === 5) storeMap['gog'] = sr.url;
        if (sr.store_id === 6) storeMap['nintendo'] = sr.url;
      }
    });

    const steamUrl   = storeMap['steam'] || null;
    const steamAppId = steamUrl?.match(/store\.steampowered\.com\/app\/(\d+)/)?.[1] || null;
    const epicUrl = storeMap['epic-games'] || null;
    const hasSteam = !!steamAppId || detailStores.some(s => s.store?.slug === 'steam');
    const hasEpic  = !!epicUrl  || detailStores.some(s => s.store?.slug === 'epic-games');

    let trailer = null;
    let trailerMp4 = null;
    if (steamAppId) {
      try {
        const steamData = await getSteamDetailsCached(steamAppId);
        if (steamData && steamData.movies && steamData.movies.length > 0) {
          trailer = steamData.movies[0].hls_h264 || steamData.movies[0].mp4?.max || steamData.movies[0].webm?.max || null;
          trailerMp4 = steamData.movies[0].id ? `https://video.akamai.steamstatic.com/store_trailers/${steamData.movies[0].id}/movie_max.mp4` : null;
        }
      } catch (e) {
        console.error("Steam trailer fetch failed for rawg game:", e);
      }
    }

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
      trailer,
      trailerMp4,
      hasSteam,
      hasEpic,
      steamAppId:   steamAppId || null,
      epicUrl:      epicUrl ? epicUrl.replace('/en-US/', '/tr/') : (hasEpic ? `https://store.epicgames.com/tr/p/${slug}` : null),
      steamUrl:     steamAppId ? `https://store.steampowered.com/app/${steamAppId}` : null,
      xboxUrl:      storeMap['xbox-store'] || storeMap['xbox-360-store'] || null,
      gogUrl:       storeMap['gog'] || null,
      playstationUrl: storeMap['playstation-store'] || null,
      nintendoUrl:  storeMap['nintendo'] || null,
      officialUrl:  detail.website || null,
      source:       steamAppId ? 'steam' : hasEpic ? 'epic' : 'rawg',
      additions:    (additions.results || []).filter(a => a.background_image).slice(0, 12).map(a => ({
        id:       a.id,
        name:     a.name,
        slug:     a.slug,
        image:    a.background_image,
        released: a.released || null,
        rating:   a.rating || 0,
        metacritic: a.metacritic || null,
      })),
    };

    return NextResponse.json({ game });
  } catch (err) {
    console.error('RAWG game mapping hatasi:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
