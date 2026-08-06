// ─────────────────────────────────────────────────────────────────────────────
// Oyun koleksiyonları — kullanıcının kendi listeleri.
// ("Bitirdiğim Oyunlar", "2026 Favorilerim", "Co-op Oyunlarım" …)
//
// Önce cihaz, sonra hesap senkronu (takip listesiyle aynı desen).
//
// SİLME ve SENKRON: birleştirme tabanlı senkronda basitçe "id'leri birleştir"
// denirse, bir cihazda silinen koleksiyon sunucudan geri döner. Bunu önlemek
// için silinenler MEZAR TAŞI olarak saklanır (id → silinme zamanı) ve
// birleştirmede zaman damgası karşılaştırılır.
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scopedKey, ownerReady, registerScopedStore } from './owner';

// Taban adlar — gerçek anahtarlar sahibe göre türetilir (owner.js).
const STORAGE_KEY = 'gr_collections';
const TOMB_KEY    = 'gr_collections_deleted';

const MAX_COLLECTIONS   = 50;
const MAX_GAMES_PER_COL = 300;
const TOMB_TTL_MS       = 90 * 86400000;   // mezar taşları sonsuza dek büyümesin

let collections = [];   // [{ id, name, emoji, games[], createdAt, updatedAt }]
let tombstones = {};    // { id: silinmeZamani }
let loaded = false;
let loadPromise = null;
let saveTimer = null;
let lastTs = 0;
const listeners = new Set();

function emit() { listeners.forEach((l) => l()); }

// Aynı milisaniyedeki iki değişiklik birleştirmede belirsizlik yaratmasın
function nextTs() {
  const now = Date.now();
  lastTs = now > lastTs ? now : lastTs + 1;
  return lastTs;
}

function newId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Oyunun koleksiyonda saklanan minimal biçimi — kart render'ı için yeterli,
// tekrar ağ isteği gerektirmez.
function slimGame(game) {
  return {
    id: String(game.id),
    name: game.name || '',
    image: game.image || '',
    slug: game.rawgSlug || game.slug || '',
    appid: game.appid || null,
    hasSteam: !!game.hasSteam,
  };
}

export function loadCollections() {
  if (loaded) return Promise.resolve(collections);
  if (!loadPromise) {
    loadPromise = (async () => {
      await ownerReady();   // sahip çözülmeden okuma yanlış kovaya bakar
      try {
        const [rawCols, rawTombs] = await Promise.all([
          AsyncStorage.getItem(scopedKey(STORAGE_KEY)),
          AsyncStorage.getItem(scopedKey(TOMB_KEY)),
        ]);
        if (rawCols) collections = JSON.parse(rawCols) || [];
        if (rawTombs) tombstones = JSON.parse(rawTombs) || {};
        for (const c of collections) lastTs = Math.max(lastTs, c.updatedAt || 0);
        pruneTombstones();
      } catch { /* boş depoyla devam */ }
      loaded = true;
      emit();
      return collections;
    })();
  }
  return loadPromise;
}

function pruneTombstones() {
  const cutoff = Date.now() - TOMB_TTL_MS;
  for (const id in tombstones) if (tombstones[id] < cutoff) delete tombstones[id];
}

function writeNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  return Promise.all([
    AsyncStorage.setItem(scopedKey(STORAGE_KEY), JSON.stringify(collections)).catch(() => {}),
    AsyncStorage.setItem(scopedKey(TOMB_KEY), JSON.stringify(tombstones)).catch(() => {}),
  ]);
}

/**
 * Sönümleme, oyun ekle/çıkar gibi hızlı ardışık değişikliklerde diski
 * yormamak için var. Ama KOLEKSİYON OLUŞTURMA/SİLME seyrek ve kritik:
 * 600ms dolmadan uygulama kapanırsa yeni koleksiyon diske hiç ulaşmıyordu.
 * Bu yüzden yapısal değişiklikler anında yazılıyor.
 */
function scheduleSave(immediate = false) {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (immediate) { writeNow(); return; }
  saveTimer = setTimeout(writeNow, 600);
}

function commit(next, immediate = false) {
  collections = next;
  scheduleSave(immediate);
  emit();
}

// ── Okuma ───────────────────────────────────────────────────────────────────

export function getCollections() { return collections; }

export function getCollection(id) {
  return collections.find((c) => c.id === id) || null;
}

