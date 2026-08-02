import { memo, useMemo, useCallback, useEffect , useRef} from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { fetchTrending, fetchGames } from '../../src/api/games';
import { fetchNews } from '../../src/api/news';
import { colors, radius, spacing, TAB_SPACE, PRESSED } from '../../src/theme';
import { useTabBarScroll } from '../../src/context/TabBarContext';
import { useLanguage } from '../../src/context/LanguageContext';
import FadeIn from '../../src/components/FadeIn';
import PosterImage from '../../src/components/PosterImage';
import NewsImage from '../../src/components/NewsImage';
import { useQuery } from '../../src/hooks/useQuery';
import { useTasteProfile } from '../../src/hooks/useTasteProfile';
import { useOwnedGames } from '../../src/hooks/useOwnedGames';
import { useLibraryTaste } from '../../src/hooks/useLibraryTaste';
import { useSeen } from '../../src/hooks/useSeen';
import { useDismissed } from '../../src/hooks/useDismissed';
import { useForYouFeed } from '../../src/hooks/useForYouFeed';
import { recordDismiss } from '../../src/services/dismissStore';
import GamePostCard from '../../src/components/GamePostCard';
import SwipeGlowButton from '../../src/components/SwipeGlowButton';
import { fetchForYouCandidates } from '../../src/api/recommend';
import { genreSlugsFor, rankCandidates } from '../../src/services/recommend';
import { useTabPressAction, scrollRefToTop } from '../../src/hooks/useTabPressAction';

// Stabil fetcher'lar (key'in saf fonksiyonu)
const fetchNewGames = () => fetchGames({ section: 'new', num: 12 });
const fetchSaleGames = () => fetchGames({ section: 'sale', num: 12 });

