import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TabIcon, type TabIconName } from '../Icon';
import Avatar from '../Avatar';
import { GLASS_OK } from '../GlassSurface';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useTabBarHidden } from '../../context/TabBarContext';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { fontFor, motion, tabBar as T } from '../../theme/tokens';
import { tabGeometry } from '../../theme/tabGeometry';

export type TabSpec = { icon: TabIconName } | { avatarUri?: string; name?: string };
type Props = BottomTabBarProps & { tabs: Record<string, TabSpec> };

export function useTabBarInset(extra = 12) {
  const insets = useSafeAreaInsets();
  return tabGeometry(Platform.OS, insets.bottom, extra).contentInset;
}

export function GamerisenTabBar(props: Props) {
  const { colors, tabBar, isDark } = useDesignTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const hidden = useTabBarHidden();
  const ios = Platform.OS === 'ios';
  const geometry = tabGeometry(Platform.OS, insets.bottom);
  const [width, setWidth] = useState(0);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { setTooltip(null); }, [props.state.index]);
  const showLabel = (key: string) => {
    setTooltip(key);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTooltip(null), 1500);
  };
  const itemWidth = width ? (width - (ios ? T.ios.paddingH * 2 : 16)) / props.state.routes.length : 0;
  const lensX = useSharedValue(0);
  // İlk yerleşim ANİMASYONSUZ: genişlik ölçülmeden hedef hesaplanamıyor ve
  // animasyonla yerleşseydi mercek her açılışta soldan kayarak girerdi.
  const lensPlaced = useRef(false);
  useEffect(() => {
    if (!itemWidth) return;
    const next = T.ios.paddingH + props.state.index * itemWidth + (itemWidth - T.ios.lens.width) / 2;
    if (reduced || !lensPlaced.current) { lensX.value = next; lensPlaced.current = true; return; }
    lensX.value = withTiming(next, { duration: motion.duration.transition, easing: motion.easing.standard });
  }, [props.state.index, itemWidth, reduced, lensX]);
  const lensStyle = useAnimatedStyle(() => ({ transform: [{ translateX: lensX.value }] }));
  // Translate glass, never fade its ancestor (native glass requires opacity 1).
  const visibility = useAnimatedStyle(() => ({ transform: [{ translateY: (hidden?.value ?? 0) * (geometry.occupied + 60) }] }));
  const config = ios ? tabBar.ios : tabBar.android;

  const buttons = props.state.routes.map((route, index) => {
    const focused = props.state.index === index;
    const options = props.descriptors[route.key].options;
    const label = options.tabBarAccessibilityLabel ?? options.title ?? route.name;
    const badge = options.tabBarBadge;
    const spec = props.tabs[route.name];
    return (
      <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={label}
        accessibilityState={{ selected: focused }} testID={`tab-${route.name}`}
        onPress={() => {
          const event = props.navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (event.defaultPrevented || focused) return;
          // Dokunsal geri bildirim SEÇİM DEĞİŞİNCE (DS7). Odaktaki sekmeye
          // tekrar basmak başa sarma; eski çubukta da titreşmiyordu.
          if (ios) void Haptics.selectionAsync().catch(() => {});
          props.navigation.navigate(route.name, route.params);
        }}
        onLongPress={() => { showLabel(route.key); props.navigation.emit({ type: 'tabLongPress', target: route.key }); }}
        android_ripple={ios ? undefined : { color: colors.pillNeutral, borderless: true, radius: 32 }}
        style={({ pressed }) => [styles.item, { height: geometry.height }, pressed && ios && styles.pressed]}>
        {!ios && <AndroidIndicator focused={focused} reduced={reduced} fill={tabBar.android.indicator.fill} />}
        <View>
          {spec && 'icon' in spec
            ? <TabIcon name={spec.icon} active={focused} color={focused ? colors.red : config.iconOff} size={config.icon} cutout={config.cutout} />
            : <Avatar avatar={spec && 'avatarUri' in spec ? spec.avatarUri : undefined}
                name={spec && 'name' in spec ? spec.name : label} size={ios ? 28 : 24}
                style={{ borderWidth: 2, borderColor: focused ? colors.red : colors.lineStrong }} />}
          {badge != null && badge !== 0 && (
            <View pointerEvents="none" style={[styles.badge, { backgroundColor: colors.brand,
              minWidth: config.badge.size, height: config.badge.size, borderRadius: config.badge.size,
              top: config.badge.top, left: config.badge.left,
              ...(ios ? { boxShadow: `0 0 0 2px ${tabBar.ios.badge.ring}` } : {}) }]}>
              <Text allowFontScaling={false} style={[styles.badgeText, { color: colors.white }]}>{typeof badge === 'number' && badge > 99 ? '99+' : badge}</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  });

  const selectedTip = props.state.routes.findIndex((r) => r.key === tooltip);
  const tipOptions = selectedTip >= 0 ? props.descriptors[props.state.routes[selectedTip].key].options : null;
  // Balon sekmenin ortasına hizalanıyor ama EKRANDAN TAŞMIYOR: kenardaki
  // sekmelerde ortalanmış 140 pt'lik balon ekranın dışına çıkıyordu.
  // Sınırlar sarmalayıcıya göre; iOS'ta sarmalayıcı ekran kenarından 20 içeride.
  const edge = ios ? T.ios.side : 0;
  const tipCenter = (ios ? T.ios.paddingH : 8) + selectedTip * itemWidth + itemWidth / 2;
  const tipLeft = Math.min(Math.max(tipCenter - TIP_W / 2, TIP_MARGIN - edge), width - TIP_W - TIP_MARGIN + edge);
  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, ios ? { left: T.ios.side, right: T.ios.side, bottom: geometry.bottom } : styles.androidWrap, visibility]}>
      {/* GÖLGE AYRI KATMANDA: kapsül köşeyi kırpmak için overflow:hidden
          taşıyor ve iOS bunu clipsToBounds'a çeviriyor; aynı katmandaki
          gölge kırpılıyordu (eski FloatingTabBar'ın ölçülmüş notu). */}
      <View style={ios ? [styles.pillShadow, { boxShadow: tabBar.ios.shadow }] : undefined}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={[
        ios ? styles.pill : styles.androidBar,
        ios ? null : { backgroundColor: tabBar.android.fill, paddingBottom: insets.bottom },
      ]}>
        {ios && (GLASS_OK
          ? <GlassView pointerEvents="none" glassEffectStyle="regular" tintColor={tabBar.ios.glassTint} style={StyleSheet.absoluteFill} />
          : <><BlurView pointerEvents="none" tint={isDark ? 'dark' : 'light'} intensity={60} style={StyleSheet.absoluteFill} />
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tabBar.ios.fallbackFill }]} /></>)}
        {ios && <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.edge, { boxShadow: tabBar.ios.edge }]} />}
        {ios && itemWidth > 0 && <Animated.View pointerEvents="none" style={[styles.lens, { backgroundColor: tabBar.ios.lens.fill, boxShadow: tabBar.ios.lens.edge }, lensStyle]} />}
        <View accessibilityRole="tablist" style={[styles.row, { paddingHorizontal: ios ? T.ios.paddingH : 8 }]}>{buttons}</View>
      </View>
      </View>
      {tooltip && itemWidth > 0 && selectedTip >= 0 && (
        <View pointerEvents="none" style={[styles.tooltip, {
          left: tipLeft,
          bottom: geometry.height + (ios ? 8 : insets.bottom + 8), backgroundColor: colors.surface3,
        }]}>
          <Text allowFontScaling={false} numberOfLines={1} style={[styles.tooltipText, { color: colors.text }]}>{tipOptions?.tabBarAccessibilityLabel ?? tipOptions?.title}</Text>
        </View>
      )}
    </Animated.View>
  );
}

