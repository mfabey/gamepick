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
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { getReviewFeed, getEligibleGames, fetchPosts, getFriends } from '../../src/api/social';
import { getSession, subscribeSession } from '../../src/services/session';
import ReviewComposer from '../../src/components/ReviewComposer';
import ReviewCard from '../../src/components/ReviewCard';
import EmptyState from '../../src/components/EmptyState';
import PostCard from '../../src/components/PostCard';
import PostComposer from '../../src/components/PostComposer';
import ReportSheet from '../../src/components/ReportSheet';
import { FeedSkeleton, Reveal } from '../../src/components/Skeleton';
import { colors, radius, spacing, type, PRESSED, NUMERIC, TAB_SPACE, motion } from '../../src/theme';
import { useLanguage } from '../../src/context/LanguageContext';
import { useTimeToData } from '../../src/dev/perf';

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
  // Bekleyen arkadaşlık isteği sayısı — başlıktaki rozet için.
  // OTURUM YOKSA İSTEK ATILMIYOR: /api/social/friend jetonlu, hesapsız
  // kullanıcıda 401 döner ve boşuna bir ağ turu olurdu.
  const [incoming, setIncoming] = useState(0);
  useEffect(() => {
    if (!session) { setIncoming(0); return; }
    let alive = true;
    getFriends()
      .then((r) => { if (alive) setIncoming(Array.isArray(r?.incoming) ? r.incoming.length : 0); })
      .catch(() => {});
    return () => { alive = false; };
  }, [session]);
  useTimeToData('Community', !loading);

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

  // ─────────────────────────────────────────────────────────────────────────
  // BOŞ DURUM — üç sekmenin üçü de ölü uçtu: tek satır gri yazı, çıkış yok.
  //
  // Çıkış sekmeye göre DEĞİŞİYOR çünkü engelleyen şey her sekmede farklı:
  //   tartışma → yazacak bir şey yok, engel yok       → doğrudan yaz
  //   oturumsuz → engel hesap                          → hesaba git
  //   oturumlu  → engel bağlı mağaza / oynanmış oyun   → profile git
  //
  // Uygun oyun VARSA düğme konmuyor: yazılabilecek oyunların şeridi zaten
  // hemen üstte duruyor, "inceleme yaz" düğmesi kullanıcıyı oraya geri
  // döndürmekten başka bir şey yapmazdı.
  // ─────────────────────────────────────────────────────────────────────────
  const bosDurum = useMemo(() => {
    if (tab === 'talk') return {
      icon: 'chatbubbles-outline',
      title: t('post.feedEmpty'),
      text: t('post.feedEmptyDesc'),
      actionLabel: t('post.newTitle'),
      onAction: () => { if (!requireAccount()) setComposing(true); },
    };
    if (!session) return {
      icon: 'person-circle-outline',
      title: t('rev.communityEmpty'),
      text: t('rev.communityEmptyGuest'),
      actionLabel: t('acc.goSignIn'),
      onAction: () => router.push('/account'),
    };
    const yazabilir = (eligible?.games?.length || 0) > 0;
    return {
      icon: yazabilir ? 'create-outline' : 'logo-steam',
      title: tab === 'mine' ? t('rev.mineEmpty') : t('rev.communityEmpty'),
      text: yazabilir
        ? (tab === 'mine' ? t('rev.mineEmptyDesc') : t('rev.communityEmptyDesc'))
        : t('rev.noEligible'),
      actionLabel: yazabilir ? undefined : t('sf.goProfile'),
      onAction: yazabilir ? undefined : () => router.push('/(tabs)/profile'),
    };
  }, [tab, session, eligible, t, requireAccount, router]);

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
                <Image source={g.image} style={styles.gameImg} contentFit="cover" transition={motion.image} />
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
      <Header t={t} router={router} incoming={incoming} />

      {loading ? (
        // Dönen çark DEĞİL. Ölçüldü: bu ekran 645ms boyunca ortada tek bir
        // çarktan ibaretti — akışın nasıl bir şey olduğuna dair hiçbir ipucu
        // vermeden. İskelet aynı süreyi düzenin kendisini göstererek geçiriyor.
        <FeedSkeleton />
      ) : (
        <Reveal style={{ flex: 1 }}>
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
          ListEmptyComponent={<EmptyState compact {...bosDurum} />}
          ListFooterComponent={
            <View style={{ height: TAB_SPACE, alignItems: 'center', paddingTop: spacing.md }}>
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
        </Reveal>
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
//
// SAĞDAKİ KISAYOL — "iki topluluk" sorununun bağı.
// Bu ekran İÇERİK (gönderi, inceleme); /social ise KİŞİ (arkadaşlar,
// istekler). İkisi de "topluluk" gibi okunuyordu ama birbirinden habersizdi:
// içerik sekmedeyken kişiler Profil'in altında 2 derinlikte duruyordu.
// İçerik ebeveyn oluyor, kişiler oradan ulaşılan yer.
//
// ROZET BURADA OLMAK ZORUNDA: bekleyen arkadaşlık isteği yalnızca Profil'de
// görünüyordu. Kullanıcı Topluluk'ta gezerken kendisine gelen isteği
// göremiyordu — bildirimi, ilgili olduğu yerde göstermek gerekiyor.
function Header({ t, router, incoming }) {
  return (
    <View style={styles.head}>
      <Text style={styles.h1}>{t('rev.section')}</Text>
      <Pressable
        onPress={() => router.push('/social')}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('soc.title')}
        style={({ pressed }) => [styles.friendsBtn, pressed && PRESSED]}
      >
        <Ionicons name="people-outline" size={22} color={colors.text2} />
        {incoming > 0 ? (
          <View style={styles.headBadge}>
            <Text style={[styles.headBadgeText, NUMERIC]}>{incoming > 9 ? '9+' : incoming}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  composeBar: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    marginHorizontal: spacing.lg, marginTop: spacing.xs, marginBottom: 10,
    paddingHorizontal: 14, paddingVertical: spacing.md,
    backgroundColor: colors.card, borderRadius: 999,
  },
  composeText: { color: colors.text3, fontSize: type.footnote },

  safe:   { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  // flex:1 + shrink:0 — büyük yazı tipinde başlık sarınca kısayolu ezmesin
  // (anasayfa bölüm başlığında ölçülen kırılmanın aynısı).
  h1: { flex: 1, color: colors.text, fontSize: type.title1, fontWeight: '800', letterSpacing: -0.6 },
  friendsBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headBadge: {
    position: 'absolute', top: 6, right: 4,
    minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: spacing.s4,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.bg,
  },
  headBadgeText: { color: '#fff', fontSize: type.caption2, fontWeight: '800' },

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
