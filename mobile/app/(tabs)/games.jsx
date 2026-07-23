import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, ActivityIndicator,
  StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchGames } from '../../src/api/games';
import GameCard from '../../src/components/GameCard';
import { colors, radius, spacing } from '../../src/theme';
import { useLanguage } from '../../src/context/LanguageContext';

const COLS = 2;
const NUM = 24;

export default function GamesScreen() {
  const { t } = useLanguage();

  const SECTIONS = [
    { v: '',         label: t('section.all') },
    { v: 'popular',  label: t('section.popular') },
    { v: 'new',      label: t('section.new') },
    { v: 'sale',     label: t('section.sale') },
    { v: 'free',     label: t('section.free') },
    { v: 'topscore', label: t('section.topscore') },
  ];
  const MODES = [
    { v: '',             label: t('mode.all') },
    { v: 'singleplayer', label: t('mode.singleplayer') },
    { v: 'multiplayer',  label: t('mode.multiplayer') },
    { v: 'coop',         label: t('mode.coop') },
  ];

  const [query, setQuery]       = useState('');
  const [section, setSection]   = useState('');
  const [mode, setMode]         = useState('');
  const [games, setGames]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const ref = useRef({ page: 1, canMore: true, fetching: false, seen: new Set(), section: '', mode: '', query: '' });
  const debounce = useRef(null);

  const load = useCallback(async () => {
    const r = ref.current;
    r.page = 1; r.canMore = true; r.fetching = true; r.seen = new Set();
    r.section = section; r.mode = mode; r.query = query.trim();
    setLoading(true);
    try {
      const data = await fetchGames({ page: 1, num: NUM, section, mode, q: query.trim() });
      const results = (data.results || []).filter(g => {
        if (r.seen.has(g.id)) return false;
        r.seen.add(g.id); return true;
      });
      setGames(results);
      r.canMore = (data.total || 0) > NUM;
    } catch {
      setGames([]);
      r.canMore = false;
    } finally {
      r.fetching = false;
      setLoading(false);
    }
  }, [section, mode, query]);

  // Arama debounce + filtre değişince yeniden yükle
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(load, 350);
    return () => clearTimeout(debounce.current);
  }, [load]);

  const loadMore = useCallback(async () => {
    const r = ref.current;
    if (r.fetching || !r.canMore || loading) return;
    r.fetching = true;
    setLoadingMore(true);
    try {
      const next = r.page + 1;
      const data = await fetchGames({ page: next, num: NUM, section: r.section, mode: r.mode, q: r.query });
      const fresh = (data.results || []).filter(g => {
        if (r.seen.has(g.id)) return false;
        r.seen.add(g.id); return true;
      });
      r.page = next;
      if (fresh.length > 0) setGames(prev => [...prev, ...fresh]);
      if (next * NUM >= (data.total || 0) || (data.results || []).length === 0) r.canMore = false;
    } catch {
      r.canMore = false;
    } finally {
      r.fetching = false;
      setLoadingMore(false);
    }
  }, [loading]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Başlık + arama */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('games.title')}</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={17} color={colors.text3} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('games.searchPlaceholder')}
            placeholderTextColor={colors.text3}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.text3} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Bölüm chip'leri */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {SECTIONS.map(s => (
          <Chip key={s.v} active={section === s.v} label={s.label} onPress={() => setSection(s.v)} />
        ))}
      </ScrollView>

      {/* Mod chip'leri */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chipsRow, { paddingBottom: 6 }]}>
        {MODES.map(m => (
          <Chip key={m.v} active={mode === m.v} label={m.label} accent="#6ea8ff" onPress={() => setMode(m.v)} />
        ))}
      </ScrollView>

      {/* Grid */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : games.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search" size={44} color={colors.text3} />
          <Text style={styles.emptyText}>{t('games.noResults')}</Text>
        </View>
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => String(item.id)}
          numColumns={COLS}
          renderItem={({ item }) => (
            <View style={styles.cell}><GameCard game={item} /></View>
          )}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          ListFooterComponent={loadingMore ? (
            <View style={styles.footer}><ActivityIndicator color={colors.accent} /></View>
          ) : <View style={{ height: 24 }} />}
        />
      )}
    </SafeAreaView>
  );
}

function Chip({ active, label, onPress, accent = colors.accent }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: accent, borderColor: accent }]}
    >
      <Text style={[styles.chipText, active && { color: '#0b0d10', fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: 8, paddingBottom: 6 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.6, marginBottom: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.md, paddingHorizontal: 14, height: 44,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 15 },
  chipsRow: { paddingHorizontal: spacing.lg, gap: 8, paddingVertical: 8 },
  chip: {
    paddingHorizontal: 15, paddingVertical: 8, borderRadius: radius.pill,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  chipText: { fontSize: 13, color: colors.text2, fontWeight: '500' },
  listContent: { paddingHorizontal: spacing.md, paddingTop: 6 },
  column: { gap: spacing.md },
  cell: { flex: 1, marginBottom: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: colors.text3, fontSize: 15, fontWeight: '600' },
  footer: { paddingVertical: 24 },
});
