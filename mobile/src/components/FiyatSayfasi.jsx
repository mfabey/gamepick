// ─────────────────────────────────────────────────────────────────────────────
// Mağaza fiyatları sayfası — Reels'teki oyun aksesuarına dokununca açılıyor
// (Canlı Çubuk, 26 Eyl tasarımı). "Satın al" rayda ayrı bir düğmeydi ve tek
// mağazaya (Steam) gidiyordu; artık bütün mağazalar tek bakışta, en ucuzu
// başta. Fiyatlar yalnız sayfa AÇIKKEN çekiliyor (`enabled`).
// ─────────────────────────────────────────────────────────────────────────────
import { View, Pressable, StyleSheet, Modal, ScrollView, Text, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';

import { Button, Txt } from './ui/Primitives';
import { DiscountTag } from './ui/Commerce';
import { useGamePrices } from '../hooks/useGamePrices';
import { useLanguage } from '../context/LanguageContext';
import { useDesignTheme } from '../theme/useDesignTheme';
import { useStyles } from '../context/ThemeContext';
import { SHEET_LAYOUT } from '../theme';
import { component as K, layout, priceStyle, radius as dsRadius, shadow, space } from '../theme/tokens';

const F = K.filterSheet;

export default function FiyatSayfasi({ visible, onClose, oyun }) {
  const styles = useStyles(makeStyles);
  const { colors } = useDesignTheme();
  const { t, formatPrice, formatStoreAt } = useLanguage();
  const insets = useSafeAreaInsets();
  const { stores, loaded } = useGamePrices({
    queryKey: `reels:${oyun?.appid || oyun?.id || ''}`,
    appid: oyun?.appid, title: oyun?.name, name: oyun?.name, slug: '', steamUrl: oyun?.steamUrl,
    enabled: !!visible && !!oyun,
  });
  const en = stores[0] || null;
  const ac = (url) => { if (url) WebBrowser.openBrowserAsync(url); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('a11y.close')}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.bg2, paddingBottom: insets.bottom + space[12] }]} onPress={() => {}}>
          <View style={[styles.grabber, { backgroundColor: colors.text3 }]} />
          <View style={styles.head}>
            <Image source={oyun?.image || undefined} style={[styles.kapak, { backgroundColor: colors.surface2 }]} contentFit="cover" cachePolicy="memory-disk" />
            <View style={styles.esnek}>
              <Txt variant="headline" numberOfLines={1} accessibilityRole="header">{oyun?.name}</Txt>
              <Txt variant="footnote" style={{ color: colors.text2 }}>{t('bar.prices')}</Txt>
            </View>
          </View>

          <ScrollView style={styles.liste} contentContainerStyle={styles.listeIc}>
            {!loaded && stores.length === 0 ? (
              <View style={styles.bos}><ActivityIndicator color={colors.text2} /></View>
            ) : stores.length === 0 ? (
              <Txt variant="footnote" style={[styles.bosMetin, { color: colors.text2 }]}>{t('v2.noPrices')}</Txt>
            ) : (
              <View style={[styles.grup, { backgroundColor: colors.surface1 }]}>
                {stores.map((s, i) => (
                  <Pressable key={s.key} accessibilityRole="link" onPress={() => ac(s.url)} disabled={!s.url}
                    style={({ pressed }) => [styles.satir, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }, pressed && { opacity: 0.6 }]}>
                    <Txt variant="bodyLarge" numberOfLines={1} style={[styles.esnek, { color: colors.text }]}>{s.name}</Txt>
                    {!s.isFree && s.discount > 0 ? <DiscountTag percent={s.discount} size="xs" /> : null}
                    <Text allowFontScaling={false} style={priceStyle(16, colors.text)}>{s.isFree ? t('card.free') : formatPrice(s.price)}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>

          {en?.url ? (
            <Button title={t('v2.cheapestAt').replace('{at}', formatStoreAt(en.name))} iconRight="ext" height={52}
              onPress={() => ac(en.url)} style={styles.cta} />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Karartma eski temadan (`colors.overlay`) — FilterSheet'le aynı kaynak.
const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    ...SHEET_LAYOUT,
    borderTopLeftRadius: dsRadius.sheet, borderTopRightRadius: dsRadius.sheet,
    boxShadow: shadow.sheet,
    maxHeight: '80%',
  },
  grabber: { alignSelf: 'center', width: F.grabberWidth, height: F.grabberHeight, borderRadius: F.grabberRadius, marginTop: F.grabberTop },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: layout.gutter, paddingTop: space[16], paddingBottom: space[12] },
  kapak: { width: 48, height: 48, borderRadius: 12 },
  esnek: { flex: 1, minWidth: 0 },
  liste: { flexGrow: 0 },
  listeIc: { paddingHorizontal: layout.gutter, paddingBottom: space[12] },
  grup: { borderRadius: dsRadius.group, overflow: 'hidden' },
  satir: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space[8], paddingHorizontal: space[16] },
  bos: { height: 120, alignItems: 'center', justifyContent: 'center' },
  bosMetin: { textAlign: 'center', paddingVertical: space[24] },
  cta: { marginHorizontal: layout.gutter },
});
