import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { tabGeometry } from '../theme/tabGeometry';

// ─────────────────────────────────────────────────────────────────────────────
// ALT KENAR GÜVENLİ BOŞLUĞU — Android edge-to-edge'in getirdiği kural.
//
// Android 15 (API 35) ve sonrasında edge-to-edge ZORUNLU: uygulama artık
// sistem çubuklarının ALTINA çiziyor, çubuklar da şeffaf. Expo SDK 54'te bu
// kapatılamıyor (`edgeToEdgeEnabled` alanı yalnız `true` kabul ediyor).
//
// Sonuç: ekranın en altına oturan sabit bir çubuk, gezinme çubuğunun ARDINDA
// kalıyor. Ölçüler:
//   • jest gezinmesi (kaydırma çubuğu) → insets.bottom ≈ 24dp
//   • üç düğmeli gezinme              → insets.bottom ≈ 48dp
//
// `paddingBottom: 24` gibi SABİT bir değer birincisinde tam sınırda, ikincisinde
// yetersiz: 48dp'lik çubuk, 24dp'lik dolgunun üstüne biniyor ve düğmenin alt
// yarısı hem görünmez hem DOKUNULAMAZ oluyor.
//
// iOS'ta sorun görünmüyordu (ana ekran göstergesi ince bir katman), bu yüzden
// hata yalnız Android'de ortaya çıkıyor — bu kancanın var olma sebebi de bu.
//
// Not: bu kanca yalnız EKRANIN ALTINA yaslanmış, kaydırılMAyan kaplar içindir.
// Kaydırılan listelerde doğru yer `contentContainerStyle.paddingBottom`.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {number} taban  tasarımın istediği en küçük boşluk (dp)
 * @returns {number}      taban ile gerçek alt inset'in büyüğü
 */
export function useAltBosluk(taban = 0) {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, taban);
}

// ─────────────────────────────────────────────────────────────────────────────
// YÜZEN SEKME ÇUBUĞUNUN ALTINDAKİ LİSTE BOŞLUĞU.
//
// Gamerisen 2.0: iOS 62 + max(safe - 13, 12), Android 64 + safe.
// İki bar da içerik üstüne yerleşir; navigator ayrıca alt alan ayırmaz.
// Bar, video kontrolleri ve listeler aynı tabGeometry hesabını kullanır.
// Eski hook adı korunur; `ek` varsayılan 12pt nefes payına eklenir.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {number} ek  tasarımın istediği fazladan boşluk (dp)
 * @returns {number}   sekme çubuğunu güvenle temizleyen alt dolgu
 */
export function useTabBosluk(ek = 0) {
  const insets = useSafeAreaInsets();
  return tabGeometry(Platform.OS, insets.bottom, 12 + ek).contentInset;
}
