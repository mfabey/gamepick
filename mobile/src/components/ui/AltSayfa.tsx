// ─────────────────────────────────────────────────────────────────────────────
// ALT SAYFA — G-DS-4 "Bottom Sheet" (27 Eyl, 2.0 alt sayfa geçişi)
//
// Kit (design/kit/ds.py): zemin rgba(0,0,0,.6) · sayfa bg2 · üst köşeler 24 ·
// gölge 0 -10 40 · tutamaç 36×5 · başlık satırı 40'lık görsel + 16/600 başlık
// + 13 alt yazı · içerik 14 köşeli gruplu liste. Hareket: 250 ms yukarı kayış,
// ZEMİN BİRLİKTE KARARIR, aşağı çekince kapanır.
//
// Eski alt sayfalar `Modal animationType="slide"` kullanıyordu: karartma da
// sayfayla birlikte aşağıdan kayıyordu (kitteki "zemin birlikte kararır"
// değil). Burada Modal hareketsiz; zemin söner, sayfa kayar — kapanışta da
// ters yönde (dışarıdan `visible=false` gelse bile önce animasyon oynar).
//
// Klavyeli sayfalar `klavye` ile KeyboardAvoidingView alıyor; tavan
// useAltSayfaSiniri'den (KAV içinde yüzde maxHeight yanlış çözülüyordu).
//
// EKRAN ODAĞI KAYBEDİNCE KAPANIR. Modal kökte çiziliyor; sayfa açıkken
// gelen bir derin bağlantı (bildirim) yeni ekranı Modal'ın ALTINDA açıyordu
// ve kullanıcı eski ekranın sayfasına bakakalıyordu (cihaz turu, 25 Eyl).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useContext, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContext } from '@react-navigation/native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Txt } from './Primitives';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { component as K, layout, radius, shadow, space } from '../../theme/tokens';
import { SHEET_LAYOUT } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useAltSayfaSiniri } from '../../hooks/useAltSayfaSiniri';
import { useLanguage } from '../../context/LanguageContext';

const SURE = 250;
const EGRI = Easing.bezier(0.2, 0.8, 0.2, 1);
const F = K.filterSheet;

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Modal tamamen kapandıktan sonra (native dismiss) çağrılan geri çağırma */
  onDismiss?: () => void;
  /** Başlık satırı (kit: 16/600). Verilmezse satır yok. */
  title?: string;
  subtitle?: string;
  /** Başlığın solundaki 40'lık görsel / avatar. */
  leading?: React.ReactNode;
  /** Başlığın sağı (ör. "Sıfırla"). */
  trailing?: React.ReactNode;
  /** Klavyeli sayfa: KeyboardAvoidingView + sayısal tavan. */
  klavye?: boolean;
  /** Ekranın en fazla bu oranı (varsayılan 0.82). */
  oran?: number;
  /** Sabit yükseklik oranı (ör. GIF ızgarası 0.68): içerik esner. */
  sabitOran?: number;
  /** Sayfanın altında kaydırmadan kalan alan (birincil düğme). */
  footer?: React.ReactNode;
  accessibilityLabel?: string;
  children?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

