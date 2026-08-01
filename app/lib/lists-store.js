// ─────────────────────────────────────────────────────────────────────────────
// Topluluk listeleri — kullanıcıların herkese açık yayınladığı oyun listeleri.
// ("En iyi Soulslike", "100 TL altı oyunlar", "En iyi co-op" …)
//
// Redis şeması:
//   list:{id}            → JSON { id, ownerUid, title, description, emoji,
//                                 games[], likeCount, status, createdAt, updatedAt }
//   list_owner:{uid}     → SET  bu kullanıcının yayınladığı liste id'leri
//   list_feed_new        → ZSET skor = createdAt      (keşif: yeni)
//   list_feed_pop        → ZSET skor = likeCount      (keşif: popüler)
//   list_likes:{id}      → SET  beğenen uid'ler
//   user_likes:{uid}     → SET  beğendiğim liste id'leri
//   list_reports:{id}    → SET  şikayet eden uid'ler (otomatik gizleme sayacı)
//
// MODERASYON: Farklı kullanıcılardan AUTO_HIDE_THRESHOLD kadar şikayet gelen
// liste otomatik gizlenir. Apple Guideline 1.2 "zamanında yanıt" istiyor;
// yalnızca manuel incelemeye bel bağlamak, incelemeye kadar geçen sürede
// içeriğin görünür kalması demek olurdu.
// ─────────────────────────────────────────────────────────────────────────────
import {
  redisCmd, redisGetJSON, redisPipeline, redisSetJSONStrict, parseJSON,
} from './redis';
import { getProfiles, getHiddenUids } from './social-store';

export const MAX_LISTS_PER_USER = 20;
export const MAX_GAMES_PER_LIST = 300;
export const AUTO_HIDE_THRESHOLD = 5;

const FEED_NEW = 'list_feed_new';
const FEED_POP = 'list_feed_pop';

function listKey(id)        { return `list:${id}`; }
function ownerKey(uid)      { return `list_owner:${uid}`; }
function likesKey(id)       { return `list_likes:${id}`; }
function userLikesKey(uid)  { return `user_likes:${uid}`; }
function reportsKey(id)     { return `list_reports:${id}`; }

