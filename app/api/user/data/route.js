import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { redisGetJSON, redisSetJSON } from '../../../lib/redis';

// ─────────────────────────────────────────────────────────────────────────────
// Hesaba bağlı kullanıcı verisi (zevk profili + takip listesi).
// Cihaz değişse de korunur, web ile mobil aynı hesabı paylaşır.
//
// GET  → sunucudaki veri
// PUT  → cihazdaki veriyi BİRLEŞTİREREK yaz (üzerine yazmaz)
// ─────────────────────────────────────────────────────────────────────────────

const MAX_GENRES = 60;
const MAX_WISHLIST = 300;

function tasteKey(uid) { return `user_taste:${uid}`; }
function wishKey(uid)  { return `user_wishlist:${uid}`; }

async function unauthorized() {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}

export async function GET(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  const [taste, wishlist] = await Promise.all([
    redisGetJSON(tasteKey(user.uid)).catch(() => null),
    redisGetJSON(wishKey(user.uid)).catch(() => null),
  ]);

  return NextResponse.json({
    user: { uid: user.uid, email: user.email, name: user.name },
    taste: taste || { genres: {}, events: 0, updatedAt: 0 },
    wishlist: wishlist || [],
  });
}

export async function PUT(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }

  const [srvTaste, srvWish] = await Promise.all([
    redisGetJSON(tasteKey(user.uid)).catch(() => null),
    redisGetJSON(wishKey(user.uid)).catch(() => null),
  ]);

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

  // ── Takip listesi: id bazında birleştir (tekilleştirilmiş) ─────────────────
  const wishMap = new Map();
  for (const item of [...(Array.isArray(srvWish) ? srvWish : []), ...(Array.isArray(body.wishlist) ? body.wishlist : [])]) {
    if (item && item.id != null) wishMap.set(String(item.id), item);
  }
  const wishlist = [...wishMap.values()].slice(0, MAX_WISHLIST);

  await Promise.all([
    redisSetJSON(tasteKey(user.uid), taste).catch(() => {}),
    redisSetJSON(wishKey(user.uid), wishlist).catch(() => {}),
  ]);

  // Birleşmiş hâli geri döndür → cihaz kendini buna göre günceller
  return NextResponse.json({ ok: true, taste, wishlist });
}
