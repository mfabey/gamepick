import { memo, useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchCardPrice } from '../src/api/games';
import { colors, radius, spacing } from '../src/theme';
import { useLanguage } from '../src/context/LanguageContext';
import { useWishlist } from '../src/context/WishlistContext';

export default function WishlistScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { items, remove, enabled, enableNotifications } = useWishlist();

  const onEnable = async () => {
    const r = await enableNotifications();
    if (r.error) {
      const msg = r.error === 'permission-denied' ? t('notif.permissionError') : t('notif.needDevBuild');
      Alert.alert(t('notif.title'), msg);
    }
  };

  // FlashList için stabil referanslar
  const keyExtractor = useCallback((item) => String(item.id), []);
  const handleOpen = useCallback((it) => router.push({
    pathname: '/game/[id]',
    params: { id: String(it.id), name: it.name, image: it.image || '', slug: it.slug || '', hasSteam: it.hasSteam ? '1' : '' },
  }), [router]);
  const renderWish = useCallback(({ item }) => (
    <WishRow item={item} onOpen={handleOpen} onRemove={remove} />
  ), [handleOpen, remove]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Başlık */}
      <View style={styles.head}>
        <Pressable style={styles.back} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('wishlist.title')}</Text>
        {items.length > 0 ? <Text style={styles.count}>{items.length}</Text> : <View style={{ width: 24 }} />}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bookmark-outline" size={54} color={colors.text3} />
          <Text style={styles.emptyTitle}>{t('wishlist.empty')}</Text>
          <Text style={styles.emptyDesc}>{t('wishlist.emptyDesc')}</Text>
          <Pressable style={styles.exploreBtn} onPress={() => router.push('/games')}>
            <Text style={styles.exploreText}>{t('wishlist.explore')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderWish}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            !enabled ? (
              <Pressable style={styles.notifBanner} onPress={onEnable}>
                <Ionicons name="notifications" size={18} color={colors.accent} />
                <Text style={styles.notifText}>{t('notif.desc')}</Text>
                <Text style={styles.notifCta}>{t('notif.enable')}</Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const WishRow = memo(function WishRow({ item, onOpen, onRemove }) {
  const { t, formatPrice } = useLanguage();
  const [price, setPrice] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchCardPrice({ slug: item.slug || '', name: item.name, hasSteam: !!item.hasSteam })
      .then(d => { if (alive && d && d.price != null) setPrice(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [item.slug, item.name, item.hasSteam]);

  const isFree = price?.isFree;
  const onSale = price?.discount > 0 && !isFree;

  return (
    <Pressable style={styles.row} onPress={() => onOpen(item)}>
      <View style={styles.thumb}>
        {item.image ? <Image source={item.image} recyclingKey={String(item.id)} cachePolicy="memory-disk" style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={2} style={styles.rowName}>{item.name}</Text>
        <View style={styles.rowPriceRow}>
          {isFree ? (
            <Text style={styles.free}>{t('card.free')}</Text>
          ) : price?.price != null ? (
            <>
              {onSale && <View style={styles.saleBadge}><Text style={styles.saleText}>-%{price.discount}</Text></View>}
              <Text style={[styles.price, onSale && { color: colors.accentText }]}>{formatPrice(price.price)}</Text>
            </>
          ) : (
            <Text style={styles.priceDim}>…</Text>
          )}
        </View>
      </View>
      <Pressable onPress={() => onRemove(item.id)} hitSlop={10} style={styles.remove}>
        <Ionicons name="trash-outline" size={19} color={colors.text3} />
      </Pressable>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 8 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  count: { width: 40, textAlign: 'center', fontSize: 15, fontWeight: '800', color: colors.accentText },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  emptyDesc: { fontSize: 13.5, color: colors.text3, textAlign: 'center', lineHeight: 20 },
  exploreBtn: { marginTop: 8, backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: 24, paddingVertical: 12 },
  exploreText: { color: '#fff', fontWeight: '700', fontSize: 14.5 },

  notifBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.accentSoft, borderColor: colors.accentBorder, borderWidth: 1, borderRadius: radius.md, padding: 12, marginHorizontal: spacing.lg, marginTop: 12, marginBottom: 4 },
  notifText: { flex: 1, fontSize: 12, color: colors.text2, lineHeight: 16 },
  notifCta: { fontSize: 12.5, fontWeight: '800', color: colors.accentText },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 11 },
  thumb: { width: 96, height: 54, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.card },
  rowName: { fontSize: 14.5, fontWeight: '700', color: colors.text, lineHeight: 18 },
  rowPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  price: { fontSize: 14, fontWeight: '800', color: colors.text },
  priceDim: { fontSize: 14, color: colors.text3 },
  free: { fontSize: 14, fontWeight: '800', color: colors.green },
  saleBadge: { backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  saleText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  remove: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
