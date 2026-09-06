// ─────────────────────────────────────────────────────────────────────────────
// Fiyat servisi — istemci tarafı önbellek + istek tekilleştirme + eşzamanlılık
// limiti.
//
// Amaç: Liste kartlarının her birinin ayrı /api/card-price isteği atmasını (N+1)
// ve FlashList geri-dönüşümünde (recycling) aynı fiyatın tekrar tekrar
// çekilmesini önlemek. Saf JS'tir (React'e bağlı değil) → kolay test edilebilir.
//
// ── DİSK: TEK BLOK, queryCache'in AKSİNE ────────────────────────────────────
//
// queryCache anahtar başına ayrı satır yazıyor; burada TEK blok var ve bu bir
// tutarsızlık değil, kardinalite farkı:
//
//   sorgu yanıtı  : ~12 KB × 120 kayıt  → satır başına ayrı yazım şart
//   fiyat kaydı   :   115 B × 400 kayıt → toplam ~46 KB
//
// (115 B ölçüldü: /api/card-price?slug=elden-ring, 5 Eylül 2026.) 400 fiyatı
// 400 ayrı AsyncStorage satırına yazmak, tek bir 46 KB'lık satır yerine 400
// SQLite kaydı demekti — bu boyutta blok daha ucuz.
//
// ── DİSK ÖMRÜ 1 GÜN, LİSTELERİN 7 GÜNÜ DEĞİL ────────────────────────────────
// Fiyat buradaki en oynak veri: indirim başlar/biter. Bir haftalık trend
// listesi hâlâ bilgi taşır, bir haftalık fiyat YANLIŞ bilgi taşır. Süre
// dolduğunda kayıt gösterilmiyor — boş fiyat, yanlış fiyattan iyidir.
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

import { fetchCardPrice } from '../api/games';
import { cevrimdisiMi } from './net';

const TTL_MS = 15 * 60 * 1000;   // 15 dk — sunucu önbelleğiyle uyumlu
const MAX_CONCURRENT = 6;        // aynı anda en fazla eşzamanlı istek
const MAX_CACHE = 800;           // bellek koruması (yaklaşık üst sınır)

const DISK_KEY = 'gr_price_cache';
const DISK_MAX = 400;            // diske en yeni bu kadar kayıt (~46 KB)
const DISK_MAX_AGE = 24 * 60 * 60 * 1000;
const YAZ_GECIKME = 1500;

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
  if (!entry) return undefined;
  if (isFresh(entry)) return entry.data;
  // ── ÇEVRİMDIŞIYKEN BAYAT FİYAT DA GÖSTERİLİR ──
  // TTL "ne zaman tazele" sorusunun cevabı. Çevrimdışında tazeleme diye bir
  // seçenek yok; `undefined` dönmek kartı boş bırakırdı. Kaydın bayatlığı
  // sayfanın tepesindeki çevrimdışı bandında zaten yazıyor — ve disk ömrü
  // 1 günle sınırlı, yani gösterilen en kötü ihtimalle dünkü fiyat.
  if (cevrimdisiMi()) return entry.data;
  return undefined;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
  yazmaPlanla();
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

// ── Disk ────────────────────────────────────────────────────────────────────

let yazZamanlayici = null;

function yazmaPlanla() {
  if (yazZamanlayici) return;
  yazZamanlayici = setTimeout(() => { yaz(); }, YAZ_GECIKME);
}

async function yaz() {
  if (yazZamanlayici) { clearTimeout(yazZamanlayici); yazZamanlayici = null; }
  try {
    // En YENİ DISK_MAX kayıt: çevrimdışı değeri yaşla düşüyor.
    const kayitlar = [...cache.entries()]
      .filter(([, v]) => v && v.data !== undefined)
      .sort((a, b) => b[1].ts - a[1].ts)
      .slice(0, DISK_MAX)
      .map(([k, v]) => [k, { d: v.data, t: v.ts }]);
    await AsyncStorage.setItem(DISK_KEY, JSON.stringify(kayitlar));
  } catch {
    // Kota/disk hatası → bellek önbelleği çalışmaya devam eder.
  }
}

try {
  AppState.addEventListener('change', (durum) => {
    if (durum !== 'active' && yazZamanlayici) yaz();
  });
} catch { /* AppState yoksa (test) kalıcılık yine çalışır */ }

let hazirCoz;
const hazirSoz = new Promise((r) => { hazirCoz = r; });
let yuklemeBasladi = false;

async function yukle() {
  try {
    const ham = await AsyncStorage.getItem(DISK_KEY);
    if (ham) {
      const simdi = Date.now();
      for (const [k, v] of JSON.parse(ham)) {
        if (!v || v.d === undefined || !v.t) continue;
        if (simdi - v.t > DISK_MAX_AGE) continue;
        // Uçuşta gelmiş taze kaydı EZME.
        if (!cache.has(k)) cache.set(k, { data: v.d, ts: v.t });
      }
    }
  } catch {
    // Bozuk/okunamayan blok → boş önbellekle devam.
  } finally {
    hazirCoz();
  }
}

/** Diskten yükleme (bir kez başlar) — ilk istekten önce beklenir. */
export function fiyatHazir() {
  if (!yuklemeBasladi) { yuklemeBasladi = true; yukle(); }
  return hazirSoz;
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

  const promise = fiyatHazir().then(() => {
    // Disk yüklemesi ARADA yetişmiş olabilir → ağa hiç çıkma.
    const sonra = getCachedPrice(game);
    if (sonra !== undefined) return sonra;

    // ── ÇEVRİMDIŞI: 24 KARTLIK IZGARA 24 MAHKÛM İSTEK ATMASIN ──
    // Elde kayıt yoksa gösterilecek fiyat da yok; istek atmak yalnızca pil ve
    // zaman aşımı üretirdi. (Elde kayıt VARSA yukarıdaki okuma onu zaten
    // döndürdü — bu satıra ancak gerçekten boşken gelinir.)
    if (cevrimdisiMi()) return null;

    return new Promise((resolve) => {
      queue.push(() =>
        fetchCardPrice({ slug: game.rawgSlug || game.slug || '', name: game.name, hasSteam: !!game.hasSteam })
          .then((d) => {
            const data = (d && d.price != null) ? d : null;
            setCache(key, data);
            resolve(data);
          })
          .catch(() => resolve(null))
      );
      pump();
    });
  }).finally(() => { inflight.delete(key); });

  inflight.set(key, promise);
  return promise;
}
