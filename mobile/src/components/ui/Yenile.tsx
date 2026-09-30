// ─────────────────────────────────────────────────────────────────────────────
// YENİLEMEK İÇİN ÇEK — Gamerisen işareti (G-DS-4 hareket panosu, 27 Eyl)
//
// Kit (design/kit/ds.py → "Yenilemek için çek"): "Marka işareti yükleme
// göstergesine dönüşür; logo şevronları sırayla yanar." İki parça (R ve G)
// 0,8 sn döngüde opaklık .3 ↔ 1; R, G'den yarım tur (0,4 sn) geride.
//
// NASIL. Sistem göstergesinin içine başka bir şey çizilemiyor. iOS'ta
// UIRefreshControl ŞEFFAF bırakılıyor (`YenileKontrol`), işaret listenin
// başlığına NEGATİF konumla konuyor (`YenileIsareti`): çekince içerik aşağı
// kayıp üstteki boşluğu açıyor ve işaret parmakla birlikte iniyor —
// ilerleme ölçmeye, her ekranın onScroll'unu karıştırmaya gerek yok.
// Yenilenirken iOS içeriği ~60 pt aşağıda tutuyor; işaret tam o boşlukta.
//
// ANDROID'DE sistem halkası kalıyor, marka renklerinde: SwipeRefreshLayout
// içeriği kaydırmıyor ve RN çekme ilerlemesini JS'e vermiyor; halkayı
// gizlemek çekerken HİÇ geri bildirim bırakmazdı.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect } from 'react';
import { Platform, RefreshControl, StyleSheet, View, type RefreshControlProps } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { R_PATH, G_PATH, VIEWBOX } from '../brand/Logo';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { colors as sabit } from '../../theme/tokens';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const IOS = Platform.OS === 'ios';
/** iOS'un yenilerken tuttuğu boşluk (UIRefreshControl ≈ 60 pt). */
const ALAN = 60;
/** Fazla çekmede de sistem göstergesini örtsün diye panelin üst payı. */
const ORTU = 400;
const BOY = 34; // kit: mark(34)

/** Listenin `refreshControl`'ü: iOS'ta şeffaf, Android'de marka renkli halka. */
export function YenileKontrol(props: RefreshControlProps) {
  const { colors } = useDesignTheme();
  return IOS
    // tintColor iOS 26'da UYGULANMIYOR (27 Eyl, simülatör kaydı: şeffaf, alfa
    // 1/255 ve zemin rengi denendi, üçünde de varsayılan gri çizildi). Sistem
    // göstergesi içeriğin ARKASINDA çiziliyor; YenileIsareti'nin opak paneli
    // onu örtüyor. Renk yine veriliyor: düzeltilen bir iOS'ta ikinci kat güvence.
    ? <RefreshControl {...props} tintColor={colors.bg} title="" />
    : <RefreshControl {...props} colors={[colors.red]} progressBackgroundColor={colors.surface1} />;
}

/**
 * Liste başlığının İLK çocuğu olarak konur (yüksekliği yok). iOS'ta çekince
 * açılan boşlukta görünür; yenilenirken şevronlar sırayla yanar.
 */
export function YenileIsareti({ yenileniyor, zemin }: {
  yenileniyor: boolean;
  /** Ekranın gerçek zemini — panel onunla aynı olmalı. Varsayılan 2.0 bg;
   *  eski paletteki ekranlar (profil) kendi zeminini verir. */
  zemin?: string;
}) {
  const { isDark, colors } = useDesignTheme();
  const azalt = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (!IOS) return;
    if (yenileniyor && !azalt) {
      t.value = 0;
      t.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.linear }), -1, false);
    } else {
      cancelAnimation(t);
      t.value = 0;
    }
  }, [yenileniyor, azalt, t]);

  // Kit @keyframes gr-ch: 0% .3 · 50% 1 · 100% .3 — üçgen dalga.
  // Çekerken (yenilenmiyorken) işaret sakin ve tam görünür.
  const g = useAnimatedStyle(() => {
    if (!yenileniyor || azalt) return { opacity: 1 };
    return { opacity: 0.3 + 0.7 * (1 - Math.abs(2 * t.value - 1)) };
  }, [yenileniyor, azalt]);
  const r = useAnimatedStyle(() => {
    if (!yenileniyor || azalt) return { opacity: 1 };
    const f = (t.value + 0.5) % 1;
    return { opacity: 0.3 + 0.7 * (1 - Math.abs(2 * f - 1)) };
  }, [yenileniyor, azalt]);

  if (!IOS) return null;
  return (
    <View pointerEvents="none" style={[styles.alan, { backgroundColor: zemin ?? colors.bg }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.isaret}>
        <Animated.View style={[StyleSheet.absoluteFill, r]}>
          <Svg width={BOY} height={BOY} viewBox={VIEWBOX}>
            <Path d={R_PATH} fill={isDark ? sabit.logoROnDark : sabit.logoROnLight} fillRule="evenodd" />
          </Svg>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, g]}>
          <Svg width={BOY} height={BOY} viewBox={VIEWBOX}>
            <Path d={G_PATH} fill={sabit.brand} fillRule="evenodd" />
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Opak panel içeriğin üstünde, çekince açılan bütün boşluğu kaplıyor;
  // işaret panelin ALT 60 pt'sinin ortasında. Yatay taşma: liste yan payı
  // olan ekranlarda da kenardan kenara örtsün.
  alan: { position: 'absolute', left: -100, right: -100, top: -(ALAN + ORTU), height: ALAN + ORTU,
    alignItems: 'center', justifyContent: 'flex-end', paddingBottom: (ALAN - BOY) / 2 },
  isaret: { width: BOY, height: BOY },
});
