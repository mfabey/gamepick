import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  interpolate, Extrapolation,
} from 'react-native-reanimated';

import { anchorMenu } from '../services/menuAnchor';
import { REACTIONS } from '../services/reactions';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { PRESSED } from '../theme';
import { useStyles } from '../context/ThemeContext';
import { Icon } from './Icon';
import { Txt } from './ui/Primitives';
import { useDesignTheme } from '../theme/useDesignTheme';
import { radius, shadow, space } from '../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Mesaj bağlam menüsü — uzun basınca çıkan eylem listesi.
//
// SİSTEM `Alert` KUTUSUNUN YERİNİ ALIYOR. O kutu iOS'un, bizim değil: ne
// tipografimizi ne renklerimizi ne de köşe yarıçapımızı taşıyordu ve
// "silmek istediğine emin misin?" dışında bir şey gösteremiyordu.
//
// MENÜ BALONCUĞA TUTTURULUYOR, ekranın altına değil. Hangi mesaja ait olduğunu
// konumu söylüyor; alttan çıkan bir sayfa bunu söyleyemez ve kullanıcı
// yanlış mesajı sildiğini ancak iş bitince anlar.
//
// ARKA PLAN YARI SAYDAM: mesaj menünün arkasında görünmeye devam ediyor.
// Opak bir katman "hangi mesaj" sorusunu tekrar sorardı.
//
// AÇILIŞ YÖNÜ konumla tutarlı (bkz. menuAnchor.placement): altına açılan menü
// yukarıdan büyüyor, üstüne açılan aşağıdan. Tersi, hareketin nereden
// çıktığını yanlış anlatıyor.
// ─────────────────────────────────────────────────────────────────────────────

// Sabit genişlik: içeriğe göre değişen bir menü, her mesajda farklı boyda
// açılıp huzursuz görünüyor.
export const MENU_W = 232;
const ROW_H = 48;          // HIG alt sınırı 44; ikon + metin için 48 rahat
// Tepki düğmeleri 32×32 çiziliyor: altısı 232 puntoluk menüye ancak böyle
// sığıyor. HIG'in 44pt alt sınırının altında kalan GÖRSEL boyut; dokunma
// alanı hitSlop ile 40'a çıkıyor ve satır yüksekliği 52.
//
// Bu bilinçli bir taviz: emoji seçicisi bir eylem listesi değil, iOS'un
// kendi tepki satırı da aynı ölçülerde. Yine de en dar dokunma hedefimiz.
const REACT_ROW_H = 52;
const PAD_V = 6;

export default function MessageMenu({ visible, onClose, actions = [], anchor, mine, onReact, myReaction }) {
  const styles = useStyles(makeStyles);
  const { colors } = useDesignTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const p = useSharedValue(0);

  useEffect(() => {
    if (!visible) { p.value = 0; return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (reducedMotion) { p.value = 1; return; }
    // ζ = damping / (2·√stiffness) = 16 / (2·√260) ≈ 0,50 — hafif bir aşma
    // var ama zıplama yok. Menü bir vurgu değil, bir araç.
    p.value = withSpring(1, { stiffness: 260, damping: 16 });
  }, [visible, p, reducedMotion]);

  // Tepki satırı menünün yüksekliğine DAHİL: konumlandırma bu sayıyla
  // hesaplanıyor ve satır unutulursa menü ekranın altından taşıyor.
  const menuH = actions.length * ROW_H + PAD_V * 2 + (onReact ? REACT_ROW_H : 0);
  const pos = anchor
    ? anchorMenu({
        bubble: anchor,
        menu: { width: MENU_W, height: menuH },
        screen: { width, height },
        insets,
        mine,
      })
    : { x: 0, y: 0, placement: 'below' };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const menuStyle = useAnimatedStyle(() => {
    const s = interpolate(p.value, [0, 1], [0.9, 1], Extrapolation.CLAMP);
    // Ölçek merkezden büyüdüğü için, menünün TUTTURULDUĞU kenarın yerinde
    // kalması adına ters yönde bir öteleme uygulanıyor. Bu olmadan menü
    // baloncuktan kopuk, havada bir yerden açılıyormuş gibi görünüyor.
    const anchorShift = (menuH * (1 - s)) / 2;
    const dy = pos.placement === 'below' ? -anchorShift : anchorShift;
    return {
      opacity: interpolate(p.value, [0, 1], [0, 1], Extrapolation.CLAMP),
      transform: [{ translateY: dy }, { scale: s }],
    };
  }, [menuH, pos.placement]);

  const run = (fn) => {
    onClose();
    // Menü kapanma animasyonunu bitirsin diye DEĞİL, eylem bir Alert veya
    // sayfa açıyorsa ikisi üst üste binmesin diye bir kare bekliyoruz.
    requestAnimationFrame(() => fn());
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="" />
      </Animated.View>

      <Animated.View
        style={[styles.menu, { left: pos.x, top: pos.y, width: MENU_W, boxShadow: shadow.popover }, menuStyle]}
        accessibilityViewIsModal
      >
        {/* 2.0 popover (27 Eyl): gölge dış katmanda, kırpma iç katmanda —
            aynı katmanda overflow:hidden iOS'ta gölgeyi kesiyordu. */}
        <View style={[styles.menuIc, { backgroundColor: colors.surface1 }]}>
        {/* ── Hızlı tepki satırı ──
            EN ÜSTTE ve yatay: bir eylem listesi değil, tek dokunuşluk bir
            seçim. Listeye altı satır olarak eklenseydi menü iki katına çıkar
            ve asıl eylemler (sil, şikayet) kıvrımın altına düşerdi.

            Seçili emoji vurgulu — hangi tepkiyi verdiğimi menü de söylüyor,
            baloncuktaki rozete bakmak zorunda kalmıyorum. */}
        {onReact ? (
          <View style={styles.reactRow}>
            {REACTIONS.map((e) => (
              <Pressable
                key={e}
                style={({ pressed }) => [
                  styles.reactBtn,
                  myReaction === e && { backgroundColor: colors.accentTint },
                  pressed && PRESSED,
                ]}
                onPress={() => run(() => onReact(e))}
                accessibilityRole="button"
                accessibilityLabel={e}
                hitSlop={4}
              >
                <Text style={styles.reactEmoji}>{e}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {actions.map((a, i) => (
          <Pressable
            key={a.key}
            style={({ pressed }) => [
              styles.row,
              // Ayırıcı satırlar ARASINDA, sonuncudan sonra yok — son çizgi
              // menünün kendi kenarıyla çakışıp kalın görünüyordu.
              (i > 0 || onReact) && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
              pressed && { backgroundColor: colors.pillNeutral },
            ]}
            onPress={() => run(a.onPress)}
            accessibilityRole="button"
            accessibilityLabel={a.label}
          >
            <Txt variant="input" numberOfLines={1} style={[styles.label, { color: a.destructive ? colors.red : colors.text }]}>{a.label}</Txt>
            {/* 2.0 ikon adı (copy, reply, trash, flag…) — çağıran veriyor. */}
            <Icon name={a.icon} size={20} color={a.destructive ? colors.red : colors.text2} />
          </Pressable>
        ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

const makeStyles = () => StyleSheet.create({
  menu: { position: 'absolute', borderRadius: radius.card },
  menuIc: { borderRadius: radius.card, overflow: 'hidden', paddingVertical: PAD_V },
  row: {
    height: ROW_H,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[12],
    paddingHorizontal: space[16],
  },
  reactRow: {
    height: REACT_ROW_H,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space[8],
  },
  reactBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  reactEmoji: { fontSize: 21 },
  label: { flex: 1 },
});
