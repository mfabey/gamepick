// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE İSTEMCİ KİMLİKLERİ — tek kaynak
//
// Ayrı dosyada duruyor çünkü hem düğme sarmalayıcısı (yapılandırılmış mı?) hem
// de asıl uygulama (isteği kuran) okuyor; ikisini birbirine bağlamak döngü
// yaratırdı.
//
// Kimlikler `app.json → expo.extra.googleAuth` içinde. `webClientId` mevcut
// (google-services.json'daki type 3 istemci); Android ve iOS istemcileri
// Google Cloud Console'da OLUŞTURULMALI:
//   • androidClientId — uygulamanın SHA-1 parmak iziyle
//   • iosClientId     — + app.json'a ters çevrilmiş URL şeması
// ─────────────────────────────────────────────────────────────────────────────
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const GOOGLE_YAPI = Constants.expoConfig?.extra?.googleAuth || {};

const PLATFORM_KIMLIGI = Platform.select({
  android: GOOGLE_YAPI.androidClientId,
  ios: GOOGLE_YAPI.iosClientId,
  default: GOOGLE_YAPI.webClientId,
});

/**
 * Bu platformda Google girişi çizilebilir mi?
 *
 * Çağıranlar buna bakarak düğmeyi mount ediyor. İki ayrı sebeple zorunlu:
 *   1. `Google.useIdTokenAuthRequest` kimlik yokken `invariantClientId` ile
 *      HATA FIRLATIYOR.
 *   2. expo-auth-session → expo-crypto YEREL modül istiyor; kimlik yokken
 *      bileşen hiç `require` edilmediği için eski yapılarda da bir şey
 *      kırılmıyor (cihazda ölçüldü: statik import tüm uygulamayı
 *      "Cannot find native module 'ExpoCrypto'" ile düşürüyordu).
 */
export const GOOGLE_YAPILANDIRILDI = !!PLATFORM_KIMLIGI;
