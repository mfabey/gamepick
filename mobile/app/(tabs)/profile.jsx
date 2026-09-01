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
import { spacing, type, radius, PRESSED, TOUCH_MIN } from '../../src/theme';
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
import { useTabPressAction, scrollRefToTop } from '../../src/hooks/useTabPressAction';
import { weeklyReport } from '../../src/services/stats';

import ProfileHeader from '../../src/components/ProfileHeader';
import ProfileTabs from '../../src/components/ProfileTabs';
import CoverCell, { coverWidth, GRID_COLS, GRID_GAP } from '../../src/components/CoverGrid';
import ProfileReviewRow from '../../src/components/ProfileReviewRow';
import PostCard from '../../src/components/PostCard';
import EmptyState from '../../src/components/EmptyState';

// Sunucunun sayfa boyutu (`/api/social/profile` PAGE). "Devamı var mı" kararı
// bu sayıya bakıyor, o yüzden sunucuyla AYNI kalmak zorunda.
const PAGE = 20;

/** Uzak sekmeler ağdan, yerel sekmeler cihazdan besleniyor. */
const UZAK = new Set(['reviews', 'posts']);

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

  const { account } = useAuth();
  const { items: wishlist } = useWishlist();
  const collections = useCollections();
  const { steamGames, xboxGames } = useConnectedLibrary();
  const gameCount = steamGames.length + xboxGames.length;

  const [sunucu, setSunucu] = useState(null);      // { profile, friendship, canView }
  const [yok, setYok] = useState(false);           // kullanıcı adı kurulmamış
  const [tab, setTab] = useState('collection');
  const [uzak, setUzak] = useState({ items: [], hasMore: false, offset: 0 });
  const [yukleniyor, setYukleniyor] = useState(true);
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
    if (tazele) setTazeleniyor(true); else setYukleniyor(true);
    try {
      const r = await getUserProfile(uzakMi ? { tab: hedefTab, offset: 0 } : {});
      setSunucu(r);
      basligiAldik.current = true;
      setYok(false);
      if (uzakMi) {
        const list = r?.items || [];
        setUzak({ items: list, hasMore: !!r.hasMore, offset: list.length });
      }
    } catch (e) {
      // 404 = kullanıcı adı henüz kurulmamış. Hata DEĞİL, bir sonraki adım:
      // sosyal kimlik kurulmadan profilin gösterecek bir şeyi yok.
      if (e?.status === 404) setYok(true);
    } finally {
      setYukleniyor(false);
      setTazeleniyor(false);
    }
  }, []);

  useEffect(() => {
    if (!account) { setSunucu(null); basligiAldik.current = false; setYukleniyor(false); return; }
    // Koleksiyon ve istek listesi CİHAZDAN geliyor; başlık da yüklüyse bu
    // sekmeye geçmek tek bir ağ turu bile gerektirmiyor.
    if (!UZAK.has(tab) && basligiAldik.current) { setYukleniyor(false); return; }
    yukle(tab);
  }, [account, tab, yukle]);

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
  // Oyun sayısı YERELDEN: sunucudaki değer yalnız senkronda tazeleniyor
  // (bkz. /api/user/data) ve kendi profilimde beklemesi için sebep yok.
  const sayaclar = useMemo(() => ({
    posts: sunucu?.profile?.counts?.posts || 0,
    friends: sunucu?.profile?.counts?.friends || 0,
    games: gameCount || sunucu?.profile?.counts?.games || 0,
    collection: yerelKoleksiyon.length,
    wishlist: yerelIstek.length,
    reviews: sunucu?.profile?.counts?.reviews || 0,
  }), [sunucu, gameCount, yerelKoleksiyon.length, yerelIstek.length]);

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
    const sunucudaki = sunucu?.profile?.counts?.games;
    if (!account || !sunucu?.profile || gameCount <= 0) return;
    if (gameCount === sunucudaki || gameCount === yazilanSayi.current) return;
    yazilanSayi.current = gameCount;
    getValidToken()
      .then((tok) => (tok ? pushGameCount(tok, gameCount) : null))
      .catch(() => { yazilanSayi.current = null; });   // sonraki açılışta yeniden dene
  }, [account, sunucu, gameCount]);

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
              olduğunu seçemiyordu. */}
          <Pressable style={({ pressed }) => [styles.gateBtn, pressed && PRESSED]}
                     onPress={() => router.push('/account')}>
            <Text style={styles.gateBtnText}>{t('acc.signIn')}</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.gateBtn2, pressed && PRESSED]}
                     onPress={() => router.push('/account')}>
            <Text style={styles.gateBtn2Text}>{t('acc.signUp')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const izgara = tab === 'collection' || tab === 'wishlist';
  const veri = tab === 'collection' ? yerelKoleksiyon
    : tab === 'wishlist' ? yerelIstek
    : uzak.items;

  // IZGARA SATIR SATIR ÇİZİLİYOR, FlashList'in numColumns'u ile değil:
  // numColumns sütun genişliğini eşit bölüyor ve maketin 4pt boşluğu ile
  // 114pt kapağı aynı anda tutturulamıyor (kapak ya sütuna yayılıp boşluğu
  // yutuyor ya da sağ kenar tırtıklı kalıyor). Satır bir View, boşluk `gap`.
  const kapakEn = coverWidth(width);

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
    const govde = izgara ? bol(veri, GRID_COLS) : veri;
    if (govde.length === 0) return [{ __serit: true }, { __bos: true }];
    return [{ __serit: true }, ...govde];
  }, [izgara, veri]);

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
        extraData={tab}
        estimatedItemSize={izgara ? Math.round((kapakEn * 4) / 3) + GRID_GAP : 140}
        ListHeaderComponent={(
          <View>
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
          <RefreshControl refreshing={tazeleniyor} onRefresh={() => yukle(tab, { tazele: true })}
                          tintColor={colors.text2} />
        )}
      />
    </SafeAreaView>
  );
}

// REAKTİF STİL: tema değişince yeniden üretiliyor (bkz. ThemeContext).
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
