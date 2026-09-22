import React, { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Icon } from '../Icon';
import { Button, CoverImage, PressableScale, Switch, Txt } from './Primitives';
import { DiscountTag, OldPrice, Price, StoreBadge } from './Commerce';
import { GlassView } from './GlassView';
import { PlayButton } from './Media';
import { useLanguage } from '../../context/LanguageContext';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { component as K, control, layout, radius } from '../../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// OYUN DETAYI PARÇALARI — G-07 (kit s1.py game_detail()).
//
// Sunum bileşenleri; veri ekranın kendi sorgularından geliyor (fetchPrices,
// fetchSteamReviews, detay). Tasarımın "tüm zamanların en düşüğü", "PEGI",
// "sistem gereksinimleri", "oyun modu" alanlarının kaynağı yok — bu
// bileşenler onları çizmiyor (plan §Mock politikası).
// ─────────────────────────────────────────────────────────────────────────────

const D = K.detail;

/** Tür çipleri: 30 yükseklik, hap, surface2, 13/600; yatay kayar. Ekran kenarından kenarına; içerik 20 içeride başlıyor (çağıran dolgu vermez). */
export function GenreChips({ items }: { items: string[] }) {
  const { colors } = useDesignTheme();
  if (!items.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {items.map((label, i) => (
        <View key={`${label}_${i}`} style={[styles.chip, { backgroundColor: colors.surface2 }]}>
          <Txt variant="footnoteStrong" numberOfLines={1}>{label}</Txt>
        </View>
      ))}
    </ScrollView>
  );
}

/** Başlık altındaki kenarlı rozet (kit PEGI yuvası): 20 yükseklik, 1 pt iç çizgi, 11/700. */
export function OutlineBadge({ label }: { label: string }) {
  const { colors } = useDesignTheme();
  return (
    <View style={[styles.outline, { borderColor: colors.lineStrong }]}>
      <Txt variant="badge" numberOfLines={1}>{label}</Txt>
    </View>
  );
}

type StorePrice = { key: string; name: string; price: number | null; original?: number | null; discount?: number; isFree?: boolean; url?: string | null };

/**
 * "En İyi Fiyat" kartı (G-07): güncelleme zamanı, 44'lük mağaza, 36 pt fiyat, "Mağazaya Git";
 * altında diğer mağazalar ve en ucuza göre GERÇEK fark ("+₺50"). `onCompareAll` verilirse
 * "N mağazanın tümünü karşılaştır" Fiyat Karşılaştırma'ya (G-08) gidiyor; verilmezse üçten
 * fazla mağazada liste yerinde açılıyor.
 */
