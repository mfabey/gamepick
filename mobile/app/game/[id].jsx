import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Modal, Dimensions, Share } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedScrollHandler, useAnimatedStyle,
  useAnimatedReaction, runOnJS, interpolate, Extrapolation,
  withDelay, withSpring,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { fetchCardPrice, fetchGameDetail, fetchGameByAppid, fetchPrices, fetchSteamReviews } from '../../src/api/games';
import { radius, spacing, PRESSED, type, scale, metacriticColor, motion, TOUCH_MIN, SECTION_TITLE } from '../../src/theme';
import { useStyles, useTheme } from '../../src/context/ThemeContext';
import { stripHtml } from '../../src/utils/text';
import { useLanguage } from '../../src/context/LanguageContext';
import { useTimeToData } from '../../src/dev/perf';
import { useWishlist } from '../../src/context/WishlistContext';
import { useCollections, useCollectionsContaining } from '../../src/hooks/useCollections';
import { toggleGameInCollection, createCollection } from '../../src/services/collectionsStore';
import { turAdi } from '../../src/services/genreName';
import OwnershipBand from '../../src/components/OwnershipBand';
import CollectionPicker from '../../src/components/CollectionPicker';
import { reportActivity } from '../../src/api/social';
import { useQuery } from '../../src/hooks/useQuery';
import { usePop } from '../../src/hooks/usePop';
import { useReducedMotion } from '../../src/hooks/useReducedMotion';
import { GenreChipsSkeleton, ShotStripSkeleton, TextBlockSkeleton, PriceListSkeleton } from '../../src/components/Skeleton';
import { recordSignal } from '../../src/services/tasteProfile';
import { recordSeen } from '../../src/services/seenStore';
import FadeIn from '../../src/components/FadeIn';
import StoreLogo from '../../src/components/StoreLogo';
import IconButton from '../../src/components/IconButton';

// Olumlu %'den inceleme tier'ı (etiket i18n + renk)
function tierFor(pct) {
  if (pct >= 90) return { key: 'review.veryPositive',    color: scale.best };
  if (pct >= 75) return { key: 'review.positive',        color: scale.good };
  if (pct >= 60) return { key: 'review.mostlyPositive',  color: scale.mid  };
  if (pct >= 40) return { key: 'review.mixed',           color: scale.weak };
  return           { key: 'review.negative',             color: scale.bad  };
}

// Kapak yüksekliği ve gövdenin kapağa binme payı. İkisi ayrı sabit çünkü
// gövdenin üst dolgusu ikisinin FARKI (320 − 48); tek sayı yazılsaydı biri
// değişince öteki sessizce kayardı.
const COVER_H = 320;
const COVER_OVERLAP = 48;

// Handoff: "Kaydırmada başlık ilk 64 px'de 0→1 opaklığa gelir."
const HEADER_FADE = 64;

// Binlik ayraçlı sayı (TR '.', EN ',')
function groupNum(n, sep) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

