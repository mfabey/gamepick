import { redisCmd, redisPipeline, parseJSON } from './redis';

// ─────────────────────────────────────────────────────────────────────────────
// Doğrulanmış incelemeler — veri katmanı.
//
// ANAHTARLAR
//   review:{appid}:{uid}   → JSON  incelemenin kendisi
//   game_reviews:{appid}   → ZSET  uid, skor = yazılma zamanı
//   user_reviews:{uid}     → ZSET  appid, skor = yazılma zamanı
//
// SAAT ANLIK GÖRÜNTÜ, canlı değil. İki sebep:
//  1. İnceleme O ANDAKİ deneyimi anlatıyor. Altı ay sonra 400 saat olmuşsa,
//     40 saatte yazılmış inceleme yine 40 saatlik bir izlenim.
//  2. Her satırı çizerken Steam'e gitmek — bir oyunun 50 incelemesi için 50
//     çağrı — kotayı da hızı da bitirir.
//
// SAAT İSTEMCİDEN ALINMIYOR, sunucu Steam'den okuyor. Özelliğin tüm değeri
// buradan geliyor: kullanıcı "500 saatim var" diye gönderebilseydi
// "doğrulanmış" kelimesi anlamsız olurdu.
//
// KULLANICI BAŞINA OYUN BAŞINA TEK inceleme. Tekrar yazmak öncekini
// güncelliyor — aksi hâlde aynı kişi bir oyunun altına on kayıt bırakabilirdi.
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_REVIEW_TEXT = 2000;

// Kaç saat oynamış olmak gerekiyor. Oyun kartlarıyla AYNI eşik — iki yerde
// farklı sayı kullanmak "neden burada yazamıyorum" sorusunu doğurur.
export const MIN_HOURS = 1;

// Akışta tutulan en fazla kayıt. Akış bir arşiv değil; eskiler düşüyor.
const RECENT_MAX = 500;

const revKey  = (appid, uid) => `review:${appid}:${uid}`;
const gameKey = (appid)      => `game_reviews:${appid}`;
const userKey = (uid)        => `user_reviews:${uid}`;
// Genel akış — TÜM oyunların incelemeleri tek sırada.
//
// Ayrı bir anahtar tutuluyor çünkü oyun başına ZSET'leri tarayıp
// birleştirmek, oyun sayısı arttıkça imkânsız hâle gelirdi.
const recentKey = () => 'reviews_recent';

/**
 * İncelemeyi yazar veya günceller.
 *
 * @param {object} p
 * @param {string} p.uid
 * @param {number} p.appid
 * @param {string} p.text
 * @param {boolean} p.recommended
 * @param {number} p.hours  SUNUCUDA Steam'den okunmuş olmalı
 */
export async function saveReview({ uid, appid, text, recommended, hours, gameName }) {
  const id = String(appid);
  const now = Date.now();

  const prev = parseJSON(await redisCmd(['GET', revKey(id, uid)]));
  const review = {
    uid,
    appid: id,
    text,
    recommended: !!recommended,
    hours,
    // OYUN ADI KAYITLA BİRLİKTE saklanıyor (denormalizasyon). Akışta 20
    // inceleme için 20 ayrı Steam çağrısı yapmak yerine ad burada duruyor.
    // Ad da kullanıcıdan değil kütüphaneden geliyor.
    gameName: gameName || prev?.gameName || null,
    // İlk yazılma zamanı KORUNUYOR: güncelleme incelemeyi listenin başına
    // taşımamalı, aksi hâlde eski incelemeler düzenlenerek öne çekilebilirdi.
    at: prev?.at || now,
    updatedAt: now,
  };

  await redisPipeline([
    ['SET', revKey(id, uid), JSON.stringify(review)],
    ['ZADD', gameKey(id), String(review.at), uid],
    ['ZADD', userKey(uid), String(review.at), id],
    // Akışta GÜNCELLEME zamanı kullanılıyor, ilk yazılma değil: düzenlenmiş
    // bir inceleme akışta tazelenmeli, oyun sayfasındaki sırası ise
    // değişmemeli (bkz. review.at).
    ['ZADD', recentKey(), String(now), id + ':' + uid],
    ['ZREMRANGEBYRANK', recentKey(), '0', String(-RECENT_MAX - 1)],
  ]);

  return review;
}

