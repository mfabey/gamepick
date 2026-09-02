import { redisCmd, hasRedis } from './redis';

// ─────────────────────────────────────────────────────────────────────────────
// OAUTH `state` — tek kullanımlık, süreli.
//
// NEDEN: iki dönüş ucunda da CSRF/tekrar koruması yoktu.
//
//   • Xbox: `state` YALNIZCA mobil akışta üretiliyordu ve içeriği
//     `{mobile, appRedirect}` idi — imzasız base64 JSON, sunucunun ürettiği
//     bir değerle hiç karşılaştırılmıyordu. WEB AKIŞINDA state HİÇ YOKTU.
//   • Steam: nonce yok; mobil bağlam `openid.return_to` ile taşınıyordu.
//
// SALDIRI: saldırgan KENDİ hesabıyla akışı başlatıp dönüş `code`'unu (Steam'de
// imzalı assertion'ı) yakalıyor, sonra oturumu açık bir kurbanı o dönüş
// adresine düşürüyor. Sunucu kodu değiştiriyor, saldırganın kimliğini elde
// ediyor ve KURBANIN uid'ine bağlıyor (`saveUserConnection(user.uid, …)`).
// Sonuç: saldırganın Steam/Xbox hesabı kurbanın hesabına bağlanıyor.
//
// Steam'in imza doğrulaması (`check_authentication`) bunu ENGELLEMİYOR:
// assertion gerçekten geçerli — yalnızca yanlış kişinin oturumuna
// iliştiriliyor. İmza "bu Steam kullanıcısı gerçek mi" sorusunu yanıtlıyor,
// "bu akışı bu tarayıcı mı başlattı" sorusunu değil. İkincisinin cevabı state.
//
// ── ÜÇ KORUMA BİRDEN ────────────────────────────────────────────────────────
//   1. Rastgele değer  → saldırgan geçerli bir state uyduramıyor
//   2. TEK KULLANIMLIK → tüketilince siliniyor; aynı dönüş ikinci kez
//                        oynatılamıyor (tekrar koruması)
//   3. TTL             → 10 dakika sonra kendiliğinden düşüyor
//                        (zaman damgası kontrolünün karşılığı)
//
// Yük SUNUCUDA duruyor, state'in içinde değil: dönen değer opak bir kimlik.
// Böylece `appRedirect` gibi alanlar istemci tarafından kurcalanamıyor.
// ─────────────────────────────────────────────────────────────────────────────

const TTL_SEC = 600; // 10 dk — giriş akışı için bol, çalınan state için kısa
const key = (id) => `oauth_state:${id}`;

function yeniKimlik() {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return Buffer.from(b).toString('base64url');
}

/**
 * Yeni bir state üretir ve yükü sunucuda saklar.
 * @returns opak state dizgesi; Redis yoksa null (çağıran karar verir)
 */
export async function issueState(payload = {}) {
  if (!hasRedis()) return null;
  const id = yeniKimlik();
  const ok = await redisCmd([
    'SET', key(id), JSON.stringify({ ...payload, iat: Date.now() }),
    'EX', String(TTL_SEC),
  ]);
  return ok === 'OK' ? id : null;
}

/**
 * State'i DOĞRULAR ve TÜKETİR (tek kullanımlık).
 *
 * `GETDEL` tek turda okuyup siliyor — okuma ile silme arasında ikinci bir
 * isteğin araya girip aynı state'i kullanmasını engelliyor. Upstash
 * desteklemezse GET+DEL'e düşülüyor; o dar pencerede yarış mümkün ama
 * korumasız hâlden çok daha iyi.
 *
 * @returns saklanan yük, ya da geçersiz/süresi geçmiş/kullanılmışsa null
 */
export async function consumeState(id) {
  if (!hasRedis() || !id || typeof id !== 'string' || id.length > 128) return null;

  let raw = await redisCmd(['GETDEL', key(id)]);
  if (raw === null) {
    // GETDEL yoksa (eski Redis) klasik yola düş.
    raw = await redisCmd(['GET', key(id)]);
    if (raw !== null) await redisCmd(['DEL', key(id)]).catch(() => {});
  }
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
