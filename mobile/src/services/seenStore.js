// ─────────────────────────────────────────────────────────────────────────────
// Görülen oyunlar deposu — feed tazeliği için. Detayına girilen oyun id'lerini
// kalıcı saklar; skorlamada hafif ceza (scoreGame seenIds −0.25) uygulanır.
// Saf JS singleton + AsyncStorage (tasteProfile deseni). Süre + cap ile sınırlı.
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scopedKey, ownerReady, registerScopedStore } from './owner';

const STORAGE_KEY = 'gr_seen';   // taban ad — gerçek anahtar sahibe göre türetilir
const EXPIRY_DAYS = 45;    // bu süre sonra oyun tekrar yüzeye çıkabilir
const MAX_SEEN    = 500;   // depo sınırı — en eskiyi at
const DAY         = 86400000;

let seen = {};             // { id: lastSeenTs }
let loaded = false;
let loadPromise = null;
let saveTimer = null;
const listeners = new Set();

function emit() { listeners.forEach((l) => l()); }

// Açılışta yükle (idempotent + eşzamanlı çağrı dedup)
export function loadSeen() {
  if (loaded) return Promise.resolve(seen);
  if (!loadPromise) {
    loadPromise = (async () => {
      await ownerReady();   // sahip çözülmeden okuma yanlış kovaya bakar
      try {
        const raw = await AsyncStorage.getItem(scopedKey(STORAGE_KEY));
        if (raw) seen = JSON.parse(raw) || {};
      } catch { /* boş depoyla devam */ }
      loaded = true;
      emit();
      return seen;
    })();
  }
  return loadPromise;
}

function writeNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  return AsyncStorage.setItem(scopedKey(STORAGE_KEY), JSON.stringify(seen)).catch(() => {});
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(writeNow, 800);
}

// Hesap değişiminde: bekleyen yazma ESKİ kovaya iner, sonra yenisinden yüklenir.
registerScopedStore({
  keys: [STORAGE_KEY],
  flush: () => (saveTimer ? writeNow() : null),
  rebind: async () => {
    seen = {}; loaded = false; loadPromise = null;
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    await loadSeen();
  },
});

// Bir oyunu "görüldü" olarak işaretle (detay açılışında)
export async function recordSeen(id) {
  if (id == null) return;
  if (!loaded) await loadSeen();

  seen = { ...seen, [String(id)]: Date.now() };

  // cap aşıldıysa en eskileri at
  const keys = Object.keys(seen);
  if (keys.length > MAX_SEEN) {
    keys.sort((a, b) => seen[a] - seen[b]); // eskiden yeniye
    const trimmed = {};
    keys.slice(keys.length - MAX_SEEN).forEach((k) => { trimmed[k] = seen[k]; });
    seen = trimmed;
  }

  scheduleSave();
  emit();
}

export function subscribeSeen(cb) { listeners.add(cb); return () => listeners.delete(cb); }

// Süresi dolmamış görülen id'lerin Set'i (skorlama için; anahtarlar String)
export function getSeenSet() {
  const cutoff = Date.now() - EXPIRY_DAYS * DAY;
  const set = new Set();
  for (const k in seen) if (seen[k] >= cutoff) set.add(k);
  return set;
}

/** Belirtilen andan sonraki görülme ZAMANLARI (günlük kırılım için). */
export function seenTimesSince(sinceTs) {
  const out = [];
  for (const k in seen) if (seen[k] >= sinceTs) out.push(seen[k]);
  return out;
}

/** Belirtilen andan sonra görülen oyun sayısı (haftalık istatistik için). */
export function seenCountSince(sinceTs) {
  let n = 0;
  for (const k in seen) if (seen[k] >= sinceTs) n++;
  return n;
}

// Ayar/gizlilik için sıfırla
export async function resetSeen() {
  seen = {};
  loaded = true;
  scheduleSave();
  emit();
}
