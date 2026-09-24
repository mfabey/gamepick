// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE DÜĞMESİ — TEMBEL SARMALAYICI
//
// Asıl uygulama `GoogleAuthButtonImpl.jsx` içinde ve BURADAN STATİK OLARAK
// IMPORT EDİLMİYOR. Kütüphanenin importu yerel modülü `getEnforcing` ile
// istiyor; modülü olmayan bir yapıda (ör. paket eklenmeden önce derlenmiş
// APK) uygulamanın TAMAMI açılışta düşerdi. Aynı sınıf hata cihazda ölçüldü:
// ilk sürümde statik import edilen expo-crypto "Cannot find native module
// 'ExpoCrypto'" ile tüm uygulamayı düşürmüştü. Ekran yüklenmeden önce çökmek,
// olmayan bir düğme göstermekten çok daha kötü.
//
// Böylece özellik, yapılandırılana kadar tamamen SESSİZ: ne kod yolu
// çalışıyor ne de yerel bağımlılık aranıyor.
// ─────────────────────────────────────────────────────────────────────────────
import { GOOGLE_YAPILANDIRILDI } from '../services/googleAuthConfig';

export { GOOGLE_YAPILANDIRILDI };

let Impl = null;

export default function GoogleAuthButton(props) {
  // Çağıranlar zaten `GOOGLE_YAPILANDIRILDI` ile koşullu çiziyor; buradaki
  // ikinci kapı, yeni bir çağıranın kapıyı atlamasına karşı.
  if (!GOOGLE_YAPILANDIRILDI) return null;
  if (!Impl) Impl = require('./GoogleAuthButtonImpl').default;
  return <Impl {...props} />;
}
