import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, type, TAB_BAR, PRESSED } from '../theme';
import { useStyles, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useAltBosluk } from '../hooks/useAltBosluk';
import { useSeen } from '../hooks/useSeen';
import { getCollections, subscribeCollections } from '../services/collectionsStore';
import {
  loadIpuclari, ipucuVerilebilir, gorulduMu,
  ipucuGosterildi, ipucuKapatildi, ipucuDokunuldu,
} from '../services/ipuclari';

// ─────────────────────────────────────────────────────────────────────────────
// İPUCU ŞERİDİ — sekme çubuğunun üstünde beliren tek satır.
//
// ── TETİKLEYİCİ ZAMANLAYICI DEĞİL, BİRİKİM ──
// Robot hissini veren şey ipucunun kendisi değil, ZAMANLANMIŞ olması: "30
// saniye geçti, bir şey söyleyeyim". Buradaki üç ipucu da kullanıcının kendi
// birikimini okuyor — kaç oyuna baktı, kaç oyun kaydetti. Yani şerit, o
// eylemi yapmış birine çıkıyor; yapmamış birine hiç çıkmıyor.
//
// ── HİÇBİR EKRANA ÖLÇÜM KODU GİRMEDİ ──
// Üç sayacın üçü de ZATEN VAR: seenStore (görülen oyunlar) ve
// collectionsStore (kaydedilenler) abone edilebilir depolar. Ekranlara
// "ipucu için say" diye kanca takmak, yönlendirme mantığını on dosyaya
// dağıtmak olurdu.
//
// ── SESSİZ KALDIĞI YERLER ──
// Video ve mesaj sekmeleri. Biri medya oynatıyor, diğeri bir konuşma;
// ikisinde de araya bir öneri sokmak kesinti olur. Bütçenin geri kalanı
// services/ipuclari.js'te.
// ─────────────────────────────────────────────────────────────────────────────

// İlk 20 saniye SESSİZ. Uygulamayı yeni açan kişi ne yapacağını biliyor;
// ipucu, o an bir şey ARAYAN kişiye faydalı.
const ILK_BEKLEME = 20000;

// Şeridin ekranda kaldığı süre. Kendiliğinden gidiyor — kapatmak ZORUNLU
// değil, çünkü zorunlu kapatma bir ipucunu göreve dönüştürür.
const GORUNME = 6000;

const GIRIS = 260;
const CIKIS = 200;

// Şeridin sekme çubuğuyla arasındaki nefes payı.
const NEFES = 8;

// Medya ve konuşma yüzeyleri — bkz. "sessiz kaldığı yerler".
const SESSIZ_ROTALAR = ['/videos', '/messages'];

// ── KATALOG ──
// Sıra önemli: ilk uygun olan kazanıyor, gösterilen emekli oluyor. Yani
// kullanıcı bunları peş peşe değil, açılışlara yayılmış olarak görüyor.
//
// Metinler burada DEĞİL: check:i18n yalnızca anahtarı düz yazılmış çağrıları
// görüyor, katalogdan okunan anahtar "kullanılmıyor" sayılırdı. Karşılıkları
// bileşenin içinde düz yazılıyor.
const KATALOG = [
  // Kaydırarak keşif TÜM uygulamada tek bağlantıya sahipti (anasayfadaki
  // selamlama cümlesi). Beş oyuna bakmış biri katalogda geziniyor demektir.
  { id: 'kaydir',   hedef: '/swipe',    uygun: ({ gorulen }) => gorulen >= 5 },
  // Listeler yalnızca Ayarlar'dan açılıyordu. İki oyun kaydetmiş biri
  // ayırmaya başlamak isteyebilir.
  { id: 'listeler', hedef: '/lists',    uygun: ({ kayitli }) => kayitli >= 2 },
  // Doğal dil ile keşif, onboarding geçildikten sonra yalnızca Ayarlar'da
  // kalıyordu. Sekiz oyun = epey gezinme; kısayolu söylemenin tam zamanı.
  { id: 'kesfet',   hedef: '/discover', uygun: ({ gorulen }) => gorulen >= 8 },
];

