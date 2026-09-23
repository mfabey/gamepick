// Gamerisen sekme çubuğu — yalnızca ikon, platforma özel (tasarım: DS 7 · Sekme Çubuğu).
// iOS: yüzen cam kapsül (iOS 26'da gerçek Liquid Glass, daha eskide blur), seçili sekmede cam mercek.
// Android: Material 3 gezinme çubuğu, seçili sekmede 56 × 32 hap gösterge, dokununca dalga efekti.
//
// Kullanım (app/(tabs)/_layout.tsx):
//   <Tabs screenOptions={{ headerShown: false }}
//     tabBar={(p) => <GamerisenTabBar {...p} tabs={{
//       index: { icon: 'home' }, community: { icon: 'users' }, videos: { icon: 'play' },
//       messages: { icon: 'msg' }, profile: { avatarUri: user?.avatarUrl } }} />}>
//     <Tabs.Screen name="messages" options={{ title: 'Mesajlar', tabBarBadge: unread || undefined }} />
//   </Tabs>
// Ekranlarda alt boşluk için: const bottom = useTabBarInset();
//
// Paketler: npx expo install expo-glass-effect expo-blur expo-haptics expo-image react-native-reanimated react-native-safe-area-context

import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, useReducedMotion } from 'react-native-reanimated';
import { TabIcon, type TabIconName } from '../Icon';
import { colors, fontFor, motion, tabBar as T } from '../../theme/tokens';

export type TabSpec = { icon: TabIconName } | { avatarUri?: string };

type Props = BottomTabBarProps & { tabs: Record<string, TabSpec> };

/** Sekme çubuğunun kapladığı alt alan: kaydırılan içeriğe paddingBottom olarak ver. */
export function useTabBarInset(extra = 12) {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'ios') return T.ios.height + iosBottom(insets.bottom) + extra;
  return T.android.height + insets.bottom;
}
const iosBottom = (safe: number) => Math.max(safe - 13, 12); // tasarımda 34 güvenli alan → 21

export function GamerisenTabBar(props: Props) {
  return Platform.OS === 'ios' ? <IOSBar {...props} /> : <AndroidBar {...props} />;
}

/* ───────────── ortak ───────────── */

function tabInfo(props: Props, index: number) {
  const { state, descriptors, navigation } = props;
  const route = state.routes[index];
  const { options } = descriptors[route.key];
  const focused = state.index === index;
  const label = options.tabBarAccessibilityLabel ?? (typeof options.title === 'string' ? options.title : route.name);
  const badge = options.tabBarBadge;
  const onPress = () => {
    const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (Platform.OS === 'ios') Haptics.selectionAsync();
    if (!focused && !e.defaultPrevented) navigation.navigate(route.name, route.params);
  };
  const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });
  return { route, focused, label, badge, onPress, onLongPress, spec: props.tabs[route.name] };
}

function Glyph({ spec, focused, size, offColor, cutout, ringOff }: {
  spec: TabSpec | undefined; focused: boolean; size: number; offColor: string; cutout: string; ringOff: string;
}) {
  if (spec && 'icon' in spec) return <TabIcon name={spec.icon} active={focused} color={focused ? colors.red : offColor} size={size} cutout={cutout} />;
  const s = size + (Platform.OS === 'ios' ? 2 : 0);
  return (
    <Image source={spec && 'avatarUri' in spec ? spec.avatarUri : undefined} contentFit="cover"
      style={{ width: s, height: s, borderRadius: s / 2, borderWidth: 2, borderColor: focused ? colors.red : ringOff, backgroundColor: colors.surface2 }} />
  );
}

function Badge({ value, ios }: { value: string | number; ios: boolean }) {
  const b = ios ? T.ios.badge : T.android.badge;
  return (
    <View pointerEvents="none" style={[styles.badge, { top: b.top, left: b.left, minWidth: b.size, height: b.size, borderRadius: b.size / 2, paddingHorizontal: ios ? 5 : 4 },
      ios ? { boxShadow: `0 0 0 2px ${T.ios.badge.ring}` } : null]}>
      <Text allowFontScaling={false} style={styles.badgeText}>{value}</Text>
    </View>
  );
}

function Tooltip({ label, ios }: { label: string; ios: boolean }) {
  return (
    <View pointerEvents="none" style={[styles.tip, ios ? styles.tipIOS : styles.tipAndroid]}>
      <Text allowFontScaling={false} style={ios ? styles.tipTextIOS : styles.tipTextAndroid}>{label}</Text>
    </View>
  );
}

function useTooltip() {
  const [key, setKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const show = (k: string) => {
    setKey(k);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setKey(null), 1500);
  };
  return { key, show };
}

/* ───────────── iOS: cam kapsül ───────────── */

