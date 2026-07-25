import { useEffect, useMemo } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import { radius, spacing } from '../theme';

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
          <View style={{ flex: 1, gap: 8, paddingTop: 2 }}>
            <Skeleton style={styles.lineSm} />
            <Skeleton style={styles.line} />
            <Skeleton style={styles.lineXs} />
          </View>
        </View>
      ))}
    </View>
  );
}

const SK = '#1b1f26';

const styles = StyleSheet.create({
  box: { backgroundColor: SK, borderRadius: radius.sm },

  // grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingTop: 6 },
  cell: { width: '50%', paddingHorizontal: 6, paddingBottom: spacing.md },
  card: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.lg },

  // news
  newsFeatured: { marginHorizontal: spacing.lg, height: 210, borderRadius: radius.lg },
  chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingVertical: 14 },
  chip: { width: 72, height: 34, borderRadius: radius.pill },
  newsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 12 },
  newsThumb: { width: 108, height: 76, borderRadius: radius.md },
  lineSm: { width: 60, height: 10, borderRadius: 4 },
  line: { width: '92%', height: 14, borderRadius: 4 },
  lineXs: { width: '55%', height: 11, borderRadius: 4 },
});
