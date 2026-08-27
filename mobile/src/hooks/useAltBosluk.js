import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_SPACE, TAB_BAR } from '../theme';

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
// `TAB_SPACE` (104) sabiti şu toplamdan geliyordu: 58 çubuk + 24 alt boşluk +
// 22 nefes payı. Oysa çubuğun kendisi `Math.max(insets.bottom, 24)` ile
// oturuyor (FloatingTabBar). Üç düğmeli gezinmede insets.bottom 48 → çubuk
// 106pt yer kaplıyor ve 104'lük dolgu HEM 2pt yetmiyor HEM de 22pt'lik nefes
// payını tamamen yutuyor: listenin son satırı çubuğun altına giriyor.
//
// Fark yalnızca insets.bottom 24'ü AŞTIĞINDA ekleniyor. Ölçülen sonuçlar:
//   • göstergesiz iPhone / Android jest (0–24dp) → 104  (bugünküyle aynı)
//   • ana ekran göstergeli iPhone (34dp)         → 114  (+10)
//   • Android üç düğmeli gezinme (48dp)          → 128  (+24)
//
// iPhone'daki +10 de bir DÜZELTME: çubuk orada 34+58=92pt yer kaplıyordu,
// 104'lük dolgu handoff'un istediği 22pt nefes payını 12pt'ye düşürüyordu.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {number} ek  tasarımın istediği fazladan boşluk (dp)
 * @returns {number}   sekme çubuğunu güvenle temizleyen alt dolgu
 */
export function useTabBosluk(ek = 0) {
  const insets = useSafeAreaInsets();
  return TAB_SPACE + Math.max(0, insets.bottom - TAB_BAR.bottom) + ek;
}
