import { memo, useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomFade } from '../../src/components/EdgeFade';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchTrending, fetchGames } from '../../src/api/games';
import { colors, radius, spacing, TAB_SPACE, PRESSED, type, metacriticColor } from '../../src/theme';
import { useTabBarScroll } from '../../src/context/TabBarContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { useTimeToData } from '../../src/dev/perf';
import FadeIn from '../../src/components/FadeIn';
import GameCover from '../../src/components/GameCover';
import { useQuery } from '../../src/hooks/useQuery';
import { useTasteProfile } from '../../src/hooks/useTasteProfile';
import { useOwnedGames } from '../../src/hooks/useOwnedGames';
import { useLibraryTaste } from '../../src/hooks/useLibraryTaste';
import { useSeen } from '../../src/hooks/useSeen';
import { useDismissed } from '../../src/hooks/useDismissed';
import { useForYouFeed } from '../../src/hooks/useForYouFeed';
import { recordDismiss } from '../../src/services/dismissStore';
import GamePostCard from '../../src/components/GamePostCard';
import ReviewCard from '../../src/components/ReviewCard';
import PostCard from '../../src/components/PostCard';
import ReviewPrompt from '../../src/components/ReviewPrompt';
import FriendActivity, { hasFriendSignal } from '../../src/components/FriendActivity';
import ReportSheet from '../../src/components/ReportSheet';
import { fetchForYouCandidates } from '../../src/api/recommend';
import { getReviewFeed, getEligibleGames, getFriendActivity, fetchPosts } from '../../src/api/social';
import { getSession, subscribeSession } from '../../src/services/session';
import { genreSlugsFor, rankCandidates } from '../../src/services/recommend';
import { interleaveReviews, mergeSocial, orderHighlights, mergeHighlights, highlightIds } from '../../src/services/homeFeed';
import { useTabPressAction, scrollRefToTop } from '../../src/hooks/useTabPressAction';

// Stabil fetcher'lar (key'in saf fonksiyonu)
const fetchNewGames = () => fetchGames({ section: 'new', num: 12 });
const fetchSaleGames = () => fetchGames({ section: 'sale', num: 12 });

