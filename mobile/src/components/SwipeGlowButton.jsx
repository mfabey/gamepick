// ─────────────────────────────────────────────────────────────────────────────
// Kaydırarak keşif (swipe) girişi — sağ üstte parlayan ikon.
//
// Neden parlıyor: bu giriş artık anasayfada bir satır olarak durmuyor, tek
// başına bir ikon. Sabit bir ikon o kalabalıkta gözden kaçardı; nabız gibi
// atan bir hale onu keşfedilebilir kılıyor.
//
// HAREKET AZALTMA: hale tamamen DEKORATİF, o yüzden "Hareketi Azalt" açıkken
// duruyor — ama görünmez olmuyor, sabit bir parıltı olarak kalıyor. Yoksa
// ayarı açan kullanıcı için düğme fark edilemez hâle gelirdi.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle, useSharedValue, withRepeat, withTiming, interpolate, Easing,
} from 'react-native-reanimated';

import { useReducedMotion } from '../hooks/useReducedMotion';
import { colors, radius } from '../theme';

const SIZE = 44;          // HIG asgari dokunma hedefi
const ICON = 21;

export default function SwipeGlowButton({ onPress, accessibilityLabel }) {
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) { pulse.value = 0.5; return; }
    pulse.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,     // sonsuz
      true    // ileri-geri (yön değiştirerek) → sıçrama yok
    );
  }, [reducedMotion, pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.22, 0.6]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.92, 1.28]) }],
  }), []);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.7 }]}
    >
      {/* Hale ikonun ALTINDA; pointerEvents kapalı ki dokunmayı yutmasın */}
      <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]} />
      <View style={styles.core}>
        <Ionicons name="layers" size={ICON} color={colors.accent} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: SIZE, height: SIZE, borderRadius: SIZE / 2,
    backgroundColor: colors.accentGlow,
  },
  core: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1, borderColor: colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
});
