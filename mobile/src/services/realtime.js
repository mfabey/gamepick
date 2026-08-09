import Pusher from 'pusher-js/react-native';
import { API_BASE } from '../api/client';
import { getValidToken } from './session';
import { getChatConfig } from '../api/social';

// ─────────────────────────────────────────────────────────────────────────────
// Anlık mesaj teslimi — Pusher istemcisi.
//
// SOHBET BUNA BAĞIMLI DEĞİL. Mesajlar sunucuda Redis'e yazılıyor ve ekran
// açılışında geçmiş çekiliyor; burası yalnızca "ekran açıkken anında düşsün"
// katmanı. Bağlantı kurulamazsa sohbet çalışmaya devam eder.
//
// `pusher-js/react-native` giriş noktası kullanılıyor: React Native'in
// WebSocket'ini kullanan saf JS sürüm. Native modül YOK — OTA korunuyor.
//
// ÖZEL YETKİLENDİRİCİ (authorizer) şart, hazır `authEndpoint` değil: uçlarımız
// Bearer belirteci istiyor ve o belirteç tazeleniyor. `authEndpoint` sabit
// başlıklarla çalıştığı için belirteç yenilendiğinde abonelik kırılırdı.
// ─────────────────────────────────────────────────────────────────────────────

let client = null;
let configPromise = null;

/** Ayarları bir kez çeker; sonraki çağrılar aynı sözü paylaşır. */
function loadConfig() {
  if (!configPromise) {
    configPromise = getChatConfig().catch(() => ({ enabled: false }));
  }
  return configPromise;
}

async function getClient() {
  if (client) return client;

  const cfg = await loadConfig();
  if (!cfg?.enabled || !cfg.key || !cfg.cluster) return null;

  client = new Pusher(cfg.key, {
    cluster: cfg.cluster,
    forceTLS: true,
    authorizer: (channel) => ({
      authorize: async (socketId, callback) => {
        try {
          const token = await getValidToken();
          if (!token) return callback(new Error('NO_SESSION'), null);

          const res = await fetch(`${API_BASE}/api/social/chat/auth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
          });

          if (!res.ok) return callback(new Error(`AUTH_${res.status}`), null);
          callback(null, await res.json());
        } catch (e) {
          callback(e, null);
        }
      },
    }),
  });

  return client;
}

/**
 * Bir konuşmanın kanalına abone olur.
 *
 * @param {string} cid  konuşma kimliği
 * @param {(msg: object) => void} onMessage
 * @returns {Promise<() => void>} abonelikten çıkış — ÇAĞRILMASI ŞART, aksi
 *   hâlde ekran kapandıktan sonra da kanal açık kalır ve bağlantı sızar.
 */
export async function subscribeDM(cid, onMessage) {
  const p = await getClient();
  if (!p) return () => {};

  const name = `private-dm-${cid}`;
  const ch = p.subscribe(name);
  ch.bind('message', onMessage);

  return () => {
    try {
      ch.unbind('message', onMessage);
      p.unsubscribe(name);
    } catch { /* zaten kapanmış */ }
  };
}

/** Oturum kapanışında çağrılır — bağlantıyı ve önbelleği bırakır. */
export function disconnectRealtime() {
  try { client?.disconnect(); } catch { /* zaten kapalı */ }
  client = null;
  configPromise = null;
}