export function GamePriceCard({ stores, updated, onOpen, onCompareAll }: {
  stores: StorePrice[]; updated?: string | null; onOpen: (store: StorePrice) => void; onCompareAll?: () => void;
}) {
  const { colors } = useDesignTheme();
  const { t, formatPrice } = useLanguage();
  const [all, setAll] = useState(false);
  const C = D.card;
  const best = stores[0];
  if (!best) return null;
  const others = stores.slice(1);
  const shown = all ? others : others.slice(0, C.visibleOthers);
  const text = (s: StorePrice) => (s.isFree ? t('card.free') : formatPrice(s.price));
  const sale = !best.isFree && (best.discount || 0) > 0 && (best.original || 0) > (best.price || 0);
  return (
    <View style={[styles.card, { backgroundColor: colors.surface1 }]}>
      <View style={styles.cardHeader}>
        <Txt variant="footnoteStrong" style={{ color: colors.text2 }}>{t('v2.bestPrice')}</Txt>
        {updated ? <View style={styles.updated}>
          <Icon name="refresh" size={C.updatedIcon} color={colors.text3} strokeWidth={control.iconStroke} />
          <Txt variant="caption" numberOfLines={1} style={{ color: colors.text3 }}>{updated}</Txt>
        </View> : null}
      </View>
      <View style={styles.cardStore}>
        <StoreBadge store={best.name} size={K.storeBadge.large.size} radius={K.storeBadge.large.radius} font={K.storeBadge.large.font} />
        <View style={styles.flex}>
          <Txt variant="headline" numberOfLines={1}>{best.name}</Txt>
          <Txt variant="caption" numberOfLines={1} style={{ color: colors.text2 }}>{t('detail.cheapest')}</Txt>
        </View>
      </View>
      <View style={styles.cardPrice}>
        <Price value={text(best)} size={36} />
        {sale ? <OldPrice value={formatPrice(best.original)} size={C.oldPrice} /> : null}
        {sale ? <DiscountTag percent={best.discount || 0} size="card" /> : null}
      </View>
      <View style={styles.cardButton}>
        <Button title={t('v2.goToStore')} height={48} iconRight="ext" disabled={!best.url} onPress={() => onOpen(best)} />
      </View>
      {others.length > 0 ? <>
        <View style={[styles.separator, { backgroundColor: colors.line }]} />
        <Txt variant="footnoteStrong" style={[styles.othersTitle, { color: colors.text2 }]}>{t('v2.otherStores')}</Txt>
        <View style={styles.others}>
          {shown.map((s) => {
            const fark = !s.isFree && !best.isFree && s.price != null && best.price != null ? s.price - best.price : 0;
            return (
              <PressableScale key={s.key} accessibilityRole="button" accessibilityLabel={`${s.name}, ${text(s)}`}
                onPress={() => onOpen(s)} disabled={!s.url} style={styles.otherRow}>
                <StoreBadge store={s.name} size={K.storeBadge.small.size} radius={K.storeBadge.small.radius} font={K.storeBadge.small.font} />
                <Txt variant="cardTitle" numberOfLines={1} style={styles.flex}>{s.name}</Txt>
                <View style={styles.otherRight}>
                  <Price value={text(s)} size={15} />
                  {fark > 0 ? <Txt variant="caption" style={[styles.num, { color: colors.text3 }]}>{`+${formatPrice(fark)}`}</Txt> : null}
                </View>
              </PressableScale>
            );
          })}
        </View>
        {onCompareAll ? (
          <Pressable accessibilityRole="button" onPress={onCompareAll} style={styles.link}>
            <Txt variant="cardTitle" style={{ color: colors.red }}>{t('v2.compareAll').replace('{n}', String(stores.length))}</Txt>
            <Icon name="chev" size={C.linkChevron} color={colors.red} strokeWidth={2.4} />
          </Pressable>
        ) : others.length > C.visibleOthers ? (
          <Pressable accessibilityRole="button" onPress={() => setAll((v) => !v)} style={styles.link}>
            <Txt variant="cardTitle" style={{ color: colors.red }}>
              {all ? t('detail.less') : t('v2.compareAll').replace('{n}', String(stores.length))}
            </Txt>
            {/* Açıkken 'Daha az': aşağı okun tersi (ikon setinde yukarı ok yok). */}
            <View style={all ? styles.flip : null}><Icon name={all ? 'chevd' : 'chev'} size={C.linkChevron} color={colors.red} strokeWidth={2.4} /></View>
          </Pressable>
        ) : null}
      </> : null}
    </View>
  );
}

/**
 * Fiyat alarmı kartı (G-08, kit prices() alert): 40'lık zil dairesi, başlık 16/21, açıklama 13/18, anahtar.
 * Anahtar İSTEK LİSTESİ bildirimi (cron/price-alerts: listedeki oyun ucuzlayınca push). Tasarımın
 * "hedef fiyat" adımlayıcısı YOK: sunucuda hedef fiyat sözleşmesi yok (plan §6, soru 17).
 */
export function PriceAlertCard({ on, onChange, title, description }: {
  on: boolean; onChange: (value: boolean) => void; title: string; description: string;
}) {
  const { colors } = useDesignTheme();
  const A = K.prices.alert;
  return (
    <View style={[styles.alert, { backgroundColor: colors.surface1 }]}>
      <View style={[styles.alertIcon, { backgroundColor: colors.surface2 }]}><Icon name="bell" size={A.glyph} color={colors.text} /></View>
      <View style={styles.flex}>
        <Txt variant="cardTitleLarge" numberOfLines={1}>{title}</Txt>
        <Txt variant="footnote" numberOfLines={2} style={{ color: colors.text2 }}>{description}</Txt>
      </View>
      <Switch accessibilityLabel={title} value={on} onValueChange={onChange} />
    </View>
  );
}

