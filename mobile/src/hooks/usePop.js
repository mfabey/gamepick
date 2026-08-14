// ─────────────────────────────────────────────────────────────────────────────
// Durum değişiminde kısa bir "oldu" tepkisi.
//
// NEDEN KANCA. Bu hareket uygulamada TEK bir yerde doğru yazılmıştı:
// FloatingTabBar'daki TabIcon. Beğeni ve istek listesine kopyalansaydı
// beşinci yay ayarı doğardı — boşluk ölçeğinde ve karartma reçetesinde
// olanın aynısı. Mantık burada, ayar theme.js'te (motion.pop).
//
// YALNIZCA AÇILIRKEN tepki veriyor. Kapanışta hareket yok: beğeniyi geri
// almak dikkat çekmemeli, sessizce olmalı. Aynı karar TabIcon'da da vardı
// ("odak kaybında tepki yok, ayrılan sekme dikkat çekmemeli").
//
// İLK ÇİZİMDE TETİKLENMEZ. Aksi hâlde ekrana giren her beğenilmiş gönderi
// açılışta zıplardı; liste kaydırıldıkça geri dönüşen kartlar yüzünden bu
// sürekli tekrarlanırdı.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react';
import {
  useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring,
  interpolate, Extrapolation,
} from 'react-native-reanimated';

import { motion } from '../theme';
import { useReducedMotion } from './useReducedMotion';

/**
 * @param {boolean} active  izlenen durum (beğenildi / listede / seçili)
 * @param {number} [scale]  tepe ölçek
 * @returns animasyonlu stil — <Animated.View style={style}> ile kullanılır
 */
export function usePop(active, scale = 1.22) {
  const pop = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const wasActive = useRef(active);

  useEffect(() => {
    if (active && !wasActive.current && !reducedMotion) {
      pop.value = withSequence(
        withTiming(1, { duration: 110 }),
        withSpring(0, motion.pop),
      );
    }
    wasActive.current = active;
  }, [active, pop, reducedMotion]);

  return useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pop.value, [0, 1], [1, scale], Extrapolation.CLAMP) }],
  }), [scale]);
}
