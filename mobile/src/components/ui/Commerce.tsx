import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Icon, type IconName } from '../Icon';
import { Button, PressableScale, Txt } from './Primitives';
import { useLanguage } from '../../context/LanguageContext';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { component as K, control, layout, priceStyle, storeBadges, typography } from '../../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// FİYAT VE MAĞAZA — COMPONENTS.md §4. Kaynak: kit k.py disc/old/price/drop/
// mono/store/status, c.py store_row/stat/chart; G-08 "En İyi Fiyat" kartı.
//
// BU BİLEŞENLER VERİ ÇEKMİYOR. Fiyat metni çağıranın `formatPrice`inden
// hazır geliyor ("₺599"); böylece kimlik eşleştirme, önbellek ve dile göre
// biçim tek yerde (usePrice / LanguageContext) kalıyor.
//
// FİYAT YEŞİL DEĞİL: kit `price()` metin renginde çiziyor. Yeşil yalnız
// indirim etiketi ve düşüş notu (README'deki "fiyatlar yeşil" cümlesi
// kaynakla çelişiyor; doğruluk sırasında kaynak kazanır).
// ─────────────────────────────────────────────────────────────────────────────

type DiscountSize = keyof typeof K.discount.sizes;

/** Yeşil indirim etiketi: 22 pt / 12 (varsayılan); 20/11, 24/13, 26/14. G-08 büyük boyu 28/15. */
export function DiscountTag({ percent, size = 'sm', style }: { percent: number; size?: DiscountSize | 'xl'; style?: StyleProp<ViewStyle> }) {
  const { colors } = useDesignTheme();
  const { formatDiscount } = useLanguage();
  const label = formatDiscount(percent);
  if (!label) return null;
  const [font, height] = size === 'xl' ? [15, 28] : K.discount.sizes[size];
  return (
    <View style={[styles.discount, { height, backgroundColor: colors.green }, style]}>
      <Text allowFontScaling={false} style={[styles.discountText, { fontSize: font, color: colors.onGreen }]}>{label}</Text>
    </View>
  );
}

/** Fiyat: display ailesi, 700, -0.02em, eşit genişlikli rakam. Renk varsayılanı metin. */
export function Price({ value, size = 16, color, style }: {
  value: string; size?: Parameters<typeof priceStyle>[0]; color?: string; style?: StyleProp<TextStyle>;
}) {
  const { colors } = useDesignTheme();
  return <Text allowFontScaling={false} numberOfLines={1} style={[priceStyle(size, color ?? colors.text), style]}>{value}</Text>;
}

/** Eski fiyat: 13 pt `text3`, üstü çizili (boy değişebilir: 12, 14, 17). Görsel üstünde tema bağımsız renk verilir. */
export function OldPrice({ value, size = K.oldPrice, color }: { value: string; size?: number; color?: string }) {
  const { colors } = useDesignTheme();
  return <Text allowFontScaling={false} numberOfLines={1}
    style={[styles.old, { fontSize: size, color: color ?? colors.text3 }]}>{value}</Text>;
}

/** Değişim notu: düşüş yeşil + `down`, artış turuncu + `up`; 12/600, ikon boy+2. TrendCard "yükseliyor" `text2` verir. */
export function PriceDrop({ text, direction = 'down', size = 12, color: tone }: { text: string; direction?: 'down' | 'up'; size?: number; color?: string }) {
  const { colors } = useDesignTheme();
  const color = tone ?? (direction === 'down' ? colors.green : colors.orange);
  return (
    <View style={styles.drop}>
      <Icon name={direction} size={size + K.priceDrop.icon} color={color} strokeWidth={K.priceDrop.stroke} />
      <Txt variant="captionStrong" numberOfLines={1} style={{ color, fontSize: size }}>{text}</Txt>
    </View>
  );
}

// Sunucu mağaza adları tasarımın anahtarlarıyla birebir değil ("Xbox", "Humble Bundle").
// Eşleşmeyen mağaza baş harfiyle, nötr zeminde çiziliyor.
export function storeInfo(name?: string | null) {
  const raw = String(name || '').trim();
  const n = raw.toLowerCase();
  const key = n.includes('steam') ? 'Steam' : n.includes('epic') ? 'Epic Games' : n.includes('gog') ? 'GOG'
    : n.includes('humble') ? 'Humble' : n.includes('fanatical') ? 'Fanatical' : n.includes('playstation') ? 'PlayStation Store'
    : n.includes('nintendo') || n.includes('eshop') ? 'Nintendo eShop' : n.includes('microsoft') ? 'Microsoft Store'
    : n.includes('xbox') ? 'Xbox Store' : null;
  const known = key ? storeBadges[key] : null;
  return { key, label: raw || key || '', letter: known?.letter ?? (raw.charAt(0).toUpperCase() || '?'), bg: known?.bg ?? null };
}

