import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Pressable, ScrollView, StyleSheet, Modal, useWindowDimensions, Share } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedScrollHandler, useAnimatedStyle,
  useAnimatedReaction, runOnJS, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { fetchGameDetail, fetchGameByAppid, fetchSteamReviews } from '../../src/api/games';
import { motion } from '../../src/theme';
import { useYanBosluk } from '../../src/hooks/useIcerikAlani';
import { stripHtml } from '../../src/utils/text';
import { bagilZaman } from '../../src/utils/relativeTime';
import { useLanguage } from '../../src/context/LanguageContext';
import { useTimeToData } from '../../src/dev/perf';
import { useWishlist } from '../../src/context/WishlistContext';
import { useCollections, useCollectionsContaining } from '../../src/hooks/useCollections';
import { toggleGameInCollection, createCollection } from '../../src/services/collectionsStore';
import { turAdi } from '../../src/services/genreName';
import OwnershipBand from '../../src/components/OwnershipBand';
import CevrimdisiBant from '../../src/components/CevrimdisiBant';
import { oyunuOnbellektenBul } from '../../src/services/queryCache';
import CollectionPicker from '../../src/components/CollectionPicker';
import ShareToFriendSheet from '../../src/components/ShareToFriendSheet';
import { reportActivity } from '../../src/api/social';
import { useQuery } from '../../src/hooks/useQuery';
import { useGamePrices } from '../../src/hooks/useGamePrices';
import { useReducedMotion } from '../../src/hooks/useReducedMotion';
import { kaynakOku, kaynakSil, kucultmeIste, devirTamam } from '../../src/services/gecisKaynak';
import { GenreChipsSkeleton, ShotStripSkeleton, TextBlockSkeleton, PriceListSkeleton } from '../../src/components/Skeleton';
import { recordSignal } from '../../src/services/tasteProfile';
import { recordSeen } from '../../src/services/seenStore';
import FadeIn from '../../src/components/FadeIn';
import { Icon } from '../../src/components/Icon';
import { Button, IconButton, PressableScale, SectionHeader, Txt } from '../../src/components/ui/Primitives';
import { HeartButton } from '../../src/components/ui/HeartButton';
import { GlassView } from '../../src/components/ui/GlassView';
import { StickyBottomBar, useStickyBarInset } from '../../src/components/ui/Navigation';
import { GamePriceCard, GenreChips, InfoCells, OutlineBadge, ReviewSummary, ScreenshotRail, TrailerCard } from '../../src/components/ui/GameDetailParts';
import { useDesignTheme } from '../../src/theme/useDesignTheme';
import { component as K, gradients, layout, space } from '../../src/theme/tokens';
import GameReviews from '../../src/components/GameReviews';

// Olumlu %'den inceleme tier'ı (etiket i18n + renk). 2.0: renk işlevsel
// paletten — olumlu yeşil, karışık turuncu, olumsuz kırmızı.
function tierFor(pct, colors) {
  if (pct >= 90) return { key: 'review.veryPositive',    color: colors.green };
  if (pct >= 75) return { key: 'review.positive',        color: colors.green };
  if (pct >= 60) return { key: 'review.mostlyPositive',  color: colors.green };
  if (pct >= 40) return { key: 'review.mixed',           color: colors.orange };
  return           { key: 'review.negative',             color: colors.red };
}

// Kapak G-07'de 380 pt ve gövde kapağa BİNMİYOR (kit stack: kapak, sonra
// başlık bloğu). Yükseklik CardExpand'in iniş çerçevesiyle aynı jeton.
const COVER_H = K.detail.heroHeight;

