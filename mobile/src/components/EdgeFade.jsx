import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { alfaSifir } from '../theme';
import { useTheme } from '../context/ThemeContext';

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
//
// ── RENKLER ARTIK MODÜL SABİTİ DEĞİL ──
// Öncesinde `const BG = colors.bg` ve `const BG_0 = bgAlpha0` modül düzeyinde
// duruyordu; ikisi de açılıştaki paletten bir kez hesaplanıyordu. Tema
// değişince sönümleme ESKİ zeminin rengiyle çiziliyor, yani tam da düzeltmek
// için var olduğu lekeyi kendisi üretiyordu.
//
// Saydam uç için 'transparent' KULLANILAMIYOR: iOS gradyanı saydam SİYAHA
// doğru interpolasyona sokuyor ve açık zeminde gri bir leke bırakıyor. Bitiş
// rengi zeminin kendisi olmalı, yalnızca alfası 0.
// ─────────────────────────────────────────────────────────────────────────────

/** Aktif zemin + onun alfa 0 hâli. İkisi de canlı paletten. */
function useUclar() {
  const { colors } = useTheme();
  return useMemo(() => [colors.bg, alfaSifir(colors.bg)], [colors.bg]);
}

export function TopFade({ top = 0, height = 28 }) {
  const [BG, BG_0] = useUclar();
  return (
    <LinearGradient
      colors={[BG, BG_0]}
      style={[styles.fade, { top, height }]}
      pointerEvents="none"
    />
  );
}

export function BottomFade({ height = 96 }) {
  const [BG, BG_0] = useUclar();
  return (
    <LinearGradient
      colors={[BG_0, BG]}
      style={[styles.fade, { bottom: 0, height }]}
      pointerEvents="none"
    />
  );
}

// Renk taşımıyor — paletten bağımsız, olduğu yerde kalabilir.
const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, zIndex: 9 },
});
