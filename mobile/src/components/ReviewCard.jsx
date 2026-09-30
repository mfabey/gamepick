import { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';

import DevBadge from './DevBadge';
import { Icon } from './Icon';
import { Txt } from './ui/Primitives';
import { Badge, GameTag, Post, PostHeader } from './ui/Social';
import { useLanguage } from '../context/LanguageContext';
import { useDesignTheme } from '../theme/useDesignTheme';
import { useKapakOlcum } from '../hooks/useKapakOlcum';
import { component as K, control, layout } from '../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Doğrulanmış inceleme kartı — 2.0'da gönderiyle AYNI dil (G-10 Post).
//
// İKİ YERDE KULLANILIYOR: Topluluk akışı ve anasayfa akışı. Ortak bileşen
// olmasının sebebi GÖRÜNÜM BİRLİĞİ — aynı içerik iki ekranda farklı görünseydi
// kullanıcı bunları farklı şeyler sanardı. 2.0'da gönderiyle de aynı iskelet:
// başlık, metin, oyun etiketi. Tasarımın gönderisindeki "Tavsiye ediyor"
// durumu (kit post(..., game=('bg3', ..., 'rec'))) burada incelemenin kendisi.
//
// DOĞRULANMIŞ SAAT kartın var oluş sebebi: yeşil kalkanlı rozet. Sayı
// kullanıcıdan değil, sunucunun Steam'den okuduğu kütüphaneden geliyor.
//
// ⋯ = ŞİKÂYET VE ENGELLEME (App Store Guideline 1.2): kullanıcı içeriğinin
// gösterildiği HER yüzeyde. Uzun basma aynı menüyü açan kısayol.
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

export default function ReviewCard({ review, onPress, onLongPress, onMenu, onEdit, onExpand, style }) {
  const { colors } = useDesignTheme();
  const { t, lang } = useLanguage();
  const name = review.author?.displayName || review.author?.username || '?';
  const username = review.author?.username;

  // BÜYÜME GEÇİŞİ — anasayfa akışındaki inceleme kartı da bir oyuna gidiyor.
  // Kaynak çerçeve oyun etiketi: AYNI oyunun kapağı ve `contentFit: cover`
  // sayesinde çerçeve büyürken görsel esnemiyor, kırpılıyor. useMemo: kart
  // FlashList içinde ve her render'da yeni bir nesne, kancanın useCallback'ini
  // de her render'da tazelerdi.
  const oyunYuk = useMemo(() => ({
    id: `rawg_${review.appid}`, appid: review.appid,
    name: review.gameName || '', image: review.image,
  }), [review.appid, review.gameName, review.image]);
  const [kapakRef, buyuterekAc] = useKapakOlcum(onExpand, oyunYuk, oyunYuk);
  const ac = onExpand ? buyuterekAc : onPress;

  return (
    <Pressable onPress={ac} onLongPress={onLongPress} delayLongPress={400} accessibilityRole="button" style={[s.row, style]}>
      <Post
        header={
          <PostHeader
            avatar={review.author?.avatar}
            name={name}
            handle={username ? `@${username}` : ''}
            time={review.at ? timeAgo(review.at, lang) : ''}
            badge={<>
              <DevBadge user={review.author} username={username} isDeveloper={review.author?.isDeveloper} size={11} />
              <Badge kind="verified" label={`${Math.round(review.hours)} ${t('rev.hoursShort')}`} />
            </>}
            onMore={onMenu ? () => onMenu(review.author) : undefined}
          />
        }
        text={review.text}
        lines={6}
        game={
          // Ölçüm için sarmalayıcı View: expo-image'ın measureInWindow'u
          // platformlar arasında güvenilir değil. collapsable={false} şart.
          <View ref={kapakRef} collapsable={false} style={s.tag}>
            <GameTag title={review.gameName || String(review.appid)} image={review.image}
              status={review.recommended ? 'recommends' : 'notRecommends'} onPress={ac} />
          </View>
        }
        actions={onEdit ? (
          <Pressable accessibilityRole="button" onPress={onEdit} hitSlop={control.buttonGap} style={s.edit}>
            <Icon name="edit" size={K.comment.heart} color={colors.text2} />
            <Txt variant="footnoteStrong" style={{ color: colors.text2 }}>{t('rev.edit')}</Txt>
          </Pressable>
        ) : undefined}
      />
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { paddingHorizontal: layout.gutter, paddingVertical: K.community.feedGap / 2 },
  tag: { alignSelf: 'flex-start', maxWidth: '100%' },
  edit: { height: K.comment.actionsHeight, flexDirection: 'row', alignItems: 'center', gap: K.comment.heartGap, alignSelf: 'flex-start' },
});
