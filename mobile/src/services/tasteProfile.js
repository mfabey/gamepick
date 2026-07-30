// ─────────────────────────────────────────────────────────────────────────────
// Zevk Profili — içerik-tabanlı önerinin "beyni".
// Kullanıcının tür ilgisini zaman-azalımlı ağırlıklarla biriktirir.
// Saf JS singleton + AsyncStorage kalıcılığı → test edilebilir; React'e bağlı değil.
//
// Sinyal → decay(mevcut) → türlere ağırlık ekle → kaydet → abonelere bildir.
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY   = 'gr_taste_profile';
const HALF_LIFE_DAYS = 30;     // 30 günde ağırlık yarıya düşer (tazelik)
const COLD_THRESHOLD = 3;      // bu kadar sinyalden az → "soğuk" (kişiselleştirme güvenilmez)
const MAX_GENRES     = 50;     // bellek koruması
const LIBRARY_WEIGHT = 0.5;    // harmanda kütüphane (oynanan) payı; kalanı etkileşim
const DAY            = 86400000;

// Sinyal türü → temel ağırlık
// pick = kullanıcının ilk açılışta "bunu severim" diye BİLİNÇLİ seçtiği oyun.
// Tesadüfi görüntülemeden (view) ve takibe almaktan (wishlist) daha güçlü bir beyan.
const WEIGHTS = { view: 1, wishlist: 3, pick: 4 };

let profile = emptyProfile();
let loaded = false;
let loadPromise = null;
let saveTimer = null;
const listeners = new Set();

function emptyProfile() {
  // genres/events/updatedAt: etkileşim profili (view/wishlist, zaman-azalımlı, birikimli)
  // library: oynanan kütüphaneden türetilen ANLIK GÖRÜNTÜ (birikmez → çift sayım yok)
  return { genres: {}, events: 0, updatedAt: Date.now(), library: { genres: {}, sig: '', updatedAt: 0 } };
}

function emit() {
  listeners.forEach((l) => l());
}

// Geçen süreye göre üstel azalım uygula (lazy: her okuma/yazmada)
function decayed(p, now) {
  const days = (now - (p.updatedAt || now)) / DAY;
  if (days <= 0) return p;
  const factor = Math.pow(0.5, days / HALF_LIFE_DAYS);
  if (factor >= 0.999) return p;
  const genres = {};
  for (const k in p.genres) {
    const v = p.genres[k] * factor;
    if (v > 0.02) genres[k] = v;   // çok küçülenleri at
  }
  return { ...p, genres, updatedAt: now };
}

function capTop(obj, n) {
  const entries = Object.entries(obj);
  if (entries.length <= n) return obj;
  entries.sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(entries.slice(0, n));
}

// Açılışta yükle (idempotent + eşzamanlı çağrı dedup)
export function loadProfile() {
  if (loaded) return Promise.resolve(profile);
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) profile = { ...emptyProfile(), ...JSON.parse(raw) };
      } catch { /* boş profille devam */ }
      loaded = true;
      emit();
      return profile;
    })();
  }
  return loadPromise;
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile)).catch(() => {});
  }, 800);
}

// Sinyal kaydet. genres: string[] (oyunun türleri), type: 'view' | 'wishlist'
export async function recordSignal({ genres = [], type = 'view' } = {}) {
  const clean = (genres || []).filter(Boolean);
  if (clean.length === 0) return;
  if (!loaded) await loadProfile();   // yükleme bitmeden yazıp üzerine binmeyi önle

  const now = Date.now();
  const base = WEIGHTS[type] ?? 1;
  const p = decayed(profile, now);
  const g = { ...p.genres };
  clean.forEach((name) => { g[name] = (g[name] || 0) + base; });

  profile = { genres: capTop(g, MAX_GENRES), events: (p.events || 0) + 1, updatedAt: now };
  scheduleSave();
  emit();

  if (__DEV__) {
    const top = topGenres(3).map((x) => `${x.name}(${x.weight.toFixed(1)})`).join(', ');
    // eslint-disable-next-line no-console
    console.log(`[taste] +${type} [${clean.join(', ')}] → top: ${top} · events=${profile.events}`);
  }
}

export function subscribeProfile(cb) { listeners.add(cb); return () => listeners.delete(cb); }
export function getProfile() { return profile; }

// En yüksek ağırlıklı türler (etkileşim + kütüphane harmanı → aday üretimi için)
export function topGenres(n = 5) {
  return Object.entries(normalizedGenres())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, weight]) => ({ name, weight }));
}

// {genre: weight} → toplamı 1 olacak şekilde normalize et
function normalize(obj) {
  const total = Object.values(obj).reduce((s, v) => s + v, 0);
  if (!total) return {};
  const out = {};
  for (const k in obj) out[k] = obj[k] / total;
  return out;
}

// Tür → normalize ağırlık (toplam ~1) — skorlama için.
// Etkileşim (view/wishlist) + kütüphane (oynanan) HARMANI.
export function normalizedGenres() {
  const interaction = normalize(decayed(profile, Date.now()).genres);
  const library = profile.library?.genres || {};
  const hasI = Object.keys(interaction).length > 0;
  const hasL = Object.keys(library).length > 0;

  if (hasI && hasL) {
    // İkisi de var → yarı yarıya harman (kütüphane güçlü ama etkileşim güncel)
    const out = {};
    for (const k in interaction) out[k] = (out[k] || 0) + interaction[k] * (1 - LIBRARY_WEIGHT);
    for (const k in library) out[k] = (out[k] || 0) + library[k] * LIBRARY_WEIGHT;
    return out;
  }
  return hasL ? library : interaction;
}

// Oynanan kütüphaneden türetilen zevk anlık görüntüsünü ayarla (birikmez, değiştirir).
// rawWeights: {tür: saat-ağırlıklı ham değer}, sig: en çok oynanan appid imzası.
export function setLibraryTaste(rawWeights = {}, sig = '') {
  const genres = normalize(rawWeights);
  profile = { ...profile, library: { genres, sig, updatedAt: Date.now() } };
  scheduleSave();
  emit();
  if (__DEV__) {
    const top = Object.entries(genres).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([n, w]) => `${n}(${w.toFixed(2)})`).join(', ');
    // eslint-disable-next-line no-console
    console.log(`[taste] kütüphane zenginleştirme → ${top || '(boş)'}`);
  }
}

// Son kütüphane zenginleştirmesinin imzası (değişmedikçe tekrar etme)
export function libraryTasteSig() { return profile.library?.sig || ''; }

// Yeterli sinyal yok mu? Kütüphane varsa asla soğuk değil (ne oynadığını biliyoruz).
export function isCold() {
  const hasLibrary = Object.keys(profile.library?.genres || {}).length > 0;
  if (hasLibrary) return false;
  return (profile.events || 0) < COLD_THRESHOLD;
}

// Ayar/gizlilik için sıfırla
export async function resetProfile() {
  profile = emptyProfile();
  loaded = true;
  scheduleSave();
  emit();
}
