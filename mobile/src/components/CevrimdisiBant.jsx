import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useStyles, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useCevrimdisi } from '../hooks/useCevrimdisi';
import { agTazele } from '../services/net';
import { bagilZaman } from '../utils/relativeTime';
import { type, radius, spacing, PRESSED } from '../theme';

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
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const cevrimdisi = useCevrimdisi();

  if (!ts || (!cevrimdisi && !hata)) return null;

  const ne = bagilZaman(ts, t);

  return (
    <View style={[styles.bant, style]} accessibilityRole="alert">
      <Ionicons
        name={cevrimdisi ? 'cloud-offline-outline' : 'alert-circle-outline'}
        size={16}
        color={colors.text3}
      />
      <Text style={styles.metin} numberOfLines={1}>
        {cevrimdisi ? t('offline.title') : t('offline.failed')}
        {ne ? ` · ${t('offline.updated').replace('{n}', ne)}` : ''}
      </Text>
      {onRetry ? (
        // Önce AĞ YENİDEN ÖLÇÜLÜYOR, sonra tazeleniyor: kullanıcı düğmeye
        // bastığında bağlantı geri gelmiş ama sistem olayı henüz düşmemiş
        // olabilir. Ölçmeden tazeleseydik queryCache hâlâ "çevrimdışı" sanıp
        // isteği atlar, düğme hiçbir şey yapmamış görünürdü.
        <Pressable
          onPress={() => { agTazele().finally(() => onRetry()); }}
          hitSlop={12}
          accessibilityRole="button"
          style={({ pressed }) => [pressed && PRESSED]}
        >
          <Text style={styles.eylem}>{t('common.retry')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  // Nötr yüzey, marka rengi DEĞİL: bu bir durum bildirimi, bir çağrı değil.
  // Kırmızı bütçesi "içerik katmanında bir tane" diyor (bkz. theme.js) ve o
  // bütçe bandın üstündeki içeriğe ait.
  bant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.s8,
  },
  // text2/card çifti kontrast denetiminin kapsadığı kombinasyon (≥4.5).
  metin: { flex: 1, color: colors.text2, fontSize: type.footnote },
  // Dokunma alanı yükseklikle DEĞİL hitSlop ile büyütülüyor: bant tek satır
  // ve 44pt'lik bir düğme onu iki katına çıkarıp listenin tepesini yerdi.
  eylem: { color: colors.accentText, fontSize: type.footnote, fontWeight: '700' },
});
