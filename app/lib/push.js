import { redisCmd, redisPipeline } from './redis';

// ─────────────────────────────────────────────────────────────────────────────
// Expo push bildirimleri — sunucu tarafı.
//
// SDK KULLANILMIYOR: Expo'nun push ucu düz bir HTTP POST ve `expo-server-sdk`
// paketi bunun için ağırlık ediyor. Toplu gönderim, geçersiz token temizliği ve
// hata biçimi burada elle ele alınıyor — hepsi otuz satır.
//
// ANAHTAR: push_tokens:{uid} → SET  (bir kullanıcının birden çok cihazı olur)
//
// GEÇERSİZ TOKEN TEMİZLENİYOR. Expo, uygulaması silinmiş cihazlar için
// `DeviceNotRegistered` dönüyor; temizlenmezse bu tokenlar sonsuza dek her
// gönderimde denenir ve kota tüketir.
// ─────────────────────────────────────────────────────────────────────────────

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';
const TIMEOUT_MS = 5000;

// Expo tek istekte 100 bildirim kabul ediyor.
const BATCH = 100;

const tokensKey = (uid) => `push_tokens:${uid}`;

/** Expo token biçimi — başka bir şey yazılmasını engelliyor. */
export function isExpoToken(v) {
  return typeof v === 'string' && /^Expo(nent)?PushToken\[[^\]]+\]$/.test(v);
}

export async function addToken(uid, token) {
  if (!uid || !isExpoToken(token)) return false;
  await redisCmd(['SADD', tokensKey(uid), token]);
  return true;
}

export async function removeToken(uid, token) {
  if (!uid || !token) return false;
  await redisCmd(['SREM', tokensKey(uid), token]);
  return true;
}

async function tokensOf(uid) {
  const r = await redisCmd(['SMEMBERS', tokensKey(uid)]);
  return Array.isArray(r) ? r.filter(isExpoToken) : [];
}

/**
 * Bildirim gönderir.
 *
 * HATA FIRLATMAZ. Çağıran akış (mesaj gönderimi) buna bağımlı olmamalı:
 * bildirim gitmese de mesaj Redis'te duruyor ve karşı taraf uygulamayı açınca
 * görecek. Bildirimi zorunlu hâle getirmek, Expo'nun düştüğü anda mesajlaşmayı
 * durdurmak demek olurdu.
 *
 * @returns {Promise<number>} kabul edilen bildirim sayısı
 */
export async function sendPush(uid, { title, body, data }) {
  const tokens = await tokensOf(uid);
  if (!tokens.length) return 0;

  let accepted = 0;

  for (let i = 0; i < tokens.length; i += BATCH) {
    const slice = tokens.slice(i, i + BATCH);
    const messages = slice.map((to) => ({
      to, title, body, data,
      sound: 'default',
      // iOS rozet sayısını sunucu bilmiyor; istemci kendi hesaplıyor.
      priority: 'high',
    }));

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(EXPO_PUSH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
        signal: ctrl.signal,
      });
      const json = await res.json();
      const rows = Array.isArray(json?.data) ? json.data : [];

      const dead = [];
      rows.forEach((r, idx) => {
        if (r?.status === 'ok') { accepted++; return; }
        if (r?.details?.error === 'DeviceNotRegistered') dead.push(slice[idx]);
      });

      // Ölü tokenları tek turda sil.
      if (dead.length) {
        await redisPipeline(dead.map((t) => ['SREM', tokensKey(uid), t]));
      }
    } catch {
      // Zaman aşımı veya ağ hatası — sessizce geç, mesaj zaten kaydedildi.
    } finally {
      clearTimeout(timer);
    }
  }

  return accepted;
}
