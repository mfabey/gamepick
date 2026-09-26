import { memo, useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomFade } from '../../src/components/EdgeFade';
import { useRouter, useFocusEffect } from 'expo-router';
import { fetchTrending, fetchGames } from '../../src/api/games';
import { spacing } from '../../src/theme';
import { useTabBosluk } from '../../src/hooks/useAltBosluk';
import { useYanBosluk } from '../../src/hooks/useIcerikAlani';
import { useStyles, useTheme } from '../../src/context/ThemeContext';
import { useTabBarScroll } from '../../src/context/TabBarContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { useTimeToData } from '../../src/dev/perf';
import FadeIn from '../../src/components/FadeIn';
import Greeting from '../../src/components/Greeting';
import HeroRail from '../../src/components/ui/HeroRail';
import HomeMedia from '../../src/components/ui/HomeMedia';
import GameCard from '../../src/components/ui/GameCard';
import { HomeHeader } from '../../src/components/ui/Navigation';
import { IconButton, SectionHeader } from '../../src/components/ui/Primitives';
import { DealCard, PriceDropCard, Rail } from '../../src/components/ui/GameCards';
import { FriendTile } from '../../src/components/ui/Social';
import { usePrice } from '../../src/hooks/usePrice';
import { component as K, layout } from '../../src/theme/tokens';
import { useAuth } from '../../src/context/AuthContext';
import { useQuery } from '../../src/hooks/useQuery';
import { useTasteProfile } from '../../src/hooks/useTasteProfile';
import { useOwnedGames } from '../../src/hooks/useOwnedGames';
import { useLibraryTaste } from '../../src/hooks/useLibraryTaste';
import { useSeen } from '../../src/hooks/useSeen';
import { useDismissed } from '../../src/hooks/useDismissed';
import { useForYouFeed } from '../../src/hooks/useForYouFeed';
import { recordDismiss } from '../../src/services/dismissStore';
import GamePostCard from '../../src/components/GamePostCard';
import CevrimdisiBant from '../../src/components/CevrimdisiBant';
import ReviewCard from '../../src/components/ReviewCard';
import PostCard from '../../src/components/PostCard';
import { hasFriendSignal } from '../../src/components/FriendActivity';
import ModerasyonKatmani from '../../src/components/ModerasyonKatmani';
import { suz } from '../../src/services/engel';
import { useEngelliler } from '../../src/hooks/useEngelliler';
import { useModerasyon } from '../../src/hooks/useModerasyon';
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
  const tabBosluk = useTabBosluk();
  const yan = useYanBosluk();
  const { colors } = useTheme();
  // Sekmeye tekrar basınca listeyi başa sar (iOS'ta beklenen davranış)
  const listRef = useRef(null);
  useTabPressAction(useCallback(() => scrollRefToTop(listRef), []));
  const onTabScroll = useTabBarScroll();
  const { t, lang, formatPrice } = useLanguage();
  const router = useRouter();
  // Başlıktaki avatar (G-04) — sekme çubuğundaki profil avatarıyla aynı kaynak.
  const { account } = useAuth();

  const { data: trendData, ts: trendTs, refetch: trendTazele } = useQuery('home:trending', fetchTrending, { ttl: 3 * 60 * 1000 });
  const { data: newData, ts: newTs, refetch: newTazele }       = useQuery('home:new', fetchNewGames, { ttl: 5 * 60 * 1000 });
  const { data: saleData, ts: saleTs, refetch: saleTazele }    = useQuery('home:sale', fetchSaleGames, { ttl: 5 * 60 * 1000 });

  // ── BANDIN OKUDUĞU DAMGA: ÜÇÜNÜN EN ESKİSİ ──
  // Anasayfa üç ayrı sorgudan besleniyor ve üçü ayrı anlarda tazeleniyor.
  // En YENİSİ yazılsaydı bant, ekrandaki en bayat şeridi gizleyerek
  // olduğundan taze gösterirdi. En eskisi "içerik EN AZ bu kadar eski"
  // diyor — eksik tarafta yanılmak, fazla tarafta yanılmaktan iyidir.
  const enEskiTs = useMemo(() => {
    const hepsi = [trendTs, newTs, saleTs].filter(Boolean);
    return hepsi.length ? Math.min(...hepsi) : 0;
  }, [trendTs, newTs, saleTs]);

  const hepsiniTazele = useCallback(() => {
    trendTazele(); newTazele(); saleTazele();
  }, [trendTazele, newTazele, saleTazele]);

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

  // ── HERO RAYI TRENDİN BAŞINI ALIYOR, GERİSİ AŞAĞIDA ──
  // G-04'ün öne çıkan kartları trend listesinin ilk beşi. Aynı beş oyun
  // aşağıda (lider trend şeridi ya da akışa karışan trend) ikinci kez
  // görünmesin diye oralara yalnız KALANI gidiyor: "lider olarak kullanılan
  // liste akışa tekrar girmiyor" kuralının hero için karşılığı. Kayan kapak
  // şeridi bir kez tam bu tekrar yüzünden kaldırılmıştı.
  const heroGames = useMemo(() => trend.slice(0, 5), [trend]);
  const trendRest = useMemo(() => trend.slice(heroGames.length), [trend, heroGames]);

  // Haber ve video verisi BURADA DEĞİL, `HomeMedia` içinde çekiliyor: G-04'te
  // "Oyun Dünyasından" ve "İzlemeye Değer" bölümleri var. Önbellek anahtarları
  // /news (`news:v2:<dil>`) ve Videolar sekmesiyle (`video-catalog:<dil>`)
  // ortak; ikinci ekran açılınca istek tekrarlanmıyor.

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
  const mod = useModerasyon();
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
    if (hedef === 'friends') { router.push('/friends'); return; }
    // "Senin için" motorunun kendi ekranı deste — aynı useForYouFeed'i
    // kullanıyor, dolayısıyla cümledeki sayı orada birebir karşılanıyor.
    if (hedef === 'foryou')  { router.push('/swipe'); return; }
    router.push('/reviews');
  }, [router]);

  // ── Bölüm düzeni ──
  // 1.x'te TEK lider vardı (arkadaşlar / Senin İçin / trend; kişiye en özel
  // olan) çünkü dört aynı biçimli şerit gözü yoruyor ve sosyal akışı kıvrımın
  // ~1000pt altına itiyordu. 2.0'da bölümler FARKLI kart aileleri (oyun kartı,
  // fiyat kartı, arkadaş, bilet) — tasarımın hiyerarşi çözümü bu.
  //
  // 2.0 (G-04): bölümlerin SIRASI tasarımdan geliyor, lider seçimi kalktı:
  // Senin İçin → Fiyatı Düşenler → Arkadaşlar → Fırsatlar. Veri olan her
  // bölüm görünüyor; eskiden arkadaş şeridi liderken "Senin İçin" hiç
  // çizilmiyordu. Trend şeridi yalnız "Senin İçin" boşken (soğuk kullanıcı)
  // onun yerini tutuyor — hero zaten trendin ilk beşi.
  const showForYou = !isCold && forYou.length > 0;
  const showFriends = hasFriendSignal(friendGames);
  const showTrendRail = !showForYou;

  // Lider olarak kullanılan liste akışa TEKRAR girmiyor.
  // Yeni Çıkanlar ve İndirimdekiler AKIŞTAN ÇIKTI, kendi şeritlerine döndüler:
  // ikisi de niyetle aranan bölümler ("indirime ne girmiş?") ve akışın içine
  // dağılınca o niyet karşılanamıyordu. Akışa karışan tek şey trend — o zaten
  // "şuna da bak" cinsinden, aranan bir şey değil.
  const highlights = useMemo(() => orderHighlights({
    trend: showTrendRail ? [] : trendRest,
  }), [showTrendRail, trendRest]);

  // "Çünkü RPG oyunlarını seviyorsun": adaylar hangi tür imzasıyla çekildiyse
  // (donmuş `forYouSlugs`) onun ilki. Uydurma gerekçe yok — şeridi gerçekten
  // belirleyen tür.
  const forYouReason = useMemo(() => {
    const slug = forYouSlugs[0];
    const ad = slug ? t(`genre.${slug}`) : null;
    return ad && ad !== `genre.${slug}` ? t('v2.forYouBecause').replace('{genre}', ad) : undefined;
  }, [forYouSlugs, t]);

  // İndirim listesi iki tasarım bölümüne bölünüyor: en yüksek iki indirim
  // "Kaçırılmayacak Fırsatlar" bileti, kalanı "Fiyatı Düşenler". Fiyatı
  // olmayan öğe fiyat kartına giremiyor; hiçbirinin fiyatı yoksa eski oyun
  // kartı şeridi duruyor (usePrice kendi çeker).
  const { deals, drops } = useMemo(() => {
    const fiyatli = sale.filter((g) => g.price != null && g.original > g.price && (g.discount || 0) > 0);
    const secilen = [...fiyatli].sort((a, b) => (b.discount || 0) - (a.discount || 0)).slice(0, K.home.dealCount);
    const ayrilan = new Set(secilen.map((g) => String(g.id)));
    return { deals: secilen, drops: fiyatli.filter((g) => !ayrilan.has(String(g.id))) };
  }, [sale]);

  // Engel kümesi değişince akış yeniden süzülüyor — bkz. services/engel.js.
  const engelSurumu = useEngelliler();

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
    // ENGEL SÜZGECİ KAYNAKTA: harmanlamadan ÖNCE. Sonra süzseydik
    // araya serpiştirme aralıkları kayar ve oyun kartlarının sırası
    // engellenen kişiye göre değişirdi (aynı gerekçe 'İlgilenmiyorum'
    // elemesinde de yazılı).
    const social = mergeSocial(
      suz(reviews, (r) => r?.author?.uid || r?.uid),
      suz(posts, (x) => x?.author?.uid || x?.uid),
    );
    return mergeHighlights(interleaveReviews(sortedGames, social), highlights);
  }, [feedItems, dismissedIds, reviews, posts, highlights, engelSurumu]);

  // ── Paylaşım BU EKRANDA DEĞİL ──
  // Şerit kartlarının kapağında bir "arkadaşa gönder" dairesi vardı; dört
  // şeritteki her kartta çıkıyor, kapağı kaplıyordu. Eylem oyun detayına
  // taşındı: gönderme kararı kartta değil, oyunu açtıktan sonra veriliyor.
  // Bkz. app/game/[id].jsx üst çubuğundaki gönderme düğmesi.

  // "İlgilenmiyorum" — "×" düğmesinden → onay → feed'den kaldır
  const handleDismiss = useCallback((game) => {
    Alert.alert(game.name, t('home.dismissPrompt'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('home.notInterested'), style: 'destructive', onPress: () => recordDismiss(game) },
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
        slug: g.rawgSlug || '', appid: g.appid ? String(g.appid) : '', hasSteam: g.hasSteam ? '1' : '',
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
      <PostCard
        post={item.post}
        onRequireAccount={requireAccount}
        onMenu={(k) => mod.acMenu(k, { targetType: 'post', targetId: String(item.post.id) })}
        compact
      />
    ) : item.kind === 'review' ? (
      <ReviewCard
        review={item.review}
        onExpand={kartAc}
        onMenu={(k) => mod.acMenu(k, { targetType: 'review', targetId: `${item.review.appid}:${item.review.uid}` })}
        onLongPress={() => mod.acMenu(item.review.author, { targetType: 'review', targetId: `${item.review.appid}:${item.review.uid}` })}
      />
    ) : (
      <GamePostCard game={item.game} tag={item.tag} onDismiss={handleDismiss} onExpand={kartAc} />
    )
  ), [handleDismiss, kartAc, requireAccount, styles, mod]);

  // Mevcut bölümlerin tamamı listenin başlığı olur → tek kaydırma, tek liste.
  const header = (
    <View style={styles.headerWrap}>

        {/* G-04 başlığı: arama · bildirim · avatar. Bildirim merkezi (G-20)
            henüz yok; sahte bir zil yerine çalışan haber girişi duruyor. */}
        <HomeHeader
          onSearch={() => router.push('/games')}
          avatar={account?.avatar}
          name={account?.displayName || account?.username}
          onProfile={() => router.push('/profile')}
        >
          <IconButton icon="news" label={t('news.title')} onPress={() => router.push('/news')} />
        </HomeHeader>

        {/* Bant marka satırının ALTINDA: bu ekranda listenin tepesinde
            sabit bant için yer yok (yukarıdaki nota bkz.), ama başlıkla
            selamlama arasındaki boşluk onu taşıyor ve kaydırmayla
            gidiyor — kalıcı bir kabuk olmuyor. */}
        <CevrimdisiBant
          ts={enEskiTs}
          onRetry={hepsiniTazele}
          style={{ marginHorizontal: spacing.s20, marginBottom: spacing.s12 }}
        />

        {/* ── Selamlama (Faz 1) ──
            Marka satırının ALTINDA, aramanın ÜSTÜNDE; kaydırmada gider
            (yapışkan değil). Faz 1: "Yapışkan olsa kalıcı bir kabuk olurdu —
            o zaman içerikle yarışırdı." */}
        <FadeIn delay={40}>
          <Greeting
            name={session?.user?.displayName || session?.user?.name || session?.user?.username || null}
            saleWish={indirimliIstek}
            friends={arkadasOzet}
            forYouCount={forYou.length}
            isCold={isCold}
            onContext={baglamaGit}
          />
        </FadeIn>

        <HeroRail games={heroGames} onExpand={kartAc} />

        {/* G-04 sırası (kit home()): Senin İçin → Fiyatı Düşenler → Arkadaşların
            Ne Oynuyor? → Kaçırılmayacak Fırsatlar → Oyun Dünyasından → İzlemeye
            Değer. Verisi olmayanlar ÇİZİLMİYOR: Gündem (etiket trendi yok),
            "Toplulukta Popüler" (gönderiler akışta), "Belki Bunu Seversin"
            (gerekçe kaynağı yok). Yeni Çıkanlar tasarımda yok ama niyetle
            aranan bir bölüm; fırsatların altında kalıyor. */}
        {showForYou && (
          <FadeIn delay={140}><Section title={t('home.forYou')} subtitle={forYouReason} games={forYou} router={router} onDismiss={handleDismiss} onExpand={kartAc} /></FadeIn>
        )}
        {showTrendRail && (
          <FadeIn delay={140}><Section title={t('home.trend')} games={trendRest} router={router} onExpand={kartAc} /></FadeIn>
        )}
        {drops.length > 0
          ? <FadeIn delay={200}><DropSection games={drops} router={router} /></FadeIn>
          : <FadeIn delay={200}><Section title={t('home.sale')} games={deals.length ? [] : sale} router={router} onExpand={kartAc} /></FadeIn>}
        {showFriends && <FadeIn delay={220}><FriendSection games={friendGames} router={router} /></FadeIn>}
        {deals.length > 0 && <FadeIn delay={240}><DealSection games={deals} router={router} /></FadeIn>}
        <FadeIn delay={260}><Section title={t('home.new')} games={fresh} router={router} onExpand={kartAc} /></FadeIn>
        <HomeMedia />
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
        // Geniş ekranda kolon ortalanıyor (bkz. theme → ICERIK_MAX).
        contentContainerStyle={[styles.listContent, { paddingHorizontal: yan }]}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={{ height: tabBosluk, alignItems: 'center', justifyContent: 'center' }}>
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

      <ModerasyonKatmani mod={mod} />
    </View>
  );
}

