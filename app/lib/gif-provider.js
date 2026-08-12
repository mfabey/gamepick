// ─────────────────────────────────────────────────────────────────────────────
// GIF sağlayıcı yapılandırması.
//
// AYRI DOSYADA OLMASININ SEBEBİ TEKNİK: Next.js route dosyalarından yalnızca
// yol işleyicileri (GET/POST/…) ve bilinen ayar alanları dışa aktarılabilir.
// `route.js` içinden `isGifConfigured` dışa aktarmak derlemeyi
// `is not a valid Route export field` diyerek düşürüyor. İki uç birden bu
// bilgiye ihtiyaç duyduğu için (arama vekili ve sohbet yapılandırması)
// ortak bir yere alındı.
//
// ANAHTAR ADI SAĞLAYICIDAN BAĞIMSIZ. Tenor 30 Haziran 2026'da kapandı;
// kodda ölü bir şirket adı taşımamak ve bir sonraki sağlayıcı değişiminde
// tekrar yeniden adlandırmamak için `GIF_API_KEY`.
// ─────────────────────────────────────────────────────────────────────────────

export function isGifConfigured() {
  return !!process.env.GIF_API_KEY;
}
