// ─────────────────────────────────────────────────────────────────────────────
// Profil — KİMLİK + KULLANICININ ÜRETTİĞİ İÇERİK.
//
// BİLGİ MİMARİSİ ÜÇÜNCÜ KEZ DEĞİŞTİ; bu en büyüğü.
//
// Önce: 10 tam genişlik satır (~560px). Sonra: 10 karolu kısayol ızgarası
// (~230px). İkisinin de ortak sorunu aynıydı — profil bir MENÜYDÜ. Kullanıcının
// yazdığı inceleme, kurduğu koleksiyon, attığı gönderi bu sayfada GÖRÜNMÜYORDU;
// hepsi başka ekranların arkasındaydı.
//
// Şimdi: kimlik bloğu + dört İÇERİK sekmesi (koleksiyon · istek listesi ·
// inceleme · gönderi). Kısayol ızgarası ve bağlı hesap satırları AYARLARA
// taşındı — gezinme oraya ait, içerik buraya.
//
// SEKMELER TEK LİSTENİN VERİSİNİ DEĞİŞTİRİYOR, dört ayrı kaydırma alanı ya da
// yatay pager YOK: dördü aynı FlashList'i besliyor, kimlik bloğu da o listenin
// başlığı. Pager olsaydı dört liste birden bellekte durur ve kimlik bloğu ya
// tekrarlanır ya da ayrı bir katmana çıkardı.
//
// KENDİ VERİM SUNUCUDAN BEKLENMİYOR: koleksiyon, istek listesi ve oyun sayısı
// cihazda zaten var (WishlistContext, useCollections, useConnectedLibrary) ve
// ağ turu beklemeden çiziliyor. Sunucudan yalnız BAŞKASININ göremeyeceği
// sayılar (gönderi, arkadaş) ve uzak içerik (inceleme, gönderi) geliyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, RefreshControl,
  useWindowDimensions, Share,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { TopFade, BottomFade } from '../../src/components/EdgeFade';
import { Skeleton } from '../../src/components/Skeleton';
import { spacing, type, radius, PRESSED, TOUCH_MIN, avatar as avatarSize } from '../../src/theme';
import { useTabBosluk } from '../../src/hooks/useAltBosluk';
import { useStyles, useTheme } from '../../src/context/ThemeContext';
import { useTabBarScroll } from '../../src/context/TabBarContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { useTimeToData } from '../../src/dev/perf';
import { useAuth } from '../../src/context/AuthContext';
import { useWishlist } from '../../src/context/WishlistContext';
import { useCollections } from '../../src/hooks/useCollections';
import { useConnectedLibrary } from '../../src/hooks/useConnectedLibrary';
import { getUserProfile } from '../../src/api/social';
import { pushGameCount } from '../../src/api/account';
import { getValidToken } from '../../src/services/session';
import { abone as engelDinle } from '../../src/services/engel';
import { getEntry, fetchQuery, whenCacheReady } from '../../src/services/queryCache';
import { useTabPressAction, scrollRefToTop } from '../../src/hooks/useTabPressAction';
import { weeklyReport } from '../../src/services/stats';

import ProfileHeader from '../../src/components/ProfileHeader';
import ProfileTabs from '../../src/components/ProfileTabs';
import CoverCell, { coverWidth, gridCols, GRID_GAP } from '../../src/components/CoverGrid';
import { useYanBosluk } from '../../src/hooks/useIcerikAlani';
import ProfileReviewRow from '../../src/components/ProfileReviewRow';
import PostCard from '../../src/components/PostCard';
import EmptyState from '../../src/components/EmptyState';

// Sunucunun sayfa boyutu (`/api/social/profile` PAGE). "Devamı var mı" kararı
// bu sayıya bakıyor, o yüzden sunucuyla AYNI kalmak zorunda.
const PAGE = 20;

/** Uzak sekmeler ağdan, yerel sekmeler cihazdan besleniyor. */
const UZAK = new Set(['reviews', 'posts']);

/**
 * Önbellekteki kendi profil başlığım — yoksa null.
 *
 * `username` şartı: 404 alan (kullanıcı adı kurulmamış) bir hesabın boş
 * kaydını başlık diye çizmemek için. Anahtar uid içerdiği için başka hesabın
 * kaydı buradan dönemez (bkz. aşağıdaki BAŞLIK ÖNBELLEĞİ).
 */
