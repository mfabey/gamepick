import { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { fetchCardPrice, fetchGameDetail, fetchPrices, fetchSteamReviews } from '../../src/api/games';
import { colors, radius, spacing } from '../../src/theme';
import { useLanguage } from '../../src/context/LanguageContext';
import { useWishlist } from '../../src/context/WishlistContext';
import { useQuery } from '../../src/hooks/useQuery';
import { recordSignal } from '../../src/services/tasteProfile';
import { recordSeen } from '../../src/services/seenStore';
import FadeIn from '../../src/components/FadeIn';
import StoreLogo from '../../src/components/StoreLogo';

// Olumlu %'den inceleme tier'ı (etiket i18n + renk)
function tierFor(pct) {
  if (pct >= 90) return { key: 'review.veryPositive',    color: '#4ade80' };
  if (pct >= 75) return { key: 'review.positive',        color: '#86efac' };
  if (pct >= 60) return { key: 'review.mostlyPositive',  color: '#fbbf24' };
  if (pct >= 40) return { key: 'review.mixed',           color: '#fb923c' };
  return           { key: 'review.negative',             color: '#f87171' };
}

// Binlik ayraçlı sayı (TR '.', EN ',')
function groupNum(n, sep) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

function stripHtml(s) {
  if (!s) return '';
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export default function GameDetail() {
  const { id, name, image, slug, hasSteam } = useLocalSearchParams();
  const router = useRouter();
  const { t, lang, formatPrice } = useLanguage();
  const { isWatched, toggle } = useWishlist();

  // Zengin detay: cache-first (aynı oyunu tekrar açınca anında gelir)
  const { data: detail } = useQuery(
    `game-detail:${slug || id}`,
    () => fetchGameDetail(slug || id).then((d) => (d && !d.error ? d : null)),
    { ttl: 30 * 60 * 1000 }
  );
  const [price, setPrice]     = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [activeShotIndex, setActiveShotIndex] = useState(null);
  const [currentScrollIndex, setCurrentScrollIndex] = useState(null);
  const scrollRef = useRef(null);
  const { width: screenWidth } = Dimensions.get('window');

  useEffect(() => {
    if (activeShotIndex !== null) {
      setCurrentScrollIndex(activeShotIndex);
    }
  }, [activeShotIndex]);

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

  const watched = isWatched(id);
  const gameObj = { id, name, slug, image, hasSteam: hasSteam === 'true' || hasSteam === '1' };

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

  // Wishlist eklerken güçlü sinyal
  const onToggleWishlist = () => {
    const willAdd = !watched;
    toggle(gameObj);
    if (willAdd && detail?.genres?.length) recordSignal({ genres: detail.genres, type: 'wishlist' });
  };

  const cover = detail?.image || image;
  const title = detail?.name || name;
  const isFree = price?.isFree;
  const onSale = price?.discount > 0 && !isFree;
  const desc = stripHtml(detail?.description);
  const genres = detail?.genres || [];
  const shots = detail?.screenshots || [];
  const mc = detail?.metacritic;
  const mcColor = mc >= 80 ? colors.green : mc >= 60 ? '#fbbf24' : '#f87171';

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
        {detail?.trailer ? (
          <Video
            source={{ uri: detail.trailer }}
            rate={1.0}
            volume={1.0}
            isMuted={true}
            resizeMode="cover"
            shouldPlay
            isLooping
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <LinearGradient colors={['rgba(8,10,13,0.15)', 'rgba(8,10,13,0.45)', colors.bg]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Pressable style={[styles.iconBtn, watched && styles.iconBtnActive]} onPress={onToggleWishlist} hitSlop={10}>
            <Ionicons name={watched ? 'notifications' : 'notifications-outline'} size={20} color={watched ? '#fff' : '#fff'} />
          </Pressable>
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
              <Text style={[styles.metaChipText, { color: colors.accent }]}>★ {detail.rating.toFixed(1)}</Text>
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
              <Text style={[styles.price, onSale && { color: colors.accent }]}>{formatPrice(price.price)}</Text>
            </View>
          ) : (
            <Text style={styles.priceLoading}>—</Text>
          )}
        </View>

        {/* Mağaza butonları */}
        {stores.length > 0 && (
          <View style={styles.storeRow}>
            {stores.map(s => (
              <Pressable key={s.key} style={styles.storeBtn} onPress={() => open(s.url)} disabled={!s.url}>
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
            <View style={{ gap: 8 }}>
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
                    <Text style={[styles.cmpPrice, i === 0 && { color: colors.accent }]}>
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

        {/* Türler */}
        {genres.length > 0 && (
          <Section title={t('detail.genres')} delay={100}>
            <View style={styles.genreWrap}>
              {genres.slice(0, 8).map((g, i) => (
                <View key={`${g}_${i}`} style={styles.genreChip}><Text style={styles.genreText}>{g}</Text></View>
              ))}
            </View>
          </Section>
        )}

        {/* Ekran görüntüleri */}
        {shots.length > 0 && (
          <Section title={t('detail.screenshots')} delay={160}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.lg }} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 10 }}>
              {shots.map((url, i) => (
                <Pressable key={i} onPress={() => setActiveShotIndex(i)}>
                  <Image source={url} cachePolicy="memory-disk" style={styles.shot} contentFit="cover" transition={200} />
                </Pressable>
              ))}
            </ScrollView>
          </Section>
        )}

        {/* Açıklama */}
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
            ref={scrollRef}
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
          <Pressable style={styles.closeBtn} onPress={() => setActiveShotIndex(null)} hitSlop={10}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>

          {/* Page Indicator */}
          {shots.length > 1 && (
            <View style={styles.indicatorContainer}>
              <Text style={styles.indicatorText}>
                {`${(currentScrollIndex !== null ? currentScrollIndex : activeShotIndex) + 1} / ${shots.length}`}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

function Section({ title, delay = 0, children }) {
  return (
    <FadeIn delay={delay} style={{ marginTop: 24 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  coverWrap: { height: 320, backgroundColor: '#0d0f12' },
  topBar: { paddingHorizontal: spacing.md, paddingTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  iconBtnActive: { backgroundColor: colors.accent },
  body: { flex: 1, marginTop: -48 },
  name: { fontSize: 26, fontWeight: '900', color: colors.text, letterSpacing: -0.5, lineHeight: 30 },

  metaRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  metaChip: { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', minWidth: 68 },
  metaChipText: { fontSize: 17, fontWeight: '800' },
  metaChipText2: { fontSize: 12.5, fontWeight: '700', color: colors.text },
  metaChipLabel: { fontSize: 10, color: colors.text3, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  dev: { fontSize: 13, color: colors.text3, marginTop: 12, fontWeight: '600' },

  priceRow: { marginTop: 16, minHeight: 26, justifyContent: 'center', alignItems: 'flex-start' },
  price: { fontSize: 22, fontWeight: '800', color: colors.text },
  priceFree: { fontSize: 22, fontWeight: '800', color: colors.green },
  priceLoading: { fontSize: 20, color: colors.text3 },
  original: { fontSize: 15, color: colors.text3, textDecorationLine: 'line-through' },
  discountBadge: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  discountText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  storeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  storeBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11 },
  storeText: { color: colors.text, fontSize: 13.5, fontWeight: '700' },

  cmpRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11 },
  cmpBest: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  cmpName: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  cmpCheapest: { fontSize: 10.5, fontWeight: '700', color: colors.accent, marginTop: 1 },
  cmpPrice: { fontSize: 15, fontWeight: '800', color: colors.text },

  revCard: { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: radius.md, padding: 16 },
  revHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  revLabel: { fontSize: 17, fontWeight: '800' },
  revPct: { fontSize: 15, fontWeight: '800', color: colors.text },
  revPctLabel: { fontSize: 12.5, fontWeight: '600', color: colors.text3 },
  revBar: { height: 8, borderRadius: 4, backgroundColor: colors.cardBorder, overflow: 'hidden' },
  revBarFill: { height: '100%', borderRadius: 4 },
  revCount: { fontSize: 12.5, color: colors.text3, fontWeight: '600', marginTop: 10 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12 },
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreChip: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  genreText: { color: '#ff8085', fontSize: 12.5, fontWeight: '700' },
  shot: { width: 264, height: 148, borderRadius: radius.md, backgroundColor: colors.card },
  desc: { fontSize: 14, color: colors.text2, lineHeight: 21 },
  moreLink: { color: colors.accent, fontSize: 13.5, fontWeight: '700', marginTop: 8 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  modalImage: { width: '100%', height: '100%' },
  closeBtn: { position: 'absolute', top: 50, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  indicatorContainer: { position: 'absolute', bottom: 40, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, zIndex: 10 },
  indicatorText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
});
