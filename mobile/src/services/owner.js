// ─────────────────────────────────────────────────────────────────────────────
// Depo sahipliği — hangi kalıcı verinin hangi hesaba ait olduğunu tek yerden
// çözer.
//
// SORUN (4 Ağustos'ta bulundu): depoların hiçbirinde hesap kapsamı yoktu.
// A çıkınca yalnızca oturum jetonu siliniyordu, veri cihazda kalıyordu; B
// girince ilk senkron A'nın verisini B'nin jetonuyla sunucuya gönderiyor ve
// hesaplar KALICI olarak karışıyordu.
//
// ÇÖZÜM: her kalıcı anahtar sahibine göre türetilir.
//   gr_seen__anon       → oturum yokken
//   gr_seen__u_<uid>    → oturum açıkken
// İki hesabın verisi aynı cihazda hiç temas etmez.
//
// SAHİP DEĞİŞİMİNDE SIRA ÖNEMLİ: önce eski kovaya yaz, sonra anahtarı çevir,
// sonra yeniden yükle. Ters sırada, bekleyen bir sönümleme zamanlayıcısı
// (depolar 600–800 ms sönümlemeyle yazıyor) eski sahibin verisini YENİ kovaya
// boşaltır — düzeltmek istediğimiz hatanın aynısı, kılık değiştirmiş hâli.
//
// SecureStore anahtarı yalnız [A-Za-z0-9._-] kabul ediyor; ayraç bu yüzden
// ':' değil '__'.
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const ANON = 'anon';
const SEP = '__';

let ownerKey = ANON;
let resolved = false;
let resolveReady;
const readyPromise = new Promise((r) => { resolveReady = r; });

/** @type {{keys: string[], secure?: boolean, flush?: Function, rebind?: Function}[]} */
const stores = [];
const listeners = new Set();

export function ownerKeyFor(uid) { return uid ? `u_${uid}` : ANON; }
export function currentOwnerKey() { return ownerKey; }
export function scopedKey(base) { return `${base}${SEP}${ownerKey}`; }
export function keyForOwner(base, owner) { return `${base}${SEP}${owner}`; }

/**
 * Depolar okuma/yazmadan ÖNCE bunu bekler. Sahip çözülmeden yapılan bir okuma
 * yanlış kovaya bakar; yapılan bir yazma yanlış kovayı kirletir.
 */
export function ownerReady() { return readyPromise; }

export function subscribeOwner(cb) { listeners.add(cb); return () => listeners.delete(cb); }

/**
 * Bir deponun kendini kaydetmesi.
 * @param keys    bu deponun taban anahtarları (koleksiyonlarda ikisi var)
 * @param secure  SecureStore'da mı duruyor
 * @param flush   bekleyen yazmayı ŞİMDİ diske indir (sahip çevrilmeden önce)
 * @param rebind  bellekteki durumu sıfırla ve yeni kovadan yükle
 *
 * React tarafındaki depolar (context'ler) yalnızca `keys` verir; yeniden
 * yükleme işini subscribeOwner ile kendileri yapar.
 */
export function registerScopedStore({ keys, secure = false, flush, rebind }) {
  stores.push({ keys, secure, flush, rebind });
}

// ── Eski (kapsamsız) anahtarlar ──────────────────────────────────────────────
// 2.3.0 ve öncesinde yazılmış kayıtlar. TAŞINMIYOR, siliniyor: içerikleri
// birden fazla hesabın karışmış hâli olabilir ve taşımak karışmayı yeni kovaya
// devrederdi — sunucu sıfırlaması da bu yüzden kalıcı olmazdı, ilk senkronda
// cihazdaki kirli kopya geri yüklenirdi.
const LEGACY_ASYNC = [
  'gr_wishlist',
  'gr_notif_enabled',
  'gr_collections',
  'gr_collections_deleted',
  'gr_taste_profile',
  'gr_liked',
  'gr_seen',
  'gr_dismissed',
  'gr_steam_accounts',
];
const LEGACY_SECURE = ['gr_xbox_session'];
const MIGRATED_KEY = 'gr_scope_migrated';

async function migrateLegacyKeys() {
  try {
    if ((await AsyncStorage.getItem(MIGRATED_KEY)) === '1') return;
  } catch {
    return;   // depo okunamıyorsa silmeye de kalkışma
  }
  try { await AsyncStorage.multiRemove(LEGACY_ASYNC); } catch {}
  for (const k of LEGACY_SECURE) {
    try { await SecureStore.deleteItemAsync(k); } catch {}
  }
  try { await AsyncStorage.setItem(MIGRATED_KEY, '1'); } catch {}
}

/**
 * Sahibi ayarla. session.js'ten çağrılır (oturum yüklendiğinde, girişte,
 * çıkışta). İlk çağrı ownerReady()'yi çözer — depolar o ana kadar bekler.
 */
export async function bindOwner(uid) {
  const next = ownerKeyFor(uid);
  const first = !resolved;
  if (!first && next === ownerKey) return;

  if (first) {
    await migrateLegacyKeys();       // depolar okumadan ÖNCE, tek sefer
    ownerKey = next;
    resolved = true;
    resolveReady();
  } else {
    for (const s of stores) { try { await s.flush?.(); } catch {} }   // eski kovaya
    ownerKey = next;
    for (const s of stores) { try { await s.rebind?.(); } catch {} }  // yeni kovadan
  }

  listeners.forEach((l) => { try { l(); } catch {} });
}