export default function GameDetail() {
  const styles = useStyles(makeStyles);
  const { colors, isDark } = useTheme();
  const { id, name, image, slug, hasSteam, appid } = useLocalSearchParams();
  const router = useRouter();
  const { t, lang, formatPrice } = useLanguage();
  const { isWatched, toggle } = useWishlist();

  // Koleksiyonlar — bu oyunun hangi listelerde olduğunu göster
  const collections = useCollections();
  const [pickerOpen, setPickerOpen] = useState(false);

  // Zengin detay: cache-first (aynı oyunu tekrar açınca anında gelir).
  // appid varsa (Share Extension'dan gelindiyse) doğrudan Steam appdetails'e
  // gider — RAWG slug tahmini yapılmaz, rastgele bir Steam linkinin her zaman
  // doğru oyuna çözülmesini garanti eder.
  const { data: detail } = useQuery(
    appid ? `game-detail:appid:${appid}:${lang}` : `game-detail:${slug || id}:${lang}`,
    () => (appid ? fetchGameByAppid(appid, lang) : fetchGameDetail(slug || id, lang))
      .then((d) => (d && !d.error ? d : null)),
    { ttl: 30 * 60 * 1000 }
  );
  const [price, setPrice]     = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [expanded, setExpanded] = useState(false);
  useTimeToData('GameDetail', !!detail);
  const [activeShotIndex, setActiveShotIndex] = useState(null);
  const [currentScrollIndex, setCurrentScrollIndex] = useState(0);
  const { width: screenWidth } = Dimensions.get('window');

  // Lightbox'ı aç: indeks ve gösterge aynı anda ayarlanır (bir karelik yanlış sayı olmaz)
  const openShot = useCallback((i) => {
    setActiveShotIndex(i);
    setCurrentScrollIndex(i);
  }, []);

  // Mağaza-başı fiyat karşılaştırması (ITAD) — detay yüklenince (steamAppId için)
  const { data: pricesData } = useQuery(
    `prices:${detail?.steamAppId || slug || id}`,
    () => fetchPrices({ appid: detail?.steamAppId, title: detail?.name || name }),
    { ttl: 30 * 60 * 1000, enabled: !!detail }
  );
  // ITAD listesi + (boşsa) Steam kart fiyatı YEDEK olarak.
  //
  // Yedek neden duruyor: ITAD bazı oyunlarda hiç mağaza döndürmüyor
  // (bölgesel kısıt, eşleşmeyen başlık). O hâlde ekranda tek fiyat bile
  // olmuyordu. Artık liste boşsa cardPrice tek satır olarak giriyor —
  // İKİ SİSTEM DEĞİL, biri ötekinin yokluğunda.
  const priceStores = useMemo(() => {
    const list = pricesData?.stores || [];
    if (list.length > 0) {
      return [...list].sort((a, b) => (a.isFree ? -1 : b.isFree ? 1 : a.price - b.price));
    }
    if (price?.price != null || price?.isFree) {
      return [{
        storeId: 'steam', name: 'Steam', url: price.url || null,
        price: price.price, original: price.original, discount: price.discount || 0,
        isFree: !!price.isFree, yedek: true,
      }];
    }
    return [];
  }, [pricesData, price]);

  // Steam topluluk inceleme analizi — detay yüklenince (steamAppId için)
  const { data: reviews } = useQuery(
    `reviews:${detail?.steamAppId || ''}`,
    () => fetchSteamReviews(detail?.steamAppId),
    { ttl: 60 * 60 * 1000, enabled: !!detail?.steamAppId }
  );
  const reviewTier = reviews?.total ? tierFor(reviews.positivePct) : null;

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

  const watched = isWatched(id);
  // appid ŞART: istek listesi widget'ı fiyatları Steam appid'iyle çekiyor.
  // Buradan appid'siz eklenen oyunlar widget'ta hiç görünmüyordu — detay
  // zaten steamAppId'i taşıyordu, sadece iletilmiyordu.
  const gameObj = {
    id, name, slug, image,
    appid: detail?.steamAppId || appid || null,
    hasSteam: hasSteam === 'true' || hasSteam === '1',
  };
  const inCollections = useCollectionsContaining(id);
  const inAnyCollection = inCollections.size > 0;

  useEffect(() => {
    let alive = true;
    fetchCardPrice({ slug: slug || '', name: name || '', hasSteam: true })
      .then(d => { if (alive) setPrice(d); })
      .catch(() => {})
      .finally(() => { if (alive) setLoadingPrice(false); });
    return () => { alive = false; };
  }, [slug, name]);

  // Tazelik: bu oyunu "görüldü" işaretle (id anında hazır, detay beklemez)
  useEffect(() => { if (id) recordSeen(id); }, [id]);

  // Zevk sinyali: detay (türler) yüklendiğinde bir kez kaydet
  const viewRecorded = useRef(false);
  useEffect(() => {
    if (detail?.genres?.length && !viewRecorded.current) {
      viewRecorded.current = true;
      recordSignal({ genres: detail.genres, type: 'view' });
    }
  }, [detail]);

  // Wishlist eklerken güçlü sinyal + dokunsal geri bildirim
  const onToggleWishlist = () => {
    const willAdd = !watched;
    Haptics.impactAsync(willAdd ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
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

  const wishStyle = usePop(watched);

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

  const cover = detail?.image || image;
  const title = detail?.name || name;
  const isFree = price?.isFree;
  const onSale = price?.discount > 0 && !isFree;
  const desc = stripHtml(detail?.description);
  const genres = detail?.genres || [];
  const shots = detail?.screenshots || [];
  const mc = detail?.metacritic;
  const mcColor = metacriticColor(mc);

  const stores = [];
  if (detail?.steamUrl || gameObj.hasSteam) stores.push({ key: 'steam', label: 'Steam', icon: 'logo-steam', color: '#1a9fff', url: detail?.steamUrl });
  if (detail?.epicUrl) stores.push({ key: 'epic', label: 'Epic', icon: 'globe-outline', color: '#fff', url: detail.epicUrl });
  if (detail?.officialUrl) stores.push({ key: 'official', label: t('detail.official'), icon: 'link-outline', color: colors.text2, url: detail.officialUrl });

  const open = (url) => { if (url) WebBrowser.openBrowserAsync(url); };

  return (
    <View style={styles.root}>
      <StatusBar style={cubukOpak ? (isDark ? 'light' : 'dark') : 'light'} />
      {/* Kapak — MUTLAK KONUMLU ARKA PLAN.
          Öncesinde normal akışta bir View'di ve gövde onun ALTINDA ayrı bir
          ScrollView'di; kapak hiç kaymıyordu. Mutlağa alınınca gövde tam
          yüksekliğe çıkıyor, kapak da altında parallax'la kayabiliyor. */}
      <Animated.View style={[styles.coverWrap, coverStyle]}>
        {cover ? <Image source={cover} priority="high" cachePolicy="memory-disk" style={StyleSheet.absoluteFill} contentFit="cover" transition={motion.image} /> : null}
        {/* Video ancak kullanıcı istediğinde MOUNT ediliyor — sadece
            duraklatmak yetmezdi, VideoView kendisi de kaynak tutuyor. */}
        {trailerUrl && fragmanAcik ? (
          <VideoView
            player={trailerPlayer}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
        ) : null}
        <LinearGradient colors={['rgba(8,10,13,0.15)', 'rgba(8,10,13,0.45)', colors.bg]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />

      </Animated.View>

      {/* ÜST ÇUBUK KAPAĞIN İÇİNDE DEĞİL. İçinde kalsaydı parallax'la birlikte
          yukarı kayar ve geri düğmesi ekrandan çıkardı. Sabit katman:
          zemini kaydırmayla 0→1 opaklaşıyor, oyun adı da onunla geliyor.
          pointerEvents box-none — opak zemin altındaki içeriğe dokunuşu
          engellemesin. */}
      <View style={styles.topBarWrap} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, styles.barBg, barStyle]} pointerEvents="none" />
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <Pressable style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]} onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>

          {/* Çubuktaki ad. Gövdedeki ad kaydırılınca ekrandan çıkıyor ve
              öncesinde geriye yalnızca ikonlar kalıyordu. numberOfLines=1 ŞART:
              çubuk sabit yükseklikte, uzun oyun adı ikinci satıra taşarsa
              ikonları aşağı iter. */}
          <Animated.Text numberOfLines={1} style={[styles.barTitle, barStyle]}>
            {title}
          </Animated.Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <IconButton icon='share-outline' size={21} color="#fff" onPress={onShare} style={styles.iconBtn} />
            <Pressable
              style={[styles.iconBtn, inAnyCollection && styles.iconBtnActive]}
              onPress={() => { Haptics.selectionAsync(); setPickerOpen(true); }}
              hitSlop={10}
            >
              <Ionicons
                name={inAnyCollection ? 'albums' : 'albums-outline'}
                size={20}
                color={inAnyCollection ? colors.bg : '#fff'}
              />
            </Pressable>
            <Pressable style={[styles.iconBtn, watched && styles.iconBtnActive]} onPress={onToggleWishlist} hitSlop={10}>
              {/* Aktif yüzey açık olduğu için ikon koyuya dönüyor. Eskiden
                  `watched ? '#fff' : '#fff'` yazıyordu — iki dalı da aynı
                  olan işlevsiz bir üçlüydü. */}
              {/* Listeye EKLERKEN kısa bir tepki; çıkarırken sessiz. */}
              <Animated.View style={wishStyle}>
                <Ionicons
                  name={watched ? 'notifications' : 'notifications-outline'}
                  size={20}
                  // tema-bagimsiz: kapak görselinin üstünde duruyor
                  color={watched ? colors.bg : '#fff'}
                />
              </Animated.View>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>

      <Animated.ScrollView
        style={styles.body}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: COVER_H - COVER_OVERLAP, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <FadeIn delay={40}>
        {/* FRAGMAN DÜĞMESİ KAPAĞIN ÜSTÜNDE GÖRÜNÜR AMA ScrollView'İN İÇİNDE.
            Önce mutlak konumla kapağa konmuştu ve simülatörde DOKUNULAMIYORDU:
            ScrollView kapağın üstünü örtüyor (contentContainerStyle'ın 272pt
            saydam üst dolgusu dokunuşları yutuyor). Negatif üst kenar boşluğu
            onu görsel olarak kapağa taşıyor, dokunma hedefi ise akışta
            kalıyor. Maket ölçüsü korundu: 36pt, rgba(0,0,0,.5), footnote 13,
            hitSlop 8 → gerçek hedef 52pt. */}
        {trailerUrl && !fragmanAcik ? (
          <Pressable
            onPress={() => setFragmanAcik(true)}
            hitSlop={8}
            accessibilityRole="button"
            style={({ pressed }) => [styles.fragmanBtn, pressed && PRESSED]}
          >
            <Ionicons name="play" size={13} color="#fff" />
            <Text style={styles.fragmanText}>{t('detail.playTrailer')}</Text>
          </Pressable>
        ) : null}

        <Text style={styles.name}>{title}</Text>

        {/* FAZ 3 — SAHİPLİK BANDI. Adın HEMEN ALTINDA, meta çiplerinin
            ÜSTÜNDE: "zaten bende mi?" sorusu fiyattan önce gelir.
            Yeni istek açmıyor — anasayfayla aynı önbelleği okuyor. */}
        <View style={styles.bantKut}>
          <OwnershipBand
            name={title}
            istekte={watched}
            onGit={() => router.push('/account')}
          />
        </View>

        {/* Meta satırı */}
        <View style={styles.metaRow}>
          {mc ? (
            <View style={styles.metaChip}>
              <Text style={[styles.metaChipText, { color: mcColor }]}>{mc}</Text>
              <Text style={styles.metaChipLabel}>Metacritic</Text>
            </View>
          ) : null}
          {detail?.rating > 0 ? (
            <View style={styles.metaChip}>
              {/* Yanındaki Metacritic rengi DEĞERE bağlı (mcColor: 80+ yeşil,
                  60+ amber, altı kırmızı). Puan ise değeri ne olursa olsun
                  kırmızıydı — aynı satırda iki farklı renklendirme mantığı,
                  üstelik kırmızı olumsuz okunduğu için 4.5/5 kötü görünüyordu.
                  Kural: renk değere bağlıysa kalır, değilse nötrleşir. */}
              <Text style={[styles.metaChipText, { color: colors.text }]}>★ {detail.rating.toFixed(1)}</Text>
              <Text style={styles.metaChipLabel}>Puan</Text>
            </View>
          ) : null}
          {detail?.released ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText2}>{detail.released}</Text>
              <Text style={styles.metaChipLabel}>{t('detail.released')}</Text>
            </View>
          ) : null}
        </View>

        {detail?.developer ? (
          <Text style={styles.dev}>{t('detail.developer')}: <Text style={{ color: colors.text2 }}>{detail.developer}</Text></Text>
        ) : null}

        {/* FAZ 3, KIRILMA #1 — ÜSTTEKİ TEK FİYAT KALKTI.
            Aynı ekranda İKİ fiyat sistemi vardı: burada fetchCardPrice
            (Steam, 15 dk önbellek), aşağıdaki listede fetchPrices (ITAD,
            30 dk). İkisi farklı zamanda tazelenip ÇELİŞEBİLİYORDU —
            üstte ₺449, listede Steam ₺519.

            "Bir sayı yanlış olmaktan kötüsü iki sayının farklı olması."
            Tepe anı tek yerde: aşağıdaki karşılaştırma listesi. cardPrice
            yalnızca o liste boş kaldığında yedek satır oluyor. */}

        {/* Mağaza butonları */}
        {stores.length > 0 && (
          <View style={styles.storeRow}>
            {stores.map(s => (
              <Pressable key={s.key} style={({ pressed }) => [styles.storeBtn, pressed && PRESSED]} onPress={() => open(s.url)} disabled={!s.url}>
                <Ionicons name={s.icon} size={17} color={s.color} />
                <Text style={styles.storeText}>{s.label}</Text>
                <Ionicons name="open-outline" size={13} color={colors.text3} />
              </Pressable>
            ))}
          </View>
        )}

        </FadeIn>

        {/* Fiyat karşılaştırması */}
        {/* İskelet: gerçek satırla aynı yükseklikte (56) → içerik gelince
            sayfa sıçramıyor. 200 ms gecikmeyle: hızlı yanıtta hiç
            görünmüyor, yalnız yanıp sönerdi. */}
        {priceStores.length === 0 && !pricesData ? (
          <Section title={t('detail.priceCompare')} delay={130}>
            <FadeIn delay={200}><PriceListSkeleton /></FadeIn>
          </Section>
        ) : null}

        {priceStores.length > 0 && (
          <Section title={t('detail.priceCompare')} delay={130}>
            {/* FAZ 2 — "Ekranın TEPE ANI: yalnızca KAZANAN satır kapsanır
                (bgInput yüzey + tek kırmızı eylem). Diğerleri DÜZ SATIR."

                Öncesinde her satır kendi kartıydı (card yüzey + 1px kenarlık)
                ve kazanan kırmızı kenarlık + kırmızı tint taşıyordu. Dört
                kart yan yana durunca hiçbiri öne çıkmıyordu — kapsama
                herkesteydi. Şimdi kapsama TEK bir satırda ve kırmızı da
                orada, üstelik bir eylemin (Git) üstünde: kırmızı yalnızca
                dokunulacak şeyde. */}
            <View style={{ gap: spacing.s12 }}>
              {priceStores.map((s, i) => (
                <FiyatSatiri
                  key={s.storeId || s.name}
                  magaza={s}
                  kazanan={i === 0}
                  sira={i}
                  toplam={priceStores.length}
                  onPress={() => open(s.url)}
                />
              ))}
            </View>
          </Section>
        )}

        {/* Yorum analizi */}
        {reviewTier && (
          <Section title={t('detail.reviews')} delay={175}>
            <View style={styles.revCard}>
              <View style={styles.revHead}>
                <Text style={[styles.revLabel, { color: reviewTier.color }]}>{t(reviewTier.key)}</Text>
                <Text style={styles.revPct}>
                  {lang === 'tr' ? `%${reviews.positivePct}` : `${reviews.positivePct}%`}
                  <Text style={styles.revPctLabel}> {t('detail.positive')}</Text>
                </Text>
              </View>
              <View style={styles.revBar}>
                <View style={[styles.revBarFill, { width: `${reviews.positivePct}%`, backgroundColor: reviewTier.color }]} />
              </View>
              <Text style={styles.revCount}>{groupNum(reviews.total, lang === 'tr' ? '.' : ',')} {t('detail.reviewsCount')}</Text>
            </View>
          </Section>
        )}

        {/* Türler — veri gelene kadar iskelet.
            TAM EKRAN İSKELET YOK: kapak ve ad rota parametrelerinden anında
            çiziliyor, onları örtmek kazanç değil kayıp olurdu. Boş kalan
            yalnızca ağdan gelen bu bölümler (ölçüldü: 868ms). */}
        {genres.length > 0 ? (
          <Section title={t('detail.genres')} delay={100}>
            <View style={styles.genreWrap}>
              {genres.slice(0, 8).map((g, i) => (
                <View key={`${g}_${i}`} style={styles.genreChip}><Text style={styles.genreText}>{turAdi(g, t)}</Text></View>
              ))}
            </View>
          </Section>
        ) : !detail ? (
          <Section title={t('detail.genres')} delay={100}><GenreChipsSkeleton /></Section>
        ) : null}

        {/* Ekran görüntüleri */}
        {shots.length === 0 && !detail ? (
          <Section title={t('detail.screenshots')} delay={160}><ShotStripSkeleton /></Section>
        ) : null}
        {shots.length > 0 && (
          <Section title={t('detail.screenshots')} delay={160}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.lg }} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 10 }}>
              {shots.map((url, i) => (
                <Pressable key={i} onPress={() => openShot(i)}>
                  <Image source={url} cachePolicy="memory-disk" style={styles.shot} contentFit="cover" transition={motion.image} />
                </Pressable>
              ))}
            </ScrollView>
          </Section>
        )}

        {/* Açıklama */}
        {!desc && !detail ? (
          <Section title={t('detail.about')} delay={220}><TextBlockSkeleton /></Section>
        ) : null}
        {desc ? (
          <Section title={t('detail.about')} delay={220}>
            <Text style={styles.desc} numberOfLines={expanded ? undefined : 5}>{desc}</Text>
            {desc.length > 240 && (
              <Pressable onPress={() => setExpanded(e => !e)} hitSlop={6}>
                <Text style={styles.moreLink}>{expanded ? t('detail.less') : t('detail.more')}</Text>
              </Pressable>
            )}
          </Section>
        ) : null}
      </Animated.ScrollView>

      {/* Screenshot Lightbox Modal */}
      <Modal
        visible={activeShotIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveShotIndex(null)}
      >
        <View style={styles.modalBg}>
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
                style={{ width: screenWidth, height: '100%', justifyContent: 'center', alignItems: 'center' }}
                onPress={() => setActiveShotIndex(null)}
              >
                <Image
                  source={url}
                  contentFit="contain"
                  style={styles.modalImage}
                />
              </Pressable>
            ))}
          </ScrollView>

          {/* Close button */}
          <Pressable style={({ pressed }) => [styles.closeBtn, pressed && PRESSED]} onPress={() => setActiveShotIndex(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('a11y.close')}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>

          {/* Page Indicator */}
          {shots.length > 1 && (
            <View style={styles.indicatorContainer}>
              <Text style={styles.indicatorText}>
                {`${currentScrollIndex + 1} / ${shots.length}`}
              </Text>
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
    </View>
  );
}

// ── FİYAT SATIRI · TEPE ANI (Faz 3) ──
// "Kazanan EN SON ve tek başına oturur." Sıra bilgi taşıyor: satırlar
// PAHALIDAN UCUZA açılıyor, göz aşağı iniyor ve son inen yer kazanan.
//
// Liste ucuzdan pahalıya SIRALI çiziliyor (kazanan üstte); değişen yalnız
// açılma GECİKMESİ. En pahalı 40 ms'te, her biri 40 ms arayla; kazanan
// 320 ms'te ve `pop` ile (aşmalı) + hafif dokunsal.
//
// Cevap harekete EK OLARAK yüzeyle (bgInput), etiketle ("En düşük") ve
// eylemle ("Git") işaretli — Reduce Motion'da hiçbir bilgi kaybolmuyor,
// yalnız zamanlama düşüyor.
function FiyatSatiri({ magaza: s, kazanan, sira, toplam, onPress }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t, formatPrice } = useLanguage();
  const reducedMotion = useReducedMotion();

  // Pahalıdan ucuza: en son sıradaki (en pahalı) ilk açılır.
  const gecikme = kazanan ? 40 * toplam + 160 : 40 * (toplam - sira);

  const ilerleme = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => {
    if (reducedMotion) { ilerleme.value = 1; return; }
    ilerleme.value = withDelay(
      gecikme,
      withSpring(1, kazanan ? motion.pop : motion.firm)
    );
    if (!kazanan) return;
    const zaman = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }, gecikme);
    return () => clearTimeout(zaman);
  }, [gecikme, kazanan, reducedMotion, ilerleme]);

  const stil = useAnimatedStyle(() => ({
    opacity: ilerleme.value,
    transform: [{ scale: kazanan ? 0.94 + ilerleme.value * 0.06 : 1 },
                { translateY: (1 - ilerleme.value) * 8 }],
  }), [kazanan]);

  return (
    <Animated.View style={stil}>
      <Pressable onPress={onPress} disabled={!s.url}
        style={({ pressed }) => [styles.cmpRow, kazanan && styles.cmpBest, pressed && PRESSED]}>
        <StoreLogo store={s.name} size={26} />

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={styles.cmpName}>{s.name}</Text>
          {kazanan ? <Text style={styles.cmpCheapest}>{t('detail.cheapest')}</Text> : null}
        </View>

        {/* Kazananda fiyat sütunu (üstte güncel, altta üstü çizili eski);
            ötekilerde tek satır ve SÖNÜK — karşılaştırma kazananı okumakla
            bitiyor. */}
        <View style={styles.cmpFiyatKut}>
          <Text style={[styles.cmpPrice, !kazanan && styles.cmpPriceSonuk]}>
            {s.isFree ? t('card.free') : formatPrice(s.price)}
          </Text>
          {kazanan && s.discount > 0 ? (
            <Text style={styles.original}>{formatPrice(s.original)}</Text>
          ) : null}
        </View>

        {kazanan ? (
          <View style={styles.cmpGit}><Text style={styles.cmpGitText}>{t('detail.go')}</Text></View>
        ) : (
          <Ionicons name="chevron-forward" size={15} color={colors.text3} />
        )}
      </Pressable>
    </Animated.View>
  );
}

