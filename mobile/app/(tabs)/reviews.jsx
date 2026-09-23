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
  View, Pressable, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { getReviewFeed, getEligibleGames, fetchPosts, getFriends } from '../../src/api/social';
import { getSession, subscribeSession } from '../../src/services/session';
import ReviewComposer from '../../src/components/ReviewComposer';
import ReviewCard from '../../src/components/ReviewCard';
import EmptyState from '../../src/components/EmptyState';
import PostCard from '../../src/components/PostCard';
import PostComposer from '../../src/components/PostComposer';
import ModerasyonKatmani from '../../src/components/ModerasyonKatmani';
import { suz } from '../../src/services/engel';
import { useEngelliler } from '../../src/hooks/useEngelliler';
import { useModerasyon } from '../../src/hooks/useModerasyon';
import { FeedSkeleton, Reveal } from '../../src/components/Skeleton';
import { useTabBosluk } from '../../src/hooks/useAltBosluk';
import { useYanBosluk } from '../../src/hooks/useIcerikAlani';
import { useAuth } from '../../src/context/AuthContext';
import { Icon } from '../../src/components/Icon';
import { Button, CoverImage, IconButton, PressableScale, SectionHeader, Segmented, Txt } from '../../src/components/ui/Primitives';
import { PageHeader } from '../../src/components/ui/Navigation';
import { UserAvatar } from '../../src/components/ui/Social';
import { useDesignTheme } from '../../src/theme/useDesignTheme';
import { component as K, control, layout } from '../../src/theme/tokens';
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

/** Şikâyet hedefi — aynı ayrım, bu kez tür ve kimlik olarak. */
function hedefOf(x) {
  return x?.id != null
    ? { targetType: 'post', targetId: String(x.id) }
    : { targetType: 'review', targetId: `${x.appid}:${x.uid}` };
}

