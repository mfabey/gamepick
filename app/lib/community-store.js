import { redisCmd, redisPipeline, parseJSON } from './redis';
import { hydratePosts } from './post-store';

// ─────────────────────────────────────────────────────────────────────────────
// OYUN TOPLULUKLARI — mobil G-11 (27 Eyl).
//
// Topluluk ayrı bir içerik türü DEĞİL: oyun etiketli kök gönderiler o oyunun
// topluluğu. Yeni bir yazma yolu açılmadı; gönderi deposu (post-store) tek
// doğruluk kaynağı kalıyor, burada yalnız DİZİN ve ÜYELİK var. Böylece
// beğeni, yanıt, silme, raporlama ve engelleme toplulukta da aynı koddan
// geçiyor.
//
// "Takip" = topluluğa katılmak. Kullanıcı takibi (takipçi/takip edilen)
// bu işin kapsamında değil; arkadaşlık modeli duruyor.
//
// Anahtarlar:
//   community_posts:{appid}    → ZSET  gönderi id, skor = yazılma zamanı
//   community_members:{appid}  → SET   üye uid'ler
//   community_meta:{appid}     → JSON  { appid, name, image }
//   user_communities:{uid}     → ZSET  appid, skor = katılma zamanı
//   community_seen:{uid}       → HASH  appid → son ziyaret (ms) — "12 yeni"
//   communities_active         → ZSET  appid, skor = gönderi sayısı (keşfet)
//   community_indexed:{appid}  → "1"   eski gönderiler dizine alındı
// ─────────────────────────────────────────────────────────────────────────────

const postsKey   = (a) => `community_posts:${a}`;
const membersKey = (a) => `community_members:${a}`;
const metaKey    = (a) => `community_meta:${a}`;
const userKey    = (u) => `user_communities:${u}`;
const seenKey    = (u) => `community_seen:${u}`;
const ACTIVE     = 'communities_active';
const indexedKey = (a) => `community_indexed:${a}`;

const MAX_JOINED = 200;

/** appid yalnız rakam: anahtar ad uzayına serbest metin girmesin. */
export function cleanAppid(v) {
  const s = String(v ?? '').trim();
  return /^\d{1,10}$/.test(s) ? s : null;
}

function cleanMeta(appid, { name, image } = {}) {
  return {
    appid,
    name: String(name || '').slice(0, 120),
    image: /^https:\/\//.test(String(image || '')) ? String(image).slice(0, 500) : '',
  };
}

async function ensureMeta(appid, meta) {
  if (!meta?.name) return;
  // NX: ilk gelen ad kalıcı; her gönderi/katılma adı yeniden yazmasın.
  await redisCmd(['SET', metaKey(appid), JSON.stringify(cleanMeta(appid, meta)), 'NX']);
}

/** Yeni kök gönderi → topluluk dizini. (api/social/posts create) */
export async function indexCommunityPost(post) {
  try {
    const appid = cleanAppid(post?.game?.appid);
    if (!appid || post.replyTo) return;
    await redisPipeline([
      ['ZADD', postsKey(appid), String(post.at || Date.now()), post.id],
      ['ZINCRBY', ACTIVE, '1', appid],
    ]);
    await ensureMeta(appid, post.game);
  } catch { /* yan etki */ }
}

/** Gönderi silinince dizinden de. */
export async function unindexCommunityPost(post) {
  try {
    const appid = cleanAppid(post?.game?.appid);
    if (!appid || post.replyTo) return;
    await redisPipeline([
      ['ZREM', postsKey(appid), post.id],
      ['ZINCRBY', ACTIVE, '-1', appid],
    ]);
  } catch { /* yan etki */ }
}

/**
 * Bu özellikten ÖNCE yazılmış oyun etiketli gönderiler dizinde yok. İlk
 * ziyarette genel akışın son 500 kaydı taranıp bir kez dizine alınıyor;
 * bayrak sonraki ziyaretlerde taramayı atlatıyor.
 */
async function backfill(appid) {
  if (await redisCmd(['GET', indexedKey(appid)])) return;
  const ids = await redisCmd(['ZREVRANGE', 'posts_recent', '0', '499', 'WITHSCORES']);
  const pairs = [];
  if (Array.isArray(ids)) for (let i = 0; i < ids.length; i += 2) pairs.push([ids[i], ids[i + 1]]);
  if (pairs.length) {
    const rows = await redisPipeline(pairs.map(([id]) => ['GET', `post:${id}`]));
    const cmds = [];
    (rows || []).forEach((r, i) => {
      const p = parseJSON(r);
      if (p && !p.replyTo && String(p.game?.appid || '') === appid) cmds.push(['ZADD', postsKey(appid), String(pairs[i][1]), p.id]);
    });
    if (cmds.length) await redisPipeline(cmds);
  }
  await redisCmd(['SET', indexedKey(appid), '1']);
}

export async function getCommunity(appid, viewerUid = null) {
  await backfill(appid);
  const rows = await redisPipeline([
    ['GET', metaKey(appid)],
    ['SCARD', membersKey(appid)],
    ['ZCARD', postsKey(appid)],
    viewerUid ? ['SISMEMBER', membersKey(appid), viewerUid] : ['PING'],
  ]) || [];
  const meta = parseJSON(rows[0]) || { appid, name: '', image: '' };
  return {
    ...meta,
    appid,
    memberCount: Number(rows[1]) || 0,
    postCount: Number(rows[2]) || 0,
    joined: viewerUid ? Number(rows[3]) === 1 : false,
  };
}

