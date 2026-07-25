import { memo, useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GamesGridSkeleton } from '../../src/components/Skeleton';
import { prefetchImages } from '../../src/utils/prefetch';
import { colors, radius, spacing, TAB_SPACE } from '../../src/theme';
import { useLanguage } from '../../src/context/LanguageContext';
import { useAuth } from '../../src/context/AuthContext';
import { fetchSteamLibrary, fetchSteamPrices, fetchXboxLibrary } from '../../src/api/library';

function computeValue(games, prices) {
  if (!games) return null;
  let sum = 0, counted = 0;
  for (const g of games) {
    const p = prices[g.appid];
    if (p && !p.isFree && p.original > 0) { sum += p.original; counted++; }
  }
  return counted > 0 ? { sum, counted } : null;
}

export default function LibraryScreen() {
  const { t, lang, formatPrice } = useLanguage();
  const { steamAccounts, xbox, busy, loginSteam, loginXbox } = useAuth();

  const [steamLibs, setSteamLibs]         = useState({});   // steamId -> {games,total,played,totalHours}|{error}
  const [steamLoading, setSteamLoading]   = useState(false);
  const [steamPrices, setSteamPrices]     = useState({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [xboxLib, setXboxLib]             = useState(null);
  const [xboxLoading, setXboxLoading]     = useState(false);
  const [xboxErr, setXboxErr]             = useState(null);

  const [view, setView]     = useState('all');   // 'all' | 'steam_<id>' | 'xbox'
  const [search, setSearch] = useState('');
  const [sort, setSort]     = useState('hours');  // hours | name | value

  const steamIdsKey = steamAccounts.map(a => a.steamId).join(',');

  // Tüm Steam hesaplarının kütüphanelerini çek
  useEffect(() => {
    if (steamAccounts.length === 0) { setSteamLibs({}); return; }
    let alive = true;
    setSteamLoading(true);
    Promise.all(steamAccounts.map(a =>
      fetchSteamLibrary(a.steamId).then(d => [a.steamId, d]).catch(e => [a.steamId, { error: e.message, games: [] }])
    )).then(entries => {
      if (!alive) return;
      const map = {}; entries.forEach(([id, d]) => { map[id] = d; });
      setSteamLibs(map);
      // İlk kapakları önden ısıt (kaydırmada anında görünsün)
      prefetchImages(Object.values(map).flatMap(l => (l?.games || []).map(g => g.image)).slice(0, 30));
    }).finally(() => { if (alive) setSteamLoading(false); });
    return () => { alive = false; };
  }, [steamIdsKey]);

  // Birleşik appid listesi için fiyatlar
  useEffect(() => {
    const ids = new Set();
    Object.values(steamLibs).forEach(l => (l?.games || []).forEach(g => ids.add(g.appid)));
    if (ids.size === 0) { setSteamPrices({}); return; }
    let alive = true;
    setPricesLoading(true);
    fetchSteamPrices([...ids])
      .then(d => { if (alive) setSteamPrices(d || {}); })
      .catch(() => {})
      .finally(() => { if (alive) setPricesLoading(false); });
    return () => { alive = false; };
  }, [steamLibs]);

  // Xbox kütüphanesi
  useEffect(() => {
    if (!xbox) { setXboxLib(null); setXboxErr(null); return; }
    let alive = true;
    setXboxLoading(true); setXboxErr(null);
    fetchXboxLibrary(xbox)
      .then(d => { if (alive) { setXboxLib(d); prefetchImages((d?.games || []).slice(0, 30).map(g => g.image)); } })
      .catch(e => { if (alive) setXboxErr(e.message); })
      .finally(() => { if (alive) setXboxLoading(false); });
    return () => { alive = false; };
  }, [xbox]);

  // Birleşik Steam istatistikleri
  const combined = useMemo(() => {
    const map = new Map();
    let totalHours = 0;
    steamAccounts.forEach(a => {
      const lib = steamLibs[a.steamId];
      if (!lib?.games) return;
      totalHours += lib.totalHours || 0;
      lib.games.forEach(g => {
        const ex = map.get(g.appid);
        if (ex) { ex.hours = Math.max(ex.hours, g.hours); }
        else map.set(g.appid, { ...g });
      });
    });
    const games = [...map.values()];
    return { games, totalGames: games.length, totalHours: Math.round(totalHours), value: computeValue(games, steamPrices) };
  }, [steamLibs, steamPrices, steamIdsKey]);

  // Kaynak seçici
  const sources = useMemo(() => {
    const s = [];
    if (steamAccounts.length > 1) s.push({ key: 'all', type: 'combined', label: t('lib.overview') });
    steamAccounts.forEach(a => s.push({ key: `steam_${a.steamId}`, type: 'steam', account: a, label: a.name }));
    if (xbox) s.push({ key: 'xbox', type: 'xbox', label: xbox.gamertag });
    return s;
  }, [steamAccounts, xbox, t]);

  useEffect(() => {
    if (!sources.find(s => s.key === view)) setView(sources[0]?.key || 'all');
  }, [sources, view]);

  const current = sources.find(s => s.key === view) || sources[0] || null;

  // Görünümün oyunları + başlık verisi
  const { games, loading, errorMsg, header } = useMemo(() => {
    if (!current) return { games: [], loading: false, errorMsg: null, header: null };
    if (current.type === 'combined') {
      return {
        games: combined.games, loading: steamLoading, errorMsg: null,
        header: { kind: 'combined', accounts: steamAccounts, stats: {
          games: combined.totalGames, hours: combined.totalHours, value: combined.value } },
      };
    }
    if (current.type === 'steam') {
      const lib = steamLibs[current.account.steamId];
      return {
        games: lib?.games || [], loading: steamLoading, errorMsg: lib?.error || null,
        header: { kind: 'steam', account: current.account, stats: {
          games: lib?.total ?? 0, played: lib?.played ?? 0, hours: Math.round(lib?.totalHours ?? 0),
          value: computeValue(lib?.games, steamPrices) } },
      };
    }
    // xbox
    return {
      games: xboxLib?.games || [], loading: xboxLoading, errorMsg: xboxErr,
      header: { kind: 'xbox', gamertag: xbox?.gamertag, avatar: xbox?.avatar, stats: {
        games: xboxLib?.total ?? 0, gamePass: xboxLib?.gamePassCount ?? 0,
        gamerscore: xboxLib?.totalGamerscore ?? 0 } },
    };
  }, [current, combined, steamLibs, steamPrices, steamLoading, xboxLib, xboxLoading, xboxErr, xbox, steamAccounts]);

  const isSteamView = current?.type === 'steam' || current?.type === 'combined';

  const filtered = useMemo(() => {
    let arr = games.filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()));
    arr = [...arr].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'tr');
      if (sort === 'value') return (steamPrices[b.appid]?.original ?? -1) - (steamPrices[a.appid]?.original ?? -1);
      if (sort === 'hours') return (b.hours ?? b.currentGamerscore ?? 0) - (a.hours ?? a.currentGamerscore ?? 0);
      return 0;
    });
    return arr;
  }, [games, search, sort, steamPrices]);

  // FlashList için stabil referanslar
  const keyExtractor = useCallback((item) => String(item.appid ?? item.titleId), []);
  const renderTile = useCallback(({ item }) => (
    <View style={styles.cell}>
      <GameTile game={item} steam={isSteamView} price={steamPrices[item.appid]} />
    </View>
  ), [isSteamView, steamPrices]);

  const doLogin = async (fn) => {
    const r = await fn();
    if (!r.ok && r.error) Alert.alert(t('auth.loginFailed'), r.error);
  };

  // ── Hiç hesap yok ──
  if (sources.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Ionicons name="library-outline" size={54} color={colors.text3} />
          <Text style={styles.h1}>{t('nav.library')}</Text>
          <Text style={styles.prompt}>{t('library.connectPrompt')}</Text>
          <View style={{ width: '100%', gap: 12, marginTop: 8 }}>
            <Pressable disabled={busy} onPress={() => doLogin(loginSteam)} style={[styles.connectBtn, { backgroundColor: '#1b2838' }]}>
              <Ionicons name="logo-steam" size={19} color="#fff" />
              <Text style={styles.connectText}>{t('auth.connectSteam')}</Text>
            </Pressable>
            <Pressable disabled={busy} onPress={() => doLogin(loginXbox)} style={[styles.connectBtn, { backgroundColor: '#107C10' }]}>
              <Ionicons name="logo-xbox" size={19} color="#fff" />
              <Text style={styles.connectText}>{t('auth.connectXbox')}</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.header}>{t('nav.library')}</Text>

      {/* Kaynak seçici */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsRow}>
        {sources.map(s => {
          const active = view === s.key;
          const accent = s.type === 'xbox' ? colors.xbox : s.type === 'combined' ? colors.accent : colors.steam;
          const icon = s.type === 'xbox' ? 'logo-xbox' : s.type === 'combined' ? 'sparkles' : 'logo-steam';
          return (
            <Pressable key={s.key} onPress={() => setView(s.key)}
              style={[styles.chip, active && { backgroundColor: accent, borderColor: accent }]}>
              <Ionicons name={icon} size={14} color={active ? '#fff' : accent} />
              <Text style={[styles.chipText, active && { color: '#fff', fontWeight: '700' }]} numberOfLines={1}>{s.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ flex: 1 }}>
      {loading && filtered.length === 0 ? (
        <GamesGridSkeleton />
      ) : errorMsg ? (
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={44} color={colors.danger} />
          <Text style={styles.errText}>{errorMsg}</Text>
        </View>
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={keyExtractor}
          numColumns={2}
          renderItem={renderTile}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 6 }}>
              <LibraryHeaderCard header={header} formatPrice={formatPrice} pricesLoading={pricesLoading} t={t} lang={lang} />
              {/* Arama + sıralama */}
              <View style={styles.searchBox}>
                <Ionicons name="search" size={16} color={colors.text3} />
                <TextInput value={search} onChangeText={setSearch} placeholder={t('lib.search')}
                  placeholderTextColor={colors.text3} style={styles.searchInput} />
                {search ? <Pressable onPress={() => setSearch('')} hitSlop={8}><Ionicons name="close-circle" size={17} color={colors.text3} /></Pressable> : null}
              </View>
              <View style={styles.sortRow}>
                {[
                  { v: 'hours', label: t('lib.sortHours') },
                  { v: 'name', label: t('lib.sortName') },
                  ...(isSteamView ? [{ v: 'value', label: t('lib.sortValue') }] : []),
                ].map(o => (
                  <Pressable key={o.v} onPress={() => setSort(o.v)}
                    style={[styles.sortChip, sort === o.v && styles.sortChipActive]}>
                    <Text style={[styles.sortChipText, sort === o.v && { color: colors.accent, fontWeight: '700' }]}>{o.label}</Text>
                  </Pressable>
                ))}
                <Text style={styles.countText}>{filtered.length}</Text>
              </View>
            </View>
          }
          ListEmptyComponent={!loading ? (
            <View style={styles.emptyBox}>
              <Ionicons name="search" size={38} color={colors.text3} />
              <Text style={styles.errText}>{t('lib.empty')}</Text>
            </View>
          ) : null}
          ListFooterComponent={<View style={{ height: TAB_SPACE }} />}
        />
      )}
      </View>
    </SafeAreaView>
  );
}

