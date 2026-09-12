import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

import { cevrimdisiMi } from './net';

// ─────────────────────────────────────────────────────────────────────────────
// Sorgu önbelleği — bağımlılıksız, saf JS.
// TTL önbellek + in-flight istek tekilleştirme (dedup) + abonelik (SWR için).
// React'e bağlı değildir → kolay test edilebilir. useQuery hook'u bunu tüketir.
//
// ── DİSK KATMANI: TEK BLOK DEĞİL, ANAHTAR BAŞINA ────────────────────────────
//
// Önceki sürüm tüm haritayı TEK bir `gr_query_cache` anahtarına, HER başarılı
// istekten sonra baştan serileştirerek yazıyordu. İki bedeli vardı:
//
//   1. YAZIM MALİYETİ. Ölçüldü (canlı uçlar, 5 Eylül 2026):
//        /api/games?page=1&num=24 → 12.673 B
//        /api/trending            →  4.515 B
//        /api/news                → 23.252 B
//      40 anahtarlık normal bir oturumda blok ~500 KB. Her fetch o 500 KB'ı
//      JS iş parçacığında yeniden serileştiriyordu — kaydırma sırasında.
//
//   2. TOPLU KAYIP. AsyncStorage Android'de SQLite'tır. MAX_ENTRIES=120 ile
//      blok teorik olarak ~2,7 MB'a çıkar; 2 MB'ı aşan tek satırın okunması
//      "Row too big to fit into CursorWindow" ile düşer (varsayılan veritabanı
//      tavanı da 6 MB). Blok o boya varınca geri yükleme tümden başarısız olur
//      ve ÇEVRİMDIŞI VERİNİN TAMAMI tek seferde gider.
//
// Artık her sorgu kendi anahtarında (`gr_qc:<key>`), yazımlar sönümlenip toplu
// (`multiSet`) gidiyor ve iki tavan var: girdi başına 128 KB, toplam 3 MB.
// Tavanı aşan en ESKİ kayıtlar düşer — çevrimdışı rezervi sınırsız büyüyemez.
//
// ── GERİ YÜKLEME ARTIK HABER VERİYOR ────────────────────────────────────────
//
// Eski `initQueryCache` `e.data`'yı yazıp susuyordu. React'te efektler
// çocuktan ebeveyne akar: ekranların useQuery efektleri, RootLayout'un geri
// yükleme efektinden ÖNCE koşar. Soğuk açılışta sıra şuydu: ekran abone olur →
// ağa çıkar → uçak modunda düşer → hata durumuna geçer → veri diskten gelir
// ama KİMSE HABER ALMAZ. Disk dolu, ekran boş. `notify` o yüzden şart.
// ─────────────────────────────────────────────────────────────────────────────
const store = new Map();          // key -> { data, ts, error, promise, listeners:Set }
const MAX_ENTRIES = 120;
export const DEFAULT_TTL = 5 * 60 * 1000; // 5 dk

// ── Disk ayarları ───────────────────────────────────────────────────────────
const DISK_PREFIX = 'gr_qc:';
const LEGACY_KEY = 'gr_query_cache';      // 2.6.0 ve öncesinin tek-blok biçimi

// Çevrimdışı rezervin ömrü. TTL'den (5 dk) BAĞIMSIZ: TTL "ne zaman tazele"
// sorusunun cevabı, bu ise "elde başka bir şey yokken hâlâ göstermeye değer
// mi" sorusunun. Bir haftalık trend listesi, boş ekrandan iyidir.
export const OFFLINE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const MAX_ENTRY_CHARS = 128 * 1024;       // ölçülen en büyük yanıtın ~5 katı
const MAX_DISK_CHARS = 3 * 1024 * 1024;   // Android'in 6 MB tavanının yarısı
const PERSIST_DEBOUNCE = 800;
const NO_PERSIST = /^foryou-cand:/;       // türetilmiş aday kümesi — diske değmez

const disk = new Map();           // key -> { chars, ts } (diskte NE olduğunun aynası)
const dirty = new Set();          // yazılmayı bekleyen anahtarlar
let persistTimer = null;

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