/** Mağaza monogramı (16/5/9); `withName` ile yanında 12/500 `text2` ad, aralık 5. */
export function StoreBadge({ store, size = K.storeBadge.size, radius = K.storeBadge.radius, font = K.storeBadge.font, withName, label }: {
  store?: string | null; size?: number; radius?: number; font?: number; withName?: boolean; label?: string;
}) {
  const { colors } = useDesignTheme();
  const info = storeInfo(store);
  const mono = (
    // Monogram renkleri mağaza kimliği (tokens.storeBadges): tema bağımsız, harf her zaman açık.
    <View accessible={false} style={[styles.mono, { width: size, height: size, borderRadius: radius, backgroundColor: info.bg ?? colors.surface3 }]}>
      <Text allowFontScaling={false} style={[styles.monoText, { fontSize: font }]}>{info.letter}</Text>
    </View>
  );
  if (!withName) return mono;
  return (
    <View style={styles.storeWithName}>
      {mono}
      <Txt variant="captionMedium" numberOfLines={1} style={{ color: colors.text2 }}>{label ?? info.label}</Txt>
    </View>
  );
}

/** Mağaza satırı: 64 pt; 40'lık monogram, ad 15/600 + alt satır 12 `text2`, sağda fiyat 16 + ek bilgi, ok. */
export function StoreRow({ store, name, subtitle, price, right, separator = false, onPress }: {
  store?: string | null; name?: string; subtitle?: string; price: string; right?: React.ReactNode;
  separator?: boolean; onPress?: () => void;
}) {
  const { colors } = useDesignTheme();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${name ?? storeInfo(store).label}, ${price}`} onPress={onPress} style={styles.storeRow}>
      {separator && <View pointerEvents="none" style={[styles.storeSeparator, { backgroundColor: colors.line }]} />}
      <StoreBadge store={store} size={K.storeBadge.row.size} radius={K.storeBadge.row.radius} font={K.storeBadge.row.font} />
      <View style={styles.flex}>
        <Txt variant="cardTitle" numberOfLines={1}>{name ?? storeInfo(store).label}</Txt>
        {subtitle ? <Txt variant="caption" numberOfLines={1} style={{ color: colors.text2 }}>{subtitle}</Txt> : null}
      </View>
      <View style={styles.storeRight}>
        <Price value={price} size={16} />
        {right}
      </View>
      <Icon name="chev" size={K.storeRow.chevron} color={colors.text3} strokeWidth={2.4} />
    </PressableScale>
  );
}

/** İstatistik kutusu: 84 pt, köşe 14; ikon 18, değer 18/24 700, etiket 12/16 `text2`. */
export function StatTile({ value, label, icon, style }: { value: string; label: string; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  const { colors } = useDesignTheme();
  return (
    <View accessible accessibilityLabel={`${value} ${label}`} style={[styles.stat, { backgroundColor: colors.surface1 }, style]}>
      {icon && <Icon name={icon} size={K.statTile.icon} color={colors.text2} />}
      <Txt variant="statValue" numberOfLines={1} style={[styles.statValue, { marginTop: icon ? K.statTile.valueTopWithIcon : K.statTile.valueTopNoIcon }]}>{value}</Txt>
      <Txt variant="caption" numberOfLines={1} style={{ color: colors.text2 }}>{label}</Txt>
    </View>
  );
}

/** Oyun durumu: Oynuyor (yeşil + nokta), Tamamladı (nötr + tik), Tavsiye ediyor (altın + yıldız). */
export function StatusPill({ kind }: { kind: 'playing' | 'done' | 'recommends' }) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const tone = kind === 'playing' ? { bg: colors.greenTint, fg: colors.green }
    : kind === 'recommends' ? { bg: colors.goldTint, fg: colors.gold } : { bg: colors.pillNeutralSoft, fg: colors.text };
  const label = t(kind === 'playing' ? 'v2.statusPlaying' : kind === 'done' ? 'v2.statusDone' : 'v2.statusRecommends');
  return (
    <View style={[styles.status, { backgroundColor: tone.bg }]}>
      {kind === 'playing' && <View style={[styles.statusDot, { backgroundColor: tone.fg }]} />}
      {kind === 'done' && <Icon name="checkc" size={K.statusPill.icon} color={tone.fg} strokeWidth={control.iconStroke} />}
      {kind === 'recommends' && <Icon name="star" size={K.statusPill.star} color={tone.fg} fill={tone.fg} strokeWidth={1} />}
      <Txt variant="captionStrong" numberOfLines={1} style={{ color: tone.fg }}>{label}</Txt>
    </View>
  );
}

/** G-08 "En İyi Fiyat" kartı: yeşil rozet + güncelleme zamanı, 48'lik mağaza, 40 pt fiyat, not, 50 pt buton. */
export function BestPriceCard({ store, storeSubtitle, price, oldPrice, discount, updated, note, noteKind = 'drop', actionLabel, onAction, footnote }: {
  store?: string | null; storeSubtitle?: string; price: string; oldPrice?: string; discount?: number; updated?: string;
  /** Fiyat notu: düşüş ("Son 24 saatte ₺200 düştü") ya da rekor düşük (kupa ikonu). */
  note?: string; noteKind?: 'drop' | 'record'; actionLabel: string; onAction: () => void; footnote?: string;
}) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const info = storeInfo(store);
  return (
    <View style={[styles.best, { backgroundColor: colors.surface1 }]}>
      <View style={styles.bestHeader}>
        <View style={[styles.bestBadge, { backgroundColor: colors.greenTint }]}>
          <Icon name="trophy" size={K.bestPrice.badgeIcon} color={colors.green} strokeWidth={control.iconStroke} />
          <Txt variant="captionStrong" style={{ color: colors.green, fontWeight: '700' }}>{t('v2.bestPrice')}</Txt>
        </View>
        {updated ? <Txt variant="caption" numberOfLines={1} style={{ color: colors.text3 }}>{updated}</Txt> : null}
      </View>
      <View style={styles.bestStore}>
        <StoreBadge store={store} size={K.bestPrice.storeBadge} radius={K.bestPrice.storeRadius} font={K.bestPrice.storeFont} />
        <View style={styles.flex}>
          <Txt variant="headline" numberOfLines={1}>{info.label}</Txt>
          {storeSubtitle ? <Txt variant="caption" numberOfLines={1} style={{ color: colors.text2 }}>{storeSubtitle}</Txt> : null}
        </View>
      </View>
      <View style={styles.bestPrice}>
        <Price value={price} size={40} />
        {oldPrice ? <OldPrice value={oldPrice} size={K.bestPrice.oldPrice} /> : null}
        {discount ? <DiscountTag percent={discount} size="xl" /> : null}
      </View>
      {note ? <View style={styles.bestNote}>
        {noteKind === 'drop'
          ? <PriceDrop text={note} size={13} />
          : <View style={styles.drop}>
              <Icon name="trophy" size={13} color={colors.text2} strokeWidth={control.iconStroke} />
              <Txt variant="footnote" numberOfLines={1} style={{ color: colors.text2 }}>{note}</Txt>
            </View>}
      </View> : null}
      <View style={styles.bestButton}><Button title={actionLabel} height={K.bestPrice.button} iconRight="ext" onPress={onAction} /></View>
      {footnote ? <Txt variant="caption" style={[styles.bestFoot, { color: colors.text3 }]}>{footnote}</Txt> : null}
    </View>
  );
}

/**
 * Fiyat geçmişi grafiği (kit chart()): basamaklı çizgi 2 pt `text`, alan beyaz %6,
 * kesikli ızgara 3/5, en düşük nokta yeşil (5 + 3 pt halka) ve üstünde etiket, son nokta hale + beyaz.
 * Değerler dışarıdan; sahte veriyle çizilmez (plan §6 — fiyat geçmişi sunucu işi).
 */
export function PriceChart({ values, lowLabel, width = K.chart.width, height = K.chart.height }: {
  values: number[]; lowLabel?: string; width?: number; height?: number;
}) {
  const { colors } = useDesignTheme();
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const pad = 8;
  const y = (v: number) => Math.round((pad + (hi - v) / span * (height - pad * 2)) * 10) / 10;
  const n = values.length;
  const xs = Array.from({ length: n + 1 }, (_, i) => Math.round(i * width / n * 10) / 10);
  let line = `M${xs[0]} ${y(values[0])}`;
  for (let i = 1; i < n; i++) line += ` H${xs[i]} V${y(values[i])}`;
  line += ` H${width}`;
  const area = `${line} V${height} H0 Z`;
  const low = values.indexOf(lo);
  const lowX = Math.round((xs[low] + xs[low + 1]) / 2 * 10) / 10;
  const lastY = y(values[n - 1]);
  const grid = [0.25, 0.5, 0.75].map((f) => y(lo + span * f));
  const bleed = K.chart.haloRadius;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={lowLabel} style={{ width, height }}>
      {/* Kit SVG'si `overflow: visible`: son noktanın halesi kenardan taşıyor. react-native-svg Android'de
          taşanı kırpıyor (emülatörde yarım daire görüldü); tuval hale yarıçapı kadar her yöne büyütülüp geri kaydırılıyor. */}
      <Svg width={width + bleed * 2} height={height + bleed * 2} viewBox={`${-bleed} ${-bleed} ${width + bleed * 2} ${height + bleed * 2}`}
        style={[styles.chartCanvas, { left: -bleed, top: -bleed }]}>
        {grid.map((gy) => <Path key={gy} d={`M0 ${gy} H${width}`} stroke={colors.chartGrid} strokeWidth={1} strokeDasharray={K.chart.grid} />)}
        <Path d={area} fill={colors.chartArea} />
        <Path d={line} fill="none" stroke={colors.text} strokeWidth={2} strokeLinejoin="round" />
        <Circle cx={lowX} cy={y(lo)} r={K.chart.lowRadius} fill={colors.green} stroke={colors.surface1} strokeWidth={K.chart.lowRing} />
        <Circle cx={width} cy={lastY} r={K.chart.haloRadius} fill={colors.chartHalo} />
        <Circle cx={width} cy={lastY} r={K.chart.lowRadius} fill={colors.text} stroke={colors.surface1} strokeWidth={K.chart.lowRing} />
      </Svg>
      {lowLabel ? <Text allowFontScaling={false} style={[styles.chartLabel, { left: lowX - layout.minTouch, top: y(lo) - K.chart.labelOffset, color: colors.green }]}>{lowLabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  chartCanvas: { position: 'absolute' },
  // alignSelf YOK: satırda ortalanmalı (emülatörde GameTag'de 5 dp yukarıda ölçüldü). Sütunda gerilmesin diye
  // çağıran kit gibi `display: flex` (RN'de flexDirection: 'row') kutuya koyuyor.
  discount: { paddingHorizontal: K.discount.paddingH, borderRadius: K.discount.radius, alignItems: 'center', justifyContent: 'center' },
  discountText: { ...typography.badge, fontVariant: ['tabular-nums'] },
  old: { textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
  drop: { flexDirection: 'row', alignItems: 'center', gap: K.priceDrop.gap },
  mono: { alignItems: 'center', justifyContent: 'center' },
  // tema-bagimsiz: magaza monogrami kendi renginde, harf her zaman acik (kit mono())
  monoText: { ...typography.storeMono, color: '#F5F5F7' },
  storeWithName: { flexDirection: 'row', alignItems: 'center', gap: K.storeBadge.gap },
  storeRow: { height: K.storeRow.height, paddingLeft: K.storeRow.paddingLeft, paddingRight: K.storeRow.paddingRight, flexDirection: 'row', alignItems: 'center', gap: K.storeRow.gap },
  storeSeparator: { position: 'absolute', top: 0, left: K.storeRow.separator, right: 0, height: StyleSheet.hairlineWidth },
  storeRight: { alignItems: 'flex-end', gap: K.storeRow.rightGap },
  stat: { height: K.statTile.height, padding: K.statTile.padding, borderRadius: K.statTile.radius, gap: K.statTile.gap },
  statValue: { fontVariant: ['tabular-nums'] },
  status: { height: K.statusPill.height, paddingHorizontal: K.statusPill.paddingH, borderRadius: K.statusPill.radius, flexDirection: 'row', alignItems: 'center', gap: K.statusPill.gap },
  statusDot: { width: K.statusPill.dot, height: K.statusPill.dot, borderRadius: K.statusPill.dot / 2 },
  best: { marginHorizontal: layout.gutter, padding: K.bestPrice.padding, borderRadius: K.bestPrice.radius },
  bestHeader: { height: K.bestPrice.headerHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bestBadge: { height: K.bestPrice.headerHeight, paddingHorizontal: K.bestPrice.badgePadding, borderRadius: K.discount.radius, flexDirection: 'row', alignItems: 'center', gap: K.bestPrice.badgeGap },
  bestStore: { height: K.bestPrice.storeHeight, marginTop: K.bestPrice.storeTop, flexDirection: 'row', alignItems: 'center', gap: K.bestPrice.storeGap },
  bestPrice: { minHeight: K.bestPrice.priceHeight, marginTop: K.bestPrice.priceTop, flexDirection: 'row', alignItems: 'center', gap: K.bestPrice.priceGap, flexWrap: 'wrap' },
  bestNote: { height: K.bestPrice.noteHeight, marginTop: K.bestPrice.noteTop, justifyContent: 'center' },
  bestButton: { marginTop: K.bestPrice.buttonTop },
  bestFoot: { marginTop: K.bestPrice.footTop, textAlign: 'center' },
  chartLabel: { position: 'absolute', width: layout.minTouch * 2, textAlign: 'center', ...typography.badge, fontVariant: ['tabular-nums'] },
});
