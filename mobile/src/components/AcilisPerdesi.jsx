// ─────────────────────────────────────────────────────────────────────────────
// AÇILIŞ PERDESİ = G-02 TANITIM (27 Eyl, kaynak/G-02-Onboarding)
//
// İlk açılışta bir kez, sekmelerin üstünde (bkz. (tabs)/_layout, perde.js).
// Eski sürüm üç cümleyi sırayla gösteren kendiliğinden ilerleyen bir örtüydü;
// 2.0 tanıtımı tek sayfa: oyun kapağı kolajı + indirim etiketleri + "fiyatı
// düştü" bildirimi, başlık, açıklama, 3 adım noktası (tanıtım · ilgi
// alanları · giriş), "Devam et" ve "Zaten hesabım var".
//
// KOLAJ GERÇEK VERİ. Tasarımdaki kapaklar örnek; burada indirimdeki oyunlar
// (/api/games?section=sale). Etiketlerdeki indirim ve bildirimdeki fiyat da
// o oyunların GERÇEK değerleri — uydurma bir "Hades II ₺499" yok. Veri
// gelmezse kapaklar nötr yüzey, bildirim hiç çizilmiyor.
//
// "Atla" İLK KAREDEN ORADA: kullanıcı tanıtımı her an geçebilmeli.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Pressable, StyleSheet, Animated, Easing, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { Button, Txt } from './ui/Primitives';
import { DiscountTag } from './ui/Commerce';
import { PageDots } from './ui/Navigation';
import { useDesignTheme } from '../theme/useDesignTheme';
import { useLanguage } from '../context/LanguageContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useQuery } from '../hooks/useQuery';
import { fetchGames } from '../api/games';
import { posterImage } from '../utils/images';
import { component as K, layout, radius, shadow, space } from '../theme/tokens';

const O = K.onboarding;

const PERDE_CIKIS = 320;
const KART_G = 110;
const KART_Y = 150;
// Kaynak: üç sütunun sol/üst konumu (390 pt kanvasta).
const SUTUNLAR = [{ sol: 20, ust: 30 }, { sol: 140, ust: -40 }, { sol: 260, ust: 50 }];
const KOLAJ_Y = 420;

