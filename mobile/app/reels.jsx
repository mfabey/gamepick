// ─────────────────────────────────────────────────────────────────────────────
// Oyun videoları — dikey, tam ekran, Reels tarzı akış.
//
// AKICILIĞIN SIRRI: OYNATICI HAVUZU.
// Liste elemanı başına oynatıcı oluşturmak klasik hatadır — 20 AVPlayer aynı
// anda açık kalır, bellek şişer ve kaydırma tutuklaşır. Burada ekran düzeyinde
// SABİT 3 oynatıcı var; her elemana `index % 3` ile bir oynatıcı düşüyor.
// Görüntü alanına yakın üç eleman (i-1, i, i+1) her zaman farklı oynatıcıya
// denk geldiği için çakışma olmuyor.
//
// Ayrıca: video hazır olana kadar Steam'in kendi küçük görseli poster olarak
// duruyor → siyah ekran flaşı yok. Algılanan akıcılıkta en belirleyici detay bu.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import {
  View, Pressable, StyleSheet, ActivityIndicator, useWindowDimensions, Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { fetchVideoFeed, fetchVideo } from '../src/api/videoFeed';
import { useTabPressAction } from '../src/hooks/useTabPressAction';
import { useTabBarHidden } from '../src/context/TabBarContext';
import { useWishlist } from '../src/context/WishlistContext';
import { useAuth } from '../src/context/AuthContext';
import { useCollections, useCollectionsContaining } from '../src/hooks/useCollections';
import { toggleGameInCollection, createCollection } from '../src/services/collectionsStore';
import CollectionPicker from '../src/components/CollectionPicker';
import RotateGlowButton from '../src/components/RotateGlowButton';
import ShareToFriendSheet from '../src/components/ShareToFriendSheet';
import { recordSignal } from '../src/services/tasteProfile';
import { reportActivity } from '../src/api/social';
import { recordSeen } from '../src/services/seenStore';
import { spacing, motion } from '../src/theme';
import { control as C, component as K, space } from '../src/theme/tokens';
import { designPalettes } from '../src/theme/palettes';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { Icon } from '../src/components/Icon';
import { IconButton, PressableScale, Txt } from '../src/components/ui/Primitives';
import { OverlayTag, PlayButton } from '../src/components/ui/Media';
import { GlassView } from '../src/components/ui/GlassView';


import { useStyles } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';

const POOL = 3;

// expo-video: `allowsFullscreen` kullanimdan kalkti, karsiligi
// `fullscreenOptions.enable`. Modul duzeyinde: JSX icinde nesne yazmak
// her render'da yenisini uretirdi.
const TAM_EKRAN_KAPALI = { enable: false };

// Yatayda ekranın köşe kavisinden kaçmak için üst çubuğa verilen paylar.
// Dikeyde gerek yok: orada güvenli alan (~59pt) zaten bu işi görüyor.
const LANDSCAPE_TOP_PAD = 14;
// Alt eylem rayı yeni çubukla aynı tabGeometry hesabını kullanır.
const LANDSCAPE_SIDE_PAD = 22;

// Video karesinin üstündeki katmanların renkleri — TEMA BAĞIMSIZ, 2.0 koyu
// paleti (Button `onArt` ile aynı karar): açık temada da zemin videonun kendisi.
const ART = designPalettes.dark;

