import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { fetchCardPrice, fetchGameDetail } from '../../src/api/games';
import { colors, radius, spacing } from '../../src/theme';
import { useLanguage } from '../../src/context/LanguageContext';
import { useWishlist } from '../../src/context/WishlistContext';
import FadeIn from '../../src/components/FadeIn';

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
  const { t, formatPrice } = useLanguage();
  const { isWatched, toggle } = useWishlist();

  const [detail, setDetail]   = useState(null);
  const [price, setPrice]     = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const watched = isWatched(id);
  const gameObj = { id, name, slug, image, hasSteam: hasSteam === 'true' || hasSteam === '1' };

  useEffect(() => {
    let alive = true;
    // Zengin detay
    fetchGameDetail(slug || id)
      .then(d => { if (alive && d && !d.error) setDetail(d); })
      .catch(() => {});
    // Fiyat
    fetchCardPrice({ slug: slug || '', name: name || '', hasSteam: true })
      .then(d => { if (alive) setPrice(d); })
      .catch(() => {})
      .finally(() => { if (alive) setLoadingPrice(false); });
    return () => { alive = false; };
  }, [slug, id, name]);

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
        <LinearGradient colors={['rgba(8,10,13,0.15)', 'rgba(8,10,13,0.45)', colors.bg]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Pressable style={[styles.iconBtn, watched && styles.iconBtnActive]} onPress={() => toggle(gameObj)} hitSlop={10}>
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
                <Pressable key={i} onPress={() => open(url)}>
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

  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12 },
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreChip: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  genreText: { color: '#ff8085', fontSize: 12.5, fontWeight: '700' },
  shot: { width: 264, height: 148, borderRadius: radius.md, backgroundColor: colors.card },
  desc: { fontSize: 14, color: colors.text2, lineHeight: 21 },
  moreLink: { color: colors.accent, fontSize: 13.5, fontWeight: '700', marginTop: 8 },
});
