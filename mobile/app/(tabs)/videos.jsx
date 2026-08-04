// ─────────────────────────────────────────────────────────────────────────────
// Oyun videoları — dikey, tam ekran, Reels tarzı akış.  [BETA]
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
  View, Text, Pressable, StyleSheet, ActivityIndicator, useWindowDimensions, Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { fetchVideoFeed } from '../../src/api/videoFeed';
import { useTabPressAction } from '../../src/hooks/useTabPressAction';
import { useTabBarHidden } from '../../src/context/TabBarContext';
import { useWishlist } from '../../src/context/WishlistContext';
import { useAuth } from '../../src/context/AuthContext';
import { useCollections, useCollectionsContaining } from '../../src/hooks/useCollections';
import { toggleGameInCollection, createCollection } from '../../src/services/collectionsStore';
import CollectionPicker from '../../src/components/CollectionPicker';
import RotateGlowButton from '../../src/components/RotateGlowButton';
import { recordSignal } from '../../src/services/tasteProfile';
import { reportActivity } from '../../src/api/social';
import { recordSeen } from '../../src/services/seenStore';
import { colors, radius, spacing, PRESSED, TAB_SPACE, type } from '../../src/theme';
import { useLanguage } from '../../src/context/LanguageContext';

const POOL = 3;

// Yatayda ekranın köşe kavisinden kaçmak için üst çubuğa verilen paylar.
// Dikeyde gerek yok: orada güvenli alan (~59pt) zaten bu işi görüyor.
const LANDSCAPE_TOP_PAD = 14;
const LANDSCAPE_SIDE_PAD = 22;

export default function VideosScreen() {
  const router = useRouter();
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

  // Tam ekran eleman ölçüleri — paging bunun tam katlarına oturur.
  //
  // useWindowDimensions ŞART: eskiden modül düzeyinde Dimensions.get('window')
  // vardı ve döndürmede GÜNCELLENMİYORDU. Yatay moda geçince eleman yüksekliği
  // hâlâ dikey ekranın yüksekliği olurdu; sayfalama tamamen bozulurdu.
  const { width: winW, height: winH } = useWindowDimensions();
  const itemH = winH;
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
      const fresh = data?.results || [];
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
  }, [lang]);

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

  // Ekranin ust cubugu (BETA rozeti) de ayni kanaldan soluyor.
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
    uiOpacity.value = withTiming(0, { duration: 160 });
    if (tabHidden) tabHidden.value = withTiming(1, { duration: 160 });
  }, [uiOpacity, tabHidden]);

  const onHoldEnd = useCallback(() => {
    if (!holdRef.current) return;
    holdRef.current = false;
    setPaused(false);
    setHolding(false);
    uiOpacity.value = withTiming(1, { duration: 160 });
    if (tabHidden) tabHidden.value = withTiming(0, { duration: 160 });
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
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loadingText}>{t('vid.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlashList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        decelerationRate="fast"
      />

      {/* Üst çubuk — BETA rozeti.
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
        <View style={styles.titleWrap}>
          <Text style={styles.topTitle}>{t('vid.title')}</Text>
          <View style={styles.betaBadge}><Text style={styles.betaText}>BETA</Text></View>
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

  // Daireler ve boşluk küçülünce sütun 315 → ~254pt: 402'lik ekrana rahat
  // sığıyor, üstelik video için ortada daha çok yer kalıyor.
  const railGap = isLandscape ? 10 : 17;
  const railBottom = isLandscape ? 94 : TAB_SPACE + 90;
  const infoBottom = isLandscape ? 80 : TAB_SPACE + 6;
  const { isWatched, toggle } = useWishlist();
  const { account } = useAuth();
  const collections = useCollections();
  const inCollections = useCollectionsContaining(item.id);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const watched = isWatched(item.id);

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
          transition={150}
        />
      )}

      {isActive && player ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          allowsFullscreen={false}
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
          <View style={styles.pauseBadge}>
            <Ionicons name="play" size={34} color="#fff" />
          </View>
        </View>
      ) : null}

      {/* Sağ aksiyon sütunu */}
      <Animated.View
        style={[styles.actions, { bottom: railBottom, gap: railGap, right: 12 + itemInsets.right }, uiStyle]}
        pointerEvents={holding ? 'none' : 'auto'}
      >
        <ActionBtn
          compact={isLandscape}
          icon={watched ? 'notifications' : 'notifications-outline'}
          active={watched}
          label={t('vid.follow')}
          onPress={onWishlist}
        />
        <ActionBtn
          compact={isLandscape}
          icon={inCollections.size > 0 ? 'albums' : 'albums-outline'}
          active={inCollections.size > 0}
          label={t('vid.save')}
          onPress={() => { if (requireAccount()) return; Haptics.selectionAsync(); setPickerOpen(true); }}
        />
        <ActionBtn compact={isLandscape} icon="cart-outline" label={t('vid.buy')} onPress={onBuy} />
        <ActionBtn
          compact={isLandscape}
          icon={muted ? 'volume-mute' : 'volume-high'}
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
        <Text numberOfLines={2} style={styles.name}>{item.name}</Text>
        {item.genres?.length > 0 && (
          <View style={styles.tags}>
            {item.genres.map((g) => (
              <View key={g} style={styles.tag}><Text style={styles.tagText}>{g}</Text></View>
            ))}
          </View>
        )}
        <View style={styles.detailHint}>
          <Text style={styles.detailHintText}>{t('vid.detail')}</Text>
          <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.75)" />
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
    </View>
  );
});

