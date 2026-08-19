import { memo, useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { radius, spacing, type, PRESSED, NUMERIC, TOUCH_MIN } from '../theme';
import { useStyles, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { togglePostLike } from '../api/social';
import Avatar from './Avatar';
import { usePop } from '../hooks/usePop';

// ─────────────────────────────────────────────────────────────────────────────
// Tartışma gönderisi.
//
// KART DEĞİL SATIR. Oyun kartları (GameCard, GamePostCard) kapak görseli
// etrafında kuruluyor; burada asıl içerik METİN. Görsel ağırlıklı bir kart
// kullanmak, 40 karakterlik bir cümleyi 200pt'lik bir kutuya oturtmak olurdu.
// Avatar solda, metin sağda, eylemler altta — konuşma listesi düzeni.
//
// OYUN EKİ İSTEĞE BAĞLI. Gönderi serbest yazılıyor; oyun eklenmişse metnin
// altında küçük bir çip olarak duruyor, gönderinin kendisini gölgelemiyor.
// ─────────────────────────────────────────────────────────────────────────────

function timeAgo(ts, lang) {
  const s = Math.max(0, Math.floor((Date.now() - (Number(ts) || 0)) / 1000));
  const tr = lang === 'tr';
  if (s < 60) return tr ? 'şimdi' : 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}${tr ? ' dk' : 'm'}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${tr ? ' sa' : 'h'}`;
  const d = Math.floor(h / 24);
  return `${d}${tr ? ' g' : 'd'}`;
}

function PostCard({ post, onOpen, onRequireAccount, compact = false, kok = false }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const router = useRouter();

  // İyimser beğeni — sunucu yanıtı beklenirse dokunuş ölü hissettiriyor.
  const [liked, setLiked] = useState(!!post.likedByMe);
  const [count, setCount] = useState(Number(post.likeCount) || 0);

  const onLike = useCallback(async () => {
    if (onRequireAccount && onRequireAccount()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      const r = await togglePostLike(post.id);
      setLiked(!!r.liked);
      setCount(Number(r.likeCount) || 0);
    } catch {
      setLiked(!next);                       // geri al
      setCount((c) => c + (next ? -1 : 1));
    }
  }, [liked, post.id, onRequireAccount]);

  const likeStyle = usePop(liked);

  const name = post.author?.displayName || post.author?.username || t('post.someone');

  return (
    <Pressable
      onPress={() => (onOpen ? onOpen(post) : router.push(`/post/${post.id}`))}
      style={({ pressed }) => [styles.row, pressed && PRESSED]}
    >
      <Avatar avatar={post.author?.avatar} name={name} size={AV} />

      <View style={styles.main}>
        <View style={styles.head}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {post.author?.username ? (
            <Text style={styles.handle} numberOfLines={1}>@{post.author.username}</Text>
          ) : null}
          <Text style={styles.dot}>·</Text>
          <Text style={styles.time}>{timeAgo(post.at, lang)}</Text>
        </View>

        {/* FAZ 5 — KÖK GÖNDERİ İLE YANIT GÖRSEL OLARAK AYRIŞIYOR.
            `compact` propu zaten vardı ama YALNIZCA satır kırpmasını
            değiştiriyordu (akışta 4 satır, konuşmada sınırsız); tipografi
            ikisinde de aynıydı. Konuşmada kök gönderi body 17/23, yanıtlar
            subhead 15/21 kalıyor. Girinti YOK — hiyerarşi punto ile
            kuruluyor, boşlukla değil. */}
        <Text style={[styles.text, kok && styles.textKok]} numberOfLines={compact ? 4 : undefined}>{post.text}</Text>

        {post.game?.appid ? (
          <Pressable
            onPress={() => router.push({ pathname: '/game/[id]', params: { id: post.game.appid, name: post.game.name } })}
            style={({ pressed }) => [styles.gameChip, pressed && PRESSED]}
          >
            {post.game.image ? (
              <Image source={post.game.image} style={styles.gameImg} contentFit="cover" />
            ) : null}
            <Text style={styles.gameName} numberOfLines={1}>{post.game.name}</Text>
          </Pressable>
        ) : null}

        <View style={styles.actions}>
          <View style={styles.action}>
            <Ionicons name="chatbubble-outline" size={15} color={colors.text3} />
            <Text style={[styles.actionText, NUMERIC]}>{post.replyCount || 0}</Text>
          </View>

          <Pressable onPress={onLike} hitSlop={10} style={styles.action}>
            {/* Kalp ANINDA doluyordu: dokunsal geri bildirim vardı, görsel
                yoktu. usePop yalnızca beğenirken tepki veriyor — geri almak
                dikkat çekmemeli. */}
            <Animated.View style={likeStyle}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={15}
                color={liked ? colors.accent : colors.text3}
              />
            </Animated.View>
            <Text style={[styles.actionText, NUMERIC, liked && { color: colors.accent }]}>{count}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// Maket: avatar 40. Gönderi bir İNSANIN sözü; kimliğin taşıyıcısı avatar.
const AV = 40;

const makeStyles = (colors) => StyleSheet.create({
  // ── SATIR, KART DEĞİL (Faz 2) ──
  // Bir ara satırdı, sonra eski makete bakılarak KART yapıldı (surface2 dolgu
  // + 1px kenarlık + 12pt kart arası boşluk). Faz 2 geri alıyor ve gerekçesi
  // yoğunlukla ilgili:
  //
  //   "Tek kolon, sabit satır ritmi, düşük maliyetli eylemler satırın
  //    İÇİNDE. Kart yüzeyi yok: gönderi ZEMİN ÜSTÜNDE durur, yalnızca
  //    ayırıcı taşır (yoğunluk bir erdem)."
  //
  // Maketin gönderi kutusunun zemini sayfa zemininin kendisi (#06070a) —
  // yani yüzey yok. Kart yüzeyi her gönderiye 2px kenarlık + 12pt boşluk
  // ekliyordu; ekranda üçte bir daha az gönderi görünüyordu.
  row: {
    flexDirection: 'row', gap: spacing.s12,
    paddingHorizontal: spacing.s20, paddingVertical: spacing.s16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder,
  },
  main: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.s4, flexWrap: 'wrap' },
  // Maket: ad 15/600, kullanıcı adı ve zaman 13/text3.
  name: { color: colors.text, fontSize: type.subhead, fontWeight: '600', flexShrink: 1 },
  handle: { color: colors.text3, fontSize: type.footnote, flexShrink: 1 },
  dot: { color: colors.text3, fontSize: type.footnote },
  time: { color: colors.text3, fontSize: type.footnote },

  // Maket: gönderi gövdesi 15 / 400.
  text: { color: colors.text, fontSize: type.subhead, fontWeight: '400', lineHeight: 20, marginTop: spacing.s4 },
  textKok: { fontSize: type.body, lineHeight: 23 },

  gameChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 9,
    // Maket: kart İÇİNDEKİ oyun kartı surface3 (bir tık üstü), r12, dolgu 8.
    backgroundColor: colors.bgInput, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.cardBorder,
    paddingRight: spacing.s12, overflow: 'hidden', alignSelf: 'flex-start', maxWidth: '100%',
  },
  gameImg: { width: 46, height: 30 },
  gameName: { color: colors.text2, fontSize: type.caption, fontWeight: '600', flexShrink: 1 },

  // Maket: eylemler arası 20, her biri minHeight 44 (HIG hedefi).
  actions: { flexDirection: 'row', gap: spacing.s20 },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.s4, minHeight: TOUCH_MIN },
  actionText: { color: colors.text2, fontSize: type.footnote, fontWeight: '600' },
});

export default memo(PostCard);
