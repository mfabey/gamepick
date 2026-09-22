import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useLanguage } from '../../../src/context/LanguageContext';
import { useWishlist } from '../../../src/context/WishlistContext';
import { useGamePrices } from '../../../src/hooks/useGamePrices';
import { bagilZaman } from '../../../src/utils/relativeTime';
import { reportActivity } from '../../../src/api/social';
import { NavBar, StickyBottomBar, useStickyBarInset } from '../../../src/components/ui/Navigation';
import { Chip, CoverImage, IconButton, Txt } from '../../../src/components/ui/Primitives';
import { BestPriceCard, DiscountTag, StoreRow } from '../../../src/components/ui/Commerce';
import { PriceAlertCard } from '../../../src/components/ui/GameDetailParts';
import { Icon } from '../../../src/components/Icon';
import { PriceListSkeleton } from '../../../src/components/Skeleton';
import { useDesignTheme } from '../../../src/theme/useDesignTheme';
import { component as K, layout } from '../../../src/theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// FİYAT KARŞILAŞTIRMA — G-08 (kit s1.py prices()). Oyun Detayı'nın
// "N mağazanın tümünü karşılaştır" bağlantısından açılıyor.
//
// VERİ: Oyun Detayı'yla AYNI kaynak ve AYNI sorgu anahtarı (useGamePrices);
// detaydan gelindiğinde sıfır istek, iki ekran aynı sayıları gösteriyor.
//
// TASARIMIN VERİSİ OLMAYAN KISIMLARI ÇİZİLMİYOR (plan §Mock politikası,
// soru 17 — fiyat geçmişi sunucu işi):
//   • sürüm seçici ("Standart Sürüm ▾") ve platform segmenti (PC/PS/Xbox)
//   • "Rekor düşük" ve "12 aylık ortalama" kutuları, "Fiyat Geçmişi" grafiği,
//     "Son 24 saatte ₺200 düştü" notu
//   • hedef fiyat adımlayıcısı; alarm anahtarı istek listesi bildirimi
//   • "Popüler / Platform / Dijital sürüm" sıralaması; yerine gerçek veriyle
//     yapılabilen "En yüksek indirim"
//   • "KDV dahil" ve "komisyon" cümleleri: doğrulanamadı
// ─────────────────────────────────────────────────────────────────────────────
export default function PriceCompare() {
  const { id, appid, name, image, slug, hasSteam } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useDesignTheme();
  const { t, formatPrice } = useLanguage();
  const { isWatched, toggle } = useWishlist();
  const stickyInset = useStickyBarInset();
  const [siralama, setSiralama] = useState('price');

  const { stores, loaded, ts } = useGamePrices({
    queryKey: appid || slug || id,
    appid: appid || undefined,
    title: name,
    slug, name,
    steamUrl: appid ? `https://store.steampowered.com/app/${appid}` : null,
    enabled: !!(appid || name),
  });

  // Detayla aynı kimlik nesnesi (bkz. game/[id].jsx → gameObj): istek
  // listesi eşleştirmesi appid ve slug'ı da kullanıyor.
  const gameObj = useMemo(() => ({
    id, name, slug, image, rawgSlug: slug, appid: appid || null, hasSteam: hasSteam === 'true' || hasSteam === '1',
  }), [id, name, slug, image, appid, hasSteam]);
  const watched = isWatched(gameObj);
  const alarmDegistir = useCallback(() => {
    const ekle = !watched;
    Haptics.impactAsync(ekle ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    toggle(gameObj);
    // Detaydaki gibi: yalnız EKLEME arkadaş akışına düşüyor.
    if (ekle) reportActivity({ type: 'wishlist', gameId: String(id), gameName: name || '', gameImage: image || '' });
  }, [watched, toggle, gameObj, id, name, image]);

  const best = stores[0] || null;
  const sirali = useMemo(
    () => (siralama === 'discount' ? [...stores].sort((a, b) => (b.discount || 0) - (a.discount || 0)) : stores),
    [stores, siralama]
  );
  const open = (url) => { if (url) WebBrowser.openBrowserAsync(url); };
  const yaz = (s) => (s.isFree ? t('card.free') : formatPrice(s.price));
  const guncel = ts ? bagilZaman(ts, t) : null;
  const indirimde = !!best && !best.isFree && best.discount > 0 && best.original > best.price;

  return (
    <SafeAreaView edges={['top']} style={[s.root, { backgroundColor: colors.bg }]}>
      <NavBar title={t('v2.priceCompare')} onBack={() => router.back()} border
        right={<IconButton icon="bell" label={t('v2.priceAlert')} selected={watched} fill={watched ? colors.red : undefined} onPress={alarmDegistir} />} />
      <ScrollView contentContainerStyle={{ paddingBottom: (best ? stickyInset : 0) + layout.sectionGap }} showsVerticalScrollIndicator={false}>
        <View style={[s.pad, s.header]}>
          <CoverImage source={image || undefined} radius={K.prices.thumbRadius} style={s.thumb} />
          <Txt variant="headline" numberOfLines={2} style={s.flex}>{name}</Txt>
        </View>

        {best ? (
          <View style={s.cardTop}>
            <BestPriceCard store={best.name} price={yaz(best)}
              oldPrice={indirimde ? formatPrice(best.original) : undefined} discount={indirimde ? best.discount : undefined}
              updated={guncel ? t('v2.updatedAgo').replace('{time}', guncel) : undefined}
              actionLabel={t('v2.goToStore')} onAction={() => open(best.url)} footnote={t('v2.checkoutNote')} />
          </View>
        ) : !loaded ? (
          <View style={[s.pad, s.cardTop]}><PriceListSkeleton /></View>
        ) : (
          <Txt variant="subheadRegular" style={[s.pad, s.cardTop, { color: colors.text2 }]}>{t('v2.noPrices')}</Txt>
        )}

        <View style={[s.pad, s.alertTop]}>
          <PriceAlertCard on={watched} onChange={alarmDegistir} title={t('v2.priceAlert')} description={t('v2.priceAlertDesc')} />
        </View>

        {stores.length > 0 ? (
          <View style={s.storesTop}>
            <View style={[s.pad, s.storesHead]}>
              <Txt variant="title2" accessibilityRole="header">{t('v2.allStores')}</Txt>
              <Txt variant="footnote" style={[s.num, { color: colors.text2 }]}>{t('v2.storeCount').replace('{n}', String(stores.length))}</Txt>
            </View>
            {stores.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsTop} contentContainerStyle={s.chips}>
                <Chip title={t('v2.sortLowest')} icon="sort" selected={siralama === 'price'} onPress={() => setSiralama('price')} />
                <Chip title={t('v2.sortDiscount')} selected={siralama === 'discount'} onPress={() => setSiralama('discount')} />
              </ScrollView>
            ) : null}
            <View style={[s.list, { backgroundColor: colors.surface1 }]}>
              {sirali.map((st, i) => {
                const enIyi = st.key === best.key;
                const fark = !st.isFree && !best.isFree && st.price != null && best.price != null ? st.price - best.price : 0;
                return (
                  <StoreRow key={st.key} store={st.name} name={st.name} price={yaz(st)} separator={i > 0} onPress={() => open(st.url)}
                    right={enIyi
                      ? (st.discount > 0 ? <DiscountTag percent={st.discount} size="xs" /> : null)
                      : fark > 0 ? <Txt variant="caption" style={[s.num, { color: colors.text3 }]}>{`+${formatPrice(fark)}`}</Txt> : null} />
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={[s.pad, s.trust]}>
          <Icon name="shield" size={K.prices.trustIcon} color={colors.text2} />
          <Txt variant="caption" style={[s.flex, { color: colors.text3 }]}>{t('v2.trustNote')}</Txt>
        </View>
      </ScrollView>

      {best ? (
        <StickyBottomBar price={yaz(best)} subtitle={`${best.name} · ${t('v2.bestPriceShort')}`}
          actionLabel={t('v2.goToStore')} onAction={() => open(best.url)} disabled={!best.url} />
      ) : null}
    </SafeAreaView>
  );
}

const P = K.prices;
const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  num: { fontVariant: ['tabular-nums'] },
  pad: { paddingHorizontal: layout.gutter },
  header: { height: P.headerHeight, marginTop: P.headerTop, flexDirection: 'row', alignItems: 'center', gap: P.headerGap },
  thumb: { width: P.thumbWidth, height: P.thumbHeight },
  cardTop: { marginTop: P.cardTop },
  alertTop: { marginTop: P.alertTop },
  storesTop: { marginTop: P.storesTop },
  storesHead: { height: P.storesHead, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipsTop: { marginTop: P.chipsTop },
  chips: { paddingHorizontal: layout.gutter, gap: K.rail.friend[0] },
  list: { marginTop: P.listTop, marginHorizontal: layout.gutter, paddingVertical: P.listPaddingV, borderRadius: P.listRadius, overflow: 'hidden' },
  trust: { marginTop: P.trustTop, flexDirection: 'row', gap: P.trustGap },
});
