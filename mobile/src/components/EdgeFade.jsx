import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Kenar sönümlemesi — içerik ekranın üst/alt kenarında zemine karışarak
// kaybolsun, sert bir çizgiyle kesilmesin.
//
// Bu bir BLUR DEĞİL, sönümleme. Gerçek optik blur (kenara doğru yumuşayan)
// expo-blur + maskeleme ister; ikisi de native bağımlılık, ikisi de OTA yolunu
// kapatır (runtimeVersion politikası appVersion). expo-glass-effect'in
// GlassView'ü ise yüzey: kenarı keskin, üstelik yalnız iOS 26+. Elde kalan ve
// derinlik hissini veren şey bu geçiş.
//
// Statik katman: kaydırırken kare başına yeniden çizim gerektirmiyor.
// pointerEvents kapalı — altındaki listeye dokunmayı engellemez.
// ─────────────────────────────────────────────────────────────────────────────

// Zeminin saydam hâli. 'transparent' yerine AÇIKÇA rgba yazılıyor: iOS'ta
// 'transparent' siyaha çözülüyor ve koyu olmayan zeminlerde geçiş griye
// kaçıyor. Renk aynı kalıp yalnız alfa düşünce geçiş temiz oluyor.
const BG = colors.bg;
const BG_0 = 'rgba(6,7,10,0)'; // colors.bg (#06070a) alfa 0

export function TopFade({ top = 0, height = 28 }) {
  return (
    <LinearGradient
      colors={[BG, BG_0]}
      style={[styles.fade, { top, height }]}
      pointerEvents="none"
    />
  );
}

export function BottomFade({ height = 96 }) {
  return (
    <LinearGradient
      colors={[BG_0, BG]}
      style={[styles.fade, { bottom: 0, height }]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, zIndex: 9 },
});
