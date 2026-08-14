// ─────────────────────────────────────────────────────────────────────────────
// İncelemeler — kullanıcı içeriğinin kendi sayfası.
//
// OYUN SAYFALARINDA DEĞİL, BURADA. Oyun sayfaları uygulamanın kendi verdiği
// bilgiyi göstermeye devam ediyor (Steam'in toplu analizi). Sebebi terk
// edilmişlik riski: kullanıcı sayısı azken her oyunun altında "0 inceleme"
// görmek, uygulamanın ölü olduğunu söyler. Seyrek kullanıcı içeriği, hiç
// içerik olmamasından kötüdür.
//
// AYNI RİSK BU SAYFA İÇİN DE GEÇERLİ, o yüzden sayfa bir "akış" olarak
// kurulmadı: ÜSTTE yazabileceğin oyunlar var ve Steam'i bağlı bir kullanıcıda
// o liste ilk günden dolu. Sayfa "kimse bir şey yazmamış" yerine "şunlar
// hakkında yazabilirsin" diye açılıyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { getReviewFeed, getEligibleGames, fetchPosts } from '../../src/api/social';
import { getSession, subscribeSession } from '../../src/services/session';
import ReviewComposer from '../../src/components/ReviewComposer';
import ReviewCard from '../../src/components/ReviewCard';
import PostCard from '../../src/components/PostCard';
import PostComposer from '../../src/components/PostComposer';
import ReportSheet from '../../src/components/ReportSheet';
import { colors, radius, spacing, type, PRESSED, NUMERIC, TAB_SPACE } from '../../src/theme';
import { useLanguage } from '../../src/context/LanguageContext';

// Sunucunun sayfa boyutu (listFeed / listRecentReviews / listUserReviews
// hepsi limit=20). "Devamı var mı" kararı bu sayıya bakıyor, o yüzden
// sunucuyla AYNI kalmak zorunda.
const PAGE = 20;

/** Liste anahtarı — gönderi ve inceleme farklı kimliklendiriliyor. */
function itemKey(x) {
  return x?.id != null ? `p:${x.id}` : `r:${x.appid}:${x.uid}`;
}