function go(router, g) {
  router.push({
    pathname: '/game/[id]',
    params: { id: String(g.id), name: g.name, image: g.image || '', slug: g.rawgSlug || '', hasSteam: g.hasSteam ? '1' : '' },
  });
}

// Raylar `Rail` (FlatList, COMPONENTS §8 adımları): yalnız görünen kartlar
// çiziliyor. Ölçüldü (boş fiyat önbelleği, kaydırmadan soğuk açılış):
// ScrollView'ler her kartı bağladığı için 29 fiyat isteği gidiyordu.
const gameKey = (g) => String(g.id);

function Section({ title, subtitle, games, router, onDismiss, onExpand }) {
  const { t } = useLanguage();
  // Kanca erken donusten ONCE: asagida `games` bossa null donuluyor.
  const renderItem = useCallback(({ item }) => (
    <HomeCard game={item} router={router} onDismiss={onDismiss} onExpand={onExpand} />
  ), [router, onDismiss, onExpand]);
  if (!games || games.length === 0) return null;
  return (
    <View style={sec.section}>
      <View style={sec.heading}>
        <SectionHeader title={title} subtitle={subtitle} action={t('home.viewAll')} onAction={() => router.push('/games')} />
      </View>
      <Rail kind="game" data={games} keyExtractor={gameKey} renderItem={renderItem} />
    </View>
  );
}

