// ─────────────────────────────────────────────────────────────────────────────
// "İlgimi çekti" deposu — kullanıcının swipe ile sağa kaydırdığı oyunlar.
// dismissStore'un aynadaki karşılığı: aynı desen, ters işaret.
//
// Neden ayrı bir depo? Zevk profili yalnızca TÜR ağırlığı biriktiriyor, hangi
// OYUNUN beğenildiğini tutmuyor. Haftalık istatistikler (Faz 4) ve kullanıcının
// beğenilerini geri görebilmesi için oyun kimliği + zaman damgası gerekiyor.
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'gr_liked';
const MAX_ITEMS   = 500;

let liked = {};            // { id: { ts, name, image, genres } }
let loaded = false;
let loadPromise = null;
let saveTimer = null;
let lastTs = 0;            // sıralamanın deterministik kalması için (aşağıya bkz.)
const listeners = new Set();

// Aynı milisaniyede iki beğeni olursa "yeniden eskiye" sıralama belirsizleşir.
// Damgayı kesin artan tutmak bunu ortadan kaldırır; gerçek zamandan sapma
// en fazla birkaç milisaniyedir.
function nextTs() {
  const now = Date.now();
  lastTs = now > lastTs ? now : lastTs + 1;
  return lastTs;
}

function emit() { listeners.forEach((l) => l()); }

// Açılışta yükle (idempotent + eşzamanlı çağrı dedup)
export function loadLiked() {
  if (loaded) return Promise.resolve(liked);
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) liked = JSON.parse(raw) || {};
        // Damga sayacını diskteki en yüksek değerden devral
        for (const k in liked) lastTs = Math.max(lastTs, liked[k]?.ts || 0);
      } catch { /* boş depoyla devam */ }
      loaded = true;
      emit();
      return liked;
    })();
  }
  return loadPromise;
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(liked)).catch(() => {});
  }, 800);
}

/** Bir oyunu "ilgimi çekti" olarak işaretle. */
export async function recordLike(game) {
  if (!game || game.id == null) return;
  if (!loaded) await loadLiked();

  liked = {
    ...liked,
    [String(game.id)]: {
      ts: nextTs(),
      name: game.name || '',
      image: game.image || '',
      genres: Array.isArray(game.genres) ? game.genres.slice(0, 4) : [],
    },
  };

  // cap aşıldıysa en eskileri at
  const keys = Object.keys(liked);
  if (keys.length > MAX_ITEMS) {
    keys.sort((a, b) => liked[a].ts - liked[b].ts);   // eskiden yeniye
    const trimmed = {};
    keys.slice(keys.length - MAX_ITEMS).forEach((k) => { trimmed[k] = liked[k]; });
    liked = trimmed;
  }

  scheduleSave();
  emit();
}

/** Beğeniyi geri al (swipe'ta "geri" aksiyonu). */
export async function removeLike(id) {
  if (id == null) return;
  if (!loaded) await loadLiked();
  if (!(String(id) in liked)) return;

  const next = { ...liked };
  delete next[String(id)];
  liked = next;

  scheduleSave();
  emit();
}

export function subscribeLiked(cb) { listeners.add(cb); return () => listeners.delete(cb); }

/** Beğenilen id'lerin Set'i. */
export function getLikedSet() {
  return new Set(Object.keys(liked));
}

/** Yeniden eskiye sıralı beğeni listesi — [{ id, ts, name, image, genres }] */
export function getLikedList() {
  return Object.entries(liked)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.ts - a.ts);
}

/** Belirtilen andan sonraki beğeniler (haftalık istatistik için). */
export function likedSince(sinceTs) {
  return getLikedList().filter((x) => x.ts >= sinceTs);
}

/** Ayar/gizlilik için sıfırla. */
export async function resetLiked() {
  liked = {};
  loaded = true;
  scheduleSave();
  emit();
}
