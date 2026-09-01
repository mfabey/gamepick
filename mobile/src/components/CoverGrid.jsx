import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { radius, spacing, type, PRESSED_CARD, motion } from '../theme';
import { useStyles } from '../context/ThemeContext';

// ─────────────────────────────────────────────────────────────────────────────
// Profil kapak ızgarası — koleksiyon ve istek listesi sekmelerinin ortak hücresi.
//
// ÜÇ SÜTUN, 3:4 KAPAK. Instagram karesi değil: bu uygulamanın bütün kapakları
// 3:4 (jeton: coverRatio) ve kare kırpma oyun kapaklarının üstünü/altını
// keserdi — logo genelde orada duruyor.
//
// GENİŞLİK PENCEREDEN HESAPLANIYOR, yazılmıyor. Maket 390pt'de 114 diyor;
// aynı sayı burada (390 − 2×20 kenar − 2×4 boşluk) / 3 olarak çıkıyor. Sabit
// yazılsaydı dar cihazda ızgara taşardı — bu depoda TAM BU HATA bir kez
// oldu: profil ızgarası kenar payı ayrı bir sabite bağlıydı ve gövde dolgusu
// 16'dan 20'ye çekilince ızgara 8pt taşmıştı.
// ─────────────────────────────────────────────────────────────────────────────

export const GRID_COLS = 3;
export const GRID_GAP = spacing.s4;
export const GRID_PAD = spacing.s20;

/** Tek hücrenin genişliği (pt). Yükseklik 3:4 oranından türüyor. */
export function coverWidth(windowWidth) {
  const inner = windowWidth - GRID_PAD * 2;
  return (inner - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
}

/** Ad yoksa da bir şey çizilmeli: baş harf, boş kutudan iyidir. */
function initial(name) {
  const s = String(name || '').trim();
  return s ? s[0].toUpperCase() : '?';
}

/**
 * @param item  `{ id, appid, name, image }`
 * @param width coverWidth() sonucu — liste hesaplayıp veriyor, hücre değil
 * @param badge sağ üst rozet metni (indirim) — isteğe bağlı
 */
export default function CoverCell({ item, width, badge, onPress }) {
  const styles = useStyles(makeStyles);
  const box = { width, height: Math.round((width * 4) / 3) };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cell, box, pressed && PRESSED_CARD]}
      accessibilityRole="button"
      accessibilityLabel={item?.name || ''}
    >
      {/* Baş harf KAPAĞIN ALTINDA duruyor: görsel yüklenene kadar (ya da hiç
          yüklenmezse) hücre boş bir dikdörtgen olmuyor. Kapak gelince üstünü
          örtüyor — ayrı bir "yükleniyor" durumu gerekmiyor. */}
      <Text style={styles.initial}>{initial(item?.name)}</Text>
      {item?.image ? (
        <Image
          source={item.image}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={motion.image}
          cachePolicy="memory-disk"
        />
      ) : null}

      {/* Ad HER ZAMAN görünür: kapak görselleri birbirine benziyor ve
          ızgarada 9 kapak yan yanayken ad tek ayırt edici bilgi. Okunabilirlik
          için altta koyu bir perde var.

          PERDE GRADYAN, DÜZ DOLGU DEĞİL. Emülatörde görüldü: %55'ten başlayan
          düz dolgu kapağın ortasında GÖRÜNÜR BİR KENAR bırakıyordu — kapak
          ikiye bölünmüş gibi duruyordu. Gradyan aynı okunabilirliği kenar
          çizmeden veriyor. */}
      <LinearGradient
        // tema-bagimsiz: perde kapak GÖRSELİNİN üstünde; görsel iki temada da aynı
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.78)']}
        style={styles.scrim}
        pointerEvents="none"
      />
      <Text style={styles.name} numberOfLines={2}>{item?.name}</Text>

      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  cell: {
    borderRadius: radius.md, overflow: 'hidden', justifyContent: 'flex-end',
    padding: spacing.s8, backgroundColor: colors.surfaceTile,
  },
  initial: {
    position: 'absolute', top: spacing.s8, left: spacing.s8,
    fontSize: type.title3, fontWeight: '700', color: colors.text3,
  },
  // Gradyan %45'ten başlıyor: adın iki satırı ve altındaki dolgu bu aralıkta.
  scrim: { ...StyleSheet.absoluteFillObject, top: '45%' },
  // tema-bagimsiz: perdenin üstünde duruyor (yukarıdaki gerekçe).
  name: { fontSize: type.caption2, fontWeight: '600', color: '#fff', lineHeight: 13 },
  badge: {
    position: 'absolute', top: spacing.s8, right: spacing.s8,
    height: 20, paddingHorizontal: spacing.s8, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center',
    // Metin taşıyan dolgu → accentFillStrong (bkz. check-accent.mjs).
    backgroundColor: colors.accentFillStrong,
  },
  badgeText: { fontSize: type.caption2, fontWeight: '600', color: colors.onAccent },
});
