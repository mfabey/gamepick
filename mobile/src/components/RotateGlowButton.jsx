// ─────────────────────────────────────────────────────────────────────────────
// Yatay/dikey geçiş düğmesi — video akışının üst köşesinde.
//
// Hafif bir hale taşıyor: video tam ekran ve koyu olduğu için sade bir ikon
// gözden kaçıyor. Ama parlaklık RAHATSIZ ETMEMELİ — kullanıcı burada video
// izliyor, yanıp sönen bir öğe dikkati sürekli kendine çeker. Bu yüzden
// SwipeGlowButton'daki nabızdan daha sönük ve daha yavaş bir hale kullanıldı.
//
// İkon durumu gösteriyor: yatay moddayken 90° dönüyor, böylece düğmenin neyi
// yaptığı ve şu an hangi modda olunduğu tek bakışta anlaşılıyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle, useSharedValue, withRepeat, withTiming, interpolate, Easing,
} from 'react-native-reanimated';

import { useReducedMotion } from '../hooks/useReducedMotion';

const SIZE = 44;   // HIG asgari dokunma hedefi

export default function RotateGlowButton({ active, onPress, accessibilityLabel }) {
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(0);
  const spin = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) { pulse.value = 0.5; return; }
    pulse.value = withRepeat(
      // 2600 ms: SwipeGlowButton'dan belirgin şekilde yavaş. Video izlerken
      // hızlı bir nabız huzursuz ediyor.
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [reducedMotion, pulse]);

  useEffect(() => {
    spin.value = reducedMotion
      ? (active ? 1 : 0)
      : withTiming(active ? 1 : 0, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [active, reducedMotion, spin]);

  const haloStyle = useAnimatedStyle(() => ({
    // Üst sınır 0.30 — swipe düğmesinde 0.6'ydı. Burada amaç fark edilmek,
    // dikkat çekmek değil.
    opacity: interpolate(pulse.value, [0, 1], [0.10, 0.30]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.94, 1.16]) }],
  }), []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(spin.value, [0, 1], [0, 90])}deg` }],
  }), []);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.6 }]}
    >
      <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]} />
      <View style={styles.core}>
        <Animated.View style={iconStyle}>
          <Ionicons name="phone-landscape-outline" size={20} color="#fff" />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: SIZE, height: SIZE, borderRadius: SIZE / 2,
    // tema-bagimsiz: video karesinin ustunde duruyor; her sahnede ayni kalmali
    backgroundColor: '#fff',
  },
  // Video üstünde durduğu için nötr koyu bir zemin: her kareyle uyumlu kalıyor,
  // marka rengi parlak bir sahnede okunmaz hâle gelirdi.
  core: {
    width: 34, height: 34, borderRadius: 17,
    // tema-bagimsiz: video karesinin ustunde duruyor; her sahnede ayni kalmali
    backgroundColor: 'rgba(0,0,0,0.42)',
    // tema-bagimsiz: video karesinin ustunde duruyor; her sahnede ayni kalmali
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
});