/** Fragman kartı: tam genişlik 16:9 (köşe 18), ortada 60'lık oynat, sol altta cam etiket. Oynarken içerik `children`. */
export function TrailerCard({ image, label, playing, onPlay, children }: {
  image?: string | null; label: string; playing: boolean; onPlay: () => void; children?: ReactNode;
}) {
  const { colors } = useDesignTheme();
  const { width } = useWindowDimensions();
  const w = width - layout.gutter * 2;
  const box = { width: w, height: Math.round(w * D.trailerRatio), borderRadius: D.trailerRadius, backgroundColor: colors.surface2 };
  if (playing) return <View style={[styles.trailer, box]}>{children}</View>;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPlay} style={[styles.trailer, box]}>
      <CoverImage source={image ?? undefined} radius={0} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.center}><PlayButton size={K.playButton.sizes[2]} /></View>
      <GlassView pointerEvents="none" style={styles.trailerTag}>
        <Txt variant="captionStrong" numberOfLines={1} style={{ color: colors.white }}>{label}</Txt>
      </GlassView>
    </PressableScale>
  );
}

/** Ekran görüntüsü rayı: 200 × 112, köşe 12, aralık 10. */
export function ScreenshotRail({ shots, onOpen }: { shots: string[]; onOpen: (index: number) => void }) {
  const { t } = useLanguage();
  if (!shots.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shots}>
      {shots.map((url, i) => (
        <PressableScale key={`${url}_${i}`} accessibilityRole="imagebutton" accessibilityLabel={`${t('detail.screenshots')} ${i + 1}`} onPress={() => onOpen(i)}>
          <CoverImage source={url} radius={D.shot.radius} style={styles.shot} />
        </PressableScale>
      ))}
    </ScrollView>
  );
}

/** Bilgi hücreleri: iki sütun, aralık 12; etiket 12/16 text2, değer 15/20 600. */
export function InfoCells({ cells }: { cells: { label: string; value: string }[] }) {
  const { colors } = useDesignTheme();
  const rows: { label: string; value: string }[][] = [];
  for (let i = 0; i < cells.length; i += 2) rows.push(cells.slice(i, i + 2));
  if (!rows.length) return null;
  return (
    <View style={styles.cells}>
      {rows.map((row, r) => (
        <View key={r} style={styles.cellRow}>
          {row.map((c) => (
            <View key={c.label} style={styles.cell}>
              <Txt variant="caption" style={{ color: colors.text2 }}>{c.label}</Txt>
              <Txt variant="cardTitle" numberOfLines={2}>{c.value}</Txt>
            </View>
          ))}
          {row.length === 1 ? <View style={styles.cell} /> : null}
        </View>
      ))}
    </View>
  );
}

/**
 * İnceleme özeti (kit summ): solda büyük sayı, altında etiket ve oy sayısı; sağda çubuklar.
 * Tasarım 5 yıldız dağılımı çiziyor; Steam yalnız olumlu/olumsuz veriyor, çubuklar o ikisi.
 */