export default function HomeScreen() {
  // Sekmeye tekrar basınca listeyi başa sar (iOS'ta beklenen davranış)
  const listRef = useRef(null);
  useTabPressAction(useCallback(() => scrollRefToTop(listRef), []));
  const onTabScroll = useTabBarScroll();
  const { t, lang, formatPrice } = useLanguage();
  const router = useRouter();

  const { data: trendData } = useQuery('home:trending', fetchTrending, { ttl: 3 * 60 * 1000 });
  const { data: newData }   = useQuery('home:new', fetchNewGames, { ttl: 5 * 60 * 1000 });
  const { data: saleData }  = useQuery('home:sale', fetchSaleGames, { ttl: 5 * 60 * 1000 });

  const trend = useMemo(() => (trendData?.results || trendData?.games || []).slice(0, 14), [trendData]);
  const fresh = useMemo(() => (newData?.results || []).slice(0, 12), [newData]);
  const sale  = useMemo(() => (saleData?.results || []).slice(0, 12), [saleData]);

  // Haberler — News sekmesiyle AYNI cache anahtarı → çift fetch yok, anlık
  const { data: newsData } = useQuery(`news:${lang}`, () => fetchNews(lang), { ttl: 10 * 60 * 1000 });
  const news = useMemo(() => (newsData?.results || []).slice(0, 8), [newsData]);
  const openNews = (url) => { if (url) WebBrowser.openBrowserAsync(url); };

  // ── Günün Fırsatı Widget'ını Güncelle ──
  useEffect(() => {
    if (sale && sale.length > 0) {
      const best = [...sale].sort((a, b) => (b.discount || 0) - (a.discount || 0))[0];
      if (best) {
        import('../../modules/gamerisen-widget-module').then(({ setWidgetData }) => {
          const payload = {
            name: best.name,
            discount: best.discount || 0,
            currentPrice: formatPrice(best.price),
            originalPrice: formatPrice(best.original)
          };
          setWidgetData('gamerisen_deal', JSON.stringify(payload));
        }).catch(() => {});
      }
    }
  }, [sale, formatPrice]);

  // ── Kişiselleştirilmiş "Senin İçin" akışı ──
  // Bağlı Steam kütüphanesini türle eşle → saat-ağırlıklı zevk sinyali (en güçlü)
  useLibraryTaste();
  const { isCold, topGenres, normalizedGenres, profile } = useTasteProfile();
  const forYouSlugs = genreSlugsFor(topGenres(4));
  // Adaylar tür imzasına göre cache'li
  const { data: candData } = useQuery(
    `foryou-cand:${forYouSlugs.join(',')}`,
    () => fetchForYouCandidates(forYouSlugs),
    { ttl: 5 * 60 * 1000, enabled: !isCold }
  );
  // Sahip olunan oyunlar (owned filtresi) — bağlıysa daima
  const ownedNames = useOwnedGames();
  // Görülen oyunlar (tazelik cezası)
  const seenIds = useSeen();
  // "İlgilenmiyorum" (sert eleme)
  const dismissedIds = useDismissed();
  // Sıralama saf/istemci-tarafı → owned/görülen/dismiss/zevk değişince yeniden FETCH yok
  const forYou = useMemo(
    () => (candData ? rankCandidates(candData, { genreWeights: normalizedGenres(), ownedNames, seenIds, dismissedIds, limit: 12 }) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [candData, ownedNames, seenIds, dismissedIds, profile]
  );

  // ── Sonsuz keşif akışı ("Senin İçin" oluştuktan sonra açılır) ──
  const slugsKey = forYouSlugs.join(',');
  const feedSlugs = useMemo(() => (slugsKey ? slugsKey.split(',') : []), [slugsKey]);
  const genreWeights = useMemo(
    () => normalizedGenres(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile]
  );
  // Şeritte zaten gösterilenler akışta tekrarlanmasın
  const excludeIds = useMemo(() => new Set(forYou.map((g) => String(g.id))), [forYou]);
  const { items: feedItems, loadMore, loadingMore } = useForYouFeed({
    enabled: !isCold,
    slugs: feedSlugs,
    genreWeights,
    ownedNames,
    seenIds,
    excludeIds,
  });
  // "İlgilenmiyorum" anında yansısın (sıralama bozulmadan)
  const feed = useMemo(
    () => feedItems.filter((g) => !dismissedIds.has(String(g.id))),
    [feedItems, dismissedIds]
  );

  // "İlgilenmiyorum" — uzun-bas → onay → feed'den kaldır
  const handleDismiss = useCallback((game) => {
    Alert.alert(game.name, t('home.dismissPrompt'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('home.notInterested'), style: 'destructive', onPress: () => recordDismiss(game.id) },
    ]);
  }, [t]);

  const keyExtractor = useCallback((item) => String(item.id), []);
  // Keşif akışı artık iki sütunlu kapak ızgarası değil, tek sütunlu gönderi
  // akışı: oyun içi ekran görüntüsü + açıklama. Öneri MANTIĞI aynı kaldı
  // (zevk profili + Steam kütüphanesi), değişen yalnızca sunum.
  const renderFeedItem = useCallback(({ item }) => (
    <GamePostCard game={item} onDismiss={handleDismiss} />
  ), [handleDismiss]);

  // Mevcut bölümlerin tamamı listenin başlığı olur → tek kaydırma, tek liste.
  const header = (
    <View style={styles.headerWrap}>

        {/* ── Üst: marka (ortalı) + kaydırarak keşif ──
            Marka ORTADA kalsın diye ikon akışa girmiyor, mutlak konumlu.
            Aksi hâlde marka sola kayardı. */}
        <View style={styles.topBar}>
          <Text style={styles.brand}>GAMERISEN</Text>
          <View style={styles.topRight}>
            <SwipeGlowButton
              onPress={() => router.push('/swipe')}
              accessibilityLabel={t('swipe.entry')}
            />
          </View>
        </View>

        {/* ── Arama ──
            Eskiden burada bir hero vardı: CANLI rozeti, "Sıradaki oyununu
            keşfet" başlığı ve alt metni. Üçü birlikte ekranın ilk perdesini
            doldurup içeriği (haberler, bölümler) kıvrımın altına itiyordu.
            Kaldırıldı — marka zaten üstte, aramanın ne işe yaradığı da
            kendi metninden belli.

            Daha önce bu bloktan çıkanlar: kaydırarak keşif (sağ üstteki
            parlayan ikon), doğal dil ile keşif (onboarding + Profil) ve
            video akışı (alt navigasyonda kendi sekmesi). */}
        <FadeIn delay={40}>
          <Pressable style={({ pressed }) => [styles.search, pressed && PRESSED]} onPress={() => router.push('/games')}>
            <Ionicons name="search" size={19} color={colors.text3} />
            <Text style={styles.searchText}>{t('hero.search')}</Text>
            <View style={styles.searchBtn}><Ionicons name="arrow-forward" size={16} color="#fff" /></View>
          </Pressable>
        </FadeIn>

        {/* Not: Kayan kapak şeridi kaldırıldı. Trend/Yeni oyunları zaten
            aşağıdaki kendi bölümlerinde gösteriyoruz; şerit aynı oyunları
            ikinci kez, üstelik başlıksız gösterdiği için haberlerin önünü
            gereksiz kapatıyordu. */}

        {/* ── Bölümler ── */}
        {/* Haberler (en üstte) */}
        {news.length > 0 && (
          <FadeIn delay={130}>
            <View style={{ marginTop: 26 }}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>📰 {t('news.title')}</Text>
                <Pressable onPress={() => router.push('/news')} hitSlop={8}>
                  <Text style={styles.viewAll}>{t('home.viewAll')} ›</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {news.map(n => <NewsCard key={n.id} item={n} onPress={() => openNews(n.url)} />)}
              </ScrollView>
            </View>
          </FadeIn>
        )}

        {!isCold && forYou.length > 0 && (
          <FadeIn delay={140}><Section emoji="✨" title={t('home.forYou')} games={forYou} router={router} onDismiss={handleDismiss} /></FadeIn>
        )}
        <FadeIn delay={180}><Section emoji="🔥" title={t('home.trend')} games={trend} router={router} /></FadeIn>
        <FadeIn delay={250}><Section emoji="🗓️" title={t('home.new')} games={fresh} router={router} /></FadeIn>
        <FadeIn delay={320}><Section emoji="🏷️" title={t('home.sale')} games={sale} router={router} /></FadeIn>
    </View>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} />
      <FlashList
        ref={listRef}
        onScroll={onTabScroll}
        scrollEventThrottle={16}
        data={feed}
        keyExtractor={keyExtractor}
        renderItem={renderFeedItem}
        ListHeaderComponent={header}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={{ height: TAB_SPACE, alignItems: 'center', justifyContent: 'center' }}>
            {loadingMore ? <ActivityIndicator color={colors.accent} /> : null}
          </View>
        }
      />
    </View>
  );
}

