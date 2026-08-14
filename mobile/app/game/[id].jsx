import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Modal, Dimensions, Share } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { fetchCardPrice, fetchGameDetail, fetchGameByAppid, fetchPrices, fetchSteamReviews } from '../../src/api/games';
import { colors, radius, spacing, PRESSED, type, scale, metacriticColor } from '../../src/theme';
import { stripHtml } from '../../src/utils/text';
import { useLanguage } from '../../src/context/LanguageContext';
import { useTimeToData } from '../../src/dev/perf';
import { useWishlist } from '../../src/context/WishlistContext';
import { useCollections, useCollectionsContaining } from '../../src/hooks/useCollections';
import { toggleGameInCollection, createCollection } from '../../src/services/collectionsStore';
import CollectionPicker from '../../src/components/CollectionPicker';
import { reportActivity } from '../../src/api/social';
import { useQuery } from '../../src/hooks/useQuery';
import { GenreChipsSkeleton, ShotStripSkeleton, TextBlockSkeleton } from '../../src/components/Skeleton';
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

// Binlik ayraçlı sayı (TR '.', EN ',')
function groupNum(n, sep) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

export default function GameDetail() {
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
  const priceStores = useMemo(() => {
    const list = pricesData?.stores || [];
    return [...list].sort((a, b) => (a.isFree ? -1 : b.isFree ? 1 : a.price - b.price));
  }, [pricesData]);

  // Steam topluluk inceleme analizi — detay yüklenince (steamAppId için)
  const { data: reviews } = useQuery(
    `reviews:${detail?.steamAppId || ''}`,
    () => fetchSteamReviews(detail?.steamAppId),
    { ttl: 60 * 60 * 1000, enabled: !!detail?.steamAppId }
  );
  const reviewTier = reviews?.total ? tierFor(reviews.positivePct) : null;

  // Fragman: sessiz, döngülü, kontrolsüz arka plan videosu (expo-video)
  const trailerUrl = detail?.trailer || null;
  const trailerPlayer = useVideoPlayer(trailerUrl, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  // Ekran odakta mı? (mağaza linki/tarayıcı üste açılınca ekran mount'ta kalır)
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  // Video yalnızca ekran odaktayken VE lightbox kapalıyken oynasın (pil/CPU)
  useEffect(() => {
    if (!trailerUrl) return;
    if (focused && activeShotIndex === null) trailerPlayer.play();
    else trailerPlayer.pause();
  }, [focused, activeShotIndex, trailerUrl, trailerPlayer]);

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
      {/* Kapak */}
      <View style={styles.coverWrap}>
        {cover ? <Image source={cover} priority="high" cachePolicy="memory-disk" style={StyleSheet.absoluteFill} contentFit="cover" transition={250} /> : null}
        {trailerUrl ? (
          <VideoView
            player={trailerPlayer}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
        ) : null}
        <LinearGradient colors={['rgba(8,10,13,0.15)', 'rgba(8,10,13,0.45)', colors.bg]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <Pressable style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
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
              <Ionicons
                name={watched ? 'notifications' : 'notifications-outline'}
                size={20}
                color={watched ? colors.bg : '#fff'}
              />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <FadeIn delay={40}>
        <Text style={styles.name}>{title}</Text>

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

        {/* Fiyat */}
        <View style={styles.priceRow}>
          {loadingPrice ? (
            <ActivityIndicator color={colors.accent} />
          ) : isFree ? (
            <Text style={styles.priceFree}>{t('card.free')}</Text>
          ) : price?.price != null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {onSale && <View style={styles.discountBadge}><Text style={styles.discountText}>-%{price.discount}</Text></View>}
              {onSale && price.original != null && <Text style={styles.original}>{formatPrice(price.original)}</Text>}
              <Text style={[styles.price, onSale && { color: colors.accentText }]}>{formatPrice(price.price)}</Text>
            </View>
          ) : (
            <Text style={styles.priceLoading}>—</Text>
          )}
        </View>

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
        {priceStores.length > 0 && (
          <Section title={t('detail.priceCompare')} delay={130}>
            <View style={{ gap: spacing.sm }}>
              {priceStores.map((s, i) => (
                <Pressable key={s.storeId || s.name} onPress={() => open(s.url)} disabled={!s.url}
                  style={[styles.cmpRow, i === 0 && styles.cmpBest]}>
                  <StoreLogo store={s.name} size={26} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cmpName}>{s.name}</Text>
                    {i === 0 ? <Text style={styles.cmpCheapest}>{t('detail.cheapest')}</Text> : null}
                  </View>
                  {s.discount > 0 ? <View style={styles.discountBadge}><Text style={styles.discountText}>-%{s.discount}</Text></View> : null}
                  <View style={{ alignItems: 'flex-end', minWidth: 64 }}>
                    {s.discount > 0 ? <Text style={styles.original}>{formatPrice(s.original)}</Text> : null}
                    <Text style={[styles.cmpPrice, i === 0 && { color: colors.accentText }]}>
                      {s.isFree ? t('card.free') : formatPrice(s.price)}
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={13} color={colors.text3} />
                </Pressable>
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
                <View key={`${g}_${i}`} style={styles.genreChip}><Text style={styles.genreText}>{g}</Text></View>
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
                  <Image source={url} cachePolicy="memory-disk" style={styles.shot} contentFit="cover" transition={200} />
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
      </ScrollView>
      
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
          <Pressable style={({ pressed }) => [styles.closeBtn, pressed && PRESSED]} onPress={() => setActiveShotIndex(null)} hitSlop={10}>
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

function Section({ title, delay = 0, children }) {
  return (
    <FadeIn delay={delay} style={{ marginTop: spacing.xl }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  // Kapak yüklenene kadarki zemin — açık temada koyu bir bant çakıyordu.
  coverWrap: { height: 320, backgroundColor: colors.card },
  topBar: { paddingHorizontal: spacing.md, paddingTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // tema-bagimsiz: kapak/ekran goruntusu ustundeki katman
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  // Aktif durum dolu nötr yüzeyle: ikon zaten outline→dolu değişiyor, yani
  // renk olmadan da iki sinyal var (biçim + yüzey). Kapak görselinin üstünde
  // durduğu için açık yüzey her sahnede okunur kalıyor.
  iconBtnActive: { backgroundColor: colors.text },
  body: { flex: 1, marginTop: -48 },
  name: { fontSize: type.title1, fontWeight: '900', color: colors.text, letterSpacing: -0.5, lineHeight: 30 },

  metaRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  metaChip: { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: spacing.sm, alignItems: 'center', minWidth: 68 },
  metaChipText: { fontSize: type.body, fontWeight: '800' },
  metaChipText2: { fontSize: type.footnote, fontWeight: '700', color: colors.text },
  metaChipLabel: { fontSize: type.caption2, color: colors.text3, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  dev: { fontSize: type.footnote, color: colors.text3, marginTop: spacing.md, fontWeight: '600' },

  priceRow: { marginTop: spacing.lg, minHeight: 26, justifyContent: 'center', alignItems: 'flex-start' },
  price: { fontSize: type.title3, fontWeight: '800', color: colors.text },
  priceFree: { fontSize: type.title3, fontWeight: '800', color: colors.green },
  priceLoading: { fontSize: type.headline, color: colors.text3 },
  original: { fontSize: type.subhead, color: colors.text3, textDecorationLine: 'line-through' },
  discountBadge: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  discountText: { color: '#fff', fontWeight: '800', fontSize: type.footnote },

  storeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  storeBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11 },
  storeText: { color: colors.text, fontSize: type.footnote, fontWeight: '700' },

  cmpRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11 },
  cmpBest: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  cmpName: { fontSize: type.footnote, fontWeight: '700', color: colors.text },
  cmpCheapest: { fontSize: type.caption2, fontWeight: '700', color: colors.accentText, marginTop: 1 },
  cmpPrice: { fontSize: type.subhead, fontWeight: '800', color: colors.text },

  revCard: { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg },
  revHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.md },
  revLabel: { fontSize: type.body, fontWeight: '800' },
  revPct: { fontSize: type.subhead, fontWeight: '800', color: colors.text },
  revPctLabel: { fontSize: type.footnote, fontWeight: '600', color: colors.text3 },
  revBar: { height: 8, borderRadius: 4, backgroundColor: colors.cardBorder, overflow: 'hidden' },
  revBarFill: { height: '100%', borderRadius: 4 },
  revCount: { fontSize: type.footnote, color: colors.text3, fontWeight: '600', marginTop: 10 },

  sectionTitle: { fontSize: type.body, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
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
