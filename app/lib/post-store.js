import { redisCmd, redisPipeline, parseJSON } from './redis';

// ─────────────────────────────────────────────────────────────────────────────
// Gönderi deposu — tartışma sayfasının omurgası.
//
// NEDEN İNCELEME DEPOSU KULLANILMADI. `review-store` anahtarı
// `review:{appid}:{uid}`; yani kullanıcı başına oyun başına TEK kayıt ve oyuna
// zorunlu bağlı. Tartışma sayfası bunun tersini istiyor: bir kullanıcı istediği
// kadar gönderi yazabilmeli ve gönderi bir oyuna bağlı OLMAYABİLİR. Model
// esnetilemezdi, ayrı depo açıldı.
//
// İncelemeler kaybolmuyor — akışta ayrı bir tür olarak duruyorlar
// (bkz. services/homeFeed.js, aynı desen).
//
// Anahtarlar:
//   post:{id}              → JSON   gönderinin kendisi
//   posts_recent           → ZSET   id, skor = yazılma zamanı (genel akış)
//   user_posts:{uid}       → ZSET   id, skor = yazılma zamanı
//   post_replies:{id}      → ZSET   yanıt id'si, skor = yazılma zamanı
//   post_likes:{id}        → SET    beğenen uid'ler (sayaç yerine küme:
//                                   çift beğeniyi Redis'in kendisi engelliyor)
//   user_post_likes:{uid}  → SET    beğendiğim gönderi id'leri
//
// YANIT DA BİR GÖNDERİ. Ayrı bir "reply" kaydı yok; yanıtın `replyTo` alanı
// dolu, o kadar. Böylece beğeni, silme, raporlama ve profil listesi tek kod
// yolundan geçiyor. Düz (tek seviye) tartışma: bir yanıta yanıt verilemiyor.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_FEED = 50;
const MAX_REPLIES = 100;

const postKey      = (id)  => `post:${id}`;
const recentKey    = ()    => 'posts_recent';
const userKey      = (uid) => `user_posts:${uid}`;
const repliesKey   = (id)  => `post_replies:${id}`;
const likesKey     = (id)  => `post_likes:${id}`;
const userLikesKey = (uid) => `user_post_likes:${uid}`;

