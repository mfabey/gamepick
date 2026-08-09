import { redisCmd, redisPipeline } from './redis';
import { getPrivacy } from './social-store';

// ─────────────────────────────────────────────────────────────────────────────
// Çevrimiçi durumu.
//
// TEK ANAHTAR, İKİ BİLGİ: `last_seen:{uid}` son etkinlik zamanını tutuyor ve
// hem "çevrimiçi" hem "son görülme" bundan türetiliyor. TTL ile silinen bir
// "online" anahtarı kullanılsaydı çevrimiçi bilgisi olurdu ama son görülme
// kaybolurdu.
//
// GİZLİLİK: `showPresence` kapalıysa sunucu `null` döndürüyor — istemciye
// gönderilip orada gizlenmiyor. Gizlenecek veri hiç gönderilmemeli.
//
// EŞİK 90 saniye: istemci 45 saniyede bir nabız atıyor, yani bir nabız
// kaçırılsa bile kullanıcı çevrimiçi kalıyor. Eşik nabız aralığına eşit
// olsaydı her gecikmede durum titrerdi.
// ─────────────────────────────────────────────────────────────────────────────

const ONLINE_MS = 90 * 1000;

// Son görülme bilgisi süresiz saklanmıyor; bir aydan eski veri kimseye
// bir şey anlatmıyor ve tutmanın gizlilik bedeli var.
const TTL_SEC = 30 * 24 * 60 * 60;

const seenKey = (uid) => `last_seen:${uid}`;

/** Kullanıcının etkin olduğunu işaretler. */
export async function touchPresence(uid) {
  if (!uid) return;
  await redisCmd(['SET', seenKey(uid), String(Date.now()), 'EX', String(TTL_SEC)]);
}

/**
 * Bir kullanıcının durumunu okur.
 *
 * @returns {Promise<{online: boolean, lastSeen: number|null}|null>}
 *   `null` = kullanıcı durumunu paylaşmıyor
 */
export async function getPresence(uid) {
  if (!uid) return null;

  const [privacy, raw] = await Promise.all([
    getPrivacy(uid).catch(() => null),
    redisCmd(['GET', seenKey(uid)]),
  ]);

  // Ayar okunamadıysa GİZLİ varsay — hata durumunda mahremiyet lehine karar.
  if (privacy?.showPresence === false || !privacy) return null;

  const ts = Number(raw) || 0;
  if (!ts) return { online: false, lastSeen: null };

  return { online: Date.now() - ts < ONLINE_MS, lastSeen: ts };
}

/** Çok kullanıcı için tek turda — konuşma listesi bunu kullanıyor. */
export async function getPresences(uids = []) {
  const ids = [...new Set(uids.filter(Boolean))];
  if (!ids.length) return {};

  const [rows, privacies] = await Promise.all([
    redisPipeline(ids.map((u) => ['GET', seenKey(u)])),
    Promise.all(ids.map((u) => getPrivacy(u).catch(() => null))),
  ]);

  const now = Date.now();
  const out = {};
  ids.forEach((uid, i) => {
    const p = privacies[i];
    if (p?.showPresence === false || !p) { out[uid] = null; return; }
    const ts = Number(rows?.[i]) || 0;
    out[uid] = ts ? { online: now - ts < ONLINE_MS, lastSeen: ts } : { online: false, lastSeen: null };
  });
  return out;
}