function onbellektenBaslik(anahtar) {
  if (!anahtar) return null;
  const d = getEntry(anahtar)?.data;
  return d?.profile?.username ? d : null;
}

/** Izgara satırlara bölünüyor — bkz. `izgaraSatirlari` gerekçesi. */
function bol(list, n) {
  const out = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}

export default function ProfileScreen() {
  const styles = useStyles(makeStyles);
  const tabBosluk = useTabBosluk();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const listRef = useRef(null);
  useTabPressAction(useCallback(() => scrollRefToTop(listRef), []));
  const onTabScroll = useTabBarScroll();

  const { account, steamAccounts = [], xbox } = useAuth();
  const { items: wishlist } = useWishlist();
  const collections = useCollections();
  const { steamGames, xboxGames, totalGamesCount: gameCount, refetch: refetchLib } = useConnectedLibrary();

  // ── BAŞLIK ÖNBELLEĞİ ──
  // Kimlik bloğu sunucu yanıtını bekliyordu (`ProfileHeader` veri yokken null
  // çiziyor); koleksiyon ve istek listesi ise cihazda duruyor. Sonuç: sayfa
  // her açılışta ÖNCE içerikle geliyor, üst kısım sonra gelip içeriği aşağı
  // itiyordu. Sunucu tarafı ölçüldü: bu uç Türkiye'den ~300 ms taban +
  // tur başına ~100 ms.
  //
  // Son başarılı başlık diske yazılıyor (queryCache → AsyncStorage) ve ilk
  // çizimde oradan okunuyor; tazeleme arkada. İlk açılıştan sonraki HER
  // açılışta — soğuk açılış dahil — başlık ağ beklemeden görünüyor.
  //
  // ANAHTAR UID İÇERİYOR, ŞART: `clearQueryCache` hiçbir yerden çağrılmıyor
  // ve disk çıkışta temizlenmiyor. Anahtar hesaba kapsanmasaydı başka hesapla
  // giren kişi önceki hesabın kimliğini görürdü (messages.jsx aynı kalıp).
  const onbellekAnahtari = account?.uid ? `profil:ben:${account.uid}` : null;
  const onbellekRef = useRef(onbellekAnahtari);
  onbellekRef.current = onbellekAnahtari;
  const uidRef = useRef(account?.uid || null);
  uidRef.current = account?.uid || null;
  // Sunucu bu açılışta yanıt verdi mi (başarı YA DA 404). Soğuk açılışta disk
  // geri yüklemesi yanıttan SONRA yetişirse eski başlığı taze yanıtın — ya da
  // "kullanıcı adı yok" kararının — üstüne yazmasın.
  const yanitGeldi = useRef(false);

  const [sunucu, setSunucu] = useState(() => onbellektenBaslik(onbellekAnahtari)); // { profile, friendship, canView }
  const [yok, setYok] = useState(false);           // kullanıcı adı kurulmamış
  const [tab, setTab] = useState('collection');
  const [uzak, setUzak] = useState({ items: [], hasMore: false, offset: 0 });
  // Başlık önbellekten geldiyse ekran "yükleniyor" DEĞİL: gösterilecek şey
  // zaten çizili, tazeleme sessiz yapılıyor.
  const [yukleniyor, setYukleniyor] = useState(() => !onbellektenBaslik(onbellekAnahtari));
  const [dahaYukleniyor, setDahaYukleniyor] = useState(false);
  const [tazeleniyor, setTazeleniyor] = useState(false);

  useTimeToData('Profile', !yukleniyor);

  // ── Yerel sekmeler ──
  // TEKİLLEŞTİRME: aynı oyun birden çok koleksiyonda olabiliyor; ızgarada iki
  // kez çıksaydı bağlam satırındaki sayı da yalan söylerdi.
  const yerelKoleksiyon = useMemo(() => {
    const gorulen = new Set();
    const out = [];
    for (const c of collections || []) {
      for (const g of c.games || []) {
        const k = String(g?.id ?? g?.appid ?? '');
        if (!k || gorulen.has(k)) continue;
        gorulen.add(k);
        out.push({ id: k, appid: g.appid || null, name: g.name || '', image: g.image || '' });
      }
    }
    return out;
  }, [collections]);

  const yerelIstek = useMemo(
    () => (wishlist || []).map((g) => ({
      id: String(g.id), appid: g.appid || null, name: g.name || '', image: g.image || '',
    })),
    [wishlist]
  );

  const week = useMemo(() => weeklyReport({ wishlistCount: wishlist.length }), [wishlist.length]);

  // Başlık bir kez alındı mı? YEREL sekmeye geçerken ağa çıkmamak için.
  // (State DEĞİL ref: state olsaydı efektin bağımlılığına girer ve uzak
  // sekmelerde sonsuz döngü kurardı — her yükleme kendini tetiklerdi.)
  const basligiAldik = useRef(false);

  // ── Yükleme ──
  // TEK ÇAĞRI: başlık + sayaçlar + (uzak sekmedeyse) ilk sayfa birlikte
  // geliyor. Sekme yerelse `tab` gönderilmiyor, sunucu yalnız başlığı kuruyor.
  const yukle = useCallback(async (hedefTab, { tazele = false } = {}) => {
    const uzakMi = UZAK.has(hedefTab);
    // SESSİZ TAZELEME: başlık önbellekten zaten çizili ve sekme yerel. Gösterge
    // açılsaydı ekran içerik dururken "yükleniyor" derdi — tam da giderilen
    // his. Uzak sekmede liste öğeleri önbellekte olmadığı için gösterge kalıyor.
    const sessiz = !tazele && !uzakMi && !!onbellektenBaslik(onbellekRef.current);
    if (tazele) setTazeleniyor(true); else if (!sessiz) setYukleniyor(true);
    try {
      const r = await getUserProfile(uzakMi ? { tab: hedefTab, offset: 0 } : {});
      yanitGeldi.current = true;
      setSunucu(r);
      basligiAldik.current = true;
      setYok(false);
      if (uzakMi) {
        const list = r?.items || [];
        setUzak({ items: list, hasMore: !!r.hasMore, offset: list.length });
      }

      // ÖNBELLEĞE YAZ — yalnız başlık; liste öğeleri değil (disk bütçesi
      // paylaşılıyor ve öğeler zaten ayrı sayfalanıyor).
      //
      // UID EŞLEŞMESİ ŞART: istek uçarken çıkış yapılıp başka hesapla
      // girilirse yanıt ESKİ hesabın ama `onbellekRef` YENİ hesabın anahtarını
      // tutuyor. Eşleşme olmadan eski hesabın kimliği yeni hesabın kovasına
      // yazılırdı.
      const anahtar = onbellekRef.current;
      if (anahtar && r?.profile?.username && r.profile.uid === uidRef.current) {
        const baslik = { profile: r.profile, friendship: r.friendship, canView: r.canView };
        fetchQuery(anahtar, () => Promise.resolve(baslik), { force: true }).catch(() => {});
      }
    } catch (e) {
      // 404 = kullanıcı adı henüz kurulmamış. Hata DEĞİL, bir sonraki adım:
      // sosyal kimlik kurulmadan profilin gösterecek bir şeyi yok.
      //
      // Önbellekten çizilmiş bir başlık varsa KALDIRILIYOR: sunucu artık
      // "profil yok" diyor ve eski kimliği boş durum mesajının üstünde
      // göstermek çelişki olurdu.
      if (e?.status === 404) {
        yanitGeldi.current = true;
        setSunucu(null);
        setYok(true);
      }
    } finally {
      setYukleniyor(false);
      setTazeleniyor(false);
    }
  }, []);

  const onTazele = useCallback(async () => {
    await Promise.all([
      yukle(tab, { tazele: true }),
      refetchLib ? refetchLib() : Promise.resolve(),
    ]);
  }, [tab, yukle, refetchLib]);

  useEffect(() => {
    if (!account) { setSunucu(null); basligiAldik.current = false; setYukleniyor(false); return; }
    // Koleksiyon ve istek listesi CİHAZDAN geliyor; başlık da yüklüyse bu
    // sekmeye geçmek tek bir ağ turu bile gerektirmiyor.
    if (!UZAK.has(tab) && basligiAldik.current) { setYukleniyor(false); return; }
    yukle(tab);
  }, [account, tab, yukle]);

  // ── SOĞUK AÇILIŞ: DİSK GERİ YÜKLEMESİNİ BEKLE ──
  // İlk çizimdeki `useState` başlatıcısı önbelleği yalnız BELLEKTE bulabiliyor.
  // Uygulama yeni açıldıysa disk henüz geri yüklenmemiş olabilir; o durumda
  // başlık iskelette kalır ve yanıtı beklerdi. Geri yükleme bitince (tavan
  // 400 ms, bkz. whenCacheReady) önbellekteki başlık yerleşiyor.
  //
  // Taze yanıt ÖNCE geldiyse dokunulmuyor: `yanitGeldi` bunu tutuyor.
  useEffect(() => {
    if (!onbellekAnahtari) return undefined;
    let canli = true;
    whenCacheReady().then(() => {
      if (!canli || yanitGeldi.current) return;
      const kayit = onbellektenBaslik(onbellekAnahtari);
      if (!kayit) return;
      setSunucu((cur) => cur || kayit);
      setYukleniyor(false);
    });
    return () => { canli = false; };
  }, [onbellekAnahtari]);

  // ── ENGELLEMEDE BAŞLIĞI TAZELE ──
  // Profil bir SEKME: arka planda bağlı kalıyor ve veriyi yalnızca ilk
  // açılışta ve sekme değişince çekiyordu. Başka bir ekrandan (akış, sohbet,
  // arkadaşlar) birini engelleyen kullanıcı buraya döndüğünde arkadaş sayısı
  // eski kalıyordu — sunucu arkadaşlığı artık silse bile, aşağı çekip
  // yenileyene kadar.
  //
  // `engel.js` her engelleme ve kaldırmada duyuruyor; o anda başlığı yeniden
  // çekiyoruz. `tazele: true` bilerek: `yukleniyor` iskeleti içeriğin YERİNE
  // çiziyor, bu ise mevcut içeriği yerinde bırakıp üzerine yazıyor.
  //
  // SEKME REF'TEN OKUNUYOR: bağımlılığa `tab` girseydi her sekme değişiminde
  // abonelik bırakılıp yeniden kurulurdu; dinleyicinin tek ihtiyacı o anki
  // sekmenin adı.
  const sekmeRef = useRef(tab);
  sekmeRef.current = tab;
  useEffect(() => {
    if (!account) return undefined;
    const birak = engelDinle(() => { yukle(sekmeRef.current, { tazele: true }); });
    return () => { birak(); };
  }, [account, yukle]);

  const dahaYukle = useCallback(async () => {
    if (!UZAK.has(tab) || dahaYukleniyor || !uzak.hasMore) return;
    setDahaYukleniyor(true);
    try {
      const r = await getUserProfile({ tab, offset: uzak.offset });
      const list = r?.items || [];
      setUzak((s) => ({
        items: [...s.items, ...list],
        hasMore: list.length === PAGE,
        offset: s.offset + list.length,
      }));
    } catch { /* sessiz: bayat liste duruyor */ }
    finally { setDahaYukleniyor(false); }
  }, [tab, uzak.offset, uzak.hasMore, dahaYukleniyor]);

  // ── Profili paylaş ──
  // WEB ADRESİ paylaşılıyor, uygulama şeması değil: bağlantıyı alan kişide
  // uygulama olmayabilir ve `gamerisen://` onda hiçbir şey açmaz. Web
  // sayfası (app/u/[username]) aynı gizlilik kapılarını uyguluyor.
  const paylas = useCallback(async () => {
    const kadi = sunucu?.profile?.username;
    if (!kadi) return;
    const url = `https://www.gamerisen.com/u/${kadi}`;
    try {
      await Share.share({ message: url, url });
    } catch { /* kullanıcı iptal etti */ }
  }, [sunucu]);

  const sekmeDegis = useCallback((k) => {
    setTab(k);
    setUzak({ items: [], hasMore: false, offset: 0 });
    scrollRefToTop(listRef);
  }, []);

  // ── Sayaçlar ──
  // Oyun sayısı: Kullanıcının bağlı Steam veya Xbox hesabı varsa kütüphane toplamından,
  // hiçbir bağlantısı yoksa 0 (eski sunucu sayacı yerine 0).
  const hasConnections = (steamAccounts && steamAccounts.length > 0) || !!xbox;
  const sayaclar = useMemo(() => ({
    posts: sunucu?.profile?.counts?.posts || 0,
    friends: sunucu?.profile?.counts?.friends || 0,
    games: hasConnections ? gameCount : 0,
    collection: yerelKoleksiyon.length,
    wishlist: yerelIstek.length,
    reviews: sunucu?.profile?.counts?.reviews || 0,
  }), [sunucu, gameCount, yerelKoleksiyon.length, yerelIstek.length, hasConnections]);

  const profil = useMemo(
    () => (sunucu?.profile ? { ...sunucu.profile, counts: sayaclar } : null),
    [sunucu, sayaclar]
  );

  // ── Oyun sayısını sunucuya bildir ──
  // BAŞKASININ profilindeki "oyun" sayacının tek kaynağı bu. Kütüphane
  // sunucuda önbelleklenmiyor, yani ziyaretçi o sayıyı hesaplayamıyor;
  // sayıyı bilen tek yer burası.
  //
  // YALNIZ DEĞİŞTİĞİNDE: her profil açılışında yazmak, hiçbir şey
  // değişmemişken tur başına bir yazma isteği demekti.
  const yazilanSayi = useRef(null);
  useEffect(() => {
    if (!account || !sunucu?.profile) return;
    const targetCount = hasConnections ? gameCount : 0;
    const sunucudaki = sunucu?.profile?.counts?.games;
    if (targetCount === sunucudaki && targetCount === yazilanSayi.current) return;
    if (targetCount === yazilanSayi.current) return;
    yazilanSayi.current = targetCount;
    getValidToken()
      .then((tok) => (tok ? pushGameCount(tok, targetCount) : null))
      .catch(() => { yazilanSayi.current = null; });   // sonraki açılışta yeniden dene
  }, [account, sunucu, gameCount, hasConnections]);

  const izgara = tab === 'collection' || tab === 'wishlist';
  const veri = tab === 'collection' ? yerelKoleksiyon
    : tab === 'wishlist' ? yerelIstek
    : uzak.items;

  // IZGARA SATIR SATIR ÇİZİLİYOR, FlashList'in numColumns'u ile değil:
  // numColumns sütun genişliğini eşit bölüyor ve maketin 4pt boşluğu ile
  // 114pt kapağı aynı anda tutturulamıyor (kapak ya sütuna yayılıp boşluğu
  // yutuyor ya da sağ kenar tırtıklı kalıyor). Satır bir View, boşluk `gap`.
  // Sütun sayısı ve hücre genişliği AYNI genişlikten türüyor; ikisini
  // ayrı yerden okumak ızgarayı taşırırdı.
  // IZGARA GENİŞLİKTEN FAYDALANIR, GÖNDERİ AKIŞI OKUNABİLİRLİKTEN.
  // İki sekme aynı listede yaşıyor ve aynı kuralı paylaşamazlar: kapaklar
  // sütun kazanınca kazanıyor, metin ise satır uzayınca kaybediyor.
  const yan = useYanBosluk();
  const sutun = gridCols(width);
  const kapakEn = coverWidth(width, sutun);

  // ── SEKME ŞERİDİ LİSTENİN İLK ÖĞESİ ──
  //
  // ── SABİTLEME DENENDİ VE GERİ ALINDI (emülatörde görüldü) ──
  // Maket şeridin kaydırma boyunca sabit kalmasını istiyor. FlashList (v2)
  // `stickyHeaderIndices`i destekliyor ama yalnız VERİ öğeleri için, bu yüzden
  // şerit başlıktan çıkarılıp 0. öğe yapılmıştı. Android 16 emülatöründe
  // ölçüldü: sabitleme `ListHeaderComponent` ile BİLEŞMİYOR — şerit daha
  // ekranın ortasındayken tepeye yapışıyor ve İKİ KEZ çiziliyor; yapışan
  // kopya kimlik bloğunun üstünü örtüyor, avatar ve üç sayaç görünmüyordu.
  //
  // Şerit veri öğesi olarak KALDI (boş durumu da öğe yapan yapı bundan
  // besleniyor) ama artık sabitlenmiyor: içerikle birlikte kayıyor.
  // Gerçek sabitleme, kaydırma değerine bağlı ayrı bir bindirme katmanı
  // ister; cihazda doğrulanmadan yazılmayacak.
  //
  // BOŞ DURUM DA ÖĞE: liste artık hiçbir zaman boş değil (şerit hep var), o
  // yüzden `ListEmptyComponent` hiç çalışmazdı.
  const izgaraSatirlari = useMemo(() => {
    const govde = izgara ? bol(veri, sutun) : veri;
    if (govde.length === 0) return [{ __serit: true }, { __bos: true }];
    return [{ __serit: true }, ...govde];
  }, [izgara, veri, sutun]);

  // Oturum değişse de bütün hook çağrıları misafir dönüşünden önce çalışır.
  // ── Oturum yok ──
  if (!account) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopFade top={insets.top} />
        <View style={styles.gate}>
          <View style={styles.gateIcon}>
            <Ionicons name="person-outline" size={34} color={colors.text3} />
          </View>
          <Text style={styles.gateTitle}>{t('prof.lockTitle')}</Text>
          <Text style={styles.gateText}>{t('prof.lockDesc')}</Text>
          {/* ÜÇ EŞİT DÜĞME DEĞİL: giriş dolu, kayıt sessiz, üçüncüsü metin
              bağlantısı. Hiyerarşi olmadan kullanıcı hangisinin ana yol
              olduğunu seçemiyordu.

              HER DÜĞME KENDİ FORMUNA GİDİYOR. İkisi de çıplak `/account`a
              gidiyordu ve ekran sabit giriş modunda açıldığı için "Hesap
              oluştur" kaydolma formuna DEĞİL giriş formuna düşürüyordu;
              kullanıcı altta bir bağlantı daha bulup ikinci kez dokunmak
              zorundaydı. İki ayrı düğme sunup ikisini aynı yere göndermek
              hiyerarşinin verdiği sözü tutmamaktı. */}
          <Pressable style={({ pressed }) => [styles.gateBtn, pressed && PRESSED]}
                     onPress={() => router.push('/account?mode=signin')}>
            <Text style={styles.gateBtnText}>{t('acc.signIn')}</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.gateBtn2, pressed && PRESSED]}
                     onPress={() => router.push('/account?mode=signup')}>
            <Text style={styles.gateBtn2Text}>{t('acc.signUp')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const bosDurum = () => {
    if (yukleniyor) return null;
    if (yok) {
      return (
        <EmptyState
          icon="at-outline"
          title={t('prof.noUsername')}
          text={t('prof.needUsername')}
          actionLabel={t('prof.noUsername')}
          onAction={() => router.push('/username-setup')}
        />
      );
    }
    const map = {
      collection: { icon: 'albums-outline', title: t('col.empty'), text: t('col.emptyText'), label: t('nav.games'), go: '/games' },
      wishlist:   { icon: 'heart-outline', title: t('prof.emptyWishlist'), text: t('prof.emptyWishlistDesc'), label: t('nav.games'), go: '/games' },
      reviews:    { icon: 'shield-checkmark-outline', title: t('rev.mineEmpty'), text: t('rev.mineEmptyDesc'), label: t('tab.community'), go: '/(tabs)/reviews' },
      posts:      { icon: 'chatbubble-outline', title: t('prof.emptyPosts'), text: t('prof.emptyPostsDesc'), label: t('tab.community'), go: '/(tabs)/reviews' },
    }[tab];
    return (
      <EmptyState
        compact
        icon={map.icon}
        title={map.title}
        text={map.text}
        actionLabel={map.label}
        onAction={() => router.push(map.go)}
      />
    );
  };

  const satirCiz = ({ item }) => {
    // Sabitlenen şerit: zemini OPAK olmak zorunda, altından içerik geçiyor.
    if (item.__serit) {
      return (
        <View style={styles.seritSarmal}>
          <ProfileTabs active={tab} counts={sayaclar} onChange={sekmeDegis} />
        </View>
      );
    }
    if (item.__bos) return bosDurum();
    if (izgara) {
      return (
        <View style={styles.gridRow}>
          {item.map((g) => (
            <CoverCell
              key={g.id}
              item={g}
              width={kapakEn}
              onPress={() => router.push({
                pathname: '/game/[id]',
                params: { id: g.id, appid: g.appid || '', name: g.name, image: g.image || '' },
              })}
            />
          ))}
        </View>
      );
    }
    if (tab === 'reviews') {
      return (
        <ProfileReviewRow
          review={item}
          onReplies={() => router.push('/post/' + encodeURIComponent('r:' + item.appid + ':' + item.uid))}
          onPress={() => router.push({
            pathname: '/game/[id]',
            params: { id: `rawg_${item.appid}`, appid: item.appid, name: item.gameName || '', image: item.image || '' },
          })}
        />
      );
    }
    return <PostCard post={item} compact />;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopFade top={insets.top} />
      <BottomFade />

      {/* ── Üst çubuk ──
          Kullanıcı adı ve ayarlar HER ZAMAN görünür kalıyor: ekran artık
          kaydırılacak bir içerik sayfası ve ayarların dibe inmesi kabul
          edilemezdi. Kimlik bloğu kayıp gidiyor (parallax yok — iOS'ta
          pahalı ve bu ekranın taşıdığı bilgiye değmiyor). */}
      <View style={styles.topBar}>
        <Text style={styles.handle} numberOfLines={1}>
          {profil?.username ? `@${profil.username}` : t('nav.profile')}
        </Text>
        <Pressable onPress={() => router.push('/settings')} hitSlop={8}
                   style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]}
                   accessibilityRole="button" accessibilityLabel={t('prof.settingsTitle')}>
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      <FlashList
        ref={listRef}
        // IZGARA ↔ LİSTE geçişinde yeniden monte: satır biçimi tamamen
        // değişiyor, geri dönüştürülen hücreler yanlış ölçüyle çiziliyordu.
        key={izgara ? 'izgara' : 'liste'}
        data={izgaraSatirlari}
        keyExtractor={(item, i) => (item.__serit ? 'serit' : item.__bos ? 'bos' : izgara ? `r${i}` : String(item.id ?? `${item.appid}:${item.uid}`))}
        renderItem={satirCiz}
        contentContainerStyle={{ paddingHorizontal: izgara ? 0 : yan }}
        extraData={tab}
        estimatedItemSize={izgara ? Math.round((kapakEn * 4) / 3) + GRID_GAP : 140}
        ListHeaderComponent={(
          <View>
            {/* İLK AÇILIŞTA YER TUTUCU. Önbellek boşken (hesabın bu cihazdaki
                ilk profil açılışı) başlık hâlâ yanıtı bekliyor. Önceden bu
                sürede HİÇBİR ŞEY çiziliyordu; içerik en üstte duruyor, başlık
                gelince aşağı itiliyordu. İskelet başlığın yerini baştan
                ayırıyor. */}
            {!profil && yukleniyor && !yok ? <ProfilBaslikIskeleti /> : null}
            <ProfileHeader
              profile={profil}
              friendship="self"
              week={week}
              onCounter={(k) => {
                if (k === 'posts') sekmeDegis('posts');
                else if (k === 'friends') router.push('/friends');
                else router.push('/library');
              }}
              onEdit={() => router.push('/profile-edit')}
              onShare={profil?.username ? paylas : undefined}
              onConnect={() => router.push('/settings')}
              onWeek={() => router.push('/stats')}
            />
          </View>
        )}
        ListFooterComponent={(
          <View style={{ height: tabBosluk, alignItems: 'center', paddingTop: spacing.s12 }}>
            {dahaYukleniyor || (yukleniyor && veri.length > 0)
              ? <ActivityIndicator color={colors.accent} />
              : null}
          </View>
        )}
        onEndReached={dahaYukle}
        onEndReachedThreshold={0.6}
        onScroll={onTabScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl refreshing={tazeleniyor} onRefresh={onTazele}
                          tintColor={colors.text2} />
        )}
      />
    </SafeAreaView>
  );
}

