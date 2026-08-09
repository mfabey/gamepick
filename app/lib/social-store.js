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
import {
  redisCmd, redisGetJSON, redisSetJSON, redisPipeline, redisSetJSONStrict, parseJSON,
} from './redis';

export function profileKey(uid)   { return `user_profile:${uid}`; }
export function usernameKey(name) { return `username:${String(name).toLowerCase()}`; }
export function blocksKey(uid)    { return `user_blocks:${uid}`; }
export function blockedByKey(uid) { return `user_blocked_by:${uid}`; }
export function friendsKey(uid)   { return `friends:${uid}`; }
export function reqInKey(uid)     { return `friend_req_in:${uid}`; }
export function reqOutKey(uid)    { return `friend_req_out:${uid}`; }
export function activityKey(uid)  { return `user_activity:${uid}`; }
export function privacyKey(uid)   { return `user_privacy:${uid}`; }

const USERNAME_INDEX = 'username_index';   // ön ek aramasi icin ZSET (ZRANGEBYLEX)

export const MAX_FRIENDS = 500;
export const ACTIVITY_KEEP = 30;           // kullanıcı başına saklanan aktivite

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

/**
 * Profili BİRLEŞTİREREK günceller — üzerine YAZMAZ.
 *
 * Kimlik uçları (login, mobile-login, apple-signin, steam/callback, user-me)
 * oturum için ad/e-posta önbelleklemek istiyor ve bunu `user_profile:{uid}`
 * anahtarına yazarak yapıyordu. O anahtar sosyal profille AYNI olduğu için
 * her giriş kullanıcının `username` alanını siliyordu — kullanıcı adını
 * belirlese bile bir sonraki girişte kayboluyordu.
 *
 * Bu fonksiyon mevcut alanları koruyup yalnızca verilenleri günceller.
 */
export async function mergeProfile(uid, patch = {}) {
  if (!uid) return null;
  const cur = (await redisGetJSON(profileKey(uid)).catch(() => null)) || {};
  const next = { ...cur, ...patch, uid };
  await redisSetJSON(profileKey(uid), next).catch(() => {});
  return next;
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
    // KORUNMAK ZORUNDA: bu nesne sıfırdan kuruluyor, taşınmayan her alan
    // kullanıcı adı değiştirildiğinde sessizce siliniyor.
    avatar: existing?.avatar ?? null,
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
    await redisPipeline([
      ['DEL', usernameKey(existing.usernameLower)],
      ['ZREM', USERNAME_INDEX, existing.usernameLower],
    ]).catch(() => {});
  }

  // Ön ek araması için sözlüksel dizine ekle (tüm skorlar 0 → ZRANGEBYLEX)
  await redisCmd(['ZADD', USERNAME_INDEX, '0', lower]).catch(() => {});

  return { ok: true, profile };
}

/**
 * Kullanıcı adı ön ekiyle arama.
 *
 * TASARIM: Yalnızca ÖN EK ile arama yapılır — kullanıcı listesi gezilemez.
 * Birini bulmak için adının başını bilmek gerekir; bu, rastgele keşfi
 * kapatarak gizliliği korur.
 */
