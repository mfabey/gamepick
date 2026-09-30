import { memo, useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useLanguage } from '../context/LanguageContext';
import { togglePostLike } from '../api/social';
import DevBadge from './DevBadge';
import { Comment } from './ui/Social';

// ─────────────────────────────────────────────────────────────────────────────
// Konuşmadaki yanıt — G-13 (kit c.py comment()).
//
// Gönderi ile AYNI veri (yanıt da bir gönderi), farklı görünüm: konuşmada
// satırlar daha sıkı, avatar 40, eylemler 28 pt (kalp + "Yanıtla").
//
// İYİMSER BEĞENİ gönderideki kuralın aynısı: dokunuşta anında, hata olursa
// geri alınıyor. Hesapsız kullanıcı kayda yönlendiriliyor.
//
// ⋯ GÖRÜNÜR KAPI: yanıt da kullanıcı içeriği (Guideline 1.2). Tasarımın
// yorumunda ⋯ yok; "gizli jest tek yol olamaz" kuralı tasarımı yener.
// ─────────────────────────────────────────────────────────────────────────────
function CommentCard({ reply, rootAuthorUid, onRequireAccount, onReply, onMenu }) {
  const { t, lang, locale } = useLanguage();
  const router = useRouter();
  const [liked, setLiked] = useState(!!reply.likedByMe);
  const [count, setCount] = useState(Number(reply.likeCount) || 0);

  const onLike = useCallback(async () => {
    if (onRequireAccount && onRequireAccount()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      const r = await togglePostLike(reply.id);
      setLiked(!!r.liked);
      setCount(Number(r.likeCount) || 0);
    } catch {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
    }
  }, [liked, reply.id, onRequireAccount]);

  const name = reply.author?.displayName || reply.author?.username || t('post.someone');
  const username = reply.author?.username;

  return (
    <Comment
      avatar={reply.author?.avatar}
      name={name}
      time={zaman(reply.at, lang)}
      text={reply.text}
      likes={count.toLocaleString(locale)}
      liked={liked}
      onLike={onLike}
      onReply={onReply}
      onMore={onMenu ? () => onMenu(reply.author) : undefined}
      onProfile={username ? () => router.push(`/u/${username}`) : undefined}
      badge={<DevBadge user={reply.author} username={username} isDeveloper={reply.author?.isDeveloper} size={11} />}
      // "Yazar" hapı: yanıt kök gönderinin sahibinden geliyorsa (kit `op`).
      author={!!rootAuthorUid && reply.author?.uid === rootAuthorUid}
    />
  );
}

function zaman(ts, lang) {
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

export default memo(CommentCard);
