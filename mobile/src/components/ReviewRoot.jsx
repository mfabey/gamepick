import { View, StyleSheet } from 'react-native';
import DevBadge from './DevBadge';
import { Icon } from './Icon';
import { Txt } from './ui/Primitives';
import { Badge, GameTag, Post, PostHeader } from './ui/Social';
import { useLanguage } from '../context/LanguageContext';
import { useDesignTheme } from '../theme/useDesignTheme';
import { layout, space } from '../theme/tokens';

// Konunun kökü: tam inceleme, sunucudan doğrulanmış saat ve yazar moderasyonu.
export default function ReviewRoot({ review, onOpenGame, onAuthor, onMenu }) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  if (!review) return null;
  const author = review.author;
  const name = author?.displayName || author?.username || '';
  return <View style={s.wrap}>
    <View style={s.context}>
      <Icon name="reply" size={14} color={colors.text3} />
      <Txt variant="footnote" style={{ color: colors.text3 }}>{t('post.reviewThread')}</Txt>
    </View>
    <Post text={review.text} textVariant="bodyLarge"
      header={<PostHeader avatar={author?.avatar} name={name}
        handle={author?.username ? '@' + author.username : ''} time=""
        onProfile={onAuthor} onMore={onMenu ? () => onMenu(author) : undefined}
        badge={<>
          <DevBadge user={author} username={author?.username} isDeveloper={author?.isDeveloper} size={11} />
          <Badge kind="verified" label={Math.round(Number(review.hours) || 0) + ' ' + t('rev.hoursShort')} />
        </>} />}
      game={<GameTag title={review.gameName || String(review.appid)} image={review.image}
        status={review.recommended ? 'recommends' : 'notRecommends'} onPress={onOpenGame} />} />
  </View>;
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: layout.gutter, paddingBottom: space[20] },
  context: { flexDirection: 'row', alignItems: 'center', gap: space[8], paddingVertical: space[12] },
});