/**
 * Verinin zaman damgası. Veri yoksa 0.
 * Çevrimdışı bandı ("{n} güncellendi") bunu okuyor; `useQuery` kullanmayan
 * doğrudan `fetchQuery` tüketicileri (games.jsx) için tek erişim yolu.
 */
export function cacheTs(key) {
  const e = store.get(key);
  return (e && e.data !== undefined && e.ts) ? e.ts : 0;
}

/**
 * Önbellekteki LİSTE yanıtlarında bir oyunu ara.
 *
 * ── NEDEN TARAMA, NEDEN YÖNLENDİRMEYE PARAMETRE EKLEMEK DEĞİL ──
 * Detay ekranı çevrimdışıyken yalnız rota parametrelerine (`id`, `name`,
 * `image`, `slug`) düşüyordu: kapak ve ad. Oysa aynı oyunun tür, metacritic,
 * çıkış tarihi ve mağaza alanları listeden gelen kayıtta ZATEN duruyor ve o
 * kayıt diskte kalıcı.
 *
 * Nesneyi yönlendirmeyle taşımak 20 ayrı `/game/...` çağrı yerine dokunmak
 * demekti; üstelik bildirimden, sohbetten ve paylaşım eklentisinden gelen
 * açılışlarda taşınacak bir nesne YOK. Tarama tek noktada duruyor ve o
 * yolları da kapsıyor.
 *
 * Maliyet sınırlı: en fazla MAX_ENTRIES(120) × sayfa başına ~24 kayıt ve
 * yalnızca detay yanıtı ELDE YOKKEN çağrılıyor.
 *
 * @returns liste kaydı | null
 */
export function oyunuOnbellektenBul(id, slug) {
  const kimlik = id ? String(id) : null;
  const s = slug ? String(slug).toLowerCase() : null;
  if (!kimlik && !s) return null;

  for (const e of store.values()) {
    const liste = e.data?.results;
    if (!Array.isArray(liste)) continue;
    for (const g of liste) {
      // `name` ŞART: `results` alanı yalnız oyun listelerinde değil haber
      // yanıtında da var. Haber kaydının adı `title`, oyununki `name` — kimlik
      // çakışsa bile bir haber nesnesi detay ekranına sızamaz.
      if (!g || !g.name) continue;
      if (kimlik && String(g.id) === kimlik) return g;
      if (s && (String(g.rawgSlug || '').toLowerCase() === s
             || String(g.slug || '').toLowerCase() === s)) return g;
    }
  }
  return null;
}

export function subscribe(key, cb) {
  const e = ensure(key);
  e.listeners.add(cb);
  return () => { e.listeners.delete(cb); };
}

function notify(e) {
  e.listeners.forEach((cb) => cb());
}

// Bellek koruması: aboneliği olmayan en eski girdileri sil.
// DİSKE DOKUNMAZ — disk çevrimdışı rezervidir, bellek tavanı onu ilgilendirmez.
// (Bedeli: bellekten düşmüş bir anahtara aynı oturumda dönülürse diskteki
// kopya okunmaz, yeniden çekilir. Geri yükleme açılışta bir kez yapılıyor;
// 120 girdilik tavana tek oturumda varmak nadir.)
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

// ── Yazım ───────────────────────────────────────────────────────────────────

function schedulePersist(key) {
  if (NO_PERSIST.test(key)) return;
  dirty.add(key);
  if (persistTimer) return;
  persistTimer = setTimeout(() => { flushPersist(); }, PERSIST_DEBOUNCE);
}

