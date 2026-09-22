import type { ImageContentPosition } from 'expo-image';
import React, { type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, type IconName } from '../Icon';
import { CoverImage, PressableScale, Txt } from './Primitives';
import { GlassView } from './GlassView';
import { LiveTime } from './Social';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { component as K, control, gradients, layout, radius, size } from '../../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// MEDYA VE HABER — COMPONENTS.md §6. Kaynak: kit c.py video/short/news_feat/
// news_row/media_img/playc/ovl.
//
// GÖRSEL ÜSTÜ ÖĞELER TEMA BAĞIMSIZ: zemin oyun görseli; etiket koyu, yazı
// beyaz. `colors.white` / `overlayTag` açık temada da aynı.
//
// VERİSİ OLMAYAN SATIR ÇİZİLMİYOR: bugünkü video kaynağı (Steam fragmanı)
// süre, izlenme ve yaratıcı vermiyor. Bu alanlar isteğe bağlı; verilmezse
// yerleri boş kalmıyor, satır hiç yok (plan §6 — sahte veri yok).
// ─────────────────────────────────────────────────────────────────────────────

/** Görsel üstü etiket: 22 yükseklik, köşe 6, `rgba(0,0,0,.62)`, 11/700 beyaz; sol üst ya da sağ alt (10). */
export function OverlayTag({ label, icon, placement = 'topLeft' }: { label: string; icon?: IconName; placement?: 'topLeft' | 'bottomRight' }) {
  const { colors } = useDesignTheme();
  const O = K.overlayTag;
  return (
    <View pointerEvents="none" style={[styles.overlay, placement === 'topLeft' ? styles.topLeft : styles.bottomRight, { backgroundColor: colors.overlayTag }]}>
      {icon ? <Icon name={icon} size={O.icon} color={colors.white} strokeWidth={control.iconStroke} /> : null}
      <Txt variant="badge" numberOfLines={1} style={[styles.num, { color: colors.white }]}>{label}</Txt>
    </View>
  );
}

/** Oynat düğmesi: cam daire 44 ya da 48, dolu `playf` boyun %40'ı, 2 pt sağa. Rayda `blurred={false}` (plan §6.1). */
export function PlayButton({ size: d = K.playButton.sizes[0], blurred = true }: { size?: (typeof K.playButton.sizes)[number]; blurred?: boolean }) {
  const { colors } = useDesignTheme();
  return (
    <GlassView pointerEvents="none" blurred={blurred} style={[styles.play, { width: d, height: d, borderRadius: d / 2 }]}>
      <View style={{ marginLeft: K.playButton.nudge }}>
        <Icon name="playf" size={Math.round(d * K.playButton.iconRatio)} color={colors.white} fill={colors.white} strokeWidth={0} />
      </View>
    </GlassView>
  );
}

/**
 * Video kartı: 280 geniş, küçük resim 158 (köşe 16); tür etiketi, süre, ortada 44'lük oynat.
 * Başlık 15/20 iki satır (yeri ayrılmış), "yaratıcı · bilgi" 13/18; isteğe bağlı avatar ve oyun çipi.
 * `width="100%"`: dikey listede tam genişlik, oran korunur.
 */
export function VideoCard({ title, image, type, duration, creator, meta, avatar, game, width = size.cover.video.width, blurred = false, onPress, recyclingKey }: {
  title: string; image?: string | null; type?: string; duration?: string; creator?: string; meta?: string;
  avatar?: ReactNode; game?: { title: string; image?: string | null } | null;
  width?: number | '100%'; blurred?: boolean; onPress?: () => void; recyclingKey?: string;
}) {
  const { colors } = useDesignTheme();
  const V = K.videoCard;
  const line = [creator, meta].filter(Boolean).join(' · ');
  const info = (
    <View style={styles.flex}>
      {/* Kit başlığa iki satırlık yer ayırıyor: rayda yan yana kartlar hizalansın diye. Tek sütun
          listede hizalanacak komşu yok; tek satırlık adın altında boş satır kalıyordu (emülatörde görüldü). */}
      <Txt variant="cardTitle" numberOfLines={2} style={width === '100%' ? undefined : styles.videoTitle}>{title}</Txt>
      {line ? <Txt variant="footnote" numberOfLines={1} style={{ marginTop: V.lineTop, color: colors.text2 }}>{line}</Txt> : null}
    </View>
  );
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={[title, line, duration].filter(Boolean).join(', ')} onPress={onPress}
      style={{ width: width as DimensionValue }}>
      <View style={[styles.videoThumb, { backgroundColor: colors.surface2 }]}>
        <CoverImage source={image ?? undefined} radius={0} recyclingKey={recyclingKey} style={StyleSheet.absoluteFill} />
        {type ? <OverlayTag label={type} /> : null}
        {duration ? <OverlayTag label={duration} placement="bottomRight" /> : null}
        <View pointerEvents="none" style={styles.center}><PlayButton size={K.playButton.sizes[0]} blurred={blurred} /></View>
      </View>
      {avatar ? <View style={[styles.videoInfoRow, { marginTop: V.infoTop }]}>{avatar}{info}</View>
        : <View style={{ marginTop: V.infoTop }}>{info}</View>}
      {game ? <View style={[styles.videoGame, { backgroundColor: colors.surface1 }]}>
        <CoverImage source={game.image ?? undefined} radius={V.chipThumbRadius} style={{ width: V.chipThumb, height: V.chipThumb }} />
        <Txt variant="captionStrong" numberOfLines={1} style={[styles.shrink, { color: colors.text2 }]}>{game.title}</Txt>
      </View> : null}
    </PressableScale>
  );
}