export default function ReviewsScreen() {
  const tabBosluk = useTabBosluk();
  const yan = useYanBosluk();
  const { colors } = useDesignTheme();
  // Yazma kartındaki avatar — başlık ve sekme çubuğuyla aynı kaynak.
  const { account } = useAuth();
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
  // Şikâyet + engelleme tek kancada — bkz. hooks/useModerasyon.js.
  const mod = useModerasyon();
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
  const yazmayaBasla = useCallback(() => { if (!requireAccount()) setComposing(true); }, [requireAccount]);

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

  // ── ENGEL: EKRANDAKİ LİSTEDEN ANINDA DÜŞÜR ──
  // Sunucu bir sonraki çekimde zaten süzüyor (getHiddenUids). Buradaki
  // süzgeç o çekim gelene kadarki boşluğu kapatıyor; Apple 1.2 engellemenin
  // içeriği akıştan ANINDA kaldırmasını istiyor.
  const engelSurumu = useEngelliler();
  const gorunen = useMemo(
    () => suz(items || [], (x) => x?.author?.uid || x?.uid),
    [items, engelSurumu],
  );

  const keyExtractor = useCallback((item) => itemKey(item), []);

  // TÜR SEKMEDEN DEĞİL ÖĞEDEN OKUNUYOR: "Keşfet" tek listede gönderi ve
  // inceleme taşıyor. Sekmeye bakarak karar vermek, karışık listede her
  // incelemeyi gönderi kartı olarak çizerdi (bu ekranda bir kez yaşandı —
  // bkz. load()'daki "başka sekmenin verisi çöp" notu).
  const renderItem = useCallback(({ item }) => (
    item.id != null ? (
      <PostCard post={item} onRequireAccount={requireAccount} onMenu={(k) => mod.acMenu(k, hedefOf(item))} compact />
    ) : (
      <ReviewCard
        review={item}
        onPress={() => router.push({
          pathname: '/game/[id]',
          params: { id: `rawg_${item.appid}`, appid: item.appid, name: item.gameName || '', image: item.image },
        })}
        onMenu={(k) => mod.acMenu(k, hedefOf(item))}
        onLongPress={() => mod.acMenu(item.author, hedefOf(item))}
      />
    )
  ), [requireAccount, router, mod]);

  // Başlık BİLEŞEN DEĞİL, ELEMENT olarak veriliyor. Yerel bir bileşen
  // tanımlansaydı her render'da yeni bir tip olurdu ve FlashList başlığı
  // yeniden monte ederdi — yatay şeridin kaydırma konumu her seferinde
  // sıfırlanırdı.
  const header = (
    <View>
      {/* ── İki akış (G-10 Segmented) ──
          Tasarım dört bölüm çiziyor (Senin İçin · Takip · Trend · Topluluklar);
          takip modeli, trend sıralaması ve topluluk üyeliği sunucuda yok.
          Veri olan iki akış tasarımın kontrolüyle: Keşfet (herkes) ve
          Arkadaşlar. "Benimkiler" profilde (dosya başı notu). */}
      <View style={[s.pad, s.segTop]}>
        <Segmented
          value={tab}
          accessibilityLabel={t('rev.section')}
          onChange={(k) => { Haptics.selectionAsync().catch(() => {}); setTab(k); }}
          items={[{ value: 'discover', label: t('post.tabDiscover') }, { value: 'friends', label: t('post.tabFriends') }]}
        />
      </View>

      {/* Yazma kartı (kit community() comp): akışın ÜSTÜNDE ve HER SEKMEDE —
          sayfanın işi konuşmak. Tür çiplerinden yalnız "Oyun" gerçek: gönderiye
          oyun eklenebiliyor; görsel/video kapalı karar (AGENTS.md), anket yok. */}
      <Pressable
        onPress={yazmayaBasla}
        accessibilityRole="button"
        accessibilityLabel={t('post.hint')}
        style={({ pressed }) => [s.composer, { backgroundColor: colors.surface1 }, pressed && s.pressed]}
      >
        <View style={s.composerRow}>
          <UserAvatar avatar={account?.avatar} name={account?.displayName || account?.username} size={K.community.composer.avatar} />
          <Txt variant="input" numberOfLines={1} style={[s.flex, { color: colors.text3 }]}>{t('post.hint')}</Txt>
        </View>
        <View style={s.composerChips}>
          <View style={[s.typeChip, { backgroundColor: colors.surface2 }]}>
            <Icon name="pad" size={K.community.composer.chipIcon} color={colors.text2} />
            <Txt variant="captionStrong" style={{ color: colors.text2 }}>{t('v2.gameChip')}</Txt>
          </View>
        </View>
      </Pressable>

      {/* ── Yazabileceğin oyunlar (kit "Toplulukların" rayının kutucukları) ──
          Oyun toplulukları sunucuda yok; bu rayın gerçek karşılığı Steam'den
          doğrulanan oyunların — sayfanın boş görünmemesini sağlayan kısım.
          Dokununca inceleme yazma sayfası açılıyor. */}
      {eligible?.games?.length > 0 && (
        <View style={s.railTop}>
          <View style={s.pad}><SectionHeader title={t('rev.canWriteAbout')} /></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tiles}>
            {eligible.games.map((g) => (
              <PressableScale
                key={g.appid}
                accessibilityRole="button"
                accessibilityLabel={g.name}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setComposer({ appid: g.appid, name: g.name, existing: null });
                }}
                style={s.tile}
              >
                <CoverImage source={g.image} radius={K.community.tile.radius} style={s.tileImg} />
                <Txt variant="captionStrong" numberOfLines={1} style={s.tileName}>{g.name}</Txt>
                <Txt variant="caption2Medium" style={[s.tileSub, s.num, { color: colors.text3 }]}>{`${Math.round(g.hours)} ${t('rev.hoursShort')}`}</Txt>
              </PressableScale>
            ))}
          </ScrollView>
        </View>
      )}

      {eligible?.games?.length === 0 && (
        <Txt variant="footnote" style={[s.pad, s.hint, { color: colors.text3 }]}>{t('rev.noEligible')}</Txt>
      )}

      {/* BOZUK AKIŞ — yazma kartının ALTINDA. Hata okumayı engelliyor,
          YAZMAYI değil: sayfa hâlâ bir şey teklif ediyor, ölü durmuyor.
          Kırmızı yok: durum bir eylem değil. */}
      {bozuk ? (
        <View style={[s.bozuk, { backgroundColor: colors.surface1 }]}>
          <Txt variant="cardTitle">{t('rev.degraded')}</Txt>
          <Txt variant="footnote" style={{ color: colors.text2 }}>{t('rev.degradedDesc')}</Txt>
          <View style={s.bozukEylem}><Button title={t('common.retry')} variant="tertiary" height={40} onPress={() => load()} /></View>
        </View>
      ) : null}

      {/* Akış rayın 28 altında başlıyor (kit); ilk satır yarısını kendi taşıyor. */}
      <View style={s.feedTop} />
    </View>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <Header t={t} router={router} incoming={incoming} onCompose={yazmayaBasla} yan={yan} />

      {loading ? (
        // Dönen çark DEĞİL. Ölçüldü: bu ekran 645ms boyunca ortada tek bir
        // çarktan ibaretti — akışın nasıl bir şey olduğuna dair hiçbir ipucu
        // vermeden. İskelet aynı süreyi düzenin kendisini göstererek geçiriyor.
        <FeedSkeleton />
      ) : (
        <Reveal style={s.flex}>
        <FlashList
          ref={listRef}
          data={gorunen}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          // extraData: renderItem sekmeye göre FARKLI kart çiziyor. Sekme
          // değişince veri de değiştiği için pratikte yeniden çiziliyor ama
          // bunu veriye bağlı bırakmak sessiz bir varsayım olurdu.
          extraData={tab}
          ListHeaderComponent={header}
          // GENİŞ EKRANDA KOLON ORTALANIYOR (bkz. theme → ICERIK_MAX).
          contentContainerStyle={{ paddingHorizontal: yan }}
          // BOZUKSA "kimse yazmamış" DEMİYORUZ; bant `header` İÇİNDE (aynı
          // sekmenin bayat listesi korunduğunda liste boş olmuyor ve bant
          // boş bileşende hiç çizilmezdi). İKİNCİ bir ListHeaderComponent
          // propu da olmaz — JSX'te son prop kazanıyor.
          ListEmptyComponent={bozuk ? null : <EmptyState compact {...bosDurum} />}
          ListFooterComponent={
            <View style={[s.footer, { height: tabBosluk }]}>
              {loadingMore ? <ActivityIndicator color={colors.text2} /> : null}
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

      <ModerasyonKatmani mod={mod} />
    </SafeAreaView>
  );
}

// Geri düğmesi YOK: burası bir sekme. G-10 başlığı: büyük başlık + sağda iki
// ikon. Tasarımın "ara"sı yerine ARKADAŞLAR duruyor: bekleyen arkadaşlık
// isteği rozeti, kullanıcı Topluluk'ta gezerken kendisine gelen isteği
// görsün diye burada ("iki topluluk" sorununun bağı — içerik ebeveyn,
// kişiler oradan ulaşılan yer). Kalem gönderi yazmayı açıyor.
function Header({ t, router, incoming, onCompose, yan = 0 }) {
  return (
    // Başlık listenin DIŞINDA; kolona kendi hizalanıyor.
    <View style={{ marginHorizontal: yan }}>
      <PageHeader title={t('rev.section')}>
        <IconButton icon="users" label={t('soc.title')} badge={incoming || undefined} onPress={() => router.push('/friends')} />
        {/* Kitteki ikon `pen` (yazma kutusu), `edit` (kalem) değil —
            Mesajlar'daki "yeni mesaj" ile aynı eylem, aynı simge. */}
        <IconButton icon="pen" label={t('post.newTitle')} onPress={onCompose} />
      </PageHeader>
    </View>
  );
}

const C = K.community;
const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  num: { fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.9 },
  pad: { paddingHorizontal: layout.gutter },
  segTop: { marginTop: C.segTop },
  composer: { marginHorizontal: layout.gutter, marginTop: C.composerTop, padding: C.composer.padding, borderRadius: C.composer.radius },
  composerRow: { height: C.composer.row, flexDirection: 'row', alignItems: 'center', gap: C.composer.gap },
  composerChips: { marginTop: C.composer.chipsTop, flexDirection: 'row', gap: control.buttonGap },
  typeChip: { height: C.composer.chipHeight, paddingHorizontal: C.composer.chipPadding, borderRadius: C.composer.chipRadius,
    flexDirection: 'row', alignItems: 'center', gap: C.composer.chipGap },
  railTop: { marginTop: C.railTop },
  tiles: { paddingHorizontal: layout.gutter, paddingTop: layout.headingToContent, gap: K.rail.friend[0] },
  tile: { width: C.tile.width, alignItems: 'center' },
  tileImg: { width: C.tile.image, height: C.tile.image },
  tileName: { width: C.tile.width, marginTop: C.tile.nameTop, textAlign: 'center' },
  tileSub: { marginTop: C.tile.subTop },
  hint: { marginTop: C.railTop, textAlign: 'center' },
  bozuk: { marginHorizontal: layout.gutter, marginTop: C.railTop, padding: K.prices.alert.padding, borderRadius: C.composer.radius, gap: K.comment.textTop },
  bozukEylem: { alignSelf: 'flex-start' },
  feedTop: { height: C.feedTop - C.feedGap / 2 },
  footer: { alignItems: 'center', paddingTop: layout.headingToContent },
});
