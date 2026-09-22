import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon } from '../Icon';
import { PressableScale } from './Primitives';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useLanguage } from '../../context/LanguageContext';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { component as K, layout, motion, typography } from '../../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// TAKİP DÜĞMESİ — kit c.py follow_btn(): 34 pt, köşe 10, 14/600.
// Takip edilmiyorken birincil (nötr beyaz) + "Takip et"; takip edilirken
// surface2 + text2 + tik + "Takip ediliyor". Renk 200 ms'de geçiyor.
//
// DURUM TUTMUYOR ve bir API'ye bağlı DEĞİL: takip tek yönlü, arkadaşlık iki
// yönlü (plan §6 — arkadaşlık isteğini bu düğmeye bağlamak yasak). Etiketler
// değiştirilebilir; takip ucu gelene kadar yalnız galeride kullanılıyor.
// ─────────────────────────────────────────────────────────────────────────────
export function FollowButton({ following, onPress, disabled, followLabel, followingLabel }: {
  following: boolean; onPress: () => void; disabled?: boolean; followLabel?: string; followingLabel?: string;
}) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const progress = useSharedValue(following ? 1 : 0);
  useEffect(() => {
    const next = following ? 1 : 0;
    progress.value = reduced ? next : withTiming(next, { duration: motion.duration.standard, easing: motion.easing.standard });
  }, [following, reduced, progress]);
  const surface = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.primary, colors.surface2]),
  }));
  const ink = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.onPrimary, colors.text2]),
  }));
  return (
    <PressableScale accessibilityRole="button" accessibilityState={{ selected: following, disabled: !!disabled }}
      onPress={onPress} disabled={disabled} hitSlop={(layout.minTouch - K.follow.height) / 2} style={[styles.button, surface]}>
      {following && <Icon name="check" size={K.follow.check} color={colors.text2} strokeWidth={K.follow.checkStroke} />}
      <Animated.Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={[typography.subhead, ink]}>
        {following ? followingLabel ?? t('v2.following') : followLabel ?? t('v2.follow')}
      </Animated.Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: { height: K.follow.height, borderRadius: K.follow.radius, paddingHorizontal: K.follow.paddingH,
    flexDirection: 'row', alignItems: 'center', gap: K.follow.gap },
});
