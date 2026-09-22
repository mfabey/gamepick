import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';
import { useWishlist } from '../../context/WishlistContext';
import { usePrice } from '../../hooks/usePrice';
import { useKapakOlcum } from '../../hooks/useKapakOlcum';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { colors as darkPalette, gradients, layout, radius, size, space, component as K } from '../../theme/tokens';
import { turAdi } from '../../services/genreName';
import PosterImage from '../PosterImage';
import { Icon } from '../Icon';
import { Button, Txt } from './Primitives';
import { GlassView } from './GlassView';
import { HeartButton } from './HeartButton';
import { DiscountTag, OldPrice, Price } from './Commerce';
import { PageDots } from './Navigation';

// ─────────────────────────────────────────────────────────────────────────────
// ÖNE ÇIKAN KART RAYI — kit c.py hero(): 334×420, köşe 22, `gradients.heroCard`.
// Sol üst etiket 28 pt cam (14/14), alt blok kenarlardan 18 içeride: başlık
// 28/32, bilgi 13/18 `onArt`, fiyat satırı 28 (üstünde 12), eylemler (üstünde
// 14, aralık 10): birincil 44 + 44 pt kalp. Ray: aralık 10, 344'lük adım.
//
// Bu raydaki kartlar AZ (en çok beş) ve kaydırılan uzun bir liste değil:
// camlar gerçek bulanıklıkla çiziliyor (plan §6.1'in istisnası).
// Metin görselin üstünde: renkler TEMA BAĞIMSIZ beyaz/onArt.
// ─────────────────────────────────────────────────────────────────────────────
function HeroCard({ game, width, onExpand }) {
  const { colors } = useDesignTheme();
  const { t, locale, formatPrice, formatStoreAt } = useLanguage();
  const { isWatched, toggle } = useWishlist();
  const price = usePrice(game);
  const [ref, open] = useKapakOlcum(onExpand, game);
  const free = game.isFree || price?.isFree;
  const discounted = !free && price?.discount > 0 && price.original > price.price;
  // ITAD yanıtı mağazayı adlandırıyor; adı yoksa fiyat Steam Store API'sinden (card-price yedeği).
  const store = !free && price?.price != null ? price.storeName || 'Steam' : null;
  const genre = (game.genres || []).slice(0, 2).map((g) => turAdi(g, t)).filter(Boolean).join(' · ');
  return <View ref={ref} collapsable={false} style={[s.card, { width, backgroundColor: colors.surface2 }]}>
    <PosterImage uri={game.image} recyclingKey={String(game.id)} contentFit="cover" style={StyleSheet.absoluteFill} />
    <LinearGradient {...gradients.heroCard} style={StyleSheet.absoluteFill} />
    <GlassView style={s.tag}>
      <Icon name="spark" size={K.hero.tagIcon} color={colors.white} strokeWidth={2} />
      <Txt variant="captionStrong" numberOfLines={1} style={{ color: colors.white }}>{t('home.trend')}</Txt>
    </GlassView>
    <View style={s.content}>
      <Txt variant="heroTitle" numberOfLines={2} style={{ color: colors.white }}>{game.name}</Txt>
      <View style={s.meta}>
        {!!genre && <Txt variant="footnote" numberOfLines={1} style={{ color: colors.onArt, flexShrink: 1 }}>{genre}</Txt>}
        {game.rating > 0 && <>
          {!!genre && <Txt variant="footnote" style={{ color: colors.onArt }}>·</Txt>}
          <Icon name="star" size={K.hero.metaStar} color={colors.gold} fill={colors.gold} strokeWidth={1} />
          <Txt variant="footnote" style={{ color: colors.onArt }}>{Number(game.rating).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</Txt>
        </>}
      </View>
      {/* Kit hero(): fiyat 22 beyaz, eski fiyat 14, indirim (13/24), "Steam'de" 12 onArt.
          Eski fiyat görselin üstünde: koyu paletin text3'ü, tema bağımsız. */}
      <View style={s.prices}>
        <Price value={free ? t('card.free') : price?.price != null ? formatPrice(price.price) : '—'} size={22} color={colors.white} />
        {discounted && <OldPrice value={formatPrice(price.original)} size={14} color={darkPalette.text3} />}
        {discounted && <DiscountTag percent={price.discount} size="md" />}
        {!!store && <Txt variant="caption" numberOfLines={1} style={[s.store, { color: colors.onArt }]}>{formatStoreAt(store)}</Txt>}
      </View>
      <View style={s.actions}>
        <View style={s.flex}><Button title={t('v2.viewGame')} height={44} onImage onPress={open} /></View>
        <HeartButton selected={isWatched(game)} onPress={() => toggle(game)}
          size={K.heart.hero.size} iconSize={K.heart.hero.icon} />
      </View>
    </View>
  </View>;
}

export default function HeroRail({ games, onExpand }) {
  const { width: windowWidth } = useWindowDimensions();
  const [active, setActive] = useState(0);
  // 375 pt pencerede (iPad uyumluluk, SE) 334 + 20 kenar sığıyor; daha dar ekranda kart daralıyor.
  const width = Math.min(size.cover.hero.width, windowWidth - layout.gutter * 2);
  const step = width + space[10];
  const items = games.slice(0, 5);
  if (!items.length) return null;
  return <View style={s.rail}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={step} decelerationRate="fast"
      onMomentumScrollEnd={(event) => setActive(Math.max(0, Math.min(items.length - 1, Math.round(event.nativeEvent.contentOffset.x / step))))}
      contentContainerStyle={s.track}>
      {items.map((game) => <HeroCard key={game.id} game={game} width={width} onExpand={onExpand} />)}
    </ScrollView>
    <PageDots count={items.length} active={active} />
  </View>;
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  rail: { marginTop: K.home.heroTop },
  track: { paddingHorizontal: layout.gutter, gap: space[10] },
  card: { height: size.cover.hero.height, borderRadius: radius.hero, overflow: 'hidden' },
  tag: { position: 'absolute', top: space[14], left: space[14], height: K.hero.tagHeight, paddingHorizontal: space[10], borderRadius: radius.md,
    flexDirection: 'row', alignItems: 'center', gap: space[6] },
  content: { position: 'absolute', left: space[18], right: space[18], bottom: space[18] },
  meta: { marginTop: space[4], flexDirection: 'row', alignItems: 'center', gap: K.hero.metaGap },
  prices: { height: K.hero.priceRow, marginTop: space[12], flexDirection: 'row', alignItems: 'center', gap: space[8] },
  store: { marginLeft: K.hero.storeGap, flexShrink: 1 },
  actions: { marginTop: space[14], flexDirection: 'row', gap: space[10] },
});
