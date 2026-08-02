import { NextResponse } from 'next/server';
import { getSteamDetailsCached } from '../../lib/steam-cache.js';
import { isAdultTitleOrSlug, isSteamDataAdult } from '../../lib/adult-filter.js';
import { redisGetJSON, redisCmd, redisPipeline, parseJSON } from '../../lib/redis';

// ─────────────────────────────────────────────────────────────────────────────
// Dikey video akışı (Reels tarzı) için oyun fragmanları.
//
// Kaynak: Steam'in HLS fragmanları — uyarlanabilir bit hızı, Akamai CDN.
//
// ÜÇ TASARIM KARARI:
//
// 1) KAYNAK KARIŞIMI. Yalnızca top-seller çekmek akışı aylarca aynı bırakıyordu.
//    Artık Steam'in KÜRATÖRLÜ yeni çıkanları da geliyor. `sort_by=Released_DESC`
//    kullanılmadı: tarihe göre ham sıralama asset-flip'lerle doluyor.
//    (`filter=popularnew` de denendi — top-seller ile aynı sonucu dönüyor, işe
//    yaramıyor.)
//
// 2) AĞIRLIKLI RASTGELE SIRA. Yeni oyunlara öncelik veriliyor ama sabit sıra
//    değil: Efraimidis-Spirakis ağırlıklı örnekleme (key = u^(1/ağırlık)).
//    Yüksek ağırlık öne çıkma EĞİLİMİ yaratır, garanti vermez — böylece
//    kullanıcı her açtığında farklı ama yine yeni-ağırlıklı bir sıra görür.
//
// 3) APPID BAŞINA ÖNBELLEK. Önceden liste bayatlayınca 100'e kadar appdetails
//    çağrısı baştan yapılıyordu. Artık her appid'in çözümü ayrı saklanıyor,
//    yenilemede yalnızca YENİ appid'ler için ağa çıkılıyor.
// ─────────────────────────────────────────────────────────────────────────────

const POOL_TTL_SEC = 3 * 3600;        // havuz (appid listesi) tazeliği
const ITEM_TTL_SEC = 7 * 86400;       // çözümlenmiş video kaydı
const MISS_TTL_SEC = 2 * 86400;       // "bu oyunun videosu yok" işareti
const CONCURRENCY = 6;                // appdetails paralelliği (hız sınırı)
const MAX_FEED = 90;
const PAGE_SIZE = 10;

// Kaynak ağırlıkları — yeni çıkanlar öne çıksın
const W_NEW = 3;
const W_TOP = 1.5;
const W_SALE = 1;

const poolKey = (lang) => `video_pool:v2:${lang}`;
const itemKey = (lang, appid) => `video_item:${lang}:${appid}`;

// ── Deterministik PRNG (seed'li karıştırma için) ────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Ağırlıklı rastgele sıralama (Efraimidis-Spirakis).
 * key = u^(1/ağırlık) → ağırlık büyüdükçe key 1'e yaklaşır, öne geçme
 * olasılığı artar ama sonuç yine rastgeledir.
 */
function weightedShuffle(items, rand) {
  return items
    .map((it) => ({ it, key: Math.pow(rand(), 1 / (it.w || 1)) }))
    .sort((a, b) => b.key - a.key)
    .map((x) => x.it);
}

// ── Havuz: appid + ağırlık ──────────────────────────────────────────────────

