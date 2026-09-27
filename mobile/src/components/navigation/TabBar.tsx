import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useSegments } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming, Extrapolation,
} from 'react-native-reanimated';
import { TabIcon, type TabIconName } from '../Icon';
import Avatar from '../Avatar';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useTabBarCompact, useTabBarHidden } from '../../context/TabBarContext';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { fontFor, motion, tabBar as T } from '../../theme/tokens';
import { tabGeometry } from '../../theme/tabGeometry';
import { aktifSekmeYaz, canliOlayKapat, useCubukSahibi } from '../../services/canliCubuk';
import { AramaDairesi, BildirimKapsulu, CUBUK_EGRI, CUBUK_SURE, CubukYuzey, SekmeIkonu } from './CanliCubuk';

export type TabSpec = { icon: TabIconName } | { avatarUri?: string; name?: string };
type Props = BottomTabBarProps & { tabs: Record<string, TabSpec> };

export function useTabBarInset(extra = 12) {
  const insets = useSafeAreaInsets();
  return tabGeometry(Platform.OS, insets.bottom, extra).contentInset;
}

// ─────────────────────────────────────────────────────────────────────────────
// CANLI ÇUBUK — sekme ekranlarındaki hâli (26 Eyl tasarımı)
//
// İki platformda da YÜZEN kapsül. iOS cam + kayan mercek; Android düz dolgu +
// gölge, Material göstergesi, seçili sekmede ikon yükselip etiket beliriyor.
//
// KAYDIRINCA DAİREYE İNER. Ekranların yazdığı `compact` değeri (TabBarContext)
// eskiden okunmuyordu; artık kapsülün genişliğini ve boyunu aktif sekmenin
// dairesine indiriyor, sağda arama dairesi beliriyor. Yukarı kaydırınca ya da
// daireye dokununca geri açılıyor. Sekme değişince her zaman açık başlar.
// ─────────────────────────────────────────────────────────────────────────────
export function GamerisenTabBar(props: Props) {
  const { colors, tabBar } = useDesignTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const hidden = useTabBarHidden();
  const compact = useTabBarCompact();
  const router = useRouter();
  const segments = useSegments();
  const { fontScale } = useWindowDimensions();
  const ios = Platform.OS === 'ios';
  const g = tabGeometry(Platform.OS, insets.bottom);
  const pad = ios ? T.ios.paddingH : 6;
  const config = ios ? tabBar.ios : tabBar.android;
  // Büyük yazıda (1,3× üstü) Android etiketi gizleniyor; ikon kalıyor, çubuk
  // yüksekliği sabit — liste alt dolgusu (tabGeometry) bozulmuyor.
  const etiketGoster = !ios && fontScale <= 1.3;

  // Sekme ekranlarından biri en üstteyken bu çubuk görünür: canlı olaylar
  // afiş yerine buradaki kapsülde çıkabilir.
  useCubukSahibi(segments[0] === '(tabs)');

  const aktifAd = props.state.routes[props.state.index]?.name;
  useEffect(() => { if (aktifAd) aktifSekmeYaz(aktifAd); }, [aktifAd]);
  // Yeni sekme liste başında açılıyor: çubuk da açık başlamalı.
  useEffect(() => { if (compact) compact.value = withTiming(0, { duration: 180 }); }, [props.state.index, compact]);

  const [width, setWidth] = useState(0);
  const [mini, setMini] = useState(false);
  useAnimatedReaction(
    () => (compact ? compact.value : 0) > 0.5,
    (v, onceki) => {
      if (v === onceki) return;
      runOnJS(setMini)(v);
      // Canlı olay kapsülü kaydırınca kapanıyor (tasarım): çubuğun biçim
      // değiştirmesi = kullanıcı kaydırdı. İlk ölçümde (onceki null) değil.
      if (onceki !== null) runOnJS(canliOlayKapat)();
    },
    [compact],
  );

  const [tooltip, setTooltip] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { setTooltip(null); }, [props.state.index]);
  const showLabel = (key: string) => {
    setTooltip(key);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTooltip(null), 1500);
  };

  const itemWidth = width ? (width - pad * 2) / props.state.routes.length : 0;
  const lensX = useSharedValue(0);
  // İlk yerleşim ANİMASYONSUZ: genişlik ölçülmeden hedef hesaplanamıyor ve
  // animasyonla yerleşseydi mercek her açılışta soldan kayarak girerdi.
  const lensPlaced = useRef(false);
  useEffect(() => {
    if (!itemWidth) return;
    const next = pad + props.state.index * itemWidth + (itemWidth - T.ios.lens.width) / 2;
    if (reduced || !lensPlaced.current) { lensX.value = next; lensPlaced.current = true; return; }
    lensX.value = withTiming(next, { duration: motion.duration.transition, easing: motion.easing.standard });
  }, [props.state.index, itemWidth, reduced, lensX, pad]);
  const lensStyle = useAnimatedStyle(() => ({ transform: [{ translateX: lensX.value }] }));

  // ── Basılı tut + kaydır: sekme tarama ──
  // iOS 26 sekme çubuğunun davranışı (Canlı Çubuk tasarımı): çubuğa 300 ms
  // basılı tutunca mercek parmağa yapışıyor, kaydırdıkça üstünden geçilen
  // sekmenin adı balonda çıkıyor ve her geçişte seçim titreşimi var;
  // bırakınca o sekmeye gidiliyor. Android'de mercek yok: gösterge gezilen
  // sekmeye geçiyor. Tek dokunuş ve kısa basış eskisi gibi Pressable'da —
  // jest etkinleşince RNGH onların dokunuşunu iptal ediyor.
  const sekmeSayisi = props.state.routes.length;
  const [tarama, setTarama] = useState<number | null>(null);
  const taramaRef = useRef<number | null>(null);
  const lensHedef = (i: number) => pad + i * itemWidth + (itemWidth - T.ios.lens.width) / 2;
  const taramaGuncelle = (i: number) => {
    if (taramaRef.current === i) return;
    if (taramaRef.current === null && timer.current) clearTimeout(timer.current);
    taramaRef.current = i;
    setTarama(i);
    setTooltip(props.state.routes[i]?.key ?? null);
    void Haptics.selectionAsync().catch(() => {});
  };
  const taramaBitir = (git: boolean) => {
    const i = taramaRef.current;
    if (i === null) return;
    taramaRef.current = null;
    setTarama(null);
    setTooltip(null);
    const route = props.state.routes[i];
    let hedef = props.state.index;
    if (git && route && i !== props.state.index) {
      const event = props.navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!event.defaultPrevented) { props.navigation.navigate(route.name, route.params); hedef = i; }
    }
    // Gidilmediyse (aynı sekme / engellendi) mercek yerine dönüyor; gidildiyse
    // indeks efekti de aynı hedefe götürüyor.
    lensX.value = reduced ? lensHedef(hedef) : withTiming(lensHedef(hedef), { duration: motion.duration.transition, easing: motion.easing.standard });
  };
  const lensSol = pad;
  const lensSag = width - pad - T.ios.lens.width;
  const tarayici = Gesture.Pan()
    .enabled(!mini && itemWidth > 0)
    .activateAfterLongPress(300)
    .onStart((e) => {
      if (ios) lensX.value = withTiming(Math.min(Math.max(e.x - T.ios.lens.width / 2, lensSol), lensSag), { duration: 120 });
      runOnJS(taramaGuncelle)(Math.min(sekmeSayisi - 1, Math.max(0, Math.floor((e.x - pad) / itemWidth))));
    })
    .onUpdate((e) => {
      if (ios) lensX.value = Math.min(Math.max(e.x - T.ios.lens.width / 2, lensSol), lensSag);
      runOnJS(taramaGuncelle)(Math.min(sekmeSayisi - 1, Math.max(0, Math.floor((e.x - pad) / itemWidth))));
    })
    .onEnd(() => { runOnJS(taramaBitir)(true); })
    .onFinalize((_e, basarili) => { if (!basarili) runOnJS(taramaBitir)(false); });

  // ── Aktif sekmeden BEKLEMEDEN sürükleme (Instagram / iOS 26) ──
  // Kullanıcı geri bildirimi (27 Eyl, TestFlight 59): 300 ms basılı tutma
  // şartı fark edilmiyordu, sekme değiştirmenin tek yolu dokunmak sanıldı.
  // Artık aktif sekmenin (merceğin) ÜSTÜNDEN başlayan yatay sürükleme hemen
  // etkinleşiyor. Aktif sekmenin üstünde ayrı, saydam bir tutamaç var;
  // kısa dokunuş orada da eskisi gibi başa sarıyor (tabPress), uzun basış
  // adı gösteriyor. Diğer sekmelerde davranış değişmedi.
  const aktifSol = pad + props.state.index * itemWidth;
  const aktifeDokun = () => {
    const route = props.state.routes[props.state.index];
    if (route) props.navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
  };
  const aktifUzun = () => {
    const route = props.state.routes[props.state.index];
    if (!route) return;
    showLabel(route.key);
    props.navigation.emit({ type: 'tabLongPress', target: route.key });
  };
  const aktifSurukle = Gesture.Pan()
    .enabled(!mini && itemWidth > 0)
    .activeOffsetX([-6, 6])
    .failOffsetY([-16, 16])
    .onStart((e) => {
      const x = aktifSol + e.x;
      if (ios) lensX.value = Math.min(Math.max(x - T.ios.lens.width / 2, lensSol), lensSag);
      runOnJS(taramaGuncelle)(Math.min(sekmeSayisi - 1, Math.max(0, Math.floor((x - pad) / itemWidth))));
    })
    .onUpdate((e) => {
      const x = aktifSol + e.x;
      if (ios) lensX.value = Math.min(Math.max(x - T.ios.lens.width / 2, lensSol), lensSag);
      runOnJS(taramaGuncelle)(Math.min(sekmeSayisi - 1, Math.max(0, Math.floor((x - pad) / itemWidth))));
    })
    .onEnd(() => { runOnJS(taramaBitir)(true); })
    .onFinalize((_e, basarili) => { if (!basarili) runOnJS(taramaBitir)(false); });
  const aktifTutamac = Gesture.Race(
    aktifSurukle,
    Gesture.LongPress().minDuration(500).onStart(() => { runOnJS(aktifUzun)(); }),
    Gesture.Tap().maxDuration(400).onEnd((_e, basarili) => { if (basarili) runOnJS(aktifeDokun)(); }),
  );

  // ── Daralma morfu ──
  // Kapsül sola yaslı küçülüyor: genişlik tam boy → daire, boy 62/64 → 52/56.
  // Sekmeler ilk %40'ta sönüyor, daire ikonu son yarıda beliriyor; ikisi aynı
  // anda görünmüyor. Hareketi Azalt'ta yalnız sönme (boyut atlıyor).
  const kapsulStil = useAnimatedStyle(() => {
    const c = compact ? compact.value : 0;
    const k = reduced ? (c > 0.5 ? 1 : 0) : c;
    const h = interpolate(k, [0, 1], [g.height, g.mini]);
    return {
      width: width ? interpolate(k, [0, 1], [width, g.mini]) : '100%',
      height: h,
      borderRadius: h / 2,
    };
  }, [width, g.height, g.mini, reduced]);
  const sekmelerStil = useAnimatedStyle(() => ({
    opacity: interpolate(compact ? compact.value : 0, [0, 0.4], [1, 0], Extrapolation.CLAMP),
  }));
  const daireStil = useAnimatedStyle(() => ({
    opacity: interpolate(compact ? compact.value : 0, [0.5, 1], [0, 1], Extrapolation.CLAMP),
  }));
  const aramaStil = useAnimatedStyle(() => {
    const c = compact ? compact.value : 0;
    return {
      opacity: interpolate(c, [0.4, 1], [0, 1], Extrapolation.CLAMP),
      transform: [{ scale: reduced ? 1 : interpolate(c, [0, 1], [0.85, 1]) }],
    };
  }, [reduced]);

  // Cam her zaman opaklık 1'de kalmalı (yerli cam böyle istiyor): gizleme
  // öteleme ile, sönme ile değil.
  const visibility = useAnimatedStyle(() => ({ transform: [{ translateY: (hidden?.value ?? 0) * (g.occupied + 60) }] }));

  const ac = () => { if (compact) compact.value = withTiming(0, { duration: CUBUK_SURE }); };

  const buttons = props.state.routes.map((route, index) => {
    const focused = props.state.index === index;
    // Görsel vurgu taramada parmağın altındaki sekmede; erişilebilirlik durumu
    // ve basış mantığı gerçek odakta kalıyor.
    const vurgulu = (tarama ?? props.state.index) === index;
    const options = props.descriptors[route.key].options;
    const label = options.tabBarAccessibilityLabel ?? options.title ?? route.name;
    const badge = options.tabBarBadge;
    const spec = props.tabs[route.name];
    const icon = spec && 'icon' in spec
      ? <TabIcon name={spec.icon} active={vurgulu} color={vurgulu ? colors.red : config.iconOff} size={config.icon} cutout={config.cutout} />
      : <Avatar avatar={spec && 'avatarUri' in spec ? spec.avatarUri : undefined}
          name={spec && 'name' in spec ? spec.name : label} size={ios ? 28 : 24}
          style={{ borderWidth: 2, borderColor: vurgulu ? colors.red : colors.lineStrong }} />;
    const rozet = badge != null && badge !== 0 ? (
      <View pointerEvents="none" style={[styles.badge, { backgroundColor: colors.brand,
        minWidth: config.badge.size, height: config.badge.size, borderRadius: config.badge.size,
        top: config.badge.top, left: config.badge.left,
        ...(ios ? { boxShadow: `0 0 0 2px ${tabBar.ios.badge.ring}` } : {}) }]}>
        <Text allowFontScaling={false} style={[styles.badgeText, { color: colors.white }]}>{typeof badge === 'number' && badge > 99 ? '99+' : badge}</Text>
      </View>
    ) : null;
    return (
      <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={label}
        accessibilityState={{ selected: focused }} testID={`tab-${route.name}`}
        onPress={() => {
          const event = props.navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (event.defaultPrevented || focused) return;
          // Dokunsal geri bildirim SEÇİM DEĞİŞİNCE (DS7). Odaktaki sekmeye
          // tekrar basmak başa sarma; eski çubukta da titreşmiyordu.
          void Haptics.selectionAsync().catch(() => {});
          props.navigation.navigate(route.name, route.params);
        }}
        onLongPress={() => { showLabel(route.key); props.navigation.emit({ type: 'tabLongPress', target: route.key }); }}
        android_ripple={ios ? undefined : { color: colors.pillNeutral, borderless: true, radius: 32 }}
        style={({ pressed }) => [styles.item, { height: g.height }, pressed && ios && styles.pressed]}>
        {ios
          ? <View>{icon}{rozet}</View>
          : <AndroidSekme focused={vurgulu} reduced={reduced} fill={tabBar.android.indicator.fill}
              label={etiketGoster ? String(options.title ?? label) : null} labelColor={colors.text}>
              <View>{icon}{rozet}</View>
            </AndroidSekme>}
      </Pressable>
    );
  });

  const selectedTip = props.state.routes.findIndex((r) => r.key === tooltip);
  const tipOptions = selectedTip >= 0 ? props.descriptors[props.state.routes[selectedTip].key].options : null;
  // Balon sekmenin ortasına hizalanıyor ama EKRANDAN TAŞMIYOR: kenardaki
  // sekmelerde ortalanmış 140 pt'lik balon ekranın dışına çıkıyordu.
  const tipCenter = pad + selectedTip * itemWidth + itemWidth / 2;
  const tipLeft = Math.min(Math.max(tipCenter - TIP_W / 2, TIP_MARGIN - g.side), width - TIP_W - TIP_MARGIN + g.side);
  return (
    <>
      <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, visibility]}>
        <BildirimKapsulu alt={g.bottom + (mini ? g.mini : g.height) + 8} />
      </Animated.View>
      <Animated.View pointerEvents="box-none"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.wrap, { left: g.side, right: g.side, bottom: g.bottom, height: g.height }, visibility]}>
        <CubukYuzey radius={g.height / 2} style={[styles.kapsul, kapsulStil]}>
          {ios && itemWidth > 0 && (
            <Animated.View pointerEvents="none" style={[styles.lensWrap, sekmelerStil]}>
              <Animated.View style={[styles.lens, { backgroundColor: tabBar.ios.lens.fill, boxShadow: tabBar.ios.lens.edge }, lensStyle]} />
            </Animated.View>
          )}
          <GestureDetector gesture={tarayici}>
            <Animated.View accessibilityRole="tablist" pointerEvents={mini ? 'none' : 'auto'}
              style={[styles.row, { width: width || undefined, paddingHorizontal: pad }, sekmelerStil]}>
              {buttons}
            </Animated.View>
          </GestureDetector>
          {/* Aktif sekmenin tutamacı — satırın KARDEŞİ (çocuğu değil): satırın
              uzun-bas jesti buradan başlayan dokunuşu görmüyor, çakışma yok.
              Erişilebilirlik ağacında yok: VoiceOver alttaki sekmeyi etkinleştiriyor. */}
          {!mini && itemWidth > 0 ? (
            <GestureDetector gesture={aktifTutamac}>
              <View accessible={false} importantForAccessibility="no-hide-descendants"
                style={[styles.tutamac, { left: aktifSol, width: itemWidth }]} />
            </GestureDetector>
          ) : null}
          <Animated.View pointerEvents={mini ? 'auto' : 'none'} style={[styles.daire, { width: g.mini, height: g.mini }, daireStil]}>
            <Pressable accessibilityRole="button" accessibilityLabel={String(props.descriptors[props.state.routes[props.state.index].key].options.title ?? '')}
              onPress={ac} style={StyleSheet.absoluteFill}>
              <SekmeIkonu sekme={aktifAd || 'index'} />
            </Pressable>
          </Animated.View>
        </CubukYuzey>
        <Animated.View pointerEvents={mini ? 'box-none' : 'none'} style={[styles.arama, aramaStil]}>
          <AramaDairesi onPress={() => router.push('/games')} />
        </Animated.View>
        {tooltip && itemWidth > 0 && selectedTip >= 0 && (
          <View pointerEvents="none" style={[styles.tooltip, {
            left: tipLeft, bottom: g.height + 8, backgroundColor: colors.surface3,
          }]}>
            <Text allowFontScaling={false} numberOfLines={1} style={[styles.tooltipText, { color: colors.text }]}>{tipOptions?.tabBarAccessibilityLabel ?? tipOptions?.title}</Text>
          </View>
        )}
      </Animated.View>
    </>
  );
}

