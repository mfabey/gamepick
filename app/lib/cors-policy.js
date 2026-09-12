// ─────────────────────────────────────────────────────────────────────────────
// CORS POLİTİKASI — şu an BİLEREK KAPALI.
//
// DURUM (2026-09-02 denetimi): bu projede hiçbir CORS başlığı yok. Ne
// `next.config.mjs`'te, ne `middleware.js`'te, ne `vercel.json`'da, ne de
// herhangi bir route handler'ında `Access-Control-Allow-Origin` geçmiyor.
// Tek `OPTIONS` işleyicisi de yok.
//
// BU BİR EKSİKLİK DEĞİL, EN GÜVENLİ HÂL. CORS başlığı yokken tarayıcı
// aynı-kaynak politikasını uyguluyor: başka bir sitedeki JavaScript
// `gamerisen.com/api/*` yanıtını OKUYAMIYOR. Başlık eklemek bu kapıyı
// AÇMAK demek — kısıtlamak değil. Bu yüzden aşağıdaki listeler tanımlı ama
// HİÇBİR YERE BAĞLI DEĞİL; CORS gerçekten gerektiğinde tek meşru kaynak
// burası olsun diye duruyorlar.
//
// BUGÜN NEDEN GEREKMİYOR:
//   • Web istemcisi AYNI kaynakta (Next.js aynı origin'den servis ediyor).
//   • Mobil istemci React Native `fetch` kullanıyor — CORS tarayıcı
//     kuralıdır, React Native'de uygulanmaz. `apiBase` çapraz kaynak ama
//     preflight yok.
//   • Hiçbir istemci `credentials: 'include'` kullanmıyor (tarandı, sıfır).
//   • Expo web derlemesi (`mobile/dist`) commit'lenmemiş, dağıtılmıyor.
//
// ── WILDCARD + KİMLİK BİLGİSİ BİRLİKTE KULLANILAMAZ ──────────────────────
// Tarayıcı şartnamesi bunu yasaklıyor: `Access-Control-Allow-Origin: *` ile
// `Access-Control-Allow-Credentials: true` aynı anda verilirse tarayıcı
// isteği REDDEDER — çerez/Authorization taşıyan çapraz kaynak istekte
// joker karakter kabul edilmez, kaynak TAM olarak yazılmalıdır.
//
// Bunun pratik sonucu şu: "her yere açayım, kimlik de geçsin" diye bir
// seçenek YOK. Kimlik bilgisi taşınacaksa kaynak listesi zorunlu. Wildcard'ı
// çalıştırmak için `credentials`i kapatmak da çözüm değil — o zaman oturumlu
// hiçbir uç çalışmaz.
//
// CORS GEREKİRSE: `corsHeaders()` kullan, elle başlık yazma. İstek kaynağını
// listeyle karşılaştırıp YANSITIR; listede yoksa hiçbir şey döndürmez.
// `scripts/check-cors-policy.mjs` bu dosyanın dışında elle yazılmış
// `Access-Control-*` başlığı görürse build'i düşürür.
// ─────────────────────────────────────────────────────────────────────────────

/** Üretim kaynakları. Alt alan adı dahil TAM eşleşme — joker yok. */
export const PRODUCTION_ORIGINS = [
  'https://www.gamerisen.com',
  'https://gamerisen.com',
];

/**
 * Geliştirme kaynakları. Üretimde ASLA kullanılmıyor (bkz. allowedOrigins).
 * Expo geliştirme sunucusu LAN IP'sinden servis ediyor; o adres makineye
 * göre değiştiği için buraya sabit yazılamaz — gerekirse elle eklenmeli.
 */
export const DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:8081',
  'http://127.0.0.1:3000',
];

/** Ortama göre geçerli kaynak listesi. */
export function allowedOrigins() {
  return process.env.NODE_ENV === 'production'
    ? PRODUCTION_ORIGINS
    : [...PRODUCTION_ORIGINS, ...DEVELOPMENT_ORIGINS];
}

/**
 * İzin verilen HTTP metotları.
 * Bu API'de yazma yalnızca POST/PUT/DELETE ile yapılıyor; PATCH hiç
 * kullanılmıyor, TRACE/CONNECT hiçbir zaman açılmamalı.
 */
export const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];

/**
 * İzin verilen istek başlıkları — yalnızca fiilen kullanılanlar.
 * `X-Xbox-Session` mobilin Xbox oturumunu taşıdığı başlık
 * (mobile/src/api/library.js).
 */
export const ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'X-Xbox-Session'];

/**
 * CORS başlıklarını üretir — YALNIZCA kaynak listedeyse.
 *
 * Şu an hiçbir yerden çağrılmıyor. Çağrılırsa: kaynağı yansıtır (joker
 * KULLANMAZ, çünkü kimlik bilgisiyle birlikte çalışmaz — yukarıdaki nota
 * bak) ve `Vary: Origin` ekler, aksi hâlde ara önbellekler bir kaynağın
 * yanıtını başkasına servis edebilir.
 *
 * @returns {Record<string,string>} listede yoksa BOŞ nesne — yani izin yok.
 */
export function corsHeaders(requestOrigin, { credentials = false } = {}) {
  const origin = String(requestOrigin || '');
  if (!origin || !allowedOrigins().includes(origin)) return {};

  const h = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': ALLOWED_METHODS.join(', '),
    'Access-Control-Allow-Headers': ALLOWED_HEADERS.join(', '),
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
  if (credentials) h['Access-Control-Allow-Credentials'] = 'true';
  return h;
}