// #RRGGBB → aynı rengin saydamı. Kapak degradesi temanın zeminine iniyor;
// ara duraklar siyahın değil ZEMİNİN saydamı olmalı, yoksa açık temada
// ortada gri bir bant kalıyor.
function seffaf(hex) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
  return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},0)` : 'transparent';
}

// Handoff: "Kaydırmada başlık ilk 64 px'de 0→1 opaklığa gelir."
const HEADER_FADE = 64;

// Binlik ayraçlı sayı (TR '.', EN ',')
function groupNum(n, sep) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

export default function GameDetail() {
  const yan = useYanBosluk();
  const { colors, isDark } = useDesignTheme();
  const insets = useSafeAreaInsets();
  const stickyInset = useStickyBarInset();
  const { id, name, image, slug, hasSteam, appid, buyume } = useLocalSearchParams();
  const router = useRouter();
  const { t, lang, formatPrice, formatDiscount, formatStoreAt, formatCompact } = useLanguage();
  const { isWatched, toggle } = useWishlist();

  // Koleksiyonlar — bu oyunun hangi listelerde olduğunu göster
  const collections = useCollections();
  const [pickerOpen, setPickerOpen] = useState(false);

  // Zengin detay: cache-first (aynı oyunu tekrar açınca anında gelir).
  // appid varsa (Share Extension'dan gelindiyse) doğrudan Steam appdetails'e
  // gider — RAWG slug tahmini yapılmaz, rastgele bir Steam linkinin her zaman
  // doğru oyuna çözülmesini garanti eder.
  const { data: detail, ts: detayTs, refetch: detayTazele } = useQuery(
    appid ? `game-detail:appid:${appid}:${lang}` : `game-detail:${slug || id}:${lang}`,
    () => (appid ? fetchGameByAppid(appid, lang) : fetchGameDetail(slug || id, lang))
      .then((d) => (d && !d.error ? d : null)),
    { ttl: 30 * 60 * 1000 }
  );

  // ── DETAY YOKSA LİSTE KAYDINA DÜŞ ──
  // Çevrimdışıyken bu ekran kapak + addan ibaretti; oysa listeden gelen
  // kayıt tür, metacritic, çıkış tarihi ve mağaza bağlantılarını ZATEN
  // taşıyor ve diskte duruyor (ölçüldü: kayıt başına ~530 B). Sıfır ek
  // istekle kazanılan alanlar bunlar.
  //
  // AÇIKLAMA ve EKRAN GÖRÜNTÜLERİ listede YOK — onlar `detail`e bağlı
  // kalıyor ve çevrimdışında boş görünüyor. Uydurulacak bir yerleri yok.
  const yedek = useMemo(
    () => (detail ? null : oyunuOnbellektenBul(id, slug)),
    [detail, id, slug]
  );
  const g = detail || yedek;

  const [expanded, setExpanded] = useState(false);
  useTimeToData('GameDetail', !!detail);
  const [activeShotIndex, setActiveShotIndex] = useState(null);
  const [currentScrollIndex, setCurrentScrollIndex] = useState(0);
  const { width: screenWidth } = useWindowDimensions();

  // Lightbox'ı aç: indeks ve gösterge aynı anda ayarlanır (bir karelik yanlış sayı olmaz)
  const openShot = useCallback((i) => {
    setActiveShotIndex(i);
    setCurrentScrollIndex(i);
  }, []);

  // Mağaza fiyat listesi — Fiyat Karşılaştırma (G-08) ile ORTAK kaynak ve
  // ortak sorgu anahtarı (bkz. hooks/useGamePrices). ITAD sorgusu detay
  // yüklenince (steamAppId için) açılıyor.
  const { stores: fiyatlar, loaded: fiyatYuklendi, ts: pricesTs } = useGamePrices({
    queryKey: detail?.steamAppId || slug || id,
    appid: detail?.steamAppId,
    title: detail?.name || name,
    slug, name,
    steamUrl: g?.steamUrl,
    enabled: !!detail,
  });

  // Steam topluluk inceleme analizi — detay yüklenince (steamAppId için)
  const { data: reviews } = useQuery(
    `reviews:${detail?.steamAppId || ''}`,
    () => fetchSteamReviews(detail?.steamAppId),
    { ttl: 60 * 60 * 1000, enabled: !!detail?.steamAppId }
  );
  const reviewTier = reviews?.total ? tierFor(reviews.positivePct, colors) : null;

  // ── FRAGMAN (Faz 3, KIRILMA #2) ──
  // Otomatik oynatma KALKTI. `p.play()` mount'ta çağrılıyordu: sessiz,
  // döngülü ve kullanıcı kontrolsüz. Odak/lightbox duraklatması vardı (iyi)
  // ama başlatma kararı kullanıcının değildi.
  //
  // "Ritmi kullanıcının parmağı kurar." Ölçülebilir kazanç da var: mount'ta
  // video decode yok → ilk çizim hızlanıyor, pil ve mobil veri kullanıcının
  // kararı oluyor.
  //
  // Bir kez oynatıldıysa oturum boyunca hatırlanıyor: aynı oyuna geri
  // dönüldüğünde düğmeye tekrar basmak gerekmiyor.
  const trailerUrl = detail?.trailer || null;
  const [fragmanAcik, setFragmanAcik] = useState(false);
  const trailerPlayer = useVideoPlayer(trailerUrl, (p) => {
    p.loop = true;
    p.muted = true;
  });

  // Ekran odakta mı? (mağaza linki/tarayıcı üste açılınca ekran mount'ta kalır)
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  // Kullanıcı başlattıysa: yalnızca ekran odaktayken VE lightbox kapalıyken
  // oynasın (pil/CPU). Bu koşul korundu, üstüne `fragmanAcik` eklendi.
  useEffect(() => {
    if (!trailerUrl) return;
    if (fragmanAcik && focused && activeShotIndex === null) trailerPlayer.play();
    else trailerPlayer.pause();
  }, [fragmanAcik, focused, activeShotIndex, trailerUrl, trailerPlayer]);

  // appid ŞART: istek listesi widget'ı fiyatları Steam appid'iyle çekiyor.
  // Buradan appid'siz eklenen oyunlar widget'ta hiç görünmüyordu — detay
  // zaten steamAppId'i taşıyordu, sadece iletilmiyordu.
  const gameObj = {
    id, name, slug, image,
    // `rawgSlug` de yazılıyor: kimlik eşleştirmesinin slug kademesi bu adı
    // arıyor (services/oyunKimlik.js) ve rota parametresi `slug` adıyla geliyor.
    rawgSlug: slug,
    appid: detail?.steamAppId || appid || null,
    hasSteam: hasSteam === 'true' || hasSteam === '1',
  };
  // ÇIPLAK KİMLİK DEĞİL, NESNE: aynı oyun listeye hangi uçtan geldiğine göre
  // iki farklı `rawg_` kimliği taşıyabiliyor. Nesne appid ve slug'ı da taşıdığı
  // için eşleştirme uzaylar arasında tutuyor.
  const watched = isWatched(gameObj);
  const inCollections = useCollectionsContaining(gameObj);
  const inAnyCollection = inCollections.size > 0;

  // Tazelik: bu oyunu "görüldü" işaretle (id anında hazır, detay beklemez)
  // Nesne geçiliyor: anahtar addan türetiliyor, böylece aynı oyun öteki
  // kimlik uzayından gelince de "görüldü" sayılıyor (bkz. oyunKimlik.js).
  useEffect(() => { if (id) recordSeen({ id, name, rawgSlug: slug }); }, [id, name, slug]);

  // Zevk sinyali: detay (türler) yüklendiğinde bir kez kaydet
  const viewRecorded = useRef(false);
  useEffect(() => {
    if (detail?.genres?.length && !viewRecorded.current) {
      viewRecorded.current = true;
      recordSignal({ genres: detail.genres, type: 'view' });
    }
  }, [detail]);

  // Wishlist eklerken güçlü sinyal + dokunsal geri bildirim
  // `dokunsal`: kalp düğmesi (HeartButton) kendi hafif darbesini zaten veriyor;
  // oradan gelince ikinci bir titreşim olmasın.
  const onToggleWishlist = (dokunsal = true) => {
    const willAdd = !watched;
    if (dokunsal) Haptics.impactAsync(willAdd ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    toggle(gameObj);
    if (willAdd && detail?.genres?.length) recordSignal({ genres: detail.genres, type: 'wishlist' });
    // Arkadaş akışına bildir (ateşle-unut; oturum/gizlilik yoksa sessizce düşer)
    if (willAdd) {
      reportActivity({
        type: 'wishlist',
        gameId: String(id),
        gameName: detail?.name || name || '',
        gameImage: detail?.image || image || '',
      });
    }
  };

  // ── PAYLAŞIM: ÖNCE ARKADAŞ, SONRA SİSTEM ─────────────────────────────────
  // Gönderme düğmesi anasayfa kartlarının kapağından buraya taşındı: paylaşım
  // kararı kartta değil, oyun açıldıktan sonra veriliyor.
  //
  // ÜST ÇUBUĞA DÖRDÜNCÜ İKON EKLENMEDİ, ölçüldü: 375pt genişlikte çubuk
  // (12 dolgu ×2 · 44 geri · 12 boşluk ×2 · 3×44 ikon · 10 boşluk ×2)
  // başlığa 131pt bırakıyor. Dördüncü ikon bunu 77pt'ye — yaklaşık 9 karaktere
  // düşürüyordu; kaydırınca beliren oyun adı çoğu oyunda okunmaz olurdu.
  //
  // Bu yüzden paylaşım TEK KAPI: ikon "gönder" oldu, sistem paylaşım katmanı
  // sayfanın içindeki "Diğer uygulamalar" satırına indi. Arkadaşı olmayan
  // kullanıcı da çıkışsız kalmıyor.
  const [paylasAcik, setPaylasAcik] = useState(false);

  // Oyunu iOS paylaşım katmanıyla paylaş
  const onShare = useCallback(async () => {
    const url = detail?.steamUrl || detail?.officialUrl || '';
    try {
      Haptics.selectionAsync();
      await Share.share({
        title: detail?.name || name,
        message: url ? `${detail?.name || name} — ${url}` : `${detail?.name || name}`,
      });
    } catch { /* kullanıcı iptal etti */ }
  }, [detail, name]);

  // ── SOHBET PAYLAŞIMININ KİMLİĞİ ──
  // Sunucu `rawg_<sayı>` bekliyor (app/lib/chat-share.js → OYUN_KIMLIK) ama bu
  // ekrana ÜÇ farklı `id` biçimiyle geliniyor: kart listesi `rawg_<id>`,
  // gönderi kartı çıplak Steam appid'i, evrensel bağlantı ise SLUG. Kimlik
  // burada tek biçime çekiliyor; çözülemiyorsa (slug) düğme doğrudan sistem
  // paylaşımına düşüyor — sohbete bozuk kimlik yollamaktansa.
  const paylasGameId = useMemo(() => {
    const ham = String(id || '');
    if (/^rawg_\d{1,12}$/.test(ham)) return ham;
    if (/^\d{1,12}$/.test(ham)) return `rawg_${ham}`;
    if (detail?.steamAppId) return `rawg_${detail.steamAppId}`;
    return null;
  }, [id, detail?.steamAppId]);

  const paylasAc = useCallback(() => {
    if (!paylasGameId) { onShare(); return; }
    Haptics.selectionAsync();
    setPaylasAcik(true);
  }, [paylasGameId, onShare]);

  // ───────────────────────────────────────────────────────────────────────────
  // KAYDIRMA: kapak parallax + başlık devri
  //
  // Öncesinde bu ekranda HİÇ kaydırma işleyicisi yoktu. Kapak sabit bir
  // View'di (yükseklik 320) ve gövde onun altında ayrı bir ScrollView'di, yani
  // ekranın üst %37'si sayfa boyunca hiç değişmeyen bir görsele kilitliydi.
  //
  // ── PARALLAX 0.9 NE DEMEK ──
  // İçerik -scrollY hızıyla gidiyor. Kapak 0.9 hızla gitsin isteniyor, yani
  // -0.9 × scrollY. Aradaki 0.1'lik fark derinlik hissini veren şey; 1.0
  // olsaydı kapak içerikle birlikte gider ve parallax olmazdı.
  //
  // ── BAŞLIK NEDEN GEREKLİ ──
  // Oyun adı gövdenin ilk satırında. Kaydırınca ekrandan çıkıyor ve üst
  // çubukta yalnızca ikonlar kalıyordu — kullanıcı hangi oyunda olduğunu
  // gösteren hiçbir şey görmüyordu. Handoff: "başlık ilk 64 px'de 0→1".
  //
  // Hareketi Azalt açıkken parallax kapanıyor (dekoratif); başlık devri
  // KAPANMIYOR çünkü o dekoratif değil, taşıdığı bilgi var.
  // ───────────────────────────────────────────────────────────────────────────
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const azalt = useReducedMotion();

  // ── GERİ ÇIKIŞTA KÜÇÜLME ──────────────────────────────────────────────
  // Bu ekran `buyume:'1'` ile açıldığında yığın animasyonu `none` (bkz.
  // _layout.jsx). O ayar İKİ YÖNE birden uygulanıyor, yani geri çıkışta da
  // hiçbir animasyon kalmıyordu: detay tek karede yok oluyordu. Girişteki
  // çift-animasyon düzeltmesinin görünmeyen bedeli buydu.
  //
  // Çerçeve YOKSA (arama, bildirim, sohbet paylaşımı, detaydan detaya) düz
  // `back()` kalıyor — o yollarda büyüyerek gelinmedi, küçülerek gitmek de
  // yanlış olurdu. Reduce Motion'da da düz `back()`.
  //
  // ── ANİMASYON BU EKRANDA OYNAMIYOR ──
  // İlk sürümde oynuyordu ve kullanıcı "kasıyor" diye bildirdi. Sebep açık:
  // küçülme boyunca bu ekran TAM AYAKTA kalıyordu — ScrollView, ekran
  // görüntüsü şeridi, expo-video oynatıcısı — ve bindirme opak zeminle
  // açıldığı için 380 ms donmuş bir sayfa görünüyordu ("yenileniyor" hissi).
  //
  // Sıra ters çevrildi: yalnızca İSTEK bırakılıp hemen çıkılıyor; küçülmeyi
  // anasayfa, bu ekran söküldükten SONRA oynatıyor.
  // `cover` BURADA tanımlı, aşağıda değil: `geriDon` onu bağımlılık olarak
  // alıyor ve bağımlılık dizisi RENDER SIRASINDA değerlendiriliyor. Aşağıda
  // kalsaydı const'ın geçici ölü bölgesine (TDZ) düşer, ekran açılır açılmaz
  // ReferenceError verirdi.
  const cover = g?.image || image;

  const cikiliyor = useRef(false);

  // ── BÜYÜME DEVRİ ──
  // Anasayfanın bindirmesi bu ekran ilk karesini çizene kadar duruyor
  // (gecisKaynak.js → DEVİR). `onLayout` çizimden ÖNCE geliyor; bir kare
  // beklenince kapak gerçekten ekranda oluyor. Büyümesiz açılışta sessiz.
  const devirYapildi = useRef(false);
  const kapakYerlesti = useCallback(() => {
    if (buyume !== '1' || devirYapildi.current) return;
    devirYapildi.current = true;
    requestAnimationFrame(() => devirTamam());
  }, [buyume]);

  const geriDon = useCallback(() => {
    if (cikiliyor.current) return;   // çift dokunuş koruması
    const cerceve = kaynakOku(id);
    if (azalt || !cerceve) { router.back(); return; }
    cikiliyor.current = true;
    kucultmeIste({
      ...cerceve,
      // Kapak adresi çerçeveyle birlikte saklandı; yoksa rota parametresine
      // düş — ikisi de yoksa GameCover monograma iniyor, boş kutu çıkmıyor.
      image: cerceve.image || image,
      name:  cerceve.name  || name,
      // O AN EKRANDA DURAN kapak. Bindirme küçülürken bundan kartın dikey
      // afişine çapraz sönüyor; yoksa resim daha animasyon başlamadan tek
      // karede takas olurdu. `detail` yüklendiyse gerçek hedef bu, yüklenmediyse
      // zaten rota parametresindeki görsel.
      hedefGorsel: cover || image,
    });
    kaynakSil(id);       // tüketildi; ikinci bir dönüş aynı kutuyu oynatmasın
    router.back();
  }, [azalt, cover, id, image, name, router]);

  const coverStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: azalt ? 0 : -scrollY.value * 0.9 }],
  }), [azalt]);

  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HEADER_FADE], [0, 1], Extrapolation.CLAMP),
  }));

  // ── DURUM ÇUBUĞU BU EKRANDA TEMAYA UYAMAZ ──
  // Kök düzen çubuğu temaya göre ayarlıyor (_layout.jsx): açık temada koyu
  // yazı. Ama bu ekranın üstü HER ZAMAN koyu bir kapak görseli — açık temada
  // saat ve pil koyu üstüne koyu düşüyor ve okunmuyordu. (Koyu temada
  // görünmüyordu çünkü zaten açık yazıydı; açık tema düzelince ortaya çıktı.)
  //
  // Eşik zaten var: çubuk 64px'de opaklaşıyor. Opaklaşana kadar yazı AÇIK,
  // sonra temanın kendi değeri.
  //
  // useAnimatedReaction + runOnJS: JS'e kare başına değil, yalnızca eşik
  // GEÇİLDİĞİNDE haber gidiyor.
  const [cubukOpak, setCubukOpak] = useState(false);
  useAnimatedReaction(
    () => scrollY.value >= HEADER_FADE,
    (yeni, eski) => { if (yeni !== eski) runOnJS(setCubukOpak)(yeni); },
    []
  );

  const title = g?.name || name;
  const desc = stripHtml(detail?.description);
  const genres = g?.genres || [];
  const shots = detail?.screenshots || [];
  const mc = g?.metacritic;

  const open = (url) => { if (url) WebBrowser.openBrowserAsync(url); };

  // ── 2.0 GÖRÜNÜM VERİSİ (G-07, kit s1.py game_detail()) ──────────────────
  // Tek fiyat kaynağı: `fiyatlar` (useGamePrices). Kart, "En Ucuz Fiyatı Gör"
  // ve alttaki sabit çubuk AYNI listeyi okuyor — Faz 3'ün "iki sayı
  // çelişmesin" kuralı korunuyor.
  const best = fiyatlar[0] || null;
  const guncel = pricesTs ? bagilZaman(pricesTs, t) : null;

  // "Tümünü karşılaştır" → Fiyat Karşılaştırma (G-08). Sorgu anahtarı aynı
  // olsun diye appid detaydan çözülmüş hâliyle gidiyor.
  const karsilastir = useCallback(() => {
    router.push({ pathname: '/game/[id]/prices', params: {
      id: String(id), appid: detail?.steamAppId || appid || '', name: title || '', image: cover || '',
      slug: slug || '', hasSteam: hasSteam || '',
    } });
  }, [router, id, detail?.steamAppId, appid, title, cover, slug, hasSteam]);

  // "2020 · CD PROJEKT RED": yıl çıkış tarihinden, geliştirici detaydan.
  const yil = String(g?.released || '').match(/\d{4}/)?.[0] || null;
  const altSatir = [yil, detail?.developer].filter(Boolean).join(' · ');

  // PUAN SATIRI STEAM İNCELEMELERİNDEN. `detail.rating` KULLANILMIYOR:
  // sunucunun Steam yolu onu inceleme sayısı varsa sabit 4.5 yazıyor
  // (api/rawg-game → `recommendations?.total ? 4.5 : 0`), yani uydurma.
  // Tasarımın PEGI yuvasında Metacritic duruyor — yaş sınırı verisi yok.
  const yuzde = reviews?.total ? Math.round(reviews.positivePct) : null;
  const yuzdeYaz = (n) => (lang === 'tr' ? `%${n}` : `${n}%`);
  const oySayisi = reviews?.total ? `${groupNum(reviews.total, lang === 'tr' ? '.' : ',')} ${t('detail.reviewsCount')}` : null;

  const turler = genres.slice(0, 8).map((x) => turAdi(x, t));
  const platformlar = (g?.platforms || []).join(' · ');
  const hucreler = [
    detail?.developer ? { label: t('detail.developer'), value: detail.developer } : null,
    detail?.publisher ? { label: t('v2.publisher'), value: detail.publisher } : null,
    g?.released ? { label: t('v2.releaseDate'), value: g.released } : null,
  ].filter(Boolean);

  // "En Ucuz Fiyatı Gör" fiyat kartına kaydırır (kit: href="#fiyat").
  // Hedef, kartın içerikteki y'si eksi sabit üst çubuk.
  const scrollRef = useRef(null);
  const fiyatY = useRef(0);
  const fiyataGit = useCallback(() => {
    scrollRef.current?.scrollTo({ y: Math.max(0, fiyatY.current - insets.top - K.navBar.height - layout.headingToContent), animated: !azalt });
  }, [insets.top, azalt]);

  const kapakDegradesi = useMemo(() => ({
    ...gradients.gameDetailHeader,
    colors: [gradients.gameDetailHeader.colors[0], seffaf(colors.bg), seffaf(colors.bg), colors.bg],
  }), [colors.bg]);

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* YALNIZ ODAKTAYKEN. Yığın bu ekranı üstüne başka ekran açılınca da
          ayakta tutuyor; StatusBar girdileri yığın gibi çalıştığı için
          buradaki 'light' en üstte kalıyor, açık temada sonraki her ekranda
          saat beyaz çıkıyordu (26 Eyl, ölçüldü). Odak gidince girdi düşüyor,
          kökteki temaya göre stil geri geliyor. */}
      {focused ? <StatusBar style={cubukOpak ? (isDark ? 'light' : 'dark') : 'light'} /> : null}
      {/* Kapak — MUTLAK KONUMLU ARKA PLAN, parallax 0.9 (yukarıdaki not).
          G-07: 380 pt, gameDetailHeader degradesi (alt uç temanın zemini). */}
      <Animated.View onLayout={kapakYerlesti} style={[s.cover, { backgroundColor: colors.surface2 }, coverStyle]}>
        {/* Büyümeyle gelindiyse ilk görsel SOLMADAN basılıyor: aynı adres
            bindirmede zaten ekrandaydı; 200 ms solma devirde kapağı karartıp
            geri getiriyordu (26 Eyl, 60 fps kayıt). Veri gelip adres
            değişirse (`g.image`) solma geri geliyor. */}
        {cover ? <Image source={cover} priority="high" cachePolicy="memory-disk" style={StyleSheet.absoluteFill} contentFit="cover" transition={buyume === '1' && cover === image ? null : motion.image} /> : null}
        <LinearGradient colors={kapakDegradesi.colors} locations={kapakDegradesi.locations} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* ÜST ÇUBUK KAPAĞIN İÇİNDE DEĞİL: parallax'la kaysaydı geri düğmesi
          ekrandan çıkardı. Zemini ve oyun adı kaydırmayla 0→1 opaklaşıyor
          (64 pt). Kit: 44'lük cam geri, sağda paylaş + kalp; koleksiyon
          düğmesi tasarımda yok ama ürün özelliği, ortada duruyor. */}
      <View style={s.topBarWrap} pointerEvents="box-none">
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.barBg, { backgroundColor: colors.bg2, borderBottomColor: colors.line }, barStyle]} />
        <View style={{ paddingTop: insets.top }} pointerEvents="box-none">
          <View style={s.topBar} pointerEvents="box-none">
            <PressableScale onPress={geriDon} accessibilityRole="button" accessibilityLabel={t('a11y.back')} style={s.back}>
              <GlassView pointerEvents="none" style={[StyleSheet.absoluteFill, s.backGlass]} />
              <Icon name="back" size={K.detail.backIcon} color={colors.white} strokeWidth={K.detail.backStroke} />
            </PressableScale>
            <Animated.View pointerEvents="none" style={[s.barTitle, barStyle]}>
              <Txt variant="headline" numberOfLines={1}>{title}</Txt>
            </Animated.View>
            <View style={s.barRight}>
              <IconButton icon="share" label={t('share.toFriend')} variant="onArt" iconSize={K.detail.barIcon} onPress={paylasAc} />
              <IconButton icon="layers" label={t('a11y.addToCollection')} variant="onArt" iconSize={K.detail.barIcon} selected={inAnyCollection}
                onPress={() => { Haptics.selectionAsync(); setPickerOpen(true); }} />
              <HeartButton selected={watched} onPress={() => onToggleWishlist(false)} size={K.heart.hero.size} iconSize={K.heart.hero.icon} />
            </View>
          </View>
        </View>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        style={s.body}
        contentContainerStyle={{ paddingTop: COVER_H, paddingBottom: (best ? stickyInset : insets.bottom) + layout.sectionGap, paddingHorizontal: yan }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <FadeIn delay={40}>
          <View style={s.pad}>
            {/* Çevrimdışı bandı adın üstünde: sayfanın tamamı için bir durum. */}
            <CevrimdisiBant ts={detayTs} onRetry={detayTazele} style={s.bant} />
            <Txt variant="display" maxFontSizeMultiplier={1.3}>{title}</Txt>
            {altSatir ? <Txt variant="subheadRegular" numberOfLines={1} style={[s.sub, { color: colors.text2 }]}>{altSatir}</Txt> : null}
            {yuzde != null || mc ? (
              <View style={s.rating}>
                {yuzde != null ? <>
                  <Txt variant="ratingValue" style={s.num}>{yuzdeYaz(yuzde)}</Txt>
                  <Txt variant="subheadRegular" style={{ color: colors.text2 }}>{t('detail.positive')}</Txt>
                  <Txt variant="subheadRegular" style={{ color: colors.text2 }}>·</Txt>
                  <Txt variant="subheadRegular" numberOfLines={1} style={[s.num, s.shrink, { color: colors.text2 }]}>{oySayisi}</Txt>
                </> : null}
                {mc ? <OutlineBadge label={`Metacritic ${mc}`} /> : null}
              </View>
            ) : null}
          </View>

          <View style={s.chipsTop}>
            {turler.length ? <GenreChips items={turler} /> : !detail ? <View style={s.pad}><GenreChipsSkeleton /></View> : null}
          </View>
          {platformlar ? (
            <View style={[s.pad, s.platforms]}>
              <Icon name="monitor" size={K.detail.platformsIcon} color={colors.text2} />
              <Txt variant="footnote" numberOfLines={1} style={{ color: colors.text2 }}>{platformlar}</Txt>
            </View>
          ) : null}

          {/* FAZ 3 sahiplik bandı ("zaten bende mi?") fiyattan önce; bant boşsa
              `gap` çizilmediği için butonlar kitteki 20 pt'de kalıyor. */}
          <View style={[s.pad, s.cta]}>
            <OwnershipBand name={title} istekte={watched} onGit={() => router.push('/account')} />
            {best || !fiyatYuklendi ? <Button title={t('v2.cheapestPrice')} height={K.detail.ctaPrimary} iconRight="arrdown" onPress={fiyataGit} /> : null}
            <Button title={watched ? t('v2.inWishlist') : t('v2.addToWishlist')} variant="secondary" height={K.detail.ctaSecondary} icon="heart" onPress={() => onToggleWishlist(true)} />
          </View>
        </FadeIn>

        {/* Fiyat kartı — ekranın tepe anı. İskelet gerçek kartla aynı yerde,
            200 ms gecikmeli: hızlı yanıtta hiç görünmüyor. */}
        {best || !fiyatYuklendi ? (
          <View onLayout={(e) => { fiyatY.current = e.nativeEvent.layout.y; }} style={[s.pad, s.priceCard]}>
            {best
              ? <FadeIn delay={130}><GamePriceCard stores={fiyatlar} updated={guncel ? t('v2.updatedAgo').replace('{time}', guncel) : null} onOpen={(st) => open(st.url)} onCompareAll={karsilastir} /></FadeIn>
              : <FadeIn delay={200}><PriceListSkeleton /></FadeIn>}
          </View>
        ) : null}

        {/* Fragman ve Görseller. FRAGMAN KULLANICI İSTEYİNCE OYNUYOR (Faz 3):
            mount'ta video decode yok. Oynatıcı artık kapağın değil kartın
            içinde; kullanıcı başlattığı için sesli ve denetimli. */}
        {trailerUrl || shots.length > 0 || !detail ? (
          <FadeIn delay={160} style={s.section}>
            <View style={s.pad}><SectionHeader title={t('v2.mediaTitle')} /></View>
            {trailerUrl ? (
              <View style={[s.pad, s.headGap]}>
                <TrailerCard image={cover || shots[0]} label={t('v2.officialTrailer')} playing={fragmanAcik}
                  onPlay={() => { trailerPlayer.muted = false; setFragmanAcik(true); }}>
                  <VideoView player={trailerPlayer} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls />
                </TrailerCard>
              </View>
            ) : null}
            {shots.length > 0
              ? <View style={s.headGap}><ScreenshotRail shots={shots} onOpen={openShot} /></View>
              : !detail ? <View style={[s.pad, s.headGap]}><ShotStripSkeleton /></View> : null}
          </FadeIn>
        ) : null}

        {/* Oyun Hakkında: 4 satır + "Devamını oku", bilgi hücreleri. Resmî site
            eski mağaza düğmeleri satırından buraya taşındı. */}
        {desc || hucreler.length > 0 || !detail ? (
          <FadeIn delay={220} style={s.section}>
            <View style={s.pad}><SectionHeader title={t('v2.aboutGame')} /></View>
            <View style={[s.pad, s.aboutTop]}>
              {desc ? <>
                <Txt variant="body" maxFontSizeMultiplier={1.3} numberOfLines={expanded ? undefined : K.detail.aboutLines} style={{ color: colors.text2 }}>{desc}</Txt>
                {desc.length > 240 ? (
                  <Pressable accessibilityRole="button" onPress={() => setExpanded((e) => !e)} hitSlop={space[6]} style={s.readMore}>
                    <Txt variant="subhead" style={{ color: colors.red }}>{expanded ? t('detail.less') : t('detail.more')}</Txt>
                  </Pressable>
                ) : null}
              </> : !detail ? <TextBlockSkeleton /> : null}
              <InfoCells cells={hucreler} />
              {detail?.officialUrl ? (
                <Pressable accessibilityRole="link" onPress={() => open(detail.officialUrl)} style={s.official}>
                  <Txt variant="subhead" style={{ color: colors.red }}>{t('detail.official')}</Txt>
                  <Icon name="ext" size={K.chip.chevron} color={colors.red} strokeWidth={K.chip.chevronStroke} />
                </Pressable>
              ) : null}
            </View>
          </FadeIn>
        ) : null}

        {/* Oyuncu İncelemeleri: Steam özeti (tasarım 5 yıldız dağılımı çiziyor;
            Steam yalnız olumlu/olumsuz veriyor) + Gamerisen incelemeleri.
            GameReviews boşsa hiçbir şey çizmiyor. */}
        {reviewTier ? (
          <FadeIn delay={260} style={s.section}>
            <View style={s.pad}><SectionHeader title={t('v2.playerReviews')} /></View>
            <View style={[s.pad, s.headGap]}>
              <ReviewSummary score={yuzdeYaz(yuzde)} label={t(reviewTier.key)} labelColor={reviewTier.color}
                votes={`${formatCompact(reviews.total)} ${t('detail.reviewsCount')}`}
                bars={[
                  { label: t('v2.positive'), pct: yuzde, text: yuzdeYaz(yuzde) },
                  { label: t('v2.negative'), pct: 100 - yuzde, text: yuzdeYaz(100 - yuzde) },
                ]} />
            </View>
          </FadeIn>
        ) : null}
        {(detail?.steamAppId || appid) ? (
          <View style={[s.pad, reviewTier ? s.headGap : s.section]}>
            <GameReviews appid={detail?.steamAppId || appid} gameName={detail?.name || name} hideTitle={!!reviewTier} />
          </View>
        ) : null}
      </Animated.ScrollView>

      {/* Sabit alt çubuk (kit sticky_bar): en ucuz fiyat + "Steam'de en ucuz · -%50". */}
      {best ? (
        <StickyBottomBar
          price={best.isFree ? t('card.free') : formatPrice(best.price)}
          subtitle={[t('v2.cheapestAt').replace('{at}', formatStoreAt(best.name)), !best.isFree && best.discount > 0 ? formatDiscount(best.discount) : null].filter(Boolean).join(' · ')}
          actionLabel={t('v2.goToStore')}
          onAction={() => open(best.url)}
          disabled={!best.url}
        />
      ) : null}

      {/* Ekran görüntüsü ışık kutusu */}
      <Modal
        visible={activeShotIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveShotIndex(null)}
      >
        <View style={s.modalBg}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: (activeShotIndex || 0) * screenWidth, y: 0 }}
            onMomentumScrollEnd={(e) => {
              const contentOffset = e.nativeEvent.contentOffset.x;
              const index = Math.round(contentOffset / screenWidth);
              setCurrentScrollIndex(index);
            }}
            style={StyleSheet.absoluteFill}
          >
            {shots.map((url, index) => (
              <Pressable
                key={index}
                style={[s.modalPage, { width: screenWidth }]}
                onPress={() => setActiveShotIndex(null)}
              >
                <Image source={url} contentFit="contain" style={s.modalImage} />
              </Pressable>
            ))}
          </ScrollView>

          <PressableScale style={[s.closeBtn, { top: insets.top + space[8] }]} onPress={() => setActiveShotIndex(null)} accessibilityRole="button" accessibilityLabel={t('a11y.close')}>
            <Icon name="x" size={K.detail.backIcon} color={colors.white} strokeWidth={K.detail.backStroke} />
          </PressableScale>

          {shots.length > 1 && (
            <View style={[s.indicator, { bottom: insets.bottom + space[24] }]}>
              <Txt variant="footnoteStrong" style={[s.num, { color: colors.white }]}>
                {`${currentScrollIndex + 1} / ${shots.length}`}
              </Txt>
            </View>
          )}
        </View>
      </Modal>

      {/* Koleksiyona ekleme sayfası */}
      <CollectionPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        collections={collections}
        selectedIds={inCollections}
        game={{ name: title }}
        onToggle={async (colId) => {
          const added = await toggleGameInCollection(colId, {
            ...gameObj,
            name: title,
            image: cover,
            slug: detail?.rawgSlug || slug || '',
          });
          // Yalnızca EKLEME akışa düşsün; çıkarma bildirimi anlamsız olurdu
          if (added) {
            reportActivity({
              type: 'collection',
              gameId: String(id),
              gameName: title || '',
              gameImage: cover || '',
            });
          }
          return added;
        }}
        onCreate={(nm) => createCollection(nm)}
      />

      {/* Arkadaşa gönderme sayfası — anasayfa kartlarından buraya taşındı. */}
      <ShareToFriendSheet
        visible={paylasAcik}
        onClose={() => setPaylasAcik(false)}
        gameId={paylasGameId}
        gameName={title}
        onSystemShare={onShare}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  cover: { position: 'absolute', top: 0, left: 0, right: 0, height: COVER_H, overflow: 'hidden' },
  topBarWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  barBg: { borderBottomWidth: StyleSheet.hairlineWidth },
  topBar: { height: K.navBar.height, paddingHorizontal: K.detail.barSide, flexDirection: 'row', alignItems: 'center', gap: K.detail.barGap },
  back: { width: layout.minTouch, height: layout.minTouch, borderRadius: layout.minTouch / 2, alignItems: 'center', justifyContent: 'center' },
  backGlass: { borderRadius: layout.minTouch / 2 },
  barTitle: { flex: 1, minWidth: 0, alignItems: 'center' },
  barRight: { flexDirection: 'row', alignItems: 'center', gap: K.detail.barGap },
  body: { flex: 1 },
  pad: { paddingHorizontal: layout.gutter },
  bant: { marginBottom: space[12] },
  sub: { marginTop: K.detail.subTop },
  rating: { height: K.detail.ratingRow, marginTop: K.detail.ratingTop, flexDirection: 'row', alignItems: 'center', gap: K.detail.ratingGap },
  num: { fontVariant: ['tabular-nums'] },
  shrink: { flexShrink: 1 },
  chipsTop: { marginTop: K.detail.chipsTop },
  platforms: { height: K.detail.platformsRow, marginTop: K.detail.platformsTop, flexDirection: 'row', alignItems: 'center', gap: K.detail.ratingGap },
  cta: { marginTop: K.detail.ctaTop, gap: K.detail.ctaGap },
  priceCard: { marginTop: K.detail.card.top },
  section: { marginTop: layout.sectionGap },
  headGap: { marginTop: layout.headingToContent },
  aboutTop: { marginTop: K.detail.aboutTop },
  readMore: { height: K.detail.readMoreHeight, marginTop: K.detail.readMoreTop, justifyContent: 'center', alignSelf: 'flex-start' },
  official: { height: layout.minTouch, marginTop: K.detail.cellGap, flexDirection: 'row', alignItems: 'center', gap: K.chip.gap, alignSelf: 'flex-start' },
  // tema-bagimsiz: ekran görüntüsü ışık kutusu her temada karanlık oda
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  modalPage: { height: '100%', justifyContent: 'center', alignItems: 'center' },
  modalImage: { width: '100%', height: '100%' },
  // tema-bagimsiz: kapak/ekran goruntusu ustundeki katman
  closeBtn: { position: 'absolute', right: layout.gutter, width: layout.minTouch, height: layout.minTouch, borderRadius: layout.minTouch / 2, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  // tema-bagimsiz: kapak/ekran goruntusu ustundeki katman
  indicator: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: space[16], paddingVertical: space[8], borderRadius: space[20], zIndex: 10 },
});
