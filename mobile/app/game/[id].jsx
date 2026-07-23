import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchCardPrice } from '../../src/api/games';
import { colors, radius, spacing } from '../../src/theme';
import { useLanguage } from '../../src/context/LanguageContext';
import { useWishlist } from '../../src/context/WishlistContext';

export default function GameDetail() {
  const { id, name, image, slug, hasSteam } = useLocalSearchParams();
  const router = useRouter();
  const { t, formatPrice } = useLanguage();
  const { isWatched, toggle } = useWishlist();
  const watched = isWatched(id);
  const gameObj = { id, name, slug, image, hasSteam: hasSteam === 'true' || hasSteam === '1' };
  const [price, setPrice] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchCardPrice({ slug: slug || '', name: name || '', hasSteam: true })
      .then(d => { if (alive) setPrice(d); })
      .catch(() => {})
      .finally(() => { if (alive) setLoadingPrice(false); });
    return () => { alive = false; };
  }, [slug, name]);

  const isFree = price?.isFree;
  const onSale = price?.discount > 0 && !isFree;

  return (
    <View style={styles.root}>
      {/* Kapak */}
      <View style={styles.coverWrap}>
        <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
        <LinearGradient colors={['rgba(11,13,16,0.2)', 'rgba(11,13,16,0.4)', colors.bg]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Pressable style={[styles.iconBtn, watched && styles.iconBtnActive]} onPress={() => toggle(gameObj)} hitSlop={10}>
            <Ionicons name={watched ? 'notifications' : 'notifications-outline'} size={20} color={watched ? '#0b0d10' : '#fff'} />
          </Pressable>
        </SafeAreaView>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <Text style={styles.name}>{name}</Text>

        {/* Fiyat */}
        <View style={styles.priceRow}>
          {loadingPrice ? (
            <Text style={styles.priceLoading}>…</Text>
          ) : isFree ? (
            <Text style={styles.priceFree}>{t('card.free')}</Text>
          ) : price?.price != null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {onSale && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>-%{price.discount}</Text>
                </View>
              )}
              {onSale && price.original != null && (
                <Text style={styles.original}>{formatPrice(price.original)}</Text>
              )}
              <Text style={[styles.price, onSale && { color: colors.accent }]}>{formatPrice(price.price)}</Text>
            </View>
          ) : (
            <Text style={styles.priceLoading}>—</Text>
          )}
        </View>

        <Text style={styles.note}>
          {t('home.tagline')}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  coverWrap: { height: 320, backgroundColor: '#0d0f12' },
  topBar: { paddingHorizontal: spacing.md, paddingTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnActive: { backgroundColor: colors.accent },
  body: { flex: 1, marginTop: -40 },
  name: { fontSize: 26, fontWeight: '900', color: colors.text, letterSpacing: -0.5, lineHeight: 30 },
  priceRow: { marginTop: 16 },
  price: { fontSize: 22, fontWeight: '800', color: colors.text },
  priceFree: { fontSize: 22, fontWeight: '800', color: colors.green },
  priceLoading: { fontSize: 20, color: colors.text3 },
  original: { fontSize: 15, color: colors.text3, textDecorationLine: 'line-through' },
  discountBadge: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  discountText: { color: '#0b0d10', fontWeight: '800', fontSize: 13 },
  note: { marginTop: 24, color: colors.text3, fontSize: 14, lineHeight: 21 },
});
