import { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring, interpolate, Extrapolation,
} from 'react-native-reanimated';

import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTabBarCompact } from '../context/TabBarContext';
import { colors } from '../theme';

const ICONS = {
  index:   'home',
  games:   'game-controller',
  videos:  'play-circle',
  news:    'newspaper',
  library: 'library',
  profile: 'person',
};

const PAD = 6;
const PILL_W = 52;
const BAR_H = 58;      // etiketler kalkınca çubuk kısaldı
const RADIUS = BAR_H / 2;

// ─────────────────────────────────────────────────────────────────────────────
// Liquid Glass kullanılabilirliği — MODÜL DÜZEYİNDE bir kez hesaplanır.
// İki kontrol birden şart: bazı iOS 26 beta sürümlerinde API yok ve yalnızca
// isLiquidGlassAvailable'a güvenilirse uygulama çöküyor.
// ─────────────────────────────────────────────────────────────────────────────
const GLASS_OK = (() => {
  if (Platform.OS !== 'ios') return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
})();

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const [barW, setBarW] = useState(0);
  const reducedMotion = useReducedMotion();
  const compact = useTabBarCompact();

  // Kayan vurgu konumu
  const pos = useSharedValue(state.index);
  useEffect(() => {
    if (reducedMotion) pos.value = state.index;
    else pos.value = withSpring(state.index, { damping: 18, stiffness: 190 });
  }, [state.index, pos, reducedMotion]);

  const N = state.routes.length;
  const cellW = barW > 0 ? (barW - PAD * 2) / N : 0;

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: PAD + pos.value * cellW + (cellW - PILL_W) / 2 }],
  }), [cellW]);

  // Aşağı kaydırınca küçül, yukarı kaydırınca büyü.
  //
  // YALNIZCA transform kullanılıyor — iki sebeple:
  //  1. height/width animasyonu her karede yeniden yerleşim tetikler
  //  2. expo-glass-effect dokümanı GlassView'da veya EBEVEYNİNDE opacity<1
  //     kullanılmamasını söylüyor; opacity ile soldursaydık cam bozulurdu
  const barStyle = useAnimatedStyle(() => {
    if (reducedMotion || !compact) return {};
    const c = compact.value;
    return {
      transform: [
        { scale: interpolate(c, [0, 1], [1, 0.86], Extrapolation.CLAMP) },
        { translateY: interpolate(c, [0, 1], [0, 10], Extrapolation.CLAMP) },
      ],
    };
  }, [reducedMotion, compact]);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom || 10 }]}>
      <Animated.View
        style={[styles.bar, GLASS_OK ? styles.barGlass : styles.barSolid, barStyle]}
        onLayout={e => setBarW(e.nativeEvent.layout.width)}
      >
        {/* Cam katmanı içeriği SARMALAMAZ, arkasında durur — sekme öğeleri
            basılınca opacity uyguluyor ve bu camı bozardı. */}
        {GLASS_OK && (
          <GlassView
            style={[StyleSheet.absoluteFill, styles.glassLayer]}
            glassEffectStyle="regular"
            pointerEvents="none"
          />
        )}

        {cellW > 0 && <Animated.View style={[styles.pill, pillStyle]} />}

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const focused = state.index === index;
          const base = ICONS[route.name] || 'ellipse';

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              // Görünür etiket kalktı → VoiceOver'ın okuyacağı tek kaynak bu.
              // Etiketsiz bırakmak sekmeleri ekran okuyucuda anlamsız yapardı.
              accessibilityLabel={label}
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => [styles.item, pressed && { opacity: 0.55 }]}
              hitSlop={8}
            >
              <Ionicons
                name={focused ? base : `${base}-outline`}
                size={25}
                color={focused ? colors.accent : colors.text3}
              />
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    height: BAR_H,
    paddingHorizontal: PAD,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  // iOS 26+: arka planı cam veriyor, altına düz renk KOYULMAZ
  barGlass: { backgroundColor: 'transparent' },
  // iOS 26 öncesi ve Android: eski görünüm
  barSolid: {
    backgroundColor: 'rgba(18,21,27,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45,
        shadowRadius: 20,
      },
      android: { elevation: 18 },
    }),
  },
  glassLayer: { borderRadius: RADIUS },
  pill: {
    position: 'absolute',
    left: 0,
    top: (BAR_H - 42) / 2,
    width: PILL_W,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(232,36,43,0.16)',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
});
