// ─────────────────────────────────────────────────────────────────────────────
// Sosyal veri katmanı — profil, kullanıcı adı dizini, engelleme.
//
// Redis şeması:
//   user_profile:{uid}       → JSON  { username, usernameLower, displayName, bio, createdAt, updatedAt }
//   username:{lower}         → uid            (benzersizlik dizini)
//   user_blocks:{uid}        → SET   engellenen uid'ler
//   user_blocked_by:{uid}    → SET   bu kullanıcıyı engelleyenler
//
// `user_blocked_by` tersine dizin gibi görünüyor ama şart: A, B'yi
// engellediğinde B'nin akışından da A'yı çıkarmamız gerekiyor. Tek yönlü
// saklansaydı, B'nin akışını süzmek için TÜM kullanıcıların engel listesini
// taramak gerekirdi.
// ─────────────────────────────────────────────────────────────────────────────
import { redisCmd, redisGetJSON, redisPipeline, redisSetJSONStrict, parseJSON } from './redis';

export function profileKey(uid)   { return `user_profile:${uid}`; }
export function usernameKey(name) { return `username:${String(name).toLowerCase()}`; }
export function blocksKey(uid)    { return `user_blocks:${uid}`; }
export function blockedByKey(uid) { return `user_blocked_by:${uid}`; }

// ── Profil ──────────────────────────────────────────────────────────────────

export async function getProfile(uid) {
  if (!uid) return null;
  return redisGetJSON(profileKey(uid)).catch(() => null);
}

/** Birden fazla profili tek turda getirir (arkadaş listesi gibi yerler için). */
export async function getProfiles(uids = []) {
  const ids = [...new Set(uids.filter(Boolean))];
  if (ids.length === 0) return {};

  const rows = await redisPipeline(ids.map((u) => ['GET', profileKey(u)]));
  const out = {};
  ids.forEach((u, i) => {
    const p = parseJSON(rows?.[i]);
    if (p) out[u] = p;
  });
  return out;
}

/** Kullanıcı adından uid çözer. */
export async function uidForUsername(username) {
  if (!username) return null;
  const uid = await redisCmd(['GET', usernameKey(username)]);
  return uid || null;
}

/**
 * Kullanıcı adını sahiplenir. Doğrulama ÇAĞIRANIN sorumluluğunda
 * (content-filter.validateUsername) — burada yalnızca benzersizlik ve yazım var.
 *
 * @returns {{ ok: boolean, error?: 'TAKEN'|'WRITE_FAILED' }}
 */
export async function claimUsername(uid, username, extra = {}) {
  const lower = String(username).toLowerCase();

  // SET NX: yalnızca anahtar YOKSA yazar → iki kullanıcı aynı anda
  // aynı adı almaya çalışırsa yalnızca biri kazanır (yarış koşulu kapalı).
  const claimed = await redisCmd(['SET', usernameKey(lower), uid, 'NX']);

  if (claimed !== 'OK') {
    // Zaten alınmış — sahibi kendisi mi?
    const owner = await redisCmd(['GET', usernameKey(lower)]);
    if (owner !== uid) return { ok: false, error: 'TAKEN' };
  }

  const existing = await getProfile(uid);
  const now = Date.now();
  const profile = {
    uid,
    username: String(username),
    usernameLower: lower,
    displayName: extra.displayName ?? existing?.displayName ?? String(username),
    bio: extra.bio ?? existing?.bio ?? '',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  try {
    await redisSetJSONStrict(profileKey(uid), profile);
  } catch {
    // Profil yazılamadıysa sahiplenmeyi geri al, aksi hâlde ad sonsuza dek
    // kilitli kalır ve kullanıcının profili olmaz.
    if (claimed === 'OK') await redisCmd(['DEL', usernameKey(lower)]).catch(() => {});
    return { ok: false, error: 'WRITE_FAILED' };
  }

  // Eski kullanıcı adının dizin kaydını bırak
  if (existing?.usernameLower && existing.usernameLower !== lower) {
    await redisCmd(['DEL', usernameKey(existing.usernameLower)]).catch(() => {});
  }

  return { ok: true, profile };
}

// ── Engelleme ───────────────────────────────────────────────────────────────

export async function blockUser(uid, targetUid) {
  if (!uid || !targetUid || uid === targetUid) return false;
  await redisPipeline([
    ['SADD', blocksKey(uid), targetUid],
    ['SADD', blockedByKey(targetUid), uid],
  ]);
  return true;
}

export async function unblockUser(uid, targetUid) {
  if (!uid || !targetUid) return false;
  await redisPipeline([
    ['SREM', blocksKey(uid), targetUid],
    ['SREM', blockedByKey(targetUid), uid],
  ]);
  return true;
}

/** Bu kullanıcının engellediği uid'ler. */
export async function getBlocked(uid) {
  const r = await redisCmd(['SMEMBERS', blocksKey(uid)]);
  return Array.isArray(r) ? r : [];
}

/**
 * Görünürlük süzgeci için TEK küme: benim engellediklerim + beni engelleyenler.
 * Engelleme çift yönlü çalışmalı — engellediğim kişi de beni görmemeli.
 */
export async function getHiddenUids(uid) {
  if (!uid) return new Set();
  const rows = await redisPipeline([
    ['SMEMBERS', blocksKey(uid)],
    ['SMEMBERS', blockedByKey(uid)],
  ]);
  const set = new Set();
  for (const list of rows || []) {
    if (Array.isArray(list)) for (const x of list) set.add(x);
  }
  return set;
}

/** İki kullanıcı arasında engel var mı (her iki yönde de)? */
export async function isBlockedBetween(a, b) {
  if (!a || !b) return false;
  const rows = await redisPipeline([
    ['SISMEMBER', blocksKey(a), b],
    ['SISMEMBER', blocksKey(b), a],
  ]);
  return (Number(rows?.[0]) || 0) === 1 || (Number(rows?.[1]) || 0) === 1;
}
