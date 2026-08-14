import { useEffect, useMemo } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Paylaşılan nabız animasyonu — tüm iskelet blokları TEK loop'u paylaşır
// (native driver, ref-sayımlı). Ekranda iskelet yokken loop durur.
// ─────────────────────────────────────────────────────────────────────────────
let sharedValue = null;
let loopAnim = null;
let refCount = 0;

function ensureCreated() {
  if (!sharedValue) {
    sharedValue = new Animated.Value(0);
    loopAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(sharedValue, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(sharedValue, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
  }
  return sharedValue;
}

function acquire() {
  refCount += 1;
  if (refCount === 1) { ensureCreated(); loopAnim.start(); }
}
function release() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && loopAnim) loopAnim.stop();
}

function usePulse() {
  const value = ensureCreated();          // render'da idempotent (yan etki yok)
  useEffect(() => { acquire(); return release; }, []);
  return value;
}

// ── Temel iskelet bloğu ──
export function Skeleton({ style }) {
  const pulse = usePulse();
  const opacity = useMemo(
    () => pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.8] }),
    [pulse]
  );
  return <Animated.View style={[styles.box, style, { opacity }]} />;
}

// ── Oyun grid iskeleti (Oyunlar / Kütüphane) ──
export function GamesGridSkeleton({ count = 8 }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.cell}>
          <Skeleton style={styles.card} />
        </View>
      ))}
    </View>
  );
}

// ── Haber listesi iskeleti ──
export function NewsListSkeleton({ rows = 6 }) {
  return (
    <View>
      <Skeleton style={styles.newsFeatured} />
      <View style={styles.chipsRow}>
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} style={styles.chip} />)}
      </View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.newsRow}>
          <Skeleton style={styles.newsThumb} />
          <View style={{ flex: 1, gap: spacing.sm, paddingTop: 2 }}>
            <Skeleton style={styles.lineSm} />
            <Skeleton style={styles.line} />
            <Skeleton style={styles.lineXs} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Topluluk akışı iskeleti ──
// Ölçüldü: bu ekran 645ms boyunca ortada dönen bir çarktan ibaretti ve
// GERÇEK bir engelleyici yükleme durumu var (loading ? spinner : liste).
// Çubuk şeridi + yazma çubuğu + kartlar, gerçek düzenin ritmini taşıyor.
export function FeedSkeleton({ rows = 5 }) {
  return (
    <View>
      <View style={styles.feedTabs}>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} style={styles.feedTab} />)}
      </View>
      <Skeleton style={styles.composeBar} />
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.feedCard}>
          <View style={styles.feedRow}>
            <Skeleton style={styles.feedThumb} />
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Skeleton style={styles.line} />
              <Skeleton style={styles.lineSm} />
            </View>
          </View>
          <Skeleton style={styles.lineWide} />
          <Skeleton style={styles.lineMid} />
        </View>
      ))}
    </View>
  );
}

// ── Oyun detayı: BÖLÜM iskeletleri ──
// TAM EKRAN İSKELET DEĞİL — bilerek. Ekran kapağı ve adı rota
// parametrelerinden ANINDA çiziyor (detail?.image || image). Tam ekran bir
// iskelet, zaten ekranda duran içeriğin üstünü örterdi. 868ms boyunca boş
// kalan yalnızca ağdan gelen bölümler: tür, ekran görüntüleri, açıklama.
export function GenreChipsSkeleton() {
  return (
    <View style={styles.genreWrap}>
      {[74, 58, 88, 64].map((w, i) => <Skeleton key={i} style={[styles.genreChip, { width: w }]} />)}
    </View>
  );
}

export function ShotStripSkeleton() {
  return (
    <View style={styles.shotRow}>
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} style={styles.shot} />)}
    </View>
  );
}

export function TextBlockSkeleton({ lines = 4 }) {
  return (
    <View style={{ gap: spacing.sm }}>
      {Array.from({ length: lines }).map((_, i) => (
        // Son satır kısa: gerçek paragraflar öyle biter, eşit uzunlukta
        // satırlar iskeleti tablo gibi gösteriyordu.
        <Skeleton key={i} style={i === lines - 1 ? styles.lineMid : styles.lineWide} />
      ))}
    </View>
  );
}

// Sabit '#1b1f26' idi — koyu paletin bgInput değerinin TA KENDİSİ. Yani
// belirteç zaten vardı, iskelet onu atlıyordu ve açık temada bütün yükleme
// ekranları beyaz zeminde koyu gri kutulara dönüyordu.
const SK = colors.bgInput;

const styles = StyleSheet.create({
  box: { backgroundColor: SK, borderRadius: radius.sm },

  // grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingTop: 6 },
  cell: { width: '50%', paddingHorizontal: 6, paddingBottom: spacing.md },
  card: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.lg },

  // news
  newsFeatured: { marginHorizontal: spacing.lg, height: 210, borderRadius: radius.lg },
  chipsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 14 },
  chip: { width: 72, height: 34, borderRadius: radius.pill },
  newsRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  newsThumb: { width: 108, height: 76, borderRadius: radius.md },
  lineSm: { width: 60, height: 10, borderRadius: 4 },
  line: { width: '92%', height: 14, borderRadius: 4 },
  lineXs: { width: '55%', height: 11, borderRadius: 4 },
  lineWide: { width: '100%', height: 12, borderRadius: 4 },
  lineMid: { width: '62%', height: 12, borderRadius: 4 },

  // feed (topluluk) — ölçüler reviews.jsx'teki gerçek kartlarla aynı ritimde
  feedTabs: { flexDirection: 'row', gap: spacing.s8, paddingHorizontal: spacing.lg, paddingBottom: spacing.s12 },
  feedTab: { flex: 1, height: 40, borderRadius: radius.md },
  composeBar: { marginHorizontal: spacing.lg, height: 46, borderRadius: radius.pill, marginBottom: spacing.s12 },
  feedCard: {
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    padding: spacing.s16, borderRadius: radius.lg, gap: spacing.sm,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  feedRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginBottom: spacing.s4 },
  feedThumb: { width: 44, height: 44, borderRadius: radius.sm },

  // oyun detayı bölümleri
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  genreChip: { height: 30, borderRadius: radius.pill },
  shotRow: { flexDirection: 'row', gap: spacing.s12 },
  shot: { width: 208, height: 117, borderRadius: radius.md },
});
