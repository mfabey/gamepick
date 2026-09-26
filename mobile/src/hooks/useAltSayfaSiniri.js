// ─────────────────────────────────────────────────────────────────────────────
// KLAVYELİ ALT SAYFANIN YÜKSEKLİK TAVANI
//
// TUZAK — ölçüldü (26 Eyl, iPhone SE simülatör). Alt sayfa
// `KeyboardAvoidingView`'in İÇİNDEYSE `maxHeight: '82%'` ekrana göre DEĞİL,
// KAV'a göre çözülüyor. KAV'ın yüksekliği içerikten geliyor, yani sayfa kendi
// doğal boyunun %82'sine kırpılıyor, KAV doğal boyda kalıyor:
//   KAV 305 · sayfa 250 = 305 × 0.82 → altta 55 pt boşluk
// Yan etkileri de aynı kökten: içteki liste sıkışıyor (satırlar kaydırmanın
// altında saklı), klavye açılınca sayfa klavyenin o boşluk kadar üstünde
// duruyor. KAV'sız FilterSheet'te `'85%'` doğru çalışıyor: orada ebeveyn
// ekran boyunda.
//
// ÇÖZÜM: tavan SAYI olarak veriliyor. KAV üst güvenli alanın bir dokunma
// hedefi (TOUCH_MIN) altına kadar büyüyebiliyor; klavye açılınca dolgusu
// artıyor ve sayfa (flexShrink) kalan alana küçülüyor — içindeki ScrollView
// da onunla. Üstte kalan şerit karartma: klavye açıkken de sayfa oraya
// dokunarak kapanabilsin (ilk denemede şerit yoktu, sayfa kapanamadı).
//
// Kullanım:
//   const sinir = useAltSayfaSiniri(0.82);
//   <KeyboardAvoidingView behavior="padding" style={[..., sinir.kav]}>
//     <View style={[styles.sheet, sinir.sayfa]}>
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOUCH_MIN } from '../theme';

export function useAltSayfaSiniri(oran) {
  const { height } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  return useMemo(() => ({
    kav: { maxHeight: height - top - TOUCH_MIN },
    sayfa: { maxHeight: Math.round(height * oran), flexShrink: 1 },
  }), [height, top, oran]);
}
