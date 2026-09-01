import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import Avatar from './Avatar';
import { radius, spacing, type, shadows, PRESSED, NUMERIC, motion, avatar as avatarSize } from '../theme';
import { useStyles, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// Konu görünümünün İNCELEME KÖKÜ.
//
// NEDEN AYRI BİR KART. Bir incelemeye yazılan yanıtlar oyun sayfasında
// GÖRÜNMÜYOR; okundukları tek yer topluluk konusu. O konunun kökü sıradan bir
// gönderi değil: doğrulanmış saati, öneri durumu ve bir oyunu var. Akış
// satırıyla aynı biçimde çizilseydi, yanıt verenlerin neye cevap verdiği
// kaybolurdu.
//
// TEK GÖLGELİ ÖĞE. Uygulamada kart gölgesi yalnız burada kullanılıyor
// (jeton: shadows.card): kök, altındaki yanıt akışından FARKLI BİR NESNE
// olduğunu söylemek zorunda ve bunu yükseklikle söylüyor — ikinci bir renk
// ya da kenarlık kalınlığı eklemeden.
// ─────────────────────────────────────────────────────────────────────────────

export default function ReviewRoot({ review, onOpenGame, onAuthor }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  if (!review) return null;

  const yazar = review.author?.displayName || review.author?.username || '';
  const saat = Math.round(Number(review.hours) || 0);

  return (
    <View style={styles.wrap}>
      {/* Bağlam satırı: kullanıcı buraya bir yanıt bağlantısından geliyor ve
          neye baktığını ilk satırda öğrenmeli. */}
      <View style={styles.context}>
        <Ionicons name="arrow-undo-outline" size={13} color={colors.text3} />
        <Text style={styles.contextText} numberOfLines={1}>{t('post.reviewThread')}</Text>
      </View>

      <View style={styles.card}>
        <Pressable style={styles.gameRow} onPress={onOpenGame}>
          <View style={styles.cover}>
            {review.image ? (
              <Image source={review.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={motion.image} />
            ) : null}
          </View>
          <View style={styles.gameBody}>
            <Text style={styles.game} numberOfLines={2}>{review.gameName || review.appid}</Text>
            <View style={styles.verified}>
              <Ionicons name="shield-checkmark" size={11} color={colors.green} />
              <Text style={[styles.verifiedText, NUMERIC]}>
                {saat}{lang === 'tr' ? ' SA' : ' H'}
              </Text>
            </View>
          </View>
        </Pressable>

        <Pressable style={({ pressed }) => [styles.author, pressed && PRESSED]} onPress={onAuthor}>
          <Avatar avatar={review.author?.avatar} name={yazar} size={avatarSize.md} />
          <Text style={styles.authorName} numberOfLines={1}>{yazar}</Text>
          <Ionicons
            name={review.recommended ? 'thumbs-up-outline' : 'thumbs-down-outline'}
            size={13}
            color={colors.text2}
          />
          <Text style={styles.rec} numberOfLines={1}>
            {review.recommended ? t('rev.yes') : t('rev.no')}
          </Text>
        </Pressable>

        {/* Kök metin 22pt: hiyerarşi PUNTOYLA kuruluyor, kalınlıkla değil.
            Kalın yapılsaydı yanıtlarla arasındaki fark "önemli/önemsiz" gibi
            okunurdu; büyük punto yalnızca "konu bu" diyor. */}
        <Text style={styles.text}>{review.text}</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  wrap: { paddingBottom: spacing.s8 },

  context: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s8,
    paddingHorizontal: spacing.s20, paddingVertical: spacing.s12,
  },
  contextText: { flex: 1, fontSize: type.footnote, fontWeight: '500', color: colors.text3 },

  card: {
    marginHorizontal: spacing.s20, padding: spacing.s16,
    borderRadius: radius.xl, backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.cardBorder,
    ...shadows.card,
  },

  gameRow: { flexDirection: 'row', gap: spacing.s12 },
  cover: {
    width: 66, height: 88, borderRadius: radius.md,
    backgroundColor: colors.surfaceTile, overflow: 'hidden',
  },
  gameBody: { flex: 1, minWidth: 0, justifyContent: 'center', gap: spacing.s8 },
  game: { fontSize: type.body, fontWeight: '600', color: colors.text },
  verified: {
    alignSelf: 'flex-start', height: 24, flexDirection: 'row', alignItems: 'center',
    gap: spacing.s4, paddingHorizontal: spacing.s8, borderRadius: radius.pill,
    backgroundColor: colors.greenWash, borderWidth: 1, borderColor: colors.greenWashBorder,
  },
  verifiedText: { fontSize: type.caption2, fontWeight: '600', color: colors.green },

  author: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s8,
    marginTop: spacing.s16,
  },
  authorName: { fontSize: type.footnote, fontWeight: '600', color: colors.text2 },
  rec: { flex: 1, minWidth: 0, fontSize: type.footnote, fontWeight: '500', color: colors.text2 },

  text: {
    marginTop: spacing.s16,
    fontSize: type.title3, fontWeight: '400', color: colors.text, lineHeight: 30,
  },
});
