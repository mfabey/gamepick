import { NextResponse } from 'next/server';
import { rateLimit, rateLimitPeek, rateLimitBump, tooManyRequests } from './rate-limit';
import { LIMITS } from './rate-limit-config';
import { clientIp } from './client-ip';

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

// IP çıkarma `client-ip.js`'e taşındı (11 kopyası vardı, ayrışmışlardı).
// Buradan yeniden dışa veriliyor: mevcut çağıranlar `rate-guard`'dan
// import ediyor, sözleşmeleri bozulmasın.
export { clientIp };

// `kucult`: e-posta büyük/küçük harfe DUYARSIZ bir kimlik, o yüzden
// varsayılan true — `Ali@x.com` ile `ali@x.com` aynı kovaya düşmeli.
// Doğrulama kodu (oobCode) ise harfe DUYARLI; onu küçültmek iki farklı kodu
// aynı anahtara indirmek olurdu. Varsayılan değişmedi, mevcut çağıranlar
// etkilenmiyor.
async function hashId(value, kucult = true) {
  const ham = String(value || '').trim();
  const v = kucult ? ham.toLowerCase() : ham;
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

// ── KAPALI BAŞARISIZ OLMA KARARI ────────────────────────────────────────────
// `rate-limit.js` yalnızca DURUMU bildiriyor (`unavailable`); ne yapılacağı
// uca göre değişen bir politika ve burada veriliyor.
//
// ÜÇ KOŞUL BİRDEN: uç bayraklı OLACAK, sınırlayıcı gerçekten erişilemez
// OLACAK ve ÜRETİMDE olunacak. Üretim koşulu olmadan yerel geliştirme
// (Redis'siz) tamamen kilitlenirdi — `session-cookie.js`'teki DEV_FALLBACK
// ile aynı gerekçe.
function kapaliBasarisiz(cfg, r) {
  return !!(cfg.failClosed && r?.unavailable && process.env.NODE_ENV === 'production');
}

// Sınırlayıcı çalışmıyor ve bu uç sınırsız çalışmamalı → 503.
// 429 DEĞİL: kullanıcı bir sınırı aşmadı, hizmet eksik. Ayrım hem doğru
// hem de istemci için anlamlı — 429 "yavaşla", 503 "sonra dene".
function hizmetDisi() {
  return NextResponse.json(
    {
      error: 'RATE_LIMITER_UNAVAILABLE',
      message: 'Bu işlem şu an yapılamıyor. Lütfen birkaç dakika sonra tekrar deneyin.',
    },
    { status: 503, headers: { 'Retry-After': '30' } },
  );
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
 * @param code     kod ekseni kimliği — doğrulama kodunun kendisi (oobCode);
 *                 hesabın bilinmediği uçlarda tek kimlik bu
 */
export async function guard(request, action, { account, code } = {}) {
  const cfg = LIMITS[action];
  // Tanımsız eylem SESSİZCE GEÇMEZ: yapılandırmayı eklemeyi unutmak,
  // sınırsız bir uç bırakmakla aynı şey. Geliştirmede yüksek sesle patlasın.
  if (!cfg) throw new Error(`rate-guard: '${action}' LIMITS içinde tanımlı değil`);

  if (cfg.ip) {
    const [limit, win] = cfg.ip;
    const r = await rateLimit(`rl:${action}:ip:${clientIp(request)}`, limit, win);
    if (kapaliBasarisiz(cfg, r)) return hizmetDisi();
    if (!r.ok) return reddet(r.retryAfter);
  }

  // GÜNLÜK TAVAN — saatlik sınırın ÜSTÜNE. Saatlik sınır anlık patlamayı
  // keser ama gün boyu sürdürülen bir akışı bağlamaz: 30/saat × 24 = 720.
  // Günlük sayaç ayrı bir anahtarda tutuluyor ki iki pencere birbirini
  // sıfırlamasın.
  if (cfg.ipDaily) {
    const [limit, win] = cfg.ipDaily;
    const r = await rateLimit(`rl:${action}:ipgun:${clientIp(request)}`, limit, win);
    if (kapaliBasarisiz(cfg, r)) return hizmetDisi();
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
      if (kapaliBasarisiz(cfg, r)) return hizmetDisi();
      if (!r.ok) return reddet(r.retryAfter);
    }
  }

  // KOD EKSENİ — doğrulama kodunun kendisi. Hesap ekseninin yanında ayrı
  // duruyor, onu DEĞİŞTİRMİYOR: bir uçta ikisi birden anlamlı olabilir.
  // Anahtar öneki `kod:`, `acc:` ile karışmasın diye.
  if (cfg.code && code) {
    const id = await hashId(code, false);   // kod harfe duyarlı → küçültme yok
    if (id) {
      const [limit, win] = cfg.code;
      const key = `rl:${action}:kod:${id}`;
      // Hesap ekseniyle aynı ayrım: başarısızlıkta artan sayaçta burada
      // ARTIRMIYORUZ, yalnız bakıyoruz. Doğru kodu getiren kullanıcı sayacı
      // tüketmemeli.
      const r = cfg.codeOnFailureOnly
        ? await rateLimitPeek(key, limit, win)
        : await rateLimit(key, limit, win);
      if (kapaliBasarisiz(cfg, r)) return hizmetDisi();
      if (!r.ok) return reddet(r.retryAfter);
    }
  }

  // Kullanıcı başına günlük tavan — yalnızca kimlikli uçlarda mümkün.
  if (cfg.accountDaily && account) {
    const id = await hashId(account);
    if (id) {
      const [limit, win] = cfg.accountDaily;
      const r = await rateLimit(`rl:${action}:accgun:${id}`, limit, win);
      if (kapaliBasarisiz(cfg, r)) return hizmetDisi();
      if (!r.ok) return reddet(r.retryAfter);
    }
  }

  return null;
}

/**
 * Başarısız denemeyi hesap ve/veya kod eksenine yazar.
 * Yalnız `*OnFailureOnly` olan eksenlerde anlamlı; diğerlerinde `guard`
 * zaten saymış olduğu için çağrılmamalı (çift sayım olur).
 *
 * İki eksen BAĞIMSIZ değerlendiriliyor: bir eylemde yalnız biri tanımlı
 * olabilir (ör. `login` yalnız hesap, `codeVerify` yalnız kod).
 */
export async function penalize(request, action, { account, code } = {}) {
  const cfg = LIMITS[action];
  if (!cfg) return;

  if (cfg.account && cfg.accountOnFailureOnly && account) {
    const id = await hashId(account);
    if (id) await rateLimitBump(`rl:${action}:acc:${id}`, cfg.account[1]);
  }

  if (cfg.code && cfg.codeOnFailureOnly && code) {
    const id = await hashId(code, false);
    if (id) await rateLimitBump(`rl:${action}:kod:${id}`, cfg.code[1]);
  }
}
