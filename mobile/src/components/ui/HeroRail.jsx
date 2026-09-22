import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';
import { useWishlist } from '../../context/WishlistContext';
import { usePrice } from '../../hooks/usePrice';
import { useKapakOlcum } from '../../hooks/useKapakOlcum';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { gradients, size, space } from '../../theme/tokens';
import PosterImage from '../PosterImage';
import { Button, IconButton, Txt } from './Primitives';

function HeroCard({ game, width, onExpand }) {
  const { colors } = useDesignTheme();
  const { t, formatPrice } = useLanguage();
  const { isWatched, toggle } = useWishlist();
  const price = usePrice(game);
  const [ref, open] = useKapakOlcum(onExpand, game);
  const free = game.isFree || price?.isFree;
  return <View ref={ref} collapsable={false} style={[s.card, { width, backgroundColor: colors.surface2 }]}>
    <PosterImage uri={game.image} recyclingKey={String(game.id)} contentFit="cover" style={StyleSheet.absoluteFill} />
    <LinearGradient {...gradients.heroCard} style={StyleSheet.absoluteFill} />
    <View style={[s.tag, { backgroundColor: colors.darkGlass }]}><Txt variant="captionStrong" style={{ color: colors.white }}>{t('home.trend')}</Txt></View>
    <View style={s.content}>
      <Txt variant="heroTitle" numberOfLines={2} style={{ color: colors.white }}>{game.name}</Txt>
      {game.rating > 0 && <Txt variant="footnote" style={{ color: colors.onArt }}>★ {Number(game.rating).toFixed(1)}</Txt>}
      <View style={s.prices}>
        <Txt variant="title1" style={{ color: colors.white }}>{free ? t('card.free') : price?.price != null ? formatPrice(price.price) : '—'}</Txt>
        {!free && price?.discount > 0 && <Txt variant="footnoteStrong" style={{ color: colors.onArt }}>−{price.discount}%</Txt>}
      </View>
      <View style={s.actions}>
        <View style={{ flex: 1 }}><Button title={t('v2.viewGame')} height={44} onPress={open} /></View>
        <IconButton icon="heart" label={t(isWatched(game) ? 'wishlist.added' : 'wishlist.add')} selected={isWatched(game)} onPress={() => toggle(game)} style={{ backgroundColor: colors.surface1, borderRadius: 22 }} />
      </View>
    </View>
  </View>;
}
export default function HeroRail({ games, onExpand }) {
  const { colors } = useDesignTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [active, setActive] = useState(0);
  const width = Math.min(size.cover.hero.width, windowWidth - 40);
  const step = width + 10;
  const items = games.slice(0, 5);
  if (!items.length) return null;
  return <View style={s.rail}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={step} decelerationRate="fast"
      onMomentumScrollEnd={event => setActive(Math.max(0, Math.min(items.length - 1, Math.round(event.nativeEvent.contentOffset.x / step))))}
      contentContainerStyle={s.track}>
      {items.map(game => <HeroCard key={game.id} game={game} width={width} onExpand={onExpand} />)}
    </ScrollView>
    {/* PageDots (COMPONENTS §3): seçili 18×6 kırmızı — kırmızının izinli
        kullanımlarından "seçili durum" —, diğerleri 6×6, aralık 6, karuselden 12. */}
    <View style={s.dots}>{items.map((game, index) => <View key={game.id} style={[s.dot, { width: index === active ? 18 : 6, backgroundColor: index === active ? colors.red : colors.pageDotOff }]} />)}</View>
  </View>;
}
const s = StyleSheet.create({
  rail: { marginTop: 16 }, track: { paddingHorizontal: 20, gap: space[10] },
  card: { height: size.cover.hero.height, borderRadius: 22, overflow: 'hidden' },
  tag: { position: 'absolute', top: 16, left: 16, borderRadius: 8, padding: 8 },
  content: { position: 'absolute', bottom: 20, left: 20, right: 20, gap: 4 },
  prices: { minHeight: 28, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { marginTop: 12, flexDirection: 'row', gap: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space[6], marginTop: space[12] },
  dot: { height: 6, borderRadius: 3 },
});
