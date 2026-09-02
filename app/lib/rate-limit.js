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
import { bekleMetni } from './rate-limit-config';

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

    const ok = count <= limit;
    // `retryAfter` YALNIZ REDDEDERKEN okunuyor: TTL fazladan bir Redis turu
    // ve başarılı istekte kimse ona bakmıyor. Mevcut çağıranların sözleşmesi
    // bozulmuyor — alan eklendi, hiçbiri kaldırılmadı.
    const retryAfter = ok ? 0 : await ttlOf(key, windowSec);
    return { ok, remaining: Math.max(0, limit - count), limit, retryAfter };
  } catch {
    return { ok: true, remaining: limit, limit, retryAfter: 0 };
  }
}

/** Anahtarın kalan ömrü (saniye). Okunamazsa pencerenin tamamı varsayılır. */
async function ttlOf(key, windowSec) {
  try {
    const t = Number(await redisCmd(['TTL', key]));
    // -1 = süre yok, -2 = anahtar yok. İkisinde de elimizde ölçüm yok;
    // pencere boyunu söylemek kullanıcıyı yanıltmayan güvenli taraf.
    return t > 0 ? t : windowSec;
  } catch {
    return windowSec;
  }
}

/**
 * Sayacı ARTIRMADAN bakar. Başarısız denemede artan sayaçlar için
 * (bkz. rate-limit-config.js `accountOnFailureOnly`): meşru kullanıcının
 * doğru parolayla girişi sayacı tüketmemeli.
 */
export async function rateLimitPeek(key, limit, windowSec) {
  if (!hasRedis()) return { ok: true, retryAfter: 0 };
  try {
    const raw = await redisCmd(['GET', key]);
    const count = Number(raw) || 0;
    const ok = count < limit;
    return { ok, retryAfter: ok ? 0 : await ttlOf(key, windowSec) };
  } catch {
    return { ok: true, retryAfter: 0 };
  }
}

/** Sayacı bir artırır (pencereyi ilk artışta kurar). Peek ile eşleşir. */
export async function rateLimitBump(key, windowSec) {
  if (!hasRedis()) return;
  try {
    const raw = await redisCmd(['INCR', key]);
    if (Number(raw) === 1) {
      redisCmd(['EXPIRE', key, String(windowSec)]).catch(() => {});
    }
  } catch { /* sayaç yazılamadıysa isteği engelleme */ }
}

/**
 * 429 yanıtı için standart gövde.
 * `retryAfter` verilirse kullanıcıya NE KADAR bekleyeceği söyleniyor —
 * "biraz bekleyin" demek, kullanıcıyı kör bir yeniden deneme döngüsüne
 * sokuyordu.
 */
export function tooManyRequests(retryAfter = 0) {
  const s = Math.max(0, Math.ceil(Number(retryAfter) || 0));
  return {
    error: 'RATE_LIMITED',
    retryAfter: s,
    message: s
      ? `Çok fazla deneme yaptınız. Lütfen ${bekleMetni(s)} sonra tekrar deneyin.`
      : 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyip tekrar deneyin.',
  };
}