// "Fiyatı Düşenler" (kit drop_card): indirim listesinin kendi fiyatı —
// Steam özel fırsatlar kaynağı, rozet de o yüzden Steam. "Son 24 saatte"
// notu YOK: fiyat geçmişi tutulmuyor, düşüşün ne zaman olduğu bilinmiyor.
function DropSection({ games, router }) {
  const { t, formatPrice } = useLanguage();
  const renderItem = useCallback(({ item: g }) => (
    <PriceDropCard title={g.name} image={g.image} oldPrice={formatPrice(g.original)} price={formatPrice(g.price)}
      discount={g.discount} store={g.source === 'steam' ? 'Steam' : null} onPress={() => go(router, g)} />
  ), [formatPrice, router]);
  return (
    <View style={sec.section}>
      <View style={sec.heading}><SectionHeader title={t('v2.priceDrops')} action={t('home.viewAll')} onAction={() => router.push('/games')} /></View>
      <Rail kind="drop" data={games} keyExtractor={gameKey} renderItem={renderItem} />
    </View>
  );
}

// "Arkadaşların Ne Oynuyor?" (kit friend): oyun başına en çok oynayan
// arkadaş. "Şu anda oynuyor" DEĞİL: veri son iki haftanın saatleri ve 24
// saate kadar bayat olabiliyor (bkz. FriendActivity başlığı).
function FriendSection({ games, router }) {
  const { t } = useLanguage();
  const tiles = useMemo(() => games.filter((g) => g.friends?.length).map((g) => ({ key: String(g.appid), game: g, friend: g.friends[0] })), [games]);
  const renderItem = useCallback(({ item: { game: g, friend } }) => (
    <FriendTile avatar={friend.avatar} name={friend.name} game={g.name} gameImage={g.image}
      status={g.count > 1 ? t('v2.friendsPlayed').replace('{n}', String(g.count)) : t('v2.playedThisWeek')}
      onPress={() => router.push({ pathname: '/game/[id]', params: { id: `rawg_${g.appid}`, appid: g.appid, name: g.name || '', image: g.image } })} />
  ), [router, t]);
  if (!tiles.length) return null;
  return (
    <View style={sec.section}>
      <View style={sec.heading}><SectionHeader title={t('v2.friendsPlaying')} action={t('home.viewAll')} onAction={() => router.push('/friends')} /></View>
      <Rail kind="friend" data={tiles} keyExtractor={(x) => x.key} renderItem={renderItem} />
    </View>
  );
}

