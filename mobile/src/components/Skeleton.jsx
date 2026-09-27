import { useEffect, useMemo, useState, useCallback } from 'react';
import { Animated, Easing, View, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// `motion` hâlâ gerekli: Reveal eski ölçeğin `motion.reveal` (160) adımını kullanıyor.
import { radius, spacing, motion } from '../theme';
import { component as K, motion as tasarimHareketi, radius as dsRadius, size as dsSize } from '../theme/tokens';
import { useStyles, useTheme } from '../context/ThemeContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import FadeIn from './FadeIn';
import { useDesignGrid } from '../hooks/useDesignGrid';
import { coverWidth, gridCols, GRID_GAP, GRID_PAD } from './CoverGrid';
import { smallCoverHeight } from './ui/GameCards';

// ─────────────────────────────────────────────────────────────────────────────
// Paylaşılan SÜPÜRME animasyonu — tüm iskelet blokları TEK loop'u paylaşır
// (native driver, ref-sayımlı). Ekranda iskelet yokken loop durur.
//
// ── NABIZ DEĞİL SÜPÜRME, ÇÜNKÜ İKİSİ FARKLI ŞEY SÖYLÜYOR ──
// Öncesinde opaklık nabzıydı (0.35↔0.8, 750 ms gidiş + 750 ms dönüş).
// Nabız "bekliyor" der, süpürme "yükleniyor" der; handoff bilerek ikincisini
// seçmiş: `shimmer 1.4s linear infinite`, `background-size: 320px 100%`.
//
// Loop artık TESTERE dişi: 0→1, 1400 ms, linear, sonra sıfırdan. Gidiş-dönüş
// olsaydı parıltı ekranda ileri geri süzülürdü — süpürme tek yönlüdür.
// ─────────────────────────────────────────────────────────────────────────────
// Handoff: sweepWidth 320, duration 1400, easing linear.
const SWEEP_W = 320;
// Gamerisen 2.0 (DS 4 · `.sk`): 1,3 sn doğrusal süpürme; eski handoff 1400 diyordu.
const SWEEP_MS = tasarimHareketi.duration.loop;

let sharedValue = null;
let loopAnim = null;
let refCount = 0;

function ensureCreated() {
  if (!sharedValue) {
    sharedValue = new Animated.Value(0);
    loopAnim = Animated.loop(
      Animated.timing(sharedValue, {
        toValue: 1,
        duration: SWEEP_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
  }
  return sharedValue;
}

function acquire() {
  refCount += 1;
  if (refCount === 1) { ensureCreated(); loopAnim.start(); }
}
function release() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && loopAnim) loopAnim.stop();
}

function useSweep(enabled) {
  const value = ensureCreated();          // render'da idempotent (yan etki yok)
  useEffect(() => {
    if (!enabled) return undefined;
    acquire();
    return release;
  }, [enabled]);
  return value;
}

// ─────────────────────────────────────────────────────────────────────────────
// Temel iskelet bloğu.
//
// ── GENİŞLİK ÖLÇÜLÜYOR, PARILTI TEK KATMAN ──
// CSS'te süpürme, 320px'lik bir gradyan karosunun tekrarıyla yapılıyor. RN'de
// karo tekrarı yok; ama gradyanın İKİ UCU DA taban rengiyle aynı olduğundan
// (#1F2126 → #2A2C33 → #1F2126) tek bir 320pt'lik katman soldan sağa geçerken
// kenarları tabana görünmez şekilde karışıyor. Bu yüzden döngü başa sardığında
// dikiş görünmüyor ve blok başına TEK gradyan yetiyor — karo başına bir tane
// değil. En kalabalık iskelet ekranı (haber/akış) aynı anda ~29 blok çiziyor;
// karolamak bunu 100'ün üstüne çıkarırdı.
//
// Yol: translateX, -320'den bloğun kendi genişliğine. Her blok kendi
// genişliğini onLayout ile bildiriyor ve PAYLAŞILAN değeri kendi aralığına
// yorumluyor — tek Animated.Value, N interpolasyon, hepsi native driver'da.
// ─────────────────────────────────────────────────────────────────────────────
export function Skeleton({ style }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [w, setW] = useState(0);

  // Hareketi Azalt açıkken süpürme dekoratif hareket sayılıyor ve kapanıyor;
  // blok düz taban renginde duruyor (yükleniyor bilgisi kaybolmuyor, çünkü
  // iskeletin kendisi zaten o bilgiyi taşıyor).
  const animasyonlu = !reduced;
  const sweep = useSweep(animasyonlu);

  const onLayout = useCallback((e) => {
    const yeni = Math.round(e.nativeEvent.layout.width);
    setW((eski) => (eski === yeni ? eski : yeni));
  }, []);

  const translateX = useMemo(
    () => sweep.interpolate({ inputRange: [0, 1], outputRange: [-SWEEP_W, w] }),
    [sweep, w]
  );

  // Taban surface3, parıltı surface4. Handoff'un yazdığı #2A2C33 zaten
  // surface4'ün TA KENDİSİ; #1F2126 ise jeton listesinde yok, en yakını
  // surface3 (#1C1E23) ve fark 255'te 3 — gözle ayırt edilmiyor.
  // Düz hex yazsaydık açık temada bütün yükleme ekranları beyaz zeminde koyu
  // gri kutulara dönerdi; jetona bağlayınca iki tema da doğru geliyor.
  // DS 4 `.sk`: surface1 → surface2 → surface1 (eski adlarla card → bgInput → card).
  const gradyan = useMemo(
    () => [colors.card, colors.bgInput, colors.card],
    [colors.card, colors.bgInput]
  );

  return (
    <View style={[styles.box, style]} onLayout={onLayout}>
      {animasyonlu && w > 0 ? (
        <Animated.View style={[styles.sweep, { transform: [{ translateX }] }]}>
          <LinearGradient
            colors={gradyan}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// İÇERİK GELDİĞİNDE — handoff: "160 ms fade + 4px yukarı".
//
// Öncesinde iskeletten gerçeğe geçiş sert bir takastı: blok kayboluyor, içerik
// aynı karede zıplayarak yerine oturuyordu. 4px'lik yukarı kayma hareketi
// "geldi" gibi gösteriyor, "değişti" gibi değil.
//
// Yön YUKARI: içerik alttan yerine oturuyor, bu da listenin okuma yönüyle
// (yukarıdan aşağı) aynı. Aşağıdan gelseydi kaydırma hissiyle çakışırdı.
// ─────────────────────────────────────────────────────────────────────────────
// ── YENİ ANİMASYON YAZILMADI ──
// FadeIn zaten tam olarak bunu yapıyor (solma + yukarı kayma, native driver,
// Hareketi Azalt'a saygılı). İkinci bir kopyasını yazmak, kart ailesinde
// ayıkladığımız çatallanmanın aynısı olurdu. Reveal yalnızca handoff'un iki
// sayısını ADLANDIRIYOR ki çağrı yerleri 160/4'ü tek tek tekrarlamasın.
export function Reveal({ children, style }) {
  return (
    <FadeIn duration={motion.reveal} offset={4} style={style}>
      {children}
    </FadeIn>
  );
}

// ── Oyun grid iskeleti (Oyunlar / Kütüphane) ──
// 2.0 (27 Eyl): 2.0 oyun kartının (ui/GameCard) ölçüleri — 148×198 kapak,
// başlık 20, meta 16, fiyat 22 satırı; sütun sayısı ve kenar payı ızgarayla
// aynı kancadan (useDesignGrid). Eski iskelet yüzde genişlikte 3:4 kutuydu:
// veri gelince kartlar küçülüp yazı satırları beliriyor, sayfa zıplıyordu.
//
// `kucuk`: Kütüphane — küçük kart ızgarası (GameCardSmall, CoverGrid ölçüsü):
// 3+ sütun, kapak 106×142 oranı, başlık + alt satır.
export function GamesGridSkeleton({ count = 8, kucuk = false }) {
  const styles = useStyles(makeStyles);
  const { columns, padding } = useDesignGrid();
  const { width: pencere } = useWindowDimensions();
  if (kucuk) {
    const sutun = gridCols(pencere);
    const en = coverWidth(pencere, sutun);
    return (
      <View style={[styles.grid, { paddingHorizontal: GRID_PAD - GRID_GAP / 2 }]}>
        {Array.from({ length: sutun * 4 }).map((_, i) => (
          <View key={i} style={{ width: `${100 / sutun}%`, paddingHorizontal: GRID_GAP / 2, paddingBottom: GRID_GAP }}>
            <Skeleton style={{ width: en, height: smallCoverHeight(en), borderRadius: dsRadius.cover }} />
            <View style={styles.kucukBaslik}><Skeleton style={styles.kartCizgi} /></View>
            <View style={styles.kucukSatir}><Skeleton style={styles.kartCizgiKisa} /></View>
          </View>
        ))}
      </View>
    );
  }
  const genislik = `${100 / columns}%`;
  return (
    <View style={[styles.grid, { paddingHorizontal: padding }]}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.cell, { width: genislik }]}>
          <View style={styles.kart}>
            <Skeleton style={styles.card} />
            <View style={styles.kartBaslik}><Skeleton style={styles.kartCizgi} /></View>
            <View style={styles.kartMeta}><Skeleton style={styles.kartCizgiKisa} /></View>
            <View style={styles.kartFiyat}><Skeleton style={styles.kartFiyatCizgi} /></View>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Haber listesi iskeleti ──
export function NewsListSkeleton({ rows = 6 }) {
  const styles = useStyles(makeStyles);
  return (
    <View>
      <Skeleton style={styles.newsFeatured} />
      <View style={styles.chipsRow}>
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} style={styles.chip} />)}
      </View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.newsRow}>
          <Skeleton style={styles.newsThumb} />
          <View style={{ flex: 1, gap: spacing.sm, paddingTop: 2 }}>
            <Skeleton style={styles.lineSm} />
            <Skeleton style={styles.line} />
            <Skeleton style={styles.lineXs} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Topluluk akışı iskeleti ──
// Ölçüldü: bu ekran 645ms boyunca ortada dönen bir çarktan ibaretti ve
// GERÇEK bir engelleyici yükleme durumu var (loading ? spinner : liste).
// Çubuk şeridi + yazma çubuğu + kartlar, gerçek düzenin ritmini taşıyor.
export function FeedSkeleton({ rows = 5 }) {
  const styles = useStyles(makeStyles);
  return (
    <View>
      <View style={styles.feedTabs}>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} style={styles.feedTab} />)}
      </View>
      <Skeleton style={styles.composeBar} />
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.feedCard}>
          <View style={styles.feedRow}>
            <Skeleton style={styles.feedThumb} />
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Skeleton style={styles.line} />
              <Skeleton style={styles.lineSm} />
            </View>
          </View>
          <Skeleton style={styles.lineWide} />
          <Skeleton style={styles.lineMid} />
        </View>
      ))}
    </View>
  );
}