function go(router, g) {
  router.push({
    pathname: '/game/[id]',
    params: { id: String(g.id), name: g.name, image: g.image || '', slug: g.rawgSlug || '', hasSteam: g.hasSteam ? '1' : '' },
  });
}

function Section({ emoji, title, games, router, onDismiss }) {
  const { t } = useLanguage();
  if (!games || games.length === 0) return null;
  return (
    <View style={{ marginTop: 26 }}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{emoji} {title}</Text>
        <Pressable onPress={() => router.push('/games')} hitSlop={8}>
          <Text style={styles.viewAll}>{t('home.viewAll')} ›</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {games.map(g => <HomeCard key={g.id} game={g} router={router} onDismiss={onDismiss} />)}
      </ScrollView>
    </View>
  );
}

const HomeCard = memo(function HomeCard({ game, router, onDismiss }) {
  const mcColor = game.metacritic >= 80 ? colors.green : game.metacritic >= 60 ? '#fbbf24' : '#f87171';
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
      onPress={() => go(router, game)}
      onLongPress={onDismiss ? () => onDismiss(game) : undefined}
      delayLongPress={350}
    >
      <View style={styles.cardCover}>
        <PosterImage uri={game.image} cachePolicy="memory-disk" style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
        <LinearGradient colors={['transparent', 'rgba(6,7,9,0.94)']} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />
        {game.metacritic ? (
          <View style={styles.mcBadge}><Text style={[styles.mcText, { color: mcColor }]}>{game.metacritic}</Text></View>
        ) : null}
        {game.isFree ? (
          <View style={styles.freeBadge}><Text style={styles.freeText}>Ücretsiz</Text></View>
        ) : null}
        <Text numberOfLines={2} style={styles.cardName}>{game.name}</Text>
      </View>
    </Pressable>
  );
});

