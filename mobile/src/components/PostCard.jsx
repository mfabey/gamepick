import { memo, useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, radius, spacing, type, PRESSED, NUMERIC } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import { togglePostLike } from '../api/social';
import Avatar from './Avatar';

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

function PostCard({ post, onOpen, onRequireAccount, compact = false }) {
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

        <Text style={styles.text} numberOfLines={compact ? 4 : undefined}>{post.text}</Text>

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
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={15}
              color={liked ? colors.accent : colors.text3}
            />
            <Text style={[styles.actionText, NUMERIC, liked && { color: colors.accent }]}>{count}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const AV = 38;

const styles = StyleSheet.create({
  // Kartlar değil satırlar: ayırıcı çizgi yerine boşluk + ince alt kenar
  // (tasarım turunun kuralı — "çizgi yerine boşlukla ayır").
  row: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder,
  },
  main: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { color: colors.text, fontSize: type.footnote, fontWeight: '700', flexShrink: 1 },
  handle: { color: colors.text3, fontSize: type.caption, flexShrink: 1 },
  dot: { color: colors.text3, fontSize: type.caption },
  time: { color: colors.text3, fontSize: type.caption },

  text: { color: colors.text, fontSize: type.subhead, lineHeight: 21, marginTop: 3 },

  gameChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9,
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.cardBorder,
    paddingRight: 10, overflow: 'hidden', alignSelf: 'flex-start', maxWidth: '100%',
  },
  gameImg: { width: 46, height: 30 },
  gameName: { color: colors.text2, fontSize: type.caption, fontWeight: '600', flexShrink: 1 },

  actions: { flexDirection: 'row', gap: 22, marginTop: 10 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { color: colors.text3, fontSize: type.caption, fontWeight: '600' },
});

export default memo(PostCard);