/**
 * Android sekmesi: gösterge (56×32) seçilince ölçeklenerek belirir, ikon onunla
 * birlikte 9 pt yukarı çıkar, etiket altından söner. Material vurgulu eğri.
 */
function AndroidSekme({ focused, reduced, fill, label, labelColor, children }: {
  focused: boolean; reduced: boolean; fill: string; label: string | null; labelColor: string; children: React.ReactNode;
}) {
  const progress = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    progress.value = reduced ? Number(focused) : withTiming(Number(focused), { duration: CUBUK_SURE, easing: CUBUK_EGRI });
  }, [focused, reduced, progress]);
  const gosterge = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scaleX: 0.5 + progress.value * 0.5 }] }));
  // Etiket yoksa (büyük yazı) ikon yerinde kalıyor, gösterge onu ortalıyor.
  const kalk = label ? T.android.iconLift : 0;
  const ikon = useAnimatedStyle(() => ({ transform: [{ translateY: -kalk * progress.value }] }), [kalk]);
  const etiket = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.indicator, { backgroundColor: fill, top: label ? T.android.indicator.top : (T.android.height - T.android.indicator.height) / 2 }, gosterge]} />
      <Animated.View style={ikon}>{children}</Animated.View>
      {label ? (
        <Animated.Text allowFontScaling={false} numberOfLines={1} style={[styles.etiket, { color: labelColor }, etiket]}>{label}</Animated.Text>
      ) : null}
    </>
  );
}

