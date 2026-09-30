import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon, type IconName } from '../Icon';
import { Txt } from './Primitives';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { tabGeometry } from '../../theme/tabGeometry';
import { component as K, control, layout, motion, shadow, space } from '../../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// TOAST — DS 4: 350×52, köşe 14, surface3, `shadow.toast`; ikon 18, metin
// 14/500, isteğe bağlı geri alınabilir eylem (tertiary 36). "Altta, 3 sn".
//
// ONAY İSTEYEN Alert'LERİN YERİNE GEÇMEZ: toast kendiliğinden kayboluyor,
// kullanıcı onu görmeden geçebilir. Yalnız zaten yapılmış ve geri alınabilir
// bir işin haberi için (istek listesine eklendi → Geri al).
//
// Konum sekme çubuğunun ÜSTÜ: sağlayıcı kökte, hangi ekranda olduğunu bilmiyor;
// çubuğun kapladığı alan kadar yukarıda durmak iki durumda da güvenli.
// Tek seferde tek toast: yenisi eskisinin yerini alıyor.
// ─────────────────────────────────────────────────────────────────────────────
export type ToastOptions = {
  message: string;
  tone?: 'success' | 'error' | 'neutral';
  icon?: IconName;
  action?: { label: string; onPress: () => void };
  duration?: number;
};

const ToastContext = createContext<(options: ToastOptions) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const next = useRef(0);
  const show = useCallback((options: ToastOptions) => {
    next.current += 1;
    setToast({ ...options, id: next.current });
    // iOS canlı bölge desteklemiyor; ekran okuyucuya ayrıca bildiriliyor.
    AccessibilityInfo.announceForAccessibility(options.message);
  }, []);
  const hide = useCallback(() => setToast(null), []);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(hide, toast.duration ?? K.toast.duration);
    return () => clearTimeout(timer);
  }, [toast, hide]);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && <ToastView key={toast.id} toast={toast} onHide={hide} />}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onHide }: { toast: ToastOptions; onHide: () => void }) {
  const { colors } = useDesignTheme();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const enter = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) enter.value = withTiming(1, { duration: motion.duration.transition, easing: motion.easing.standard });
  }, [reduced, enter]);
  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * K.toast.lift }],
  }));
  const tone = toast.tone ?? 'neutral';
  const icon = toast.icon ?? (tone === 'success' ? 'checkc' : tone === 'error' ? 'alert' : 'info');
  const iconColor = tone === 'success' ? colors.green : tone === 'error' ? colors.red : colors.text;
  const bottom = tabGeometry(Platform.OS, insets.bottom).occupied + space[12];
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.layer]}>
      <Animated.View role="status" accessibilityLiveRegion="polite" exiting={reduced ? undefined : FadeOut.duration(motion.duration.instant)}
        style={[styles.toast, style, { bottom, width: Math.min(K.toast.width, width - layout.gutter * 2),
          backgroundColor: colors.surface3, boxShadow: shadow.toast }]}>
        <Icon name={icon} size={K.toast.icon} color={iconColor} strokeWidth={control.iconStroke} />
        <Txt variant="toast" numberOfLines={2} style={styles.flex}>{toast.message}</Txt>
        {toast.action && (
          <Pressable accessibilityRole="button" accessibilityLabel={toast.action.label} hitSlop={(layout.minTouch - K.toast.actionHeight) / 2}
            onPress={() => { toast.action?.onPress(); onHide(); }} style={styles.action}>
            <Txt variant="subhead" style={{ color: colors.red }}>{toast.action.label}</Txt>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  layer: { alignItems: 'center', zIndex: 100 },
  toast: { position: 'absolute', minHeight: K.toast.height, borderRadius: K.toast.radius, paddingLeft: K.toast.paddingLeft, paddingRight: K.toast.paddingRight,
    flexDirection: 'row', alignItems: 'center', gap: K.toast.gap },
  action: { height: K.toast.actionHeight, paddingHorizontal: K.toast.actionPadding, justifyContent: 'center' },
});