export function AltSayfa({ visible, onClose, onDismiss, title, subtitle, leading, trailing, klavye = false, oran = 0.82,
  sabitOran, footer, accessibilityLabel, children, contentStyle }: Props) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { height: ekranH } = useWindowDimensions();
  const azalt = useReducedMotion();
  const sinir = useAltSayfaSiniri(oran);

  // Barındıran ekran odağı kaybedince (başka ekrana gidildi) kapan. Gezinme
  // bağlamı dışında çizilen sayfada bağlam yok — o zaman dinleyici de yok.
  const gezinme = useContext(NavigationContext);
  const kapatRef = useRef(onClose);
  kapatRef.current = onClose;
  useEffect(() => {
    if (!visible || !gezinme) return undefined;
    return gezinme.addListener('blur', () => kapatRef.current());
  }, [visible, gezinme]);

  // Modal görünürlüğü prop'tan AYRI: kapanış animasyonu bitene kadar açık kalır.
  const [acik, setAcik] = useState(visible);
  const ilerleme = useSharedValue(0);   // 0 kapalı · 1 açık
  const surukle = useSharedValue(0);    // aşağı çekme (pt)

  useEffect(() => {
    if (visible) {
      setAcik(true);
      surukle.value = 0;
      ilerleme.value = azalt ? 1 : withTiming(1, { duration: SURE, easing: EGRI });
    } else if (acik) {
      if (azalt) { ilerleme.value = 0; setAcik(false); return; }
      ilerleme.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }, (bitti) => {
        if (bitti) runOnJS(setAcik)(false);
      });
    }
    // acik bilerek bağımlılık değil: yalnız `visible` değişimi tetikler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, azalt]);

  // Aşağı çekince kapanır (kit). Yalnız tutamaç + başlık bölgesinden:
  // içerikteki listelerin kendi kaydırmasıyla çakışmasın.
  const cek = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => { surukle.value = Math.max(0, e.translationY); })
    .onEnd((e) => {
      if (surukle.value > 90 || e.velocityY > 900) {
        runOnJS(onClose)();
      } else {
        surukle.value = withTiming(0, { duration: 180, easing: EGRI });
      }
    });

  const zemin = useAnimatedStyle(() => ({ opacity: ilerleme.value }));
  const sayfa = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - ilerleme.value) * ekranH * 0.6 + surukle.value }],
  }), [ekranH]);

  const sabit = sabitOran ? { height: Math.round(ekranH * sabitOran) } : null;
  const govde = (
    <Animated.View accessibilityViewIsModal accessibilityLabel={accessibilityLabel ?? title}
      style={[styles.sayfa, { backgroundColor: colors.bg2, boxShadow: shadow.sheet, paddingBottom: footer ? 0 : insets.bottom + space[12] },
        klavye ? sinir.sayfa : { maxHeight: Math.round(ekranH * oran) }, sabit, sayfa]}>
      <GestureDetector gesture={cek}>
        <View>
          <View style={[styles.tutamac, { backgroundColor: colors.text3 }]} />
          {title ? (
            <View style={styles.baslik}>
              {leading}
              <View style={styles.esnek}>
                <Txt variant="headline" numberOfLines={1} accessibilityRole="header">{title}</Txt>
                {subtitle ? <Txt variant="footnote" numberOfLines={1} style={{ color: colors.text2 }}>{subtitle}</Txt> : null}
              </View>
              {trailing}
            </View>
          ) : <View style={{ height: space[8] }} />}
        </View>
      </GestureDetector>
      <View style={[styles.icerik, sabit && styles.esnek, contentStyle]}>{children}</View>
      {footer ? <View style={[styles.alt, { paddingBottom: insets.bottom + space[12] }]}>{footer}</View> : null}
    </Animated.View>
  );

  return (
    <Modal visible={acik} transparent animationType="none" onRequestClose={onClose} onDismiss={onDismiss} statusBarTranslucent navigationBarTranslucent>
      <GestureHandlerRootView style={styles.kok}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, zemin]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('a11y.close')} />
        </Animated.View>
        <View pointerEvents="box-none" style={styles.yerlesim}>
          {klavye
            ? <KeyboardAvoidingView behavior="padding" style={[styles.kav, sinir.kav]}>{govde}</KeyboardAvoidingView>
            : govde}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kok: { flex: 1 },
  yerlesim: { flex: 1, justifyContent: 'flex-end' },
  kav: { width: '100%' },
  sayfa: {
    ...SHEET_LAYOUT,
    flexShrink: 1,
    borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
  },
  tutamac: { alignSelf: 'center', width: F.grabberWidth, height: F.grabberHeight, borderRadius: F.grabberRadius, marginTop: F.grabberTop, opacity: 0.6 },
  baslik: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: layout.gutter, paddingTop: space[16], paddingBottom: space[12] },
  esnek: { flex: 1, minWidth: 0 },
  icerik: { flexShrink: 1 },
  alt: { paddingHorizontal: layout.gutter, paddingTop: space[8] },
});
