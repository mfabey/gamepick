import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, radius, type, PRESSED } from '../theme';
import { useStyles } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useAltBosluk } from '../hooks/useAltBosluk';

// ─────────────────────────────────────────────────────────────────────────────
// AÇILIŞ PERDESİ — uygulamanın kendini tanıttığı ~4 saniye.
//
// ── AYRI BİR ROTA DEĞİL, ÖRTÜ ──
// Perde kendi ekranı olsaydı açılışa 4 saniye EKLERDİ. Oysa uygulama ilk
// açılışta zaten bekliyor: anasayfa trend/yeni/indirim şeritlerini ve sosyal
// akışı çekerken ekran iskelet hâlinde duruyor. O pencere ölü zamandı —
// perde onu KAPLIYOR, uzatmıyor. Anasayfa altta yüklenmeye devam ediyor;
// perde sönerken ortaya çıkan şey gerçek içerik oluyor.
//
// EV DEĞİŞTİ. Perde ilk yazıldığında "Hangilerini sevdin?" ekranının üstüne
// seriliyordu ve ölü pencere onun oyun havuzu isteğiydi. O ekran tümden
// silinince gerekçe kaybolmadı, yalnızca adres değişti: aynı örtü şimdi
// (tabs) düzeninde, anasayfanın üstünde.
//
// Örtü OPAK; "perde kalkması" hissini sönme yaratıyor, saydamlık değil.
// (Saydam bir sürüm denendi ve ölçümle geri alındı — gerekçe `zemin`
// stilinin başında.) Paylaşılan öğe geçişi yazmadan aynı hissi veren ucuz
// yol: örtü sönerken altında zaten yüklenmiş gerçek ekran duruyor.
//
// ── ÜÇ CÜMLE DE DOĞRULANABİLİR ──
// Hiçbiri vaat ya da sıfat değil; üçü de var olan özelliği anlatıyor:
//   fiyat    → GameCard'daki Steam/Epic fiyat satırı
//   alarm    → fiyat düşünce gelen bildirim (_layout.jsx → data.slug)
//   arkadaş  → getFriendActivity / FriendActivity şeridi
// "Kaydettiğin oyun" deniyor, "istek listesi" DENMİYOR: ayrı bir istek
// listesi yok, koleksiyonlar onun kendisi (bkz. index.jsx'teki aynı not).
// Olmayan bir şeyi varmış gibi göstermeme kuralı burada da geçerli.
//
// ── HAREKET AZALTMADA SÜRE KISALMIYOR ──
// İlk tasarımda "4 sn → 1,5 sn" yazılmıştı; YANLIŞTI. Ayar hareketi azaltır,
// okuma hızını değil — üç cümleyi 1,5 saniyede okumak mümkün değil. Kapanan
// tek şey GEÇİŞ: çapraz sönme yerine anlık değişim. Bekleme süreleri aynı.
// ─────────────────────────────────────────────────────────────────────────────

// Her cümlenin ekranda durduğu süre. 1250ms: kısa bir cümleyi okumaya yetiyor,
// üçü birden ~4 saniyeyi aşmıyor.
const BEKLE = 1250;
const GIRIS = 260;   // cümle belirme
const CIKIS = 180;   // cümle sönme
const PERDE_CIKIS = 420;

const SATIR_SAYISI = 3;

