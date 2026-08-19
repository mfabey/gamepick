import { memo, useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchCardPrice } from '../src/api/games';
import EmptyState from '../src/components/EmptyState';
import { radius, spacing, PRESSED, type } from '../src/theme';
import GameRow, { SATIR_Y } from '../src/components/GameRow';
import { useStyles, useTheme } from '../src/context/ThemeContext';
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
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
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
        <Pressable style={({ pressed }) => [styles.back, pressed && PRESSED]} onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
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
          actionIcon="pricetag-outline"
          // İNDİRİMLERE, tüm oyunlara değil. Bu listenin varlık sebebi indirim
          // haberi; boş listede kullanıcıyı doğrudan indirime götürmek listenin
          // ne işe yaradığını anlatmanın en kısa yolu.
          onAction={() => router.push({ pathname: '/games', params: { section: 'sale' } })}
        />
      ) : (
        <FlashList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderWish}
          // Yatay dolgu SATIRDA değil listede: ayırıcı çizgi kenardan
          // kenara gitmiyor, metin bloğuyla hizalanıyor.
          contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: spacing.s20 }}
          // Sabit yükseklikli satır → tahmin değil ÖLÇÜ (Faz 2 sözleşmesi).
          estimatedItemSize={SATIR_Y}
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
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
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

  // FAZ 2 — E bedeni. Fiyat SAĞ YUVADA, indirim ad altındaki durum
  // satırında: ikisi eskiden aynı satırda yan yanaydı ve uzun adlarda
  // fiyat sıkışıyordu.
  const durum = isFree ? t('card.free')
    : onSale ? `-%${price.discount}`
    : null;

  return (
    <GameRow
      game={item}
      durum={durum}
      onPress={() => onOpen(item)}
      sag={
        <View style={styles.sag}>
          {price?.price != null && !isFree ? (
            <Text style={[styles.price, onSale && { color: colors.accentText }]}>{formatPrice(price.price)}</Text>
          ) : !isFree ? (
            <Text style={styles.priceDim}>…</Text>
          ) : null}
          <Pressable onPress={() => onRemove(item.id)} hitSlop={10} style={styles.remove} accessibilityRole="button" accessibilityLabel={t('a11y.delete')}>
            <Ionicons name="trash-outline" size={19} color={colors.text3} />
          </Pressable>
        </View>
      }
    />
  );
});

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: type.headline, fontWeight: '800', color: colors.text, textAlign: 'center' },
  count: { width: 40, textAlign: 'center', fontSize: type.subhead, fontWeight: '800', color: colors.accentText },






  notifBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.accentSoft, borderColor: colors.accentBorder, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.xs },
  notifText: { flex: 1, fontSize: type.caption, color: colors.text2, lineHeight: 16 },
  notifCta: { fontSize: type.footnote, fontWeight: '800', color: colors.accentText },

  sag: { flexDirection: 'row', alignItems: 'center', gap: spacing.s8 },
  price: { fontSize: type.subhead, fontWeight: '700', color: colors.text },
  priceDim: { fontSize: type.subhead, color: colors.text3 },
  remove: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
