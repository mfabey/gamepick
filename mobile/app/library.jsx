import { memo, useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, Alert, RefreshControl, useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GamesGridSkeleton, Reveal } from '../src/components/Skeleton';
import EmptyState from '../src/components/EmptyState';
import CevrimdisiBant from '../src/components/CevrimdisiBant';
import { Icon } from '../src/components/Icon';
import { GameCardSmall } from '../src/components/ui/GameCards';
import { OverlayTag } from '../src/components/ui/Media';
import { NavBar } from '../src/components/ui/Navigation';
import { SearchField } from '../src/components/ui/SearchField';
import { Button, Chip, ListGroup, ListRow, Segmented, Txt } from '../src/components/ui/Primitives';
import { UserAvatar } from '../src/components/ui/Social';
import { coverWidth, gridCols, GRID_GAP, GRID_PAD } from '../src/components/CoverGrid';
import { prefetchImages } from '../src/utils/prefetch';
import { spacing } from '../src/theme';
import { component as K, layout, radius as dsRadius, space } from '../src/theme/tokens';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { useLanguage } from '../src/context/LanguageContext';
import { useAuth } from '../src/context/AuthContext';
import { fetchSteamPrices } from '../src/api/library';
import { useConnectedLibrary } from '../src/hooks/useConnectedLibrary';

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
  const insets = useSafeAreaInsets();
  // 2.0 GameCardSmall ızgarası — profil ızgarasıyla AYNI ölçü (CoverGrid):
  // 390 pt'de 3 sütun × 106. Eskiden 2 sütun × 185 (Faz maketinin hücresi).
  const { width: pencereEn } = useWindowDimensions();
  const sutun = gridCols(pencereEn);
  const kapakEn = coverWidth(pencereEn, sutun);
  const { colors } = useDesignTheme();
  const { t, locale, formatPrice } = useLanguage();
  const { steamAccounts: rawSteamAccounts = [], xbox, busy, loginSteam, loginXbox, account } = useAuth();
  const router = useRouter();

  const steamAccounts = useMemo(() => (
    Array.isArray(rawSteamAccounts) ? rawSteamAccounts.filter(a => a && typeof a === 'object' && a.steamId) : []
  ), [rawSteamAccounts]);

  // Paylaşımlı kütüphane fetch'i (Home önericisi ile aynı cache → çift fetch yok, anlık açılış)
  // TEK AD: iki dal aynı fonksiyonu `libTazele` ve `refetchLib` diye
  // adlandırmıştı. İkisini de tutmak aynı şeyin iki takma adı olurdu;
  // çevrimdışı bandı da aşağı çekme de artık `libTazele` çağırıyor.
  const { steam: steamLibs, xbox: xboxRaw, steamGames, xboxGames, loading: libLoading, ts: libTs, refetch: libTazele } = useConnectedLibrary();
  const [refreshing, setRefreshing] = useState(false);
  const xboxErr = xboxRaw?.error || null;
  const xboxLib = xboxErr ? null : xboxRaw;

  const [steamPrices, setSteamPrices]     = useState({});
  const [pricesLoading, setPricesLoading] = useState(false);

  const [view, setView]     = useState('all');   // 'all' | 'steam_<id>' | 'xbox'
  const [search, setSearch] = useState('');
  const [sort, setSort]     = useState('hours');  // hours | name | value

  const steamIdsKey = steamAccounts.map(a => a.steamId).join(',');

  // İlk kapakları önden ısıt (kaydırmada anında görünsün)
  useEffect(() => {
    const imgs = [...steamGames, ...xboxGames].slice(0, 30).map(g => g.image).filter(Boolean);
    if (imgs.length) prefetchImages(imgs);
  }, [steamGames, xboxGames]);

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

  // ── Kütüphane İstatistikleri Widget'ını Güncelle ──
  useEffect(() => {
    import('../modules/gamerisen-widget-module').then(({ setWidgetData }) => {
      if (combined && combined.totalGames > 0) {
        const lastPlayedGame = [...combined.games].sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))[0];
        const lastPlayedName = lastPlayedGame ? lastPlayedGame.name : '—';
        
        const payload = {
          value: combined.value ? formatPrice(combined.value.sum) : '₺0,00',
          hours: combined.totalHours || 0,
          games: combined.totalGames || 0,
          lastPlayed: lastPlayedName
        };
        setWidgetData('gamerisen_stats', JSON.stringify(payload));
      } else {
        setWidgetData('gamerisen_stats', '');
      }
    }).catch(() => {});
  }, [combined, formatPrice]);

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
        games: combined.games, loading: libLoading, errorMsg: null,
        header: { kind: 'combined', accounts: steamAccounts, stats: {
          games: combined.totalGames, hours: combined.totalHours, value: combined.value } },
      };
    }
    if (current.type === 'steam') {
      const lib = steamLibs[current.account.steamId];
      return {
        games: lib?.games || [], loading: libLoading, errorMsg: lib?.error || null,
        header: { kind: 'steam', account: current.account, stats: {
          games: lib?.total ?? 0, played: lib?.played ?? 0, hours: Math.round(lib?.totalHours ?? 0),
          value: computeValue(lib?.games, steamPrices) } },
      };
    }
    // xbox
    return {
      games: xboxLib?.games || [], loading: libLoading, errorMsg: xboxErr,
      header: { kind: 'xbox', gamertag: xbox?.gamertag, avatar: xbox?.avatar, stats: {
        games: xboxLib?.total ?? 0, gamePass: xboxLib?.gamePassCount ?? 0,
        gamerscore: xboxLib?.totalGamerscore ?? 0 } },
    };
  }, [current, combined, steamLibs, steamPrices, libLoading, xboxLib, xboxErr, xbox, steamAccounts]);

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

  const handleOpenGame = useCallback((game) => {
    router.push({
      pathname: '/game/[id]',
      params: {
        id: String(game.appid ?? game.titleId ?? game.id),
        appid: game.appid ? String(game.appid) : undefined,
        name: game.name || '',
        image: game.image || '',
        hasSteam: game.appid ? '1' : '',
      },
    });
  }, [router]);

  const renderTile = useCallback(({ item }) => (
    <View style={styles.cell}>
      <GameTile game={item} steam={isSteamView} price={steamPrices[item.appid]} width={kapakEn} onPress={handleOpenGame} />
    </View>
  ), [isSteamView, steamPrices, handleOpenGame, kapakEn]);

  const doLogin = async (fn) => {
    const r = await fn();
    if (!r.ok && r.error) {
      // Bağlam kod döndürüyor (ACCOUNT_REQUIRED / STEAM_LIMIT / SYNC_FAILED);
      // çevirisi varsa onu göster, yoksa ham metne düş.
      const k = `auth.err.${r.error}`;
      Alert.alert(t('auth.loginFailed'), t(k) !== k ? t(k) : r.error);
    }
  };

  // ── Hiç hesap yok ──
  if (sources.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <NavBar title={t('nav.library')} />
        <View style={styles.lock}>
          <Icon name="grid" size={K.library.lockIcon} color={colors.text3} />
          <Txt variant="title2" style={styles.lockTitle}>{t('nav.library')}</Txt>
          <Txt variant="body" style={[styles.lockText, { color: colors.text2 }]}>
            {account ? t('library.connectPrompt') : t('prof.lockDesc')}
          </Txt>
        </View>
        {/* Profil yokken bağlama düğmeleri HİÇ sunulmuyor. Bağlantı hesaba
            kaydedildiği için profilsiz bağlanan kullanıcı kütüphanesini ilk
            oturum kapanışında kaybederdi. Profil ekranındaki kilidi burada
            da uygulamak şart — aksi hâlde bu ekran kapıyı atlatıyordu.
            Bağlama satırları Ayarlar'ın "Hesap" grubuyla AYNI (G-23):
            eskiden burada ayrı, marka renkli düğmeler vardı. */}
        {account ? (
          <ListGroup>
            <ListRow icon="bag" title={t('auth.connectSteam')} onPress={() => doLogin(loginSteam)} disabled={busy}
              trailing={busy ? <ActivityIndicator color={colors.text2} /> : undefined} />
            <ListRow icon="pad" title={t('auth.connectXbox')} onPress={() => doLogin(loginXbox)} disabled={busy}
              trailing={busy ? <ActivityIndicator color={colors.text2} /> : undefined} />
          </ListGroup>
        ) : (
          <Button title={t('prof.lockCta')} icon="userplus" height={50} onPress={() => router.push('/account')} style={styles.lockCta} />
        )}
      </SafeAreaView>
    );
  }

  const sortItems = [
    { value: 'hours', label: t('lib.sortHours') },
    { value: 'name', label: t('lib.sortName') },
    ...(isSteamView ? [{ value: 'value', label: t('lib.sortValue') }] : []),
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <NavBar title={t('nav.library')} />

      {/* Kaynak seçici — 2.0 Chip. Platformu ikon söylüyor (Ayarlar'la aynı:
          Steam `bag`, Xbox `pad`), seçimi çipin kendi dolgusu. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsRow}>
        {sources.map(s => (
          <Chip
            key={s.key}
            title={s.label}
            icon={s.type === 'xbox' ? 'pad' : s.type === 'combined' ? 'layers' : 'bag'}
            selected={view === s.key}
            onPress={() => setView(s.key)}
          />
        ))}
      </ScrollView>

      <View style={{ flex: 1 }}>
      {loading && filtered.length === 0 ? (
        <GamesGridSkeleton />
      ) : errorMsg ? (
        <View style={styles.center}>
          <Icon name="alert" size={K.library.errorIcon} color={colors.red} />
          <Txt variant="body" style={[styles.centerText, { color: colors.text2 }]}>{errorMsg}</Txt>
        </View>
      ) : (
        <Reveal style={{ flex: 1 }}>
        <FlashList
          data={filtered}
          keyExtractor={keyExtractor}
          numColumns={sutun}
          renderItem={renderTile}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <CevrimdisiBant
                ts={libTs}
                onRetry={libTazele}
                style={{ marginBottom: spacing.s12 }}
              />
              <LibraryHeaderCard header={header} formatPrice={formatPrice} pricesLoading={pricesLoading} t={t} locale={locale} />
              {/* Arama + sıralama */}
              <SearchField
                value={search}
                onChangeText={setSearch}
                placeholder={t('lib.search')}
                accessibilityLabel={t('lib.search')}
              />
              {/* Sıralama tek seçimli ve ikincil: kısa boy Segmented; sağda
                  süzülmüş oyun sayısı. */}
              <View style={styles.sortRow}>
                <View style={styles.sortSeg}>
                  <Segmented compact items={sortItems} value={sort} onChange={setSort} />
                </View>
                <Txt variant="captionStrong" style={[styles.num, { color: colors.text3 }]}>{filtered.length}</Txt>
              </View>
            </View>
          }
          // compact: ListEmptyComponent listenin İÇİNDE, flex:1 burada
          // yayılmıyor — tam ekran sürüm başlığın altına sıkışırdı.
          // Çıkış eklendi: daraltan şey arama kutusu, temizleyen düğme orada.
          ListEmptyComponent={!loading ? (
            <EmptyState
              compact
              icon="search"
              title={t('lib.empty')}
              text={t('lib.emptyDesc')}
              actionLabel={search ? t('common.clearSearch') : undefined}
              onAction={search ? () => setSearch('') : undefined}
            />
          ) : null}
          // Alt dolgu `TAB_SPACE` DEĞİL: bu ekranda sekme çubuğu yok (plan
          // §4.1'in işaret ettiği dört ekrandan biri). Güvenli alan + 40.
          ListFooterComponent={<View style={{ height: insets.bottom + spacing.s40 }} />}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                try {
                  if (libTazele) await libTazele();
                } finally {
                  setRefreshing(false);
                }
              }}
              tintColor={colors.text2}
            />
          )}
        />
        </Reveal>
      )}
      </View>
    </SafeAreaView>
  );
}

