// ─────────────────────────────────────────────────────────────────────────────
// Görülen oyunlar deposu — feed tazeliği için. Detayına girilen oyun id'lerini
// kalıcı saklar; skorlamada hafif ceza (scoreGame seenIds −0.25) uygulanır.
// Saf JS singleton + AsyncStorage (tasteProfile deseni). Süre + cap ile sınırlı.
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'gr_seen';
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
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) seen = JSON.parse(raw) || {};
      } catch { /* boş depoyla devam */ }
      loaded = true;
      emit();
      return seen;
    })();
  }
  return loadPromise;
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seen)).catch(() => {});
  }, 800);
}

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

// Ayar/gizlilik için sıfırla
export async function resetSeen() {
  seen = {};
  loaded = true;
  scheduleSave();
  emit();
}
