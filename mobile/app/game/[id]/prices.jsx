import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useLanguage } from '../../../src/context/LanguageContext';
import { useWishlist } from '../../../src/context/WishlistContext';
import { useGamePrices } from '../../../src/hooks/useGamePrices';
import { bagilZaman } from '../../../src/utils/relativeTime';
import { reportActivity } from '../../../src/api/social';
import { NavBar } from '../../../src/components/ui/Navigation';
import { useCubukSahibi } from '../../../src/services/canliCubuk';
import { BildirimKapsulu, FiyatAksesuari, KucukCubuk, SekmeDairesi, useCubukGeometri, useKucukCubukBoslugu } from '../../../src/components/navigation/CanliCubuk';
import { Chip, CoverImage, IconButton, Segmented, Txt } from '../../../src/components/ui/Primitives';
import { BestPriceCard, DiscountTag, PriceChart, StoreRow } from '../../../src/components/ui/Commerce';
import { useQuery } from '../../../src/hooks/useQuery';
import { fetchPriceHistory } from '../../../src/api/games';
import { hedefAdimi, onerilenHedef, ortalama, seriOrnekle, sonDusus } from '../../../src/services/fiyatGecmisi';
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
// FİYAT GEÇMİŞİ (27 Eyl, sunucu /api/price-history — ITAD günlüğü):
// "Rekor düşük" + "12 aylık ortalama" kutuları, 3A/6A/1Y/Tümü grafiği,
// "Son 24 saatte ₺200 düştü" notu ve hedef fiyat adımlayıcısı artık gerçek
// veriyle. Geçmiş gelmezse (sunucu eski, ITAD oyunu bulamadı) bu bölümler
// ÇİZİLMİYOR — sahte veri yok.
//
// HÂLÂ ÇİZİLMEYENLER (verisi yok):
//   • sürüm seçici ("Standart Sürüm ▾") ve platform segmenti (PC/PS/Xbox)
//   • "Popüler / Platform / Dijital sürüm" sıralaması; yerine gerçek veriyle
//     yapılabilen "En yüksek indirim"
//   • "KDV dahil" ve "komisyon" cümleleri: doğrulanamadı
// ─────────────────────────────────────────────────────────────────────────────
export default function PriceCompare() {
  const { id, appid, name, image, slug, hasSteam } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useDesignTheme();
  const { t, lang, locale, rate, formatPrice, formatPercent } = useLanguage();
  const { isWatched, toggle, setTarget, targetOf } = useWishlist();
  const { width: pencere } = useWindowDimensions();
  const [aralik, setAralik] = useState('1y');
  // Canlı Çubuk: daire + fiyat kapsülünün kapladığı alan (oyun detayıyla aynı).
  const cubukBoslugu = useKucukCubukBoslugu(0);
  const cubukG = useCubukGeometri();
  const [siralama, setSiralama] = useState('price');
  // Canlı Çubuk: odaktayken fiyat/mesaj olayları afiş yerine kapsülde.
  const [odakta, setOdakta] = useState(true);
  useFocusEffect(useCallback(() => { setOdakta(true); return () => setOdakta(false); }, []));
  useCubukSahibi(odakta);

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
    // Alarm açılırken fiyat biliniyorsa hedef önerisi: güncelin %80'i
    // (görüntü biriminde yuvarlak). Kullanıcı adımlayıcıyla değiştirir.
    if (ekle && best && !best.isFree && best.price > 0) {
      const g = onerilenHedef(lira ? best.price : best.price / (rate || 1), lira);
      setTimeout(() => setTarget(gameObj, Math.round(lira ? g : g * (rate || 1))), 0);
    }
    // Detaydaki gibi: yalnız EKLEME arkadaş akışına düşüyor.
    if (ekle) reportActivity({ type: 'wishlist', gameId: String(id), gameName: name || '', gameImage: image || '' });
  }, [watched, toggle, gameObj, id, name, image, best, lira, rate, setTarget]);

  // ── Fiyat geçmişi ──
  const { data: gecmis } = useQuery(`ph:${appid || name}`, () => fetchPriceHistory({ appid, title: name }),
    { ttl: 6 * 3600 * 1000, enabled: !!(appid || name) });
  const olaylar = gecmis?.available ? gecmis.events || [] : [];
  const seri = useMemo(() => seriOrnekle(olaylar, aralik), [olaylar, aralik]);
  const ort12 = useMemo(() => ortalama(olaylar, Date.now() - 365 * 24 * 3600 * 1000), [olaylar]);
  const dusus = useMemo(() => sonDusus(olaylar), [olaylar]);
  const grafikEn = pencere - layout.gutter * 2 - K.prices.history.padding * 2;
  // Ay etiketleri: en çok 6, dilimlerin ortasına (kit: Eki · Ara · Şub…).
  const etiketler = useMemo(() => {
    const n = seri.starts.length;
    if (!n) return [];
    const adim = Math.max(1, Math.ceil(n / 6));
    const bicim = aralik === '3m' || aralik === '6m' ? { day: 'numeric', month: 'short' } : aralik === 'all' ? { month: 'short', year: '2-digit' } : { month: 'short' };
    const out = [];
    for (let i = 0; i < n; i += adim) out.push({ x: (i + 0.5) * grafikEn / n, text: new Date(seri.starts[i]).toLocaleDateString(locale, bicim) });
    return out;
  }, [seri, aralik, locale, grafikEn]);

  const best = stores[0] || null;

  // ── Hedef fiyat (₺ saklanıyor, GÖRÜNTÜ biriminde adımlanıyor) ──
  const lira = lang === 'tr';
  const gorunen = (tl) => (lira ? tl : tl / (rate || 1));
  const tlYap = (g) => Math.round(lira ? g : g * (rate || 1));
  const hedefTl = targetOf(gameObj);
  const hedefDegistir = (yon) => {
    if (!best || best.price == null) return;
    const simdi = gorunen(hedefTl ?? best.price);
    const adim = hedefAdimi(simdi, lira);
    const yeni = Math.max(adim, Math.round((simdi + yon * adim) / adim) * adim);
    Haptics.selectionAsync().catch(() => {});
    setTarget(gameObj, tlYap(yeni));
  };
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
      <ScrollView contentContainerStyle={{ paddingBottom: cubukBoslugu + layout.sectionGap }} showsVerticalScrollIndicator={false}>
        <View style={[s.pad, s.header]}>
          <CoverImage source={image || undefined} radius={K.prices.thumbRadius} style={s.thumb} />
          <Txt variant="headline" numberOfLines={2} style={s.flex}>{name}</Txt>
        </View>

        {best ? (
          <View style={s.cardTop}>
            <BestPriceCard store={best.name} price={yaz(best)}
              oldPrice={indirimde ? formatPrice(best.original) : undefined} discount={indirimde ? best.discount : undefined}
              updated={guncel ? t('v2.updatedAgo').replace('{time}', guncel) : undefined}
              note={dusus && gecmis?.shop?.name === best.name ? t('v2.droppedLast24h').replace('{amount}', formatPrice(dusus)) : undefined}
              actionLabel={t('v2.goToStore')} onAction={() => open(best.url)} footnote={t('v2.checkoutNote')} />
          </View>
        ) : !loaded ? (
          <View style={[s.pad, s.cardTop]}><PriceListSkeleton /></View>
        ) : (
          <Txt variant="subheadRegular" style={[s.pad, s.cardTop, { color: colors.text2 }]}>{t('v2.noPrices')}</Txt>
        )}

        {gecmis?.available && gecmis.low ? (
          <View style={[s.pad, s.tiles]}>
            <View style={[s.tile, { backgroundColor: colors.surface1 }]}>
              <Txt variant="caption" numberOfLines={1} style={{ color: colors.text2 }}>{t('v2.recordLow')}</Txt>
              <Txt variant="title2" numberOfLines={1} style={[s.num, s.tileValue, { color: colors.green }]}>{formatPrice(gecmis.low.price)}</Txt>
              <Txt variant="caption" numberOfLines={1} style={{ color: colors.text3 }}>
                {[gecmis.low.t ? new Date(gecmis.low.t).toLocaleDateString(locale, { month: 'short', year: 'numeric' }) : null, gecmis.low.shop].filter(Boolean).join(' · ')}
              </Txt>
            </View>
            {ort12 ? (
              <View style={[s.tile, { backgroundColor: colors.surface1 }]}>
                <Txt variant="caption" numberOfLines={1} style={{ color: colors.text2 }}>{t('v2.avg12')}</Txt>
                <Txt variant="title2" numberOfLines={1} style={[s.num, s.tileValue]}>{formatPrice(Math.round(ort12))}</Txt>
                <Txt variant="caption" numberOfLines={1} style={{ color: colors.text3 }}>{(() => {
                  if (!best || best.price == null) return '';
                  const fark = Math.round((1 - best.price / ort12) * 100);
                  if (Math.abs(fark) < 3) return t('v2.atAverage');
                  return (fark > 0 ? t('v2.cheaperNow') : t('v2.pricierNow')).replace('{pct}', formatPercent(Math.abs(fark)));
                })()}</Txt>
              </View>
            ) : <View style={s.flex} />}
          </View>
        ) : null}

        {seri.values.length >= 2 ? (
          <View style={s.historyTop}>
            {/* Kit sec_head: 20/26 başlık, sağda kompakt aralık segmenti (196 pt). */}
            <View style={[s.pad, s.storesHead]}>
              <Txt variant="title2" numberOfLines={1} accessibilityRole="header" style={s.flex}>{t('v2.priceHistory')}</Txt>
              <View style={{ width: K.prices.history.segWidth }}>
                <Segmented compact value={aralik} onChange={setAralik} accessibilityLabel={t('v2.priceHistory')}
                  items={[{ value: '3m', label: t('v2.range3m') }, { value: '6m', label: t('v2.range6m') },
                    { value: '1y', label: t('v2.range1y') }, { value: 'all', label: t('v2.rangeAll') }]} />
              </View>
            </View>
            <View style={[s.historyCard, { backgroundColor: colors.surface1 }]}>
              <PriceChart values={seri.values} width={grafikEn} lowLabel={formatPrice(Math.min(...seri.values))} />
              <View style={[s.labels, { width: grafikEn }]}>
                {etiketler.map((e) => (
                  <Txt key={e.x} variant="caption" numberOfLines={1} style={[s.label, { left: e.x - 30, color: colors.text3 }]}>{e.text}</Txt>
                ))}
              </View>
            </View>
            {gecmis?.shop?.name ? (
              <Txt variant="caption" style={[s.pad, s.historyNote, { color: colors.text3 }]}>{t('v2.historyOf').replace('{store}', gecmis.shop.name)}</Txt>
            ) : null}
          </View>
        ) : null}

        <View style={[s.pad, s.alertTop]}>
          <PriceAlertCard on={watched} onChange={alarmDegistir} title={t('v2.priceAlert')}
            description={watched && hedefTl ? t('v2.priceAlertTarget') : t('v2.priceAlertDesc')}
            target={hedefTl ? formatPrice(hedefTl) : null} targetLabel={t('v2.targetPrice')}
            onDecrease={() => hedefDegistir(-1)} onIncrease={() => hedefDegistir(1)}
            decreaseLabel={t('v2.decrease')} increaseLabel={t('v2.increase')} />
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

      {/* Canlı Çubuk — oyun detayıyla aynı: daire (sekmelere dön) + fiyat kapsülü. */}
      {best ? (
        <KucukCubuk sagPay={8}>
          <FiyatAksesuari fiyat={yaz(best)} indirim={!best.isFree ? best.discount : 0}
            altYazi={`${best.name} · ${t('v2.bestPriceShort')}`}
            eylem={t('v2.goToStore')} onEylem={() => open(best.url)} disabled={!best.url} />
        </KucukCubuk>
      ) : (
        <>
          <BildirimKapsulu alt={cubukG.bottom + cubukG.mini + 8} />
          <SekmeDairesi />
        </>
      )}
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
  tiles: { marginTop: P.tile.top, flexDirection: 'row', gap: P.tile.gap },
  tile: { flex: 1, minWidth: 0, height: P.tile.height, paddingVertical: P.tile.padV, paddingHorizontal: P.tile.padH, borderRadius: P.tile.radius },
  tileValue: { marginTop: P.tile.valueTop },
  historyTop: { marginTop: P.history.top },
  historyCard: { marginTop: P.history.cardTop, marginHorizontal: layout.gutter, padding: P.history.padding, borderRadius: P.history.radius },
  labels: { height: P.history.labels, marginTop: P.history.labelsTop },
  label: { position: 'absolute', width: 60, textAlign: 'center' },
  historyNote: { marginTop: 8 },
});