async function flushPersist() {
  if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
  if (dirty.size === 0) return;

  const yaz = [];
  const sil = [];

  for (const key of dirty) {
    const e = store.get(key);
    const diskKey = DISK_PREFIX + key;
    if (!e || e.data === undefined) {
      if (disk.delete(key)) sil.push(diskKey);
      continue;
    }
    let json;
    try { json = JSON.stringify({ d: e.data, t: e.ts }); } catch { json = null; }
    // Serileştirilemeyen ya da tek başına tavanı aşan yanıt diske ALINMAZ:
    // bellekte yaşamaya devam eder, yalnızca çevrimdışı rezervine girmez.
    if (!json || json.length > MAX_ENTRY_CHARS) {
      if (disk.delete(key)) sil.push(diskKey);
      continue;
    }
    yaz.push([diskKey, json]);
    disk.set(key, { chars: json.length, ts: e.ts });
  }
  dirty.clear();

  // Toplam bütçe: aşılırsa en ESKİ kayıtlar gider. Ölçüt yaş, kullanım sıklığı
  // değil: çevrimdışı bir yanıtın değeri yaşlandıkça düşer.
  let toplam = 0;
  for (const v of disk.values()) toplam += v.chars;
  if (toplam > MAX_DISK_CHARS) {
    const sirali = [...disk.entries()].sort((a, b) => a[1].ts - b[1].ts);
    for (const [key, v] of sirali) {
      if (toplam <= MAX_DISK_CHARS) break;
      toplam -= v.chars;
      disk.delete(key);
      const diskKey = DISK_PREFIX + key;
      sil.push(diskKey);
      // Aynı turda yazılacaktıysa yazma listesinden de çıkar — yoksa yazıp
      // hemen silmek gibi anlamsız bir çift işlem olurdu.
      const i = yaz.findIndex(([dk]) => dk === diskKey);
      if (i >= 0) yaz.splice(i, 1);
    }
  }

  try {
    if (yaz.length) await AsyncStorage.multiSet(yaz);
    if (sil.length) await AsyncStorage.multiRemove(sil);
  } catch {
    // Kota dolu / disk hatası. Bellek önbelleği çalışmaya devam eder;
    // kaybedilen tek şey ÇEVRİMDIŞI dayanıklılıktır.
  }
}

// Arka plana geçerken bekleyen yazımı ŞİMDİ indir. 800 ms'lik sönümleme
// penceresinde uygulamadan çıkılırsa o istek diske hiç ulaşmazdı — tam da
// çevrimdışı senaryosunun başlangıcı (kullanıcı çıkar, uçağa biner, döner).
try {
  AppState.addEventListener('change', (durum) => {
    if (durum !== 'active' && dirty.size > 0) flushPersist();
  });
} catch { /* AppState yoksa (test ortamı) kalıcılık yine de çalışır */ }

// ── Geri yükleme ────────────────────────────────────────────────────────────

let readyResolve;
const readyPromise = new Promise((r) => { readyResolve = r; });
let restoreStarted = false;

// Uçuştaki taze veriyi EZMEZ: geri yükleme, ağ isteğiyle yarışıyor olabilir.
function seed(key, data, ts) {
  if (data === undefined || !ts || Date.now() - ts > OFFLINE_MAX_AGE) return false;
  const e = ensure(key);
  if (e.data !== undefined) return false;
  e.data = data;
  e.ts = ts;
  notify(e);   // ← eski sürümde eksik olan satır; bkz. dosya başlığı
  return true;
}

async function restore() {
  try {
    const tumu = await AsyncStorage.getAllKeys();
    const sil = [];

    // Eski tek-blok biçimi → yeni biçime taşı. Taşınmasaydı güncelleme alan
    // kullanıcı önbelleğini sıfırdan doldururdu.
    if (tumu.includes(LEGACY_KEY)) {
      try {
        const ham = await AsyncStorage.getItem(LEGACY_KEY);
        for (const [k, v] of JSON.parse(ham || '[]')) {
          if (seed(k, v?.data, v?.ts)) schedulePersist(k);
        }
      } catch { /* bozuk blok → yok say */ }
      sil.push(LEGACY_KEY);
    }

    const anahtarlar = tumu.filter((k) => k.startsWith(DISK_PREFIX));
    if (anahtarlar.length) {
      const ciftler = await AsyncStorage.multiGet(anahtarlar);
      for (const [diskKey, json] of ciftler) {
        if (!json) continue;
        const key = diskKey.slice(DISK_PREFIX.length);
        let v = null;
        try { v = JSON.parse(json); } catch { /* bozuk kayıt */ }
        // Yaşı geçmiş / okunamayan kayıt geri yüklenmez VE diskten silinir:
        // yoksa bir daha hiç kullanılmayacak baytlar bütçeyi yerdi.
        if (!v || v.d === undefined || !v.t || Date.now() - v.t > OFFLINE_MAX_AGE) {
          sil.push(diskKey);
          continue;
        }
        seed(key, v.d, v.t);
        disk.set(key, { chars: json.length, ts: v.t });
      }
    }

    if (sil.length) AsyncStorage.multiRemove(sil).catch(() => {});
  } catch {
    // Okunamadı → boş önbellekle devam. Açılış BLOKLANMAZ.
  } finally {
    readyResolve();
  }
}