// REAKTİF STİL: tema değişince yeniden üretiliyor (bkz. ThemeContext).
// ─────────────────────────────────────────────────────────────────────────────
// BAŞLIK İSKELETİ — ProfileHeader'ın GEOMETRİSİ, verisi değil.
//
// Ölçüler ProfileHeader.jsx stillerinden birebir: dış dolgu, avatar çapı
// (avatar.xl), sayaç kutusu (TOUCH_MIN), ad satırı, çip (28pt) ve eylem
// düğmesi (TOUCH_MIN) aynı kenar boşluklarıyla. Böylece gerçek başlık
// geldiğinde içerik yerinden oynamıyor.
//
// BİLEREK ÇİZİLMEYENLER: biyografi (var mı bilinmiyor; varsa iki satır daha
// gelir) ve haftalık özet kartı (yalnız hareket varsa çıkıyor). İkisini de
// çizmek, OLMAYAN kullanıcıda aynı zıplamayı ters yönde yaratırdı. Kalan fark
// yalnızca hesabın bu cihazdaki İLK açılışında görülür; sonrası önbellekten.
//
// Renk taşımıyor (Skeleton kendi temalı rengini çiziyor), o yüzden stiller
// tema-reaktif olmak zorunda değil.
// ─────────────────────────────────────────────────────────────────────────────
function ProfilBaslikIskeleti() {
  return (
    <View
      style={iskelet.wrap}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={iskelet.idRow}>
        <Skeleton style={iskelet.avatar} />
        <View style={iskelet.counters}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={iskelet.counter}>
              <Skeleton style={iskelet.counterN} />
              <Skeleton style={iskelet.counterLabel} />
            </View>
          ))}
        </View>
      </View>
      <Skeleton style={iskelet.name} />
      <Skeleton style={iskelet.chip} />
      <Skeleton style={iskelet.action} />
    </View>
  );
}