export function ReviewSummary({ score, label, labelColor, votes, bars }: {
  score: string; label: string; labelColor: string; votes: string; bars: { label: string; pct: number; text: string }[];
}) {
  const { colors } = useDesignTheme();
  const R = D.review;
  return (
    <View style={[styles.review, { backgroundColor: colors.surface1 }]}>
      <View style={styles.reviewScore}>
        <Txt variant="scoreLarge" numberOfLines={1} adjustsFontSizeToFit style={styles.num}>{score}</Txt>
        <Txt variant="captionStrong" numberOfLines={1} style={{ color: labelColor }}>{label}</Txt>
        <Txt variant="caption" numberOfLines={1} style={[styles.num, { color: colors.text2, marginTop: R.votesTop }]}>{votes}</Txt>
      </View>
      <View style={styles.bars}>
        {bars.map((b) => (
          <View key={b.label} style={styles.barRow}>
            <Txt variant="caption2" numberOfLines={1} style={[styles.barLabel, { color: colors.text2 }]}>{b.label}</Txt>
            <View style={[styles.barTrack, { backgroundColor: colors.pillNeutralSoft }]}>
              <View style={[styles.barFill, { width: `${Math.max(0, Math.min(100, b.pct))}%`, backgroundColor: colors.text }]} />
            </View>
            <Txt variant="caption2" style={[styles.barValue, styles.num, { color: colors.text3 }]}>{b.text}</Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  num: { fontVariant: ['tabular-nums'] },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  chips: { paddingHorizontal: layout.gutter, gap: D.chipGap },
  chip: { height: D.chipHeight, paddingHorizontal: D.chipPadding, borderRadius: radius.pill, justifyContent: 'center' },
  outline: { height: D.badgeHeight, paddingHorizontal: D.badgePadding, borderRadius: D.badgeRadius, borderWidth: D.badgeRing, justifyContent: 'center' },
  card: { padding: D.card.padding, borderRadius: D.card.radius },
  cardHeader: { height: D.card.headerHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: control.buttonGap },
  updated: { flexDirection: 'row', alignItems: 'center', gap: D.card.updatedGap, flexShrink: 1 },
  cardStore: { height: D.card.storeHeight, marginTop: D.card.storeTop, flexDirection: 'row', alignItems: 'center', gap: D.card.storeGap },
  cardPrice: { minHeight: D.card.priceHeight, marginTop: D.card.priceTop, flexDirection: 'row', alignItems: 'center', gap: D.card.priceGap, flexWrap: 'wrap' },
  cardButton: { marginTop: D.card.buttonTop },
  separator: { height: StyleSheet.hairlineWidth, marginTop: D.card.separatorTop },
  othersTitle: { marginTop: D.card.othersTitleTop },
  others: { marginTop: D.card.othersTop },
  otherRow: { height: D.card.otherRow, flexDirection: 'row', alignItems: 'center', gap: D.card.otherGap },
  otherRight: { alignItems: 'flex-end' },
  link: { height: D.card.linkHeight, marginTop: D.card.linkTop, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flip: { transform: [{ rotate: '180deg' }] },
  alert: { minHeight: K.prices.alert.row + K.prices.alert.padding * 2, padding: K.prices.alert.padding, borderRadius: K.prices.alert.radius,
    flexDirection: 'row', alignItems: 'center', gap: K.prices.alert.gap },
  alertIcon: { width: K.prices.alert.icon, height: K.prices.alert.icon, borderRadius: K.prices.alert.icon / 2, alignItems: 'center', justifyContent: 'center' },
  trailer: { overflow: 'hidden' },
  trailerTag: { position: 'absolute', left: D.trailerTag.inset, bottom: D.trailerTag.inset, height: D.trailerTag.height, paddingHorizontal: D.trailerTag.paddingH,
    borderRadius: D.trailerTag.radius, flexDirection: 'row', alignItems: 'center', gap: D.trailerTag.gap },
  shots: { paddingHorizontal: layout.gutter, gap: K.rail.hero[0] },
  shot: { width: D.shot.width, height: D.shot.height },
  cells: { marginTop: D.cellsTop, gap: D.cellGap },
  cellRow: { flexDirection: 'row', gap: D.cellGap },
  cell: { flex: 1, minWidth: 0, gap: D.cellInner },
  review: { height: D.review.height, padding: D.review.padding, borderRadius: D.review.radius, flexDirection: 'row', alignItems: 'center', gap: D.review.gap },
  reviewScore: { width: D.review.scoreWidth, alignItems: 'center' },
  bars: { flex: 1, gap: D.review.barGap },
  barRow: { height: D.review.barRow, flexDirection: 'row', alignItems: 'center', gap: control.buttonGap },
  barLabel: { width: D.review.barLabel },
  barTrack: { flex: 1, height: D.review.bar, borderRadius: D.review.bar / 2, overflow: 'hidden' },
  barFill: { height: D.review.bar, borderRadius: D.review.bar / 2 },
  barValue: { width: D.review.barValue, textAlign: 'right' },
});