export default function VideosScreen() {
  const styles = useStyles(makeStyles);
  const { colors } = useDesignTheme();
  const router = useRouter();
  const { start } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { t, lang } = useLanguage();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(false);
  // Ekran şu an görünür mü? Sekme geçişinde ekran sökülmediği için oynatmayı
  // yalnızca bu bayrak durdurabiliyor.
  const [focused, setFocused] = useState(true);
  // Kullanıcının elle duraklatması. EKRAN düzeyinde tutuluyor, elemanda değil:
  // oynatıcıyı yöneten efekt burada ve tek kaynak olmazsa efekt her
  // çalıştığında kullanıcının duraklattığı videoyu geri başlatırdı.
  const [paused, setPaused] = useState(false);
  // Basılı tutma sürüyor mu? Duraklatma göstergesini bastırmak için gerekli:
  // tutarken oynat simgesi çıkmamalı, Instagram'da da çıkmıyor.
  const [holding, setHolding] = useState(false);
  // Sekme cubugunu tamamen gizlemek icin navigator seviyesine kopru
  const tabHidden = useTabBarHidden();
  const fetching = useRef(false);
  const listRef = useRef(null);

  // Oturum başına tek seed — sunucu sırayı buna göre karıştırıyor.
  // Sabit kalması ŞART: her istekte değişseydi sayfa 2, sayfa 1'in devamı
  // olmaz ve aynı videolar tekrar gelirdi.
  const seedRef = useRef(String(Date.now()) + Math.random().toString(36).slice(2, 8));

  // Tam ekran eleman ölçüleri.
  //
  // useWindowDimensions ŞART: eskiden modül düzeyinde Dimensions.get('window')
  // vardı ve döndürmede GÜNCELLENMİYORDU. Yatay moda geçince eleman yüksekliği
  // hâlâ dikey ekranın yüksekliği olurdu; sayfalama tamamen bozulurdu.
  const { width: winW, height: winH } = useWindowDimensions();

  // ÖĞE YÜKSEKLİĞİ PENCEREDEN DEĞİL, LİSTENİN ÖLÇÜLEN YÜKSEKLİĞİNDEN.
  //
  // Önceden `itemH = winH` idi ve buradaki yorum "paging bunun tam katlarına
  // oturur" diyordu. Yanlıştı: `pagingEnabled` öğe yüksekliğine değil
  // KAYDIRMA ALANININ yüksekliğine göre sayfalar. İkisi bir piksel ayrışsa
  // fark her sayfada BİRİKİYOR — videolar giderek kayıyordu.
  //
  // Pencere ile liste görünümü eşit olmak zorunda değil: FloatingTabBar
  // mutlak konumlu ama Tabs'ın screenOptions'ında
  // `tabBarStyle: { position: 'absolute' }` yok, yani react-navigation
  // çubuğa yer ayırabiliyor. Ölçülen yüksekliği kullanmak bu belirsizliği
  // tamamen ortadan kaldırıyor — tanımı gereği eşitler.
  const [listH, setListH] = useState(0);
  const onListLayout = useCallback((e) => {
    const h = Math.round(e.nativeEvent.layout.height);
    setListH((onceki) => (onceki === h ? onceki : h));
  }, []);
  // Ölçüm gelene kadar pencereye düş: ilk kare boş kalmasın.
  const itemH = listH || winH;

  // DÖNDÜRMEDE YENİDEN HİZALA.
  //
  // Yükseklik değişince (914 → 411) mevcut kaydırma konumu yeni öğe
  // yüksekliğinin katı olmuyor ve liste iki videonun arasında kalıyor.
  // `pagingEnabled` bunu kendiliğinden toparlamıyor: sonraki savurmalar
  // aynı sabit ofseti koruyor (ölçüldü 2026-08-31, yatayda ~%9,5 şerit).
  //
  // Bağımlılık YALNIZ listH: `active`ı da eklersek her video değişiminde
  // yeniden kaydırır ve akışı kilitler.
  // İKİ KARE BEKLETİLİYOR. Efekt doğrudan çalıştırıldığında FlashList yeni
  // yüksekliğe göre yeniden yerleşimi HENÜZ bitirmemiş oluyor ve kaydırma
  // eski düzene göre hesaplanıyor. Ölçüldü: yataya geçiş düzeliyordu ama
  // dikeye dönüşte liste yine iki videonun arasında kalıyordu.
  useEffect(() => {
    if (!listH || !items.length) return;
    let iptal = false;
    const kare1 = requestAnimationFrame(() => {
      const kare2 = requestAnimationFrame(() => {
        if (!iptal) listRef.current?.scrollToIndex?.({ index: active, animated: false });
      });
      if (iptal) cancelAnimationFrame(kare2);
    });
    return () => { iptal = true; cancelAnimationFrame(kare1); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listH]);
  // Üst çubuğun yatay paylarında kullanılıyor. Ekranın `landscape` durumundan
  // değil gerçek ölçüden okunuyor: kilit uygulanana kadar ikisi ayrışıyor ve
  // geçiş anında düğme yanlış yere sıçrardı.
  const isLandscape = winW > winH;

  // ── Sabit oynatıcı havuzu ───────────────────────────────────────────────
  const cfg = useCallback((p) => {
    p.loop = true;
    p.muted = false;
    p.bufferOptions = { preferredForwardBufferDuration: 5 };
  }, []);
  const p0 = useVideoPlayer(null, cfg);
  const p1 = useVideoPlayer(null, cfg);
  const p2 = useVideoPlayer(null, cfg);
  const players = useMemo(() => [p0, p1, p2], [p0, p1, p2]);

  // Yüklenen kaynakları takip et → aynı videoyu tekrar tekrar yükleme
  const loadedRef = useRef({});   // { poolIndex: hlsUrl }

  const load = useCallback(async (p) => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const data = await fetchVideoFeed(p, lang, seedRef.current);
      let fresh = data?.results || [];
      if (p === 1 && typeof start === 'string') {
        const selected = fresh.find(item => item.id === start) || await fetchVideo(start, lang).catch(() => null);
        if (selected) fresh = [selected, ...fresh.filter(item => item.id !== selected.id)];
      }
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...fresh.filter((x) => !seen.has(x.id))];
      });
      setHasMore(!!data?.hasMore);
      setPage(p);
    } catch {
      setHasMore(false);
    } finally {
      fetching.current = false;
      setLoading(false);
    }
  }, [lang, start]);

  useEffect(() => { load(1); }, [load]);

  // Sekmeye tekrar basmak: diğer sekmelerde listeyi başa sarıyor, BURADA
  // akışı yeniliyor. Tam ekran videoda "başa sar" zaten tek bir kaydırma
  // hareketi; asıl istenen şey yeni içerik görmek.
  //
  // Seed'i DEĞİŞTİRMEK şart: sunucu sırayı seed'e göre kuruyor, aynı seed'le
  // yeniden çekseydik birebir aynı videolar gelirdi.
  const refresh = useCallback(() => {
    if (fetching.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    seedRef.current = String(Date.now()) + Math.random().toString(36).slice(2, 8);
    loadedRef.current = {};          // havuzdaki kaynaklar artık geçersiz
    setItems([]);
    setActive(0);
    setPaused(false);
    setHolding(false);
    setHasMore(true);
    setLoading(true);
    listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
    load(1);
  }, [load]);

  useTabPressAction(refresh);

  // ── Aktif elemana göre havuzu yönet ─────────────────────────────────────
  // Aktif olanı oynat, komşusunu ÖN YÜKLE (duraklatılmış), uzağı durdur.
  useEffect(() => {
    if (items.length === 0) return;

    const assign = async (idx, shouldPlay) => {
      const item = items[idx];
      if (!item) return;
      const slot = idx % POOL;
      const player = players[slot];
      if (!player) return;

      if (loadedRef.current[slot] !== item.hls) {
        loadedRef.current[slot] = item.hls;
        try { await player.replaceAsync(item.hls); } catch { return; }
      }
      player.muted = muted;
      if (shouldPlay) player.play(); else player.pause();
    };

    // Odak yokken oynatma: kullanıcı başka sekmedeyken ses devam etmesin.
    // Elle duraklatma da burada: tek kaynak olduğu için efekt yeniden
    // çalıştığında kullanıcının kararını ezmiyor.
    assign(active, focused && !paused);
    assign(active + 1, false);   // sonraki hazır beklesin → geçiş anında donma olmaz
    assign(active - 1, false);

    // Havuz dışındaki her şey zaten farklı slota yazılınca serbest kalıyor
  }, [active, items, players, muted, focused, paused]);

  // Yeni videoya geçince duraklatma kalksın — kullanıcı kaydırdıysa
  // oynatmak istiyor demektir.
  useEffect(() => { setPaused(false); }, [active]);

  // Ekran SÖKÜLÜRSE sesi kes. Tek başına YETMİYOR: sekme değiştirmek ekranı
  // sökmez (tab'lerin amacı durumu korumaktır), o yüzden bu temizlik sekme
  // geçişinde hiç çalışmıyordu ve ses arka planda devam ediyordu.
  useEffect(() => () => { players.forEach((p) => { try { p.pause(); } catch {} }); }, [players]);

  // Doğru sinyal ODAK KAYBI. Sekmeden çıkınca ya da oyun detayına gidince
  // burası çalışıp sesi anında kesiyor; geri dönüldüğünde `focused` tekrar
  // true olduğu için yukarıdaki efekt videoyu kaldığı yerden sürdürüyor.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        // Durum güncellemesini beklemeden doğrudan durdur — sesin kesilmesi
        // bir sonraki render'a kalmasın.
        players.forEach((p) => { try { p.pause(); } catch {} });

        // Sekme çubuğunu MUTLAKA geri getir. Bu ekrandan tutma sırasında
        // çıkılırsa (ör. bildirime dokunma) çubuk uygulamanın tamamında
        // kalıcı olarak gizli kalırdı — kurtarılamaz bir durum.
        setHolding(false);
        uiOpacity.value = 1;
        if (tabHidden) tabHidden.value = 0;

        // Dikey moda MUTLAKA dön. Uygulamanın geri kalanı yatay tasarlanmadı;
        // bu ekrandan yatayken çıkılırsa kullanıcı bozuk bir arayüzde kalır ve
        // düzeltmek için buraya geri dönmesi gerekirdi.
        setLandscape(false);
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
          .catch(() => {});
      };
    }, [players, uiOpacity, tabHidden])
  );

  // Aktif video değişince zevk sinyali + görüldü kaydı
  useEffect(() => {
    const item = items[active];
    if (!item) return;
    recordSeen(item.id);
    if (item.genres?.length) recordSignal({ genres: item.genres, type: 'view' });
  }, [active, items]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const first = viewableItems?.[0];
    if (first && typeof first.index === 'number') setActive(first.index);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  const onEndReached = useCallback(() => {
    if (hasMore && !fetching.current) load(page + 1);
  }, [hasMore, page, load]);

  // Sabit referans — her render'da yeniden üretilseydi VideoItem'ın memo'su
  // hiç tutmaz ve kaydırma sırasında tüm görünür elemanlar yeniden çizilirdi.
  const onToggleMute = useCallback(() => {
    Haptics.selectionAsync();
    setMuted((m) => !m);
  }, []);

  // ── Duraklatma jestleri ─────────────────────────────────────────────────
  // Tek dokunuş: aç/kapat.  Basılı tutma: bırakana kadar duraklat.
  //
  // İkisi çakışmıyor çünkü React Native uzun basış tetiklendiğinde onPress'i
  // ÇAĞIRMIYOR. holdRef ise onPressOut'un hangi durumda çalıştığını ayırt
  // ediyor: tutmadan sonra bırakma devam ettirmeli, kısa dokunuştan sonraki
  // bırakma hiçbir şey yapmamalı (yoksa dokunuşla duraklatmak imkânsız olurdu).
  const holdRef = useRef(false);

  // Arayüz görünürlüğü AYRI bir kanal: paylaşılan değer, React state değil.
  // Böylece solma UI thread'inde çalışıyor ve her karede yeniden render
  // olmuyor. `paused`'dan da ayrı tutuluyor — tek dokunuşta video duruyor
  // ama arayüz KALMALI; yalnızca basılı tutmak onu gizliyor.
  const uiOpacity = useSharedValue(1);

  // Ekranin ust cubugu (baslik) de ayni kanaldan soluyor.
  const topBarStyle = useAnimatedStyle(() => ({ opacity: uiOpacity.value }), [uiOpacity]);

  const onTapVideo = useCallback(() => {
    Haptics.selectionAsync();
    setPaused((p) => !p);
  }, []);

  const onHoldStart = useCallback(() => {
    holdRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPaused(true);
    setHolding(true);
    uiOpacity.value = withTiming(0, { duration: motion.exit });
    if (tabHidden) tabHidden.value = withTiming(1, { duration: motion.exit });
  }, [uiOpacity, tabHidden]);

  const onHoldEnd = useCallback(() => {
    if (!holdRef.current) return;
    holdRef.current = false;
    setPaused(false);
    setHolding(false);
    uiOpacity.value = withTiming(1, { duration: motion.exit });
    if (tabHidden) tabHidden.value = withTiming(0, { duration: motion.exit });
  }, [uiOpacity, tabHidden]);

  // ── Yatay mod ───────────────────────────────────────────────────────────
  // Dönüş animasyonunu iOS'un KENDİSİ yapıyor; üstüne kendi animasyonumuzu
  // koymak sistemin geçişiyle çakışır ve titreme yaratır. Bizim animasyonumuz
  // yalnızca ikonun kendi dönüşü.
  //
  // Uygulama _layout'ta dikeye kilitli; burada geçici olarak açıyoruz.
  const [landscape, setLandscape] = useState(false);

  const toggleOrientation = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next = !landscape;
    setLandscape(next);
    try {
      await ScreenOrientation.lockAsync(
        next
          ? ScreenOrientation.OrientationLock.LANDSCAPE
          : ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    } catch { setLandscape(!next); }   // kilitlenemedi → durumu geri al
  }, [landscape]);

  // SEKME ÇUBUĞU YATAYDA DA DURUYOR.
  //
  // Bir süre gizlenmişti (sürükleyici izleme kipi gerekçesiyle). Geri alındı:
  // çubuk yokken videodan çıkmanın TEK yolu önce dikeye dönmek oluyordu —
  // yani her çıkış iki adım. Kazanılan birkaç piksel, her seferinde ödenen o
  // bedelin yanında değersiz.
  //
  // Şerit çubuğun ÜSTÜNE alındı (railBottom), ikisi çakışmıyor.

  const renderItem = useCallback(({ item, index }) => (
    <VideoItem
      item={item}
      height={itemH}
      width={winW}
      isActive={index === active}
      player={players[index % POOL]}
      muted={muted}
      onToggleMute={onToggleMute}
      // Duraklatma yalnızca aktif elemanı ilgilendiriyor; diğerlerine
      // `false` geçmek memo'nun boşuna kırılmasını da önlüyor.
      paused={index === active && paused}
      // Tutarken oynat simgesi gösterilmiyor
      holding={index === active && holding}
      uiOpacity={uiOpacity}
      onTapVideo={onTapVideo}
      onHoldStart={onHoldStart}
      onHoldEnd={onHoldEnd}
      router={router}
      t={t}
    />
  ), [active, players, itemH, muted, onToggleMute, paused, holding, uiOpacity, onTapVideo, onHoldStart, onHoldEnd, router, t]);

  if (loading && items.length === 0) {
    return (
      <View style={[styles.loadingRoot, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.text2} size="large" />
        <Txt variant="footnote" style={[styles.loadingText, { color: colors.text2 }]}>{t('vid.loading')}</Txt>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* `pagingEnabled` KALIYOR — sorun onda değildi.
          Android'in native sayfalaması kaydırma alanının yüksekliğinin
          katlarına oturur ve bu yol sağlam. Tek eksik, ÖĞENİN de tam o
          yüksekte olmasıydı; `onLayout` ölçümü artık bunu garanti ediyor.

          `snapToInterval` + `disableIntervalMomentum` denendi ve GERİ ALINDI:
          yatayda kısa savurmalarda liste iki videonun arasında duruyordu
          (ölçüldü 2026-08-31, Android 16 emülatör). */}
      <FlashList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onLayout={onListLayout}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        decelerationRate="fast"
      />

      {/* Üst çubuk — başlık + döndürme düğmesi.
          Geri butonu YOK: bu artık bir sekme, geri dönülecek bir yer yok. */}
      {/* KONUMLANDIRMA SARMALAYICIDA olmak zorunda. Daha önce yalnızca
          opacity taşıyordu; sarmalayıcı flex:1 olan listeden SONRA akışta
          yer aldığı için sıfır yükseklikte bir kutu olarak ekranın altına
          düşüyordu ve içindeki mutlak konumlu çubuk ona göre hizalanıp
          görünmez oluyordu. */}
      <Animated.View style={[styles.topBarWrap, topBarStyle]} pointerEvents="box-none">
      <SafeAreaView
        edges={['top']}
        style={[styles.topBar, isLandscape && { paddingTop: LANDSCAPE_TOP_PAD }]}
        pointerEvents="box-none"
      >
        {/* Yatay/dikey geçişi — başlık ORTADA kalsın diye mutlak konumlu.
            top AÇIKÇA insets.top: mutlak konumlu çocuk ebeveynin paddingTop'unu
            yok saydığı için, bu satır olmadan düğme güvenli alanı da kapsayan
            aralıkta ortalanıyor ve yarısı durum çubuğuna giriyordu. Orada iOS
            "başa sar" hareketini tetikliyor, dokunuş düğmeye hiç ulaşmıyordu.

            Yatayda insets.top 0'a düşüyor: düğmenin üst kenarı ekranın tam
            tepesine değiyor, sağdan da köşe kavisinin içinde kalıyordu.
            LANDSCAPE_TOP_PAD ikisine de uygulanıyor — çubuğa padding, düğmeye
            aynı sayı — böylece düğme köşeden kurtulurken başlıkla hizası
            bozulmuyor. Sağ pay ayrıca kavisi geçecek kadar açılıyor. */}
        <View
          style={[styles.topRight, {
            top: insets.top + (isLandscape ? LANDSCAPE_TOP_PAD : 0),
            right: spacing.md + insets.right + (isLandscape ? LANDSCAPE_SIDE_PAD : 0),
          }]}
        >
          <RotateGlowButton
            active={landscape}
            onPress={toggleOrientation}
            accessibilityLabel={landscape ? t('vid.portrait') : t('vid.landscape')}
          />
        </View>
        {/* Geri düğmesi sağdaki döndürme düğmesiyle AYNI paylarda: yatayda
            köşe kavisinden kurtulmak için aynı LANDSCAPE_* sayıları. */}
        <View style={{
          position: 'absolute',
          top: insets.top + (isLandscape ? LANDSCAPE_TOP_PAD : 0),
          left: spacing.md + insets.left + (isLandscape ? LANDSCAPE_SIDE_PAD : 0),
        }}>
          {/* 2.0 görsel üstü cam düğme (G-15 oynatıcı kalıbı). Bulanıklık yok:
              altında sürekli değişen video var (plan §6.1). */}
          <IconButton icon="back" variant="onArt" blurred={false} label={t('common.back')} onPress={() => router.back()} />
        </View>
        <View style={styles.titleWrap}>
          <Txt variant="cardTitle" style={{ color: ART.white }}>{t('vid.title')}</Txt>
        </View>
      </SafeAreaView>
      </Animated.View>
    </View>
  );
}

