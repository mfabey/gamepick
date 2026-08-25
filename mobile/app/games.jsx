import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator,
  StyleSheet, ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { fetchGames } from '../src/api/games';
import IconButton from '../src/components/IconButton';
import { fetchQuery, getEntry, isFresh } from '../src/services/queryCache';
import GameCard from '../src/components/GameCard';
import { GamesGridSkeleton, Reveal } from '../src/components/Skeleton';
import { TopFade, BottomFade } from '../src/components/EdgeFade';
import { prefetchImages } from '../src/utils/prefetch';
import { useTimeToData } from '../src/dev/perf';
import { radius, spacing, type, CHIP, CHIP_TEXT, CHIP_TEXT_ON, PRESSED, TOUCH_MIN } from '../src/theme';
import { useStyles, useTheme } from '../src/context/ThemeContext';
import { useScrollCollapse } from '../src/context/TabBarContext';
import { useLanguage } from '../src/context/LanguageContext';
import FilterSheet, { FilterButton, countFilters, EtkinFiltreler } from '../src/components/FilterSheet';
import LimitedMode from '../src/components/LimitedMode';
import EmptyState from '../src/components/EmptyState';

const COLS = 2;
const NUM = 24;
const PAGE1_TTL = 5 * 60 * 1000;   // 1. sayfa önbellek ömrü

import { useReducedMotion } from '../src/hooks/useReducedMotion';

// ─────────────────────────────────────────────────────────────────────────────
// BU EKRAN ARTIK SEKME DEĞİL, YIĞIN EKRANI.
//
// Alt navigasyondaki yerini Topluluk aldı (bkz. (tabs)/_layout.jsx). Buraya
// anasayfanın arama kutusundan ve beş boş durum bağlantısından geliniyor.
//
// Taşınmanın iki görünür sonucu vardı, ikisi de burada karşılandı:
//   • Geri dönüş yolu yoktu — sekmeye "geri" gerekmiyordu, yığına gerekiyor.
//   • Katlanır başlık sekme çubuğunun paylaşılan değerine bağlıydı; sağlayıcı
//     dışında null döneceği için başlık sessizce katlanmayı bırakırdı.
//     useScrollCollapse aynı mantığı yerel bir değerle sürdürüyor.
//
// `useTabPressAction` de kalktı: 'tabPress' olayı bir yığın ekranına hiç
// gönderilmiyor, kanca sessizce ölü kalırdı.
// ─────────────────────────────────────────────────────────────────────────────