async function fetchFeatured() {
  try {
    const res = await fetch('https://store.steampowered.com/api/featuredcategories/?cc=tr&l=tr', {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return { fresh: [], sale: [] };
    const j = await res.json();
    const pick = (arr) => (arr || [])
      .filter((i) => i?.id && i?.name && !isAdultTitleOrSlug(i.name, ''))
      .map((i) => ({ appid: Number(i.id), name: i.name }));
    return { fresh: pick(j.new_releases?.items), sale: pick(j.specials?.items) };
  } catch {
    return { fresh: [], sale: [] };
  }
}

async function fetchTopSellers(pages = 2) {
  const out = [];
  for (let i = 0; i < pages; i++) {
    const url = `https://store.steampowered.com/search/results/?filter=topsellers&category1=998&cc=tr&l=tr&json=1&start=${i * 50}&count=50`;
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
  return out;
}

/** Üç kaynağı birleştirip ağırlıklandırır; aynı oyun birden fazla kaynaktaysa EN YÜKSEK ağırlığı alır. */
async function buildPool() {
  const [featured, top] = await Promise.all([fetchFeatured(), fetchTopSellers(2)]);

  const byId = new Map();
  const add = (list, w) => {
    for (const g of list) {
      const prev = byId.get(g.appid);
      if (!prev || w > prev.w) byId.set(g.appid, { ...g, w });
    }
  };
  add(top, W_TOP);
  add(featured.sale, W_SALE);
  add(featured.fresh, W_NEW);      // en son: yeni çıkan ağırlığı diğerlerini ezsin

  return [...byId.values()];
}

// ── Video çözümleme ─────────────────────────────────────────────────────────

function pickMovie(movies = []) {
  const withHls = movies.filter((m) => m?.hls_h264);
  if (withHls.length === 0) return null;
  const gameplay = withHls.find((m) => /gameplay|game play|oynanış/i.test(m.name || ''));
  if (gameplay) return gameplay;
  return withHls.find((m) => m.highlight) || withHls[0];
}

async function resolveItem(appid, name, lang) {
  const d = await getSteamDetailsCached(appid, lang);
  if (!d || !d.movies?.length) return null;
  if (isSteamDataAdult(d)) return null;

  const movie = pickMovie(d.movies);
  if (!movie) return null;

  return {
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
  };
}

/**
 * Havuzu çözümler. Appid başına önbellek sayesinde yalnızca DAHA ÖNCE
 * görülmemiş oyunlar için ağa çıkılır.
 */
async function resolvePool(pool, lang) {
  // 1) Önbellekte olanları tek turda oku
  const cached = await redisPipeline(pool.map((g) => ['GET', itemKey(lang, g.appid)]));
  const resolved = [];
  const misses = [];

  pool.forEach((g, i) => {
    const raw = cached?.[i];
    if (raw === undefined || raw === null) { misses.push(g); return; }
    if (raw === 'null') return;                 // videosu olmadığı biliniyor
    const item = parseJSON(raw);
    if (item) resolved.push({ ...item, w: g.w });
  });

  // 2) Eksikleri sınırlı paralellikle çöz
  let cursor = 0;
  const writes = [];
  async function worker() {
    while (cursor < misses.length && resolved.length < MAX_FEED) {
      const g = misses[cursor++];
      try {
        const item = await resolveItem(g.appid, g.name, lang);
        if (item) {
          resolved.push({ ...item, w: g.w });
          writes.push(['SET', itemKey(lang, g.appid), JSON.stringify(item), 'EX', String(ITEM_TTL_SEC)]);
        } else {
          writes.push(['SET', itemKey(lang, g.appid), 'null', 'EX', String(MISS_TTL_SEC)]);
        }
      } catch { /* bu oyunu atla */ }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (writes.length) redisPipeline(writes).catch(() => {});
  return resolved.slice(0, MAX_FEED);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') === 'tr' ? 'tr' : 'en';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  // İstemci oturum başına bir seed üretiyor → aynı oturumda sayfalama tutarlı,
  // farklı oturumlarda sıra değişiyor.
  const seed = searchParams.get('seed') || 'default';

  try {
    let pool = await redisGetJSON(poolKey(lang)).catch(() => null);

    if (!Array.isArray(pool) || pool.length === 0) {
      const raw = await buildPool();
      pool = await resolvePool(raw, lang);
      if (pool.length > 0) {
        redisCmd(['SET', poolKey(lang), JSON.stringify(pool), 'EX', String(POOL_TTL_SEC)])
          .catch(() => {});
      }
    }

    // Ağırlıklı rastgele sıra — yeni çıkanlar öne çıkma eğiliminde
    const ordered = weightedShuffle(pool, mulberry32(hashSeed(seed + ':' + lang)));

    const start = (page - 1) * PAGE_SIZE;
    const slice = ordered.slice(start, start + PAGE_SIZE)
      .map(({ w, ...item }) => item);    // ağırlık istemciye gitmesin

    return NextResponse.json({
      results: slice,
      page,
      hasMore: start + PAGE_SIZE < ordered.length,
      total: ordered.length,
    });
  } catch (err) {
    console.error('video-feed hatası:', err.message);
    return NextResponse.json({ results: [], page, hasMore: false, total: 0 });
  }
}