// ── Başlık kartı (profil + istatistik + değer) ──
// İstatistik ekranının dili: surface1 kart (köşe 18), kenarlık ve renkli üst
// şerit yok. Platformu küçük etiket söylüyor; değer (para) yeşil kalıyor.
function LibraryHeaderCard({ header, formatPrice, pricesLoading, t, locale }) {
  const { colors } = useDesignTheme();
  if (!header) return null;

  const saat = (h) => `${h} ${t('home.hoursShort')}`;
  const deger = (v) => (pricesLoading && !v ? '…' : v ? formatPrice(v.sum) : '—');

  let bas;
  let hucreler;
  if (header.kind === 'combined') {
    const kisiler = header.accounts.slice(0, 3);
    const adim = K.library.stackAvatar - K.library.stackOverlap;
    bas = (
      <>
        <View style={{ width: K.library.stackAvatar + (kisiler.length - 1) * adim, height: K.library.stackAvatar }}>
          {kisiler.map((a, i) => (
            /* Halka kartın zemini: üst üste binen yüzler birbirinden ayrılsın
               (friends istek bandıyla aynı kalıp). */
            <View key={a.steamId} style={[styles.stackAvatar, { left: i * adim, borderColor: colors.surface1 }]}>
              <UserAvatar avatar={a.avatar} name={a.name} size={K.library.stackAvatar} />
            </View>
          ))}
        </View>
        <HeaderName tag={t('lib.overview')} name={`${header.accounts.length} ${t('lib.accounts')}`} />
      </>
    );
    hucreler = [
      { value: header.stats.games, label: t('lib.games') },
      { value: saat(header.stats.hours), label: t('lib.hours') },
      { value: deger(header.stats.value), label: t('lib.value'), color: colors.green },
    ];
  } else if (header.kind === 'steam') {
    const a = header.account;
    bas = (
      <>
        <UserAvatar avatar={a.avatar} name={a.name} size={K.library.avatar} />
        <HeaderName tag="STEAM" name={a.name} />
      </>
    );
    hucreler = [
      { value: header.stats.games, label: t('lib.games') },
      { value: header.stats.played, label: t('lib.played') },
      { value: saat(header.stats.hours), label: t('lib.hours') },
      { value: deger(header.stats.value), label: t('lib.value'), color: colors.green },
    ];
  } else {
    bas = (
      <>
        <UserAvatar avatar={header.avatar} name={header.gamertag} size={K.library.avatar} />
        <HeaderName tag="XBOX" name={header.gamertag} />
      </>
    );
    hucreler = [
      { value: header.stats.games, label: t('lib.games') },
      { value: header.stats.gamePass, label: 'Game Pass' },
      { value: header.stats.gamerscore?.toLocaleString(locale), label: t('lib.gamerscore') },
    ];
  }

  return (
    <View style={[styles.headerCard, { backgroundColor: colors.surface1 }]}>
      <View style={styles.headerRow}>{bas}</View>
      <View style={styles.statsRow}>
        {hucreler.map((h) => (
          <View key={h.label} style={styles.statCell}>
            <Txt variant="statValue" numberOfLines={1} style={[styles.num, h.color && { color: h.color }]}>{h.value}</Txt>
            <Txt variant="caption" numberOfLines={1} style={{ color: colors.text2 }}>{h.label}</Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

function HeaderName({ tag, name }) {
  const { colors } = useDesignTheme();
  return (
    <View style={styles.headerText}>
      <Txt variant="caption2Strong" style={[styles.platformTag, { color: colors.text2 }]}>{tag}</Txt>
      <Txt variant="headline" numberOfLines={1}>{name}</Txt>
    </View>
  );
}

// ── KUTUCUK: 2.0 GameCardSmall (kart ailesi 3/4) ──
// Ad kapağın ALTINDA: eskiden kapak üstüne beyaz yazılıyordu ve açık renkli
// kapakta okunmuyordu. Alt satır Steam'de "134 sa · ₺1.299" (kullanıcı
// kararı: saat ve fiyat birlikte), Xbox'ta gamerscore. İndirim rozeti kalktı:
// küçük kartın alt satırı fiyatla indirimi aynı anda taşımıyor ve sahip
// olunan oyunda indirim bir karar değiştirmiyor. Fiyat, indirimdeyse güncel
// fiyat (eski davranış). Game Pass kapak üstünde 2.0 `OverlayTag`.
const GameTile = memo(function GameTile({ game, steam, price, width, onPress }) {
  const { t, formatPrice } = useLanguage();
  const isFree = price?.isFree;
  const onSale = price?.discount > 0 && !isFree;
  let alt;
  if (steam) {
    const saat = game.hours > 0 ? `${game.hours} ${t('home.hoursShort')}` : t('library.notPlayed');
    const fiyat = !price ? null
      : isFree ? t('card.free')
      : price.original != null ? formatPrice(onSale ? price.current : price.original)
      : null;
    alt = fiyat ? `${saat} · ${fiyat}` : saat;
  } else {
    alt = `${game.currentGamerscore ?? 0} G`;
  }
  return (
    <GameCardSmall
      title={game.name}
      image={game.image || null}
      recyclingKey={String(game.appid ?? game.titleId)}
      width={width}
      subtitle={alt}
      overlay={!steam && game.isGamePass ? <OverlayTag label="Game Pass" /> : null}
      onPress={() => onPress?.(game)}
    />
  );
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  num: { fontVariant: ['tabular-nums'] },

  // Kilit ekranı: ikon + başlık + açıklama ortada, bağlama satırları altında.
  lock: { alignItems: 'center', paddingHorizontal: space[32], paddingTop: space[32], paddingBottom: space[24], gap: space[8] },
  lockTitle: { marginTop: space[8], textAlign: 'center' },
  lockText: { textAlign: 'center' },
  lockCta: { marginHorizontal: layout.gutter },

  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chipsRow: { paddingHorizontal: layout.gutter, gap: space[8], paddingTop: space[4], paddingBottom: space[12], alignItems: 'center' },

  // Liste başlığı ızgara hücreleriyle aynı hizada: liste kenarı 20 − 8,
  // başlık içi + 8 = 20 (sayfa payı).
  listHeader: { paddingHorizontal: GRID_GAP / 2, gap: space[12], paddingBottom: space[12] },

  headerCard: { borderRadius: dsRadius.group, padding: space[16], gap: space[16] },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  headerText: { flex: 1, minWidth: 0 },
  platformTag: { letterSpacing: 1 },
  stackAvatar: { position: 'absolute', top: 0, borderWidth: K.library.stackRing, borderRadius: dsRadius.pill },
  statsRow: { flexDirection: 'row', gap: space[4] },
  statCell: { flex: 1, alignItems: 'center' },

  sortRow: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  sortSeg: { flex: 1 },

  // FlashList sütunları EŞİT bölüyor; 16 pt boşluk hücre başına 8+8 olarak
  // veriliyor, liste kenarı 20 − 8 = 12. Hücre içi genişlik böylece tam
  // `coverWidth()` (390 pt'de 106) — profil ızgarasıyla aynı ölçü.
  listContent: { paddingHorizontal: GRID_PAD - GRID_GAP / 2, paddingTop: space[4] },
  cell: { flex: 1, paddingHorizontal: GRID_GAP / 2, paddingBottom: GRID_GAP },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[12], paddingHorizontal: space[32] },
  centerText: { textAlign: 'center' },
});
