// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE DÜĞMESİ — TEMBEL SARMALAYICI
//
// Asıl uygulama `GoogleAuthButtonImpl.jsx` içinde ve BURADAN STATİK OLARAK
// IMPORT EDİLMİYOR. Sebep cihazda ölçüldü: statik import
// expo-auth-session → expo-crypto zincirini kuruyor; yerel modülü olmayan bir
// yapıda (ör. paket eklenmeden önce derlenmiş APK) uygulamanın TAMAMI
// "Cannot find native module 'ExpoCrypto'" ile düşüyordu. Ekran yüklenmeden
// önce çökmek, olmayan bir düğme göstermekten çok daha kötü.
//
// Böylece özellik, istemci kimlikleri eklenene kadar tamamen SESSİZ: ne kod
// yolu çalışıyor ne de yerel bağımlılık aranıyor.
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
