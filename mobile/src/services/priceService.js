// ─────────────────────────────────────────────────────────────────────────────
// Fiyat servisi — istemci tarafı önbellek + istek tekilleştirme + eşzamanlılık
// limiti.
//
// Amaç: Liste kartlarının her birinin ayrı /api/card-price isteği atmasını (N+1)
// ve FlashList geri-dönüşümünde (recycling) aynı fiyatın tekrar tekrar
// çekilmesini önlemek. Saf JS'tir (React'e bağlı değil) → kolay test edilebilir.
// ─────────────────────────────────────────────────────────────────────────────
import { fetchCardPrice } from '../api/games';

const TTL_MS = 15 * 60 * 1000;   // 15 dk — sunucu önbelleğiyle uyumlu
const MAX_CONCURRENT = 6;        // aynı anda en fazla eşzamanlı istek
const MAX_CACHE = 800;           // bellek koruması (yaklaşık üst sınır)

const cache = new Map();         // key -> { data: (obj|null), ts }
const inflight = new Map();      // key -> Promise<obj|null>
const queue = [];                // eşzamanlılık limiti için bekleyen görevler
let active = 0;

// Oyun için kararlı önbellek anahtarı
export function priceKey(game) {
  if (!game) return '';
  return String(game.rawgSlug || game.slug || game.name || '').toLowerCase().trim();
}

function isFresh(entry) {
  return !!entry && (Date.now() - entry.ts) < TTL_MS;
}

/**
 * Senkron önbellek okuması.
 * @returns taze kayıt varsa fiyat objesi (veya bulunamadıysa null); yoksa undefined.
 */
export function getCachedPrice(game) {
  const entry = cache.get(priceKey(game));
  return isFresh(entry) ? entry.data : undefined;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
  if (cache.size <= MAX_CACHE) return;
  // Önce bayatlamış kayıtları temizle
  const now = Date.now();
  for (const [k, v] of cache) {
    if (now - v.ts >= TTL_MS) cache.delete(k);
  }
  // Hâlâ büyükse en eski eklenenlerden kırp (Map ekleme sırasını korur)
  if (cache.size > MAX_CACHE) {
    let excess = cache.size - MAX_CACHE;
    for (const k of cache.keys()) {
      if (excess-- <= 0) break;
      cache.delete(k);
    }
  }
}

function pump() {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const task = queue.shift();
    active++;
    task().finally(() => { active--; pump(); });
  }
}

/**
 * Fiyatı getirir: önbellek → in-flight dedup → eşzamanlılık limitli kuyruk.
 * @returns Promise<fiyat objesi | null>
 */
export function requestPrice(game) {
  if (!game || game.isFree) return Promise.resolve(null);
  const key = priceKey(game);
  if (!key) return Promise.resolve(null);

  const cached = getCachedPrice(game);
  if (cached !== undefined) return Promise.resolve(cached);

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = new Promise((resolve) => {
    queue.push(() =>
      fetchCardPrice({ slug: game.rawgSlug || game.slug || '', name: game.name, hasSteam: !!game.hasSteam })
        .then((d) => {
          const data = (d && d.price != null) ? d : null;
          setCache(key, data);
          resolve(data);
        })
        .catch(() => resolve(null))
        .finally(() => inflight.delete(key))
    );
    pump();
  });

  inflight.set(key, promise);
  return promise;
}
