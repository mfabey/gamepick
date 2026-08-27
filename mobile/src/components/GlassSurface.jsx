import { View, StyleSheet, Platform } from 'react-native';
import { GlassView, isLiquidGlassAvailable, isGlassEffectAPIAvailable } from 'expo-glass-effect';

import { useStyles } from '../context/ThemeContext';

// ─────────────────────────────────────────────────────────────────────────────
// Cam yüzey — iOS 26'nın sohbet başlığı ve kompozitörü bu malzemeden.
//
// FloatingTabBar aynı işi kendi içinde yapıyordu ve mantığı oradan kopyalamak
// yerine buraya alındı: iki yerde iki ayrı GLASS_OK hesabı, biri güncellenip
// öteki unutulduğunda sessizce farklı davranan iki yüzey demekti.
//
// ── ÖLÇÜM (iOS 26.5 Simulator, iPhone 17 Pro) ──
//   koyu tema : siyah zemin üstünde #191919 ≈ %10 beyaz, kenarlık YOK
//   açık tema : saf beyaz + yumuşak gölge, kenarlık YOK
//   gölge     : kapsül alt kenarında zemin #f4f4f4, 20pt aşağıda #fbfbfb'ye
//               sönüyor → yaklaşık opacity .06 / radius 18 / offsetY 3
//
// Kenarlık BİLEREK yok. Camın kenarı Apple'da ışıkla ayrışıyor, çizgiyle
// değil; 1px kenarlık eklemek yüzeyi "kutu" gibi gösteriyor.
// ─────────────────────────────────────────────────────────────────────────────

// Liquid Glass kullanılabilirliği MODÜL DÜZEYİNDE bir kez hesaplanıyor.
// İki kontrol birden şart: bazı iOS 26 beta sürümlerinde API yok ve yalnızca
// isLiquidGlassAvailable'a güvenilirse uygulama çöküyor (FloatingTabBar'da
// ölçüldü).
export const GLASS_OK = (() => {
  if (Platform.OS !== 'ios') return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
})();

/**
 * @param {object} p
 * @param {any}    p.style     dış ölçü/konum (yarıçap BURADA verilmeli)
 * @param {number} p.radius    cam katmanının köşe yarıçapı
 * @param {any}    p.children
 */
export default function GlassSurface({ style, radius = 0, children, ...rest }) {
  const styles = useStyles(makeStyles);
  return (
    // Yarıçap DIŞ GÖVDEYE de veriliyor. Yalnızca cam katmanına verilseydi,
    // cam yokken (Android / iOS 26 öncesi) düz dolgu köşeli kalırdı — hap
    // biçiminde tasarlanmış bir yüzey orada dikdörtgen olurdu.
    <View
      style={[styles.yuzey, { borderRadius: radius }, GLASS_OK ? styles.saydam : styles.duz, style]}
      {...rest}
    >
      {/* Cam katmanı içeriği SARMALAMAZ, arkasında durur: içerik basılınca
          opacity uyguluyor ve bu camı bozuyor (expo-glass-effect belgesi
          GlassView'da ya da ebeveyninde opacity<1 istemiyor). */}
      {GLASS_OK ? (
        <GlassView
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
          glassEffectStyle="regular"
          pointerEvents="none"
        />
      ) : null}
      {children}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  yuzey: {
    // Gölge ölçümden: açık temada yüzeyi zeminden ayıran tek şey bu.
    // Koyu temada siyah üstünde siyah gölge zaten görünmüyor, ayrı bir
    // dal açmaya değmiyor.
    // tema-bagimsiz: golge her zaman siyah; goruntusu zemine gore degisiyor
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 3 },
  },
  // Cam varken zemin SAYDAM: GlassView'ın arkasındaki dolgu blur'u
  // öldürüyor ve yüzey donuk bir plastiğe dönüyor.
  saydam: { backgroundColor: 'transparent' },
  duz:    { backgroundColor: colors.barSolid },
});
