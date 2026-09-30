import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Icon } from '../Icon';
import { GlassView } from './GlassView';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useLanguage } from '../../context/LanguageContext';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { component as K, layout, motion } from '../../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// İSTEK LİSTESİ KALBİ — kit c.py heart(): cam daire, seçiliyken dolgu ve çizgi
// kırmızı. Boylar: 36/18 (varsayılan), GameCard 34/17, HeroCard 44/20.
//
// POP YALNIZ SEÇİLİRKEN: kit animasyonu `.is-on svg`e bağlı; kaldırırken ya da
// ekran ilk açılırken zaten seçili bir kalp zıplamamalı. Dokunsal geri
// bildirim de yalnız eklerken (DS 5: "kalp pop + hafif darbe").
//
// Kalbin kendisi durumu TUTMUYOR: `selected` dışarıdan (WishlistContext).
// Böylece kimlik eşleştirme ve kalıcılık tek yerde kalıyor.
// ─────────────────────────────────────────────────────────────────────────────
/** Kalp / beğeni "pop" (1 → 1.28 → 0.92 → 1, 240 ms); yalnız seçilirken, "hareketi azalt" kapalıyken. */
export function usePop(selected: boolean) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const previous = useRef(selected);

  useEffect(() => {
    if (selected && !previous.current && !reduced) {
      const [, up, down, rest] = motion.pop.keyframes;
      const [, a, b, c] = motion.pop.offsets;
      const step = (to: number, from: number, until: number) =>
        withTiming(to, { duration: motion.pop.duration * (until - from), easing: motion.easing.pop });
      scale.value = withSequence(step(up, 0, a), step(down, a, b), step(rest, b, c));
    }
    previous.current = selected;
  }, [selected, reduced, scale]);

  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
}

export function HeartButton({ selected, onPress, size = K.heart.size, iconSize = K.heart.icon, blurred = true, label, style }: {
  selected: boolean; onPress: () => void; size?: number; iconSize?: number;
  /** Kaydırılan listelerde false: aynı renk, bulanıklıksız (plan §6.1). */
  blurred?: boolean; label?: string; style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const pop = usePop(selected);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label ?? t('wishlist.add')} accessibilityState={{ selected }}
      hitSlop={size < layout.minTouch ? (layout.minTouch - size) / 2 : undefined}
      onPress={() => {
        if (!selected) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={[styles.base, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <GlassView pointerEvents="none" blurred={blurred} style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} />
      <Animated.View style={pop}>
        {/* Cam tema bağımsız (zemin görsel): seçili değilken ikon beyaz. */}
        <Icon name="heart" size={iconSize} color={selected ? colors.red : colors.white} fill={selected ? colors.red : 'none'} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({ base: { alignItems: 'center', justifyContent: 'center' } });
