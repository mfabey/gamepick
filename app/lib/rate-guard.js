import { NextResponse } from 'next/server';
import { rateLimit, rateLimitPeek, rateLimitBump, tooManyRequests } from './rate-limit';
import { LIMITS } from './rate-limit-config';

// ─────────────────────────────────────────────────────────────────────────────
// HIZ SINIRI KAPISI — uçlarda tek satır.
//
//     const kapi = await guard(request, 'login', { account: email });
//     if (kapi) return kapi;              // hazır 429, Retry-After başlıklı
//
// Parola doğrulayan akışlarda başarısızlıkta:
//
//     await penalize(request, 'login', { account: email });
//
// NEDEN AYRI `penalize`: hesap sayacı HER denemede artsaydı, saldırgan
// kurbanın e-postasıyla art arda yanlış parola göndererek meşru kullanıcıyı
// pencere boyunca dışarıda bırakabilirdi. Sayaç yalnız başarısızlıkta artınca
// doğru parolayı bilen hiç kilitlenmiyor.
//
// HESAP KİMLİĞİ HASHLENİYOR: anahtarda ham e-posta taşımamak için. Rate
// limit anahtarları Redis'te düz duruyor ve SCAN ile listelenebiliyor;
// kullanıcı adresini oraya yazmanın bir karşılığı yok. SHA-256'nın ilk 16
// onaltılığı çakışma için fazlasıyla yeterli. Web Crypto kullanılıyor —
// card-sign.js ile aynı gerekçe (edge çalışma zamanında node:crypto yok).
// ─────────────────────────────────────────────────────────────────────────────

export function clientIp(request) {
  return (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
}

async function hashId(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return '';
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
    return [...new Uint8Array(buf)].slice(0, 8)
      .map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Web Crypto yoksa sınırı düşürmektense eksenden vazgeç (IP ekseni durur).
    return '';
  }
}

function reddet(retryAfter) {
  const body = tooManyRequests(retryAfter);
  return NextResponse.json(body, {
    status: 429,
    // Retry-After STANDART başlık: istemciler ve araçlar bunu okuyor.
    // Gövdedeki Türkçe metin kullanıcı için, bu başlık makine için.
    headers: retryAfter ? { 'Retry-After': String(Math.ceil(retryAfter)) } : undefined,
  });
}

/**
 * Sınıra takıldıysa hazır 429 döner, takılmadıysa `null`.
 *
 * @param request  gelen istek (IP başlıktan okunuyor)
 * @param action   LIMITS içindeki anahtar (ör. 'login')
 * @param account  hesap ekseni kimliği — e-posta ya da uid; yoksa o eksen atlanır
 */
export async function guard(request, action, { account } = {}) {
  const cfg = LIMITS[action];
  // Tanımsız eylem SESSİZCE GEÇMEZ: yapılandırmayı eklemeyi unutmak,
  // sınırsız bir uç bırakmakla aynı şey. Geliştirmede yüksek sesle patlasın.
  if (!cfg) throw new Error(`rate-guard: '${action}' LIMITS içinde tanımlı değil`);

  if (cfg.ip) {
    const [limit, win] = cfg.ip;
    const r = await rateLimit(`rl:${action}:ip:${clientIp(request)}`, limit, win);
    if (!r.ok) return reddet(r.retryAfter);
  }

  if (cfg.account && account) {
    const id = await hashId(account);
    if (id) {
      const [limit, win] = cfg.account;
      const key = `rl:${action}:acc:${id}`;
      // Başarısızlıkta artan sayaçlarda burada ARTIRMIYORUZ, yalnız bakıyoruz.
      const r = cfg.accountOnFailureOnly
        ? await rateLimitPeek(key, limit, win)
        : await rateLimit(key, limit, win);
      if (!r.ok) return reddet(r.retryAfter);
    }
  }

  return null;
}

/**
 * Başarısız denemeyi hesap eksenine yazar.
 * Yalnız `accountOnFailureOnly` olan eylemlerde anlamlı; diğerlerinde
 * `guard` zaten saymış olduğu için çağrılmamalı (çift sayım olur).
 */
export async function penalize(request, action, { account } = {}) {
  const cfg = LIMITS[action];
  if (!cfg?.account || !cfg.accountOnFailureOnly || !account) return;
  const id = await hashId(account);
  if (!id) return;
  await rateLimitBump(`rl:${action}:acc:${id}`, cfg.account[1]);
}