/**
 * Diskten geri yüklemeyi başlatır (bir kez) ve bittiğinde çözülen sözü döner.
 *
 * @param enCokMs Beklemenin üst sınırı. Geri yükleme yavaşsa (çok anahtar,
 *   yavaş depolama) açılış isteği süresiz beklemesin diye var: süre dolunca
 *   ağa çıkılır, geri yükleme arkadan gelir ve `seed` taze veriyi ezmediği
 *   için iki yol çakışmaz. 0 verilirse tavan uygulanmaz (açılış çağrısı).
 */
export function whenCacheReady(enCokMs = 400) {
  if (!restoreStarted) { restoreStarted = true; restore(); }
  if (!enCokMs) return readyPromise;
  return Promise.race([
    readyPromise,
    new Promise((r) => setTimeout(r, enCokMs)),
  ]);
}

/** Geriye dönük ad — açılışta (app/_layout.jsx) çağrılıyor. */
export function initQueryCache() {
  return whenCacheReady(0);
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

  e.promise = whenCacheReady()
    .then(() => {
      // Disk geri yüklemesi ARADA yetişmiş olabilir: veri tazeyse ağa hiç
      // çıkma. Bu kontrol olmasaydı her soğuk açılış, diskte hazır duran
      // veriyi görmeden istek atardı.
      if (!force && isFresh(e, ttl)) return e.data;

      // ── ÇEVRİMDIŞIYKEN AĞA ÇIKMA ──
      // Üç koşul birden aranıyor:
      //   • `!force`  → kullanıcı "yenile" dediyse DENENİR. Denenmeseydi düğme
      //                 hiçbir şey yapmaz, uygulama bozuk görünürdü.
      //   • veri VAR  → gösterilecek bir şey yoksa istek yine atılır: NetInfo
      //                 yanılmış olabilir ve elde alternatif yok. Bu kural,
      //                 ölçüm hatasının çalışan bir isteği ASLA engellememesini
      //                 garanti ediyor.
      //   • çevrimdışı
      // Hata KAYDEDİLMİYOR: bu bir başarısızlık değil, bilinçli atlama. Bandın
      // "Çevrimdışısın" mı "Bağlanılamadı" mı diyeceği buna bağlı.
      if (!force && e.data !== undefined && cevrimdisiMi()) return e.data;

      return fetcher();
    })
    .then((data) => {
      // Önbellekten dönen AYNI referansta `ts` tazelenmez: tazelenseydi bayat
      // veri kendini taze ilan eder ve bir daha hiç yenilenmezdi.
      if (data !== e.data) {
        e.data = data;
        e.ts = Date.now();
        schedulePersist(key);
      }
      e.error = null;
      return data;
    })
    .catch((err) => { e.error = err; throw err; })
    .finally(() => { e.promise = null; notify(e); prune(); });

  notify(e); // "revalidating" durumunu bildir
  return e.promise;
}

// Test/geliştirme için önbelleği temizle. Diski de siler — yoksa bir sonraki
// açılışta temizlenen veri geri gelirdi.
export function clearQueryCache() {
  store.clear();
  disk.clear();
  dirty.clear();
  if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
  AsyncStorage.getAllKeys()
    .then((k) => AsyncStorage.multiRemove(k.filter((x) => x.startsWith(DISK_PREFIX))))
    .catch(() => {});
}
