import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// Sorgu önbelleği — bağımlılıksız, saf JS.
// TTL önbellek + in-flight istek tekilleştirme (dedup) + abonelik (SWR için).
// React'e bağlı değildir → kolay test edilebilir. useQuery hook'u bunu tüketir.
// ─────────────────────────────────────────────────────────────────────────────
const store = new Map();          // key -> { data, ts, error, promise, listeners:Set }
const MAX_ENTRIES = 120;
export const DEFAULT_TTL = 5 * 60 * 1000; // 5 dk
const CACHE_KEY = 'gr_query_cache';

function ensure(key) {
  let e = store.get(key);
  if (!e) {
    e = { data: undefined, ts: 0, error: null, promise: null, listeners: new Set() };
    store.set(key, e);
  }
  return e;
}

export function getEntry(key) {
  return store.get(key);
}

export function isFresh(entry, ttl = DEFAULT_TTL) {
  return !!entry && entry.data !== undefined && (Date.now() - entry.ts) < ttl;
}

export function subscribe(key, cb) {
  const e = ensure(key);
  e.listeners.add(cb);
  return () => { e.listeners.delete(cb); };
}

function notify(e) {
  e.listeners.forEach((cb) => cb());
}

// Bellek koruması: aboneliği olmayan en eski girdileri sil
function prune() {
  if (store.size <= MAX_ENTRIES) return;
  const evictable = [];
  for (const [k, e] of store) {
    if (e.listeners.size === 0 && !e.promise) evictable.push([k, e.ts]);
  }
  evictable.sort((a, b) => a[1] - b[1]);
  let toRemove = store.size - MAX_ENTRIES;
  for (const [k] of evictable) {
    if (toRemove-- <= 0) break;
    store.delete(k);
  }
}

// Önbelleği cihaz diskine kaydet
async function persistCache() {
  try {
    const entries = [];
    for (const [k, e] of store.entries()) {
      if (e.data !== undefined && !k.startsWith('foryou-cand:')) {
        entries.push([k, { data: e.data, ts: e.ts }]);
      }
    }
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.warn('Cache persistence error:', err);
  }
}

// Önbelleği cihaz diskinden geri yükle (Offline erişim desteği için)
export async function initQueryCache() {
  try {
    const dataStr = await AsyncStorage.getItem(CACHE_KEY);
    if (dataStr) {
      const entries = JSON.parse(dataStr);
      for (const [k, v] of entries) {
        const e = ensure(k);
        e.data = v.data;
        e.ts = v.ts;
      }
    }
  } catch (err) {
    console.warn('Cache loading error:', err);
  }
}

/**
 * Veriyi getir: taze önbellek → in-flight dedup → fetcher.
 * @param key benzersiz sorgu anahtarı
 * @param fetcher () => Promise<data>  (key'in saf fonksiyonu olmalı)
 * @param force taze olsa bile yeniden çeker
 * @returns Promise<data>
 */
export function fetchQuery(key, fetcher, { ttl = DEFAULT_TTL, force = false } = {}) {
  const e = ensure(key);
  if (!force && isFresh(e, ttl)) return Promise.resolve(e.data);
  if (e.promise) return e.promise; // dedup

  e.promise = Promise.resolve()
    .then(fetcher)
    .then((data) => {
      e.data = data;
      e.ts = Date.now();
      e.error = null;
      persistCache(); // Arka planda kaydet
      return data;
    })
    .catch((err) => { e.error = err; throw err; })
    .finally(() => { e.promise = null; notify(e); prune(); });

  notify(e); // "revalidating" durumunu bildir
  return e.promise;
}

// Test/geliştirme için önbelleği temizle
export function clearQueryCache() {
  store.clear();
}