// ─── Tek video elemanı ──────────────────────────────────────────────────────
//
// memo ŞART: `renderItem` aktif index'e bağlı olduğu için her kaydırmada
// yeniden üretiliyor ve FlashList tüm görünür elemanlar için çağırıyordu.
// memo sayesinde yalnızca `isActive` DEĞİŞEN iki eleman (eski aktif ve yeni
// aktif) gerçekten yeniden render oluyor; diğerlerinin propları aynı kaldığı
// için atlanıyorlar. Bunun çalışması için onToggleMute'un sabit referans
// olması gerekiyor — yukarıda useCallback ile sabitlendi.
const VideoItem = memo(function VideoItem({
  item, height, width, isActive, player, muted, onToggleMute,
  paused, holding, uiOpacity, onTapVideo, onHoldStart, onHoldEnd, router, t,
}) {
  const styles = useStyles(makeStyles);
  // Basılı tutunca kenardaki her şey soluyor, yalnızca video kalıyor.
  // Karartma gradyanı da dahil — o da bir arayüz katmanı ve kalsaydı
  // görüntünün alt/üstünü kirletirdi.
  const uiStyle = useAnimatedStyle(() => ({ opacity: uiOpacity?.value ?? 1 }), [uiOpacity]);

  // ── Yatay mod ──
  // Portre için ölçülmüş sabitler yatayda taşıyordu: sağ sütun alta 194pt ile
  // bağlıydı ve kendi yüksekliği ~315pt'ydi, toplam 509pt. Yatayda ekran
  // yüksekliği 402pt — sütunun tepesi ekran dışına çıkıyordu.
  //
  // Yön, prop olarak gelen gerçek ölçüden okunuyor; ekranın `landscape`
  // durumundan DEĞİL. O durum kilit isteğini temsil ediyor, yerleşimin o an
  // gerçekte ne olduğunu değil (kilit uygulanana kadar ikisi ayrışıyor).
  const isLandscape = width > height;

  // Yatayda çentik SOLA (ya da sağa) geçiyor ve yatay güvenli alan doğuyor.
  // Bloklar `left: 16` / `right: 12` ile sabitti; oyun adının ilk harfleri
  // sensör yuvasının altında kalıp kırpılıyordu. Dikeyde bu insetler 0, yani
  // ekleme dikey görünümü değiştirmiyor.
  const itemInsets = useSafeAreaInsets();
  // Dikey kaplamalar sekme çubuğunun üstünde duruyor; çubuğun yüksekliği
  // alt inset'e bağlı, sabit sayı üç düğmeli gezinmede kısa kalıyordu.
  const tabBosluk = itemInsets.bottom + spacing.s12;

  // Daireler ve boşluk küçülünce sütun 315 → ~254pt: 402'lik ekrana rahat
  // sığıyor, üstelik video için ortada daha çok yer kalıyor.
  // ŞERİT YATAYDA YATAY OLUYOR.
  //
  // Ölçüm: dikey şerit 5 düğme × ~62pt = 310pt. Yatayda ekran yüksekliği
  // 402pt ve şerit alttan 94pt yukarıdan başlıyordu → 404pt gerekiyordu,
  // 2pt taşıyordu ve üstteki düğmeler kırpılıyordu. Dikey bir sütunu dar
  // kenara sığdırmaya çalışmak yanlış yöndü; geniş ekranın yönü yatay.
  const railGap = isLandscape ? 14 : 17;
  // Yatayda şerit sekme çubuğunun ÜSTÜNDE duruyor: çubuk 58pt + güvenli alan,
  // üstüne 12pt nefes payı. Aksi hâlde yatay şerit çubuğun altında kalıyordu.
  const railBottom = isLandscape
    ? itemInsets.bottom + spacing.s12
    : tabBosluk + 90;
  const infoBottom = isLandscape ? 80 : tabBosluk + 6;
  const { isWatched, toggle } = useWishlist();
  const { account } = useAuth();
  const collections = useCollections();
  const inCollections = useCollectionsContaining(item);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const watched = isWatched(item);

  // Aktiflik değişince poster durumunu sıfırla — geri dönüldüğünde
  // hazır olmayan videoda siyah ekran görünmesin
  useEffect(() => { if (!isActive) setReady(false); }, [isActive]);

  // Video hazır olunca posteri kaldır.
  // Anlık durumu ÖNCE kontrol etmek şart: komşu olarak ön yüklenmiş bir video
  // aktif hâle geldiğinde çoktan 'readyToPlay' olmuş olabilir ve statusChange
  // bir daha tetiklenmez — sadece olaya güvenilirse poster kalıcı olarak kalırdı.
  useEffect(() => {
    if (!isActive || !player) return;

    try { if (player.status === 'readyToPlay') setReady(true); } catch {}

    let sub;
    try {
      sub = player.addListener('statusChange', ({ status }) => {
        if (status === 'readyToPlay') setReady(true);
      });
    } catch { /* olay desteklenmiyorsa poster kalır, video yine oynar */ }

    return () => { try { sub?.remove(); } catch {} };
  }, [isActive, player]);

  // İstek listesi ve koleksiyonlar profil arkasında (Profil ekranındaki
  // kilitle aynı kural). Hesapsız kullanıcı burada dokunduğunda sessizce
  // hiçbir şey olmamalı değil — kayıt ekranına götürüyoruz, yoksa düğme
  // bozuk görünür. Aynı gerekçe: bu veriler hesaba kaydediliyor, hesapsız
  // eklenen kayıt ilk oturum kapanışında kaybolurdu.
  const requireAccount = useCallback(() => {
    if (account) return false;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    router.push('/account');
    return true;
  }, [account, router]);

  const onWishlist = useCallback(() => {
    if (requireAccount()) return;
    const willAdd = !watched;
    Haptics.impactAsync(willAdd ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    toggle({ id: item.id, name: item.name, image: item.image, appid: item.appid, hasSteam: true, slug: '' });
    if (willAdd && item.genres?.length) recordSignal({ genres: item.genres, type: 'wishlist' });
    if (willAdd) {
      reportActivity({
        type: 'wishlist', gameId: item.id, gameName: item.name || '', gameImage: item.image || '',
      });
    }
  }, [requireAccount, watched, toggle, item]);

  const onBuy = useCallback(() => {
    Haptics.selectionAsync();
    if (item.steamUrl) WebBrowser.openBrowserAsync(item.steamUrl);
  }, [item]);

  const openDetail = useCallback(() => {
    router.push({
      pathname: '/game/[id]',
      params: { id: item.id, appid: item.appid, name: item.name, image: item.image },
    });
  }, [router, item]);

  return (
    <View style={[styles.item, { height, width }]}>
      {/* Poster — video hazır olana kadar; siyah flaşı önler */}
      {(!isActive || !ready) && (
        <Image
          source={item.image}
          cachePolicy="memory-disk"
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={motion.image}
        />
      )}

      {isActive && player ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          fullscreenOptions={TAM_EKRAN_KAPALI}
        />
      ) : null}

      {/* Okunabilirlik için alt/üst karartma.
          Basılı tutunca bu da soluyor: metin kalmadığında karartmanın işlevi
          bitiyor ve görüntünün üstünde gereksiz bir perde bırakıyor. */}
      <Animated.View style={[StyleSheet.absoluteFill, uiStyle]} pointerEvents="none">
        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'transparent', 'transparent', 'rgba(0,0,0,0.88)']}
          locations={[0, 0.22, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Dokunma katmanı — tek dokunuş duraklatır/sürdürür, basılı tutmak
          bırakana kadar duraklatır.
          SIRALAMA ÖNEMLİ: bu katman aksiyon sütunundan ve bilgi çubuğundan
          ÖNCE geliyor, yani onlar üstte kalıyor ve kendi dokunuşlarını
          almaya devam ediyor. Sonra gelseydi tüm arayüzü yutardı. */}
      {isActive ? (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onTapVideo}
          onLongPress={onHoldStart}
          onPressOut={onHoldEnd}
          delayLongPress={220}
          accessibilityRole="button"
          accessibilityLabel={paused ? t('vid.play') : t('vid.pause')}
        />
      ) : null}

      {/* Duraklatma göstergesi — kullanıcı videonun durduğunu görmeli,
          yoksa donmuş sanır. pointerEvents kapalı ki dokunmayı yutmasın.
          TUTARKEN GÖSTERİLMİYOR: parmak ekrandayken zaten duraklattığını
          biliyor, simge yalnızca temiz görüntüyü bozardı. */}
      {isActive && paused && !holding ? (
        <View style={styles.pauseWrap} pointerEvents="none">
          <PlayButton size={K.playButton.sizes[2]} blurred={false} />
        </View>
      ) : null}

      {/* Sağ aksiyon sütunu */}
      <Animated.View
        style={[
          styles.actions,
          isLandscape && styles.actionsLandscape,
          { bottom: railBottom, gap: railGap, right: 12 + itemInsets.right },
          isLandscape && { left: 12 + itemInsets.left },
          uiStyle,
        ]}
        pointerEvents={holding ? 'none' : 'auto'}
      >
        <ActionBtn
          compact={isLandscape}
          icon="bell"
          active={watched}
          label={t('vid.follow')}
          onPress={onWishlist}
        />
        <ActionBtn
          compact={isLandscape}
          icon="bookmark"
          active={inCollections.size > 0}
          label={t('vid.save')}
          onPress={() => { if (requireAccount()) return; Haptics.selectionAsync(); setPickerOpen(true); }}
        />
        <ActionBtn compact={isLandscape} icon="bag" label={t('vid.buy')} onPress={onBuy} />
        {/* Arkadasa gonder. Hesap sart: gonderim arkadaslik gerektiriyor,
            arkadaslik da hesap gerektiriyor. */}
        <ActionBtn
          compact={isLandscape}
          icon="send"
          label={t('vid.share')}
          onPress={() => { if (requireAccount()) return; Haptics.selectionAsync(); setShareOpen(true); }}
        />
        <ActionBtn
          compact={isLandscape}
          icon={muted ? 'mute' : 'volume'}
          label={muted ? t('vid.unmute') : t('vid.mute')}
          onPress={onToggleMute}
        />
      </Animated.View>

      {/* Alt bilgi */}
      <Animated.View
        style={[
          styles.info,
          {
            bottom: infoBottom,
            left: spacing.lg + itemInsets.left,
            // Sağ pay sütunun gerçek genişliğine göre: yatayda daireler
            // küçüldüğü için 84 gereğinden fazla yer harcıyordu.
            right: (isLandscape ? 70 : 84) + itemInsets.right,
          },
          uiStyle,
        ]}
        pointerEvents={holding ? 'none' : 'auto'}
      >
      <Pressable onPress={openDetail}>
        <Txt variant="cardTitle" numberOfLines={2} style={{ color: ART.white }}>{item.name}</Txt>
        {item.genres?.length > 0 && (
          <View style={styles.tags}>
            {item.genres.map((g) => (
              <OverlayTag key={g} label={g} placement="inline" />
            ))}
          </View>
        )}
        <View style={styles.detailHint}>
          <Txt variant="footnoteMedium" style={{ color: ART.onArt }}>{t('vid.detail')}</Txt>
          <Icon name="chev" size={K.reels.hintIcon} color={ART.onArt} />
        </View>
      </Pressable>
      </Animated.View>

      <CollectionPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        collections={collections}
        selectedIds={inCollections}
        game={{ name: item.name }}
        onToggle={(colId) => toggleGameInCollection(colId, {
          id: item.id, name: item.name, image: item.image, appid: item.appid, hasSteam: true, slug: '',
        })}
        onCreate={(nm) => createCollection(nm)}
      />
      <ShareToFriendSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        appid={item.appid}
        gameName={item.name}
      />
    </View>
  );
});

