// ─────────────────────────────────────────────────────────────────────────────
// SINIRLI MOD — veri kaynağı düştüğünde gösterilen uyarı.
//
// Handoff'un en sert kuralı: "SESSİZ BAŞARISIZLIK YASAK. Bir özellik
// çalışmıyorsa kullanıcıya ADIYLA söylenir." Gerekçesi de yazılı:
// "Kullanıcı filtreyi seçip sonuç değişmezse hatayı KENDİNDE arar."
//
// ── BU VARSAYIMSAL DEĞİL, ÖLÇÜLDÜ ──
// RAWG 3 Ağustos 2026'da çöktü ve bu satırlar yazılırken hâlâ HTTP 522
// veriyor (Cloudflare ayakta, origin cevap vermiyor). Üretimde yedi ayrı
// sorgu denendi, YEDİSİ de 122 oyunluk çevrimdışı listeden döndü ve
// seçilen mağaza/puan/etiket filtrelerinin HİÇBİRİ işlemedi — hiçbir uyarı
// da yoktu.
//
// Sunucu artık `limited` ve `unavailable` alanlarını döndürüyor
// (app/api/games/route.js). Öncesinde iki yol da source:'rawg-steam-merge'
// döndürdüğü için istemci farkı anlayamıyordu.
//
// ── FİLTRELER GİZLENMİYOR, DEVRE DIŞI GÖRÜNÜYOR ──
// Kontrol listesi bunu ayrıca şart koşuyor. Gizlemek "böyle bir özellik
// yok" der; devre dışı göstermek "var ama şu an çalışmıyor" der. İkincisi
// doğru olan.
// ─────────────────────────────────────────────────────────────────────────────
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useStyles, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { type, radius, spacing, PRESSED } from '../theme';

/**
 * @param {string[]} unavailable  çalışmayan filtre adları ('store'|'metacritic'|'tags')
 * @param {func}     onRetry      "Tekrar dene"
 * @param {func}    [onDismiss]   "Yine de gez" — uyarıyı kapatır
 */
export default function LimitedMode({ unavailable = [], onRetry, onDismiss }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();

  // ADIYLA SÖYLE. Genel bir "bir şeyler ters gitti" mesajı kullanıcının
  // hatayı kendinde aramasını engellemiyor — hangi filtrenin çalışmadığı
  // tek tek yazılıyor.
  const adlar = unavailable.map((k) => t('filter.' + (k === 'metacritic' ? 'score' : k))).join(' · ');

  return (
    <View style={styles.kutu}>
      <View style={styles.baslikSatir}>
        <Ionicons name="cloud-offline-outline" size={18} color={colors.accentText} />
        <Text style={styles.baslik}>{t('limited.title')}</Text>
      </View>

      <Text style={styles.metin}>
        {t('limited.body')}
        {adlar ? ` ${t('limited.disabled')}: ${adlar}.` : ''}
      </Text>

      <View style={styles.eylemler}>
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          style={({ pressed }) => [styles.birincil, pressed && PRESSED]}
        >
          <Text style={styles.birincilMetin}>{t('limited.retry')}</Text>
        </Pressable>
        {onDismiss ? (
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            style={({ pressed }) => [styles.ikincil, pressed && PRESSED]}
          >
            <Text style={styles.ikincilMetin}>{t('limited.browse')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  // Handoff: brandWash dolgu, brandWashBorder kenarlık, yarıçap 12, dolgu 16.
  kutu: {
    backgroundColor: colors.accentBg,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radius.md,
    padding: spacing.s16,
    gap: spacing.s12,
  },
  baslikSatir: { flexDirection: 'row', alignItems: 'center', gap: spacing.s8 },
  baslik: { color: colors.text, fontSize: type.body, fontWeight: '700', flex: 1 },
  metin: { color: colors.text2, fontSize: type.footnote, lineHeight: 20 },
  eylemler: { flexDirection: 'row', gap: spacing.s8 },
  birincil: {
    backgroundColor: colors.accentFillStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.s16, paddingVertical: spacing.s12,
    minHeight: 44, justifyContent: 'center',
  },
  // tema-bagimsiz: marka dolgusu ustundeki metin (tokens: onBrand)
  birincilMetin: { color: '#FFFFFF', fontSize: type.footnote, fontWeight: '700' },
  ikincil: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.s16, paddingVertical: spacing.s12,
    minHeight: 44, justifyContent: 'center',
  },
  ikincilMetin: { color: colors.text2, fontSize: type.footnote, fontWeight: '600' },
});
