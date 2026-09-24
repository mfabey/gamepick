import type { ImageContentPosition } from 'expo-image';
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Icon } from '../Icon';
import Monogram from '../Monogram';
import { Button, CoverImage, PressableScale, Txt } from './Primitives';
import { DiscountTag, OldPrice, Price, PriceDrop, StoreBadge } from './Commerce';
import { useLanguage } from '../../context/LanguageContext';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { component as K, layout, radius, size, typography } from '../../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// OYUN KART AİLESİ (sunum) — COMPONENTS §4: GameCardSmall, PriceDropCard,
// DealCard ve raylar. Kaynak: kit c.py game_s(), drop_card(), deal_card();
// COMPONENTS §8 ray aralık/adım tablosu.
//
// VERİ ÇEKMİYORLAR: fiyat metinleri çağıranın formatPrice'ından, görsel ve
// mağaza adı çağıranın veri katmanından. "Fiyatı düştü" gibi iddialar yalnız
// çağıran gerçek bir değişim verdiğinde çiziliyor (plan §6 — sahte veri yok).
// ─────────────────────────────────────────────────────────────────────────────

/** Küçük oyun kartı: 106 geniş, kapak 142 (köşe 14); başlık 14/18; altında fiyat 14 + indirim (11/20) ya da alt yazı. */
export function GameCardSmall({ title, image, price, discount, subtitle, onPress, width = size.cover.small.width, imagePosition, recyclingKey }: {
  title: string; image?: string | null; price?: string; discount?: number; subtitle?: string; onPress?: () => void;
  width?: number; imagePosition?: ImageContentPosition; recyclingKey?: string;
}) {
  const { colors } = useDesignTheme();
  const coverHeight = smallCoverHeight(width);
  // Kapak yoksa ya da yüklenemezse MONOGRAM — boş gri kutu değil (ui/GameCard
  // ile aynı kural). Hangi adresin düştüğü tutuluyor: FlashList hücreyi başka
  // bir oyuna yeniden kullandığında yeni adres yine denenir.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showMonogram = !image || failedUri === image;
  // Fiyat da alt yazı da yoksa satır ÇİZİLMİYOR: kit satırı hep doluyken
  // çiziyor; boş satır kartın altında anlamsız bir 22 pt boşluk bırakırdı.
  const hasRow = !!(subtitle || price || discount);
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={{ width }}>
      {showMonogram
        ? <View style={[styles.smallCover, { width, height: coverHeight }]}><Monogram name={title} style={StyleSheet.absoluteFill} /></View>
        : <CoverImage source={image} contentPosition={imagePosition} recyclingKey={recyclingKey}
            onError={() => setFailedUri(image)} style={{ width, height: coverHeight }} />}
      <Txt variant="subhead" numberOfLines={1} style={styles.smallTitle}>{title}</Txt>
      {hasRow ? <View style={styles.smallRow}>
        {subtitle ? <Txt variant="caption" numberOfLines={1} style={{ color: colors.text2 }}>{subtitle}</Txt> : <>
          {price ? <Price value={price} size={14} /> : null}
          {discount ? <DiscountTag percent={discount} size="xs" /> : null}
        </>}
      </View> : null}
    </PressableScale>
  );
}

/** Kapak yüksekliği genişlikten, kitin 106×142 oranıyla. */
export function smallCoverHeight(width: number) {
  return Math.round(width * size.cover.small.height / size.cover.small.width);
}

/** Izgara satırı tahmini için kartın toplam yüksekliği (kapak + başlık [+ satır]). */
export function smallCardHeight(width: number, withRow = false) {
  return smallCoverHeight(width) + K.gameCardSmall.titleTop + (typography.subhead.lineHeight ?? 0)
    + (withRow ? K.gameCardSmall.rowTop + K.gameCardSmall.rowHeight : 0);
}