/** Bir sahibin bütün kalıcı verisini diskten siler (çıkışta). */
export async function wipeOwnerData(owner) {
  if (!owner) return;
  const asyncKeys = [];
  for (const s of stores) {
    if (s.secure) continue;
    for (const k of s.keys) asyncKeys.push(keyForOwner(k, owner));
  }
  try { await AsyncStorage.multiRemove(asyncKeys); } catch {}

  for (const s of stores) {
    if (!s.secure) continue;
    for (const k of s.keys) {
      try { await SecureStore.deleteItemAsync(keyForOwner(k, owner)); } catch {}
    }
  }
}

/** Bellekteki durumu da yeni (boş) kovaya göre tazeler — sıfırlama sonrası. */
export async function reloadAllStores() {
  for (const s of stores) { try { await s.rebind?.(); } catch {} }
  listeners.forEach((l) => { try { l(); } catch {} });
}

// ── Misafir verisinin devri ─────────────────────────────────────────────────
// Hesapsız kullanılan uygulamada biriken veri `anon` kovasında durur. Kaydolan
// kullanıcı emeğini kaybetmemeli — ama devir SESSİZ OLMAMALI: sessiz devir,
// düzeltmeye çalıştığımız hatanın kibar hâli (cihazdaki veri, kim olduğu
// sorulmadan bir hesaba yazılıyor). Bu yüzden kullanıcıya sorulur.

const WISH_BASE = 'gr_wishlist';
const COL_BASE = 'gr_collections';

function parseJSON(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

/** anon kovasında devredilecek bir şey var mı? */
export async function anonDataSummary() {
  try {
    const rows = await AsyncStorage.multiGet([
      keyForOwner(COL_BASE, ANON),
      keyForOwner(WISH_BASE, ANON),
    ]);
    const map = new Map(rows);
    const cols = parseJSON(map.get(keyForOwner(COL_BASE, ANON)));
    const wish = parseJSON(map.get(keyForOwner(WISH_BASE, ANON)));
    return {
      collections: Array.isArray(cols) ? cols.length : 0,
      wishlist: Array.isArray(wish) ? wish.length : 0,
    };
  } catch {
    return { collections: 0, wishlist: 0 };
  }
}

// Kullanıcının YAZDIĞI iki liste id bazında birleşiyor; sunucudaki kuralın
// aynısı (app/api/user/data/route.js): koleksiyonlarda updatedAt'i yeni olan
// kazanır. Birleştirme şart, çünkü giriş anında tetiklenen senkron kullanıcı
// soruyu yanıtlamadan hedef kovayı doldurmuş olabilir.
function mergeById(mine, theirs, newerWins) {
  if (!Array.isArray(mine)) return Array.isArray(theirs) ? theirs : null;
  if (!Array.isArray(theirs)) return mine;
  const byId = new Map();
  for (const x of [...theirs, ...mine]) {
    if (!x || x.id == null) continue;
    const id = String(x.id);
    const prev = byId.get(id);
    if (!prev) { byId.set(id, x); continue; }
    if (newerWins && (Number(x.updatedAt) || 0) > (Number(prev.updatedAt) || 0)) byId.set(id, x);
  }
  return [...byId.values()];
}

/**
 * anon kovasını mevcut sahibe taşır ve anon'u boşaltır.
 *
 * Hedef normalde boştur (çıkışta siliniyor). Doluysa:
 *  - koleksiyon ve takip listesi BİRLEŞTİRİLİR — kullanıcı "Aktar" dedikten
 *    sonra sessizce bir şey düşürmek dürüst olmaz.
 *  - davranış sinyalleri (zevk, beğeni, görülen, elenen) hedef doluyken
 *    atlanır: bunlar kullanıcının yazdığı içerik değil, türetilmiş veri.
 */
export async function transferAnonData() {
  if (ownerKey === ANON) return false;

  const bases = [];
  for (const s of stores) if (!s.secure) bases.push(...s.keys);

  const from = bases.map((b) => keyForOwner(b, ANON));
  const to = bases.map((b) => keyForOwner(b, ownerKey));

  let moved = false;
  try {
    const [srcRows, dstRows] = await Promise.all([
      AsyncStorage.multiGet(from),
      AsyncStorage.multiGet(to),
    ]);
    const src = new Map(srcRows);
    const dst = new Map(dstRows);
    const writes = [];

    bases.forEach((base, i) => {
      const value = src.get(from[i]);
      if (value == null) return;
      const existing = dst.get(to[i]);

      if (existing == null) { writes.push([to[i], value]); return; }

      if (base === WISH_BASE || base === COL_BASE) {
        const merged = mergeById(parseJSON(existing), parseJSON(value), base === COL_BASE);
        if (merged) writes.push([to[i], JSON.stringify(merged)]);
        return;
      }
      // türetilmiş veri + hedef dolu → dokunma
    });

    if (writes.length) { await AsyncStorage.multiSet(writes); moved = true; }
    await AsyncStorage.multiRemove(from);
  } catch {
    return false;
  }

  await reloadAllStores();
  return moved;
}
