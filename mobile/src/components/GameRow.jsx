// ─────────────────────────────────────────────────────────────────────────────
// KOMPAKT SATIR — kart ailesinin E bedeni (Faz 2).
//
// "Yoğun listeler (İstek listesi, Liste detayı, seçiciler). Ad tek satır +
//  ellipsis — burada ad zaten BİLİNEN bir şeyin hatırlatıcısı. Ayırıcı çizgi
//  YALNIZCA BURADA meşru."
//
// NEDEN AYRI BİR BİLEŞEN. Üç ekran aynı işi üç ayrı biçimde yapıyordu:
//   wishlist        → 96×54 yatay küçük görsel, 2 satır ad, fiyat satırı
//   list/[id]       → 2 sütunlu ızgara, ad KAPAK ÜSTÜNDE
//   collection/[id] → aynısı
// Son ikisi Faz 2'nin öz-denetimindeki "açık temada kapak üstü metin"
// maddesini de deliyordu: kapak açık renkliyse beyaz ad kayboluyor.
//
// SABİT 72pt — FlashList sözleşmesi. `estimatedItemSize` bir tahmin değil,
// ölçü: satır içerikle büyümediği için liste kaydırmada sıçramıyor.
//
// Ölçüler makette ölçüldü: satır 72 · kapak 36×48 (3:4, r8) · boşluk 12 ·
// ad 15/600 tek satır · durum 13/text3 · sağ yuva 15/text3.
// ─────────────────────────────────────────────────────────────────────────────
import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import GameCover from './GameCover';
import { useStyles, useTheme } from '../context/ThemeContext';
import { radius, spacing, type, PRESSED } from '../theme';

export const SATIR_Y = 72;

/**
 * @param {object}  game        { id, name, image }
 * @param {node}   [durum]      ad altındaki tek satır ("Kütüphanende · 46 saat")
 * @param {node}   [sag]        sağ yuva; verilmezse chevron
 * @param {bool}   [ayirici]    alt çizgi (varsayılan açık; son satırda kapatılır)
 * @param {func}    onPress
 * @param {func}   [onLongPress]
 */
function GameRow({ game, durum, sag, ayirici = true, onPress, onLongPress }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={game?.name}
      style={({ pressed }) => [styles.satir, ayirici && styles.ayirici, pressed && PRESSED]}
    >
      {/* 36×48 — 44pt eşiğinin ALTINDA, dolayısıyla kapaksız oyunda
          "kapak yok" notu çıkmıyor (Faz 1 kuralı). Bu bedende baş harf
          zaten tek başına yeterli: adın kendisi hemen yanında duruyor. */}
      <GameCover
        uri={game?.image}
        name={game?.name}
        recyclingKey={String(game?.id ?? '')}
        style={styles.kapak}
      />

      <View style={styles.metin}>
        <Text numberOfLines={1} style={styles.ad}>{game?.name}</Text>
        {durum ? (
          typeof durum === 'string'
            ? <Text numberOfLines={1} style={styles.durum}>{durum}</Text>
            : durum
        ) : null}
      </View>

      {sag !== undefined ? sag : (
        <Ionicons name="chevron-forward" size={16} color={colors.text3} />
      )}
    </Pressable>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  satir: {
    height: SATIR_Y,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s12,
  },
  // Ayırıcı bu bedende MEŞRU: satırlar arasında kapak boşluğu yok, göz
  // nereden nereye olduğunu ancak çizgiyle ayırıyor.
  ayirici: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder },
  kapak: { width: 36, height: 48, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.card },
  // Maket 2px diyor; ölçeğin en küçük basamağı 4. 72pt'lik satırda
  // fark görünmüyor, ölçek disiplini duruyor.
  metin: { flex: 1, minWidth: 0, gap: spacing.s4 },
  ad: { fontSize: type.subhead, fontWeight: '600', color: colors.text },
  durum: { fontSize: type.footnote, color: colors.text3 },
});

export default memo(GameRow);
