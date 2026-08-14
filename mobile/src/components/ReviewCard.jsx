import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import Avatar from './Avatar';
import { colors, radius, spacing, type, PRESSED, NUMERIC } from '../theme';
import { useLanguage } from '../context/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// Doğrulanmış inceleme kartı.
//
// İKİ YERDE KULLANILIYOR: İncelemeler sayfası ve anasayfa akışı. Ortak
// bileşen olmasının sebebi kopya değil GÖRÜNÜM BİRLİĞİ — aynı içerik iki
// ekranda farklı görünseydi kullanıcı bunları farklı şeyler sanardı.
//
// DOĞRULANMIŞ SAAT kartın var oluş sebebi. Sayı kullanıcıdan değil, sunucunun
// Steam'den okuduğu kütüphaneden geliyor; "500 saatim var" diye
// yazılabilseydi "doğrulanmış" kelimesi anlamsız olurdu.
//
// UZUN BASMA = RAPORLA. Kullanıcı içeriğinin gösterildiği HER yüzeyde
// bulunmak zorunda (App Store Guideline 1.2); çağıran ekran bunu
// `onLongPress` ile bağlamalı.
// ─────────────────────────────────────────────────────────────────────────────

export default function ReviewCard({ review, onPress, onLongPress, onEdit, style }) {
  const { t, lang } = useLanguage();
  const name = review.author?.displayName || review.author?.username || '?';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, style, pressed && PRESSED]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
    >
      <View style={styles.cardHead}>
        <Image source={review.image} style={styles.cardImg} contentFit="cover" transition={140} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardGame} numberOfLines={1}>{review.gameName || review.appid}</Text>
          <View style={styles.byline}>
            <Avatar avatar={review.author?.avatar} name={name} size={18} />
            <Text style={styles.author} numberOfLines={1}>{name}</Text>
            <Ionicons name="shield-checkmark" size={11} color={colors.green} />
            <Text style={[styles.hours, NUMERIC]}>
              {Math.round(review.hours)}{lang === 'tr' ? ' saat' : ' h'}
            </Text>
          </View>
        </View>
        <Ionicons
          name={review.recommended ? 'thumbs-up' : 'thumbs-down'}
          size={17}
          color={review.recommended ? colors.green : colors.text3}
        />
      </View>

      <Text style={styles.body} numberOfLines={6}>{review.text}</Text>

      {onEdit && (
        <Pressable style={({ pressed }) => [styles.editBtn, pressed && PRESSED]} onPress={onEdit}>
          <Ionicons name="create-outline" size={14} color={colors.text2} />
          <Text style={styles.editText}>{t('rev.edit')}</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.cardBorder,
    padding: spacing.md, gap: spacing.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardImg:  { width: 56, height: 26, borderRadius: 4, backgroundColor: colors.bgInput },
  cardGame: { color: colors.text, fontSize: type.footnote, fontWeight: '700' },
  byline:   { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  avatar: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: colors.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: colors.text2, fontSize: 9, fontWeight: '800' },
  author: { color: colors.text3, fontSize: type.caption2, maxWidth: 110 },
  hours:  { color: colors.green, fontSize: type.caption2, fontWeight: '700' },
  body:   { color: colors.text2, fontSize: type.footnote, lineHeight: 19 },

  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36 },
  editText:{ color: colors.text2, fontSize: type.caption, fontWeight: '700' },
});