function Section({ title, delay = 0, children }) {
  const styles = useStyles(makeStyles);
  return (
    <FadeIn delay={delay} style={{ marginTop: spacing.xl }}>
      {/* FAZ 3: body 17/800 → overline (caption 12 · 700 · uppercase · text2),
          anasayfayla AYNI jeton. "İki ekran aynı yapıya iki farklı ses
          veriyordu." Hiyerarşi kazancı: başlıklar susunca oyun adı
          (title1 28) ekranın tek büyük sesi kalıyor. */}
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </FadeIn>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  // Kapak yüklenene kadarki zemin — açık temada koyu bir bant çakıyordu.
  coverWrap: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: COVER_H, backgroundColor: colors.card,
  },
  // Sabit üst katman. zIndex ŞART: kapaktan sonra çiziliyor ama gövde de
  // ondan sonra geliyor; sırasız bırakılsa gövde çubuğun üstüne binerdi.
  topBarWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  barBg: { backgroundColor: colors.bg },
  // Dikey dolgu artık ölçekten (8/8). Öncesi paddingTop: 6 idi — çubuğun
  // opak zemini artık altına da uzandığı için simetri gerekiyordu ve 6
  // ölçekte yok.
  topBar: { paddingHorizontal: spacing.md, paddingTop: spacing.s8, paddingBottom: spacing.s8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.s12 },
  barTitle: {
    flex: 1, textAlign: 'center',
    color: colors.text, fontSize: type.body, fontWeight: '700',
  },
  // tema-bagimsiz: kapak/ekran goruntusu ustundeki katman
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  // Aktif durum dolu nötr yüzeyle: ikon zaten outline→dolu değişiyor, yani
  // renk olmadan da iki sinyal var (biçim + yüzey). Kapak görselinin üstünde
  // durduğu için açık yüzey her sahnede okunur kalıyor.
  iconBtnActive: { backgroundColor: colors.text },
  // marginTop: -48 KALKTI. Kapak artık mutlak konumlu olduğu için gövde tam
  // yüksekliğe yayılıyor; kapağa binme payı contentContainerStyle'daki
  // paddingTop (COVER_H − COVER_OVERLAP) ile veriliyor.
  body: { flex: 1 },
  name: { fontSize: type.title1, fontWeight: '900', color: colors.text, letterSpacing: -0.5, lineHeight: 30 },

  metaRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  metaChip: { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: spacing.sm, alignItems: 'center', minWidth: 68 },
  metaChipText: { fontSize: type.body, fontWeight: '800' },
  metaChipText2: { fontSize: type.footnote, fontWeight: '700', color: colors.text },
  // Maket: "Metacritic" = 12 / 600 / cumle duzeni.
  metaChipLabel: { fontSize: type.caption, color: colors.text3, fontWeight: '600', marginTop: 2 },
  dev: { fontSize: type.footnote, color: colors.text3, marginTop: spacing.md, fontWeight: '600' },

  // ── HANDOFF BELİRSİZLİĞİ, KARARI YAZIYORUM ──
  // Handoff "fiyat satırı"nı bir KART varyantı olarak tanımlıyor: "44
  // yükseklik satır, sağda fiyat", kullanıldığı yerler "oyun detayı,
  // indirimler". Bu ekranda iki ayrı şey var:
  //   • başlık altındaki TEK fiyat (burası) — solunda hiçbir şey yok
  //   • Fiyat Karşılaştırması satırları (cmpRow) — solda mağaza, sağda fiyat
  // Varyantın tarifi ikincisine oturuyor; 44pt ve sağa yaslama oraya
  // uygulandı. Burada fiyat SOLDA bırakıldı: sayfanın tamamı sola hizalı bir
  // sütun ve tek bir değeri sağ kenara atmak onu boşlukta yüzen bir öksüze
  // çevirirdi. Yükseklik yine de 26'dan 44'e çıktı — ailenin ritmi bu.
  priceRow: { marginTop: spacing.lg, minHeight: TOUCH_MIN, justifyContent: 'center', alignItems: 'flex-start' },
  price: { fontSize: type.title3, fontWeight: '800', color: colors.text },
  // tema-bagimsiz: kapak gorselinin ustunde duruyor
  fragmanBtn: {
    alignSelf: 'flex-start',
    // Adın 48pt üstüne çekiyor: 36 (düğme) + 12 (nefes). O bölge kapağın
    // gövdeyle örtüştüğü alan (COVER_OVERLAP = 48).
    marginTop: -(36 + spacing.s12),
    marginBottom: spacing.s12,
    flexDirection: 'row', alignItems: 'center', gap: spacing.s8,
    height: 36, paddingHorizontal: spacing.s12, borderRadius: radius.md,
    // tema-bagimsiz: kapak gorselinin ustunde duruyor, zemin gorselin kendisi
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  // tema-bagimsiz: koyu cam dugmenin uzerinde
  fragmanText: { color: '#fff', fontSize: type.footnote, fontWeight: '600' },
  bantKut: { marginTop: spacing.s12 },
  priceFree: { fontSize: type.title3, fontWeight: '800', color: colors.green },
  priceLoading: { fontSize: type.headline, color: colors.text3 },
  original: { fontSize: type.caption, color: colors.text3, textDecorationLine: 'line-through' },
  // FAZ 2/3: kırmızı dolgu KALKTI — indirim bir DEĞER, eylem değil.
  // tema-bagimsiz: kapak gorselinin ustundeki koyu cam rozet
  discountBadge: { backgroundColor: 'rgba(8,10,14,0.75)', borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  discountText: { color: colors.green, fontWeight: '800', fontSize: type.caption2 },

  storeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  storeBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11 },
  storeText: { color: colors.text, fontSize: type.footnote, fontWeight: '700' },

  // minHeight 44 AÇIKÇA yazılı: handoff'un fiyat satırı ölçüsü bu ve
  // öncesinde yükseklik yalnızca içerikten türüyordu — mağaza adı tek
  // satıra düştüğünde satır 44'ün altına iniyordu.
  // Maket: satır min 56, boşluk 12, yatay dolgu 12. Yüzey YALNIZ kazananda.
  cmpRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: spacing.s12, paddingHorizontal: spacing.s12, borderRadius: radius.md },
  cmpBest: { backgroundColor: colors.bgInput },
  cmpName: { fontSize: type.subhead, fontWeight: '600', color: colors.text },
  // "En düşük" GREEN, kırmızı değil: bir DEĞER bildiriyor, eylem değil.
  cmpCheapest: { fontSize: type.caption, fontWeight: '600', color: colors.green },
  cmpFiyatKut: { alignItems: 'flex-end', flexShrink: 0 },
  cmpPrice: { fontSize: type.headline, fontWeight: '700', color: colors.text },
  cmpPriceSonuk: { color: colors.text2 },
  // Ekranın tek kırmızısı ve bir EYLEM. 44pt — HIG hedefi.
  cmpGit: {
    height: TOUCH_MIN, paddingHorizontal: 14, borderRadius: radius.md,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  // tema-bagimsiz: dolu kirmizi dugmenin uzerinde
  cmpGitText: { color: '#fff', fontSize: type.subhead, fontWeight: '600' },

  revCard: { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg },
  revHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.md },
  revLabel: { fontSize: type.body, fontWeight: '800' },
  revPct: { fontSize: type.subhead, fontWeight: '800', color: colors.text },
  revPctLabel: { fontSize: type.footnote, fontWeight: '600', color: colors.text3 },
  revBar: { height: 8, borderRadius: 4, backgroundColor: colors.cardBorder, overflow: 'hidden' },
  revBarFill: { height: '100%', borderRadius: 4 },
  revCount: { fontSize: type.footnote, color: colors.text3, fontWeight: '600', marginTop: 10 },

  sectionTitle: { ...SECTION_TITLE, color: colors.text2, marginBottom: spacing.s12 },
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  genreChip: { backgroundColor: colors.bgInput, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  genreText: { color: colors.text2, fontSize: type.footnote, fontWeight: '700' },
  shot: { width: 264, height: 148, borderRadius: radius.md, backgroundColor: colors.card },
  desc: { fontSize: type.subhead, color: colors.text2, lineHeight: 21 },
  // Gerçek bir eylem (metni açıyor), o yüzden text2 değil text: nötr ama
  // parlak. Vurgu rengi bu ekranda fiyat ve indirime ayrılmış durumda.
  moreLink: { color: colors.text, fontSize: type.footnote, fontWeight: '700', marginTop: spacing.sm },
  // tema-bagimsiz: kapak/ekran goruntusu ustundeki katman
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  modalImage: { width: '100%', height: '100%' },
  // tema-bagimsiz: kapak/ekran goruntusu ustundeki katman
  closeBtn: { position: 'absolute', top: 50, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  // tema-bagimsiz: kapak/ekran goruntusu ustundeki katman
  indicatorContainer: { position: 'absolute', bottom: 40, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 20, zIndex: 10 },
  indicatorText: { color: '#fff', fontSize: type.subhead, fontWeight: '700', letterSpacing: 0.5 },
});
