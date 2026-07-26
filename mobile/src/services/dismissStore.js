// ─────────────────────────────────────────────────────────────────────────────
// "İlgilenmiyorum" deposu — kullanıcının feed'den kaldırdığı oyun id'leri.
// rankCandidates bunları SERT eler (skorlamadan önce havuzdan çıkar).
// Saf JS singleton + AsyncStorage (seenStore deseni). Uzun süre + cap ile sınırlı.
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'gr_dismissed';
const EXPIRY_DAYS = 180;   // "İlgilenmiyorum" güçlü ama sonsuz değil
const MAX_ITEMS   = 300;   // depo sınırı — en eskiyi at
const DAY         = 86400000;

let dismissed = {};        // { id: dismissedTs }
let loaded = false;
let loadPromise = null;
let saveTimer = null;
const listeners = new Set();

function emit() { listeners.forEach((l) => l()); }

// Açılışta yükle (idempotent + eşzamanlı çağrı dedup)
export function loadDismissed() {
  if (loaded) return Promise.resolve(dismissed);
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) dismissed = JSON.parse(raw) || {};
      } catch { /* boş depoyla devam */ }
      loaded = true;
      emit();
      return dismissed;
    })();
  }
  return loadPromise;
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed)).catch(() => {});
  }, 800);
}

// Bir oyunu "İlgilenmiyorum" olarak işaretle
export async function recordDismiss(id) {
  if (id == null) return;
  if (!loaded) await loadDismissed();

  dismissed = { ...dismissed, [String(id)]: Date.now() };

  // cap aşıldıysa en eskileri at
  const keys = Object.keys(dismissed);
  if (keys.length > MAX_ITEMS) {
    keys.sort((a, b) => dismissed[a] - dismissed[b]); // eskiden yeniye
    const trimmed = {};
    keys.slice(keys.length - MAX_ITEMS).forEach((k) => { trimmed[k] = dismissed[k]; });
    dismissed = trimmed;
  }

  scheduleSave();
  emit();
}

export function subscribeDismissed(cb) { listeners.add(cb); return () => listeners.delete(cb); }

// Süresi dolmamış dismiss id'lerinin Set'i (anahtarlar String)
export function getDismissedSet() {
  const cutoff = Date.now() - EXPIRY_DAYS * DAY;
  const set = new Set();
  for (const k in dismissed) if (dismissed[k] >= cutoff) set.add(k);
  return set;
}

// Ayar/gizlilik için sıfırla
export async function resetDismissed() {
  dismissed = {};
  loaded = true;
  scheduleSave();
  emit();
}
