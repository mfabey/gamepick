// ─────────────────────────────────────────────────────────────────────────────
// ERİŞİM POLİTİKASI — VARSAYILAN REDDET
//
// NEDEN VAR: bu projede Firestore rules / Supabase RLS gibi bildirimsel bir
// kural katmanı YOK. Veri Upstash Redis'te, Redis jetonu yalnızca sunucuda ve
// her erişim `app/api/**` route handler'ından geçiyor. Yani "kural" = route'un
// içindeki yetki kontrolü. Bunun bilinen zayıflığı şu: yeni bir route yazan
// kişi kontrolü eklemeyi unutursa, uç SESSİZCE herkese açık doğuyor.
//
// 2026-09-02 denetiminde bulunan dört açığın DÖRDÜ de tam olarak böyle
// oluşmuştu (cron fail-open, push/register kimliksiz, iki debug ucu açık).
// Varsayılanı tersine çevirmeden aynı sınıf hata tekrar üretilir.
//
// NASIL ZORLANIYOR: DERLEME ZAMANINDA, çalışma zamanında değil.
// `scripts/check-access-policy.mjs` diskteki her route'u bu manifestle
// karşılaştırıyor; sınıflandırılmamış bir route varsa `npm run build` DÜŞÜYOR.
// Kapı, hatanın doğduğu yere — yazma anına — konuldu.
//
// NEDEN MIDDLEWARE'DE DEĞİL: middleware her API isteğinde çalışır. Kimlik
// doğrulamayı oraya taşımak her çağrıya bir Firebase ağ turu bindirirdi
// (CLAUDE.md'de performans 1. öncelik), üstelik yanlış bir manifest doğrudan
// CANLIYI kırardı. Derleme kapısının çalışma zamanı maliyeti sıfır ve en
// kötü hâlde build'i düşürür, kullanıcıyı değil.
//
// YENİ ROUTE EKLERKEN: build "sınıflandırılmamış" diyerek düşecek. Ucu
// aşağıdaki kümelerden BİRİNE ekle. Hangisi olduğundan emin değilsen doğru
// cevap PUBLIC DEĞİL — önce hangi verinin kime açıldığını sor.
//
// BU DOSYA YETKİ UYGULAMIYOR. Gerçek kontrol (verifyMobileToken, çerez
// okuma, sahiplik doğrulaması) route'un kendi içinde duruyor. Buradaki kayıt
// bir BEYAN: "bu ucun kimliksiz erişilebilir olması bilinçli bir karardır."
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kimlik GEREKTİRMEYEN uçlar — bilinçli karar.
 * Tamamı ya üçüncü taraf oyun kataloğu döndürüyor ya da kişisel veri
 * içermiyor. Yeni bir uç buraya eklenmeden önce şu sorulmalı:
 * "anonim biri bunu çağırırsa hangi kullanıcının hangi verisi görünür?"
 */
export const PUBLIC_ROUTES = new Set([
  // ── Oyun kataloğu / fiyat — kişisel veri yok ──
  'games', 'trending', 'prices', 'card-price', 'dlc', 'epic', 'news',
  'game-news', 'game-screenshots', 'game-lookup', 'rawg-game', 'for-you',
  'steam', 'steam-genres', 'steam-price', 'steam-prices', 'steam-reviews',
  'usd-rate', 'video-feed', 'ai-game', 'ai/chat', 'recommend', 'smart-search',

  // ── Oyun detayı: çerez VARSA zenginleşiyor, yoksa da çalışıyor ──
  'oyun', 'oyun-merged',

  // KART GÖRSELİ: kimlik doğrulamasız olmak ZORUNDA — paylaşılan bağlantıyı
  // karşı taraf açıyor. Parametreler CARD_SECRET ile HMAC imzalı, yani uç
  // serbest bir görsel üretecine dönüşmüyor (bkz. app/lib/card-sign.js).
  'card',

  // FİYAT ALARMI KAYDI: giriş yapmadan çalışıyor (WishlistContext yerel
  // listeyle sürüyor). Kimlik yerine yeni-kayıt başına IP sınırı + sıkı
  // token biçimi ile sınırlandı.
  'push/register',

  // KULLANICI ADI MÜSAİTLİK: kayıt formunda giriş öncesi çağrılıyor.
  // Ad numaralandırmaya açık; karşılığında kendi hız sınırı var.
  'auth/username-available',
]);

