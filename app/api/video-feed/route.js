import { NextResponse } from 'next/server';
import { getSteamDetailsCached } from '../../lib/steam-cache.js';
import { isAdultTitleOrSlug, isSteamDataAdult } from '../../lib/adult-filter.js';
import { redisGetJSON, redisCmd } from '../../lib/redis';

// ─────────────────────────────────────────────────────────────────────────────
// Dikey video akışı (Reels tarzı) için oyun fragmanları.
//
// Kaynak: Steam'in HLS fragmanları — 1080p/720p/480p/360p uyarlanabilir
// bit hızı, Akamai CDN üzerinden. Oynatıcı ağ durumuna göre kaliteyi kendisi
// ayarlar; Reels/TikTok'un kullandığı teslimat modelinin aynısı.
//
// İKİ KRİTİK KISIT:
// 1) Steam'in appdetails ucu hız sınırlı (~200 istek/5dk). Akış her istekte
//    canlı çözülemez → sonuç Redis'te önbelleklenir.
// 2) rawg-game/route.js'teki "film başına sıralı HEAD isteği" deseni burada
//    KULLANILMAZ. 20 oyun × 5 film = 100 ardışık istek demekti; HLS adresi
//    zaten appdetails yanıtında geliyor, doğrulamaya gerek yok.
//
// NOT: Steam artık `mp4.max` / `webm.max` alanlarını DÖNDÜRMÜYOR (2026'da
// kaldırılmış). Yalnızca dash_av1 / dash_h264 / hls_h264 var. HLS'i alıyoruz
// çünkü hem iOS (AVPlayer) hem Android (ExoPlayer) native destekliyor.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_TTL_SEC = 6 * 3600;      // 6 saat
const POOL_PAGES = 2;                 // Steam top-seller sayfası
const STEAM_PAGE = 50;
const CONCURRENCY = 6;                // appdetails paralelliği (hız sınırına takılmamak için)
const MAX_FEED = 60;
const PAGE_SIZE = 10;

function cacheKey(lang) { return `video_feed:v1:${lang}`; }

/** Steam top-seller listesinden appid havuzu (isim + appid). */
async function fetchAppidPool() {
  const out = [];
  for (let i = 0; i < POOL_PAGES; i++) {
    const url = `https://store.steampowered.com/search/results/?filter=topsellers&category1=998&cc=tr&l=tr&json=1&start=${i * STEAM_PAGE}&count=${STEAM_PAGE}`;
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const data = await res.json();
      for (const item of data.items || []) {
        const m = (item.logo || '').match(/\/apps\/(\d+)\//);
        const appid = m ? parseInt(m[1], 10) : null;
        if (!appid || !item.name) continue;
        if (isAdultTitleOrSlug(item.name, '')) continue;
        out.push({ appid, name: item.name });
      }
    } catch { /* bu sayfayı atla */ }
  }
  // Tekilleştir
  const seen = new Set();
  return out.filter((g) => (seen.has(g.appid) ? false : seen.add(g.appid)));
}

/**
 * Fragman seçimi. Steam bir oyun için birden fazla film döndürebiliyor;
 * gameplay içereni öne almak akışın amacına daha uygun.
 */
function pickMovie(movies = []) {
  const withHls = movies.filter((m) => m?.hls_h264);
  if (withHls.length === 0) return null;

  const gameplay = withHls.find((m) => /gameplay|game play|oynanış/i.test(m.name || ''));
  if (gameplay) return gameplay;

  const highlight = withHls.find((m) => m.highlight);
  return highlight || withHls[0];
}

/** Havuzu sınırlı paralellikle işleyip video içerenleri toplar. */
async function buildFeed(pool, lang) {
  const items = [];
  let cursor = 0;

  async function worker() {
    while (cursor < pool.length && items.length < MAX_FEED) {
      const { appid, name } = pool[cursor++];
      try {
        const d = await getSteamDetailsCached(appid, lang);
        if (!d || !d.movies?.length) continue;
        if (isSteamDataAdult(d)) continue;

        const movie = pickMovie(d.movies);
        if (!movie) continue;

        items.push({
          id: `rawg_${appid}`,
          appid: String(appid),
          name: d.name || name,
          hls: movie.hls_h264,
          thumbnail: movie.thumbnail || '',
          image: d.header_image || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`,
          genres: (d.genres || []).map((g) => g.description).slice(0, 3),
          isFree: !!d.is_free,
          steamUrl: `https://store.steampowered.com/app/${appid}`,
          hasSteam: true,
        });
      } catch { /* bu oyunu atla */ }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return items;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') === 'tr' ? 'tr' : 'en';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  try {
    let feed = await redisGetJSON(cacheKey(lang)).catch(() => null);

    if (!Array.isArray(feed) || feed.length === 0) {
      const pool = await fetchAppidPool();
      feed = await buildFeed(pool, lang);
      if (feed.length > 0) {
        // SET + EX tek komutta: ayrı EXPIRE çağrısı fazladan tur ve
        // arada süreç ölürse TTL'siz kalma riski demekti.
        redisCmd(['SET', cacheKey(lang), JSON.stringify(feed), 'EX', String(CACHE_TTL_SEC)])
          .catch(() => {});
      }
    }

    const start = (page - 1) * PAGE_SIZE;
    const slice = feed.slice(start, start + PAGE_SIZE);

    return NextResponse.json({
      results: slice,
      page,
      hasMore: start + PAGE_SIZE < feed.length,
      total: feed.length,
    });
  } catch (err) {
    console.error('video-feed hatası:', err.message);
    return NextResponse.json({ results: [], page, hasMore: false, total: 0 });
  }
}