// "Kaçırılmayacak Fırsatlar" (kit deal_card): "En düşük fiyat" etiketinin
// karşılığı card-price — mağazalar arası güncel en düşük (ITAD). Yanıt
// gelene kadar indirim listesinin Steam fiyatı duruyor.
function DealSection({ games, router }) {
  const { t } = useLanguage();
  const renderItem = useCallback(({ item }) => <HomeDeal game={item} router={router} />, [router]);
  return (
    <View style={sec.section}>
      <View style={sec.heading}><SectionHeader title={t('v2.deals')} action={t('home.viewAll')} onAction={() => router.push('/games')} /></View>
      <Rail kind="deal" data={games} keyExtractor={gameKey} renderItem={renderItem} />
    </View>
  );
}

const HomeDeal = memo(function HomeDeal({ game, router }) {
  const { t, formatPrice } = useLanguage();
  const p = usePrice(game);
  const low = p?.price ?? game.price;
  const normal = p?.original ?? game.original;
  return (
    <DealCard title={game.name} image={game.image} store={p?.storeName || 'Steam'} discount={p?.discount ?? game.discount}
      lowPrice={formatPrice(low)} normalPrice={normal > low ? formatPrice(normal) : undefined}
      actionLabel={t('v2.compareStores')} onAction={() => go(router, game)} onPress={() => go(router, game)} />
  );
});

