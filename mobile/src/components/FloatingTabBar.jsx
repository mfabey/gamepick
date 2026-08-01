import { useEffect, useRef, useState } from 'react';
import { View, Pressable, Text, StyleSheet, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { colors, type } from '../theme';

const ICONS = {
  index:   'home',
  games:   'game-controller',
  news:    'newspaper',
  library: 'library',
  profile: 'person',
};

const PAD = 4;      // bar iç yatay padding
const PILL_W = 46;  // kayan vurgu genişliği
const RADIUS = 26;

// ─────────────────────────────────────────────────────────────────────────────
// Liquid Glass kullanılabilirliği — MODÜL DÜZEYİNDE bir kez hesaplanır.
//
// İKİ kontrol birden şart:
//   • isLiquidGlassAvailable()   → sistem + derleyici + Info.plist uygun mu
//   • isGlassEffectAPIAvailable() → API çalışma anında GERÇEKTEN var mı
// İkincisi olmadan bazı iOS 26 beta sürümlerinde uygulama ÇÖKÜYOR
// (expo-glass-effect dokümanında açıkça belirtiliyor).
//
// iOS 26 altında ve Android'de otomatik olarak eski görünüme düşüyoruz.
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
  const anim = useRef(new Animated.Value(state.index)).current;

  // Aktif sekme değişince vurgu yumuşakça kayar
  useEffect(() => {
    Animated.spring(anim, {
      toValue: state.index,
      useNativeDriver: true,
      speed: 18,
      bounciness: 9,
    }).start();
  }, [state.index, anim]);

  const N = state.routes.length;
  const cellW = barW > 0 ? (barW - PAD * 2) / N : 0;
  const inputRange = state.routes.map((_, i) => i);

  const pillTranslate = cellW
    ? anim.interpolate({
        inputRange,
        outputRange: state.routes.map((_, i) => PAD + i * cellW + (cellW - PILL_W) / 2),
      })
    : 0;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom || 10 }]}>
      <View
        style={[styles.bar, GLASS_OK ? styles.barGlass : styles.barSolid]}
        onLayout={e => setBarW(e.nativeEvent.layout.width)}
      >
        {/* Cam katmanı içeriği SARMALAMAZ, arkasında durur.
            Dokümantasyon GlassView'ın kendisinde veya EBEVEYNİNDE opacity<1
            kullanılmamasını söylüyor; sekme öğeleri basılınca opacity
            uyguluyor, bu yüzden cam kardeş katman olarak ayrıldı. */}
        {GLASS_OK && (
          <GlassView
            style={[StyleSheet.absoluteFill, styles.glassLayer]}
            glassEffectStyle="regular"
            pointerEvents="none"
          />
        )}

        {/* Kayan vurgu */}
        {cellW > 0 && (
          <Animated.View style={[styles.pill, { transform: [{ translateX: pillTranslate }] }]} />
        )}

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const focused = state.index === index;
          const base = ICONS[route.name] || 'ellipse';
          const iconName = focused ? base : `${base}-outline`;

          // Aktif ikon vurgu gelirken hafifçe büyür
          const scale = cellW
            ? anim.interpolate({
                inputRange: [index - 1, index, index + 1],
                outputRange: [1, 1.16, 1],
                extrapolate: 'clamp',
              })
            : 1;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => [styles.item, pressed && { opacity: 0.55 }]}
              hitSlop={8}
            >
              <Animated.View style={[styles.iconWrap, { transform: [{ scale }] }]}>
                <Ionicons name={iconName} size={22} color={focused ? colors.accent : colors.text3} />
              </Animated.View>
              <Text style={[styles.label, { color: focused ? colors.accentText : colors.text3 }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
    height: 62,
    paddingHorizontal: PAD,
    borderRadius: RADIUS,
    // Cam katmanı köşelerden taşmasın
    overflow: 'hidden',
  },
  // iOS 26+: arka planı cam veriyor, altına düz renk KOYULMAZ —
  // koyulursa cam efekti görünmez.
  barGlass: {
    backgroundColor: 'transparent',
  },
  // iOS 26 öncesi ve Android: eski görünüm aynen korunur
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
    top: 7,
    width: PILL_W,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(232,36,43,0.16)',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  iconWrap: {
    width: 38,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: type.caption2,
    fontWeight: '700',
  },
});
