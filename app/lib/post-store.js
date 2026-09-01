import { redisCmd, redisPipeline, parseJSON } from './redis';
// İnceleme kökünün VARLIĞINI doğrulamak için. Tek yönlü bağımlılık:
// review-store bu dosyayı tanımıyor, yani döngü yok.
import { getReview } from './review-store';

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

// ── İnceleme kökü adresi ──
// Bir inceleme gönderi değil ama yanıt alabiliyor. Kimliği gönderi
// kimlikleriyle AYNI ad uzayında duruyor (`post_replies:{kök}` anahtarı
// ikisini de taşıyor); `r:` öneki ayrımı yapıyor, gönderi kimlikleri `p_`
// ile başlıyor, yani çakışma mümkün değil.
export const reviewRef = (appid, uid) => `r:${appid}:${uid}`;

/** `r:{appid}:{uid}` → `{ appid, uid }`; gönderi kimliğiyse null. */
export function parseReviewRef(id) {
  const s = String(id || '');
  if (!s.startsWith('r:')) return null;
  const i = s.indexOf(':', 2);
  if (i < 0) return null;
  const appid = s.slice(2, i);
  const uid = s.slice(i + 1);
  return appid && uid ? { appid, uid } : null;
}

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
    const rev = parseReviewRef(replyTo);
    if (rev) {
      // ── İNCELEME KÖKÜ ──
      // İncelemeye yazılan yanıt OYUN SAYFASINDA DEĞİL topluluk konusunda
      // görünüyor. Bunun için inceleme, gönderi kimlikleriyle aynı ad
      // uzayında adreslenebilir olmak zorundaydı: `r:{appid}:{uid}`.
      //
      // AYNA GÖNDERİ AÇILMADI. Alternatif tasarım, her inceleme için ona
      // bağlı görünmez bir kök gönderi yaratmaktı; o zaman aynı içerik iki
      // kayıtta yaşar ve inceleme düzenlenince ikisi ayrışırdı. İnceleme
      // kaydı tek doğruluk kaynağı kalıyor, yanıtlar ona bağlanıyor.
      const parent = await getReview(rev.appid, rev.uid);
      if (!parent) return null;
    } else {
      const parent = parseJSON(await redisCmd(['GET', postKey(replyTo)]));
      if (!parent) return null;
      // Düz tartışma: yanıta yanıt yok, kök gönderiye bağlanır.
      if (parent.replyTo) replyTo = parent.replyTo;
    }
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

/**
 * ARKADAŞ AKIŞI — yalnız arkadaşların kök gönderileri, en yeni önce.
 *
 * NEDEN GLOBAL AKIŞI SÜZMÜYORUZ: `posts_recent` yalnız kimlik tutuyor, yazar
 * uid'i gönderinin İÇİNDE. Süzmek için genel akışın ilk birkaç yüz kaydını
 * okuyup hepsini hydrate etmek gerekirdi — arkadaşı az olan kullanıcıda
 * neredeyse tamamı çöpe giden bir okuma.
 *
 * Bunun yerine her arkadaşın kendi `user_posts` kümesinden okunuyor
 * (tek pipeline) ve zamana göre birleştiriliyor.
 *
 * İKİ SINIR VAR ve bilerek:
 *   · en çok 100 arkadaş taranıyor (MAX_FRIENDS 500; 100 üstü kullanıcı
 *     yok denecek kadar az ve tarama maliyeti doğrusal büyüyor)
 *   · arkadaş başına en çok 60 kayıt okunuyor — sayfa 20 olduğu için
 *     üçüncü sayfaya kadar yetiyor, sonrasında akış doğal olarak duruyor
 *
 * `user_posts` YANITLARI DA TUTUYOR; hydrate sonrası kök olmayanlar eleniyor
 * (akış konuşmaların kökünü gösteriyor).
 */
export async function listFriendFeed(friendUids = [], { limit = 20, offset = 0, viewerUid = null } = {}) {
  const uids = (friendUids || []).filter(Boolean).slice(0, 100);
  if (uids.length === 0) return [];

  const perUser = Math.min(offset + limit * 2, 60);
  const rows = await redisPipeline(
    uids.map((u) => ['ZREVRANGE', userKey(u), '0', String(perUser - 1), 'WITHSCORES'])
  );

  // Upstash düz dizi döndürüyor: [id, skor, id, skor…]
  const merged = [];
  for (const r of rows || []) {
    if (!Array.isArray(r)) continue;
    for (let i = 0; i < r.length; i += 2) merged.push([r[i], Number(r[i + 1]) || 0]);
  }
  merged.sort((a, b) => b[1] - a[1]);

  // Kökler ancak hydrate sonrası ayırt edilebiliyor (replyTo kaydın içinde),
  // o yüzden sayfadan biraz FAZLA çekilip sonra kesiliyor.
  const aday = merged.slice(0, offset + limit * 3).map(([id]) => id);
  const dolu = await hydrate(aday, viewerUid);
  return dolu.filter((p) => !p.replyTo).slice(offset, offset + limit);
}

/** Bir gönderinin yanıtları — ESKİDEN YENİYE, konuşma sırası bozulmasın. */
export async function listReplies(id, { limit = 50, viewerUid = null } = {}) {
  const capped = Math.min(limit, MAX_REPLIES);
  const ids = await redisCmd(['ZRANGE', repliesKey(id), '0', String(capped - 1)]);
  return hydrate(Array.isArray(ids) ? ids : [], viewerUid);
}

/**
 * Bir kullanıcının gönderileri — en yeni önce.
 *
 * offset EKLENDİ: profilin "Gönderiler" sekmesi sonsuz kaydırıyor ve bu
 * fonksiyon 20'de sabit duruyordu — çok yazan bir kullanıcı kendi 21.
 * gönderisini profilinde göremezdi. (listUserReviews'ta aynı düzeltme
 * bir sürüm önce yapılmıştı; ikisi artık aynı sözleşmede.)
 */
export async function listUserPosts(uid, { limit = 20, offset = 0, viewerUid = null } = {}) {
  const start = Math.max(0, offset);
  const ids = await redisCmd(['ZREVRANGE', userKey(uid), String(start), String(start + limit - 1)]);
  return hydrate(Array.isArray(ids) ? ids : [], viewerUid);
}

/**
 * Birden çok kökün yanıt sayısı — TEK TURDA.
 *
 * Oyun sayfası bir seferde 3 inceleme, profil sekmesi 20 inceleme çiziyor ve
 * her birinin altında "n yanıt" duruyor. Tek tek sorulsaydı sayfa başına
 * 20 tur ederdi.
 *
 * Anahtarlar gönderi kimliği de olabilir, inceleme kökü de: `post_replies:`
 * ikisini de taşıyor.
 */
export async function countReplies(ids = []) {
  const list = [...new Set(ids.filter(Boolean))];
  if (list.length === 0) return {};
  const rows = await redisPipeline(list.map((id) => ['ZCARD', repliesKey(id)]));
  const out = {};
  list.forEach((id, i) => { out[id] = Number(rows?.[i]) || 0; });
  return out;
}

/** Kullanıcının gönderi sayısı — profil sayacı. (countUserReviews ile aynı gerekçe.) */
export async function countUserPosts(uid) {
  if (!uid) return 0;
  return Number(await redisCmd(['ZCARD', userKey(uid)])) || 0;
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
