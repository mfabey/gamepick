import { redisCmd, redisPipeline, parseJSON } from './redis';
import { getPost, parseReviewRef } from './post-store';

// ─────────────────────────────────────────────────────────────────────────────
// BİLDİRİM MERKEZİ — mobil G-20 (27 Eyl).
//
// Önceden kalıcı bir bildirim listesi yoktu: push geliyor, açılınca
// kayboluyordu; arkadaşlık isteği, yanıt ve beğeni ancak ilgili ekrana
// girilince fark ediliyordu.
//
// Anahtarlar:
//   notif:{uid}        → ZSET  id, skor = son güncelleme zamanı
//   notif_items:{uid}  → HASH  id → JSON kayıt
//   notif_seen:{uid}   → STR   "tümünü okundu" zamanı (ms)
//
// TOPLANAN BİLDİRİMLER. Beğeni ve yanıt her olayda yeni satır açmıyor:
// kimlik gönderiye bağlı (`like:{postId}`, `reply:{kök}`), yeni olay aynı
// kaydı güncelleyip en üste taşıyor ve OKUNMADI yapıyor. Kit'teki
// "Burak ve 12 kişi gönderini beğendi" satırı bu; sayı gönderinin o anki
// beğeni sayısından, uydurma değil.
//
// Kullanıcı başına en çok 100 kayıt; taşan en eskiler siliniyor.
//
// HATA FIRLATMAZ: bildirim yan etkidir. Beğeni ya da yanıt, bildirim
// yazılamadı diye başarısız olmamalı (push.js ile aynı ilke).
// ─────────────────────────────────────────────────────────────────────────────

const MAX = 100;
const MAX_ACTORS = 3;

const listKey  = (uid) => `notif:${uid}`;
const itemsKey = (uid) => `notif_items:${uid}`;
const seenKey  = (uid) => `notif_seen:${uid}`;

export const NOTIF_TYPES = ['friend_request', 'friend_accept', 'post_reply', 'post_like', 'price_drop', 'price_target'];

/**
 * @param {string} uid        alıcı
 * @param {object} n
 * @param {string} n.type     NOTIF_TYPES'tan biri
 * @param {string} [n.actor]  olayı yapan uid (kendine bildirim gönderilmez)
 * @param {string} [n.key]    toplama anahtarı — aynı anahtar aynı kaydı günceller
 * @param {object} [n.data]   türe özgü alanlar (gönderi kimliği, oyun, fiyat…)
 */
export async function addNotif(uid, { type, actor = null, key = null, data = {} }) {
  try {
    if (!uid || !NOTIF_TYPES.includes(type)) return;
    if (actor && actor === uid) return;
    const now = Date.now();
    const id = key || `${type}:${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    let prev = null;
    if (key) prev = parseJSON(await redisCmd(['HGET', itemsKey(uid), id]));
    const actors = actor
      ? [actor, ...((prev?.actors) || []).filter((a) => a !== actor)].slice(0, MAX_ACTORS)
      : (prev?.actors || []);
    const item = { id, type, ts: now, actors, data: { ...(prev?.data || {}), ...data }, read: false };

    await redisPipeline([
      ['HSET', itemsKey(uid), id, JSON.stringify(item)],
      ['ZADD', listKey(uid), String(now), id],
    ]);

    // Taşanı buda. ZCARD ayrı tur: çoğu yazmada liste sınırın altında ve
    // ZRANGE hiç çağrılmıyor.
    const card = Number(await redisCmd(['ZCARD', listKey(uid)])) || 0;
    if (card > MAX) {
      const old = await redisCmd(['ZRANGE', listKey(uid), '0', String(card - MAX - 1)]);
      if (Array.isArray(old) && old.length) {
        await redisPipeline([
          ['ZREM', listKey(uid), ...old],
          ['HDEL', itemsKey(uid), ...old],
        ]);
      }
    }
  } catch (e) {
    console.warn('bildirim yazılamadı:', e?.message);
  }
}

/** Liste + okunmamış sayısı. En yeni önce. */
export async function listNotifs(uid, { limit = MAX } = {}) {
  if (!uid) return { items: [], unread: 0 };
  const [ids, seenRaw] = await redisPipeline([
    ['ZREVRANGE', listKey(uid), '0', String(Math.min(limit, MAX) - 1)],
    ['GET', seenKey(uid)],
  ]) || [];
  const list = Array.isArray(ids) ? ids : [];
  if (!list.length) return { items: [], unread: 0 };
  const raw = await redisCmd(['HMGET', itemsKey(uid), ...list]);
  const seen = Number(seenRaw) || 0;
  const items = (Array.isArray(raw) ? raw : []).map(parseJSON).filter(Boolean)
    .map((it) => ({ ...it, read: !!it.read || it.ts <= seen }));
  return { items, unread: items.filter((it) => !it.read).length };
}

/** Yalnız sayı — rozet için. listNotifs ile aynı kural. */
export async function unreadCount(uid) {
  return (await listNotifs(uid)).unread;
}

/** `ids` verilirse onlar, verilmezse hepsi okundu. */
export async function markRead(uid, ids = null) {
  if (!uid) return;
  if (!Array.isArray(ids)) {
    await redisCmd(['SET', seenKey(uid), String(Date.now())]);
    return;
  }
  const temiz = ids.map(String).filter(Boolean).slice(0, MAX);
  if (!temiz.length) return;
  const raw = await redisCmd(['HMGET', itemsKey(uid), ...temiz]);
  const cmds = [];
  (Array.isArray(raw) ? raw : []).forEach((r, i) => {
    const it = parseJSON(r);
    if (it && !it.read) cmds.push(['HSET', itemsKey(uid), temiz[i], JSON.stringify({ ...it, read: true })]);
  });
  if (cmds.length) await redisPipeline(cmds);
}

/** Hesap silinince. */
export async function deleteNotifs(uid) {
  if (!uid) return;
  await redisPipeline([['DEL', listKey(uid)], ['DEL', itemsKey(uid)], ['DEL', seenKey(uid)]]);
}

// ── Olay yardımcıları: rotalar bunları çağırıyor ──────────────────────────────

const ozet = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 90);

/** Yeni yanıt → kökün sahibine. Kök gönderi ya da inceleme olabilir. */
export async function notifyReply(reply) {
  try {
    if (!reply?.replyTo) return;
    const rev = parseReviewRef(reply.replyTo);
    let owner = null;
    let game = null;
    if (rev) {
      owner = rev.uid;
    } else {
      const root = await getPost(reply.replyTo);
      owner = root?.uid || null;
      game = root?.game || null;
    }
    if (!owner) return;
    const n = Number(await redisCmd(['ZCARD', `post_replies:${reply.replyTo}`])) || 1;
    await addNotif(owner, {
      type: 'post_reply', actor: reply.uid, key: `reply:${reply.replyTo}`,
      data: { postId: reply.replyTo, review: !!rev, excerpt: ozet(reply.text), count: n, game },
    });
  } catch { /* yan etki */ }
}

/** Beğeni → gönderinin sahibine (yalnız beğenildiğinde, geri alınınca değil). */
export async function notifyLike(post, likerUid, likeCount) {
  if (!post?.uid) return;
  await addNotif(post.uid, {
    type: 'post_like', actor: likerUid, key: `like:${post.id}`,
    data: { postId: post.id, excerpt: ozet(post.text), count: Number(likeCount) || 1, game: post.game || null },
  });
}