/** Bu oyunu içeren koleksiyon id'lerinin Set'i (ekle/çıkar durumunu göstermek için). */
export function collectionsContaining(gameId) {
  const gid = String(gameId);
  const set = new Set();
  for (const c of collections) {
    if (c.games?.some((g) => String(g.id) === gid)) set.add(c.id);
  }
  return set;
}

/** Senkron gövdesi — sunucuya gönderilecek hâl. */
export function syncPayload() {
  return { collections, deleted: tombstones };
}

export function subscribeCollections(cb) { listeners.add(cb); return () => listeners.delete(cb); }

// ── Yazma ───────────────────────────────────────────────────────────────────

/** Yeni koleksiyon oluşturur, id döner. Sınır aşılırsa null döner. */
export async function createCollection(name, emoji = '🎮') {
  if (!loaded) await loadCollections();
  const clean = (name || '').trim();
  if (!clean) return null;
  if (collections.length >= MAX_COLLECTIONS) return null;

  const ts = nextTs();
  const col = { id: newId(), name: clean.slice(0, 60), emoji, games: [], createdAt: ts, updatedAt: ts };
  commit([col, ...collections], true);
  return col.id;
}

export async function renameCollection(id, name, emoji) {
  if (!loaded) await loadCollections();
  const clean = (name || '').trim();
  if (!clean) return;
  commit(collections.map((c) => (
    c.id === id
      ? { ...c, name: clean.slice(0, 60), emoji: emoji ?? c.emoji, updatedAt: nextTs() }
      : c
  )));
}

export async function deleteCollection(id) {
  if (!loaded) await loadCollections();
  if (!collections.some((c) => c.id === id)) return;
  // Mezar taşı ŞART: aksi hâlde senkronda sunucudan geri gelir
  tombstones = { ...tombstones, [id]: nextTs() };
  commit(collections.filter((c) => c.id !== id), true);
}

export async function addGameToCollection(collectionId, game) {
  if (!loaded) await loadCollections();
  if (!game?.id) return;
  const gid = String(game.id);

  commit(collections.map((c) => {
    if (c.id !== collectionId) return c;
    if (c.games?.some((g) => String(g.id) === gid)) return c;          // zaten var
    if ((c.games?.length || 0) >= MAX_GAMES_PER_COL) return c;         // sınır
    return { ...c, games: [slimGame(game), ...(c.games || [])], updatedAt: nextTs() };
  }));
}

export async function removeGameFromCollection(collectionId, gameId) {
  if (!loaded) await loadCollections();
  const gid = String(gameId);

  commit(collections.map((c) => (
    c.id === collectionId
      ? { ...c, games: (c.games || []).filter((g) => String(g.id) !== gid), updatedAt: nextTs() }
      : c
  )));
}

/** Oyunu bir koleksiyonda aç/kapat — detay ekranındaki seçim listesi için. */
export async function toggleGameInCollection(collectionId, game) {
  const has = collectionsContaining(game.id).has(collectionId);
  if (has) await removeGameFromCollection(collectionId, game.id);
  else await addGameToCollection(collectionId, game);
  return !has;
}

// ── Senkron ─────────────────────────────────────────────────────────────────

/**
 * Sunucudan gelen birleşmiş sonucu yerele uygular.
 * Sunucu zaten mezar taşlarını uyguladığı için burada yalnızca yazıyoruz.
 */
export async function applyMergedCollections(serverCollections, serverDeleted) {
  if (!loaded) await loadCollections();
  if (Array.isArray(serverCollections)) {
    collections = serverCollections.slice(0, MAX_COLLECTIONS);
    for (const c of collections) lastTs = Math.max(lastTs, c.updatedAt || 0);
  }
  if (serverDeleted && typeof serverDeleted === 'object') {
    tombstones = { ...serverDeleted };
    pruneTombstones();
  }
  scheduleSave();
  emit();
}

export async function resetCollections() {
  collections = [];
  tombstones = {};
  loaded = true;
  scheduleSave();
  emit();
}

// Hesap değişiminde: bekleyen yazma ESKİ kovaya iner, sonra yenisinden yüklenir.
// Mezar taşları da hesaba özel — A'nın sildiği koleksiyonun mezar taşı B'nin
// senkronuna karışırsa B'nin aynı id'li kaydını sunucuda öldürebilirdi.
registerScopedStore({
  keys: [STORAGE_KEY, TOMB_KEY],
  flush: () => (saveTimer ? writeNow() : null),
  rebind: async () => {
    collections = []; tombstones = {}; lastTs = 0;
    loaded = false; loadPromise = null;
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    await loadCollections();
  },
});