// ── Oyun detayı: BÖLÜM iskeletleri ──
// TAM EKRAN İSKELET DEĞİL — bilerek. Ekran kapağı ve adı rota
// parametrelerinden ANINDA çiziyor (detail?.image || image). Tam ekran bir
// iskelet, zaten ekranda duran içeriğin üstünü örterdi. 868ms boyunca boş
// kalan yalnızca ağdan gelen bölümler: tür, ekran görüntüleri, açıklama.
// FİYAT LİSTESİ İSKELETİ (Faz 3). Dört satır, GERÇEK satırla aynı
// yükseklikte (56) — içerik gelince sayfa sıçramıyor. 200 ms gecikme
// çağrı yerinde: hızlı yanıtta iskelet hiç görünmüyor, yalnız yanıp
// sönerdi.
export function PriceListSkeleton({ rows = 4 }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} style={styles.priceRow} />
      ))}
    </View>
  );
}

export function GenreChipsSkeleton() {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.genreWrap}>
      {[74, 58, 88, 64].map((w, i) => <Skeleton key={i} style={[styles.genreChip, { width: w }]} />)}
    </View>
  );
}

export function ShotStripSkeleton() {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.shotRow}>
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} style={styles.shot} />)}
    </View>
  );
}

export function TextBlockSkeleton({ lines = 4 }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={{ gap: spacing.sm }}>
      {Array.from({ length: lines }).map((_, i) => (
        // Son satır kısa: gerçek paragraflar öyle biter, eşit uzunlukta
        // satırlar iskeleti tablo gibi gösteriyordu.
        <Skeleton key={i} style={i === lines - 1 ? styles.lineMid : styles.lineWide} />
      ))}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  // overflow: parıltı bloğun dışına taşmasın — 320pt'lik katman küçük
  // bloklarda (44pt küçük resim, 60pt satır) blok sınırını kat kat aşıyor.
  box: { backgroundColor: colors.card, borderRadius: radius.sm, overflow: 'hidden' },
  sweep: { position: 'absolute', top: 0, bottom: 0, left: 0, width: SWEEP_W },

  // grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 6 },
  cell: { alignItems: 'center', paddingBottom: spacing.md },
  // Satır yükseklikleri kartınkiyle aynı (K.gameCardMedium); çizgi satırın ortasında.
  kart: { width: dsSize.cover.medium.width },
  card: { width: dsSize.cover.medium.width, height: dsSize.cover.medium.height, borderRadius: dsRadius.cover },
  kartBaslik: { height: 20, marginTop: K.gameCardMedium.titleTop, justifyContent: 'center' },
  kartMeta: { height: K.gameCardMedium.metaHeight, marginTop: K.gameCardMedium.metaTop, justifyContent: 'center' },
  kartFiyat: { height: K.gameCardMedium.priceRow, marginTop: K.gameCardMedium.priceTop, justifyContent: 'center' },
  kartCizgi: { width: '82%', height: 12, borderRadius: 4 },
  kartCizgiKisa: { width: '48%', height: 10, borderRadius: 4 },
  kartFiyatCizgi: { width: 56, height: 14, borderRadius: 4 },
  kucukBaslik: { height: 20, marginTop: K.gameCardSmall.titleTop, justifyContent: 'center' },
  kucukSatir: { height: K.gameCardSmall.rowHeight, marginTop: K.gameCardSmall.rowTop, justifyContent: 'center' },

  // news
  newsFeatured: { marginHorizontal: spacing.lg, height: 210, borderRadius: radius.lg },
  chipsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 14 },
  chip: { width: 72, height: 34, borderRadius: radius.pill },
  // Gerçek fiyat satırıyla aynı: 56pt, radius.md.
  priceRow: { height: 56, borderRadius: radius.md },
  newsRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  newsThumb: { width: 108, height: 76, borderRadius: radius.md },
  lineSm: { width: 60, height: 10, borderRadius: 4 },
  line: { width: '92%', height: 14, borderRadius: 4 },
  lineXs: { width: '55%', height: 11, borderRadius: 4 },
  lineWide: { width: '100%', height: 12, borderRadius: 4 },
  lineMid: { width: '62%', height: 12, borderRadius: 4 },

  // feed (topluluk) — ölçüler reviews.jsx'teki gerçek kartlarla aynı ritimde
  feedTabs: { flexDirection: 'row', gap: spacing.s8, paddingHorizontal: spacing.lg, paddingBottom: spacing.s12 },
  feedTab: { flex: 1, height: 40, borderRadius: radius.md },
  composeBar: { marginHorizontal: spacing.lg, height: 46, borderRadius: radius.pill, marginBottom: spacing.s12 },
  feedCard: {
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    padding: spacing.s16, borderRadius: radius.lg, gap: spacing.sm,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  feedRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginBottom: spacing.s4 },
  feedThumb: { width: 44, height: 44, borderRadius: radius.sm },

  // oyun detayı bölümleri
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  genreChip: { height: 30, borderRadius: radius.pill },
  shotRow: { flexDirection: 'row', gap: spacing.s12 },
  shot: { width: 208, height: 117, borderRadius: radius.md },
});