// ── Başlık kartı (profil + istatistik + değer) ──
function LibraryHeaderCard({ header, formatPrice, pricesLoading, t, lang }) {
  if (!header) return null;

  const StatCell = ({ value, label, color }) => (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, color && { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const valueNode = (v) => pricesLoading && !v
    ? <Text style={[styles.statValue, { color: colors.green }]}>…</Text>
    : <Text style={[styles.statValue, { color: colors.green }]}>{v ? formatPrice(v.sum) : '—'}</Text>;

  if (header.kind === 'combined') {
    const accent = colors.steam;
    return (
      <View style={[styles.headerCard, { borderColor: 'rgba(26,159,255,0.25)' }]}>
        <View style={[styles.accentBar, { backgroundColor: accent }]} />
        <View style={styles.headerRow}>
          <View style={styles.avatarStack}>
            {header.accounts.slice(0, 3).map((a, i) => (
              a.avatar
                ? <Image key={a.steamId} source={a.avatar} style={[styles.stackAvatar, { marginLeft: i ? -14 : 0 }]} contentFit="cover" />
                : <View key={a.steamId} style={[styles.stackAvatar, styles.avatarFallback, { marginLeft: i ? -14 : 0, backgroundColor: accent }]}><Text style={styles.avatarInitial}>{a.name?.slice(0, 1).toUpperCase()}</Text></View>
            ))}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.platformTag}>{t('lib.overview')}</Text>
            <Text style={styles.headerName} numberOfLines={1}>{header.accounts.length} {t('lib.accounts')}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <StatCell value={header.stats.games} label={t('lib.games')} />
          <StatCell value={`${header.stats.hours}${lang === 'tr' ? 's' : 'h'}`} label={t('lib.hours')} color={colors.accent} />
          <View style={styles.statCell}>{valueNode(header.stats.value)}<Text style={styles.statLabel}>{t('lib.value')}</Text></View>
        </View>
      </View>
    );
  }

  if (header.kind === 'steam') {
    const a = header.account;
    return (
      <View style={[styles.headerCard, { borderColor: 'rgba(26,159,255,0.25)' }]}>
        <View style={[styles.accentBar, { backgroundColor: colors.steam }]} />
        <View style={styles.headerRow}>
          {a.avatar
            ? <Image source={a.avatar} style={styles.headerAvatar} contentFit="cover" />
            : <View style={[styles.headerAvatar, styles.avatarFallback, { backgroundColor: colors.steam }]}><Text style={styles.avatarInitial}>{a.name?.slice(0, 1).toUpperCase()}</Text></View>}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.platformTag}>STEAM</Text>
            <Text style={styles.headerName} numberOfLines={1}>{a.name}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <StatCell value={header.stats.games} label={t('lib.games')} />
          <StatCell value={header.stats.played} label={t('lib.played')} />
          <StatCell value={`${header.stats.hours}${lang === 'tr' ? 's' : 'h'}`} label={t('lib.hours')} color={colors.accent} />
          <View style={styles.statCell}>{valueNode(header.stats.value)}<Text style={styles.statLabel}>{t('lib.value')}</Text></View>
        </View>
      </View>
    );
  }

  // xbox
  return (
    <View style={[styles.headerCard, { borderColor: 'rgba(16,124,16,0.3)' }]}>
      <View style={[styles.accentBar, { backgroundColor: colors.xbox }]} />
      <View style={styles.headerRow}>
        {header.avatar
          ? <Image source={header.avatar} style={styles.headerAvatar} contentFit="cover" />
          : <View style={[styles.headerAvatar, styles.avatarFallback, { backgroundColor: 'rgba(16,124,16,0.3)' }]}><Ionicons name="logo-xbox" size={24} color={colors.xbox} /></View>}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.platformTag, { color: colors.xbox }]}>XBOX</Text>
          <Text style={styles.headerName} numberOfLines={1}>{header.gamertag}</Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <StatCell value={header.stats.games} label={t('lib.games')} />
        <StatCell value={header.stats.gamePass} label="Game Pass" color={colors.xbox} />
        <StatCell value={header.stats.gamerscore?.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')} label={t('lib.gamerscore')} />
      </View>
    </View>
  );
}