/** Son gönderiler — en yeni önce. */
export async function listCommunityPosts(appid, { offset = 0, limit = 20, viewerUid = null } = {}) {
  const ids = await redisCmd(['ZREVRANGE', postsKey(appid), String(offset), String(offset + Math.min(limit, 50) - 1)]);
  return hydratePosts(Array.isArray(ids) ? ids : [], viewerUid);
}

/**
 * "Popüler tartışmalar" (kit): son 100 gönderiden etkileşimi olanlar,
 * yanıt ağırlıklı. Etkileşim yoksa BOŞ — sıradan gönderiyi popüler diye
 * sunmuyoruz.
 */
export async function popularCommunityPosts(appid, viewerUid = null) {
  const ids = await redisCmd(['ZREVRANGE', postsKey(appid), '0', '99']);
  const posts = await hydratePosts(Array.isArray(ids) ? ids : [], viewerUid);
  return posts
    .filter((p) => p.replyCount > 0 || p.likeCount > 1)
    .sort((a, b) => (b.replyCount * 3 + b.likeCount) - (a.replyCount * 3 + a.likeCount))
    .slice(0, 3);
}

export async function joinCommunity(uid, appid, meta) {
  const count = Number(await redisCmd(['ZCARD', userKey(uid)])) || 0;
  if (count >= MAX_JOINED) return { ok: false, error: 'COMMUNITY_LIMIT' };
  const now = Date.now();
  await redisPipeline([
    ['SADD', membersKey(appid), uid],
    ['ZADD', userKey(uid), String(now), appid],
    ['HSET', seenKey(uid), appid, String(now)],
  ]);
  await ensureMeta(appid, meta);
  return { ok: true };
}

export async function leaveCommunity(uid, appid) {
  await redisPipeline([
    ['SREM', membersKey(appid), uid],
    ['ZREM', userKey(uid), appid],
    ['HDEL', seenKey(uid), appid],
  ]);
  return { ok: true };
}

/** Üye ziyaret etti: "n yeni" sayacı sıfırlanır. */
export async function markCommunitySeen(uid, appid) {
  if (!uid) return;
  const member = Number(await redisCmd(['ZSCORE', userKey(uid), appid])) > 0;
  if (member) await redisCmd(['HSET', seenKey(uid), appid, String(Date.now())]);
}

async function withCounts(appids, extra = {}) {
  if (!appids.length) return [];
  const rows = await redisPipeline(appids.flatMap((a) => [['GET', metaKey(a)], ['SCARD', membersKey(a)], ['ZCARD', postsKey(a)]])) || [];
  return appids.map((a, i) => ({
    ...(parseJSON(rows[i * 3]) || { name: '', image: '' }),
    appid: a,
    memberCount: Number(rows[i * 3 + 1]) || 0,
    postCount: Number(rows[i * 3 + 2]) || 0,
    ...(extra[a] || {}),
  })).filter((c) => c.name);
}

/** Katıldığım topluluklar + son ziyaretten beri yeni gönderi sayısı. */
export async function listMyCommunities(uid) {
  const appids = await redisCmd(['ZREVRANGE', userKey(uid), '0', '49']);
  const list = Array.isArray(appids) ? appids : [];
  if (!list.length) return [];
  const seen = await redisCmd(['HMGET', seenKey(uid), ...list]);
  const counts = await redisPipeline(list.map((a, i) => ['ZCOUNT', postsKey(a), `(${Number(seen?.[i]) || 0}`, '+inf'])) || [];
  const extra = {};
  list.forEach((a, i) => { extra[a] = { newCount: Number(counts[i]) || 0, joined: true }; });
  return withCounts(list, extra);
}

/** Keşfet: en çok gönderi alan topluluklar. */
export async function discoverCommunities(limit = 12) {
  const appids = await redisCmd(['ZREVRANGEBYSCORE', ACTIVE, '+inf', '1', 'LIMIT', '0', String(limit)]);
  return withCounts(Array.isArray(appids) ? appids : []);
}

/**
 * Birleşik arama (G-06) "Topluluklar" kapsamı: etkin toplulukların adında
 * geçen. Tam metin dizini yok; topluluk sayısı küçük (en etkin 200 taranıyor).
 */
export async function searchCommunities(q, limit = 20) {
  const aranan = String(q || '').toLocaleLowerCase('tr-TR').trim();
  if (aranan.length < 2) return [];
  const appids = await redisCmd(['ZREVRANGEBYSCORE', ACTIVE, '+inf', '1', 'LIMIT', '0', '200']);
  const list = await withCounts(Array.isArray(appids) ? appids : []);
  return list.filter((c) => c.name.toLocaleLowerCase('tr-TR').includes(aranan)).slice(0, limit);
}

/** Hesap silinince: tüm üyeliklerden çık, kişisel anahtarları sil. */
export async function deleteUserCommunities(uid) {
  if (!uid) return;
  const appids = await redisCmd(['ZRANGE', userKey(uid), '0', '-1']);
  const cmds = (Array.isArray(appids) ? appids : []).map((a) => ['SREM', membersKey(a), uid]);
  cmds.push(['DEL', userKey(uid)], ['DEL', seenKey(uid)]);
  await redisPipeline(cmds);
}
