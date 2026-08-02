import { memo, useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchCardPrice } from '../src/api/games';
import EmptyState from '../src/components/EmptyState';
import { colors, radius, spacing, PRESSED } from '../src/theme';
import { useLanguage } from '../src/context/LanguageContext';
import { useWishlist } from '../src/context/WishlistContext';
import ProfileGate from '../src/components/ProfileGate';

export default function WishlistScreen() {
  return (
    <ProfileGate>
      <WishlistScreenContent />
    </ProfileGate>
  );
}

function WishlistScreenContent() {
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
        <Pressable style={({ pressed }) => [styles.back, pressed && PRESSED]} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('wishlist.title')}</Text>
        {items.length > 0 ? <Text style={styles.count}>{items.length}</Text> : <View style={{ width: 24 }} />}
      </View>

      {items.length === 0 ? (
        <EmptyState
          icon="bookmark-outline"
          title={t('wishlist.empty')}
          text={t('wishlist.emptyDesc')}
          actionLabel={t('wishlist.explore')}
          actionIcon="search"
          onAction={() => router.push('/games')}
        />
      ) : (
        <FlashList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderWish}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            !enabled ? (
              <Pressable style={({ pressed }) => [styles.notifBanner, pressed && PRESSED]} onPress={onEnable}>
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
    <Pressable style={({ pressed }) => [styles.row, pressed && PRESSED]} onPress={() => onOpen(item)}>
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

  notifBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.accentSoft, borderColor: colors.accentBorder, borderWidth: 1, borderRadius: radius.md, padding: 12, marginHorizontal: spacing.lg, marginTop: 12, marginBottom: 4 },
  notifText: { flex: 1, fontSize: 12, color: colors.text2, lineHeight: 16 },
  notifCta: { fontSize: 13, fontWeight: '800', color: colors.accentText },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 11 },
  thumb: { width: 96, height: 54, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.card },
  rowName: { fontSize: 15, fontWeight: '700', color: colors.text, lineHeight: 18 },
  rowPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  price: { fontSize: 15, fontWeight: '800', color: colors.text },
  priceDim: { fontSize: 15, color: colors.text3 },
  free: { fontSize: 15, fontWeight: '800', color: colors.green },
  saleBadge: { backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  saleText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  remove: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
