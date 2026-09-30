// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE GİRİŞİ YAPILANDIRMASI — tek kaynak
//
// Ayrı dosyada duruyor çünkü hem düğme sarmalayıcısı (çizilebilir mi?) hem de
// asıl uygulama (configure) okuyor; ikisini birbirine bağlamak döngü yaratırdı.
//
// Kütüphane: @react-native-google-signin/google-signin. `expo-auth-session`
// Google sağlayıcısı Expo belgelerinde "Deprecated" olduğu için bırakıldı.
//
// Değerler `app.json → expo.extra.googleAuth` içinde:
//   • webClientId    — MEVCUT (google-services.json'daki type 3 istemci).
//                      id_token'ın hedef kitlesi bu; Firebase aynı projenin
//                      web istemcisini kabul ediyor. İki platform da bunu
//                      kullanıyor.
//   • androidEnabled — Firebase'deki Android uygulamasına imza SHA-1'leri
//                      (yerel/EAS anahtarı VE Play App Signing anahtarı)
//                      eklenince `true`. Android istemci kimliği koda
//                      YAZILMAZ; kütüphane `androidClientId` verilirse hata
//                      fırlatıyor, eşleşmeyi paket adı + SHA-1 yapıyor.
//   • iosEnabled     — Firebase'e iOS uygulaması eklenip
//                      GoogleService-Info.plist `ios.googleServicesFile`
//                      olarak bağlanınca `true`. Config plugin ters çevrilmiş
//                      URL şemasını o dosyadan okuyor, istemci kimliğini de
//                      kütüphane oradan alıyor.
// İkisi de YENİ YEREL DERLEME ister; OTA ile gitmez.
// ─────────────────────────────────────────────────────────────────────────────
import { Platform, TurboModuleRegistry } from 'react-native';
import Constants from 'expo-constants';

export const GOOGLE_YAPI = Constants.expoConfig?.extra?.googleAuth || {};

const PLATFORMDA_ACIK = Platform.select({
  android: GOOGLE_YAPI.androidEnabled === true,
  ios: GOOGLE_YAPI.iosEnabled === true,
  default: false,
});

/**
 * Bu platformda Google girişi çizilebilir mi?
 *
 * Çağıranlar buna bakarak düğmeyi mount ediyor. Üç koşul da şart:
 *   1. Platform bayrağı açık — istemci Google tarafında kurulmadan düğme
 *      çizilirse basınca DEVELOPER_ERROR veriyor.
 *   2. webClientId var — yoksa id_token dönmüyor.
 *   3. Yerel modül BU DERLEMEDE var. `extra` OTA ile değişebiliyor ama yerel
 *      modül değişemiyor: bayrağı açan bir güncelleme modülü içermeyen eski
 *      bir kuruluma inerse kütüphanenin importu `getEnforcing` ile uygulamayı
 *      düşürürdü (aynı sınıf hata ExpoCrypto'yla cihazda görüldü). `get`
 *      modül yoksa fırlatmıyor, null dönüyor.
 */
export const GOOGLE_YAPILANDIRILDI =
  PLATFORMDA_ACIK &&
  !!GOOGLE_YAPI.webClientId &&
  TurboModuleRegistry.get('RNGoogleSignin') != null;