// compact: yatay modda daire 44 → 34, ikon 22 → 17. Dokunma hedefi hitSlop 6
// ile birlikte 46pt kalıyor, yani HIG'in 44pt asgarisinin ALTINA DÜŞMÜYOR —
// küçülen şey görsel ağırlık, dokunulabilirlik değil. 34'ün altına inilirse
// hitSlop artırılmadan 44pt korunamaz.
//
// 2.0: daire görsel üstü cam (IconButton `onArt` ile aynı yüzey, bulanıklıksız —
// liste öğesi, plan §6.1). IconButton'ın KENDİSİ DEĞİL: etiket de dokunma
// alanının parçası kalmalı (eskisi gibi), iç içe düğme olmasın diye yüzey
// doğrudan GlassView. Etkin durum kitin istek/beğeni dili: ikon kırmızı, dolu.
function ActionBtn({ icon, label, active, onPress, compact }) {
  const styles = useStyles(makeStyles);
  return (
    <PressableScale style={styles.actionBtn} onPress={onPress} hitSlop={6}
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!active }}>
      <GlassView blurred={false} style={[styles.actionCircle, compact && styles.actionCircleCompact]}>
        <Icon
          name={icon}
          size={compact ? K.reels.actionIconCompact : C.iconButtonGlyph}
          color={active ? ART.red : ART.white}
          fill={active ? ART.red : 'none'}
        />
      </GlassView>
      <Txt variant="caption2Strong" style={{ color: ART.white }}>{label}</Txt>
    </PressableScale>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  // Duraklatma göstergesi — ortada, yarı saydam daire
  pauseWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  // tema-bagimsiz: tam ekran video oynatici; zemin videonun kendisi, tema yuzeyi degil
  root: { flex: 1, backgroundColor: '#000' },
  loadingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: space[12] },

  // tema-bagimsiz: tam ekran video oynatici; zemin videonun kendisi, tema yuzeyi degil
  item: { backgroundColor: '#000' },

  // Dondurme dugmesi akista degil: baslik ortada kalsin
  // Mutlak konum SARMALAYICIDA; içerideki çubuk artık normal akışta.
  topBarWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3 },
  topRight: { position: 'absolute', right: spacing.md, top: 0, bottom: 0, justifyContent: 'center', zIndex: 2 },
  topBar: {
    // Geri butonu kalkınca tek çocuk kaldı; space-between sola yaslıyordu
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  // Maket ust cubugu 15 / 700 — video ustunde sessiz. 2.0 karsiligi cardTitle 15/20.
  // Maket olcusu: ray 35 genislikte, eylemler arasi 20, sag kenardan 20.
  // Bizde sag 12 / ara 17 idi — ikisi de olcek disi ve makete gore sikisik.
  actions: { position: 'absolute', right: spacing.s20, alignItems: 'center', gap: spacing.s20 },
  // Yatayda satır: sağa yaslı, alt kenarda. `left` de veriliyor ki uzun
  // etiketlerde satır ekranın dışına taşmasın, sıkışsın.
  actionsLandscape: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  actionBtn: { alignItems: 'center', gap: space[4] },
  actionCircle: {
    width: C.iconButton, height: C.iconButton, borderRadius: C.iconButton / 2,
    alignItems: 'center', justifyContent: 'center',
  },
  actionCircleCompact: { width: K.reels.actionCompact, height: K.reels.actionCompact, borderRadius: K.reels.actionCompact / 2 },

  info: { position: 'absolute', left: spacing.lg, right: 84 },
  // Maket: alt bilgi blogunda ad 15 / 600 (2.0 cardTitle). Maket videoyu one
  // cikariyor, ustundeki metni degil. Turler 2.0 gorsel ustu etiketi (OverlayTag).
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space[6], marginTop: space[8] },
  detailHint: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[12] },
});