export default function ReviewsScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();

  const [session, setSession] = useState(() => getSession());
  useEffect(() => subscribeSession(() => setSession(getSession())), []);

  const [eligible, setEligible] = useState(null);
  // Sayfanın ASIL işi artık tartışma; incelemeler ikinci sekmede duruyor.
  const [tab, setTab] = useState('talk');   // talk | community | mine
  // TEK LİSTE, sekme başına ayrı değil: aynı anda yalnızca biri görünüyor ve
  // sekme değişiminde zaten yeniden çekiliyor. İki ayrı dizi tutmak, hangi
  // sayfanın hangi sekmeye ait olduğunu takip etmeyi de gerektirirdi.
  const [items, setItems] = useState(null);   // null = ilk yükleme
  const [composing, setComposing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [composer, setComposer] = useState(null); // { appid, name, existing }
  const [reportTarget, setReportTarget] = useState(null);

  const listRef = useRef(null);
  // seq = YARIŞ MÜHRÜ. Sekme, ağ isteği uçarken değişebiliyor; mühür
  // olmadan eski sekmenin yanıtı yeni sekmenin listesinin üstüne yazardı.
  const page = useRef({ offset: 0, canMore: true, fetching: false, tab: 'talk', seq: 0 });

  // Sekmeye göre doğru ucu çağıran TEK yer — load ve loadMore aynı
  // dönüşümü kullanmak zorunda, yoksa ikinci sayfa başka bir sorgu olurdu.
  const fetchPage = useCallback(async (t, offset) => {
    if (t === 'talk') {
      const r = await fetchPosts(offset).catch(() => null);
      return r?.posts || [];
    }
    const r = await getReviewFeed(!!session && t === 'mine', offset).catch(() => null);
    return r?.reviews || [];
  }, [session]);

  // Topluluk akışı HESAPSIZ okunur — inceleme okumak kayıt gerektirmiyor.
  // Oturumsuzken "yazabileceğin oyunlar" sorulmuyor: o uç jetonlu ve
  // hesapsız kullanıcının zaten yazamayacağı bir liste.
  const load = useCallback(async (isRefresh = false) => {
    const p = page.current;
    const seq = ++p.seq;
    p.offset = 0; p.canMore = true; p.fetching = true; p.tab = tab;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [rows, e] = await Promise.all([
        fetchPage(tab, 0),
        tab !== 'talk' && session ? getEligibleGames().catch(() => null) : Promise.resolve(null),
      ]);
      if (seq !== p.seq) return;   // sekme değişti — bu yanıt artık geçersiz
      setItems(rows);
      if (tab !== 'talk') setEligible(e);
      p.offset = rows.length;
      // TAM SAYFA GELDİYSE devamı olabilir. Eksik geldiyse liste bitmiştir;
      // yoksa her son sayfadan sonra bir boş istek daha atılırdı.
      p.canMore = rows.length >= PAGE;
    } finally {
      if (seq === p.seq) {
        p.fetching = false;
        setLoading(false);
        setRefreshing(false);
        // loadingMore BURADA da sıfırlanıyor: sekme, loadMore uçarken
        // değişirse o çağrı mühür yüzünden erken dönüyor ve kendi
        // göstergesini kapatamıyor. Kapatan tek yer bu.
        setLoadingMore(false);
      }
    }
  }, [tab, session, fetchPage]);

  useEffect(() => { load(); }, [load]);

  const loadMore = useCallback(async () => {
    const p = page.current;
    if (p.fetching || !p.canMore || loading) return;
    const seq = p.seq;
    p.fetching = true;
    setLoadingMore(true);
    try {
      const rows = await fetchPage(p.tab, p.offset);
      if (seq !== p.seq) return;
      if (rows.length) {
        setItems((prev) => {
          // TEKİLLEŞTİRME ŞART: iki sayfa arasında yeni bir gönderi
          // eklenirse liste kayar ve aynı kayıt iki sayfada birden döner.
          // Aynı anahtarlı iki öğe FlashList'te uyarı ve bozuk geri
          // dönüşüm demek.
          const seen = new Set((prev || []).map(itemKey));
          return [...(prev || []), ...rows.filter((r) => !seen.has(itemKey(r)))];
        });
        p.offset += rows.length;
      }
      if (rows.length < PAGE) p.canMore = false;
    } finally {
      if (seq === p.seq) {
        p.fetching = false;
        setLoadingMore(false);
      }
    }
  }, [loading, fetchPage]);

  // Sekme değişince listeyi başa sar: FlashList içeriği değiştirse de
  // kaydırma konumunu koruyor, yeni sekme ortasından açılıyordu.
  useEffect(() => { listRef.current?.scrollToOffset?.({ offset: 0, animated: false }); }, [tab]);

  // Yazma denemesi oturum ister; hata vermek yerine kayıt ekranına götürüyoruz.
  // PostCard/PostComposer bu fonksiyonun "engelledim mi" bilgisini bekliyor:
  // true dönerse çağıran eylemi iptal ediyor.
  const requireAccount = useCallback(() => {
    if (session) return false;
    router.push('/account');
    return true;
  }, [session, router]);

  const keyExtractor = useCallback((item) => itemKey(item), []);

  const renderItem = useCallback(({ item }) => (
    tab === 'talk' ? (
      <PostCard post={item} onRequireAccount={requireAccount} compact />
    ) : (
      <ReviewCard
        review={item}
        onPress={() => router.push({
          pathname: '/game/[id]',
          params: { id: `rawg_${item.appid}`, appid: item.appid, name: item.gameName || '', image: item.image },
        })}
        onLongPress={() => setReportTarget(item)}
        onEdit={tab === 'mine'
          ? () => setComposer({ appid: item.appid, name: item.gameName, existing: item })
          : undefined}
      />
    )
  ), [tab, requireAccount, router]);

  // Başlık BİLEŞEN DEĞİL, ELEMENT olarak veriliyor. Yerel bir bileşen
  // tanımlansaydı her render'da yeni bir tip olurdu ve FlashList başlığı
  // yeniden monte ederdi — yatay şeridin kaydırma konumu her seferinde
  // sıfırlanırdı.
  const header = (
    <View>
      {/* ── Yazabileceğin oyunlar ──
          Sayfanın boş görünmemesini sağlayan kısım. Steam bağlıysa ilk
          günden dolu; topluluk akışı boş olsa bile sayfa ölü durmuyor. */}
      {tab !== 'talk' && eligible?.games?.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>{t('rev.canWrite')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.strip}
          >
            {eligible.games.map((g) => (
              <Pressable
                key={g.appid}
                style={({ pressed }) => [styles.gameCard, pressed && PRESSED]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setComposer({ appid: g.appid, name: g.name, existing: null });
                }}
              >
                <Image source={g.image} style={styles.gameImg} contentFit="cover" transition={140} />
                <Text style={styles.gameName} numberOfLines={2}>{g.name}</Text>
                <Text style={[styles.gameHours, NUMERIC]}>
                  {Math.round(g.hours)}{lang === 'tr' ? ' saat' : ' h'}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      {tab !== 'talk' && eligible?.games?.length === 0 && (
        <Text style={styles.hint}>{t('rev.noEligible')}</Text>
      )}

      {/* ── Topluluk / Benimkiler ──
          Hesapsız kullanıcı topluluğu okuyabiliyor ama "Benimkiler"in
          karşılığı yok; sekmeyi gizlemek yerine kayıt ekranına götürüyoruz
          — özelliğin varlığını göstermek, yokmuş gibi yapmaktan iyi. */}
      <View style={styles.tabs}>
        {['talk', 'community', 'mine'].map((k) => (
          <Pressable
            key={k}
            style={({ pressed }) => [styles.tab, tab === k && styles.tabOn, pressed && PRESSED]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              if (k === 'mine' && !session) { requireAccount(); return; }
              setTab(k);
            }}
          >
            <Text style={[styles.tabText, tab === k && styles.tabTextOn]}>
              {k === 'talk' ? t('rev.talk') : k === 'community' ? t('rev.community') : t('rev.mine')}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Yazma çağrısı akışın ÜSTÜNDE: sayfanın işi konuşmak, bunu
          söylemenin yeri en görünür nokta. */}
      {tab === 'talk' && (
        <Pressable
          onPress={() => { if (!requireAccount()) setComposing(true); }}
          style={({ pressed }) => [styles.composeBar, pressed && PRESSED]}
        >
          <Ionicons name="create-outline" size={17} color={colors.text3} />
          <Text style={styles.composeText}>{t('post.hint')}</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header t={t} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <FlashList
          ref={listRef}
          data={items || []}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          // extraData: renderItem sekmeye göre FARKLI kart çiziyor. Sekme
          // değişince veri de değiştiği için pratikte yeniden çiziliyor ama
          // bunu veriye bağlı bırakmak sessiz bir varsayım olurdu.
          extraData={tab}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <Text style={styles.hint}>
              {tab === 'talk'
                ? t('post.feedEmpty')
                : tab === 'mine'
                  ? t('rev.mineEmpty')
                  : (session ? t('rev.communityEmpty') : t('rev.communityEmptyGuest'))}
            </Text>
          }
          ListFooterComponent={
            <View style={{ height: TAB_SPACE, alignItems: 'center', paddingTop: 12 }}>
              {loadingMore ? <ActivityIndicator color={colors.accent} /> : null}
            </View>
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.text2} />
          }
        />
      )}

      <PostComposer
        visible={composing}
        onClose={() => setComposing(false)}
        onPosted={() => load(true)}
      />

      <ReviewComposer
        visible={!!composer}
        onClose={() => setComposer(null)}
        appid={composer?.appid}
        gameName={composer?.name}
        existing={composer?.existing}
        onSaved={() => { setComposer(null); load(); }}
      />

      <ReportSheet
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        targetType="review"
        targetId={reportTarget ? `${reportTarget.appid}:${reportTarget.uid}` : ''}
      />
    </SafeAreaView>
  );
}

// Geri düğmesi YOK: burası artık bir sekme, dönülecek önceki ekran yok.
// Başlık da büyüdü (title3 → title1), üst düzey ekranların dili bu.
function Header({ t }) {
  return (
    <View style={styles.head}>
      <Text style={styles.h1}>{t('rev.section')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  composeBar: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    marginHorizontal: spacing.lg, marginTop: 4, marginBottom: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: colors.card, borderRadius: 999,
  },
  composeText: { color: colors.text3, fontSize: type.footnote },

  safe:   { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  head: { paddingHorizontal: spacing.lg, paddingTop: 8, paddingBottom: spacing.md },
  h1: { color: colors.text, fontSize: type.title1, fontWeight: '800', letterSpacing: -0.6 },

  sectionLabel: {
    color: colors.text3, fontSize: type.caption, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 1,
    paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  strip: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.lg },
  gameCard: { width: 132 },
  gameImg:  { width: 132, height: 62, borderRadius: radius.sm, backgroundColor: colors.bgInput },
  gameName: { color: colors.text, fontSize: type.caption, fontWeight: '700', marginTop: 5 },
  gameHours:{ color: colors.text3, fontSize: type.caption2, marginTop: 1 },

  hint: {
    color: colors.text3, fontSize: type.footnote, textAlign: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
  },

  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  tab: {
    flex: 1, minHeight: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  tabOn:      { backgroundColor: colors.bgInput, borderColor: colors.borderHover },
  tabText:    { color: colors.text3, fontSize: type.footnote, fontWeight: '700' },
  tabTextOn:  { color: colors.text },


});