export default function AcilisPerdesi({ onDone }) {
  const styles = useStyles(makeStyles);
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  // Raylar ekranın en altına yaslı. Sabit bir sayı YETMİYOR — bu ekranın
  // kendi alt çubuğunda aynı hata bir kez yaşandı: iOS'ta ana ekran
  // göstergesi, Android'de üç düğmeli gezinme çubuğu (48dp) üstüne biniyor.
  const altBosluk = useAltBosluk(spacing.s32);

  // ── ÜST INSET ELLE EKLENİYOR ──
  // ÖLÇÜLDÜ (Android 16 emülatör, taze açılış ekran görüntüsü): marka yazısı
  // saatin, "Geç" ise wifi simgesinin ÜSTÜNE biniyordu.
  //
  // O sırada perde bir SafeAreaView'ın (edges={['top']}) çocuğuydu ve üst
  // inset uygulanmış olmalıydı. Değildi: SafeAreaView inset'i DOLGU olarak
  // veriyor, mutlak konumlu çocuk ise dolgu kutusunu atlayıp görünümün en
  // üst kenarına yapışıyor.
  //
  // Perde (tabs) düzenine taşınınca üstünde SafeAreaView HİÇ KALMADI, yani
  // bu satır artık tek koruma. absoluteFill kullanan her örtü kendi inset'ini
  // almak zorunda.
  const insets = useSafeAreaInsets();

  // ANAHTARLAR DÜZ YAZILIYOR, bir diziden okunarak değil. check:i18n yalnızca
  // anahtarı düz yazılmış çağrıları görüyor; anahtar bir dizi değişkeninden
  // okunsaydı üçü de "tanımlı ama kodda hiç kullanılmıyor" diye rapor edilir
  // ve denetim kırılırdı.
  //
  // NOT: o denetim yorumları AYIKLAMIYOR — bu satırlara örnek bir çağrı
  // yazmak, kodda olmayan bir anahtar varmış gibi görünmesine yol açıyor.
  const satirlar = [t('perde.fiyat'), t('perde.alarm'), t('perde.arkadas')];

  const [vurgu, setVurgu] = useState(0);

  const yaziOpak = useRef(new Animated.Value(0)).current;
  const perdeOpak = useRef(new Animated.Value(1)).current;

  // Perde iki yoldan kapanabiliyor (son cümle bitti · "Geç"e basıldı) ve
  // ikisi aynı anda tetiklenebilir. onDone'ın İKİ KEZ çağrılması ızgarayı
  // bir kez daha çizerdi.
  const bittiRef = useRef(false);

  const kapat = useCallback(() => {
    if (bittiRef.current) return;
    bittiRef.current = true;
    Animated.timing(perdeOpak, {
      toValue: 0,
      duration: reduced ? 0 : PERDE_CIKIS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onDone?.());
  }, [onDone, perdeOpak, reduced]);

  useEffect(() => {
    let iptal = false;
    let sayac = null;

    // Zincirleme: her adım kendi bekleme süresini kurup bir sonrakini
    // çağırıyor. Tek bir interval yerine zincir, çünkü giriş/çıkış
    // animasyonları süreyi kaydırıyor — sabit aralık cümleleri kaydırırdı.
    const adim = (i) => {
      if (iptal) return;
      setVurgu(i);

      Animated.timing(yaziOpak, {
        toValue: 1,
        duration: reduced ? 0 : GIRIS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      sayac = setTimeout(() => {
        if (iptal) return;
        if (i === SATIR_SAYISI - 1) { kapat(); return; }

        Animated.timing(yaziOpak, {
          toValue: 0,
          duration: reduced ? 0 : CIKIS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start(({ finished }) => { if (finished && !iptal) adim(i + 1); });
      }, BEKLE);
    };

    adim(0);
    return () => { iptal = true; if (sayac) clearTimeout(sayac); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.perde, { opacity: perdeOpak }]}
      // Ekran okuyucu perdenin ALTINDAKİ ızgarayı okumasın: perde
      // kalkmadan o kartlar erişilebilir değil.
      accessibilityViewIsModal
    >
      {/* Zemin AYRI KATMAN: örtünün saydamlığı buraya uygulanıyor, üstteki
          yazıya değil. Tek katman olsaydı %92'lik örtüde metin de solardı. */}
      <View style={[StyleSheet.absoluteFill, styles.zemin]} />

      <View style={[styles.ust, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.marka} maxFontSizeMultiplier={1.4} numberOfLines={1}>
          GAMERISEN
        </Text>

        {/* "Geç" İLK KAREDEN İTİBAREN ORADA ve kaybolmuyor. Otomatik ilerleyen
            içeriğin kaçınılmaz şartı: kullanıcı akışı durduramıyorsa en
            azından atlayabilmeli. */}
        <Pressable
          onPress={kapat}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('perde.gec')}
          style={({ pressed }) => [styles.gecAlan, pressed && PRESSED]}
        >
          <Text style={styles.gec}>{t('perde.gec')}</Text>
        </Pressable>
      </View>

      <View style={styles.orta}>
        <Animated.Text style={[styles.satir, { opacity: yaziOpak }]}>
          {satirlar[vurgu]}
        </Animated.Text>
      </View>

      {/* ÜÇ ÇUBUK — perdenin "ne kadar sürecek" sorusuna verdiği cevap.
          Boğulma hissini önleyen şey sürenin kısalığı değil, sürenin
          GÖRÜNÜR olması: kullanıcı üç adım olduğunu ilk saniyede biliyor. */}
      <View style={[styles.raylar, { paddingBottom: altBosluk }]}>
        {satirlar.map((metin, i) => (
          <View key={metin} style={[styles.ray, i <= vurgu && styles.rayDolu]} />
        ))}
      </View>
    </Animated.View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  perde: {
    justifyContent: 'space-between',
    // ── KATMAN SIRASI ──
    // Perde artık (tabs) düzeninde ve altında YÜZEN yüzeyler var: sekme
    // çubuğu (FloatingTabBar, elevation 18) ve ipucu şeridi (24). Android
    // kardeş sıralamasını elevation'a göre yapıyor — bu ölçülerek öğrenildi,
    // şerit tam bu yüzden hiç çizilmemişti (bkz. IpucuSeridi → sarmal).
    //
    // 32 seçildi: ikisinin de üstünde. Perde ilk açılışta ekranın TAMAMINI
    // sahiplenmeli, altından çubuk sızmamalı. zIndex iOS tarafı için.
    zIndex: 30,
    elevation: 32,
  },

  // ── ÖRTÜ OPAK ──
  // Önce %92 saydamdı: "altta yüklenen ızgara doku olarak sezilsin" diye.
  // ÖLÇÜM BUNU ÇÜRÜTTÜ (Android 16 emülatör, açık tema, taze açılış):
  // ızgaranın kendi başlığı — "Hangilerini sevdin?" ve "İstediğin oyunu
  // tarif et" — perdenin arkasından OKUNABİLİYORDU. Aynı ekranda iki başlık
  // yarışıyordu; doku değil, gürültü çıktı.
  //
  // Açık temada beklenenden kötü davranmasının sebebi kontrast: alttaki yazı
  // koyu ve keskin, %8'lik sızıntı bile net okunuyor. Koyu temada daha
  // yumuşaktı ama iki temada da doğru olmayan bir değer ayarlanamaz.
  //
  // "PERDE KALKIYOR" HİSSİ KAYBOLMADI: asıl etkiyi yaratan şey saydamlık
  // değil, örtünün SÖNMESİ — altındaki gerçek ızgara o an ortaya çıkıyor.
  zemin: { backgroundColor: colors.bg },

  ust: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    // paddingTop ÇALIŞMA ZAMANINDA veriliyor (güvenli alan) — bkz. yukarısı.
  },
  marka: {
    fontSize: type.footnote, fontWeight: '900', color: colors.text3,
    letterSpacing: 1.6,
  },
  gecAlan: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  gec: { fontSize: type.subhead, fontWeight: '600', color: colors.text3 },

  orta: { paddingHorizontal: spacing.xl },
  satir: {
    fontSize: type.title2, fontWeight: '800', color: colors.text,
    lineHeight: 32, letterSpacing: -0.4,
  },

  raylar: {
    flexDirection: 'row', gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    // paddingBottom ÇALIŞMA ZAMANINDA veriliyor (useAltBosluk) — bkz. yukarısı.
  },
  // Vurgu rengi KULLANILMIYOR. Üç çubuk sayaçtan ibaret; kırmızıya
  // boyanmaları perdeyi "sade" olmaktan çıkarır ve markanın tek sesli
  // kaldığı yeri (kelime markası) kalabalıklaştırırdı.
  ray: { flex: 1, height: 2, borderRadius: radius.xs, backgroundColor: colors.cardBorder },
  rayDolu: { backgroundColor: colors.text },
});
