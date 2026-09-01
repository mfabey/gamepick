// ─────────────────────────────────────────────────────────────────────────────
// Topluluk — tek akış, iki sekme.
//
// ÜÇ SEKMEDEN İKİYE. Önceki yapı "Tartışma / Topluluk / Benimkiler" idi:
//   · İlk ikisi aynı soruyu (bugün ne konuşuluyor) iki içerik türüyle
//     cevaplıyordu ve kullanıcıyı tür seçmeye zorluyordu — okuyan kişi
//     "gönderi mi inceleme mi okuyayım" diye düşünmez.
//   · "Benimkiler" artık PROFİLDE (üçüncü ve dördüncü sekme). Aynı listeyi
//     iki yerde tutmak hangisinin güncel olduğunu belirsizleştiriyordu.
//
// Yerine: KEŞFET (herkes) ve ARKADAŞLAR. Keşfet gönderi ile incelemeyi
// birlikte gösteriyor — gerekçesi fetchPage'de.
//
// TERK EDİLMİŞLİK RİSKİ bu sayfanın kurucu kaygısı ve değişmedi: kullanıcı
// sayısı azken boş bir akış "burası ölü" der. O yüzden sayfa hâlâ bir akış
// olarak DEĞİL, bir davetle açılıyor — üstte yazabileceğin oyunlar şeridi
// duruyor ve Steam'i bağlı bir kullanıcıda o liste ilk günden dolu.
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
import { radius, spacing, type, PRESSED, NUMERIC, TOUCH_MIN, motion, SECTION_TITLE, CHIP_TEXT_ON } from '../../src/theme';
import { useTabBosluk } from '../../src/hooks/useAltBosluk';
import { useStyles, useTheme } from '../../src/context/ThemeContext';
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
  const styles = useStyles(makeStyles);
  const tabBosluk = useTabBosluk();
  const { colors } = useTheme();
  const router = useRouter();
  const { t, lang } = useLanguage();

  const [session, setSession] = useState(() => getSession());
  useEffect(() => subscribeSession(() => setSession(getSession())), []);

  const [eligible, setEligible] = useState(null);
  // Ağ bozuk mu — 'kimse yazmamış'tan AYRI durum (Faz 5).
  const [bozuk, setBozuk] = useState(false);
  // Sayfanın ASIL işi artık tartışma; incelemeler ikinci sekmede duruyor.
  const [tab, setTab] = useState('discover');   // discover | friends
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
  const page = useRef({ offset: 0, canMore: true, fetching: false, tab: 'discover', seq: 0 });

  // Sekmeye göre doğru ucu çağıran TEK yer — load ve loadMore aynı
  // dönüşümü kullanmak zorunda, yoksa ikinci sayfa başka bir sorgu olurdu.
  // FAZ 5, KIRILMA #2 — BOŞ İLE BOZUK AYRILDI.
  // `.catch(() => null)` sonra `r?.posts || []` boş diziye dönüyordu ve
  // ekran "kimse yazmamış" gösteriyordu. Terk edilmişlik riskine karşı
  // kurulmuş bir sayfada bağlantı hatası tam olarak "burası ölü" mesajı
  // veriyor — kaçınılmak istenen şeyin ta kendisi.
  //
  // Artık HATA `null`, GERÇEK BOŞLUK `[]`. İkisi ayrı cümle kuruyor.
  const fetchPage = useCallback(async (t, offset) => {
    if (t === 'friends') {
      const r = await fetchPosts(offset, 'friends').catch(() => null);
      return r?.posts || (r ? [] : null);
    }

    // ── KEŞFET: GÖNDERİ + İNCELEME BİRLİKTE ──
    // Handoff akışı X gibi, yani yalnız gönderi tarif ediyor. Buradaki sapma
    // bu dosyanın kendi ölçümüne dayanıyor (bkz. dosya başı): kullanıcı sayısı
    // azken tek başına gönderi akışı boş kalıyor ve boş akış "burası ölü"
    // diyor. İnceleme, uygulamanın ilk günden içeriği olan tek türü.
    //
    // İkisi AYRI uçlardan sayfalanıyor ve aynı offset ile isteniyor; sınırdaki
    // sıralama kusurlu olabilir (bir sayfanın sonundaki inceleme, sonraki
    // sayfanın gönderisinden yeni çıkabilir). Tek listeye taşımanın bedeli
    // sunucuda birleşik bir dizin; içerik hacmi onu haklı çıkarana kadar bu
    // yeterli.
    const [p, r] = await Promise.all([
      fetchPosts(offset).catch(() => null),
      getReviewFeed(false, offset).catch(() => null),
    ]);
    if (p === null && r === null) return null;           // ikisi de düştü → bozuk
    const birlesik = [...(p?.posts || []), ...(r?.reviews || [])];
    birlesik.sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0));
    return birlesik;
  }, []);

  // Topluluk akışı HESAPSIZ okunur — inceleme okumak kayıt gerektirmiyor.
  // Oturumsuzken "yazabileceğin oyunlar" sorulmuyor: o uç jetonlu ve
  // hesapsız kullanıcının zaten yazamayacağı bir liste.
  const load = useCallback(async (isRefresh = false) => {
    const p = page.current;
    const seq = ++p.seq;
    // SEKME DEĞİŞTİYSE ESKİ LİSTE ANINDA DÜŞÜYOR.
    // Simülatörde yakalandı: ağ hatasında listeyi korumak doğru, ama
    // korunan liste ÖNCEKİ SEKMEDEN kalıyordu ve renderItem onu yeni
    // sekmenin kart tipiyle çiziyordu — gönderiler inceleme kartı olarak,
    // "NaN saat" yazarak. Aynı sekmenin bayat verisi bilgi; başka sekmenin
    // verisi çöp.
    if (p.tab !== tab) setItems(null);
    p.offset = 0; p.canMore = true; p.fetching = true; p.tab = tab;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [rows, e] = await Promise.all([
        fetchPage(tab, 0),
        // FAZ 5, KIRILMA #1: koşul `tab !== 'talk'` idi ve VARSAYILAN SEKME
        // 'talk'. Dosyanın kendi başlığı sayfanın "şunlar hakkında
        // yazabilirsin" diye açıldığını söylüyordu; kullanıcı ise daveti
        // GÖRMEDİĞİ yerden giriyordu. Artık üç sekmede de çekiliyor.
        session ? getEligibleGames().catch(() => null) : Promise.resolve(null),
      ]);
      if (seq !== p.seq) return;   // sekme değişti — bu yanıt artık geçersiz
      // `null` = ağ hatası. Liste SİLİNMİYOR: önceki içerik duruyor ve
      // bandın altında görünmeye devam ediyor.
      setBozuk(rows === null);
      if (rows !== null) setItems(rows);
      setEligible(e);
      p.offset = rows?.length || 0;
      // TAM SAYFA GELDİYSE devamı olabilir. Eksik geldiyse liste bitmiştir;
      // yoksa her son sayfadan sonra bir boş istek daha atılırdı.
      p.canMore = (rows?.length || 0) >= PAGE;
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
      // Sonsuz kaydırmada da sessizce "liste bitti" demiyoruz.
      if (rows === null) { setBozuk(true); p.canMore = false; return; }
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
    // ARKADAŞ AKIŞI iki sebeple boş olabilir ve ikisi AYNI CÜMLEYİ kurmamalı:
    // ya oturum yok (çözüm: giriş), ya arkadaş yok / yazmamışlar (çözüm:
    // birini bul). Tek bir "boş" metni ikisini de yanlış anlatırdı.
    if (tab === 'friends') {
      if (!session) return {
        icon: 'person-circle-outline',
        title: t('post.friendsEmpty'),
        text: t('rev.communityEmptyGuest'),
        actionLabel: t('acc.goSignIn'),
        onAction: () => router.push('/account'),
      };
      return {
        icon: 'people-outline',
        title: t('post.friendsEmpty'),
        text: t('post.friendsEmptyDesc'),
        actionLabel: t('soc.tabFriends'),
        onAction: () => router.push('/friends'),
      };
    }
    return {
      icon: 'chatbubbles-outline',
      title: t('post.feedEmpty'),
      text: t('post.feedEmptyDesc'),
      actionLabel: t('post.newTitle'),
      onAction: () => { if (!requireAccount()) setComposing(true); },
    };
  }, [tab, session, t, requireAccount, router]);

  const keyExtractor = useCallback((item) => itemKey(item), []);

  // TÜR SEKMEDEN DEĞİL ÖĞEDEN OKUNUYOR: "Keşfet" tek listede gönderi ve
  // inceleme taşıyor. Sekmeye bakarak karar vermek, karışık listede her
  // incelemeyi gönderi kartı olarak çizerdi (bu ekranda bir kez yaşandı —
  // bkz. load()'daki "başka sekmenin verisi çöp" notu).
  const renderItem = useCallback(({ item }) => (
    item.id != null ? (
      <PostCard post={item} onRequireAccount={requireAccount} compact />
    ) : (
      <ReviewCard
        review={item}
        onPress={() => router.push({
          pathname: '/game/[id]',
          params: { id: `rawg_${item.appid}`, appid: item.appid, name: item.gameName || '', image: item.image },
        })}
        onLongPress={() => setReportTarget(item)}
      />
    )
  ), [requireAccount, router]);

  // Başlık BİLEŞEN DEĞİL, ELEMENT olarak veriliyor. Yerel bir bileşen
  // tanımlansaydı her render'da yeni bir tip olurdu ve FlashList başlığı
  // yeniden monte ederdi — yatay şeridin kaydırma konumu her seferinde
  // sıfırlanırdı.
  const header = (
    <View>
      {/* ── Yazabileceğin oyunlar ──
          Sayfanın boş görünmemesini sağlayan kısım. Steam bağlıysa ilk
          günden dolu; topluluk akışı boş olsa bile sayfa ölü durmuyor. */}
      {eligible?.games?.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>{t('rev.canWriteAbout')}</Text>
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

      {eligible?.games?.length === 0 && (
        <Text style={styles.hint}>{t('rev.noEligible')}</Text>
      )}

      {/* ── İki akış sekmesi ──
          ÜÇTEN İKİYE indi. "Benimkiler" kalktı: kullanıcının kendi gönderileri
          ve incelemeleri artık PROFİLİNİN sekmelerinde ve aynı listeyi iki
          yerde tutmak, hangisinin güncel olduğunu belirsizleştiriyordu.
          "Tartışma" ile "Topluluk" da tek akışta birleşti — ikisi de aynı
          soruyu (bugün ne konuşuluyor) farklı içerik türüyle cevaplıyordu.

          METİN ETİKETİ KULLANILIYOR, ikon değil: iki etiket var ve
          "Entdecken / Freunde" Almanca'da bile rahat sığıyor. (Profil
          sekmeleri dört tane olduğu için oradaki karar ikondu.) */}
      <View style={styles.tabs}>
        {['discover', 'friends'].map((k) => (
          <Pressable
            key={k}
            style={({ pressed }) => [styles.tab, tab === k && styles.tabOn, pressed && PRESSED]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setTab(k);
            }}
          >
            <Text style={[styles.tabText, tab === k && styles.tabTextOn]}>
              {k === 'discover' ? t('post.tabDiscover') : t('post.tabFriends')}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Yazma çağrısı akışın ÜSTÜNDE ve HER SEKMEDE: sayfanın işi konuşmak,
          bunu söylemenin yeri en görünür nokta. Öncesinde yalnız bir sekmede
          duruyordu, yani öteki sekmedeki kullanıcı yazma yolunu görmüyordu. */}
      <Pressable
        onPress={() => { if (!requireAccount()) setComposing(true); }}
        style={({ pressed }) => [styles.composeBar, pressed && PRESSED]}
      >
        <Ionicons name="create-outline" size={17} color={colors.text3} />
        <Text style={styles.composeText}>{t('post.hint')}</Text>
      </Pressable>

      {/* BOZUK AKIŞ — davet şeridinin ve yazma çubuğunun ALTINDA.
          Sıra bilinçli: hata okumayı engelliyor, YAZMAYI değil. Sayfa
          hâlâ bir şey teklif ediyor, ölü durmuyor. */}
      {bozuk ? (
        <View style={styles.bozukBant}>
          <Text style={styles.bozukBaslik}>{t('rev.degraded')}</Text>
          <Text style={styles.bozukMetin}>{t('rev.degradedDesc')}</Text>
          <Pressable onPress={() => load()} hitSlop={8} style={({ pressed }) => [styles.bozukEylem, pressed && PRESSED]}>
            <Text style={styles.bozukEylemText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
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
          // BOZUKSA "kimse yazmamış" DEMİYORUZ. Bant üç şey söylüyor: ne
          // oldu, ne çalışmıyor, ne yapabilirsin. Davet şeridi ve yazma
          // çubuğu YUKARIDA ayakta kalıyor — ikisi de yerel veriden geliyor,
          // yani sayfa hâlâ bir şey teklif ediyor, ölü durmuyor.
          //
          // Bant `header` İÇİNDE (aşağıda), boş bileşende değil: aynı sekmenin
          // bayat listesi korunduğunda liste boş olmuyor ve bant hiç
          // çizilmiyordu. İKİNCİ bir ListHeaderComponent propu da olmaz —
          // simülatörde görüldü: JSX'te son prop kazanıyor ve gerçek başlığı
          // (davet şeridi + sekmeler) tamamen siliyordu.
          ListEmptyComponent={bozuk ? null : <EmptyState compact {...bosDurum} />}
          ListFooterComponent={
            <View style={{ height: tabBosluk, alignItems: 'center', paddingTop: spacing.md }}>
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
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.head}>
      <Text style={styles.h1}>{t('rev.section')}</Text>
      <Pressable
        onPress={() => router.push('/friends')}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('soc.title')}
        style={({ pressed }) => [styles.friendsBtn, pressed && PRESSED]}
      >
        {/* MAKETTEN: cip degil, ETIKETLI hap. Olculdu — 121x36, r99,
            surface3 dolgu, dolgu 4/12/4/4, ara 8; icinde 28pt yuvarlak
            bir yuva, ardindan 13/600 etiket, sagda rozet.
            Oncesinde ciplak bir kisi simgesiydi; "Arkadaslar"a gittigi
            bicimden okunmuyordu. */}
        <View style={styles.friendsIcon}>
          <Ionicons name="people" size={16} color={colors.text2} />
        </View>
        <Text style={styles.friendsLabel}>{t('soc.title')}</Text>
        {incoming > 0 ? (
          <View style={styles.headBadge}>
            <Text style={[styles.headBadgeText, NUMERIC]}>{incoming > 9 ? '9+' : incoming}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  composeBar: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    marginHorizontal: spacing.s20, marginTop: spacing.xs, marginBottom: spacing.s12,
    paddingHorizontal: 14, paddingVertical: spacing.md,
    backgroundColor: colors.card, borderRadius: 999,
  },
  composeText: { color: colors.text3, fontSize: type.footnote },

  safe:   { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.s20, paddingTop: spacing.s8, paddingBottom: spacing.s16,
  },
  // flex:1 + shrink:0 — büyük yazı tipinde başlık sarınca kısayolu ezmesin
  // (anasayfa bölüm başlığında ölçülen kırılmanın aynısı).
  // Maket: ekran basligi 28 / 700 / -0.28.
  h1: { flex: 1, color: colors.text, fontSize: type.title1, fontWeight: '700', letterSpacing: -0.28 },
  // Maket: 121x36, r99, surface3, dolgu 4/12/4/4, ara 8.
  friendsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s8,
    height: 36, borderRadius: radius.pill, backgroundColor: colors.bgInput,
    paddingLeft: spacing.s4, paddingRight: spacing.s12,
    flexShrink: 0,
  },
  // Maketteki 28pt yuvarlak yuva (orada avatar; bizde simge).
  friendsIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.bgHover,
    alignItems: 'center', justifyContent: 'center',
  },
  friendsLabel: { ...CHIP_TEXT_ON, color: colors.text2 },
  // Maket: 22x22, r99, marka dolgusu, 2px ZEMIN renginde halka (rozet
  // hapin kenarina binerken kesintisiz gorunsun), metin 11/700 beyaz.
  headBadge: {
    position: 'absolute', top: -4, right: -6,
    minWidth: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accentFillStrong,
  },
  headBadgeText: { color: '#fff', fontSize: type.caption2, fontWeight: '800' },

  sectionLabel: {
    ...SECTION_TITLE, color: colors.text2,
    paddingHorizontal: spacing.s20, marginBottom: spacing.sm,
  },
  strip: { paddingHorizontal: spacing.s20, gap: spacing.sm, paddingBottom: spacing.lg },
  // FAZ 5: 132 → 148 (Faz 0 adımı). Medya 148×70 KAPSÜL kalıyor —
  // bu bir oyun kapağı değil Steam kapsülü, 3/4 oranı burada geçerli değil.
  gameCard: { width: 148 },
  gameImg:  { width: 148, height: 70, borderRadius: radius.sm, backgroundColor: colors.bgInput },
  gameName: { color: colors.text, fontSize: type.caption, fontWeight: '700', marginTop: 5 },
  gameHours:{ color: colors.text3, fontSize: type.caption2, marginTop: 1 },

  hint: {
    color: colors.text3, fontSize: type.footnote, textAlign: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
  },

  // ── SEGMENT: MAKETTEN ──
  // Maket segmenti bir KAP olarak ciziyor (350x40, r12, surface2, dolgu 4,
  // ara 4) ve secili sekme kabin ICINDE r8'lik dolu bir kutu. Bizde uc ayri
  // kutu yan yanaydi ve her birinin kendi kenarligi vardi; kap olmayinca
  // "bunlar birbirinin alternatifi" bilgisi bicimden okunmuyordu.
  // ── SEKMELER: DOLU HAP DEĞİL ALT ÇİZGİ ──
  // Üç sekmeliyken seçili sekme `colors.text` dolgulu bir hapti. Profil dört
  // ikonlu şeride geçince uygulamada AYNI İŞİN İKİ DİLİ oldu: bir ekranda
  // dolu hap, ötekinde 2pt alt çizgi. Akış sekmeleri profil şeridiyle
  // hizalandı — seçim bir DURUM, dolu dikdörtgen ise eylem diliydi.
  tabs: {
    flexDirection: 'row', gap: spacing.s24,
    paddingHorizontal: spacing.s20, marginBottom: spacing.s12,
  },
  tab: {
    minHeight: TOUCH_MIN, justifyContent: 'center',
    // Alt çizgi metnin altına oturuyor; dolgu yok, kutu yok.
    paddingBottom: spacing.s8,
  },
  // Aktif dolgu surface4 (maket: rgb(42,44,51)) — kabin bir tik ustu.
  // FAZ 5 — SEÇİMİN ÜÇÜNCÜ LEHÇESİ KALKTI. Burada seçili sekme
  // `surfaceTile` idi ve seçili/seçilmemiş farkı 1.24:1 — neredeyse
  // görünmüyordu. Oyunlar ve Filtreler'de aynı jest `colors.text` dolgu +
  // koyu metin. Şekil (flex dikdörtgen, radius.md) korunuyor; değişen
  // yalnız dil.
  // FAZ 5 — BOZUK AKIŞ BANDI. Kırmızı yok: durum bir eylem değil.
  bozukBant: {
    marginHorizontal: spacing.s20, marginTop: spacing.s16,
    padding: spacing.s16, borderRadius: radius.md,
    backgroundColor: colors.bgInput, gap: spacing.s4,
  },
  bozukBaslik: { color: colors.text, fontSize: type.subhead, fontWeight: '700' },
  bozukMetin: { color: colors.text2, fontSize: type.footnote, lineHeight: 19 },
  bozukEylem: { minHeight: TOUCH_MIN, justifyContent: 'center', alignSelf: 'flex-start' },
  bozukEylemText: { color: colors.accentText, fontSize: type.subhead, fontWeight: '700' },

  // Profil şeridiyle aynı işaret: 2pt çizgi (ProfileTabs.underline).
  // accent-serbest: AKTİF DURUM İŞARETİ — çizgi metin taşımıyor, kontrast eşiği geçerli değil
  tabOn:      { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabText:    { color: colors.text3, fontSize: type.subhead, fontWeight: '500' },
  tabTextOn:  { color: colors.text, fontWeight: '600' },


});