/**
 * KİMLİK KURAN uçlar — zorunlu olarak kimliksiz erişilebilir.
 * Oturumu bunlar YARATIYOR, dolayısıyla önlerine kimlik şartı konamaz.
 * Buraya bir uç eklemek, "oturum açmamış biri bunu çağırabilmeli" demektir.
 */
export const AUTH_ENTRY_ROUTES = new Set([
  'auth/login', 'auth/register', 'auth/action',
  'auth/reset-password', 'auth/resend-verification',
  'auth/mobile-login', 'auth/mobile-refresh',
  'auth/google-signin', 'auth/apple-signin',
  // OAuth dönüş uçları: sağlayıcının yönlendirmesiyle çağrılıyor, istekte
  // henüz bizim oturumumuz yok.
  'auth/steam', 'auth/steam/callback', 'auth/xbox', 'auth/xbox/callback',
  // Çıkış uçları: geçersiz/eksik oturumla çağrılabilmeli, aksi hâlde
  // bozuk oturumdan çıkış yolu kalmaz.
  'auth/logout', 'auth/user-logout', 'auth/xbox/logout',
  // XBOX SİMÜLASYONU: ürün özelliği ("Gamertag Simülasyonu"), dev aracı
  // değil. Ürettiği oturum kendi tarayıcısıyla sınırlı — sahte gamertag +
  // sabit havuzdan sahte kütüphane; başkasının verisine erişim vermiyor.
  'auth/xbox/mock-login',
]);

/**
 * WEB ÇEREZ OTURUMU gerektiren uçlar (gp_user_session / gp_steam_session /
 * gp_xbox_session). Kullanıcı yalnızca KENDİ kaydına erişiyor; uid çerezden
 * çıkarılıyor, istekten değil.
 */
export const SESSION_ROUTES = new Set([
  'auth/me', 'auth/user-me', 'auth/xbox/me',
  'auth/change-password', 'auth/delete-account', 'auth/steam-remove',
  'steam-library', 'xbox-library',
]);

/**
 * FIREBASE JETONU gerektiren uçlar (verifyMobileToken).
 * uid JETONDAN geliyor, istekten değil — IDOR'a kapalı olmasının sebebi bu.
 * Sahiplik ve gizlilik kontrolü ayrıca store katmanında uygulanıyor.
 */
export const AUTH_ROUTES = new Set([
  'user/data', 'auth/connections', 'auth/mobile-delete',
  'social/activity', 'social/avatar', 'social/avatar/photo', 'social/block',
  'social/card-url', 'social/chat', 'social/chat/auth', 'social/chat/config',
  'social/chat/like', 'social/chat/list', 'social/chat/media',
  'social/chat/pin', 'social/chat/typing', 'social/friend',
  'social/friend-activity', 'social/game-cards', 'social/lists',
  'social/posts', 'social/posts/[id]', 'social/presence', 'social/privacy',
  'social/profile', 'social/push-token', 'social/report', 'social/reviews',
  'social/reviews/eligible', 'social/reviews/feed', 'social/search',
  'social/steam-friends', 'social/username',
]);

/** Yalnızca CRON_SECRET ile. Kapalı başarısız oluyor: secret yoksa 503. */
export const CRON_ROUTES = new Set([
  'cron/price-alerts',
]);

/** Üretimde 404. Kimlik doğrulaması yok ve teşhis verisi döküyorlar. */
export const DEV_ONLY_ROUTES = new Set([
  'debug-prices', 'debug-rawg',
]);

/** Sınıflandırılmış her route — denetleyici bunu kullanıyor. */
export const ALL_CLASSIFIED = new Map([
  ...[...PUBLIC_ROUTES].map((r) => [r, 'PUBLIC']),
  ...[...AUTH_ENTRY_ROUTES].map((r) => [r, 'AUTH_ENTRY']),
  ...[...SESSION_ROUTES].map((r) => [r, 'SESSION']),
  ...[...AUTH_ROUTES].map((r) => [r, 'AUTH']),
  ...[...CRON_ROUTES].map((r) => [r, 'CRON']),
  ...[...DEV_ONLY_ROUTES].map((r) => [r, 'DEV_ONLY']),
]);

/**
 * Kimlik doğrulamasız erişilebilmesi BEYAN EDİLMİŞ uçlar.
 * Bir uç buradaysa açık olması bilinçlidir; değilse kapalı olmalıdır.
 */
export function isDeclaredOpen(route) {
  return PUBLIC_ROUTES.has(route) || AUTH_ENTRY_ROUTES.has(route);
}
