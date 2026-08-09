import Pusher from 'pusher';

// ─────────────────────────────────────────────────────────────────────────────
// Pusher — anlık mesaj teslimi.
//
// SOHBET PUSHER OLMADAN DA ÇALIŞIR. Mesajlar Redis'e yazılıyor ve ekran
// açıldığında geçmiş çekiliyor; Pusher yalnızca "ekran açıkken anında düşsün"
// katmanı. Bu yüzden tetikleme hatası mesajı ASLA geçersiz kılmıyor — kullanıcı
// mesajı gönderdi, Redis'e yazıldı, karşı taraf en geç ekranı açınca görecek.
//
// Kimlik bilgileri yoksa modül sessizce devre dışı: yerel geliştirmede ve
// Pusher hesabı açılmadan önce uygulamanın çalışmaya devam etmesi için.
//
// KANAL ADI `private-dm-{cid}`. "private-" öneki Pusher'ın kimlik doğrulama
// zorunluluğunu tetikliyor — onsuz kanal herkese açık olur ve BAŞKALARININ
// özel mesajları dinlenebilirdi.
// ─────────────────────────────────────────────────────────────────────────────

let client = null;

function conf() {
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) return null;
  return { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER };
}

export function isPusherConfigured() {
  return conf() !== null;
}

/** İstemcinin ihtiyaç duyduğu AÇIK bilgiler — sır burada yok. */
export function pusherPublicConfig() {
  const c = conf();
  return c ? { key: c.PUSHER_KEY, cluster: c.PUSHER_CLUSTER } : null;
}

function getClient() {
  if (client) return client;
  const c = conf();
  if (!c) return null;
  client = new Pusher({
    appId: c.PUSHER_APP_ID,
    key: c.PUSHER_KEY,
    secret: c.PUSHER_SECRET,
    cluster: c.PUSHER_CLUSTER,
    useTLS: true,
  });
  return client;
}

export function dmChannel(cid) {
  return `private-dm-${cid}`;
}

/**
 * Mesajı kanala düşürür.
 * HATA FIRLATMAZ — çağıran akış (mesaj gönderimi) buna bağımlı olmamalı.
 * @returns {Promise<boolean>} teslim denendi mi
 */
export async function triggerMessage(cid, message) {
  const p = getClient();
  if (!p) return false;
  try {
    await p.trigger(dmChannel(cid), 'message', message);
    return true;
  } catch {
    return false;
  }
}

/**
 * Özel kanal yetkilendirmesi.
 * ÇAĞIRAN, kullanıcının bu konuşmanın tarafı olduğunu ÖNCEDEN doğrulamalı —
 * bu fonksiyon yalnızca imzayı üretiyor, yetki kontrolü yapmıyor.
 */
export function authorizeChannel(socketId, channel) {
  const p = getClient();
  if (!p) return null;
  return p.authorizeChannel(socketId, channel);
}
