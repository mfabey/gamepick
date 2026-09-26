import { memo, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Alert, Linking } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { fetchCardPrice } from '../src/api/games';
import EmptyState from '../src/components/EmptyState';
import { Icon } from '../src/components/Icon';
import { CoverImage, IconButton, PressableScale, Txt } from '../src/components/ui/Primitives';
import { NavBar } from '../src/components/ui/Navigation';
import { DiscountTag, OldPrice, Price, StoreBadge } from '../src/components/ui/Commerce';
import { useYanBosluk } from '../src/hooks/useIcerikAlani';
import { useStyles } from '../src/context/ThemeContext';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { component as K, layout, radius, space } from '../src/theme/tokens';
import { useLanguage } from '../src/context/LanguageContext';
import { pushHataAnahtari } from '../src/notifications';
import { useWishlist } from '../src/context/WishlistContext';
import ProfileGate from '../src/components/ProfileGate';

// ─────────────────────────────────────────────────────────────────────────────
// İSTEK LİSTESİ — G-09 (kit s2.py wishlist()).
//
// SATIR BU EKRANA ÖZEL, ortak `GameRow` DEĞİL. GameRow üç ekranı besliyor
// (istek listesi · liste · koleksiyon) ve kit üçüne farklı satır veriyor;
// ortak bileşeni bu ekran için büyütmek diğer ikisini de sessizce oynatırdı.
// Kitin satırı: 112 yükseklik, 62×84 kapak, ad 16/21/600, mağaza rozeti,
// fiyat satırı (17 + 12 üstü çizili + indirim).
//
// ── KİTTE OLUP BURADA ÇİZİLMEYENLER ──
//   · ÖZET KARTI ("Bu hafta 4 oyunun fiyatı düştü · ₺1.250 tasarruf") ve
//     satırdaki DEĞİŞİM NOTU ("₺100 düştü" / "Fiyat değişmedi" / "₺50
//     arttı"): üçü de fiyat GEÇMİŞİ ister. Sunucu geçmiş tutmuyor — bugünkü
//     fiyatı dünküyle karşılaştıramıyoruz ve "değişmedi" demek de bir iddia.
//   · SATIR BAŞINA ZİL: fiyat alarmı uygulamada oyun başına değil, liste
//     geneli (`enableNotifications`). Zil çizilse her satır kendi alarmını
//     vaat ederdi. Genel anahtar listenin üstündeki bantta duruyor.
//   · SIRALAMA ÇİPLERİ (Fiyat · İndirim · Çıkış tarihi): fiyatlar satır
//     satır ve GEÇ geliyor (her kart kendi isteğini yapıyor); henüz
//     yüklenmemiş bir alana göre sıralama listeyi rastgele karıştırırdı.
//   · ÇIKIŞ TARİHİ satırı: istek listesi kaydı çıkış tarihi taşımıyor.
//
// Sağdaki eylem KALDIR: kitin zilinin yerinde duruyor ve bu listenin tek
// gerçek satır eylemi o.
// ─────────────────────────────────────────────────────────────────────────────

const W = K.wishlist;

export default function WishlistScreen() {
  const { t } = useLanguage();
  return (
    <ProfileGate title={t('wishlist.title')}>
      <WishlistScreenContent />
    </ProfileGate>
  );
}