const NewsCard = memo(function NewsCard({ item, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.newsCard, pressed && { opacity: 0.85 }]}>
      <View style={styles.newsCover}>
        <NewsImage item={item} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['transparent', 'rgba(6,7,9,0.45)']} style={StyleSheet.absoluteFill} />
        {item.cat ? <View style={styles.newsCat}><Text style={styles.newsCatText}>{item.cat}</Text></View> : null}
      </View>
      <Text numberOfLines={2} style={styles.newsTitle}>{item.title}</Text>
      <Text numberOfLines={1} style={styles.newsMeta}>{item.source} · {item.date}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  // Tek sütuna geçilince listenin yatay dolgusu kaldırıldı: gönderi kartı
  // kendi kenar boşluğunu (spacing.lg) taşıyor ve böylece bölüm başlıklarıyla
  // AYNI hizada duruyor. Dolgu kalsaydı kartlar içeri kaçardı.
  listContent: {},
  // Başlık tam genişlikte kalsın diye listenin yatay dolgusu geri alınıyor.
  // paddingBottom ŞART: başlığın son bölümü (İndirimdekiler) ile altındaki
  // iki sütunlu ızgara bitişik duruyordu, ızgara o bölümün devamı gibi
  // görünüyordu. 26 = bölümler arası boşlukla aynı ritim.
  headerWrap: { paddingBottom: 26 },
  topBar: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: 6, paddingBottom: 4, justifyContent: 'center' },
  // İkon akıştan çıkarıldı: normal akışta olsaydı marka ortadan kayardı.
  topRight: { position: 'absolute', right: spacing.lg - 4, top: 2 },
  brand: { fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: 1.5 },

  // Arama artık hero'nun içinde değil, doğrudan başlıkta duruyor — yatay
  // boşluğu hero'dan devraldı ki bölüm başlıklarıyla aynı hizada kalsın.
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 14, marginHorizontal: spacing.lg,
    backgroundColor: colors.card, borderColor: colors.borderHover, borderWidth: 1.5,
    borderRadius: radius.lg, height: 56, paddingLeft: 18, paddingRight: 8,
  },
  searchText: { flex: 1, color: colors.text3, fontSize: 15 },
  searchBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  viewAll: { fontSize: 13, color: colors.accentText, fontWeight: '700' },
  row: { paddingHorizontal: spacing.lg, gap: 12 },
  card: { width: 132 },

  newsCard: { width: 236 },
  newsCover: { width: '100%', height: 132, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.card },
  newsCat: { position: 'absolute', top: 8, left: 8, backgroundColor: colors.accentSoft, borderColor: colors.accentBorder, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  newsCatText: { color: '#ff8085', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  newsTitle: { color: colors.text, fontSize: 13, fontWeight: '700', lineHeight: 17, marginTop: 8 },
  newsMeta: { color: colors.text3, fontSize: 11, fontWeight: '600', marginTop: 4 },
  cardCover: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.card },
  cardName: { position: 'absolute', left: 10, right: 10, bottom: 9, color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 16 },
  mcBadge: { position: 'absolute', top: 7, right: 7, backgroundColor: 'rgba(8,10,14,0.75)', borderRadius: 7, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  mcText: { fontSize: 11, fontWeight: '800' },
  freeBadge: { position: 'absolute', top: 7, left: 7, backgroundColor: colors.green, borderRadius: 7, paddingHorizontal: 6, paddingVertical: 2 },
  freeText: { fontSize: 11, fontWeight: '800', color: '#04130d' },
});