// compact: yatay modda daire 47 → 38, ikon 23 → 19. Dokunma hedefi hitSlop 6
// ile birlikte 50pt kalıyor, yani HIG'in 44pt asgarisinin altına düşmüyor —
// küçülen şey görsel ağırlık, dokunulabilirlik değil.
function ActionBtn({ icon, label, active, onPress, compact }) {
  return (
    <Pressable style={({ pressed }) => [styles.actionBtn, pressed && PRESSED]} onPress={onPress} hitSlop={6}>
      <View style={[
        styles.actionCircle,
        compact && styles.actionCircleCompact,
        active && styles.actionCircleOn,
      ]}>
        {/* Aktif yüzey açık olduğu için ikon koyuya dönüyor — oyun
            detayındaki iconBtnActive ile aynı karar. */}
        <Ionicons name={icon} size={compact ? 19 : 23} color={active ? colors.bg : '#fff'} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Duraklatma göstergesi — ortada, yarı saydam daire
  pauseWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  pauseBadge: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  root: { flex: 1, backgroundColor: '#000' },
  loadingRoot: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.text2, fontSize: type.footnote, marginTop: 12 },

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
  topTitle: { color: '#fff', fontSize: type.body, fontWeight: '900', letterSpacing: -0.2 },
  betaBadge: {
    paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: radius.sm,
    backgroundColor: colors.accent,
  },
  betaText: { color: '#fff', fontSize: type.caption2, fontWeight: '900', letterSpacing: 0.6 },
  actions: { position: 'absolute', right: 12, alignItems: 'center', gap: 17 },
  actionBtn: { alignItems: 'center', gap: 5 },
  actionCircle: {
    width: 47, height: 47, borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
  },
  actionCircleCompact: { width: 38, height: 38, borderRadius: 19 },
  // "Takip"/"Kaydet" acikken: dolu notr yuzey. Video uzerinde durdugu icin
  // acik yuzey her sahnede okunur; vurgu rengi burada durum degil dikkat
  // cekiyordu.
  actionCircleOn: { backgroundColor: colors.text, borderColor: colors.text },
  actionLabel: { color: '#fff', fontSize: type.caption2, fontWeight: '700' },

  info: { position: 'absolute', left: spacing.lg, right: 84 },
  name: { color: '#fff', fontSize: type.title3, fontWeight: '900', letterSpacing: -0.4, lineHeight: 26 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  tag: {
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  tagText: { color: '#fff', fontSize: type.caption2, fontWeight: '700' },
  detailHint: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 11 },
  detailHintText: { color: 'rgba(255,255,255,0.75)', fontSize: type.footnote, fontWeight: '600' },
});