function WishlistScreenContent() {
  const styles = useStyles(makeStyles);
  const yan = useYanBosluk();
  const insets = useSafeAreaInsets();
  const { colors } = useDesignTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const { items, remove, enabled, enableNotifications } = useWishlist();

  const onEnable = async () => {
    const r = await enableNotifications();
    if (r.error) {
      if (r.error === 'permission-denied') {
        Alert.alert(
          t('notif.title'),
          t('notif.permissionDeniedDesc'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.openSettings'), onPress: () => Linking.openSettings() },
          ]
        );
      } else {
        const msg = t(pushHataAnahtari(r.error));
        Alert.alert(t('notif.title'), msg);
      }
    }
  };

  // FlashList için stabil referanslar
  const keyExtractor = useCallback((item) => String(item.id), []);
  const handleOpen = useCallback((it) => router.push({
    pathname: '/game/[id]',
    params: { id: String(it.id), name: it.name, image: it.image || '', slug: it.slug || '', hasSteam: it.hasSteam ? '1' : '' },
  }), [router]);
  const renderWish = useCallback(({ item, index }) => (
    <WishRow item={item} ilk={index === 0} onOpen={handleOpen} onRemove={remove} />
  ), [handleOpen, remove]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Başlık listenin DIŞINDA: içerik kolonuyla aynı hizaya getiriliyor —
          başlık tam genişlikte kalsaydı sayfanın adı ile anlattığı şey iki
          ayrı sütunda dururdu. Alt başlık kitten: "{n} oyun".

          KİTTEKİ SÜZGEÇ DÜĞMESİ YOK: bu listede süzülecek bir alan yok
          (tür/platform verisi kayıtta durmuyor) ve boş bir sayfa açan düğme
          olmaz. */}
      <View style={{ marginHorizontal: yan }}>
        <NavBar
          title={t('wishlist.title')}
          subtitle={items.length ? `${items.length} ${t('wishlist.count')}` : undefined}
          onBack={() => router.back()}
          backLabel={t('a11y.back')}
        />
      </View>

      {items.length === 0 ? (
        <EmptyState
          icon="bookmark"
          title={t('wishlist.empty')}
          text={t('wishlist.emptyDesc')}
          actionLabel={t('wishlist.explore')}
          actionIcon="tag"
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
          contentContainerStyle={{ paddingBottom: insets.bottom + space[32], paddingHorizontal: yan }}
          // Sabit yükseklikli satır → tahmin değil ÖLÇÜ (kit: 112).
          estimatedItemSize={W.row}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            !enabled ? (
              <PressableScale onPress={onEnable} accessibilityRole="button"
                style={[styles.bant, { backgroundColor: colors.greenTint }]}>
                <View style={[styles.bantIkon, { backgroundColor: colors.green }]}>
                  <Icon name="bell" size={K.prices.alert.glyph} color={colors.onGreen} />
                </View>
                <View style={styles.flex}>
                  <Txt variant="cardTitle" numberOfLines={2}>{t('notif.desc')}</Txt>
                  <Txt variant="footnote" style={{ color: colors.text2 }}>{t('notif.enable')}</Txt>
                </View>
              </PressableScale>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Satır — kit wishlist() rows.
//
// FİYAT SATIR SATIR ÇEKİLİYOR (kart başına bir istek): liste kaydı yalnız
// kimlik ve kapak taşıyor. Gelene kadar fiyat yerinde "…" duruyor; satırın
// yüksekliği sabit olduğu için fiyat geldiğinde liste KAYMIYOR.
// ─────────────────────────────────────────────────────────────────────────────
const WishRow = memo(function WishRow({ item, ilk, onOpen, onRemove }) {
  const styles = useStyles(makeStyles);
  const { colors } = useDesignTheme();
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
  const indirim = Number(price?.discount) || 0;
  // Eski fiyat YALNIZCA indirim varken: indirimsiz oyunda `original` fiyata
  // eşit geliyor ve üstü çizili aynı sayıyı yazmak yanlış bir iddia olurdu.
  const eski = indirim > 0 && price?.original > price?.price ? price.original : null;

  return (
    <PressableScale
      onPress={() => onOpen(item)}
      accessibilityRole="button"
      accessibilityLabel={item.name}
      style={styles.satir}
    >
      {/* Ayraç MUTLAK KONUMLU (kit: left 96, right 20): satırın kenarlığı
          olsaydı `marginLeft` bütün satırı içeri iterdi. */}
      {ilk ? null : <View style={[styles.ayirici, { backgroundColor: colors.line }]} />}

      <CoverImage source={item.image} radius={W.coverRadius}
                  style={{ width: W.coverWidth, height: W.coverHeight }} />

      <View style={styles.flex}>
        <Txt variant="cardTitleLarge" numberOfLines={2}>{item.name}</Txt>
        {price?.storeName ? (
          <View style={styles.magaza}><StoreBadge store={price.storeName} withName /></View>
        ) : null}

        <View style={styles.fiyat}>
          {isFree ? (
            <Txt variant="subhead">{t('card.free')}</Txt>
          ) : price?.price != null ? (
            <>
              <Price value={formatPrice(price.price)} size={17} />
              {eski ? <OldPrice value={formatPrice(eski)} size={12} /> : null}
              {indirim > 0 ? <DiscountTag percent={indirim} /> : null}
            </>
          ) : (
            <Txt variant="subheadRegular" style={{ color: colors.text3 }}>…</Txt>
          )}
        </View>
      </View>

      {/* Kitin zilinin yerinde: bu listenin tek gerçek satır eylemi.
          İKON KALP, çöp kutusu DEĞİL: 2.0 ikon setinde çöp kutusu yok ve
          oyun bu listeye zaten kalple ekleniyor — aynı düğme, aynı anlam,
          geri alınabilir bir eylem. */}
      <IconButton icon="heart" label={t('a11y.delete')} iconSize={W.actionIcon}
                  color={colors.red} fill={colors.red} onPress={() => onRemove(item.id)} />
    </PressableScale>
  );
});

const makeStyles = () => StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },

  satir: {
    height: W.row, paddingHorizontal: layout.gutter, gap: W.gap,
    flexDirection: 'row', alignItems: 'center',
  },
  // Ayraç METİN SÜTUNUNDAN başlıyor (kit: left 96): kapağın altından geçen
  // bir çizgi satırları değil kapakları ayırıyormuş gibi durur.
  ayirici: {
    position: 'absolute', top: 0, left: W.separatorLeft, right: layout.gutter,
    height: StyleSheet.hairlineWidth,
  },

  magaza: { marginTop: W.textGap, flexDirection: 'row' },
  fiyat: { height: W.priceRow, marginTop: W.textGap, flexDirection: 'row', alignItems: 'center', gap: W.priceGap },

  // Kenar payı ŞART: liste satırları kendi dolgusunu taşıyor ama liste
  // kabının yatay dolgusu yok, bant kenarlara yapışıyordu (cihazda görüldü).
  // Kitin özet kartı da `margin: 0 20px` ile duruyor.
  bant: {
    marginHorizontal: layout.gutter, marginBottom: space[8],
    padding: K.prices.alert.padding, borderRadius: radius.lg,
    flexDirection: 'row', alignItems: 'center', gap: K.prices.alert.gap,
  },
  bantIkon: {
    width: K.prices.alert.icon, height: K.prices.alert.icon, borderRadius: K.prices.alert.icon / 2,
    alignItems: 'center', justifyContent: 'center',
  },
});