function newListId() {
  return `l_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Oyunun listede saklanan minimal biçimi. */
function slimGame(g) {
  return {
    id: String(g.id ?? ''),
    name: String(g.name || '').slice(0, 140),
    image: String(g.image || '').slice(0, 400),
    appid: g.appid ? String(g.appid) : null,
  };
}

export async function getList(id) {
  if (!id) return null;
  return redisGetJSON(listKey(id)).catch(() => null);
}

/**
 * Liste yayınlar veya günceller.
 * Metin doğrulaması ÇAĞIRANIN sorumluluğunda (content-filter).
 */
export async function publishList(uid, { id, title, description, emoji, games }) {
  const existing = id ? await getList(id) : null;

  if (existing && existing.ownerUid !== uid) {
    return { ok: false, error: 'NOT_OWNER' };
  }

  if (!existing) {
    const count = Number(await redisCmd(['SCARD', ownerKey(uid)])) || 0;
    if (count >= MAX_LISTS_PER_USER) return { ok: false, error: 'LIST_LIMIT' };
  }

  const now = Date.now();
  const listId = existing?.id || newListId();

  const record = {
    id: listId,
    ownerUid: uid,
    title: String(title).slice(0, 80),
    description: String(description || '').slice(0, 300),
    emoji: String(emoji || '🎮').slice(0, 8),
    games: (Array.isArray(games) ? games : []).slice(0, MAX_GAMES_PER_LIST).map(slimGame),
    likeCount: existing?.likeCount || 0,
    // Gizlenmiş bir liste güncellenince otomatik geri gelmemeli —
    // aksi hâlde moderasyon kararı düzenlemeyle atlatılabilirdi.
    status: existing?.status === 'hidden' ? 'hidden' : 'public',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  try {
    await redisSetJSONStrict(listKey(listId), record);
  } catch {
    return { ok: false, error: 'WRITE_FAILED' };
  }

  const cmds = [['SADD', ownerKey(uid), listId]];
  if (record.status === 'public') {
    cmds.push(['ZADD', FEED_NEW, String(record.createdAt), listId]);
    cmds.push(['ZADD', FEED_POP, String(record.likeCount), listId]);
  }
  await redisPipeline(cmds).catch(() => {});

  return { ok: true, list: record };
}

export async function deleteList(uid, id) {
  const list = await getList(id);
  if (!list) return { ok: false, error: 'NOT_FOUND' };
  if (list.ownerUid !== uid) return { ok: false, error: 'NOT_OWNER' };

  await redisPipeline([
    ['DEL', listKey(id)],
    ['SREM', ownerKey(uid), id],
    ['ZREM', FEED_NEW, id],
    ['ZREM', FEED_POP, id],
    ['DEL', likesKey(id)],
    ['DEL', reportsKey(id)],
  ]).catch(() => {});

  return { ok: true };
}

/** Moderasyon: listeyi gizle (keşiften düşer, sahibi görmeye devam eder). */
export async function hideList(id) {
  const list = await getList(id);
  if (!list) return { ok: false };
  list.status = 'hidden';
  list.updatedAt = Date.now();
  await redisSetJSONStrict(listKey(id), list).catch(() => {});
  await redisPipeline([['ZREM', FEED_NEW, id], ['ZREM', FEED_POP, id]]).catch(() => {});
  return { ok: true };
}

/**
 * Şikayeti kaydeder; eşiğe ulaşınca listeyi OTOMATİK gizler.
 * @returns {{ count: number, hidden: boolean }}
 */
export async function recordListReport(listId, reporterUid) {
  await redisCmd(['SADD', reportsKey(listId), reporterUid]).catch(() => {});
  const count = Number(await redisCmd(['SCARD', reportsKey(listId)])) || 0;

  if (count >= AUTO_HIDE_THRESHOLD) {
    await hideList(listId);
    return { count, hidden: true };
  }
  return { count, hidden: false };
}

// ── Beğeni ──────────────────────────────────────────────────────────────────

export async function toggleLike(uid, listId) {
  const list = await getList(listId);
  if (!list) return { ok: false, error: 'NOT_FOUND' };

  const already = Number(await redisCmd(['SISMEMBER', likesKey(listId), uid])) || 0;

  if (already === 1) {
    await redisPipeline([
      ['SREM', likesKey(listId), uid],
      ['SREM', userLikesKey(uid), listId],
    ]);
  } else {
    await redisPipeline([
      ['SADD', likesKey(listId), uid],
      ['SADD', userLikesKey(uid), listId],
    ]);
  }

  // Sayaç kümeden TÜRETİLİYOR, elle artırılmıyor — çift sayım olmaz
  const likeCount = Number(await redisCmd(['SCARD', likesKey(listId)])) || 0;
  list.likeCount = likeCount;
  await redisSetJSONStrict(listKey(listId), list).catch(() => {});

  if (list.status === 'public') {
    await redisCmd(['ZADD', FEED_POP, String(likeCount), listId]).catch(() => {});
  }

  return { ok: true, liked: already !== 1, likeCount };
}

export async function likedListIds(uid) {
  const r = await redisCmd(['SMEMBERS', userLikesKey(uid)]);
  return new Set(Array.isArray(r) ? r : []);
}

// ── Keşif ───────────────────────────────────────────────────────────────────

/**
 * Keşif akışı.
 *
 * Engellenen kullanıcıların listeleri elendiği için ZSET'ten FAZLADAN çekiyoruz;
 * aksi hâlde eleme sonrası sayfa beklenenden kısa dönerdi.
 */
export async function getListFeed(viewerUid, { sort = 'popular', page = 1, pageSize = 20 } = {}) {
  const zset = sort === 'new' ? FEED_NEW : FEED_POP;
  const start = (page - 1) * pageSize;
  const over = pageSize * 3;

  const ids = await redisCmd([
    'ZREVRANGE', zset, String(start), String(start + over - 1),
  ]);
  if (!Array.isArray(ids) || ids.length === 0) return { items: [], hasMore: false };

  const rows = await redisPipeline(ids.map((id) => ['GET', listKey(id)]));
  const lists = (rows || []).map(parseJSON).filter(Boolean);

  const [hidden, liked] = await Promise.all([
    getHiddenUids(viewerUid),
    viewerUid ? likedListIds(viewerUid) : Promise.resolve(new Set()),
  ]);

  const visible = lists.filter(
    (l) => l.status === 'public' && !hidden.has(l.ownerUid)
  );

  const pageItems = visible.slice(0, pageSize);
  const profiles = await getProfiles(pageItems.map((l) => l.ownerUid));

  return {
    items: pageItems.map((l) => shapeForFeed(l, profiles, liked)),
    hasMore: visible.length > pageSize || ids.length >= over,
  };
}

/** Bir kullanıcının yayınladığı listeler. */
export async function getUserLists(ownerUid, viewerUid) {
  const ids = await redisCmd(['SMEMBERS', ownerKey(ownerUid)]);
  if (!Array.isArray(ids) || ids.length === 0) return [];

  const rows = await redisPipeline(ids.map((id) => ['GET', listKey(id)]));
  const lists = (rows || []).map(parseJSON).filter(Boolean);

  // Sahibi kendi gizlenmiş listesini görebilir; başkası göremez
  const isOwner = ownerUid === viewerUid;
  const visible = lists.filter((l) => isOwner || l.status === 'public');

  const [profiles, liked] = await Promise.all([
    getProfiles([ownerUid]),
    viewerUid ? likedListIds(viewerUid) : Promise.resolve(new Set()),
  ]);

  return visible
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .map((l) => shapeForFeed(l, profiles, liked));
}

function shapeForFeed(l, profiles, liked) {
  return {
    id: l.id,
    ownerUid: l.ownerUid,
    ownerUsername: profiles[l.ownerUid]?.username || null,
    ownerName: profiles[l.ownerUid]?.displayName || profiles[l.ownerUid]?.username || null,
    title: l.title,
    description: l.description,
    emoji: l.emoji,
    gameCount: (l.games || []).length,
    covers: (l.games || []).slice(0, 4).map((g) => g.image).filter(Boolean),
    likeCount: l.likeCount || 0,
    likedByMe: liked.has(l.id),
    status: l.status,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}

/** Tek liste — detay ekranı için, oyunlar dahil. */
export async function getListDetail(id, viewerUid) {
  const l = await getList(id);
  if (!l) return null;

  const isOwner = l.ownerUid === viewerUid;
  if (l.status !== 'public' && !isOwner) return null;

  // Engellenen kullanıcının listesi doğrudan bağlantıyla da açılmasın
  const hidden = await getHiddenUids(viewerUid);
  if (!isOwner && hidden.has(l.ownerUid)) return null;

  const [profiles, liked] = await Promise.all([
    getProfiles([l.ownerUid]),
    viewerUid ? likedListIds(viewerUid) : Promise.resolve(new Set()),
  ]);

  return {
    ...shapeForFeed(l, profiles, liked),
    games: l.games || [],
    isOwner,
  };
}
