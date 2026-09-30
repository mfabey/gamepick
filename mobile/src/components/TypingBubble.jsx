import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withDelay,
} from 'react-native-reanimated';

import { useReducedMotion } from '../hooks/useReducedMotion';
import { spacing } from '../theme';
import { useStyles } from '../context/ThemeContext';
import { useDesignTheme } from '../theme/useDesignTheme';
import { component as K } from '../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// "Yazıyor" baloncuğu — AKIŞIN İÇİNDE, başlıkta değil.
//
// Başlıkta bir "yazıyor…" yazısı vardı. iOS bunu akışın en altına, gelen
// mesaj renginde bir baloncuk olarak koyuyor ve sebebi şu: yazılmakta olan
// şey BİR MESAJ ve yeri diğer mesajların yanı. Başlıktaki yazı, gözün
// mesajları takip ettiği yerin dışında kalıyor ve kaçırılıyor.
//
// TERS ÇEVRİLMİŞ LİSTEDE nasıl en alta geliyor: veriye sahte bir satır
// olarak EN BAŞA ekleniyor (msgs[0] = en yeni = ekranda en alt).
// ListHeaderComponent kullanılmadı — ters listede başlık/altlık hücre
// dönüşümünün dışında kalıyor ve baş aşağı çiziliyor (aynı tuzağa
// ListEmptyComponent'te bir kez düşülmüş, bkz. emptyWrap'teki scaleY).
// ─────────────────────────────────────────────────────────────────────────────

/** Tek turun süresi. iOS'unkiyle aynı ritim: yavaş, sabırlı. */
const TUR = 1200;
/** Noktalar arası gecikme — dalga hissi bundan çıkıyor. */
const GECIKME = 180;

function Nokta({ gecikme, kapali }) {
  const styles = useStyles(makeStyles);
  const p = useSharedValue(0);

  useEffect(() => {
    // Hareket azaltılmışsa nokta SABİT duruyor ama görünür kalıyor:
    // gösterge bir bilgi taşıyor, animasyon yalnızca süsü.
    if (kapali) { p.value = 0.6; return; }
    p.value = withDelay(gecikme, withRepeat(withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(0, { duration: 300 }),
      withTiming(0, { duration: TUR - 600 }),
    ), -1, false));
  }, [p, gecikme, kapali]);

  const canli = useAnimatedStyle(() => ({
    opacity: 0.35 + p.value * 0.55,
    transform: [{ scale: 0.85 + p.value * 0.25 }],
  }));

  return <Animated.View style={[styles.nokta, canli]} />;
}

export default function TypingBubble() {
  const styles = useStyles(makeStyles);
  const { colors: dc } = useDesignTheme();
  const kapali = useReducedMotion();

  return (
    <View style={styles.satir} accessibilityRole="text" accessibilityLabel="…">
      <View style={[styles.baloncuk, { backgroundColor: dc.surface2 }]}>
        <Nokta gecikme={0} kapali={kapali} />
        <Nokta gecikme={GECIKME} kapali={kapali} />
        <Nokta gecikme={GECIKME * 2} kapali={kapali} />
      </View>
    </View>
  );
}

const T = K.chat.typing;

const makeStyles = (colors) => StyleSheet.create({
  satir: { alignItems: 'flex-start', marginTop: spacing.s8 },
  // G-19 (kit chat() typing): 64×36, gelen baloncuğun köşesi (18/6),
  // içinde 7 pt üç nokta. Ölçü sabit — dolgudan hesaplanmıyor, çünkü kit
  // kutunun kendisini veriyor.
  baloncuk: {
    width: T.width, height: T.height,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: T.gap,
    borderRadius: K.chat.bubble.radius, borderBottomLeftRadius: K.chat.bubble.corner,
  },
  nokta: { width: T.dot, height: T.dot, borderRadius: T.dot / 2, backgroundColor: colors.text2 },
});