/** Kullanıcının bu oyuna yazdığı inceleme (yoksa null). */
export async function getReview(appid, uid) {
  return parseJSON(await redisCmd(['GET', revKey(String(appid), uid)]));
}

/**
 * Bir oyunun incelemeleri — en yeni önce.
 *
 * SAHİPLER TEK TURDA okunuyor: uid listesini alıp her biri için ayrı GET
 * atmak N tur demekti.
 */
export async function listReviews(appid, { limit = 20, offset = 0 } = {}) {
  const id = String(appid);
  const uids = await redisCmd([
    'ZREVRANGE', gameKey(id), String(offset), String(offset + limit - 1),
  ]);
  if (!Array.isArray(uids) || !uids.length) return [];

  const rows = await redisPipeline(uids.map((u) => ['GET', revKey(id, u)])) || [];
  return rows.map(parseJSON).filter(Boolean);
}

/** Kullanıcının yazdığı incelemeler — profilde göstermek için. */
export async function listUserReviews(uid, { limit = 20 } = {}) {
  const appids = await redisCmd(['ZREVRANGE', userKey(uid), '0', String(limit - 1)]);
  if (!Array.isArray(appids) || !appids.length) return [];

  const rows = await redisPipeline(appids.map((a) => ['GET', revKey(a, uid)])) || [];
  return rows.map(parseJSON).filter(Boolean);
}

/**
 * İncelemeyi siler.
 * Yalnızca sahibi çağırabilir — kontrol çağıranda, burada uid zaten anahtarın
 * parçası olduğu için başkasının incelemesine erişmek mümkün değil.
 */
export async function deleteReview(appid, uid) {
  const id = String(appid);
  await redisPipeline([
    ['DEL', revKey(id, uid)],
    ['ZREM', gameKey(id), uid],
    ['ZREM', userKey(uid), id],
    ['ZREM', recentKey(), id + ':' + uid],
  ]);
  return { ok: true };
}

/**
 * Bir oyunun inceleme özeti — toplam ve öneri oranı.
 *
 * ZCARD yeterli değil: öneri oranı için incelemeleri okumak gerekiyor. İlk
 * 100 ile sınırlı, çünkü özet bir eğilim göstergesi; tam sayım için tüm
 * kayıtları çekmek pahalı ve gereksiz.
 */
export async function reviewSummary(appid) {
  const id = String(appid);
  const total = Number(await redisCmd(['ZCARD', gameKey(id)])) || 0;
  if (!total) return { total: 0, recommended: 0, ratio: null };

  const sample = await listReviews(id, { limit: 100 });
  const rec = sample.filter((r) => r.recommended).length;
  return {
    total,
    recommended: rec,
    ratio: sample.length ? Math.round((rec / sample.length) * 100) : null,
  };
}

/**
 * Genel inceleme akışı — tüm oyunlardan, en yeni önce.
 *
 * Üyeler `{appid}:{uid}` biçiminde; kayıtlar TEK turda okunuyor.
 */
export async function listRecentReviews({ limit = 20, offset = 0 } = {}) {
  const ids = await redisCmd([
    'ZREVRANGE', recentKey(), String(offset), String(offset + limit - 1),
  ]);
  if (!Array.isArray(ids) || !ids.length) return [];

  const cmds = ids.map((x) => {
    const i = x.lastIndexOf(':');
    return ['GET', `review:${x.slice(0, i)}:${x.slice(i + 1)}`];
  });
  const rows = await redisPipeline(cmds) || [];
  return rows.map(parseJSON).filter(Boolean);
}
