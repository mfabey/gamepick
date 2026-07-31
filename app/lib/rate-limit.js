// ─────────────────────────────────────────────────────────────────────────────
// Hız sınırlayıcı — kullanıcı üretimi içerik uçları için kötüye kullanım koruması.
//
// Redis INCR + EXPIRE ile sabit pencere. İki komut tek pipeline turunda gider.
//
// DÜRÜST SINIR: Sabit pencere, pencere sınırında iki kat isteğe izin verebilir
// (kayan pencere değil). Raporlama/kullanıcı adı gibi uçlar için fazlasıyla
// yeterli; ödeme gibi kritik akışlarda kullanılmamalı.
//
// Redis yapılandırılmamışsa (yerel geliştirme) sınırlama UYGULANMAZ — geliştirme
// akışını kilitlemek yerine açık geçer.
// ─────────────────────────────────────────────────────────────────────────────
import { redisCmd, hasRedis } from './redis';

/**
 * @param key        sınırlayıcı anahtarı (ör. `rl:report:${uid}`)
 * @param limit      pencere başına izin verilen istek
 * @param windowSec  pencere uzunluğu (saniye)
 * @returns {Promise<{ok: boolean, remaining: number, limit: number}>}
 */
export async function rateLimit(key, limit, windowSec) {
  if (!hasRedis()) return { ok: true, remaining: limit, limit };

  try {
    const raw = await redisCmd(['INCR', key]);
    // Redis erişilemezse kullanıcıyı engelleme — açık geç
    if (raw === null) return { ok: true, remaining: limit, limit };

    const count = Number(raw) || 0;

    // TTL yalnızca pencerenin İLK isteğinde kurulur.
    // Her istekte EXPIRE çağırmak pencereyi sürekli uzatır ve seyrek ama
    // düzenli istek atan meşru kullanıcının sayacı hiç sıfırlanmazdı.
    // (`EXPIRE ... NX` tek turda çözerdi ama Redis 7+ gerektiriyor; bu
    // desen her sürümde çalışır ve ikinci tur yalnızca pencere başında olur.)
    if (count === 1) {
      redisCmd(['EXPIRE', key, String(windowSec)]).catch(() => {});
    }

    return { ok: count <= limit, remaining: Math.max(0, limit - count), limit };
  } catch {
    return { ok: true, remaining: limit, limit };
  }
}

/** 429 yanıtı için standart gövde. */
export function tooManyRequests() {
  return {
    error: 'RATE_LIMITED',
    message: 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyip tekrar deneyin.',
  };
}