const TIP_W = 140;
const TIP_MARGIN = 8;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', justifyContent: 'flex-end' },
  kapsul: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row', position: 'absolute', left: 0, bottom: 0, top: 0 },
  tutamac: { position: 'absolute', top: 0, bottom: 0 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' }, pressed: { transform: [{ scale: 0.92 }] },
  lensWrap: { ...StyleSheet.absoluteFillObject },
  lens: { position: 'absolute', top: (T.ios.height - T.ios.lens.height) / 2,
    width: T.ios.lens.width, height: T.ios.lens.height, borderRadius: T.ios.lens.height / 2 },
  daire: { position: 'absolute', left: 0, bottom: 0 },
  arama: { position: 'absolute', right: 0, bottom: 0 },
  indicator: { position: 'absolute', width: T.android.indicator.width, height: T.android.indicator.height,
    borderRadius: T.android.indicator.height / 2 },
  etiket: { position: 'absolute', left: 0, right: 0, top: T.android.labelTop, textAlign: 'center', fontSize: 11, ...fontFor('600') },
  badge: { position: 'absolute', paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, ...fontFor('700'), fontVariant: ['tabular-nums'] },
  tooltip: { position: 'absolute', width: TIP_W, paddingHorizontal: 8, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tooltipText: { fontSize: 13, ...fontFor('600') },
});
