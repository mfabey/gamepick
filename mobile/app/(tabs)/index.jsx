import { memo, useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomFade } from '../../src/components/EdgeFade';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchTrending, fetchGames } from '../../src/api/games';
import { radius, spacing, TAB_SPACE, PRESSED, type, SECTION_TITLE, TOUCH_MIN } from '../../src/theme';
import { useStyles, useTheme } from '../../src/context/ThemeContext';
import { useTabBarScroll } from '../../src/context/TabBarContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { useTimeToData } from '../../src/dev/perf';
import FadeIn from '../../src/components/FadeIn';
import Greeting from '../../src/components/Greeting';
import GameCard from '../../src/components/GameCard';
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
import FriendActivity, { hasFriendSignal } from '../../src/components/FriendActivity';
import ReportSheet from '../../src/components/ReportSheet';
import ShareToFriendSheet from '../../src/components/ShareToFriendSheet';
import CardExpand from '../../src/components/CardExpand';
import { kaynakYaz, kucultmeAl } from '../../src/services/gecisKaynak';
import { fetchForYouCandidates } from '../../src/api/recommend';
import { getReviewFeed, getFriendActivity, fetchPosts } from '../../src/api/social';
import { getSession, subscribeSession } from '../../src/services/session';
import { getCollections, subscribeCollections } from '../../src/services/collectionsStore';
import { genreSlugsFor, rankCandidates } from '../../src/services/recommend';
import { interleaveReviews, mergeSocial, orderHighlights, mergeHighlights, highlightIds } from '../../src/services/homeFeed';
import { useTabPressAction, scrollRefToTop } from '../../src/hooks/useTabPressAction';
import { useReducedMotion } from '../../src/hooks/useReducedMotion';

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
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  // Sekmeye tekrar basınca listeyi başa sar (iOS'ta beklenen davranış)
  const listRef = useRef(null);
  useTabPressAction(useCallback(() => scrollRefToTop(listRef), []));
  const onTabScroll = useTabBarScroll();
  const { t, lang, formatPrice } = useLanguage();
  const router = useRouter();

  const { data: trendData } = useQuery('home:trending', fetchTrending, { ttl: 3 * 60 * 1000 });
  const { data: newData }   = useQuery('home:new', fetchNewGames, { ttl: 5 * 60 * 1000 });
  const { data: saleData }  = useQuery('home:sale', fetchSaleGames, { ttl: 5 * 60 * 1000 });

  // ── ŞERİT HAZIRLIĞI ──
  // Boş `image` alanı SÜZÜLÜYOR (aşağıdaki `kapakVar`) — ama ölçüldü: alan
  // pratikte hiç boş gelmiyor, gelen ADRES 404 veriyor. Steam varlık
  // yollarını hash'li biçime taşıdı ve `/apps/<id>/header.jpg` yeni
  // oyunlarda yok. Sunucu artık kapağı çözemediğinde `gorselYok`
  // işaretliyor (bkz. api/games/route.js).
  //
  // İŞARETLİLER ELENMİYOR, SONA ATILIYOR: oyun gerçek ve aranabilir
  // kalmalı — yalnız ilk ekranı boş kutuyla açmasın. Sıra içindeki göreli
  // düzen korunuyor.
  const hazirla = useCallback((list, n) => {
    const kapakVar = list.filter(
      (g) => !!(g?.image && typeof g.image === 'string' && g.image.trim() !== '')
    );
    if (!kapakVar.some((g) => g.gorselYok)) return kapakVar.slice(0, n);
    return [...kapakVar]
      .sort((a, b) => (a.gorselYok === b.gorselYok ? 0 : a.gorselYok ? 1 : -1))
      .slice(0, n);
  }, []);

  const trend = useMemo(
    () => hazirla(trendData?.results || trendData?.games || [], 14), [trendData, hazirla]);
  const fresh = useMemo(() => hazirla(newData?.results || [], 12), [newData, hazirla]);
  const sale  = useMemo(() => hazirla(saleData?.results || [], 12), [saleData, hazirla]);

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
  // ── TÜR İMZASI OTURUM BOYUNCA SABİT ──────────────────────────────────────
  // ÖLÇÜLDÜ, ÜÇ AŞAMADA. "Senin için" şeridi her geri dönüşte değişiyordu ve
  // arkasında üç ayrı mekanizma vardı; ikisini kapatınca üçüncüsü kaldı:
  //   1. useForYouFeed'in SIRALI sıfırlama imzası      → sırasız yapıldı
  //   2. rankCandidates'ın seenIds/profile bağımlılığı → bağımlılıktan çıktı
  //   3. topGenres(4)'ün KÜMESİ                        → burası
  //
  // Detay her açılışta `recordSignal({type:'view'})` çağırıyor; ağırlıklar
  // oynayınca 4. sıradaki tür değişebiliyor, aday sorgusunun anahtarı farklı
  // çıkıyor ve şerit baştan çekiliyordu. Ölçüm: ilk karta girip çıkınca şerit
  // Manor Lords · SUPERHOT VR · Baldur's iken Crusader Kings III · Sayonara
  // Wild Hearts · Red Alert oluyordu.
  //
  // İLK DOLU DEĞER DONUYOR: profil AsyncStorage'dan asenkron geliyor, ilk
  // render'da boş olabiliyor — boş değeri dondurmak şeridi kalıcı olarak
  // yedek türlere kilitlerdi.
  //
  // Öneri KAYBOLMUYOR: profil birikmeye devam ediyor ve uygulamanın bir
  // sonraki açılışında yeni imza kullanılıyor. Değişen tek şey, kullanıcı
  // ekrandayken listenin ayağının altından kaymaması.
  const canliSluglar = genreSlugsFor(topGenres(4));
  const sluglarRef = useRef(null);
  if (!sluglarRef.current && canliSluglar.length > 0) sluglarRef.current = canliSluglar;
  const forYouSlugs = sluglarRef.current || canliSluglar;
  // Adaylar tür imzasına göre cache'li.
  //
  // ANAHTAR SIRASIZ — bkz. useForYouFeed'deki aynı gerekçe. Sıralı anahtar,
  // her detay ziyaretinden sonra tür ağırlıkları oynayınca DEĞİŞİYOR ve
  // önbelleği ıskalıyordu: "Senin için" şeridi her dönüşte baştan çekiliyor,
  // farklı oyunlar gösteriyordu. Küme aynıysa adaylar da aynı; sıra yalnızca
  // sıralamayı etkiliyor, o da aşağıda `genreWeights` ile ayrıca yapılıyor.
  const candKey = `foryou-cand:${[...forYouSlugs].sort().join(',')}`;
  const { data: candData } = useQuery(
    candKey,
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
  //
  // ── ŞERİT AYAĞIN ALTINDAN KAYMIYOR ───────────────────────────────────────
  // `seenIds` ve `profile` BİLEREK bağımlılık DEĞİL. İkisi de bir oyuna
  // bakıldığı anda değişiyor (detay `recordSignal({type:'view'})` çağırıyor,
  // oyun "görüldü"ye yazılıyor) ve şerit geri dönüldüğünde baştan sıralanıyordu.
  //
  // ÖLÇÜLDÜ: ilk karttan girip geri çıkınca şerit RimWorld · RDR2 · Baldur's
  // iken Manor Lords · SUPERHOT VR · Baldur's oluyordu. Büyüme geçişi eklenince
  // bu görünür bir kusura döndü: kapak, artık BAŞKA bir oyunun durduğu yuvaya
  // küçülüyor.
  //
  // Kural zaten depoda yazılı (useForYouFeed başlığı): "her sayfa çekildiği
  // anda sıralanır ve bir daha yeniden sıralanmaz; böylece kullanıcı
  // kaydırırken liste ayağının altından kaymaz." Şerit de aynı yüzeyde.
  // Değerler yine GÜNCEL okunuyor — yalnız yeniden hesabı tetiklemiyorlar.
  //
  // `dismissedIds` bağımlılıkta KALIYOR: "×" kullanıcının kendi eylemi,
  // sonucunu anında görmeli.
  const forYou = useMemo(
    () => (candData ? rankCandidates(candData, { genreWeights: normalizedGenres(), ownedNames, seenIds, dismissedIds, limit: 12 }) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [candData, ownedNames, dismissedIds]
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
    // getEligibleGames ARTIK CAGRILMIYOR: tek tuketicisi "Bunlari oynadin"
    // bolumuydu ve o kalkti. Her anasayfa acilisinda atilan jetonlu bir
    // istek daha az.
    if (!session) { setFriendGames([]); return; }
    // Steam bağlı değilse boş liste dönüyor (hata değil) → şerit çizilmiyor.
    getFriendActivity().then((r) => setFriendGames(r?.games || [])).catch(() => {});
  }, [session]);
  useEffect(() => { loadSocial(); }, [loadSocial]);

  // "İlgilenmiyorum" anında yansısın (sıralama bozulmadan), ardından
  // incelemeler oyun gönderilerinin arasına giriyor.
  //
  // HARMANLAMA ELEMEDEN SONRA: önce harmanlanıp sonra elenseydi bir oyun
  // kartı düştüğünde inceleme aralıkları kayardı.
  // ── Selamlama verisi (Faz 1) ──
  // Basamak sırası Faz 1'de yazılı: en somut olan kazanır. UYDURMA YOK —
  // her basamak zaten çektiğimiz bir kaynaktan besleniyor, beslenemeyen
  // basamak (bugün çıkanlar, inceleme yanıtları) hiç yazılmadı.

  // 1) Kaydettiğin bir oyun indirimde.
  //    Ayrı bir "istek listesi" yok; koleksiyonlar İSTEK LİSTESİNİN kendisi —
  //    kullanıcının elle ayırdığı oyunlar. İndirim listesiyle kesişimini
  //    alıyoruz ve en yüksek indirimli olanı seçiyoruz.
  const [kayitli, setKayitli] = useState(() => getCollections());
  useEffect(() => subscribeCollections(() => setKayitli(getCollections())), []);
  const indirimliIstek = useMemo(() => {
    if (!sale?.length || !kayitli?.length) return null;
    const idler = new Set();
    for (const k of kayitli) for (const g of k.games || []) idler.add(String(g.id));
    if (idler.size === 0) return null;
    const eslesen = sale.filter((g) => idler.has(String(g.id)) && (g.discount || 0) > 0);
    if (eslesen.length === 0) return null;
    return [...eslesen].sort((a, b) => (b.discount || 0) - (a.discount || 0))[0];
  }, [sale, kayitli]);

  // 2) Arkadaşların oynuyor. FriendActivity'nin EŞİĞİNİ paylaşıyoruz
  //    (hasFriendSignal): şerit çizilmeyecek kadar zayıf bir sinyal
  //    selamlamada da cümle kurmamalı.
  const arkadasOzet = useMemo(() => {
    if (!hasFriendSignal(friendGames)) return null;
    const enCok = [...friendGames].sort((a, b) => (b.count || 0) - (a.count || 0))[0];
    const kisi = Number(enCok?.count) || 0;
    const ilk = enCok?.friends?.[0]?.name || enCok?.friend?.name || null;
    if (!ilk || kisi < 1) return null;
    return { kisi, ilk, oyun: enCok };
  }, [friendGames]);

  // Cümledeki her bağlamın kendi hedefi var — selamlama okunacak bir başlık
  // değil, tek dokunuşluk bir kısayol. Oyuna giderken parametreler GameCard
  // ile aynı: detay ekranı ad/kapak beklemeden çiziliyor.
  const baglamaGit = useCallback((hedef, oyun) => {
    if (hedef === 'game' && oyun?.id) {
      router.push({
        pathname: '/game/[id]',
        params: {
          id: String(oyun.id), name: oyun.name, image: oyun.image || '',
          slug: oyun.rawgSlug || '', hasSteam: oyun.hasSteam ? '1' : '',
        },
      });
      return;
    }
    if (hedef === 'friends') { router.push('/social'); return; }
    // "Senin için" motorunun kendi ekranı deste — aynı useForYouFeed'i
    // kullanıyor, dolayısıyla cümledeki sayı orada birebir karşılanıyor.
    if (hedef === 'foryou')  { router.push('/swipe'); return; }
    router.push('/reviews');
  }, [router]);

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
    // Görseli olanları başa al, görseli olmayanları en sona at
    const sortedGames = [...games].sort((a, b) => {
      const aImg = !!(a?.image && typeof a.image === 'string' && a.image.trim() !== '');
      const bImg = !!(b?.image && typeof b.image === 'string' && b.image.trim() !== '');
      if (aImg && !bImg) return -1;
      if (!aImg && bImg) return 1;
      return 0;
    });
    // İnceleme ve gönderiler TEK sosyal akışta birleşiyor (en yeni önce),
    // sonra oyunların arasına serpiştiriliyor.
    const social = mergeSocial(reviews, posts);
    return mergeHighlights(interleaveReviews(sortedGames, social), highlights);
  }, [feedItems, dismissedIds, reviews, posts, highlights]);

  // ── Paylaşım ──
  // GÖRÜNÜR DÜĞME, gizli jest değil. Bir ara uzun basma + menü olarak
  // yazılmıştı; uzun basma keşfedilemiyor ve menü tek dokunuşluk bir işi
  // iki dokunuşa çıkarıyordu. Düğme kartın sağ alt köşesinde.
  const [paylas, setPaylas] = useState(null);       // { gameId, name }

  // "İlgilenmiyorum" — "×" düğmesinden → onay → feed'den kaldır
  const handleDismiss = useCallback((game) => {
    Alert.alert(game.name, t('home.dismissPrompt'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('home.notInterested'), style: 'destructive', onPress: () => recordDismiss(game.id) },
    ]);
  }, [t]);

  // ── BÜYÜME GEÇİŞİ ──
  // Kart, kapağının ekrandaki çerçevesini veriyor; bindirme oradan
  // detayın kapak alanına (0,0,genişlik,320) büyüyor ve VARINCA
  // gezinme yapılıyor. Bindirme, detay ilk karesini çizene kadar duruyor.
  //
  // Reduce Motion'da geçiş hiç kurulmuyor: hareket bilgi taşımıyor,
  // yalnız sürekliliği anlatıyor.
  const azalt = useReducedMotion();
  const [buyuyen, setBuyuyen] = useState(null);   // { cerceve, game }

  const kartAc = useCallback((cerceve, game) => {
    if (azalt || !cerceve) { go(router, game); return; }
    // ÇERÇEVE GERİ DÖNÜŞ İÇİN SAKLANIYOR. Detay ekranı geri çıkarken aynı
    // kutuya küçülüyor; kartın nerede durduğunu ondan başka bilen yok ve
    // o an anasayfa çoktan arka planda kalmış oluyor.
    kaynakYaz(game?.id, { ...cerceve });
    setBuyuyen({ ...cerceve, game });
  }, [azalt, router]);

  const buyumeVardi = useCallback(() => {
    const g = buyuyen?.game;
    if (!g) return;
    // `buyume: '1'` → ekranın kendi alttan-kayması KAPALI (bkz. _layout).
    // Kapak zaten büyüyerek yerine oturdu; ikinci bir açılış animasyonu
    // sayfayı iki kez açıyormuş gibi gösteriyordu.
    router.push({
      pathname: '/game/[id]',
      params: {
        id: String(g.id), name: g.name, image: g.image || '',
        slug: g.rawgSlug || '', hasSteam: g.hasSteam ? '1' : '',
        // appid ŞART OLDU: geçiş artık arkadaş ve inceleme kartlarını da
        // taşıyor, ikisi de detaya slug'la değil appid'yle gidiyor. Burada
        // düşseydi o iki yol büyüdükten sonra boş detaya inerdi.
        ...(g.appid ? { appid: String(g.appid) } : {}),
        buyume: '1',
      },
    });
  }, [buyuyen, router]);

  // ── GERİ ÇIKIŞ KÜÇÜLMESİ BURADA OYNUYOR ─────────────────────────────────
  // Detay ekranı animasyonu KENDİ üstünde oynatıyordu; kullanıcı "kasıyor"
  // dedi. Ağır bir ekranın (ScrollView + ekran görüntüsü şeridi + video
  // oynatıcı) üstünde 380 ms animasyon, üstelik opak zeminin arkasında
  // donmuş görünen bir sayfa. Şimdi detay yalnız istek bırakıp hemen
  // çıkıyor, küçülme burada — o ekran söküldükten sonra — oynuyor.
  //
  // Odak etkisinde okunuyor: pop `animation:'none'` ile anında olduğu için
  // bu ekran görünür olur olmaz bindirme p=1'de (tam ekran kapak) açılıyor.
  const [kuculen, setKuculen] = useState(null);
  const kucultmeBitti = useCallback(() => setKuculen(null), []);

  useFocusEffect(useCallback(() => {
    const bekleyen = kucultmeAl();
    if (bekleyen) setKuculen(bekleyen);
    // Ekrandan çıkarken BÜYÜME bindirmesi kalmasın (detay devraldı).
    return () => setBuyuyen(null);
  }, []));

  const paylasAc = useCallback((game) => {
    setPaylas({ gameId: String(game.id), name: game.name });
  }, []);

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
        onExpand={kartAc}
        onLongPress={() => setReportTarget(item.review)}
        style={styles.feedReview}
      />
    ) : (
      <GamePostCard game={item.game} tag={item.tag} onDismiss={handleDismiss} onExpand={kartAc} />
    )
  ), [handleDismiss, kartAc, requireAccount, styles]);

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
          {/* KELİME MARKASI — YENİ TASARIM PROJESİNE GÖRE.
              Eski handoff'un maketi küçük harf "gamerisen" + kırmızı nokta
              gösteriyordu ve öyle uygulanmıştı. Yeni projenin Faz 1 kareleri
              (üçü de: iOS koyu, iOS açık, Android) "GAMERISEN" yazıyor.
              Kullanıcı çelişkide yeni projeyi seçti.

              maxFontSizeMultiplier 1.4 KALIYOR: erişilebilirlik boyutlarında
              marka ekran genişliğini aşıp haber ikonunun üstüne biniyordu. */}
          <Text style={styles.brand} maxFontSizeMultiplier={1.4} numberOfLines={1}>GAMERISEN</Text>
          {/* Faz 1 karelerinde sağ üstte TEK simge var (haberler); arama
              aşağıda kendi kutusunda. Arama ikonu buradan kalktı. */}
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

        {/* ── Selamlama (Faz 1) ──
            Marka satırının ALTINDA, aramanın ÜSTÜNDE; kaydırmada gider
            (yapışkan değil). Faz 1: "Yapışkan olsa kalıcı bir kabuk olurdu —
            o zaman içerikle yarışırdı." */}
        <FadeIn delay={40}>
          <Greeting
            name={session?.user?.name || null}
            saleWish={indirimliIstek}
            friends={arkadasOzet}
            forYouCount={forYou.length}
            isCold={isCold}
            onContext={baglamaGit}
          />
        </FadeIn>

        {/* ── Arama ──
            YENİ TASARIM PROJESİNE GÖRE GERİ GELDİ. Eski handoff'un maketi
            aramayı başlıktaki bir ikona indiriyordu ve öyle uygulanmıştı;
            Faz 1'in üç karesi de aramayı kendi kutusunda gösteriyor ve karar
            tablosunda gerekçesi yazılı: "Ekranın tek kırmızısı: 44×44 dolgulu
            düğme — Von Restorff + Fitts. Kırmızı tek anlam taşıyor: buraya
            dokun."

            Kutu METİN ALMIYOR, /games'e götürüyor — arama alanı orada. */}
        <FadeIn delay={100}>
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

        {/* Arkadaş etkinliği KATALOG ŞERİTLERİNDEN ÖNCE. Sıra bilinçli:
            "Trend" ve "Yeni" herkese aynı şeyi gösteriyor, bu şerit ise
            yalnızca bu kullanıcıya ait. Kişiye özel olan, genel olanın
            üstünde durmalı. */}
        {lead === 'friends' && (
          <FadeIn delay={120}>
            <FriendActivity games={friendGames} onExpand={kartAc} />
          </FadeIn>
        )}

        {lead === 'forYou' && (
          <FadeIn delay={140}><Section title={t('home.forYou')} games={forYou} router={router} onDismiss={handleDismiss} onShare={paylasAc} onExpand={kartAc} /></FadeIn>
        )}
        {lead === 'trend' && (
          <FadeIn delay={140}><Section title={t('home.trend')} games={trend} router={router} onShare={paylasAc} onExpand={kartAc} /></FadeIn>
        )}

        {/* Yeni Çıkanlar ve İndirimdekiler LİDERİN ALTINDA, tam ağırlıkta.
            Akışa karıştırılmışlardı; geri alındı çünkü ikisi de NİYETLE
            aranıyor — "indirime ne girmiş" sorusunun akışta karşılığı yok. */}
        <FadeIn delay={200}><Section title={t('home.new')} games={fresh} router={router} onShare={paylasAc} onExpand={kartAc} /></FadeIn>
        <FadeIn delay={260}><Section title={t('home.sale')} games={sale} router={router} onShare={paylasAc} onExpand={kartAc} /></FadeIn>
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
      {/* Büyüme geçişi bindirmesi — her şeyin ÜSTÜNDE. */}
      <CardExpand
        kaynak={buyuyen}
        onVar={buyumeVardi}
      />

      {/* Geri çıkış: kapak detayın 320pt alanından kartın çerçevesine küçülür. */}
      <CardExpand
        kaynak={kuculen}
        yon="kucul"
        onVar={kucultmeBitti}
      />

      <ShareToFriendSheet
        visible={!!paylas}
        onClose={() => setPaylas(null)}
        gameId={paylas?.gameId}
        gameName={paylas?.name}
      />

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