// lists-store ile aynı biçim: zaman öneki sıralanabilirlik, rastgele kuyruk
// çakışmayı engelliyor.
function newId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Gönderi (ya da yanıt) yazar.
 *
 * @param {object} p
 * @param {string} p.uid
 * @param {string} p.text     doğrulanmış metin (çağıran content-filter'dan geçirir)
 * @param {object} [p.game]   `{ appid, name, image }` — isteğe bağlı oyun eki
 * @param {string} [p.replyTo] doluysa bu bir yanıttır
 */
export async function createPost({ uid, text, game = null, replyTo = null }) {
  const id = newId();
  const now = Date.now();

  // Yanıt yazılıyorsa hedef gerçekten var mı? Silinmiş bir gönderiye yanıt
  // kaydı düşerse hiçbir yerde görünmeyen öksüz veri oluşuyor.
  if (replyTo) {
    const parent = parseJSON(await redisCmd(['GET', postKey(replyTo)]));
    if (!parent) return null;
    // Düz tartışma: yanıta yanıt yok, kök gönderiye bağlanır.
    if (parent.replyTo) replyTo = parent.replyTo;
  }

  const post = {
    id,
    uid,
    text,
    game: game && game.appid ? {
      appid: String(game.appid),
      name: String(game.name || '').slice(0, 120),
      image: String(game.image || ''),
    } : null,
    replyTo: replyTo || null,
    at: now,
  };

  const cmds = [
    ['SET', postKey(id), JSON.stringify(post)],
    ['ZADD', userKey(uid), String(now), id],
  ];
  // Yanıtlar genel akışa GİRMİYOR: akış konuşmaların kökünü gösteriyor,
  // yanıtlar kendi gönderisinin altında duruyor.
  if (replyTo) cmds.push(['ZADD', repliesKey(replyTo), String(now), id]);
  else cmds.push(['ZADD', recentKey(), String(now), id]);

  await redisPipeline(cmds);
  return post;
}

export async function getPost(id) {
  return parseJSON(await redisCmd(['GET', postKey(id)]));
}

/** Tek gönderi + sayaçları. Konuşma görünümünün kökü için. */
export async function getPostWithCounts(id, viewerUid = null) {
  const rows = await hydrate([String(id)], viewerUid);
  return rows[0] || null;
}

/** Gönderiyi ve bağlı kayıtlarını siler. Yalnız sahibi çağırmalı. */
export async function deletePost(id, uid) {
  const post = await getPost(id);
  if (!post || post.uid !== uid) return false;

  const cmds = [
    ['DEL', postKey(id)],
    ['ZREM', userKey(uid), id],
    ['DEL', likesKey(id)],
  ];
  if (post.replyTo) cmds.push(['ZREM', repliesKey(post.replyTo), id]);
  else cmds.push(['ZREM', recentKey(), id], ['DEL', repliesKey(id)]);

  await redisPipeline(cmds);
  return true;
}

async function hydrate(ids, viewerUid) {
  if (!Array.isArray(ids) || ids.length === 0) return [];

  const rows = await redisPipeline(ids.map((id) => ['GET', postKey(id)]));
  const posts = (rows || []).map(parseJSON).filter(Boolean);
  if (posts.length === 0) return [];

  // Beğeni sayısı ve yanıt sayısı tek turda
  const counts = await redisPipeline([
    ...posts.map((p) => ['SCARD', likesKey(p.id)]),
    ...posts.map((p) => ['ZCARD', repliesKey(p.id)]),
  ]);
  const n = posts.length;

  const liked = viewerUid ? await likedPostIds(viewerUid) : new Set();

  return posts.map((p, i) => ({
    ...p,
    likeCount: Number(counts?.[i]) || 0,
    replyCount: Number(counts?.[n + i]) || 0,
    likedByMe: liked.has(p.id),
    isMine: !!viewerUid && p.uid === viewerUid,
  }));
}

/** Genel akış — en yeni önce. Yanıtlar burada YOK. */
export async function listFeed({ limit = 20, offset = 0, viewerUid = null } = {}) {
  const capped = Math.min(limit, MAX_FEED);
  const ids = await redisCmd([
    'ZREVRANGE', recentKey(), String(offset), String(offset + capped - 1),
  ]);
  return hydrate(Array.isArray(ids) ? ids : [], viewerUid);
}

/** Bir gönderinin yanıtları — ESKİDEN YENİYE, konuşma sırası bozulmasın. */
export async function listReplies(id, { limit = 50, viewerUid = null } = {}) {
  const capped = Math.min(limit, MAX_REPLIES);
  const ids = await redisCmd(['ZRANGE', repliesKey(id), '0', String(capped - 1)]);
  return hydrate(Array.isArray(ids) ? ids : [], viewerUid);
}

/** Bir kullanıcının gönderileri — en yeni önce. */
export async function listUserPosts(uid, { limit = 20, viewerUid = null } = {}) {
  const ids = await redisCmd(['ZREVRANGE', userKey(uid), '0', String(limit - 1)]);
  return hydrate(Array.isArray(ids) ? ids : [], viewerUid);
}

export async function likedPostIds(uid) {
  const r = await redisCmd(['SMEMBERS', userLikesKey(uid)]);
  return new Set(Array.isArray(r) ? r : []);
}

/**
 * Beğeniyi çevirir. Sayaç tutulmuyor, küme sayılıyor: iki cihazdan aynı anda
 * beğenmek sayacı iki artırırdı, küme bunu kendiliğinden tekilleştiriyor.
 */
export async function toggleLike(id, uid) {
  const post = await getPost(id);
  if (!post) return null;

  const isLiked = await redisCmd(['SISMEMBER', likesKey(id), uid]);
  if (Number(isLiked) === 1) {
    await redisPipeline([
      ['SREM', likesKey(id), uid],
      ['SREM', userLikesKey(uid), id],
    ]);
  } else {
    await redisPipeline([
      ['SADD', likesKey(id), uid],
      ['SADD', userLikesKey(uid), id],
    ]);
  }

  const count = await redisCmd(['SCARD', likesKey(id)]);
  return { liked: Number(isLiked) !== 1, likeCount: Number(count) || 0 };
}
