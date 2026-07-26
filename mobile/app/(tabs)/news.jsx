import { memo, useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { fetchNews } from '../../src/api/news';
import { NewsListSkeleton } from '../../src/components/Skeleton';
import NewsImage from '../../src/components/NewsImage';
import { colors, radius, spacing, TAB_SPACE } from '../../src/theme';
import { useLanguage } from '../../src/context/LanguageContext';
import { useQuery } from '../../src/hooks/useQuery';

export default function NewsScreen() {
  const { t, lang } = useLanguage();
  const [cat, setCat] = useState('all');

  // Cache-first: yeniden açılışta anında; arka planda tazelenir
  const { data, loading, error, refetch } = useQuery(
    `news:${lang}`,
    () => fetchNews(lang),
    { ttl: 10 * 60 * 1000 }
  );
  const items = useMemo(() => data?.results || [], [data]);

  const cats = useMemo(() => {
    const set = [];
    items.forEach(n => { if (n.cat && !set.includes(n.cat)) set.push(n.cat); });
    return ['all', ...set];
  }, [items]);

  const featured = items[0] || null;
  const filtered = useMemo(() => {
    const rest = cat === 'all' ? items.slice(1) : items.filter(n => n.cat === cat);
    return rest;
  }, [items, cat]);

  const open = useCallback((url) => { if (url) WebBrowser.openBrowserAsync(url); }, []);
  const keyExtractor = useCallback((item) => item.id, []);
  const renderNews = useCallback(({ item }) => <NewsRow item={item} onPress={open} />, [open]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Text style={styles.header}>{t('news.title')}</Text>
        <NewsListSkeleton />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Text style={styles.header}>{t('news.title')}</Text>
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.text3} />
          <Pressable style={styles.retryBtn} onPress={refetch}><Text style={styles.retryText}>{t('common.retry')}</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.header}>{t('news.title')}</Text>
      <FlashList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderNews}
        contentContainerStyle={{ paddingBottom: TAB_SPACE }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Öne çıkan */}
            {cat === 'all' && featured && (
              <Pressable style={styles.featured} onPress={() => open(featured.url)}>
                <NewsImage item={featured} style={StyleSheet.absoluteFill} />
                <LinearGradient colors={['transparent', 'rgba(6,7,9,0.55)', 'rgba(6,7,9,0.97)']} locations={[0.2, 0.6, 1]} style={StyleSheet.absoluteFill} />
                <View style={styles.featuredBadge}><Text style={styles.featuredBadgeText}>★ {t('news.featured')}</Text></View>
                <View style={styles.featuredInfo}>
                  <View style={styles.catRow}>
                    <View style={styles.catPill}><Text style={styles.catPillText}>{featured.cat}</Text></View>
                    <Text style={styles.metaText}>{featured.source} · {featured.date}</Text>
                  </View>
                  <Text numberOfLines={3} style={styles.featuredTitle}>{featured.title}</Text>
                </View>
              </Pressable>
            )}

            {/* Kategori çipleri */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {cats.map(c => {
                const active = cat === c;
                const label = c === 'all' ? t('news.all') : c;
                return (
                  <Pressable key={c} onPress={() => setCat(c)} style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && { color: '#fff', fontWeight: '700' }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="newspaper-outline" size={38} color={colors.text3} />
            <Text style={styles.emptyText}>{t('news.empty')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const NewsRow = memo(function NewsRow({ item, onPress }) {
  return (
    <Pressable style={styles.row} onPress={() => onPress(item.url)}>
      <View style={styles.thumb}>
        <NewsImage item={item} style={StyleSheet.absoluteFill} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.catRow}>
          <View style={styles.catPillSm}><Text style={styles.catPillTextSm}>{item.cat}</Text></View>
        </View>
        <Text numberOfLines={3} style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>{item.source} · {item.date}{item.read ? ` · ${item.read}` : ''}</Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.6, paddingHorizontal: spacing.lg, paddingTop: 8, paddingBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },

  featured: { marginHorizontal: spacing.lg, height: 210, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.card, marginBottom: 4 },
  featuredBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  featuredBadgeText: { color: '#fff', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5 },
  featuredInfo: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  featuredTitle: { color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 22, marginTop: 8 },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catPill: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  catPillText: { color: '#ff6b70', fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  metaText: { color: 'rgba(255,255,255,0.7)', fontSize: 11.5, fontWeight: '500' },

  chipsRow: { paddingHorizontal: spacing.lg, gap: 8, paddingVertical: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 13, color: colors.text2, fontWeight: '500' },

  row: { flexDirection: 'row', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 12 },
  thumb: { width: 108, height: 76, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.card },
  catPillSm: { alignSelf: 'flex-start', backgroundColor: colors.accentSoft, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 5 },
  catPillTextSm: { color: '#ff6b70', fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  rowTitle: { color: colors.text, fontSize: 14.5, fontWeight: '700', lineHeight: 18 },
  rowMeta: { color: colors.text3, fontSize: 11.5, marginTop: 5, fontWeight: '500' },

  emptyBox: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 60 },
  emptyText: { color: colors.text3, fontSize: 14, fontWeight: '600' },
  retryBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: 22, paddingVertical: 11 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
