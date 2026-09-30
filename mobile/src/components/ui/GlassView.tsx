import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { blur } from '../../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// GÖRSEL ÜSTÜ CAM — kit'teki DARKGLASS: rgba(0,0,0,.42) + blur(16px).
//
// TEMA BAĞIMSIZ: zemin temanın yüzeyi değil, oyun görseli. Açık temada da
// koyu cam üstünde beyaz ikon okunuyor; tema rengine bağlansaydı açık temada
// beyaz görselin üstünde beyaz daire çıkardı.
//
// `blurred={false}` KAYDIRILAN LİSTELER İÇİN: tasarım her GameCard kalbini ve
// her VideoCard oynat düğmesini cam çiziyor. Rayda çizilen her kart için ayrı
// bir canlı bulanıklık demek (plan §6.1). Aynı renk, bulanıklıksız — koyu
// görsel üstünde fark küçük. Gerçek bulanıklık sabit yüzeylerde kalıyor.
//
// Android'de expo-blur deneysel yöntem verilmezse yarı saydam dolgu çiziyor;
// yani orada iki mod görsel olarak neredeyse aynı ve ikisi de ucuz.
// ─────────────────────────────────────────────────────────────────────────────
export function GlassView({ blurred = true, style, children, ...rest }: ViewProps & { blurred?: boolean }) {
  return (
    <View {...rest} style={[styles.base, style]}>
      {blurred && <BlurView pointerEvents="none" tint={blur.glass.tint} intensity={blur.glass.intensity} style={StyleSheet.absoluteFill} />}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: blur.glass.overlay }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ base: { overflow: 'hidden' } });
