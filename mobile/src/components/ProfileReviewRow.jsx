import { Image } from 'expo-image';

import { useLanguage } from '../context/LanguageContext';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { Txt } from './ui/Primitives';
import { Badge } from './ui/Social';
import { StatusPill } from './ui/Commerce';
import { PRESSED, NUMERIC, motion } from '../theme';
import { useDesignTheme } from '../theme/useDesignTheme';
import { control, layout, radius, space } from '../theme/tokens';

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
// ⋯ = ŞİKÂYET VE ENGELLEME. Kullanıcı içeriğinin gösterildiği her yüzeyde
// bulunmak zorunda (App Store Guideline 1.2).
//
// BU SÖZ BİR SÜRE TUTULMADI. Yukarıdaki not "çağıran ekran `onLongPress`
// bağlamalı" diyordu ama İKİ ÇAĞIRANIN İKİSİ DE bağlamıyordu — profil
// ekranlarındaki incelemelerin hiçbir moderasyon yolu yoktu. Prop'un
// varlığı, kullanıldığının kanıtı değil.
// ─────────────────────────────────────────────────────────────────────────────

// 2.0 (27 Eyl): 2.0 kapak köşesi, doğrulanmış saat `Badge verified`, öneri
// `StatusPill`, 2.0 ikonlar (⋯, yanıt, düzenle). Düzen ve davranış aynen.
export default function ProfileReviewRow({ review, onPress, onLongPress, onMenu, onEdit, onReplies }) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  if (!review) return null;
  const saat = Math.round(Number(review.hours) || 0);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.line }, pressed && PRESSED]}
    >
      <View style={[styles.cover, { backgroundColor: colors.surface2 }]}>
        {review.image ? (
          <Image source={review.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={motion.image} />
        ) : null}
      </View>
      <View style={styles.body}>
        <View style={styles.baslik}>
          <Txt variant="headline" numberOfLines={1} style={styles.game}>{review.gameName || review.appid}</Txt>
          {onMenu ? (
            <Pressable
              onPress={() => onMenu(review.author)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.more')}
              style={({ pressed }) => [pressed && PRESSED]}
            >
              <Icon name="more" size={20} color={colors.text3} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.meta}>
          {/* Doğrulanmış saat rozeti — yeşil, marka kırmızısı DEĞİL: "doğrulandı"
              ile "dikkat" aynı renkte olmamalı. */}
          <Badge kind="verified" label={`${saat} ${t('rev.hoursShort')}`} />
          <StatusPill kind={review.recommended ? 'recommends' : 'notRecommends'} />
        </View>
        {review.text ? (
          <Txt variant="footnote" numberOfLines={3} style={[styles.text, { color: colors.text2 }]}>{review.text}</Txt>
        ) : null}
        <View style={styles.actions}>
          {/* Yanıtlar topluluk konusunda okunuyor; bu satır o konuyu açan kapı
              ve KOŞULSUZ çiziliyor — sayı yoksa "Yanıtla", hiçbir yerde "0 yanıt". */}
          {onReplies ? (
            <Pressable onPress={onReplies} hitSlop={8} accessibilityRole="button" style={({ pressed }) => [styles.action, pressed && PRESSED]}>
              <Icon name="reply" size={15} color={colors.text2} strokeWidth={control.iconStroke} />
              <Txt variant="footnoteStrong" style={{ color: colors.text2 }}>
                {Number(review.replyCount) > 0
                  ? <><Text style={NUMERIC}>{review.replyCount}</Text> {t('post.repliesCount')}</>
                  : t('post.replyTitle')}
              </Txt>
            </Pressable>
          ) : null}
          {onEdit ? (
            <Pressable onPress={onEdit} hitSlop={8} accessibilityRole="button" style={({ pressed }) => [styles.action, pressed && PRESSED]}>
              <Icon name="edit" size={15} color={colors.text2} strokeWidth={control.iconStroke} />
              <Txt variant="footnoteStrong" style={{ color: colors.text2 }}>{t('rev.edit')}</Txt>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', gap: space[12],
    paddingHorizontal: layout.gutter, paddingVertical: space[16],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // 66×88 — maket ölçüsü, 3:4 oranını koruyor (66 × 4/3 = 88).
  cover: { width: 66, height: 88, borderRadius: radius.md, overflow: 'hidden' },
  body: { flex: 1, minWidth: 0 },
  baslik: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  game: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space[8], marginTop: space[8] },
  text: { marginTop: space[8] },
  actions: { flexDirection: 'row', gap: space[16], marginTop: space[12] },
  action: { flexDirection: 'row', alignItems: 'center', gap: space[4], minHeight: 28 },
});