export default function IpucuSeridi() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const altBosluk = useAltBosluk(TAB_BAR.bottom);

  // Anahtarlar DÜZ YAZILIYOR — katalogdan okunsalardı dil denetimi üçünü de
  // "tanımlı ama kullanılmıyor" diye raporlardı.
  const METIN = {
    kaydir:   t('ipucu.kaydir'),
    listeler: t('ipucu.listeler'),
    kesfet:   t('ipucu.kesfet'),
  };

  const gorulenler = useSeen();
  const [kayitli, setKayitli] = useState(() => getCollections());
  useEffect(() => subscribeCollections(() => setKayitli(getCollections())), []);

  const [yuklendi, setYuklendi] = useState(false);
  const [hazir, setHazir] = useState(false);
  const [aday, setAday] = useState(null);

  const opak = useRef(new Animated.Value(0)).current;
  const kaydir = useRef(new Animated.Value(NEFES)).current;

  useEffect(() => {
    const zt = setTimeout(() => setHazir(true), ILK_BEKLEME);
    loadIpuclari().then(() => setYuklendi(true)).catch(() => {});
    return () => clearTimeout(zt);
  }, []);

  // Kaydedilen oyun sayısı: koleksiyonlar İSTEK LİSTESİNİN kendisi, ayrı bir
  // istek listesi yok (aynı not app/(tabs)/index.jsx'te de duruyor).
  const kayitliSayi = (kayitli || []).reduce((n, k) => n + (k.games?.length || 0), 0);

  const gizle = useCallback((kapatildiMi) => {
    Animated.parallel([
      Animated.timing(opak, {
        toValue: 0, duration: reduced ? 0 : CIKIS,
        easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(kaydir, {
        toValue: NEFES, duration: reduced ? 0 : CIKIS,
        easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }),
    ]).start(() => setAday(null));
    if (kapatildiMi) ipucuKapatildi();
  }, [opak, kaydir, reduced]);

  // ── ADAY SEÇİMİ ──
  // Depolar değiştikçe yeniden çalışıyor; `aday` doluyken hiçbir şey yapmıyor
  // (aynı anda iki şerit olmaz).
  useEffect(() => {
    if (!hazir || !yuklendi || aday) return;
    if (SESSIZ_ROTALAR.includes(pathname)) return;
    if (!ipucuVerilebilir()) return;

    const olcum = { gorulen: gorulenler.size, kayitli: kayitliSayi };
    const bulunan = KATALOG.find((i) => !gorulduMu(i.id) && i.uygun(olcum));
    if (!bulunan) return;

    setAday(bulunan);
    // "Gösterildi" ŞERİT ÇİZİLİRKEN yazılıyor, kapanırken değil: uygulama
    // arada kapatılırsa ipucu bir daha çıkmasın. Görülmüş sayılması için
    // okunması yeterli.
    ipucuGosterildi(bulunan.id);
  }, [hazir, yuklendi, aday, pathname, gorulenler, kayitliSayi]);

  // Belirme + kendiliğinden gitme
  useEffect(() => {
    if (!aday) return undefined;

    Animated.parallel([
      Animated.timing(opak, {
        toValue: 1, duration: reduced ? 0 : GIRIS,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(kaydir, {
        toValue: 0, duration: reduced ? 0 : GIRIS,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();

    const zt = setTimeout(() => gizle(false), GORUNME);
    return () => clearTimeout(zt);
  }, [aday, opak, kaydir, reduced, gizle]);

  // Şerit görünürken sessiz bir rotaya geçilirse anında çekiliyor.
  useEffect(() => {
    if (aday && SESSIZ_ROTALAR.includes(pathname)) gizle(false);
  }, [pathname, aday, gizle]);

  const git = useCallback(() => {
    if (!aday) return;
    ipucuDokunuldu();
    router.push(aday.hedef);
    gizle(false);
  }, [aday, router, gizle]);

  if (!aday) return null;

  return (
    <Animated.View
      style={[
        styles.sarmal,
        { bottom: altBosluk + TAB_BAR.height + NEFES, opacity: opak, transform: [{ translateY: kaydir }] },
      ]}
      // Şerit ekranın SAHİBİ değil: altındaki içerik erişilebilir kalmalı.
      pointerEvents="box-none"
    >
      {/* İKİ AYRI DOKUNMA HEDEFİ, İÇ İÇE DEĞİL KARDEŞ. Şeride dokunmak
          "götür", çarpıya dokunmak "reddet" demek — biri diğerinin içinde
          olsaydı hangi niyetin kaydedildiği dokunmanın kaç piksel kaydığına
          bağlı kalırdı ve reddetme sayacı yalan söylerdi. */}
      <View style={styles.serit}>
        <Pressable
          onPress={git}
          accessibilityRole="button"
          accessibilityLabel={METIN[aday.id]}
          style={({ pressed }) => [styles.govde, pressed && PRESSED]}
        >
          <Text style={styles.metin} numberOfLines={2}>{METIN[aday.id]}</Text>
        </Pressable>

        <Pressable
          onPress={() => gizle(true)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('ipucu.kapat')}
          style={({ pressed }) => [styles.kapat, pressed && PRESSED]}
        >
          <Ionicons name="close" size={16} color={colors.text3} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  sarmal: {
    position: 'absolute',
    // Sekme çubuğuyla AYNI kenar payı (TAB_BAR.side): iki yüzen yüzey aynı
    // dikey eksende hizalanmazsa şerit çubuğa ait değilmiş gibi durur.
    left: TAB_BAR.side,
    right: TAB_BAR.side,

    // ── KATMAN SIRASI — İKİ PLATFORM İÇİN AYRI ──
    // ÖLÇÜLDÜ (Android 16 emülatör, uiautomator dökümü): şerit görünüm
    // ağacındaydı ve KONUMU DA DOĞRUYDU — sınırlar [98,2077][983,2130],
    // sekme çubuğu 2188'de başlıyor, yani tam hesaplanan yerde. Buna rağmen
    // ekran görüntüsünde yoktu.
    //
    // Sebep: <Tabs> yığınının kendisi. Şerit ondan SONRA gelen bir kardeş
    // olduğu halde Android sıralamayı elevation'a göre yapıyor ve
    // elevation'ı olmayan kardeş, sekme yüzeyinin (FloatingTabBar,
    // elevation 18) altında kalıyor.
    //
    // 24 seçildi: 18'in üstünde. İkisi uzamsal olarak çakışmıyor, bu yüzden
    // sıralama yalnızca ÇİZİM sırasını değiştiriyor, görünümü değil.
    // zIndex iOS tarafı için: orada elevation yok, sıralamayı o veriyor.
    zIndex: 20,
    elevation: 24,
  },
  serit: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s12,
    paddingHorizontal: spacing.s16, paddingVertical: spacing.s12,
    backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: radius.lg,
  },
  govde: { flex: 1 },
  metin: {
    color: colors.text, fontSize: type.subhead,
    fontWeight: '600', lineHeight: 20,
  },
  kapat: { alignItems: 'center', justifyContent: 'center' },
});