// ─────────────────────────────────────────────────────────────────────────────
// SOĞUK KULLANICI İÇİN YEDEK TÜRLER.
//
// Akış `useForYouFeed`'e boş bir slug listesiyle gidiyordu ve boş listede
// hiçbir sayfa çekilmiyor. Sonuç: zevk profili oluşmamış bir kullanıcıda —
// yani TAZE KURULUMDA — anasayfa başlıkta bitiyor, sonsuz akış hiç
// başlamıyordu. Uygulama incelemecisinin gördüğü ekran tam olarak buydu.
//
// Bu beş tür RAWG'ın en geniş havuzları; kişiselleştirme değil, TABAN.
// Kullanıcı bir şeylere dokundukça profil oluşuyor ve liste kendiliğinden
// gerçek zevke kayıyor.
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_SLUGS = ['action', 'adventure', 'role-playing-games-rpg', 'indie', 'strategy'];

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

  // Haber verisi ARTIK BURADA ÇEKİLMİYOR. Anasayfada haber şeridi yokken
  // her açılışta haber isteği atmak boşa ağ trafiğiydi; /news kendi
  // isteğini kendi yapıyor (aynı cache anahtarı, aynı hız).

  // ── Günün Fırsatı Widget'ını Güncelle ──
  useEffect(() => {
    if (sale && sale.length > 0) {
      const best = [...sale].sort((a, b) => (b.discount || 0) - (a.discount || 0))[0];
      if (best) {
        // Kapak görseli base64 olarak yükün İÇİNDE gidiyor: WidgetKit render
        // sırasında ağdan görsel çekemiyor, hazır bayt bekliyor.
        //
        // İndirme başarısız olursa image null kalıyor ve widget görselsiz
        // düzenine düşüyor — bu yüzden setWidgetData indirmeyi BEKLEMİYOR
        // olsaydı yarış oluşurdu; await ile sıralı tutuluyor.
        Promise.all([
          import('../../modules/gamerisen-widget-module'),
          import('../../src/utils/widgetImage'),
        ]).then(async ([{ setWidgetData }, { fetchImageBase64, steamHeaderUrl }]) => {
          const url = best.image || steamHeaderUrl(best.appid);
          const image = await fetchImageBase64(url);
          const payload = {
            name: best.name,
            discount: best.discount || 0,
            currentPrice: formatPrice(best.price),
            originalPrice: formatPrice(best.original),
            image,
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

  // ── Sonsuz keşif akışı ──
  // AKIŞ ARTIK HER ZAMAN AÇIK. Önceden `enabled: !isCold` ile kapalıydı ve
  // soğuk kullanıcıda anasayfa başlıkta bitiyordu (bkz. FALLBACK_SLUGS).
  const slugsKey = forYouSlugs.join(',');
  const feedSlugs = useMemo(
    () => (slugsKey ? slugsKey.split(',') : FALLBACK_SLUGS),
    [slugsKey]
  );
  const genreWeights = useMemo(
    () => normalizedGenres(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile]
  );
  // Şeritte zaten gösterilenler akışta tekrarlanmasın
  // Şeritlerde gösterilen her şey akıştan elenir: aynı oyunu hem şeritte hem
  // akışta görmek listeyi bozuk gösteriyor.
  const excludeIds = useMemo(
    () => new Set([...forYou, ...fresh, ...sale].map((g) => String(g.id))),
    [forYou, fresh, sale]
  );
  const { items: feedItems, loadMore, loadingMore } = useForYouFeed({
    enabled: true,
    slugs: feedSlugs,
    genreWeights,
    ownedNames,
    seenIds,
    excludeIds,
  });

  // ── Topluluk incelemeleri ──
  // İki uç PARALEL: biri diğerini beklemiyor ve ikisi de akışı bağlamıyor —
  // düşerlerse anasayfa yalnızca incelemesiz açılıyor, boş değil.
  const [session, setSession] = useState(() => getSession());
  useEffect(() => subscribeSession(() => setSession(getSession())), []);
  const [reviews, setReviews] = useState([]);
  const [posts, setPosts] = useState([]);
  const [eligible, setEligible] = useState([]);
  const [friendGames, setFriendGames] = useState([]);
  const [reportTarget, setReportTarget] = useState(null);
  // Dev-only ölçüm: iskelet gerekli mi kararını sayıya bağlamak için.
  useTimeToData('Home', trend.length > 0);

  const loadSocial = useCallback(() => {
    // İncelemeler HESAPSIZ da okunuyor (bkz. api/social/reviews/feed). Eskiden
    // oturum yoksa hepsi boşaltılıyordu; sonuç, hesapsız kullanıcının akışının
    // %100 katalog olmasıydı — uygulamanın sosyal yanı hiç görünmüyordu.
    getReviewFeed().then((r) => setReviews(r?.reviews || [])).catch(() => {});

    // TARTIŞMA GÖNDERİLERİ. Anasayfa bunları hiç çekmiyordu: uygulamanın
    // sosyal yanı ayrı bir sekmede kalıyor, ana sayfa katalog gibi
    // okunuyordu. İncelemeler gibi hesapsız da okunabiliyor.
    fetchPosts().then((r) => setPosts(r?.posts || [])).catch(() => {});

    // Bu ikisi doğal olarak hesaba bağlı: ne yazabileceğin ve kimin arkadaşın.
    if (!session) { setEligible([]); setFriendGames([]); return; }
    getEligibleGames().then((r) => setEligible((r?.games || []).slice(0, 10))).catch(() => {});
    // Steam bağlı değilse boş liste dönüyor (hata değil) → şerit çizilmiyor.
    getFriendActivity().then((r) => setFriendGames(r?.games || [])).catch(() => {});
  }, [session]);
  useEffect(() => { loadSocial(); }, [loadSocial]);

  // "İlgilenmiyorum" anında yansısın (sıralama bozulmadan), ardından
  // incelemeler oyun gönderilerinin arasına giriyor.
  //
  // HARMANLAMA ELEMEDEN SONRA: önce harmanlanıp sonra elenseydi bir oyun
  // kartı düştüğünde inceleme aralıkları kayardı.
  // ── Lider bölüm ──
  // Header'da eskiden dört şerit vardı (arkadaşlar, Senin İçin, trend, yeni,
  // indirim) ve hepsi aynı biçimdeydi; göz aralarında sıra kuramıyordu. Daha
  // kötüsü hepsi ListHeaderComponent'te olduğu için asıl gövde — sosyal akış —
  // kıvrımın ~1000pt altında başlıyordu.
  //
  // Artık TEK lider var ve hangisi olacağı veriye bakıyor: kişiye en özel olan
  // hangisiyse o. Kalanlar akışa etiketli olarak karışıyor.
  const lead = useMemo(() => {
    if (hasFriendSignal(friendGames)) return 'friends';
    if (!isCold && forYou.length > 0) return 'forYou';
    return 'trend';
  }, [friendGames, isCold, forYou]);

  // Lider olarak kullanılan liste akışa TEKRAR girmiyor.
  // Yeni Çıkanlar ve İndirimdekiler AKIŞTAN ÇIKTI, kendi şeritlerine döndüler:
  // ikisi de niyetle aranan bölümler ("indirime ne girmiş?") ve akışın içine
  // dağılınca o niyet karşılanamıyordu. Akışa karışan tek şey trend — o zaten
  // "şuna da bak" cinsinden, aranan bir şey değil.
  const highlights = useMemo(() => orderHighlights({
    trend: lead === 'trend' ? [] : trend,
  }), [lead, trend]);

  const feed = useMemo(() => {
    const hlIds = highlightIds(highlights);
    const games = feedItems.filter(
      (g) => !dismissedIds.has(String(g.id)) && !hlIds.has(String(g.id))
    );
    // İnceleme ve gönderiler TEK sosyal akışta birleşiyor (en yeni önce),
    // sonra oyunların arasına serpiştiriliyor.
    const social = mergeSocial(reviews, posts);
    return mergeHighlights(interleaveReviews(games, social), highlights);
  }, [feedItems, dismissedIds, reviews, posts, highlights]);

  // "İlgilenmiyorum" — uzun-bas → onay → feed'den kaldır
  const handleDismiss = useCallback((game) => {
    Alert.alert(game.name, t('home.dismissPrompt'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('home.notInterested'), style: 'destructive', onPress: () => recordDismiss(game.id) },
    ]);
  }, [t]);

  const keyExtractor = useCallback((item) => item.key, []);
  // FlashList'e TÜR bildiriliyor: iki farklı yükseklikte kart var ve tür
  // bilgisi olmadan liste bir inceleme kartını oyun kartının yerine geri
  // dönüştürmeye çalışıp kaydırmada sıçrama yapıyor.
  const getItemType = useCallback((item) => item.kind, []);

  // Keşif akışı artık iki sütunlu kapak ızgarası değil, tek sütunlu gönderi
  // akışı: oyun içi ekran görüntüsü + açıklama. Öneri MANTIĞI aynı kaldı
  // (zevk profili + Steam kütüphanesi), değişen yalnızca sunum.
  //
  // Aralarına topluluk incelemeleri giriyor. UZUN BASMA = RAPORLA: kullanıcı
  // içeriğinin gösterildiği her yüzeyde bulunmak zorunda (Guideline 1.2).
  // Hesapsız kullanıcı beğenmeye/yanıtlamaya kalkarsa kayda yönlendirilir.
  const requireAccount = useCallback(() => {
    if (session) return false;
    router.push('/account');
    return true;
  }, [session, router]);

  const renderFeedItem = useCallback(({ item }) => (
    item.kind === 'post' ? (
      <PostCard post={item.post} onRequireAccount={requireAccount} compact />
    ) : item.kind === 'review' ? (
      <ReviewCard
        review={item.review}
        onPress={() => router.push({
          pathname: '/game/[id]',
          params: {
            id: `rawg_${item.review.appid}`, appid: item.review.appid,
            name: item.review.gameName || '', image: item.review.image,
          },
        })}
        onLongPress={() => setReportTarget(item.review)}
        style={styles.feedReview}
      />
    ) : (
      <GamePostCard game={item.game} tag={item.tag} onDismiss={handleDismiss} />
    )
  ), [handleDismiss, router, requireAccount]);

  // Mevcut bölümlerin tamamı listenin başlığı olur → tek kaydırma, tek liste.
  const header = (
    <View style={styles.headerWrap}>

        {/* ── Üst: marka (ortalı) + haberler ──
            Marka ORTADA kalsın diye ikon akışa girmiyor, mutlak konumlu.
            Aksi hâlde marka sola kayardı.

            BU KÖŞENİN GEÇMİŞİ: önce kaydırarak keşif (swipe) girişiydi,
            sonra mesajlar. Kaydırma arşive alındı, mesajlar ise alt
            navigasyona terfi etti — orada rozetiyle birlikte duruyor.

            Şimdi haberlerin girişi burada. Haberler eskiden anasayfanın en
            üstünde 8 kartlık bir şerit ve alt navigasyonda bir sekmeydi;
            ikisi de kalktı. Dış siteye çıkan içerik uygulamanın ilk
            perdesini dolduramaz. */}
        <View style={styles.topBar}>
          {/* MARKA YAZISI, GÖVDE METNİ DEĞİL. Ölçüldü: erişilebilirlik
              boyutlarında ekran genişliğini aşıp haber ikonunun üstüne
              biniyordu. Ölçeklenmeyi tamamen KAPATMAK yanlış olurdu (büyük
              yazıya ihtiyacı olan kullanıcı markayı da okuyamaz); üst sınır
              konuyor — 1.4 kata kadar büyüyor, sonra duruyor. */}
          <Text style={styles.brand} maxFontSizeMultiplier={1.4} numberOfLines={1}>GAMERISEN</Text>
          <View style={styles.topRight}>
            <Pressable
              style={({ pressed }) => [styles.topBtn, pressed && PRESSED]}
              onPress={() => router.push('/news')}
              accessibilityRole="button"
              accessibilityLabel={t('news.title')}
              hitSlop={6}
            >
              <Ionicons name="newspaper-outline" size={22} color={colors.text} />
            </Pressable>
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

        {/* ── Sıra sende ──
            HABER ŞERİDİ BURADAYDI, en üstte, 8 kart ≈ 250 punto. Kaldırıldı:
            dokunulunca dış tarayıcı açan tek bölümdü ve ilk perdede
            duruyordu. Girişi sağ üstteki gazete simgesine taşındı.

            Yerini kullanıcının KENDİ oynadığı oyunlar aldı. Aramadan hemen
            sonra gelmesi bilinçli: ilk perdede görünen ilk içerik bölümü
            artık dışarı çıkaran değil, üretmeye çağıran bölüm. */}
        <FadeIn delay={100}>
          <ReviewPrompt games={eligible} onWritten={loadSocial} />
        </FadeIn>

        {/* Arkadaş etkinliği KATALOG ŞERİTLERİNDEN ÖNCE. Sıra bilinçli:
            "Trend" ve "Yeni" herkese aynı şeyi gösteriyor, bu şerit ise
            yalnızca bu kullanıcıya ait. Kişiye özel olan, genel olanın
            üstünde durmalı. */}
        {lead === 'friends' && (
          <FadeIn delay={120}>
            <FriendActivity games={friendGames} />
          </FadeIn>
        )}

        {lead === 'forYou' && (
          <FadeIn delay={140}><Section title={t('home.forYou')} games={forYou} router={router} onDismiss={handleDismiss} /></FadeIn>
        )}
        {lead === 'trend' && (
          <FadeIn delay={140}><Section title={t('home.trend')} games={trend} router={router} /></FadeIn>
        )}

        {/* Yeni Çıkanlar ve İndirimdekiler LİDERİN ALTINDA, tam ağırlıkta.
            Akışa karıştırılmışlardı; geri alındı çünkü ikisi de NİYETLE
            aranıyor — "indirime ne girmiş" sorusunun akışta karşılığı yok. */}
        <FadeIn delay={200}><Section title={t('home.new')} games={fresh} router={router} /></FadeIn>
        <FadeIn delay={260}><Section title={t('home.sale')} games={sale} router={router} /></FadeIn>
    </View>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} />
      {/* ÜST bant burada YOK, bilerek: bu ekranda listenin tepesinde boşluk
          yok — "GAMERISEN" başlığı doğrudan üst kenarda başlıyor ve bandın
          içinde kalıp okunmaz hâle geliyordu. Diğer sekmelerde bant ya opak
          bir başlığın altında (oyunlar, haberler) ya da başlık üstündeki
          boşlukta (profil) duruyor; burada duracak yer yok. */}
      <BottomFade />
      <FlashList
        ref={listRef}
        onScroll={onTabScroll}
        scrollEventThrottle={16}
        data={feed}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
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

      {/* Raporlama, akıştaki inceleme kartlarına uzun basınca açılıyor. */}
      <ReportSheet
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        targetType="review"
        targetId={reportTarget ? `${reportTarget.appid}:${reportTarget.uid}` : ''}
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

function Section({ title, games, router, onDismiss }) {
  const { t } = useLanguage();
  if (!games || games.length === 0) return null;
  return (
    <View style={{ marginTop: 26 }}>
      <View style={styles.sectionHead}>
        {/* BÜYÜK YAZI TİPİNDE ÜST ÜSTE BİNİYORDU. Ölçüldü (simülatör,
            accessibility-extra-large): başlık iki satıra sarıyor ama satırda
            yer bırakmıyor, "Tümü ›" onun üstüne çıkıyordu.
            flex:1 + shrink:0 ikilisi: başlık kalan yeri alır, bağlantı
            asla ezilmez. */}
        <Text style={[styles.sectionTitle, { flex: 1 }]}>{title}</Text>
        <Pressable onPress={() => router.push('/games')} hitSlop={8} style={{ flexShrink: 0 }}>
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
  const mcColor = metacriticColor(game.metacritic);
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
      onPress={() => go(router, game)}
      onLongPress={onDismiss ? () => onDismiss(game) : undefined}
      delayLongPress={350}
    >
      <GameCover uri={game.image} style={styles.cardCover}>
        {game.metacritic ? (
          <View style={styles.mcBadge}><Text style={[styles.mcText, { color: mcColor }]}>{game.metacritic}</Text></View>
        ) : null}
        {game.isFree ? (
          <View style={styles.freeBadge}><Text style={styles.freeText}>Ücretsiz</Text></View>
        ) : null}
        <Text numberOfLines={2} style={styles.cardName}>{game.name}</Text>
      </GameCover>
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
  // Akıştaki inceleme kartı, oyun gönderileriyle AYNI dikey ritmi tutuyor
  // (GamePostCard marginBottom: 26). Bileşenin kendi 8'lik boşluğu kalsaydı
  // incelemeler bir sonraki oyuna yapışık görünürdü.
  feedReview: { marginBottom: 26 },
  // Dikey dolgu 6/4 idi ve 40px ikon bandı taşırıyordu; marka ile ikon
  // birbirine değiyordu. Bant ikonun boyuna göre açıldı.
  topBar: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 10,
    minHeight: 52,
  },
  // İkon akıştan çıkarıldı: normal akışta olsaydı marka ortadan kayardı.
  topRight: { position: 'absolute', right: spacing.lg - 6, top: 6 },
  // 40×40 + hitSlop 6 → etkin dokunma alanı 52×52, HIG alt sınırının üstünde
  topBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: type.headline, fontWeight: '900', color: colors.text, letterSpacing: 1.5 },

  // Arama artık hero'nun içinde değil, doğrudan başlıkta duruyor — yatay
  // boşluğu hero'dan devraldı ki bölüm başlıklarıyla aynı hizada kalsın.
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 14, marginHorizontal: spacing.lg,
    backgroundColor: colors.card, borderColor: colors.borderHover, borderWidth: 1.5,
    borderRadius: radius.lg, height: 56, paddingLeft: 18, paddingRight: spacing.sm,
  },
  searchText: { flex: 1, color: colors.text3, fontSize: type.subhead },
  searchBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },

  // gap eklendi: başlık sarınca iki öğe birbirine yapışıyordu.
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionTitle: {
    fontSize: type.caption, fontWeight: '700', color: colors.text2,
    textTransform: 'uppercase', letterSpacing: 1.1,
  },
  // Bölüm başına bir tane olduğu için ekranda üç kez tekrarlıyordu. Gideceği
  // yeri "›" zaten söylüyor; vurgu rengi buraya değil, sayfadaki tek gerçek
  // eyleme (arama düğmesi) ait.
  viewAll: { fontSize: type.footnote, color: colors.text2, fontWeight: '700' },
  row: { paddingHorizontal: spacing.lg, gap: spacing.md },
  card: { width: 132 },

  cardCover: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.card },
  cardName: { position: 'absolute', left: 10, right: 10, bottom: 9, color: '#fff', fontSize: type.footnote, fontWeight: '700', lineHeight: 16 },
  // tema-bagimsiz: oyun kapaginin ustundeki rozet; zemin gorsel
  mcBadge: { position: 'absolute', top: 7, right: 7, backgroundColor: 'rgba(8,10,14,0.75)', borderRadius: 7, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  mcText: { fontSize: type.caption2, fontWeight: '800' },
  freeBadge: { position: 'absolute', top: 7, left: 7, backgroundColor: colors.green, borderRadius: 7, paddingHorizontal: 6, paddingVertical: 2 },
  freeText: { fontSize: type.caption2, fontWeight: '800', color: '#04130d' },
});