const iskelet = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.s20, paddingTop: spacing.s8 },
  idRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: avatarSize.xl, height: avatarSize.xl, borderRadius: avatarSize.xl / 2 },
  counters: { flex: 1, flexDirection: 'row', marginLeft: spacing.s20 },
  counter: { flex: 1, height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center', gap: spacing.s4 },
  counterN: { width: 28, height: 14, borderRadius: radius.xs },
  counterLabel: { width: 44, height: 10, borderRadius: radius.xs },
  // Ad satırı: RN'in varsayılan satır yüksekliği yazı boyunun ~1.2 katı.
  name: { width: '40%', height: Math.round(type.body * 1.2), borderRadius: radius.xs, marginTop: spacing.s16 },
  chip: { width: 132, height: 28, borderRadius: radius.pill, marginTop: spacing.s12 },
  action: { height: TOUCH_MIN, borderRadius: radius.md, marginTop: spacing.s16 },
});

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  topBar: {
    height: TOUCH_MIN, flexDirection: 'row', alignItems: 'center',
    paddingLeft: spacing.s20, paddingRight: spacing.s12,
  },
  handle: { flex: 1, fontSize: type.body, fontWeight: '600', color: colors.text },
  iconBtn: { width: TOUCH_MIN, height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center' },

  // Sabitlenen şerit: altından içerik geçtiği için zemin OPAK olmak zorunda.
  seritSarmal: { backgroundColor: colors.bg },

  gridRow: {
    flexDirection: 'row', gap: GRID_GAP,
    paddingHorizontal: spacing.s20, marginBottom: GRID_GAP,
  },

  // ── Oturum yok ──
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.s32 },
  gateIcon: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  gateTitle: {
    fontSize: type.title3, fontWeight: '700', color: colors.text,
    marginTop: spacing.s24, textAlign: 'center',
  },
  gateText: {
    fontSize: type.subhead, color: colors.text2, textAlign: 'center',
    lineHeight: 22, marginTop: spacing.s12, maxWidth: 300,
  },
  gateBtn: {
    height: TOUCH_MIN, alignSelf: 'stretch', borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.s24,
    backgroundColor: colors.accentFillStrong,
  },
  gateBtnText: { fontSize: type.subhead, fontWeight: '600', color: colors.onAccent },
  gateBtn2: {
    height: TOUCH_MIN, alignSelf: 'stretch', borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.s8,
    backgroundColor: colors.bgInput,
  },
  gateBtn2Text: { fontSize: type.subhead, fontWeight: '600', color: colors.text },
});