/** Kısa video: 132 × 234, köşe 16, alt degrade; başlık 13/17 beyaz iki satır, izlenme 12/600 `onArt` + dolu `playf`. */
export function ShortCard({ title, image, views, width = size.cover.short.width, height = size.cover.short.height, onPress, recyclingKey }: {
  title: string; image?: string | null; views?: string; width?: number; height?: number; onPress?: () => void; recyclingKey?: string;
}) {
  const { colors } = useDesignTheme();
  const S = K.shortCard;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={[title, views].filter(Boolean).join(', ')} onPress={onPress}
      style={[styles.short, { width, height, backgroundColor: colors.surface2 }]}>
      <CoverImage source={image ?? undefined} radius={0} recyclingKey={recyclingKey} style={StyleSheet.absoluteFill} />
      <LinearGradient pointerEvents="none" colors={gradients.shortCard.colors} locations={gradients.shortCard.locations} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.shortBody}>
        <Txt variant="shortTitle" numberOfLines={2} style={{ color: colors.white }}>{title}</Txt>
        {views ? <View style={styles.shortViews}>
          <Icon name="playf" size={S.playIcon} color={colors.onArt} fill={colors.onArt} strokeWidth={0} />
          <Txt variant="captionStrong" numberOfLines={1} style={[styles.num, { color: colors.onArt }]}>{views}</Txt>
        </View> : null}
      </View>
    </PressableScale>
  );
}

/** Haber bilgi satırı (kit news_feat/news_row): kategori 600 · `LiveTime` · kaynak `text3`; 16 yükseklik, 12 pt. */
function NewsMeta({ category, time, live, source }: { category?: string; time: string; live?: boolean; source?: string }) {
  const { colors } = useDesignTheme();
  return (
    <View style={styles.newsMeta}>
      {category ? <><Txt variant="captionStrong" numberOfLines={1} style={styles.shrinkNone}>{category}</Txt>
        <Txt variant="caption" style={{ color: colors.text3 }}>·</Txt></> : null}
      <LiveTime text={time} live={live} />
      {source ? <Txt variant="caption" numberOfLines={1} style={[styles.shrink, { color: colors.text3 }]}>{`· ${source}`}</Txt> : null}
    </View>
  );
}

/** Öne çıkan haber: genişlik min(350, ekran − 40); görsel 196 (köşe 18); bilgi satırı, başlık 18/24 iki satır, isteğe bağlı açıklama. */
export function NewsFeature({ title, image, category, time, live, source, description, onPress, imagePosition }: {
  title: string; image?: string | null; category?: string; time: string; live?: boolean; source?: string; description?: string;
  onPress?: () => void; imagePosition?: ImageContentPosition;
}) {
  const { colors } = useDesignTheme();
  const { width: screen } = useWindowDimensions();
  const N = K.newsFeature;
  const width = Math.min(N.width, screen - layout.gutter * 2);
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={{ width }}>
      <CoverImage source={image ?? undefined} radius={N.radius} contentPosition={imagePosition} style={{ width, height: N.imageHeight }} />
      <View style={{ marginTop: N.metaTop }}><NewsMeta category={category} time={time} live={live} source={source} /></View>
      <Txt variant="newsTitle" numberOfLines={2} style={{ marginTop: N.titleTop }}>{title}</Txt>
      {description ? <Txt variant="subheadRegular" numberOfLines={2} style={{ marginTop: N.descTop, color: colors.text2 }}>{description}</Txt> : null}
    </PressableScale>
  );
}