function AndroidIndicator({ focused, reduced, fill }: { focused: boolean; reduced: boolean; fill: string }) {
  const progress = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    progress.value = reduced ? Number(focused) : withTiming(Number(focused), { duration: motion.duration.transition, easing: motion.easing.standard });
  }, [focused, reduced, progress]);
  const style = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scaleX: 0.5 + progress.value * 0.5 }] }));
  return <Animated.View pointerEvents="none" style={[styles.indicator, { backgroundColor: fill }, style]} />;
}

const TIP_W = 140;
const TIP_MARGIN = 8;

const styles = StyleSheet.create({
  wrap: { position: 'absolute' }, androidWrap: { left: 0, right: 0, bottom: 0 },
  pillShadow: { borderRadius: T.ios.height / 2 },
  pill: { height: T.ios.height, borderRadius: T.ios.height / 2, overflow: 'hidden' },
  androidBar: { width: '100%' }, row: { flexDirection: 'row' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' }, pressed: { transform: [{ scale: 0.92 }] },
  edge: { borderRadius: T.ios.height / 2 },
  lens: { position: 'absolute', top: (T.ios.height - T.ios.lens.height) / 2,
    width: T.ios.lens.width, height: T.ios.lens.height, borderRadius: T.ios.lens.height / 2 },
  indicator: { position: 'absolute', width: T.android.indicator.width, height: T.android.indicator.height,
    borderRadius: T.android.indicator.height / 2 },
  badge: { position: 'absolute', paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, ...fontFor('700'), fontVariant: ['tabular-nums'] },
  tooltip: { position: 'absolute', width: TIP_W, paddingHorizontal: 8, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tooltipText: { fontSize: 13, ...fontFor('600') },
});
