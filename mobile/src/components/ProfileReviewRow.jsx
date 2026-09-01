import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { radius, spacing, type, PRESSED, NUMERIC, motion } from '../theme';
import { useStyles, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// Profildeki inceleme satırı.
//
// NEDEN ReviewCard DEĞİL. Var olan `ReviewCard` bir AKIŞ kartı: yazarı
// tanıtıyor (avatar + ad + doğrulanmış saat), çünkü akışta okuyan kişi
// incelemeyi kimin yazdığını bilmiyor. Profilde yazar zaten sayfanın kendisi;
// aynı adı her satırda tekrarlamak, ekranın taşıdığı bilgiyi azaltmadan
// yüksekliğini artırırdı.
//
// Burada baskın bilgi OYUN: kapak 66×88 solda, oyun adı başlık, saat ve
// öneri durumu onun altında.
//
// DOĞRULANMIŞ SAAT bu satırın var oluş sebebi. Sayı kullanıcıdan değil,
// sunucunun Steam kütüphanesinden okuduğu değer; "500 saatim var" diye
// yazılabilseydi rozet anlamsız olurdu.
//
// UZUN BASMA = RAPORLA. Kullanıcı içeriğinin gösterildiği her yüzeyde
// bulunmak zorunda (App Store Guideline 1.2) — çağıran ekran `onLongPress`
// bağlamalı.
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfileReviewRow({ review, onPress, onLongPress, onEdit, onReplies }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  if (!review) return null;

  const saat = Math.round(Number(review.hours) || 0);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [styles.row, pressed && PRESSED]}
    >
      <View style={styles.cover}>
        {review.image ? (
          <Image source={review.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={motion.image} />
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.game} numberOfLines={1}>{review.gameName || review.appid}</Text>

        <View style={styles.meta}>
          {/* Doğrulanmış saat rozeti — yeşil, marka kırmızısı DEĞİL: kırmızı
              kotası (ekran başına 3) aktif sekme ve birincil eyleme ayrılmış
              durumda, ayrıca "doğrulandı" ile "dikkat" aynı renkte olmamalı. */}
          <View style={styles.verified}>
            <Ionicons name="shield-checkmark" size={11} color={colors.green} />
            <Text style={[styles.verifiedText, NUMERIC]}>
              {saat}{lang === 'tr' ? ' SA' : ' H'}
            </Text>
          </View>
          <Ionicons
            name={review.recommended ? 'thumbs-up-outline' : 'thumbs-down-outline'}
            size={13}
            color={colors.text2}
          />
          <Text style={styles.rec} numberOfLines={1}>
            {review.recommended ? t('rev.yes') : t('rev.no')}
          </Text>
        </View>

        {review.text ? (
          <Text style={styles.text} numberOfLines={3}>{review.text}</Text>
        ) : null}

        <View style={styles.actions}>
          {/* Yanıtlar OYUN SAYFASINDA DEĞİL topluluk konusunda okunuyor;
              buradaki satır o konuyu açan kapı. Sayı 0 ise hiç çizilmiyor:
              "0 yanıt" yazmak sayfayı ıssız gösterir. */}
          {Number(review.replyCount) > 0 ? (
            <Pressable onPress={onReplies} hitSlop={8} style={({ pressed }) => [styles.action, pressed && PRESSED]}>
              <Ionicons name="arrow-undo-outline" size={13} color={colors.text3} />
              <Text style={styles.actionText}>
                <Text style={NUMERIC}>{review.replyCount}</Text> {t('post.repliesCount')}
              </Text>
            </Pressable>
          ) : null}
          {onEdit ? (
            <Pressable onPress={onEdit} hitSlop={8} style={({ pressed }) => [styles.action, pressed && PRESSED]}>
              <Ionicons name="create-outline" size={13} color={colors.text3} />
              <Text style={styles.actionText}>{t('rev.edit')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  row: {
    flexDirection: 'row', gap: spacing.s12,
    paddingHorizontal: spacing.s20, paddingVertical: spacing.s16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder,
  },
  // 66×88 — maket ölçüsü, 3:4 oranını koruyor (66 × 4/3 = 88).
  cover: {
    width: 66, height: 88, borderRadius: radius.md,
    backgroundColor: colors.surfaceTile, overflow: 'hidden',
  },
  body: { flex: 1, minWidth: 0 },

  game: { fontSize: type.subhead, fontWeight: '600', color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.s8, marginTop: spacing.s8 },
  verified: {
    height: 24, flexDirection: 'row', alignItems: 'center', gap: spacing.s4,
    paddingHorizontal: spacing.s8, borderRadius: radius.pill,
    backgroundColor: colors.greenWash, borderWidth: 1, borderColor: colors.greenWashBorder,
  },
  verifiedText: { fontSize: type.caption2, fontWeight: '600', color: colors.green },
  rec: { flex: 1, minWidth: 0, fontSize: type.footnote, fontWeight: '500', color: colors.text2 },

  text: { fontSize: type.footnote, fontWeight: '400', color: colors.text2, lineHeight: 19, marginTop: spacing.s8 },

  actions: { flexDirection: 'row', gap: spacing.s16, marginTop: spacing.s12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.s4 },
  actionText: { fontSize: type.footnote, fontWeight: '500', color: colors.text3 },
});
