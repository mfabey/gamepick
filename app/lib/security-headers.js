// ─────────────────────────────────────────────────────────────────────────────
// GÜVENLİK YANIT BAŞLIKLARI — tek kaynak.
//
// NEDEN BURADA: aynı altı başlık `next.config.mjs` ve `middleware.js` içinde
// AYRI AYRI yazılıydı. Şu an içerikleri birebir aynı (denetlendi, aynı hash),
// ama iki kopya er geç ayrışır: birinde CSP'ye izin eklenip diğerinde
// eklenmediğinde, isteğin hangi katmandan geçtiğine göre farklı politika
// uygulanır ve hata "bazen oluyor" diye görünür. İkisi de artık buradan okuyor.
//
// ── CSP: İKİ POLİTİKA AYNI ANDA ─────────────────────────────────────────────
// `ENFORCED_CSP` şu an yürürlükte olan, DEĞİŞTİRİLMEMİŞ politika — hiçbir şey
// kırılmasın diye aynen korundu.
//
// `REPORT_ONLY_CSP` sıkılaştırılmış aday. `Content-Security-Policy-Report-Only`
// başlığıyla gönderiliyor: tarayıcı ihlalleri BİLDİRİR ama ENGELLEMEZ. Yani
// site çalışmaya devam ederken sıkı politikanın neyi keseceğini görüyoruz.
// Raporlar `/api/csp-report`'a düşüyor ve tarayıcı konsolunda da görünüyor.
//
// Rapor temiz göründüğünde yapılacak: ENFORCED_CSP'yi REPORT_ONLY_CSP ile
// değiştir, report-only satırını kaldır.
// ─────────────────────────────────────────────────────────────────────────────

// ── Sıkılaştırılmış politikada kullanılan kaynak listeleri ──────────────────

/** Görsel barındıran alan adları — `img-src https:` yerine. */
const IMG_HOSTS = [
  'https://media.rawg.io',
  'https://cdn.akamai.steamstatic.com',
  'https://cdn.cloudflare.steamstatic.com',
  'https://shared.akamai.steamstatic.com',
  'https://shared.fastly.steamstatic.com',
  'https://store.steampowered.com',
  'https://avatars.steamstatic.com',
  'https://cdn.simpleicons.org',        // GameCard mağaza logoları
  'https://avatar-ssl.xboxlive.com',    // Xbox gamerpic
  'https://*.public.blob.vercel-storage.com', // yüklenen avatar/sohbet fotoğrafı
  'https://*.googleusercontent.com',    // Google hesabı avatarı
];

/** Steam fragman/video barındırma — `media-src` CSP'de HİÇ YOKTU. */
const MEDIA_HOSTS = [
  'https://video.akamai.steamstatic.com',
  'https://shared.akamai.steamstatic.com',
  'https://cdn.akamai.steamstatic.com',
];

/**
 * `app/layout.jsx` içindeki satır içi tema/zoom script'inin SHA-256'sı.
 *
 * DİKKAT — DOĞRULANMADI: hash kaynak dosyadaki CRLF satır sonlarıyla
 * hesaplandı; derleyici satır sonlarını normalleştirirse eşleşmez. Rapor
 * modunun var oluş sebebi tam olarak bu: yanlışsa bir ihlal raporu gelir,
 * sayfa kırılmaz. Rapor gelirse hash'i gerçek yanıt gövdesinden yeniden
 * hesapla, tahminle düzeltme.
 */
const INLINE_THEME_SCRIPT_HASH = "'sha256-958TBA1B/ltmL6QJtO8/3OxGvdyXrTKdkQOmury9+w8='";

// ── YÜRÜRLÜKTEKİ POLİTİKA — dokunulmadı ─────────────────────────────────────
export const ENFORCED_CSP =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://appleid.cdn-apple.com https://accounts.google.com; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com data:; " +
  "img-src 'self' blob: data: https:; " +
  "connect-src 'self' https://api.rawg.io https://*.steampowered.com https://discord.gg https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://accounts.google.com; " +
  "frame-src 'self' https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/ https://appleid.apple.com https://accounts.google.com; " +
  "frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none';";

// ── SIKILAŞTIRILMIŞ ADAY — yalnızca rapor ───────────────────────────────────
//
// Yürürlüktekinden farkları ve gerekçeleri:
//
//  • script-src: `'unsafe-inline'` ve `'unsafe-eval'` ÇIKARILDI. CSP'nin asıl
//    değeri buradaydı — `'unsafe-inline'` varken XSS'e karşı script-src
//    neredeyse hiçbir şey yapmıyor. Satır içi tema script'i hash ile
//    yetkilendirildi.
//  • reCAPTCHA kaynakları ÇIKARILDI: signup/page.jsx:312'deki reCAPTCHA
//    GERÇEK DEĞİL ("Custom reCAPTCHA v2 Mock Checkbox"), hiçbir Google
//    betiği yüklenmiyor. Üç direktifte de ölü izindi.
//  • font/style'daki Google Fonts kaynakları ÇIKARILDI: `next/font/google`
//    yazı tiplerini derleme anında indirip `/_next/static/media/*.woff2`
//    olarak KENDİ sunucumuzdan veriyor (doğrulandı). Paketteki
//    fonts.googleapis referansları Next'in iç kod yollarındaki dize
//    sabitleri — çalışma zamanı isteği değil. Rapor bunu kesinleştirecek.
//  • connect-src'den api.rawg.io ve *.steampowered.com ÇIKARILDI: bu
//    çağrılar SUNUCUDAN yapılıyor, tarayıcıdan değil. CSP yalnızca
//    tarayıcıyı bağlar, dolayısıyla ölü izin.
//  • img-src `https:` (her HTTPS host) yerine ADLANDIRILMIŞ liste.
//  • media-src EKLENDİ — daha önce hiç yoktu, `default-src 'self'`e
//    düşüyordu. Web'de bugün <video> yok ama trailer alanı sunuluyor;
//    eklenmesi ileride sessiz bir kırılmayı önler.
//  • style-src'de `'unsafe-inline'` KALDI: proje baştan sona React inline
//    style kullanıyor (`style={{...}}`), bunlar style attribute üretiyor ve
//    hash'lenemez. Kaldırmak arayüzü tümden çıplak bırakırdı.
export const REPORT_ONLY_CSP =
  "default-src 'self'; " +
  `script-src 'self' ${INLINE_THEME_SCRIPT_HASH} https://appleid.cdn-apple.com https://accounts.google.com; ` +
  "style-src 'self' 'unsafe-inline'; " +
  "font-src 'self' data:; " +
  `img-src 'self' blob: data: ${IMG_HOSTS.join(' ')}; ` +
  "connect-src 'self' https://accounts.google.com; " +
  `media-src 'self' ${MEDIA_HOSTS.join(' ')}; ` +
  "frame-src 'self' https://appleid.apple.com https://accounts.google.com; " +
  "frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'; " +
  'report-uri /api/csp-report;';

/**
 * Tüm güvenlik başlıkları, `{ key, value }` listesi olarak.
 * next.config.mjs `headers()` bu şekli bekliyor; middleware de aynı listeyi
 * dolaşıyor — böylece iki katman ayrışamaz.
 */
export const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: ENFORCED_CSP },
  { key: 'Content-Security-Policy-Report-Only', value: REPORT_ONLY_CSP },
  // X-Frame-Options, CSP `frame-ancestors 'none'` ile AYNI şeyi söylüyor.
  // İkisi birden duruyor çünkü frame-ancestors'ı desteklemeyen eski
  // tarayıcılar için X-Frame-Options tek koruma.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];