const GameTile = memo(function GameTile({ game, steam, price }) {
  const { t, lang, formatPrice } = useLanguage();
  const hourSymbol = lang === 'tr' ? 's' : 'h';
  const isFree = price?.isFree;
  const onSale = price?.discount > 0 && !isFree;
  return (
    <View style={styles.tile}>
      <Image source={game.image} recyclingKey={String(game.appid ?? game.titleId)} cachePolicy="memory-disk" style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      <LinearGradient colors={['transparent', 'rgba(6,7,9,0.96)']} locations={[0.4, 1]} style={StyleSheet.absoluteFill} />
      {!steam && game.isGamePass ? (
        <View style={styles.gpBadge}><Text style={styles.gpText}>GAME PASS</Text></View>
      ) : null}
      {steam && onSale ? (
        <View style={styles.saleBadge}><Text style={styles.saleText}>-%{price.discount}</Text></View>
      ) : null}
      <View style={styles.tileInfo}>
        <Text numberOfLines={2} style={styles.tileName}>{game.name}</Text>
        <View style={styles.tileMeta}>
          {steam ? (
            game.hours > 0
              ? <Text style={styles.tileHours}>{game.hours}<Text style={styles.tileSub}>{hourSymbol}</Text></Text>
              : <Text style={styles.tileSub}>{t('library.notPlayed')}</Text>
          ) : (
            <Text style={styles.tileHours}>{game.currentGamerscore ?? 0}<Text style={styles.tileSub}> G</Text></Text>
          )}
          {steam && price ? (
            isFree
              ? <Text style={styles.tilePriceFree}>{t('card.free')}</Text>
              : price.original != null
                ? <Text style={styles.tilePrice}>{formatPrice(onSale ? price.current : price.original)}</Text>
                : null
          ) : null}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.6, paddingHorizontal: spacing.lg, paddingTop: 8, paddingBottom: 4 },
  chipsScroll: { flexGrow: 0, flexShrink: 0, maxHeight: 56 },
  chipsRow: { paddingHorizontal: spacing.lg, gap: 8, paddingVertical: 10, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 200, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  chipText: { fontSize: 13, color: colors.text2, fontWeight: '500' },

  headerCard: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden', backgroundColor: 'rgba(20,23,30,0.6)', marginBottom: 14 },
  accentBar: { height: 3, width: '55%' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 14 },
  headerAvatar: { width: 52, height: 52, borderRadius: 12 },
  avatarStack: { flexDirection: 'row' },
  stackAvatar: { width: 46, height: 46, borderRadius: 11, borderWidth: 2, borderColor: '#0f141e' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontWeight: '800', fontSize: 18 },
  platformTag: { fontSize: 10, fontWeight: '800', color: colors.steam, letterSpacing: 1, marginBottom: 2 },
  headerName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, gap: 4 },
  statCell: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 3 },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, height: 42, marginBottom: 10 },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  sortChipActive: { borderColor: colors.accentBorder, backgroundColor: colors.accentSoft },
  sortChipText: { fontSize: 12.5, color: colors.text2 },
  countText: { marginLeft: 'auto', fontSize: 12, color: colors.text3, fontWeight: '600' },

  listContent: { paddingHorizontal: 10, paddingTop: 4 },
  cell: { flex: 1, paddingHorizontal: 6, paddingBottom: spacing.md },
  tile: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.card },
  tileInfo: { position: 'absolute', left: 11, right: 11, bottom: 10 },
  tileName: { color: '#fff', fontSize: 14, fontWeight: '800', lineHeight: 17 },
  tileMeta: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 },
  tileHours: { color: colors.accent, fontSize: 16, fontWeight: '800' },
  tileSub: { color: colors.text3, fontSize: 11, fontWeight: '600' },
  tilePrice: { color: '#fff', fontSize: 13, fontWeight: '800' },
  tilePriceFree: { color: colors.green, fontSize: 13, fontWeight: '800' },
  gpBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#107c10', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  gpText: { color: '#fff', fontSize: 9.5, fontWeight: '800' },
  saleBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  saleText: { color: '#0b0d10', fontSize: 11, fontWeight: '800' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 60 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  prompt: { fontSize: 14, color: colors.text3, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  connectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: radius.md, paddingVertical: 14 },
  connectText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  errText: { color: colors.text2, fontSize: 14, textAlign: 'center' },
});
