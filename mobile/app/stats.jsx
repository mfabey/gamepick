// ─────────────────────────────────────────────────────────────────────────────
// Oyuncu istatistikleri — haftalık rapor, "Spotify Wrapped" hissi.
//
// Tüm sayılar CİHAZDAKİ verilerden hesaplanır; sunucuya hiçbir şey gitmez.
// Tek ağ isteği, takip listesindeki indirimleri almak için yapılan TOPLU
// fiyat çağrısıdır (oyun başına ayrı istek değil).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useWishlist } from '../src/context/WishlistContext';
import { useCollections } from '../src/hooks/useCollections';
import { useLikedList } from '../src/hooks/useLiked';
import { useSeen } from '../src/hooks/useSeen';
import { useDismissed } from '../src/hooks/useDismissed';
import { weeklyReport } from '../src/services/stats';
import { fetchSteamPrices } from '../src/api/library';
import EmptyState from '../src/components/EmptyState';
import { colors, radius, spacing, PRESSED } from '../src/theme';
import { useLanguage } from '../src/context/LanguageContext';
import IconButton from '../src/components/IconButton';

export default function StatsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { items } = useWishlist();

  // Bu hook'lar depo değişince yeniden render tetikler → rapor tazelenir
  const collections = useCollections();
  const liked = useLikedList();
  const seen = useSeen();
  const dismissed = useDismissed();

  const [prices, setPrices] = useState(null);

  // Takip listesindeki indirimler — TEK toplu istek
  useEffect(() => {
    const appids = items.map((g) => g.appid).filter(Boolean);
    if (appids.length === 0) { setPrices(null); return; }
    let alive = true;
    fetchSteamPrices(appids)
      .then((p) => { if (alive) setPrices(p || null); })
      .catch(() => { if (alive) setPrices(null); });
    return () => { alive = false; };
  }, [items]);

  const report = useMemo(
    () => weeklyReport({ prices, wishlistCount: items.length }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prices, items.length, collections, liked, seen, dismissed]
  );

  const onShare = useCallback(async () => {
    Haptics.selectionAsync();
    const lines = [
      `📊 ${t('stats.title')} — Gamerisen`,
      `🔍 ${report.discovered} ${t('stats.discovered')}`,
      `❤️ ${report.liked} ${t('stats.liked')}`,
    ];
    if (report.topGenre) lines.push(`🎮 ${t('stats.topGenre')}: ${report.topGenre}`);
    if (report.discount?.avgDiscount) lines.push(`🏷️ ${t('stats.avgDiscount')}: %${report.discount.avgDiscount}`);
    try { await Share.share({ message: lines.join('\n') }); } catch { /* iptal */ }
  }, [report, t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.title}>{t('stats.title')}</Text>
          <Text style={styles.subtitle}>{t('stats.subtitle')}</Text>
        </View>
        {report.hasActivity && (
          <IconButton icon='share-outline' size={20} color={colors.text} onPress={onShare} style={styles.iconBtn} />
        )}
      </View>

      {!report.hasActivity ? (
        <EmptyState
          icon="stats-chart-outline"
          title={t('stats.emptyTitle')}
          text={t('stats.emptyText')}
          actionLabel={t('stats.startSwiping')}
          actionIcon="layers"
          onAction={() => router.replace('/swipe')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Kahraman sayı — haftanın ana metriği */}
          <View style={styles.hero}>
            <Text style={styles.heroNum}>{report.discovered}</Text>
            <Text style={styles.heroLabel}>{t('stats.discovered')}</Text>
          </View>

          {/* İkili kartlar */}
          <View style={styles.grid}>
            <StatCard icon="heart" value={report.liked} label={t('stats.liked')} tint={colors.green} />
            <StatCard icon="close-circle" value={report.passed} label={t('stats.passed')} tint={colors.accent} />
            <StatCard icon="notifications" value={report.wishlistCount} label={t('stats.wishlist')} tint={colors.steam} />
            <StatCard icon="albums" value={report.collectedGames} label={t('stats.collected')} tint="#a78bfa" />
          </View>

          {/* En çok incelenen tür */}
          {report.topGenre ? (
            <View style={styles.banner}>
              <Text style={styles.bannerLabel}>{t('stats.topGenre')}</Text>
              <Text style={styles.bannerValue}>{report.topGenre}</Text>
            </View>
          ) : null}

          {/* Tür dağılımı — basit yatay çubuklar (svg gerekmiyor) */}
          {report.genreBreakdown.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('stats.genreTitle')}</Text>
              {report.genreBreakdown.map((g) => {
                const max = report.genreBreakdown[0].count || 1;
                return (
                  <View key={g.name} style={styles.barRow}>
                    <Text numberOfLines={1} style={styles.barLabel}>{g.name}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.max(8, (g.count / max) * 100)}%` }]} />
                    </View>
                    <Text style={styles.barCount}>{g.count}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* İndirim özeti — yalnızca veri varsa */}
          {report.discount?.onSaleCount > 0 && (
            <View style={styles.section}>
              <View style={styles.saleRow}>
                <View style={styles.saleBig}>
                  <Text style={styles.saleNum}>%{report.discount.avgDiscount}</Text>
                  <Text style={styles.saleLabel}>{t('stats.avgDiscount')}</Text>
                </View>
                <View style={styles.saleSide}>
                  <Text style={styles.saleSideNum}>%{report.discount.bestDiscount}</Text>
                  <Text style={styles.saleSideLabel}>{t('stats.bestDiscount')}</Text>
                  <Text style={styles.saleSideMeta}>
                    {report.discount.onSaleCount} {t('stats.onSale')}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label, tint }) {
  return (
    <View style={styles.card}>
      <Ionicons name={icon} size={19} color={tint} />
      <Text style={styles.cardNum}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  head: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 6, paddingBottom: 10, gap: 8,
  },
  headText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: colors.text2, marginTop: 2 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },

  body: { paddingHorizontal: spacing.lg, paddingBottom: 40 },

  hero: {
    alignItems: 'center', paddingVertical: 28,
    backgroundColor: colors.accentBg, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.accentBorder, marginTop: 6,
  },
  heroNum: { color: colors.accentText, fontSize: 62, fontWeight: '900', letterSpacing: -2, lineHeight: 66 },
  heroLabel: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  card: {
    flexGrow: 1, flexBasis: '46%',
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 15,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  cardNum: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 7, letterSpacing: -0.8 },
  cardLabel: { color: colors.text2, fontSize: 12, marginTop: 2, fontWeight: '600' },

  banner: {
    marginTop: 12, backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 16, borderWidth: 1, borderColor: colors.cardBorder,
  },
  bannerLabel: { color: colors.text2, fontSize: 13, fontWeight: '600' },
  bannerValue: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 4, letterSpacing: -0.5 },

  section: {
    marginTop: 12, backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 16, borderWidth: 1, borderColor: colors.cardBorder,
  },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 12 },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
  barLabel: { width: 88, color: colors.text2, fontSize: 13, fontWeight: '600' },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.bgInput, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: colors.accent },
  barCount: { width: 22, textAlign: 'right', color: colors.text3, fontSize: 12, fontWeight: '700' },

  saleRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  saleBig: { flex: 1 },
  saleNum: { color: colors.green, fontSize: 40, fontWeight: '900', letterSpacing: -1.5 },
  saleLabel: { color: colors.text2, fontSize: 12, fontWeight: '600', marginTop: 2 },
  saleSide: { alignItems: 'flex-end' },
  saleSideNum: { color: colors.text, fontSize: 20, fontWeight: '900' },
  saleSideLabel: { color: colors.text2, fontSize: 12, fontWeight: '600' },
  saleSideMeta: { color: colors.text3, fontSize: 11, marginTop: 5 },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 50, paddingHorizontal: 22, borderRadius: radius.lg,
    backgroundColor: colors.accent, marginTop: 22,
  },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