function Section({ title, games, router, onDismiss, onShare, onExpand }) {
  const { t } = useLanguage();
  // Kanca erken donusten ONCE: asagida `games` bossa null donuluyor.
  const styles = useStyles(makeStyles);
  if (!games || games.length === 0) return null;
  return (
    <View style={{ marginTop: spacing.s24 }}>
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
        {games.map(g => <HomeCard key={g.id} game={g} router={router} onDismiss={onDismiss} onShare={onShare} onExpand={onExpand} />)}
      </ScrollView>
    </View>
  );
}

// Şerit kartı artık TEK KART AİLESİNDEN geliyor. Öncesinde burada ayrı bir
// kart vardı: kendi rozetleri, kendi ad bindirmesi, kendi 132pt genişliği.
// HTML ölçüsü 148 ("eski 132 değil") ve ad kapağın altında — ikisi de
// GameCard'ın rail varyantında.
const HomeCard = memo(function HomeCard({ game, router, onDismiss, onShare, onExpand }) {
  return (
    <GameCard
      game={game}
      variant="rail"
      // `onExpand` verildiğinde dokunuş doğrudan gezinmiyor: kapak
      // çerçevesi ölçülüp büyüme geçişi başlıyor (bkz. CardExpand).
      onPress={onExpand ? undefined : () => go(router, game)}
      onExpand={onExpand}
      // FAZ 1: eleme artık GÖRÜNÜR bir "×". `onDismiss` yalnızca "Senin için"
      // şeridinden geliyor — Yeni ve İndirim şeritleri onu göndermiyor,
      // dolayısıyla orada daire de çıkmıyor.
      onDismiss={onDismiss}
      // Paylaşım GÖRÜNÜR bir düğme: kapağın sağ alt köşesinde.
      onShare={onShare}
    />
  );
});

const makeStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  // Tek sütuna geçilince listenin yatay dolgusu kaldırıldı: gönderi kartı
  // kendi kenar boşluğunu (spacing.lg) taşıyor ve böylece bölüm başlıklarıyla
  // AYNI hizada duruyor. Dolgu kalsaydı kartlar içeri kaçardı.
  listContent: {},
  // Başlık tam genişlikte kalsın diye listenin yatay dolgusu geri alınıyor.
  // paddingBottom ŞART: başlığın son bölümü (İndirimdekiler) ile altındaki
  // iki sütunlu ızgara bitişik duruyordu, ızgara o bölümün devamı gibi
  // görünüyordu. 24 = bölümler arası boşlukla aynı ritim (Faz 1: 26 → 24).
  headerWrap: { paddingBottom: spacing.s24 },
  // Akıştaki inceleme kartı, oyun gönderileriyle AYNI dikey ritmi tutuyor
  // (GamePostCard marginBottom: s24). Bileşenin kendi 8'lik boşluğu kalsaydı
  // incelemeler bir sonraki oyuna yapışık görünürdü.
  feedReview: { marginBottom: spacing.s24 },
  // Dikey dolgu 6/4 idi ve 40px ikon bandı taşırıyordu; marka ile ikon
  // birbirine değiyordu. Bant ikonun boyuna göre açıldı.
  // Marka artık ORTALI DEĞİL, sola yaslı (makette öyle).
  // YATAY hizayı alignItems yönetiyor: bu View sütun yönlü, yani ana eksen
  // DİKEY. justifyContent'i değiştirmek yatayda hiçbir şey yapmıyor —
  // ilk denemede onu değiştirdim ve marka ortada kaldı.
  topBar: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.s20, paddingTop: spacing.s8, paddingBottom: spacing.s12,
    minHeight: 52,
  },
  // İkon akıştan çıkarıldı: marka sola yaslandı ama düğme sağ kenarda kalmalı.
  // Maket: iki dugme, aralari 12, sag kenardan 20.
  topRight: {
    position: 'absolute', right: spacing.s20, top: spacing.s8,
    flexDirection: 'row', gap: spacing.s12,
  },
  // Maket: 36x36, r99, surface3 dolgulu. Bizde 40x40 ve dolgusuzdu.
  // hitSlop 6 ile etkin dokunma alani 48x48 -- HIG'in 44 sinirinin ustunde.
  topBtn: {
    width: 36, height: 36, borderRadius: radius.pill,
    backgroundColor: colors.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },
  // Faz 1: arama ekranın tek kırmızısı. Kutu nötr, düğme accent.
  search: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s12,
    marginTop: spacing.s12, marginHorizontal: spacing.s20,
    backgroundColor: colors.card, borderColor: colors.borderHover, borderWidth: 1.5,
    borderRadius: radius.lg, height: 56, paddingLeft: spacing.s16, paddingRight: spacing.s8,
  },
  searchText: { flex: 1, color: colors.text3, fontSize: type.subhead },
  // 44×44 — Faz 1 ölçüsü ve HIG dokunma hedefi.
  searchBtn: {
    width: TOUCH_MIN, height: TOUCH_MIN, borderRadius: radius.md,
    // accent-serbest: yalniz ok simgesi tasiyor, metin yok — WCAG grafik esigi 3:1 ve accent 4.45 onu asiyor
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  // letterSpacing 1.5 KALKTI: o değer BÜYÜK HARF yazı içindi. Küçük harf
  // kelime markasında harf aralığı açmak kelimeyi dağıtıyor.
  // Maketten olculdu: 22px / 700 / -0.44px. Bizde 20 / 900 / 0 idi.
  // Faz 1 kareleri: GAMERISEN, ortalı. Büyük harf marka olduğu için
  // harf aralığı geri geldi.
  brand: { fontSize: type.headline, fontWeight: '900', color: colors.text, letterSpacing: 1.5 },
  // Makette markanın hemen ardındaki kırmızı işaret.
  //
  // Dikey yer TABANA bağlı, keyfi bir marginTop'a değil: ilk denemede
  // `marginTop: 6` yazdım, boşluk cırcırı yakaladı ve haklıydı — 6 ölçekte
  // yok. flex-end + 4pt, noktayı yazının taban çizgisine oturtuyor ve yazı


  // gap eklendi: başlık sarınca iki öğe birbirine yapışıyordu.
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.s8, paddingHorizontal: spacing.s20, marginBottom: spacing.md },
  sectionTitle: { ...SECTION_TITLE, color: colors.text2 },
  // Bölüm başına bir tane olduğu için ekranda üç kez tekrarlıyordu. Gideceği
  // yeri "›" zaten söylüyor; vurgu rengi buraya değil, sayfadaki tek gerçek
  // eyleme (arama düğmesi) ait.
  // MAKET KIRMIZI DIYOR. Bizde text2 idi ve gerekcesi yaziliydi ("ekran
  // basina en cok 3 kirmizi oge"). Maket birebir izleniyor; ikisi
  // arasindaki gerilim handoff'un kendi icinde -- bkz. commit.
  // FAZ 1 ÖZ-DENETİMİ: "Kırmızı: içerik katmanında BİR TANE (arama
  // düğmesi)." "Tümü ›" kırmızıydı ve her bölümde tekrar ediyordu —
  // beş bölümde beş kırmızı, arama düğmesinin ayırt ediciliği bitiyordu.
  // Maket ölçüsü: 13 · 700 · #9aa3b0 (koyu) / #5a6270 (açık) = text2.
  viewAll: { fontSize: type.footnote, color: colors.text2, fontWeight: '700' },
  row: { paddingHorizontal: spacing.s20, gap: spacing.md },

  // tema-bagimsiz: oyun kapaginin ustundeki rozet; zemin gorsel
});
