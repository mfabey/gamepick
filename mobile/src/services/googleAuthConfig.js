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

// Hem yerel (@react-native-google-signin) hem de WebBrowser köprüsü ile
// Apple'a yeni derleme atmadan her ortamda aktif çalışır.
export const GOOGLE_YAPILANDIRILDI = true;

