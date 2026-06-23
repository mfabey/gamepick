import { NextResponse } from 'next/server';
import { isAdultContent, isAdultTitleOrSlug } from '../../lib/adult-filter.js';

const RAWG_KEY = process.env.RAWG_API_KEY;
const BASE     = 'https://api.rawg.io/api';

// RAWG store ID'leri
const STEAM_STORE_ID = 1;
const EPIC_STORE_ID  = 11;

function cleanNameForMatch(name) {
  const trMap = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'i': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'c', 'Ğ': 'g', 'I': 'i', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
  if (!name) return '';
  return name.replace(/[çğıiöşüÇĞIİÖŞÜ]/g, m => trMap[m]).toLowerCase().replace(/[^a-z0-9]/g, '');
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
               || items.find(i => cleanNameForMatch(i.name).includes(cleanSlug))
               || items[0];
    
    const appidMatch = match.logo.match(/\/apps\/(\d+)\//);
    return appidMatch ? parseInt(appidMatch[1]) : null;
  } catch (err) {
    console.error("Steam arama hatasi:", err);
    return null;
  }
}

async function fetchSteamDetails(appid, slug) {
  try {
    const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&cc=tr&l=tr`);
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data[appid];
    if (!entry || !entry.success || !entry.data) return null;
    
    const d = entry.data;
    
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
  const appid = await searchSteamGame(slug);
  if (!appid) return null;
  return fetchSteamDetails(appid, slug);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) return NextResponse.json({ error: 'slug eksik' }, { status: 400 });

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
    // Tüm store URL'lerini eşleştir
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

    // Steam appid — URL'den regex ile çıkar
    const steamUrl   = storeMap['steam'] || null;
    const steamAppId = steamUrl?.match(/store\.steampowered\.com\/app\/(\d+)/)?.[1] || null;

    // Epic URL
    const epicUrl = storeMap['epic-games'] || null;

    // hasSteam/hasEpic için de detail.stores'a fallback (liste endpoint'i bunu zaten veriyor)
    const hasSteam = !!steamAppId || detailStores.some(s => s.store?.slug === 'steam');
    const hasEpic  = !!epicUrl  || detailStores.some(s => s.store?.slug === 'epic-games');

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
