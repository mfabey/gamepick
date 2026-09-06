import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { redisGetJSON, redisSetJSON, redisPipeline, parseJSON } from '../../../lib/redis';
import { mergeProfile } from '../../../lib/social-store';

// ─────────────────────────────────────────────────────────────────────────────
// Hesaba bağlı kullanıcı verisi (zevk profili + takip listesi + koleksiyonlar).
// Cihaz değişse de korunur, web ile mobil aynı hesabı paylaşır.
//
// GET  → sunucudaki veri
// PUT  → cihazdaki veriyi BİRLEŞTİREREK yaz (üzerine yazmaz)
// ─────────────────────────────────────────────────────────────────────────────

const MAX_GENRES = 60;
const MAX_WISHLIST = 300;
const MAX_COLLECTIONS = 50;
const MAX_GAMES_PER_COL = 300;
const TOMB_TTL_MS = 90 * 86400000;

function tasteKey(uid) { return `user_taste:${uid}`; }
function wishKey(uid)  { return `user_wishlist:${uid}`; }
function colKey(uid)   { return `user_collections:${uid}`; }
function tombKey(uid)  { return `user_collections_deleted:${uid}`; }

// ── Koleksiyon birleştirme ──────────────────────────────────────────────────
// Aynı id iki tarafta da varsa updatedAt'i YENİ olan kazanır.
// Mezar taşı (silinme zamanı) koleksiyonun updatedAt'inden yeniyse kayıt düşer —
// bu olmadan bir cihazda silinen koleksiyon diğer cihazdan geri dirilirdi.
function mergeCollections(serverCols, clientCols, serverTombs, clientTombs) {
  const tombs = { ...(serverTombs || {}) };
  for (const id in (clientTombs || {})) {
    const t = Number(clientTombs[id]) || 0;
    if (t > (tombs[id] || 0)) tombs[id] = t;
  }

  const byId = new Map();
  for (const c of [...(serverCols || []), ...(clientCols || [])]) {
    if (!c || !c.id) continue;
    const prev = byId.get(c.id);
    if (!prev || (Number(c.updatedAt) || 0) > (Number(prev.updatedAt) || 0)) byId.set(c.id, c);
  }

  const merged = [];
  for (const [id, c] of byId) {
    const deletedAt = tombs[id] || 0;
    if (deletedAt >= (Number(c.updatedAt) || 0)) continue;   // silinmiş sayılır
    merged.push({
      id: String(id),
      name: String(c.name || '').slice(0, 60),
      emoji: String(c.emoji || '🎮').slice(0, 8),
      games: Array.isArray(c.games) ? c.games.slice(0, MAX_GAMES_PER_COL) : [],
      createdAt: Number(c.createdAt) || 0,
      updatedAt: Number(c.updatedAt) || 0,
    });
  }

  merged.sort((a, b) => b.updatedAt - a.updatedAt);

  // Mezar taşları sonsuza dek büyümesin
  const cutoff = Date.now() - TOMB_TTL_MS;
  const prunedTombs = {};
  for (const id in tombs) if (tombs[id] >= cutoff) prunedTombs[id] = tombs[id];

  return { collections: merged.slice(0, MAX_COLLECTIONS), deleted: prunedTombs };
}

async function getAuthUser(request) {
  const mobileUser = await verifyMobileToken(request);
  if (mobileUser) return mobileUser;

  try {
    const cookieStore = cookies();
    const session = cookieStore?.get?.('gp_user_session')?.value;
    if (session) {
      const u = JSON.parse(session);
      if (u?.uid) {
        return {
          uid: u.uid,
          email: u.email || '',
          name: u.name || u.displayName || '',
        };
      }
    }
  } catch {}

  return null;
}

async function unauthorized() {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}