/** Haber satırı: 72 yükseklik; küçük resim 96 × 72 (köşe 12), bilgi satırı, başlık 15/20 iki satır (üstünde 6). */
export function NewsRow({ title, image, category, time, live, source, onPress, imagePosition }: {
  title: string; image?: string | null; category?: string; time: string; live?: boolean; source?: string;
  onPress?: () => void; imagePosition?: ImageContentPosition;
}) {
  const N = K.newsRow;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={styles.newsRow}>
      <CoverImage source={image ?? undefined} radius={N.thumbRadius} contentPosition={imagePosition} style={{ width: N.thumbWidth, height: N.thumbHeight }} />
      <View style={styles.flex}>
        <NewsMeta category={category} time={time} live={live} source={source} />
        <Txt variant="cardTitle" numberOfLines={2} style={{ marginTop: N.titleTop }}>{title}</Txt>
      </View>
    </PressableScale>
  );
}

/** Paylaşılan görsel: köşe 14; isteğe bağlı sol üst cam etiket (24, köşe 7, 12/600 beyaz). */
export function MediaImage({ image, width, height, tag, tagIcon, onPress, imagePosition, style }: {
  image?: string | null; width: number | '100%'; height: number; tag?: string; tagIcon?: IconName; onPress?: () => void;
  imagePosition?: ImageContentPosition; style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useDesignTheme();
  const M = K.mediaImage;
  const body = (
    <>
      <CoverImage source={image ?? undefined} radius={M.radius} contentPosition={imagePosition} style={{ width: '100%', height }} />
      {tag ? <GlassView pointerEvents="none" style={styles.mediaTag}>
        {tagIcon ? <Icon name={tagIcon} size={K.overlayTag.icon} color={colors.white} strokeWidth={control.iconStroke} /> : null}
        <Txt variant="captionStrong" numberOfLines={1} style={{ color: colors.white }}>{tag}</Txt>
      </GlassView> : null}
    </>
  );
  const box = [{ width: width as DimensionValue, height }, style];
  return onPress
    ? <PressableScale accessibilityRole="imagebutton" accessibilityLabel={tag} onPress={onPress} style={box}>{body}</PressableScale>
    : <View style={box}>{body}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  shrinkNone: { flexShrink: 0 },
  num: { fontVariant: ['tabular-nums'] },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  overlay: { position: 'absolute', height: K.overlayTag.height, paddingHorizontal: K.overlayTag.paddingH, borderRadius: K.overlayTag.radius,
    flexDirection: 'row', alignItems: 'center', gap: K.overlayTag.gap },
  topLeft: { top: K.overlayTag.inset, left: K.overlayTag.inset },
  bottomRight: { right: K.overlayTag.inset, bottom: K.overlayTag.inset },
  play: { alignItems: 'center', justifyContent: 'center' },
  videoThumb: { width: '100%', aspectRatio: size.cover.video.width / size.cover.video.height, borderRadius: radius.card, overflow: 'hidden' },
  videoTitle: { height: K.videoCard.titleHeight },
  videoInfoRow: { flexDirection: 'row', gap: K.videoCard.avatarGap },
  videoGame: { height: K.videoCard.chipHeight, marginTop: K.videoCard.gameTop, paddingLeft: K.videoCard.chipPaddingLeft, paddingRight: K.videoCard.chipPaddingRight,
    borderRadius: K.videoCard.chipRadius, flexDirection: 'row', alignItems: 'center', gap: K.videoCard.chipGap, alignSelf: 'flex-start', maxWidth: '100%' },
  short: { borderRadius: K.shortCard.radius, overflow: 'hidden' },
  shortBody: { position: 'absolute', left: K.shortCard.inset, right: K.shortCard.inset, bottom: K.shortCard.inset },
  shortViews: { flexDirection: 'row', alignItems: 'center', gap: K.shortCard.viewsGap, marginTop: K.shortCard.viewsTop },
  newsMeta: { height: K.newsFeature.metaHeight, flexDirection: 'row', alignItems: 'center', gap: K.newsFeature.metaGap },
  newsRow: { height: K.newsRow.height, flexDirection: 'row', gap: K.newsRow.gap },
  mediaTag: { position: 'absolute', top: K.mediaImage.tagInset, left: K.mediaImage.tagInset, height: K.mediaImage.tagHeight, paddingHorizontal: K.mediaImage.tagPadding,
    borderRadius: K.mediaImage.tagRadius, flexDirection: 'row', alignItems: 'center', gap: K.mediaImage.tagGap },
});