const sec = StyleSheet.create({
  section: { marginTop: layout.sectionGap },
  heading: { paddingHorizontal: layout.gutter, marginBottom: layout.headingToContent },
});

// Yeni kart aynı kapak geçişini ve öneri eleme sözleşmesini kullanır.
const HomeCard = memo(function HomeCard({ game, router, onDismiss, onExpand }) {
  return (
    <GameCard
      game={game}
      // `onExpand` verildiğinde dokunuş doğrudan gezinmiyor: kapak
      // çerçevesi ölçülüp büyüme geçişi başlıyor (bkz. CardExpand).
      onPress={() => go(router, game)}
      onExpand={onExpand}
      // ELEME UZUN BASMADA — kapaktaki "×" kaldırıldı (kullanıcı: "kötü
      // duruyor", 26 Eyl). Akıştaki GamePostCard ile aynı sözleşme: uzun
      // basma → "İlgilenmiyorum" onayı. `onDismiss` yalnızca "Senin için"
      // şeridinden geliyor; Yeni ve İndirim şeritlerinde uzun basma boş.
      // GameCard'a `onDismiss` VERİLMİYOR: verilirse daireyi yine çizer.
      onLongPress={onDismiss ? () => onDismiss(game) : undefined}
    />
  );
});

const makeStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  listContent: {},
  headerWrap: { paddingBottom: spacing.s32 },
});