export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  // Tek HTTP turunda dört anahtar (dört ayrı gidiş-dönüş yerine)
  const rows = await redisPipeline([
    ['GET', tasteKey(user.uid)],
    ['GET', wishKey(user.uid)],
    ['GET', colKey(user.uid)],
    ['GET', tombKey(user.uid)],
  ]);
  const [taste, wishlist, collections, deleted] = (rows || []).map(parseJSON);

  return NextResponse.json({
    user: { uid: user.uid, email: user.email, name: user.name },
    taste: taste || { genres: {}, events: 0, updatedAt: 0 },
    wishlist: wishlist || [],
    collections: collections || [],
    deleted: deleted || {},
  });
}

export async function PUT(request) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }

  const rows = await redisPipeline([
    ['GET', tasteKey(user.uid)],
    ['GET', wishKey(user.uid)],
    ['GET', colKey(user.uid)],
    ['GET', tombKey(user.uid)],
  ]);
  const [srvTaste, srvWish, srvCols, srvTombs] = (rows || []).map(parseJSON);

  // ── Zevk profili: tür ağırlıklarını TOPLA ──────────────────────────────────
  // Üzerine yazmıyoruz; iki cihazda da gezen kullanıcı sinyal kaybetmesin.
  const merged = { ...(srvTaste?.genres || {}) };
  const incoming = body.taste?.genres || {};
  for (const k in incoming) {
    const v = Number(incoming[k]);
    if (Number.isFinite(v) && v > 0) merged[k] = (merged[k] || 0) + v;
  }
  // Bellek koruması: en ağır türleri tut
  const genres = Object.fromEntries(
    Object.entries(merged).sort((a, b) => b[1] - a[1]).slice(0, MAX_GENRES)
  );

  const taste = {
    genres,
    events: Math.max(srvTaste?.events || 0, Number(body.taste?.events) || 0),
    updatedAt: Date.now(),
  };

  // ── Takip listesi: overwriteWishlist açıksa doğrudan yaz, yoksa sunucu verisi esastır ─────
  let wishlist;
  if (body.overwriteWishlist && Array.isArray(body.wishlist)) {
    const wishMap = new Map();
    for (const item of body.wishlist) {
      if (item && item.id != null) wishMap.set(String(item.id), item);
    }
    wishlist = [...wishMap.values()].slice(0, MAX_WISHLIST);
  } else if (Array.isArray(srvWish)) {
    // Sunucuda zaten istek listesi mevcut → rutin senkronda sunucu listesi esastır
    wishlist = srvWish.slice(0, MAX_WISHLIST);
  } else {
    // İlk kez senkronize olan hesap → cihazdaki listeyi sunucuya yaz
    const wishMap = new Map();
    for (const item of (Array.isArray(body.wishlist) ? body.wishlist : [])) {
      if (item && item.id != null) wishMap.set(String(item.id), item);
    }
    wishlist = [...wishMap.values()].slice(0, MAX_WISHLIST);
  }

  // ── Koleksiyonlar: id bazında, updatedAt'i yeni olan kazanır + mezar taşları ─
  const { collections, deleted } = mergeCollections(
    srvCols, body.collections, srvTombs, body.deleted
  );

  // ── Oyun sayısı: profile YAZILIYOR ────────────────────────────────────────
  const gameCount = Number(body.gameCount);
  const writeGameCount = Number.isFinite(gameCount) && gameCount >= 0
    ? mergeProfile(user.uid, { gameCount: Math.min(Math.round(gameCount), 100000) }).catch(() => {})
    : Promise.resolve();

  await Promise.all([
    redisSetJSON(tasteKey(user.uid), taste).catch(() => {}),
    redisSetJSON(wishKey(user.uid), wishlist).catch(() => {}),
    redisSetJSON(colKey(user.uid), collections).catch(() => {}),
    redisSetJSON(tombKey(user.uid), deleted).catch(() => {}),
    writeGameCount,
  ]);

  // Birleşmiş hâli geri döndür → cihaz kendini buna göre günceller
  return NextResponse.json({ ok: true, taste, wishlist, collections, deleted });
}
