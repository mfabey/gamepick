import { View, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { Button, Txt } from './ui/Primitives';
import { useDesignTheme } from '../theme/useDesignTheme';
import { useLanguage } from '../context/LanguageContext';
import { useCevrimdisi } from '../hooks/useCevrimdisi';
import { agTazele } from '../services/net';
import { bagilZaman } from '../utils/relativeTime';
import { radius, space } from '../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// ÇEVRİMDIŞI BANDI — gösterilen içeriğin BAYAT olduğunu söyleyen tek satır.
//
// ── NEDEN VAR ──
// Aşama 1 önbelleği diskte kalıcı hâle getirdi; uçak modunda anasayfa, haber,
// detay ve kütüphane artık dolu geliyor. Ama LimitedMode'un başındaki kural
// burada da geçerli ve tersten işliyor: "sessiz başarısızlık yasak" ise BAYAT
// VERİYİ TAZE GİBİ GÖSTERMEK de yasak. Kullanıcı iki gün önceki fiyatı
// bugünün fiyatı sanmamalı.
//
// ── ÜÇ SESSİZLİK KURALI ──
//
//  1. VERİ YOKSA BANT YOK (`!ts`). Bant, içeriği ETİKETLEMEK için var. İçerik
//     yoksa ekranın kendi boş/hata durumu konuşur; ikisi üst üste binerse
//     kullanıcı aynı şeyi iki kez okur.
//  2. ÇEVRİMİÇİYKEN VE HATA YOKKA BANT YOK. Bayatlık tek başına haber değil —
//     her ekran zaten arka planda tazeliyor (SWR); TTL'i yeni geçmiş bir liste
//     için uyarı basmak gürültü olur.
//  3. İKİ AYRI CÜMLE. "Çevrimdışısın" ile "Bağlanılamadı" aynı şey değil:
//     birincisinde kullanıcı uçak modunu kapatabilir, ikincisinde yapabileceği
//     bir şey yok ve sorun bizde olabilir. net.js'in `isConnected` kararı bu
//     ayrımı taşıyor.
//
// ── ZAMANI SUNUCU DEĞİL BURASI SÖYLÜYOR ──
// `bagilZaman` haber şeridinde de kullanılan yardımcı; 7 günden eskisinde
// `null` dönüyor. Bu bir eksiklik değil, sınırla ÖRTÜŞÜYOR: queryCache
// 7 günden (OFFLINE_MAX_AGE) eski kaydı zaten geri yüklemiyor.
// ─────────────────────────────────────────────────────────────────────────────
//
// 2.0 / G-DS-4 "Hata · Satır içi" (27 Eyl): son bilinen veriyi göster, suçlama
// yok. surface1 kutu, turuncu ikon (wifioff / alert), ikincil metin, sağda
// üçüncül "Tekrar dene". Eski sürüm eski temanın kenarlıklı kartıydı.

/**
 * @param {number}  ts        önbellekteki verinin zaman damgası (epoch ms)
 * @param {boolean} [hata]    çevrimiçiyken istek düştü mü
 * @param {func}    [onRetry] tazeleme — ağ yeniden ÖLÇÜLDÜKTEN sonra çağrılır
 * @param {object}  [style]   yerleşim payı. DOLGU DEĞİL KENAR PAYI verilmeli:
 *   çağrı yerleri bandı bir dolgu View'ine sarsaydı, bant görünmezken bile o
 *   View listenin tepesinde boş bir şerit bırakırdı. Pay bandın kendisinde
 *   olunca `null` dönüşüyle birlikte o da yok oluyor.
 */
export default function CevrimdisiBant({ ts, hata = false, onRetry, style }) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const cevrimdisi = useCevrimdisi();
  if (!ts || (!cevrimdisi && !hata)) return null;
  const ne = bagilZaman(ts, t);
  return (
    <View style={[styles.bant, { backgroundColor: colors.surface1 }, style]} accessibilityRole="alert">
      <Icon name={cevrimdisi ? 'wifioff' : 'alert'} size={18} color={colors.orange} strokeWidth={2.2} />
      <Txt variant="footnote" numberOfLines={2} style={[styles.metin, { color: colors.text2 }]}>
        {cevrimdisi ? t('offline.title') : t('offline.failed')}
        {ne ? ` · ${t('offline.updated').replace('{n}', ne)}` : ''}
      </Txt>
      {onRetry ? (
        <Button title={t('common.retry')} variant="tertiary" height={32}
          onPress={() => { agTazele().finally(() => onRetry()); }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bant: {
    flexDirection: 'row', alignItems: 'center', gap: space[8],
    borderRadius: radius.card, paddingLeft: space[12], paddingRight: space[4], minHeight: 44,
  },
  metin: { flex: 1 },
});