/** Fiyatı düşen kartı: 264 geniş, köşe 16, surface1; görsel 132; eski fiyat → yeni fiyat, mağaza, düşüş notu. */
export function PriceDropCard({ title, image, oldPrice, price, discount, store, note, onPress, imagePosition }: {
  title: string; image?: string | null; oldPrice?: string; price: string; discount?: number; store?: string | null;
  note?: string; onPress?: () => void; imagePosition?: ImageContentPosition;
}) {
  const { colors } = useDesignTheme();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${title}, ${price}`} onPress={onPress}
      style={[styles.drop, { backgroundColor: colors.surface1 }]}>
      <View>
        <CoverImage source={image ?? undefined} radius={0} contentPosition={imagePosition} style={styles.dropImage} />
        {discount ? <View style={styles.dropDiscount}><DiscountTag percent={discount} /></View> : null}
      </View>
      <View style={styles.dropBody}>
        <Txt variant="cardTitle" numberOfLines={1}>{title}</Txt>
        <View style={styles.dropPrices}>
          {oldPrice ? <><OldPrice value={oldPrice} /><Icon name="chev" size={K.dropCard.arrow} color={colors.text3} strokeWidth={2.4} /></> : null}
          <Price value={price} size={18} />
          <View style={styles.flex} />
          {store ? <StoreBadge store={store} withName /> : null}
        </View>
        {note ? <View style={styles.dropNote}><PriceDrop text={note} /></View> : null}
      </View>
    </PressableScale>
  );
}

/** Fırsat bileti: 300 geniş, köşe 20; üstte kapak 64×84 + başlık + mağaza + indirim, kesikli ayraç ve çentikler, iki sütun fiyat, 44'lük ikincil buton. */
export function DealCard({ title, image, store, discount, lowPrice, normalPrice, actionLabel, onAction, onPress, imagePosition }: {
  title: string; image?: string | null; store?: string | null; discount?: number; lowPrice: string; normalPrice?: string;
  actionLabel: string; onAction: () => void; onPress?: () => void; imagePosition?: ImageContentPosition;
}) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const D = K.dealCard;
  return (
    <View style={[styles.deal, { backgroundColor: colors.surface1 }]}>
      <PressableScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={styles.dealTop}>
        <CoverImage source={image ?? undefined} radius={D.coverRadius} contentPosition={imagePosition} style={styles.dealCover} />
        <View style={styles.dealInfo}>
          <Txt variant="cardTitleLarge" numberOfLines={2}>{title}</Txt>
          {store ? <View style={styles.dealStore}><StoreBadge store={store} withName /></View> : null}
          {discount ? <View style={styles.dealDiscount}><DiscountTag percent={discount} size="lg" /></View> : null}
        </View>
      </PressableScale>
      <View style={styles.dealSeparator}>
        <Svg width="100%" height={D.dash}>
          <Line x1="0" y1={D.dash / 2} x2="100%" y2={D.dash / 2} stroke={colors.ticketDash} strokeWidth={D.dash} strokeDasharray="4 4" />
        </Svg>
        {/* Çentikler sayfa zemini renginde: bilet kenarı delinmiş gibi (kit deal_card()). */}
        <View style={[styles.notch, styles.notchLeft, { backgroundColor: colors.bg }]} />
        <View style={[styles.notch, styles.notchRight, { backgroundColor: colors.bg }]} />
      </View>
      <View style={styles.dealPrices}>
        <View style={styles.flex}>
          <Txt variant="caption" style={{ color: colors.text2 }}>{t('v2.lowestPrice')}</Txt>
          <View style={styles.dealPriceRow}><Price value={lowPrice} size={28} /></View>
        </View>
        <View style={styles.flex}>
          <Txt variant="caption" style={{ color: colors.text2 }}>{t('v2.normalPrice')}</Txt>
          <View style={styles.dealPriceRow}>{normalPrice ? <OldPrice value={normalPrice} size={17} /> : null}</View>
        </View>
      </View>
      <View style={styles.dealButton}><Button title={actionLabel} variant="secondary" height={44} onPress={onAction} /></View>
    </View>
  );
}

type RailKind = keyof typeof K.rail;

/**
 * Yatay ray (COMPONENTS §8): yan boşluk 20, kart aralığı ve yapışma adımı türüne göre;
 * kaydırma çubuğu gizli, `decelerationRate="fast"`. FlatList: uzun raylarda yalnız
 * görünen kartlar çiziliyor (performans önceliği).
 */
export function Rail<T>({ kind, data, renderItem, keyExtractor, initialNumToRender = 4 }: {
  kind: RailKind; data: readonly T[]; renderItem: ListRenderItem<T>; keyExtractor: (item: T, index: number) => string;
  initialNumToRender?: number;
}) {
  const [gap, step] = K.rail[kind];
  const Separator = useCallback(() => <View style={{ width: gap }} />, [gap]);
  return (
    <FlatList horizontal data={data} renderItem={renderItem} keyExtractor={keyExtractor}
      ItemSeparatorComponent={Separator} showsHorizontalScrollIndicator={false}
      decelerationRate="fast" snapToInterval={step || undefined} snapToAlignment="start"
      initialNumToRender={initialNumToRender} windowSize={5}
      contentContainerStyle={styles.rail} />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  rail: { paddingHorizontal: layout.gutter },
  smallCover: { borderRadius: radius.cover, overflow: 'hidden' },
  smallTitle: { marginTop: K.gameCardSmall.titleTop },
  smallRow: { height: K.gameCardSmall.rowHeight, marginTop: K.gameCardSmall.rowTop, flexDirection: 'row', alignItems: 'center', gap: K.gameCardSmall.gap },
  drop: { width: size.cover.drop.width, borderRadius: K.dropCard.radius, overflow: 'hidden' },
  dropImage: { width: size.cover.drop.width, height: size.cover.drop.imageHeight },
  dropDiscount: { position: 'absolute', left: K.dropCard.discountInset, top: K.dropCard.discountInset, flexDirection: 'row' },
  dropBody: { padding: K.dropCard.padding },
  dropPrices: { height: K.dropCard.priceRow, marginTop: K.dropCard.top, flexDirection: 'row', alignItems: 'center', gap: K.dropCard.gap },
  dropNote: { marginTop: K.dropCard.top },
  deal: { width: size.cover.deal.width, borderRadius: K.dealCard.radius },
  dealTop: { flexDirection: 'row', gap: K.dealCard.gap, paddingTop: K.dealCard.paddingTop, paddingHorizontal: K.dealCard.paddingH, paddingBottom: K.dealCard.paddingBottom },
  dealCover: { width: K.dealCard.coverWidth, height: K.dealCard.coverHeight },
  dealInfo: { flex: 1, minWidth: 0 },
  dealStore: { marginTop: K.dropCard.top, flexDirection: 'row' },
  dealDiscount: { marginTop: 'auto', flexDirection: 'row' },
  dealSeparator: { height: 1, marginHorizontal: K.dealCard.paddingH, justifyContent: 'center' },
  notch: { position: 'absolute', top: -K.dealCard.notch / 2, width: K.dealCard.notch, height: K.dealCard.notch, borderRadius: K.dealCard.notch / 2 },
  notchLeft: { left: K.dealCard.notchOffset },
  notchRight: { right: K.dealCard.notchOffset },
  dealPrices: { flexDirection: 'row', gap: K.dealCard.columnsGap, paddingTop: K.dealCard.pricesTop, paddingHorizontal: K.dealCard.paddingH },
  dealPriceRow: { height: K.dealCard.priceRow, justifyContent: 'center' },
  dealButton: { paddingTop: K.dealCard.buttonTop, paddingHorizontal: K.dealCard.paddingH, paddingBottom: K.dealCard.buttonBottom },
});
