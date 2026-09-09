// ─────────────────────────────────────────────────────────────────────────────
// GALERİ ERİŞİMİ — DERLEME ZAMANI GERÇEĞİ
//
// Bu bir ÖZELLİK BAYRAĞI DEĞİL. "Bu binary'nin Info.plist'inde
// NSPhotoLibraryUsageDescription var mı?" sorusunun cevabı. Tek doğruluk
// kaynağı `app.json` → `expo-image-picker` → `photosPermission`.
//
// NEDEN VAR (2026-09-09). 2.6.1 (42) App Store incelemesinde Guideline 2.1(a)
// ile reddedildi: "the app crashed upon tapping the Photo button". Zincir:
//
//   1. `app.json`'da `photosPermission: false` → izin metni Info.plist'te YOK.
//   2. Galeriyi açan iki yer (sohbet kompozitörü, avatar seçici) yalnızca
//      SUNUCUDAN gelen `photos` bayrağına bakıyordu.
//   3. O bayrağı kapatan `USER_UPLOADS_ENABLED` yalnızca uygulama dalındaydı;
//      yayındaki sunucu (`main`) onu tanımıyor ve `photos` hesabını iki ortam
//      değişkeninden yapıyordu — bayrak `true` dönüyordu.
//   4. Düğme çizildi, incelemeci bastı, izin metni olmadığı için iOS
//      uygulamayı SONLANDIRDI.
//
// Yani çökmeyi engelleyen tek şey UZAKTAKİ bir yapılandırmaydı: tek bir
// sunucu değişikliği her iOS kullanıcısını çökertebiliyordu. Karar artık
// BINARY'NİN İÇİNDE. Sunucu ne derse desin, izin metni yokken galeri açılmaz.
//
// AGENTS.md bu riski yazmıştı ama denetleyen bir şey yoktu; yazılı uyarı
// yetmedi. `npm run check:galeri` artık bu sabitle `app.json`'ı karşılaştırıyor
// ve uyuşmazlarsa DÜŞÜYOR.
//
// ⚠️ GERİ AÇARKEN ÜÇÜ BİRLİKTE:
//   1. Bu sabiti `true` yap.
//   2. `app.json` → `photosPermission` metnini geri koy.
//   3. Sunucuda `app/lib/media-moderation.js` → `USER_UPLOADS_ENABLED = true`
//      YAYINA ÇIKSIN (dalda kalması yetmez — reddin sebebi tam olarak buydu).
// İlk iki adım OTA ile gitmez, YENİ BUILD gerektirir.
// ─────────────────────────────────────────────────────────────────────────────

export const GALERI_IZNI_VAR = false;
