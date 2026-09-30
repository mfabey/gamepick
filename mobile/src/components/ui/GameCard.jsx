import { memo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import PosterImage from '../PosterImage';
import Monogram from '../Monogram';
import { Txt, PressableScale, IconButton } from './Primitives';
import { HeartButton } from './HeartButton';
import { DiscountTag, OldPrice, Price, StoreBadge } from './Commerce';
import { Icon } from '../Icon';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { radius, size, component as K } from '../../theme/tokens';
import { usePrice } from '../../hooks/usePrice';
import { useKapakOlcum } from '../../hooks/useKapakOlcum';
import { useLanguage } from '../../context/LanguageContext';
import { useWishlist } from '../../context/WishlistContext';
import { turAdi } from '../../services/genreName';

// Data, identity and transition contracts stay shared with the existing cards.
export default memo(function DesignGameCard({ game, onPress, onExpand, onDismiss, onLongPress, style }) {
  const router = useRouter();
  const { colors } = useDesignTheme();
  const { t, locale, formatPrice } = useLanguage();
  const { isWatched, toggle } = useWishlist();
  const price = usePrice(game);
  const [coverRef, expand] = useKapakOlcum(onExpand, game);
  const [failedUri, setFailedUri] = useState(null);
  const watched = isWatched(game);
  const free = game.isFree || price?.isFree;
  const discount = !free && price?.discount > 0 ? price.discount : null;
  const genre = (game.genres || []).slice(0, 1).map(g => turAdi(g, t)).filter(Boolean).join('');
  const rating = game.rating > 0 ? Number(game.rating).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : null;
  const hasPrice = !free && price?.price != null;
  // ITAD yanıtı mağazayı adlandırıyor; adı yoksa fiyat Steam Store API'sinden (card-price yedeği).
  const store = hasPrice ? price.storeName || 'Steam' : null;
  const open = onExpand ? expand : onPress || (() => router.push({
    pathname: '/game/[id]', params: { id: String(game.id), name: game.name,
      image: game.image || '', slug: game.rawgSlug || '', appid: game.appid ? String(game.appid) : '',
      hasSteam: game.hasSteam ? '1' : '' },
  }));
  return <View style={[s.card, style]}>
    <View ref={coverRef} collapsable={false} style={[s.cover, { backgroundColor: colors.surface2 }]}>
      <PressableScale accessibilityRole="button" accessibilityLabel={game.name}
        onPress={open} onLongPress={onLongPress} style={StyleSheet.absoluteFill}>
        {!game.image || failedUri === game.image
          ? <Monogram name={game.name} style={StyleSheet.absoluteFill} />
          : <PosterImage uri={game.image} recyclingKey={String(game.id)} contentFit="cover"
              style={StyleSheet.absoluteFill} onError={() => setFailedUri(game.image)} />}
      </PressableScale>
      {/* Rayda çok kart var: cam bulanıklıksız (plan §6.1). */}
      <HeartButton selected={watched} onPress={() => toggle(game)} blurred={false}
        size={K.heart.card.size} iconSize={K.heart.card.icon} style={s.heart} />
      {discount ? <DiscountTag percent={discount} style={s.discount} /> : null}
      {onDismiss ? <IconButton icon="x" label={t('home.notInterested')} variant="onArt" blurred={false}
        size={K.heart.card.size} iconSize={K.heart.card.icon - 1}
        onPress={() => onDismiss(game)} onLongPress={() => Alert.alert(t('home.whyThis'), t('home.whyThisBody'))}
        style={s.dismiss} /> : null}
    </View>
    <Pressable accessibilityRole="button" onPress={open} onLongPress={onLongPress}>
      <Txt variant="cardTitle" numberOfLines={1} style={s.title}>{game.name}</Txt>
      {/* Kit game_m(): "tür · ★ puan" 12 text2, 11 pt altın yıldız; 16 yükseklik. */}
      <View style={s.meta}>
        {!!genre && <Txt variant="caption" numberOfLines={1} style={[s.shrink, { color: colors.text2 }]}>{genre}</Txt>}
        {!!genre && !!rating && <Txt variant="caption" style={{ color: colors.text2 }}>·</Txt>}
        {!!rating && <>
          <Icon name="star" size={K.gameCardMedium.star} color={colors.gold} fill={colors.gold} strokeWidth={1} />
          <Txt variant="caption" style={[s.num, { color: colors.text2 }]}>{rating}</Txt>
        </>}
      </View>
      {/* Fiyat metin renginde (kit price()); yeşil yalnız indirim etiketi. Sağda 16 pt mağaza rozeti. */}
      <View style={s.prices}>
        <Price value={free ? t('card.free') : hasPrice ? formatPrice(price.price) : '—'} size={16} />
        {discount && price.original > price.price ? <OldPrice value={formatPrice(price.original)} size={12} /> : null}
        <View style={s.flex} />
        {store ? <StoreBadge store={store} size={K.gameCardMedium.badge} /> : null}
      </View>
    </Pressable>
  </View>;
});

const s = StyleSheet.create({
  card: { width: size.cover.medium.width },
  cover: { height: size.cover.medium.height, borderRadius: radius.cover, overflow: 'hidden' },
  heart: { position: 'absolute', right: K.heart.card.inset, top: K.heart.card.inset },
  dismiss: { position: 'absolute', left: K.heart.card.inset, top: K.heart.card.inset },
  discount: { position: 'absolute', left: K.gameCardMedium.discountInset, bottom: K.gameCardMedium.discountInset },
  title: { marginTop: K.gameCardMedium.titleTop },
  meta: { height: K.gameCardMedium.metaHeight, marginTop: K.gameCardMedium.metaTop, flexDirection: 'row', alignItems: 'center', gap: K.gameCardMedium.metaGap },
  prices: { height: K.gameCardMedium.priceRow, marginTop: K.gameCardMedium.priceTop, flexDirection: 'row', alignItems: 'center', gap: K.gameCardMedium.priceGap },
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  num: { fontVariant: ['tabular-nums'] },
});
