import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator,
  StyleSheet, ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchGames } from '../../src/api/games';
import { fetchQuery, getEntry, isFresh } from '../../src/services/queryCache';
import GameCard from '../../src/components/GameCard';
import { GamesGridSkeleton } from '../../src/components/Skeleton';
import { prefetchImages } from '../../src/utils/prefetch';
import { useTimeToData } from '../../src/dev/perf';
import { colors, radius, spacing, TAB_SPACE, type } from '../../src/theme';
import { useTabBarScroll } from '../../src/context/TabBarContext';
import { useLanguage } from '../../src/context/LanguageContext';

const COLS = 2;
const NUM = 24;
const PAGE1_TTL = 5 * 60 * 1000;   // 1. sayfa önbellek ömrü

import { useTabPressAction, scrollRefToTop } from '../../src/hooks/useTabPressAction';
import { useTabBarCompact } from '../../src/context/TabBarContext';
import { useReducedMotion } from '../../src/hooks/useReducedMotion';

export default function GamesScreen() {
  // Sekmeye tekrar basınca listeyi başa sar (iOS'ta beklenen davranış)
  const listRef = useRef(null);
  useTabPressAction(useCallback(() => scrollRefToTop(listRef), []));
  const onTabScroll = useTabBarScroll();
  const { t } = useLanguage();

  // Dil değişmedikçe yeniden oluşmasın
  const SECTIONS = useMemo(() => [
    { v: '',         label: t('section.all') },
    { v: 'popular',  label: t('section.popular') },
    { v: 'new',      label: t('section.new') },
    { v: 'sale',     label: t('section.sale') },
    { v: 'free',     label: t('section.free') },
    { v: 'topscore', label: t('section.topscore') },
  ], [t]);
  const MODES = useMemo(() => [
    { v: '',             label: t('mode.all') },
    { v: 'singleplayer', label: t('mode.singleplayer') },
    { v: 'multiplayer',  label: t('mode.multiplayer') },
    { v: 'coop',         label: t('mode.coop') },
  ], [t]);

  const [query, setQuery]       = useState('');   // arama kutusundaki canlı değer
  const [searchTerm, setSearchTerm] = useState(''); // isteğe giden değer (yalnızca bu debounce'lu)
  const [section, setSection]   = useState('');
  const [mode, setMode]         = useState('');
  const [games, setGames]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const ref = useRef({ page: 1, canMore: true, fetching: false, seen: new Set(), section: '', mode: '', query: '' });

  // Dev-only: ekran mount'undan ilk oyunların gelişine kadar geçen süre
  useTimeToData('Games', games.length > 0);

  const load = useCallback(async () => {
    const r = ref.current;
    r.page = 1; r.canMore = true; r.fetching = true; r.seen = new Set();
    r.section = section; r.mode = mode; r.query = searchTerm;

    // 1. sayfa filtre bazında önbellekli → aynı filtreye dönünce ağ isteği yok
    const key = `games:${section}|${mode}|${searchTerm}`;
    const cacheHit = isFresh(getEntry(key), PAGE1_TTL);
    if (!cacheHit) setLoading(true);   // önbellekten geliyorsa skeleton yanıp sönmesin
    try {
      const data = await fetchQuery(
        key,
        () => fetchGames({ page: 1, num: NUM, section, mode, q: searchTerm }),
        { ttl: PAGE1_TTL }
      );
      const results = (data.results || []).filter(g => {
        if (r.seen.has(g.id)) return false;
        r.seen.add(g.id); return true;
      });
      setGames(results);
      prefetchImages(results.map(g => g.image));
      r.canMore = (data.total || 0) > NUM;
    } catch {
      setGames([]);
      r.canMore = false;
    } finally {
      r.fetching = false;
      setLoading(false);
    }
  }, [section, mode, searchTerm]);

  // Yalnızca METİN aramasını geciktir (çip ve ilk açılış anında tetiklensin)
  useEffect(() => {
    const q = query.trim();
    if (q === searchTerm) return;
    const t = setTimeout(() => setSearchTerm(q), 350);
    return () => clearTimeout(t);
  }, [query, searchTerm]);

  // Filtre/arama değiştiğinde ANINDA yükle
  useEffect(() => { load(); }, [load]);

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
      if (fresh.length > 0) {
        setGames(prev => [...prev, ...fresh]);
        prefetchImages(fresh.map(g => g.image));
      }
      if (next * NUM >= (data.total || 0) || (data.results || []).length === 0) r.canMore = false;
    } catch {
      r.canMore = false;
    } finally {
      r.fetching = false;
      setLoadingMore(false);
    }
  }, [loading]);

  // ── Katlanır başlık ──
  // Yükseklik ölçülüyor çünkü sabit değil: başlık, arama kutusu ve iki chip
  // satırı cihaz/dil/yazı tipi boyutuna göre değişiyor. Sabit bir sayı
  // yazsaydım bazı cihazlarda başlık tam gizlenmez ya da fazla kayardı.
  const [headerH, setHeaderH] = useState(0);
  const compact = useTabBarCompact();
  const reducedMotion = useReducedMotion();

  const headerStyle = useAnimatedStyle(() => {
    if (reducedMotion || !compact || headerH === 0) return {};
    return {
      transform: [{
        translateY: interpolate(compact.value, [0, 1], [0, -headerH], Extrapolation.CLAMP),
      }],
    };
  }, [reducedMotion, compact, headerH]);

  // Liste başlığın ALTINDAN kayıyor; dolgu olmasa ilk satır gizli kalırdı.
  const listPad = useMemo(
    () => ({ paddingHorizontal: 10, paddingTop: headerH + 6 }),
    [headerH]
  );

  // FlashList için stabil referanslar (her render'da yeniden oluşmasın)
  const keyExtractor = useCallback((item) => String(item.id), []);
  const renderGame = useCallback(({ item }) => (
    <View style={styles.cell}><GameCard game={item} /></View>
  ), []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Katlanır üst bölüm ──
          Aşağı kaydırınca yukarı kayıp gözden kayboluyor, yukarı kaydırınca
          geri geliyor.

          Sinyali TabBarContext'ten alıyoruz: `compact` zaten tam bunu
          kodluyor (0 = başta ya da yukarı kaydırılıyor, 1 = aşağı). İkinci bir
          yön algılama yazmak, iki ayrı eşiğin bağımsız tetiklenmesi demekti —
          başlık ve sekme çubuğu ayrı anlarda hareket ederdi. Tek kaynakla
          ikisi birlikte gidiyor.

          Bölüm MUTLAK konumlu, liste ona eşit paddingTop taşıyor: akışta
          kalsaydı gizlenirken listenin yüksekliği değişir ve her karede
          yeniden yerleşim tetiklenirdi. */}
      <Animated.View
        style={[styles.headerWrap, headerStyle]}
        onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
      >
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsRow}>
        {SECTIONS.map(s => (
          <Chip key={s.v} active={section === s.v} label={s.label} onPress={() => setSection(s.v)} />
        ))}
      </ScrollView>

      {/* Mod chip'leri */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={[styles.chipsRow, { paddingBottom: 6 }]}>
        {MODES.map(m => (
          <Chip key={m.v} active={mode === m.v} label={m.label} accent="#6ea8ff" onPress={() => setMode(m.v)} />
        ))}
      </ScrollView>
      </Animated.View>

      {/* Grid.
          headerH ölçülene kadar GİZLİ: sıfırdan başladığı için ilk kare
          yanlış boşlukla çiziliyor, ölçüm gelince zıplıyordu. Yerleşim yine
          yapılıyor (ölçüm için şart), yalnızca görünmüyor — bir kare sürüyor. */}
      <View style={{ flex: 1, opacity: headerH > 0 ? 1 : 0 }}>
        {/* Üst bölüm MUTLAK konumlu olduğu için bu iki durumun da aynı
            boşluğu taşıması ŞART. Taşımadıklarında başlığın ARKASINDA
            kalıyorlardı — yükleme iskeleti her açılışta görünmüyordu. */}
        {loading ? (
          <View style={{ paddingTop: headerH }}>
            <GamesGridSkeleton />
          </View>
        ) : games.length === 0 ? (
          <View style={[styles.center, { paddingTop: headerH }]}>
            <Ionicons name="search" size={44} color={colors.text3} />
            <Text style={styles.emptyText}>{t('games.noResults')}</Text>
          </View>
        ) : (
          <FlashList
            ref={listRef}
            onScroll={onTabScroll}
            scrollEventThrottle={16}
            data={games}
            keyExtractor={keyExtractor}
            numColumns={COLS}
            renderItem={renderGame}
            contentContainerStyle={listPad}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMore}
            onEndReachedThreshold={0.6}
            ListFooterComponent={
              <View style={{ height: TAB_SPACE, alignItems: 'center', justifyContent: 'center' }}>
                {loadingMore ? <ActivityIndicator color={colors.accent} /> : null}
              </View>
            }
          />
        )}
      </View>
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
  // Mutlak konum: gizlenirken listenin yüksekliğini değiştirmesin.
  // Arka plan ŞART — saydam olsaydı liste altından geçerken metinler
  // üst üste binerdi. zIndex de gerekli, yoksa liste üstünü örter.
  headerWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: colors.bg,
  },
  header: { paddingHorizontal: spacing.lg, paddingTop: 8, paddingBottom: 6 },
  title: { fontSize: type.title1, fontWeight: '800', color: colors.text, letterSpacing: -0.6, marginBottom: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.md, paddingHorizontal: 14, height: 44,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: type.subhead },
  chipsScroll: { flexGrow: 0, flexShrink: 0, maxHeight: 54 },
  chipsRow: { paddingHorizontal: spacing.lg, gap: 8, paddingVertical: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 15, paddingVertical: 8, borderRadius: radius.pill,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  chipText: { fontSize: type.footnote, color: colors.text2, fontWeight: '500' },
  cell: { flex: 1, paddingHorizontal: 6, paddingBottom: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: colors.text3, fontSize: type.subhead, fontWeight: '600' },
  footer: { paddingVertical: 24 },
});