export default function GamesScreen() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const { compact, onScroll: onTabScroll } = useScrollCollapse();
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

  const [query, setQuery]       = useState('');   // arama kutusundaki canlı değer
  const [searchTerm, setSearchTerm] = useState(''); // isteğe giden değer (yalnızca bu debounce'lu)
  // Bölüm rota parametresinden TOHUMLANABİLİYOR. Öncesinde bu ekran hiç
  // parametre okumuyordu (useLocalSearchParams yoktu), yani "indirimdekilere
  // git" gibi bir bağlantı kurulamıyordu — her giriş "Tümü"nden başlıyordu.
  // Yalnızca BAŞLANGIÇ değeri: kullanıcı çipe basınca durum kendi yoluna
  // gidiyor, parametre onu geri çekmiyor.
  const { section: sectionParam } = useLocalSearchParams();
  // Tembel başlatıcı: doğrulama yalnızca ilk render'da çalışsın.
  const [section, setSection] = useState(() =>
    SECTIONS.some((s) => s.v === sectionParam) ? String(sectionParam) : ''
  );
  const [games, setGames]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Gelişmiş filtreler ──
  // MOD ARTIK BURADA. Başlıkta ayrı bir çip satırıydı; tür/mağaza/puan/etiket
  // eklenince altı çip satırı olurdu. Hepsi tek sayfaya taşınınca başlık bir
  // çip satırına düştü — filtre KAZANIRKEN başlık kısaldı.
  const [filters, setFilters] = useState({ genre: null, mode: null, store: null, mc: null, tags: [] });
  const [sheetOpen, setSheetOpen] = useState(false);
  // Sunucu yedek listeye düştüğünü bildiriyor (limited) ve HANGİ filtrelerin
  // uygulanmadığını sayıyor (unavailable). Sessiz başarısızlık yasak.
  const [limited, setLimited] = useState(null);   // { unavailable: [...] } | null
  const [limitedGizli, setLimitedGizli] = useState(false);
  const filterCount = countFilters(filters);
  // Tek çipin kaldırılması — `sifirla` parçası doğrudan durumun üstüne biniyor.
  const filtreKaldir = useCallback((sifirla) => setFilters((f) => ({ ...f, ...sifirla })), []);
  // Ağ bozuk mu — 'sonuç yok'tan AYRI bir durum (Faz 4).
  const [bozuk, setBozuk] = useState(false);

  const ref = useRef({ page: 1, canMore: true, fetching: false, seen: new Set(), section: '', query: '', filters: null });

  // Dev-only: ekran mount'undan ilk oyunların gelişine kadar geçen süre
  useTimeToData('Games', games.length > 0);

  // canGoBack KONTROLÜ ŞART: stats.jsx buraya `router.replace('/games')` ile
  // geliyor, yani geri yığını BOŞ olabiliyor. Kontrolsüz bir back() orada
  // hiçbir şey yapmaz ve kullanıcı ekrana sıkışırdı.
  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  const clearFilters = useCallback(
    () => setFilters({ genre: null, mode: null, store: null, mc: null, tags: [] }),
    []
  );

  // Filtre durumunu istek parametrelerine çeviren TEK yer. load ve loadMore
  // aynı dönüşümü kullanmak ZORUNDA: ayrı ayrı yazılsaydı ikinci sayfa
  // birincisinden farklı bir sorgu olur ve liste kendi içinde tutarsızlaşırdı.
  const apiFilters = useMemo(() => ({
    genres:     filters.genre || '',
    mode:       filters.mode  || '',
    store:      filters.store || '',
    metacritic: filters.mc ? String(filters.mc) : '',
    tags:       filters.tags.join(','),
  }), [filters]);

  // ── `zorla`: "TEKRAR DENE" ÖNBELLEĞİ ATLAMALI ──────────────────────────
  // Bu düğme HİÇBİR ŞEY YAPMIYORDU. Sınırlı yanıt da başarılı bir yanıttır ve
  // `fetchQuery` onu 5 dk boyunca (PAGE1_TTL) önbellekte tutar; `load()` aynı
  // anahtarı okuduğu için düğme aynı sınırlı listeyi geri koyuyordu. Kullanıcı
  // basıyor, ekran değişmiyor, hatayı kendinde arıyordu.
  const load = useCallback(async (zorla = false) => {
    const r = ref.current;
    r.page = 1; r.canMore = true; r.fetching = true; r.seen = new Set();
    r.section = section; r.query = searchTerm; r.filters = apiFilters;

    // 1. sayfa filtre bazında önbellekli → aynı filtreye dönünce ağ isteği yok.
    // ANAHTAR TÜM FİLTRELERİ TAŞIMALI: taşımasaydı tür değiştirince önbellekten
    // eski listenin 1. sayfası dönerdi ve filtre çalışmıyor görünürdü.
    const key = `games:${section}|${searchTerm}|${Object.values(apiFilters).join('|')}`;
    const cacheHit = !zorla && isFresh(getEntry(key), PAGE1_TTL);
    if (!cacheHit) setLoading(true);   // önbellekten geliyorsa skeleton yanıp sönmesin
    try {
      const data = await fetchQuery(
        key,
        () => fetchGames({ page: 1, num: NUM, section, q: searchTerm, ...apiFilters }),
        { ttl: PAGE1_TTL, force: zorla }
      );
      const results = (data.results || []).filter(g => {
        if (r.seen.has(g.id)) return false;
        r.seen.add(g.id); return true;
      });
      setGames(results);
      setBozuk(false);
      // `cevrimdisi` AYRI TAŞINIYOR: `limited` artık "bant göster" demek,
      // "çevrimdışıyız" demek değil. Sunucu canlı Steam listesi döndürüp
      // yalnız bir filtreyi uygulayamadığında da bant çıkıyor — ama metni
      // farklı olmalı (bkz. LimitedMode). Alan yoksa (eski sunucu) eski
      // anlam korunuyor: çevrimdışı.
      setLimited(data.limited
        ? { unavailable: data.unavailable || [], cevrimdisi: data.cevrimdisi !== false }
        : null);
      prefetchImages(results.map(g => g.image));
      r.canMore = (data.total || 0) > NUM;
    } catch {
      // FAZ 4, KIRILMA #1 — HATA ARTIK BOŞLUK DEĞİL.
      // Öncesinde `setGames([])` vardı: RAWG düşmesi, zaman aşımı ve uçak
      // modu üçü de kullanıcıya "aradığın oyun yok" diye okunuyordu. Kullanıcı
      // düzeltebileceği bir şey olmadığını sanıyordu.
      //
      // Liste SİLİNMİYOR: önbellekteki son hâli %55 opaklıkta duruyor.
      // Eski veri hiç veriden iyidir — bayat olduğu SÖYLENMİŞSE.
      setBozuk(true);
      r.canMore = false;
    } finally {
      r.fetching = false;
      setLoading(false);
    }
  }, [section, searchTerm, apiFilters]);

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
      const data = await fetchGames({ page: next, num: NUM, section: r.section, q: r.query, ...r.filters });
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
      // Sonsuz kaydırmada da sessizce "liste bitti" demek yanlış: kullanıcı
      // sona geldiğini sanıyordu. Bant görünür, `canMore` kapanıyor —
      // "Yeniden dene" ilk sayfayı tazeliyor.
      setBozuk(true);
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
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

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
  ), [styles]);

  return (
    <View style={styles.safe}>
      {/* Durum çubuğu şeridi — katlanan başlıktan BAĞIMSIZ, hiç hareket etmez.
          Başlığı eksik kaydırarak şerit bırakmayı denemek işe yaramıyor:
          geriye başlığın ALTI kalıyor, yani chip satırları saatin arkasına
          giriyor. Ayrı katman gerekiyor.

          zIndex başlığınkinden (10) büyük: başlık yukarı kayarken bunun
          ARKASINA girsin, kenarı şeridin altından görünmesin. */}
      <View
        style={[styles.statusStrip, { height: insets.top }]}
        pointerEvents="none"
      />

      {/* Kenar sönümlemesi — şeridin ALTINDAN başlıyor ki onun keskin alt
          kenarını yumuşatsın. Başlık açıkken zaten görünmüyor (zIndex 9,
          başlık 10): yalnızca başlık katlanıp içerik yukarı geçtiğinde
          devreye giriyor, tam da sertliğin göründüğü an. */}
      <TopFade top={insets.top} />
      <BottomFade />

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
      {/* Güvenli alan SARMALAYICININ İÇİNDE — sıra önemli.
          Dışarıda olduğunda başlık durum çubuğunun üstüne biniyordu: Yoga'da
          mutlak konumlu çocuk `top: 0` derken ebeveynin paddingTop'unu yok
          sayar, SafeAreaView ise güvenli alanı tam olarak paddingTop ile
          uygular. İçeri alınca dolgu normal akıştaki çocuklara işliyor.
          videos.jsx'teki üst çubuk da aynı sırayla kurulu.

          onLayout bu yüzden artık inset'i de ölçüyor; headerH kendiliğinden
          büyüdüğü için listenin üst dolgusu ve katlanma mesafesi ayrıca
          düzeltilmek zorunda değil. */}
      <SafeAreaView edges={['top']}>
      {/* Başlık + arama */}
      <View style={styles.header}>
        {/* Geri, başlıkla AYNI satırda. iOS'un büyük başlık düzeninde geri
            düğmesi ayrı bir satırdadır ama bu başlık katlanıyor: ayrı satır
            katlanacak yüksekliği ~44pt artırır, yani ekranın en dar olduğu
            anda en çok yeri o alır. Yan yana dururken başlığın taban çizgisi
            ile hizalı ve dokunma hedefi (44pt) korunuyor. */}
        <View style={styles.titleRow}>
          <IconButton icon="chevron-back" size={26} color={colors.text}
            onPress={goBack} style={styles.backBtn} />
          <Text style={styles.title}>{t('games.title')}</Text>
        </View>
        {/* Arama + filtre AYNI SATIRDA: ikisi de "listeyi daralt" işi ve
            filtre düğmesi kendi satırını hak etmiyor. Rozet etkin filtre
            sayısını taşıyor — sayfa kapalıyken hangi filtrelerin açık
            olduğunu gösteren tek işaret o. */}
        <View style={styles.searchRow}>
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
              <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('a11y.clear')}>
                <Ionicons name="close-circle" size={18} color={colors.text3} />
              </Pressable>
            ) : null}
          </View>
          <FilterButton count={filterCount} onPress={() => setSheetOpen(true)} />
        </View>
      </View>

      {/* Bölüm chip'leri.
          MOD SATIRI BURADAN KALKTI — filtre sayfasına taşındı. Bölüm burada
          kaldı çünkü o bir filtre değil, listenin ne olduğunu söyleyen ana
          kip (indirimdekiler ayrı bir Steam yolundan geliyor). */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={[styles.chipsRow, { paddingBottom: 6 }]}>
        {SECTIONS.map(s => (
          <Chip key={s.v} active={section === s.v} label={s.label} onPress={() => setSection(s.v)} />
        ))}
      </ScrollView>

      {/* FAZ 4 — ETKİN FİLTRE ÇİPLERİ. Rozetteki sayı artık ne olduğunu
          söylüyor ve tek dokunuşla kalkıyor. Başlık yüksekliği ÖLÇÜLDÜĞÜ
          için (onLayout) bu satırın girmesi katlanmayı bozmuyor — yeni
          satır bedava. */}
      {filterCount > 0 ? (
        <View style={{ paddingBottom: spacing.s8 }}>
          <EtkinFiltreler filters={filters} onKaldir={filtreKaldir} />
        </View>
      ) : null}
      </SafeAreaView>
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
        ) : bozuk ? (
          // BOZUK DURUM — "sonuç yok"tan AYRI. Üç şey söylüyor: ne oldu,
          // ne çalışmıyor, ne yapabilirsin. Kırmızı YOK: durum bir eylem
          // değil; tek eylem "Yeniden dene" ve o da metin.
          <View style={{ flex: 1, paddingTop: headerH }}>
            <View style={styles.bozukBant}>
              <Text style={styles.bozukBaslik}>{t('games.degraded')}</Text>
              <Text style={styles.bozukMetin}>{t('games.degradedDesc')}</Text>
              <Pressable onPress={() => load(true)} hitSlop={8} style={({ pressed }) => [styles.bozukEylem, pressed && PRESSED]}>
                <Text style={styles.bozukEylemText}>{t('common.retry')}</Text>
              </Pressable>
            </View>

            {/* Önbellekteki liste SİLİNMİYOR — %55 opaklıkta duruyor.
                Eski veri hiç veriden iyidir, bayat olduğu söylenmişse. */}
            {games.length > 0 ? (
              <View style={{ flex: 1, opacity: 0.55 }} pointerEvents="none">
                <FlashList
                  data={games}
                  numColumns={2}
                  keyExtractor={keyExtractor}
                  renderItem={renderGame}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              </View>
            ) : null}
          </View>
        ) : games.length === 0 ? (
          // ÇIKIŞ YOLU. Beş filtre birleşince boş sonuç normal; kullanıcının
          // elinde yalnızca "sonuç yok" kalırsa hangi filtrenin daralttığını
          // bulmak için sayfayı açıp tek tek denemesi gerekir.
          //
          // Çıkış TEK ama koşullu: filtre varsa onları, yoksa aramayı temizler.
          // Öncesinde arama sonucu boş dönünce hiçbir çıkış YOKTU.
          <View style={{ flex: 1, paddingTop: headerH }}>
            <EmptyState
              icon="search"
              // FAZ 4: sorgu TIRNAK İÇİNDE tekrarlanıyor — yazım hatası mı
              // diye bakabilmek için. Öncesinde yalnız "Sonuç yok" yazıyordu.
              title={query ? t('games.noResultsFor').replace('{q}', query) : t('games.noResults')}
              text={filterCount > 0 ? t('games.tryRemoving') : t('games.noResultsDesc')}
              actionLabel={filterCount > 0 ? t('filter.clearAll') : (query ? t('common.clearSearch') : undefined)}
              onAction={filterCount > 0 ? clearFilters : (query ? () => setQuery('') : undefined)}
            >
              {/* ÇIKIŞ YOLU. Aynı çip bileşeni burada tek tek kaldırma
                  aracına dönüşüyor: dört filtre görünür, her biri ayrı
                  atılabilir. "Tümünü temizle" duruyor ama artık TEK
                  seçenek değil. */}
              {filterCount > 0 ? (
                <EtkinFiltreler filters={filters} onKaldir={filtreKaldir} sar />
              ) : null}
            </EmptyState>
          </View>
        ) : (
          // İskeletten içeriğe geçiş: 160 ms fade + 4px yukarı. Öncesinde
          // ızgara aynı karede zıplayarak yerine oturuyordu.
          <Reveal style={{ flex: 1 }}>
          <FlashList
            ListHeaderComponent={
              limited && !limitedGizli ? (
                <View style={{ paddingHorizontal: spacing.s20, paddingBottom: spacing.s16 }}>
                  <LimitedMode
                    unavailable={limited.unavailable}
                    cevrimdisi={limited.cevrimdisi}
                    onRetry={() => load(true)}
                    onDismiss={() => setLimitedGizli(true)}
                  />
                </View>
              ) : null
            }
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
              // TAB_SPACE (104pt) DEĞİL: o sayı yüzen sekme çubuğunun altına
              // kayacak içerik için ayrılmıştı. Bu ekran artık sekme değil,
              // altında çubuk yok — 104pt'lik boşluk listenin sonunda boş bir
              // bant bırakırdı. Kalan tek gereksinim güvenli alan + göstergeye
              // yer.
              <View style={{ height: insets.bottom + 48, alignItems: 'center', justifyContent: 'center' }}>
                {loadingMore ? <ActivityIndicator color={colors.accent} /> : null}
              </View>
            }
          />
          </Reveal>
        )}
      </View>

      <FilterSheet
        unavailable={limited?.unavailable || []}
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        value={filters}
        onApply={setFilters}
      />
    </View>
  );
}

