import { memo, useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useLanguage } from '../context/LanguageContext';
import { togglePostLike } from '../api/social';
import DevBadge from './DevBadge';
import { GameTag, Post, PostActions, PostHeader } from './ui/Social';
import { component as K, layout } from '../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Tartışma gönderisi — 2.0 (G-10, kit c.py post()).
//
// KART DEĞİL SATIR (Faz 2 kararı, tasarım da aynı): gönderi zemin üstünde
// duruyor, yüzey yok. Başlık (40 avatar, ad + rozet + "· zaman", kullanıcı
// adı, ⋯), gövde soldan 52 içeride: metin, oyun etiketi, eylemler.
//
// OYUN EKİ İSTEĞE BAĞLI. Gönderi serbest yazılıyor; oyun eklenmişse metnin
// altında oyun etiketi olarak duruyor.
//
// PAYLAŞ ve KAYDET çizilmiyor: gönderiler için ikisinin de özelliği yok;
// tasarım çiziyor ama ölü düğme koymuyoruz (PostActions yalnız işleyici
// verilince çiziyor).
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

// ── ⋯ = MODERASYON YOLU (App Store Guideline 1.2) ──
// Bu kartta ÖNCEDEN HİÇBİR yol yoktu: ne şikâyet ne engelleme. 2.6.1 (42)
// tam olarak bu yüzden 1.2'den reddedildi. GİZLİ JEST TEK YOL OLAMAZ: uzun
// basma kısayol olarak duruyor, ⋯ (PostHeader "daha fazla") görünür kapı.
function PostCard({ post, onOpen, onMenu, onRequireAccount, compact = false, kok = false }) {
  const { t, lang, locale } = useLanguage();
  const router = useRouter();

  // İyimser beğeni — sunucu yanıtı beklenirse dokunuş ölü hissettiriyor.
  // Hata olursa geri alınıyor (COMPONENTS §5 PostActions).
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
  const username = post.author?.username;
  const open = useCallback(() => (onOpen ? onOpen(post) : router.push(`/post/${post.id}`)), [onOpen, post, router]);

  return (
    <Pressable
      onPress={open}
      onLongPress={onMenu ? () => onMenu(post.author) : undefined}
      delayLongPress={400}
      accessibilityRole="button"
      style={s.row}
    >
      <Post
        header={
          <PostHeader
            avatar={post.author?.avatar}
            name={name}
            handle={username ? `@${username}` : ''}
            time={timeAgo(post.at, lang)}
            badge={<DevBadge user={post.author} username={username} isDeveloper={post.author?.isDeveloper} size={13} />}
            onProfile={username ? () => router.push(`/u/${username}`) : undefined}
            onMore={onMenu ? () => onMenu(post.author) : undefined}
          />
        }
        text={post.text}
        lines={compact ? 4 : undefined}
        textVariant={kok ? 'bodyLarge' : 'body'}
        game={post.game?.appid ? (
          <GameTag
            title={post.game.name}
            image={post.game.image}
            onPress={() => router.push({ pathname: '/game/[id]', params: { id: post.game.appid, name: post.game.name } })}
          />
        ) : null}
        actions={
          <PostActions
            liked={liked}
            likes={count.toLocaleString(locale)}
            comments={(Number(post.replyCount) || 0).toLocaleString(locale)}
            onLike={onLike}
            onComment={open}
          />
        }
      />
    </Pressable>
  );
}

// Akışta gönderiler arası 28 (kit community() feed gap): her satır yarısını
// üstte, yarısını altta taşıyor — FlashList'te aralık öğenin kendisinde.
const s = StyleSheet.create({
  row: { paddingHorizontal: layout.gutter, paddingVertical: K.community.feedGap / 2 },
});

export default memo(PostCard);