/** '#0A0A0B' → 'rgba(10,10,11,0)' — degradenin saydam ucu zeminle aynı ton. */
function saydam(hex) {
  const h = String(hex).replace('#', '');
  if (h.length !== 6) return 'transparent';
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},0)`;
}

export default function AcilisPerdesi({ onDone }) {
  const { colors } = useDesignTheme();
  const { t, formatPrice, formatDiscount } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const azalt = useReducedMotion();
  const opak = useRef(new Animated.Value(azalt ? 1 : 0)).current;
  const bitti = useRef(false);

  const { data } = useQuery('onb:sale', () => fetchGames({ section: 'sale', num: 12 }), { ttl: 60 * 60 * 1000 });
  const oyunlar = useMemo(() => (data?.results || []).filter((g) => g?.image), [data]);
  const kapak = (i) => oyunlar[i] || null;
  const bildirim = useMemo(() => oyunlar.find((g) => g.discount > 0 && g.price != null) || null, [oyunlar]);

  useEffect(() => {
    if (azalt) return;
    Animated.timing(opak, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [azalt, opak]);

  const kapat = useCallback((sonra) => {
    if (bitti.current) return;
    bitti.current = true;
    Animated.timing(opak, {
      toValue: 0, duration: azalt ? 0 : PERDE_CIKIS, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start(() => { onDone?.(); sonra?.(); });
  }, [onDone, opak, azalt]);

  // Kolaj 390 pt kanvasta tasarlandı: daha geniş ekranda ortalanıyor,
  // dar ekranda (375) sağ sütun kenara 5 pt yaklaşıyor — kırpılmıyor.
  const kaydir = Math.max(0, (width - 390) / 2) - Math.max(0, 390 - width) / 2;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.perde, { backgroundColor: colors.bg, opacity: opak }]} accessibilityViewIsModal>
      <View style={[styles.kolaj, { marginTop: insets.top }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {SUTUNLAR.map((s, si) => (
          <View key={si} style={[styles.sutun, { left: s.sol + kaydir, top: s.ust }]}>
            {[0, 1, 2].map((ri) => {
              const g = kapak(si * 3 + ri);
              return (
                <View key={ri} style={[styles.kart, { backgroundColor: colors.surface2 }]}>
                  {g ? <Image source={posterImage(g.image)} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} /> : null}
                </View>
              );
            })}
          </View>
        ))}
        {/* Kaynaktaki iki indirim etiketi: sol sütunun ilk kartı, sağ sütunun ilki. */}
        {kapak(0)?.discount > 0 ? <DiscountTag percent={kapak(0).discount} style={[styles.etiket, { left: 30 + kaydir, top: 146 }]} /> : null}
        {kapak(6)?.discount > 0 ? <DiscountTag percent={kapak(6).discount} style={[styles.etiket, { left: 270 + kaydir, top: 204 }]} /> : null}
        <LinearGradient colors={[saydam(colors.bg), colors.bg]} locations={[0, 0.88]} style={styles.solma} />
        {bildirim ? (
          <View style={[styles.bildirim, { backgroundColor: colors.surface1, boxShadow: shadow.popover }]}>
            <Image source={posterImage(bildirim.image)} style={styles.bildirimKapak} contentFit="cover" cachePolicy="memory-disk" />
            <View style={styles.esnek}>
              <Txt variant="subhead" numberOfLines={1} style={{ fontWeight: '600', color: colors.text }}>
                {t('onb.priceDropped').replace('{name}', bildirim.name)}
              </Txt>
              <Txt variant="footnote" numberOfLines={1} style={{ color: colors.green }}>
                {`${formatPrice(bildirim.price)} · ${formatDiscount(bildirim.discount)}`}
              </Txt>
            </View>
            <Txt variant="caption" style={{ color: colors.text3 }}>{t('onb.now')}</Txt>
          </View>
        ) : null}
      </View>

      <Pressable onPress={() => kapat()} hitSlop={8} accessibilityRole="button"
        style={[styles.atla, { top: insets.top }]}>
        <Txt variant="input" style={{ color: colors.text2 }}>{t('onb.skip')}</Txt>
      </Pressable>

      <View style={styles.metinler}>
        <Txt variant="display" accessibilityRole="header">{t('onb.title')}</Txt>
        <Txt variant="body" style={[styles.aciklama, { color: colors.text2 }]}>{t('onb.desc')}</Txt>
        <PageDots count={3} active={0} style={styles.noktalar} />
      </View>

      <View style={[styles.eylemler, { paddingBottom: insets.bottom + space[12] }]}>
        <Button title={t('onb.continue')} height={52}
          onPress={() => kapat(() => router.push({ pathname: '/ilgiler', params: { kaynak: 'tanitim' } }))} />
        <Button title={t('onb.haveAccount')} variant="tertiary" height={44}
          onPress={() => kapat(() => router.push('/account'))} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  perde: { zIndex: 30, elevation: 32 },
  kolaj: { height: KOLAJ_Y, overflow: 'hidden' },
  sutun: { position: 'absolute', gap: O.cardGap },
  kart: { width: KART_G, height: KART_Y, borderRadius: radius.card, overflow: 'hidden' },
  etiket: { position: 'absolute' },
  solma: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 190 },
  bildirim: {
    position: 'absolute', left: 40, right: 40, top: 300, height: 64, borderRadius: 18,
    flexDirection: 'row', alignItems: 'center', gap: O.notifGap, paddingLeft: O.notifPadL, paddingRight: O.notifPadR,
  },
  bildirimKapak: { width: 44, height: 44, borderRadius: 11 },
  esnek: { flex: 1, minWidth: 0 },
  atla: { position: 'absolute', right: space[12], height: 44, paddingHorizontal: space[12], justifyContent: 'center' },
  metinler: { paddingHorizontal: space[24], marginTop: space[8] },
  aciklama: { marginTop: space[12] },
  noktalar: { marginTop: O.dotsTop, alignSelf: 'flex-start' },
  eylemler: { position: 'absolute', left: layout.gutter, right: layout.gutter, bottom: 0, gap: O.actionsGap },
});
