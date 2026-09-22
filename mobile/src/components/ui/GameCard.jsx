import { memo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import PosterImage from '../PosterImage';
import Monogram from '../Monogram';
import { Icon } from '../Icon';
import { Txt, PressableScale } from './Primitives';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { size, gameCard as C } from '../../theme/tokens';
import { usePrice } from '../../hooks/usePrice';
import { useKapakOlcum } from '../../hooks/useKapakOlcum';
import { useLanguage } from '../../context/LanguageContext';
import { useWishlist } from '../../context/WishlistContext';
import { turAdi } from '../../services/genreName';

// Data, identity and transition contracts stay shared with the existing cards.
export default memo(function DesignGameCard({ game, onPress, onExpand, onDismiss }) {
  const { colors } = useDesignTheme();
  const { t, formatPrice } = useLanguage();
  const { isWatched, toggle } = useWishlist();
  const price = usePrice(game);
  const [coverRef, expand] = useKapakOlcum(onExpand, game);
  const [failedUri, setFailedUri] = useState(null);
  const watched = isWatched(game);
  const free = game.isFree || price?.isFree;
  const discount = !free && price?.discount > 0 ? price.discount : null;
  const genre = (game.genres || []).slice(0, 1).map(g => turAdi(g, t)).filter(Boolean).join('');
  const metadata = [genre, game.rating > 0 ? `★ ${Number(game.rating).toFixed(1)}` : null].filter(Boolean).join(' · ');
  return <View style={s.card}>
    <View ref={coverRef} collapsable={false} style={[s.cover, { backgroundColor: colors.surface2 }]}>
      <PressableScale accessibilityRole="button" accessibilityLabel={game.name}
        onPress={onExpand ? expand : onPress} style={StyleSheet.absoluteFill}>
        {!game.image || failedUri === game.image
          ? <Monogram name={game.name} style={StyleSheet.absoluteFill} />
          : <PosterImage uri={game.image} recyclingKey={String(game.id)} contentFit="cover"
              style={StyleSheet.absoluteFill} onError={() => setFailedUri(game.image)} />}
      </PressableScale>
      <Pressable accessibilityRole="button" accessibilityLabel={watched ? t('wishlist.added') : t('wishlist.add')}
        accessibilityState={{ selected: watched }} hitSlop={5}
        onPress={() => toggle(game)} style={[s.heart, { backgroundColor: colors.surface1 }]}>
        <Icon name="heart" size={17} color={watched ? colors.red : colors.text} fill={watched ? colors.red : 'none'} />
      </Pressable>
      {discount ? <View style={[s.discount, { backgroundColor: colors.green }]}>
        <Txt variant="captionStrong" style={{ color: colors.onGreen }}>−{discount}%</Txt>
      </View> : null}
      {onDismiss ? <Pressable accessibilityRole="button" accessibilityLabel={t('home.notInterested')}
        onPress={() => onDismiss(game)} onLongPress={() => Alert.alert(t('home.whyThis'), t('home.whyThisBody'))}
        hitSlop={5} style={[s.dismiss, { backgroundColor: colors.surface1 }]}>
        <Txt variant="headline">×</Txt>
      </Pressable> : null}
    </View>
    <Pressable accessibilityRole="button" onPress={onExpand ? expand : onPress}>
      <Txt variant="cardTitle" numberOfLines={1} style={s.title}>{game.name}</Txt>
      <Txt variant="caption" numberOfLines={1} style={{ color: colors.text2 }}>{metadata || ' '}</Txt>
      <View style={s.prices}>
        <Txt variant="cardTitleLarge" numberOfLines={1} style={{ color: discount ? colors.green : colors.text }}>
          {free ? t('card.free') : price?.price != null ? formatPrice(price.price) : '—'}
        </Txt>
        {discount && price.original > price.price ? <Txt variant="caption" numberOfLines={1}
          style={{ color: colors.text3, textDecorationLine: 'line-through', flexShrink: 1 }}>{formatPrice(price.original)}</Txt> : null}
      </View>
    </Pressable>
  </View>;
});

const s = StyleSheet.create({
  card: { width: size.cover.medium.width },
  cover: { height: size.cover.medium.height, borderRadius: 14, overflow: 'hidden' },
  heart: { position: 'absolute', right: 8, top: 8, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dismiss: { position: 'absolute', left: 8, top: 8, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  discount: { position: 'absolute', left: 8, bottom: 8, borderRadius: 6, paddingHorizontal: C.badgePaddingH, paddingVertical: C.badgePaddingV },
  title: { marginTop: 8 },
  prices: { minHeight: 22, marginTop: C.priceGap, flexDirection: 'row', alignItems: 'center', gap: C.priceGap },
});
