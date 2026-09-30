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
// ── 26 AĞUSTOS 2026: KURALIN TERSİ DE GEÇERLİ ──
// "Sessiz başarısızlık yasak" ise, ÇALIŞAN BİR ŞEYE BOZUK DEMEK de yasak.
// Ölçüldü: `free` bölümü 24 CANLI Steam oyunu gösterirken bu bant yine de
// "veritabanına ulaşılamıyor, çevrimdışı listeyi gösteriyoruz" diyordu,
// çünkü sunucu "RAWG boş döndü" ile "çevrimdışı tabandayız"ı tek bayrakta
// topluyordu. Artık ayrı: `cevrimdisi` true ise gerçekten 122'lik tabandayız,
// false ise liste taze ve söylenecek tek şey hangi filtrenin işlemediği.
//
// ── FİLTRELER GİZLENMİYOR, DEVRE DIŞI GÖRÜNÜYOR ──
// Kontrol listesi bunu ayrıca şart koşuyor. Gizlemek "böyle bir özellik
// yok" der; devre dışı göstermek "var ama şu an çalışmıyor" der. İkincisi
// doğru olan.
// ─────────────────────────────────────────────────────────────────────────────
import { View, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { Button, Txt } from './ui/Primitives';
import { useDesignTheme } from '../theme/useDesignTheme';
import { useLanguage } from '../context/LanguageContext';
import { ICERIK_MAX } from '../theme';
import { space } from '../theme/tokens';

/**
 * @param {string[]} unavailable  çalışmayan filtre adları ('store'|'metacritic'|'tags'|'mode')
 * @param {bool}    [cevrimdisi]  true → 122'lik çevrimdışı taban; false → liste
 *                                TAZE, yalnız bazı filtreler uygulanamadı
 * @param {func}     onRetry      "Tekrar dene"
 * @param {func}    [onDismiss]   "Yine de gez" — uyarıyı kapatır
 */
// 2.0 / G-DS-4 "Hata · Satır içi" (27 Eyl): surface1 kart, 18 köşe, turuncu
// ikon + 15/600 başlık, 13/18 açıklama, ikincil "Tekrar dene" (yenile ikonlu)
// + üçüncül "Yine de gez". Eski sürüm kırmızı dolgulu kutu + kırmızı CTA'ydı:
// 2.0'da hata bir uyarı, marka rengi değil.
export default function LimitedMode({ unavailable = [], cevrimdisi = true, onRetry, onDismiss }) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const adlar = unavailable.map((k) => t('filter.' + (k === 'metacritic' ? 'score' : k))).join(' · ');
  return (
    <View style={[styles.kutu, { backgroundColor: colors.surface1 }]} accessibilityRole="alert">
      <View style={styles.baslikSatir}>
        <Icon name={cevrimdisi ? 'wifioff' : 'sliders'} size={18} color={colors.orange} strokeWidth={2.2} />
        <Txt variant="subhead" style={[styles.baslik, { color: colors.text }]}>
          {t(cevrimdisi ? 'limited.title' : 'limited.partialTitle')}
        </Txt>
      </View>
      <Txt variant="footnote" style={{ color: colors.text2 }}>
        {t(cevrimdisi ? 'limited.body' : 'limited.partialBody')}
        {adlar ? ` ${t('limited.disabled')}: ${adlar}.` : ''}
      </Txt>
      <View style={styles.eylemler}>
        <Button title={t('limited.retry')} variant="secondary" height={36} icon="refresh" onPress={onRetry} />
        {onDismiss ? <Button title={t('limited.browse')} variant="tertiary" height={36} onPress={onDismiss} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kutu: {
    width: '100%', maxWidth: ICERIK_MAX, alignSelf: 'center',
    borderRadius: 18, padding: space[16], gap: space[8],
  },
  baslikSatir: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  baslik: { flex: 1, fontWeight: '600' },
  eylemler: { flexDirection: 'row', gap: space[8], marginTop: space[4] },
});