// Seçim RENKLE değil, dolu nötr yüzey + koyu metin + ağırlıkla gösteriliyor.
//
// Önceden tür satırı kırmızı, mod satırı mavi (#6ea8ff) dolguyla seçiliyordu:
// yan yana duran iki filtre satırı, aynı jest için iki farklı dil. Üstelik
// seçili çip ekranın tek gerçek CTA'sıyla aynı ağırlıktaydı.
//
// `accent` prop'u kaldırıldı — artık seçimin rengi diye bir şey yok.
function Chip({ active, label, onPress }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipOn]}>
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  // FAZ 4 — BOZUK DURUM BANDI. Kırmızı YOK: bir durum bildiriyor, eylem
  // istemiyor. Tek eylem "Yeniden dene" ve o da metin (44pt hedef).
  bozukBant: {
    marginHorizontal: spacing.s20, marginBottom: spacing.s16,
    padding: spacing.s16, borderRadius: radius.md,
    backgroundColor: colors.bgInput, gap: spacing.s4,
  },
  bozukBaslik: { color: colors.text, fontSize: type.subhead, fontWeight: '700' },
  bozukMetin: { color: colors.text2, fontSize: type.footnote, lineHeight: 19 },
  bozukEylem: { minHeight: TOUCH_MIN, justifyContent: 'center', alignSelf: 'flex-start' },
  bozukEylemText: { color: colors.accentText, fontSize: type.subhead, fontWeight: '700' },

  safe: { flex: 1, backgroundColor: colors.bg },
  // Mutlak konum: gizlenirken listenin yüksekliğini değiştirmesin.
  // Arka plan ŞART — saydam olsaydı liste altından geçerken metinler
  // üst üste binerdi. zIndex de gerekli, yoksa liste üstünü örter.
  headerWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: colors.bg,
  },
  statusStrip: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 11,
    backgroundColor: colors.bg,
  },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: spacing.md },
  // IconButton 44pt'lik hedefi ortalıyor, yani chevron kendi kutusunda ~9pt
  // içeride kalıyor. Negatif kenar boşluğu onu geri alıyor: aksi hâlde ok,
  // altındaki arama kutusunun sol kenarına göre sağa kaçık görünüyordu.
  backBtn: { marginLeft: -11 },
  title: { fontSize: type.title1, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchBox: {
    // flex:1 — filtre düğmesi sabit 44pt, kalan genişliği arama kutusu alıyor
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.md, paddingHorizontal: 14, height: 44,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: type.subhead },
  chipsScroll: { flexGrow: 0, flexShrink: 0, maxHeight: 54 },
  chipsRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: spacing.sm, alignItems: 'center' },
  // Maketten: hap, dolgu 8/12, surface3, KENARLIK YOK, metin 13/400.
  chip: { ...CHIP, backgroundColor: colors.bgInput },
  chipText: { ...CHIP_TEXT, color: colors.text2 },
  // SEGMENT dili — bir gorunum seciyor. Maket: text1 dolgu + koyu metin.
  chipOn: { backgroundColor: colors.text },
  chipTextOn: { ...CHIP_TEXT_ON, color: colors.bg },
  cell: { flex: 1, paddingHorizontal: 6, paddingBottom: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  footer: { paddingVertical: spacing.xl },
});