export async function searchUsers(query, viewerUid, limit = 20) {
  const q = String(query || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (q.length < 2) return [];

  // ZRANGEBYLEX ile [q, q\xff) aralığı = q ile başlayanlar
  const names = await redisCmd([
    'ZRANGEBYLEX', USERNAME_INDEX, `[${q}`, `[${q}\xff`, 'LIMIT', '0', String(limit * 2),
  ]);
  if (!Array.isArray(names) || names.length === 0) return [];

  const uidRows = await redisPipeline(names.map((n) => ['GET', usernameKey(n)]));
  const uids = (uidRows || []).filter(Boolean);

  const [hidden, profiles] = await Promise.all([
    getHiddenUids(viewerUid),
    getProfiles(uids),
  ]);

  const out = [];
  for (const uid of uids) {
    if (uid === viewerUid) continue;      // kendini gösterme
    if (hidden.has(uid)) continue;        // engel varsa iki yönde de gizle
    const p = profiles[uid];
    if (!p) continue;
    out.push({ uid, username: p.username, displayName: p.displayName || p.username, avatar: p.avatar || null });
    if (out.length >= limit) break;
  }
  return out;
}

// ── Gizlilik ────────────────────────────────────────────────────────────────

// showPresence: cevrimici durumum ve son gorulmem arkadaslarima gorunsun mu.
// Varsayilan ACIK — mesajlasmanin dogal parcasi; kapatmak kullanicinin secimi.
const DEFAULT_PRIVACY = { shareActivity: true, discoverable: true, showPresence: true };

export async function getPrivacy(uid) {
  const p = await redisGetJSON(privacyKey(uid)).catch(() => null);
  return { ...DEFAULT_PRIVACY, ...(p || {}) };
}

export async function setPrivacy(uid, patch = {}) {
  const cur = await getPrivacy(uid);
  const next = {
    shareActivity: patch.shareActivity != null ? !!patch.shareActivity : cur.shareActivity,
    discoverable: patch.discoverable != null ? !!patch.discoverable : cur.discoverable,
    showPresence: patch.showPresence != null ? !!patch.showPresence : cur.showPresence,
    updatedAt: Date.now(),
  };
  await redisSetJSONStrict(privacyKey(uid), next);
  return next;
}

// ── Arkadaşlık ──────────────────────────────────────────────────────────────

export async function areFriends(a, b) {
  const r = await redisCmd(['SISMEMBER', friendsKey(a), b]);
  return Number(r) === 1;
}

/** Arkadaş listesi + bekleyen istekler (tek turda). */
export async function getFriendState(uid) {
  const rows = await redisPipeline([
    ['SMEMBERS', friendsKey(uid)],
    ['SMEMBERS', reqInKey(uid)],
    ['SMEMBERS', reqOutKey(uid)],
  ]);
  const [friends, incoming, outgoing] = (rows || []).map((r) => (Array.isArray(r) ? r : []));
  return { friends: friends || [], incoming: incoming || [], outgoing: outgoing || [] };
}

export async function getFriends(uid) {
  const r = await redisCmd(['SMEMBERS', friendsKey(uid)]);
  return Array.isArray(r) ? r : [];
}

/**
 * Arkadaşlık isteği gönderir.
 * Karşı taraf bana zaten istek göndermişse DOĞRUDAN arkadaş oluruz —
 * iki kişi aynı anda istek atınca ikisi de "bekliyor" ekranında kalmasın.
 */
export async function sendFriendRequest(uid, targetUid) {
  if (!uid || !targetUid || uid === targetUid) return { ok: false, error: 'INVALID_TARGET' };

  if (await isBlockedBetween(uid, targetUid)) return { ok: false, error: 'BLOCKED' };
  if (await areFriends(uid, targetUid)) return { ok: false, error: 'ALREADY_FRIENDS' };

  const count = Number(await redisCmd(['SCARD', friendsKey(uid)])) || 0;
  if (count >= MAX_FRIENDS) return { ok: false, error: 'FRIEND_LIMIT' };

  // Karşılıklı istek → anında arkadaşlık
  const mutual = Number(await redisCmd(['SISMEMBER', reqInKey(uid), targetUid])) || 0;
  if (mutual === 1) {
    await acceptFriendRequest(uid, targetUid);
    return { ok: true, status: 'friends' };
  }

  await redisPipeline([
    ['SADD', reqOutKey(uid), targetUid],
    ['SADD', reqInKey(targetUid), uid],
  ]);
  return { ok: true, status: 'requested' };
}

/** İsteği kabul eder (uid = isteği ALAN kişi). */
export async function acceptFriendRequest(uid, requesterUid) {
  const pending = Number(await redisCmd(['SISMEMBER', reqInKey(uid), requesterUid])) || 0;
  if (pending !== 1) return { ok: false, error: 'NO_REQUEST' };
  if (await isBlockedBetween(uid, requesterUid)) return { ok: false, error: 'BLOCKED' };

  await redisPipeline([
    ['SADD', friendsKey(uid), requesterUid],
    ['SADD', friendsKey(requesterUid), uid],
    ['SREM', reqInKey(uid), requesterUid],
    ['SREM', reqOutKey(requesterUid), uid],
    // Ters yöndeki olası istek kalıntısını da temizle
    ['SREM', reqOutKey(uid), requesterUid],
    ['SREM', reqInKey(requesterUid), uid],
  ]);
  return { ok: true, status: 'friends' };
}

export async function rejectFriendRequest(uid, requesterUid) {
  await redisPipeline([
    ['SREM', reqInKey(uid), requesterUid],
    ['SREM', reqOutKey(requesterUid), uid],
  ]);
  return { ok: true, status: 'none' };
}

export async function cancelFriendRequest(uid, targetUid) {
  await redisPipeline([
    ['SREM', reqOutKey(uid), targetUid],
    ['SREM', reqInKey(targetUid), uid],
  ]);
  return { ok: true, status: 'none' };
}

export async function removeFriend(uid, targetUid) {
  await redisPipeline([
    ['SREM', friendsKey(uid), targetUid],
    ['SREM', friendsKey(targetUid), uid],
  ]);
  return { ok: true, status: 'none' };
}

// ── Aktivite ────────────────────────────────────────────────────────────────

/**
 * Aktivite kaydeder. Gizlilik ayarı kapalıysa HİÇ YAZILMAZ —
 * "yaz ama gösterme" yaklaşımı, kullanıcı paylaşmak istemediğini söylediği
 * hâlde veriyi biriktirmek olurdu.
 */
export async function recordActivity(uid, item) {
  const privacy = await getPrivacy(uid);
  if (!privacy.shareActivity) return { ok: true, skipped: true };

  const entry = {
    uid,
    type: String(item.type || '').slice(0, 24),
    gameId: String(item.gameId || '').slice(0, 64),
    gameName: String(item.gameName || '').slice(0, 120),
    gameImage: String(item.gameImage || '').slice(0, 400),
    extra: String(item.extra || '').slice(0, 80),
    ts: Date.now(),
  };

  await redisPipeline([
    ['LPUSH', activityKey(uid), JSON.stringify(entry)],
    ['LTRIM', activityKey(uid), '0', String(ACTIVITY_KEEP - 1)],
  ]);
  return { ok: true };
}

/**
 * Arkadaşların aktivite akışı.
 *
 * OKUMA ANINDA TOPLAMA kullanılıyor (yazma anında dağıtım değil): Upstash
 * komut başına ücretlendirdiği için, her eyleme karşılık N arkadaşın akışına
 * yazmak pahalıya patlardı. Okumada tüm arkadaşların listesi TEK pipeline
 * turunda çekilip birleştiriliyor.
 */
export async function getFriendActivity(uid, limit = 40) {
  const [friends, hidden] = await Promise.all([getFriends(uid), getHiddenUids(uid)]);
  const visible = friends.filter((f) => !hidden.has(f)).slice(0, MAX_FRIENDS);
  if (visible.length === 0) return [];

  const rows = await redisPipeline(
    visible.map((f) => ['LRANGE', activityKey(f), '0', String(ACTIVITY_KEEP - 1)])
  );

  const items = [];
  (rows || []).forEach((list) => {
    if (!Array.isArray(list)) return;
    for (const raw of list) {
      const e = parseJSON(raw);
      if (e) items.push(e);
    }
  });

  items.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const top = items.slice(0, limit);

  // Profilleri tek turda ekle
  const profiles = await getProfiles(top.map((i) => i.uid));
  return top.map((i) => ({
    ...i,
    username: profiles[i.uid]?.username || null,
    displayName: profiles[i.uid]?.displayName || profiles[i.uid]?.username || null,
    avatar: profiles[i.uid]?.avatar || null,
  }));
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