function IOSBar(props: Props) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const n = props.state.routes.length;
  const item = w > 0 ? (w - T.ios.paddingH * 2) / n : 0;
  const x = useSharedValue(0);
  const tip = useTooltip();

  useEffect(() => {
    if (!item) return;
    const to = T.ios.paddingH + props.state.index * item + (item - T.ios.lens.width) / 2;
    x.value = reduce ? to : withTiming(to, { duration: motion.duration.transition, easing: motion.easing.standard });
  }, [props.state.index, item, reduce, x]);
  const lensStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const glass = isLiquidGlassAvailable();
  const Surface = glass ? GlassView : BlurView;
  const surfaceProps = glass ? { glassEffectStyle: 'regular' as const, tintColor: T.ios.glassTint } : { tint: 'dark' as const, intensity: 60 };

  return (
    <View pointerEvents="box-none" style={[styles.iosWrap, { bottom: iosBottom(insets.bottom) }]}>
      <Surface {...surfaceProps} style={styles.iosPill} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
        {!glass && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: T.ios.fallbackFill }]} />}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.iosEdge]} />
        {item > 0 && <Animated.View pointerEvents="none" style={[styles.iosLens, lensStyle]} />}
        <View style={styles.row} accessibilityRole="tablist">
          {props.state.routes.map((r, i) => {
            const t = tabInfo(props, i);
            return (
              <Pressable key={r.key} onPress={t.onPress} onLongPress={() => { tip.show(r.key); t.onLongPress(); }}
                accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: t.focused }}
                style={({ pressed }) => [styles.iosItem, pressed && { transform: [{ scale: 0.92 }] }]}>
                <View>
                  <Glyph spec={t.spec} focused={t.focused} size={T.ios.icon} offColor={T.ios.iconOff} cutout={T.ios.cutout} ringOff="rgba(255,255,255,0.28)" />
                  {t.badge != null && <Badge value={t.badge} ios />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Surface>
      {/* kapsül overflow: hidden olduğu için etiket balonu dışarıda çizilir */}
      {tip.key != null && item > 0 && (() => {
        const i = props.state.routes.findIndex((r) => r.key === tip.key);
        return i < 0 ? null : (
          <View pointerEvents="none" style={[styles.tipSlot, { left: T.ios.paddingH + i * item + item / 2 - 80, width: 160 }]}>
            <Tooltip label={tabInfo(props, i).label} ios />
          </View>
        );
      })()}
    </View>
  );
}

/* ───────────── Android: Material 3 ───────────── */

function AndroidIndicator({ focused }: { focused: boolean }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    p.value = reduce ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, { duration: motion.duration.transition, easing: motion.easing.standard });
  }, [focused, reduce, p]);
  const st = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scaleX: 0.5 + 0.5 * p.value }] }));
  return <Animated.View pointerEvents="none" style={[styles.andIndicator, st]} />;
}

function AndroidBar(props: Props) {
  const insets = useSafeAreaInsets();
  const tip = useTooltip();
  return (
    <View style={[styles.andBar, { paddingBottom: insets.bottom, height: T.android.height + insets.bottom }]} accessibilityRole="tablist">
      {props.state.routes.map((r, i) => {
        const t = tabInfo(props, i);
        return (
          <Pressable key={r.key} onPress={t.onPress} onLongPress={() => { tip.show(r.key); t.onLongPress(); }}
            android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: true, radius: 32 }}
            accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: t.focused }} style={styles.andItem}>
            <AndroidIndicator focused={t.focused} />
            <View>
              <Glyph spec={t.spec} focused={t.focused} size={T.android.icon} offColor={T.android.iconOff} cutout={T.android.cutout} ringOff="rgba(255,255,255,0.18)" />
              {t.badge != null && <Badge value={t.badge} ios={false} />}
            </View>
            {tip.key === r.key && <Tooltip label={t.label} ios={false} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: T.ios.paddingH },
  iosWrap: { position: 'absolute', left: T.ios.side, right: T.ios.side },
  iosPill: { height: T.ios.height, borderRadius: T.ios.height / 2, overflow: 'hidden', boxShadow: T.ios.shadow },
  iosEdge: { borderRadius: T.ios.height / 2, boxShadow: T.ios.edge },
  iosLens: {
    position: 'absolute', left: 0, top: (T.ios.height - T.ios.lens.height) / 2, width: T.ios.lens.width, height: T.ios.lens.height,
    borderRadius: T.ios.lens.height / 2, backgroundColor: T.ios.lens.fill, boxShadow: T.ios.lens.edge,
  },
  iosItem: { flex: 1, height: T.ios.height, alignItems: 'center', justifyContent: 'center' },
  andBar: { flexDirection: 'row', backgroundColor: T.android.fill, paddingHorizontal: 8 },
  andItem: { flex: 1, height: T.android.height, alignItems: 'center', justifyContent: 'center' },
  andIndicator: {
    position: 'absolute', top: (T.android.height - T.android.indicator.height) / 2, width: T.android.indicator.width, height: T.android.indicator.height,
    borderRadius: T.android.indicator.height / 2, backgroundColor: T.android.indicator.fill,
  },
  badge: { position: 'absolute', backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.white, fontSize: 11, ...fontFor('700'), fontVariant: ['tabular-nums'] },
  tip: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  tipSlot: { position: 'absolute', bottom: T.ios.height + 8, alignItems: 'center' },
  tipIOS: { position: 'relative', height: 30, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.surface3, boxShadow: '0 8px 24px rgba(0,0,0,0.45)' },
  tipAndroid: { bottom: T.android.height - 4, height: 32, paddingHorizontal: 8, borderRadius: 4, backgroundColor: '#E6E1E5' },
  tipTextIOS: { color: colors.text, fontSize: 13, ...fontFor('600') },
  tipTextAndroid: { color: '#1C1B1F', fontSize: 12, ...fontFor('500') },
});
