// Gamerisen 2.0 — tasarım değerleri (design tokens)
// Kaynak: Claude Design tuvali "Gamerisen 2.0" → DS 1–6 panoları ve design/kit/k.py.
// Tasarım 390 pt genişlikte çizildi: tasarımdaki her "px" değeri burada aynı sayıda "pt"dir.
// Bu dosyadaki değerleri değiştirme; farklı bir şey gerekiyorsa önce tasarımı güncelle.

import { Platform, type TextStyle } from 'react-native';
import { Easing } from 'react-native-reanimated';

/* ───────────────────────────── Renkler ───────────────────────────── */

export const colors = {
  // Yüzeyler — saf siyah yok, dört katman
  bg: '#0A0A0B', // uygulama zemini
  bg2: '#131315', // alt çubuk, alt sayfa, sabit çubuklar
  surface1: '#1C1C1E', // kart, gruplu liste, giriş alanı
  surface2: '#2C2C2E', // çip, ikincil buton, kontroller
  surface3: '#3A3A3C', // toast, en üst katman
  fill: 'rgba(118,118,128,0.24)', // arama alanı, segmented zemin
  line: 'rgba(255,255,255,0.08)', // 0.5 pt ayraçlar, kenar çizgileri
  lineStrong: 'rgba(255,255,255,0.12)', // sekme çubuğu üst çizgisi

  // Metin
  text: '#F5F5F7', // birincil — zeminde 18:1
  text2: '#A1A1A6', // ikincil / açıklama
  text3: '#8E8E93', // soluk / zaman / ipucu
  onArt: '#D1D1D6', // oyun görseli üstündeki ikincil metin
  white: '#FFFFFF',

  // Marka kırmızısı — az ve yerinde (logo, "risen", seçili sekme, rozet, canlı, kalp, bağlantı, odak)
  brand: '#BC0C0C', // logo kırmızısı; dolgular (rozet, "Son dakika")
  red: '#F34545', // metin / ikon kırmızısı (kartta 4,7:1). Kalp dolgusu da bu.
  redTint: 'rgba(188,12,12,0.22)',
  accentTint: 'rgba(188,12,12,0.24)', // "renkli" (tinted) buton zemini
  accentLine: 'rgba(188,12,12,0.45)',

  // Birincil buton nötr kalır (kırmızı değil)
  primary: '#F5F5F7',
  onPrimary: '#0A0A0B',
  onPrimaryMuted: 'rgba(10,10,11,0.55)',

  // İşlevsel — yalnızca anlam taşıyınca
  green: '#30D158', // fiyat düşüşü, indirim, çevrimiçi, anahtar açık
  greenTint: 'rgba(48,209,88,0.14)',
  onGreen: '#00210B', // indirim etiketi metni
  orange: '#FF9F0A', // uyarı, fiyat artışı
  orangeTint: 'rgba(255,159,10,0.15)',
  gold: '#FFD60A', // puan yıldızı, başarım, tavsiye
  goldTint: 'rgba(255,214,10,0.13)',
  starOff: '#48484A',

  // Kontroller ve cam
  segmentedThumb: '#636366',
  switchOff: 'rgba(120,120,128,0.32)',
  darkGlass: 'rgba(0,0,0,0.42)', // görsel üstü ikon butonu / etiket (+ blur 16)
  tabBar: 'rgba(19,19,21,0.96)', // sekme çubuğu ve sabit alt çubuklar (+ blur 20)
  onArtButton: 'rgba(255,255,255,0.16)', // görsel üstü ikincil buton (+ blur 16)
  pillNeutral: 'rgba(255,255,255,0.12)', // Lv, soru, anket, mod rozetleri
  pillNeutralSoft: 'rgba(255,255,255,0.1)',
  pageDotOff: 'rgba(255,255,255,0.28)',
  // Fiyat grafiği (kit chart()): kesikli ızgara, alan dolgusu, son nokta halesi.
  chartGrid: 'rgba(255,255,255,0.07)',
  chartArea: 'rgba(255,255,255,0.06)',
  chartHalo: 'rgba(255,255,255,0.16)',
  ticketDash: 'rgba(255,255,255,0.14)', // DealCard kesikli ayraç (kit deal_card())
  overlayTag: 'rgba(0,0,0,0.62)', // görsel üstü süre / tür etiketi (kit ovl()) — tema bağımsız
  unreadRow: 'rgba(255,255,255,0.04)', // okunmamış bildirim satırı (kit notif())

  // Logo
  logoROnDark: '#F8F8F8',
  logoROnLight: '#191919',
} as const;

/** Avatar baş harf zeminleri (sırayla kullanılır). */
export const avatarPalette = ['#48484A', '#2F4A45', '#5A4535', '#34435A', '#4E3A45', '#44492F', '#4A3434'] as const;

/** Mağaza monogram renkleri (16×16, yarıçap 5, 9 pt kalın harf). */
export const storeBadges: Record<string, { letter: string; bg: string }> = {
  Steam: { letter: 'S', bg: '#2B4566' },
  'Epic Games': { letter: 'E', bg: '#3A3B45' },
  Epic: { letter: 'E', bg: '#3A3B45' },
  GOG: { letter: 'G', bg: '#4B3868' },
  Humble: { letter: 'H', bg: '#8A3B2E' },
  Fanatical: { letter: 'F', bg: '#8A5A1E' },
  'Microsoft Store': { letter: 'M', bg: '#23603A' },
  'Xbox Store': { letter: 'X', bg: '#23603A' },
  'PlayStation Store': { letter: 'P', bg: '#1F3F7A' },
  'Nintendo eShop': { letter: 'N', bg: '#7A2323' },
};

/* ───────────────────────────── Yazı ───────────────────────────── */

// iOS: sistem fontu (SF Pro). 20 pt ve üstünde iOS otomatik olarak SF Pro Display'e geçer.
// Android: Inter (@expo-google-fonts/inter ile yükle). Ağırlık başına ayrı aile adı gerekir → fontFor().
export const fonts = {
  text: Platform.select({ ios: 'System', default: 'Inter_400Regular' }),
  display: Platform.select({ ios: 'System', default: 'Inter_700Bold' }),
} as const;

type Weight = '400' | '500' | '600' | '700';
const ANDROID_INTER: Record<Weight, string> = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
};
/** Ağırlığa göre doğru fontFamily + fontWeight çifti. */
export function fontFor(weight: Weight): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  return Platform.OS === 'ios' ? { fontFamily: 'System', fontWeight: weight } : { fontFamily: ANDROID_INTER[weight] };
}

/** CSS "em" harf aralığını RN'in pt değerine çevirir. Tasarımda gövde metni -0.01em'dir. */
export const tracking = (em: number, size: number) => Math.round(em * size * 100) / 100;

const t = (size: number, lineHeight: number | undefined, weight: Weight, em = -0.01): TextStyle => ({
  fontSize: size,
  ...(lineHeight ? { lineHeight } : null),
  ...fontFor(weight),
  letterSpacing: tracking(em, size),
});

/**
 * Yazı ölçeği — tasarımda en sık kullanılan kombinasyonlar (boyut / satır / ağırlık / harf aralığı).
 * Ekrana özel bir değer görürsen .dc.html kaynağındaki değeri kullan; bu listeye sadece tekrar edenler girer.
 */
export const typography = {
  display: t(30, 36, '700', -0.03), // profil adı gibi büyük başlıklar
  largeTitle: t(28, 34, '700', -0.03), // sayfa başlığı (Topluluk, Mesajlar…)
  heroTitle: t(28, 32, '700', -0.03), // öne çıkan kart başlığı
  title1: t(22, undefined, '700', -0.02),
  title2: t(20, 26, '700', -0.02), // bölüm başlığı ("Senin İçin")
  headline: t(17, 22, '600'), // nav bar başlığı, satır başlığı
  headlineBold: t(17, 22, '700'),
  bodyLarge: t(17, 27, '400'), // haber detayı gövde metni
  input: t(16, undefined, '400'), // giriş alanı metni (iOS zoom yapmasın diye 16)
  button: t(16, undefined, '600'), // 48 pt buton
  cardTitleLarge: t(16, 21, '600'), // fırsat kartı başlığı
  cardTitle: t(15, 20, '600'), // oyun kartı başlığı, liste başlığı
  body: t(15, 22, '400'), // gönderi metni
  bodyTight: t(15, 21, '400'),
  subhead: t(14, 18, '600'),
  subheadRegular: t(14, 20, '400'),
  footnote: t(13, 18, '400'),
  footnoteStrong: t(13, 18, '600'),
  caption: t(12, 16, '400'),
  captionMedium: t(12, 16, '500'),
  captionStrong: t(12, 16, '600'),
  caption2: t(11, 14, '400'),
  caption2Medium: t(11, 14, '500'),
  badge: t(11, undefined, '700', 0), // sayaç, Lv, rozet içi
  tabLabel: t(10, 12, '500', 0), // seçili sekmede 600
  tabLabelActive: t(10, 12, '600', 0),
  // Kaynaktan eklenenler (kit/k.py): bölüm başlığı bağlantısı "Tümü" 15/500,
  // NavBar alt başlığı 12/14, toast metni 14/500.
  link: t(15, 20, '500'),
  navSubtitle: t(12, 14, '400'),
  toast: t(14, 18, '500'),
  statValue: t(18, 24, '700'), // StatTile değeri (kit stat())
  greeting: t(15, 20, '400'), // Ana sayfa selamlaması (kit home() greet)
  ratingValue: t(15, 20, '700'), // Oyun detayı puan satırı (kit game_detail())
  scoreLarge: t(44, 48, '700', -0.02), // İnceleme özeti büyük sayı (kit game_detail() summ)
  caption2Strong: t(11, 14, '600'), // FriendActivity durumu (kit friend())
  footnoteMedium: t(13, 18, '500'), // gönderi eylem sayıları (kit actions())
  shortTitle: t(13, 17, '600'), // ShortCard başlığı (kit short())
  newsTitle: t(18, 24, '700', -0.015), // NewsFeature başlığı (kit news_feat())
  storeMono: t(9, undefined, '700', 0),
  profileName: t(24, 30, '700', -0.025), // Profil görünen adı (kit profile() name)
} as const;

/** Fiyatlar: display ailesi, 700, -0.02em, rakamlar eşit genişlikte. */
// 20: StickyBottomBar (kit/s1.py sticky_bar), 40: Fiyat Karşılaştırma "En İyi Fiyat" (G-08),
// 36 ve 15: Oyun Detayı fiyat kartı ve diğer mağazalar (G-07).
export const priceStyle = (size: 14 | 15 | 16 | 18 | 20 | 22 | 28 | 36 | 40, color: string = colors.text): TextStyle => ({
  fontSize: size,
  ...fontFor('700'),
  letterSpacing: tracking(-0.02, size),
  fontVariant: ['tabular-nums'],
  color,
});

/* ───────────────────────────── Boşluk ve ölçü ───────────────────────────── */

export const space = { 2: 2, 4: 4, 6: 6, 8: 8, 10: 10, 12: 12, 14: 14, 16: 16, 18: 18, 20: 20, 24: 24, 28: 28, 32: 32 } as const;

export const layout = {
  screenWidth: 390, // tasarım genişliği
  gutter: 20, // sayfa yan boşluğu
  sectionGap: 32, // bölümler arası
  headingToContent: 12, // bölüm başlığı → içerik
  railGap: 12, // yatay kaydırmalı kart arası (hero rayında 10, videoda 14)
  statusBar: 54, // tasarımda üst güvenli alan
  homeIndicator: 34, // alt güvenli alan
  headerHome: 98, // 54 + 44 (logo satırı)
  navBar: 98, // 54 + 44, ortalanmış başlık + geri
  pageHead: 106, // 54 + 52, büyük başlık
  tabBar: 83, // iOS: 62 kapsül + 21 alt · Android: 64 + sistem alanı (bkz. tabBar)
  stickyBottomBar: 92, // Oyun Detayı / Fiyat: 10 üst + 48 buton + 34 alt
  minTouch: 44,
} as const;

export const radius = {
  xs: 5, // Lv / mağaza rozeti
  sm: 6, // indirim etiketi, durum etiketi
  md: 8, // görsel üstü etiket
  segmented: 10,
  button: 12, // 40 pt ve üstü buton, giriş alanı, arama
  buttonSmall: 10, // 40 pt altı buton
  cover: 14, // oyun kapağı, medya görseli, ana ekran simgesi örneği
  card: 16, // standart kart
  group: 18, // gruplu liste, grafik kartı
  cardLarge: 20, // fırsat kartı
  // Alt sayfa: G-06b ve DS 4 kaynaklarında `border-radius: 24px 24px 0 0`.
  // SCREENS.md "20" diyor; doğruluk sırasında kaynak kazanır.
  sheet: 24,
  hero: 22, // öne çıkan kart
  pill: 999,
} as const;

export const size = {
  button: { lg: 48, md: 44, sm: 40, xs: 36 },
  chip: 34,
  segmented: 36,
  switch: { width: 51, height: 31, knob: 27 },
  field: 48,
  search: 40,
  iconButton: 44,
  icon: { sm: 16, md: 20, lg: 22, xl: 24 },
  avatar: { xs: 24, sm: 30, md: 40, lg: 56 },
  cover: {
    small: { width: 106, height: 142 }, // game_s
    medium: { width: 148, height: 198 }, // game_m
    hero: { width: 334, height: 420 },
    drop: { width: 264, imageHeight: 132 },
    deal: { width: 300 },
    video: { width: 280, height: 158 },
    short: { width: 132, height: 234 },
  },
} as const;

/* ───────────────────────────── Sekme çubuğu (DS 7) ───────────────────────────── */
// Yalnızca ikon. iOS'ta yüzen cam kapsül, Android'de Material 3 çubuğu. Etiketler erişilebilirlik adı olarak kalır.

export const tabBar = {
  ios: {
    height: 62, // kapsül yüksekliği
    side: 20, // ekran kenarından
    bottomOverSafeArea: -13, // alt boşluk = güvenli alan − 13 (34 → 21), en az 12
    paddingH: 4,
    icon: 26,
    iconOff: '#C7C7CC',
    cutout: '#303033', // dolu ikonların iç kesiği (mercek üstü renk)
    glassTint: 'rgba(30,30,32,0.35)', // iOS 26 GlassView tint
    fallbackFill: 'rgba(30,30,32,0.64)', // iOS < 26: BlurView üstü katman
    edge: 'inset 0 0 0 0.5px rgba(255,255,255,0.14), inset 0 1px 0 rgba(255,255,255,0.1)',
    shadow: '0 12px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
    lens: { width: 60, height: 52, fill: 'rgba(255,255,255,0.12)', edge: 'inset 0 0 0 0.5px rgba(255,255,255,0.16), inset 0 1px 0 rgba(255,255,255,0.12)' },
    badge: { size: 18, top: -5, left: 17, ring: '#2A2A2D' },
  },
  android: {
    height: 64, // + alt sistem alanı (insets.bottom)
    icon: 24,
    iconOff: '#A1A1A6',
    cutout: '#3C1113', // gösterge üstü renk
    fill: '#131315',
    indicator: { width: 56, height: 32, fill: 'rgba(188,12,12,0.24)' },
    badge: { size: 16, top: -4, left: 13 },
  },
} as const;

/* ───────────────────────────── Gölge ve cam ───────────────────────────── */
// RN 0.76+ (Expo SDK 54) `boxShadow` stilini CSS dizesi olarak destekler; tasarımdaki değerler birebir kullanılabilir.

export const shadow = {
  segmentedThumb: '0 3px 8px rgba(0,0,0,0.18)',
  switchKnob: '0 2px 6px rgba(0,0,0,0.3)',
  floating: '0 2px 8px rgba(0,0,0,0.35)',
  toast: '0 10px 30px rgba(0,0,0,0.4)',
  sheet: '0 -10px 40px rgba(0,0,0,0.5)',
  popover: '0 12px 30px rgba(0,0,0,0.4), inset 0 0 0 0.5px rgba(255,255,255,0.12)',
  hairlineInset: 'inset 0 0 0 0.5px rgba(255,255,255,0.12)',
  /** Avatar / rozet çevresindeki zemin renkli halka: `0 0 0 2px ${colors.bg}` */
  ring: (width: number, color: string) => `0 0 0 ${width}px ${color}`,
} as const;

/** expo-blur için: BlurView tint="dark". Tasarımdaki blur(16px) ≈ intensity 40, blur(20px) ≈ 50. */
export const blur = {
  glass: { tint: 'dark' as const, intensity: 40, overlay: colors.darkGlass },
  tabBar: { tint: 'dark' as const, intensity: 50, overlay: colors.tabBar },
};

/* ───────────────────────────── Degradeler (expo-linear-gradient) ───────────────────────────── */

// expo-linear-gradient en az iki duraklı DEMET istiyor; her degradenin en az iki
// durağı var, tip bunu söylüyor (değerler değişmedi).
type Gradient = {
  colors: readonly [string, string, ...string[]]; locations: readonly [number, number, ...number[]];
  start?: { x: number; y: number }; end?: { x: number; y: number };
};
const v = (stops: [string, number][]): Gradient => ({
  colors: stops.map((s) => s[0]) as unknown as Gradient['colors'],
  locations: stops.map((s) => s[1]) as unknown as Gradient['locations'],
});

export const gradients = {
  heroCard: v([['rgba(0,0,0,0.28)', 0], ['rgba(0,0,0,0)', 0.22], ['rgba(0,0,0,0)', 0.42], ['rgba(0,0,0,0.78)', 0.74], ['rgba(0,0,0,0.9)', 1]]),
  shortCard: v([['rgba(0,0,0,0)', 0.45], ['rgba(0,0,0,0.85)', 1]]),
  gameDetailHeader: v([['rgba(10,10,11,0.5)', 0], ['rgba(10,10,11,0)', 0.26], ['rgba(10,10,11,0)', 0.52], ['#0A0A0B', 1]]),
  newsDetailHeader: v([['rgba(10,10,11,0.5)', 0], ['rgba(10,10,11,0)', 0.3], ['rgba(10,10,11,0)', 0.6], ['#0A0A0B', 1]]),
  gameCommunityHeader: v([['rgba(10,10,11,0.45)', 0], ['rgba(10,10,11,0)', 0.35], ['rgba(10,10,11,0.2)', 0.6], ['#0A0A0B', 1]]),
  profileHeader: v([['rgba(10,10,11,0.45)', 0], ['rgba(10,10,11,0)', 0.4], ['rgba(10,10,11,0.3)', 0.7], ['#0A0A0B', 1]]),
  onboardingFade: v([['rgba(10,10,11,0)', 0], ['#0A0A0B', 0.88]]),
  bottomFade: v([['rgba(10,10,11,0)', 0], ['#0A0A0B', 0.3]]),
  videoPlayer: v([['rgba(0,0,0,0.55)', 0], ['rgba(0,0,0,0.05)', 0.3], ['rgba(0,0,0,0.05)', 0.65], ['rgba(0,0,0,0.7)', 1]]),
  settingsBanner: { ...v([['rgba(0,0,0,0.88)', 0], ['rgba(0,0,0,0.6)', 0.55], ['rgba(0,0,0,0.1)', 1]]), start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } },
  skeleton: { ...v([['#1C1C1E', 0.25], ['#2C2C2E', 0.5], ['#1C1C1E', 0.75]]), start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } },
} as const;

/* ───────────────────────────── Hareket ───────────────────────────── */
// Çoğu etkileşim 150–250 ms. Yalnızca transform ve opaklık; düzen kaymaz. "Hareketi azalt" açıkken döngüler durur.

export const motion = {
  duration: { instant: 150, standard: 200, transition: 250, loop: 1300, livePulse: 1800 },
  easing: {
    standard: Easing.bezier(0.2, 0.8, 0.2, 1), // sekme, alt sayfa, sayfa geçişi
    out: Easing.out(Easing.ease), // basma durumu
    pop: Easing.bezier(0.2, 0.9, 0.3, 1.25), // kalp / beğeni "pop"
    switch: Easing.bezier(0.3, 0.9, 0.4, 1),
  },
  press: { scale: 0.97, opacity: 0.9, duration: 150 },
  /** Kalp ve beğeni: 240 ms içinde 1 → 1.28 → 0.92 → 1 */
  pop: { keyframes: [1, 1.28, 0.92, 1], offsets: [0, 0.35, 0.65, 1], duration: 240 }, // offsets: kit CSS @keyframes gr-pop
} as const;

/* ───────────────────────────── Kısa yol ───────────────────────────── */

export const control = {
  buttonPadding: 18, buttonSmallPadding: 14, buttonGap: 8, disabledOpacity: 0.38,
  spinner: 18, iconStroke: 2.2, iconButton: 44, iconButtonGlyph: 22,
  chipHeight: 34, chipPadding: 14, chipFont: 14,
  fieldHeight: 48, fieldPadding: 14, fieldLabelGap: 6, fieldFocusWidth: 2,
  fieldBorderWidth: 1, fieldHelperGap: 4, fieldIcon: 18,
  segmentHeight: 36, segmentPadding: 2, segmentFont: 13,
  sectionHeight: 28, navHeight: 44, navSide: 96, pageHeight: 52,
  listHeight: 52, listPadding: 16, listGap: 14,
  searchHeight: 40, searchClear: 28,
} as const;

// DS 3 GameCard spacing differs intentionally from the legacy spacing scale.
export const gameCard = { priceGap: 6, badgePaddingH: 6, badgePaddingV: 2 } as const;

/* Kit ölçüleri — bileşenlerde sayı yazılmasın diye (kaynak: design/kit/k.py, c.py, s1.py; DS 2 ve DS 4). */
export const component = {
  iconButton: { dotSize: 8, dotTop: 9, dotRight: 10, dotRing: 2, badgeSize: 18, badgeTop: 4, badgeRight: 2, badgePadding: 5 },
  heart: { size: 36, icon: 18, card: { size: 34, icon: 17, inset: 8 }, hero: { size: 44, icon: 20 } },
  follow: { height: 34, radius: 10, paddingH: 14, gap: 5, check: 14, checkStroke: 2.6 },
  chip: { icon: 15, chevron: 14, chevronStroke: 2.4, gap: 6, iconStroke: 2.2, removablePaddingRight: 10 },
  segmentCompact: { height: 30, font: 12 },
  field: { iconGap: 10, helperGap: 5, helperIcon: 13 },
  search: { height: 40, radius: 12, paddingLeft: 12, paddingRight: 8, gap: 8, icon: 18, iconStroke: 2.2, clearArea: 28, clearCircle: 18, clearIcon: 11, clearStroke: 3, focusRing: 1.5, cancelGap: 10 },
  switchAndroid: { width: 51, height: 31, knob: 27, inset: 2 },
  toast: { width: 350, height: 52, radius: 14, paddingLeft: 14, paddingRight: 8, gap: 10, icon: 18, actionHeight: 36, actionPadding: 8, duration: 3000, lift: 12 },
  listRow: { iconBox: 30, iconBoxRadius: 8, icon: 17, separatorWithIcon: 60, separator: 16 },
  sectionHeader: { linkGap: 2, linkIcon: 16, linkStroke: 2.4, subtitleGap: 2 },
  homeHeader: { height: 44, markSize: 32, wordSize: 22, lockupGap: 9, actionGap: 2, edge: -6, avatar: 30 },
  pageHeader: { height: 52, actionGap: 4, edge: -8 },
  navBar: { height: 44, paddingH: 16, side: 96, backIcon: 24, backStroke: 2.3, backEdge: -10, edge: -8 },
  stickyBar: { paddingTop: 10, paddingH: 20, minBottom: 10, gap: 12, button: 48 },
  pageDots: { active: 18, size: 6, gap: 6, top: 12 },
  home: { greetingTop: 2, heroTop: 14, greetingChevron: 14, newsRowsTop: 18, newsRowsGap: 14, dealCount: 2 },
  // G-21 Profil (kit s4.py profile()).
  //
  // KİTTEN ALINMAYANLAR — hiçbirinin verisi yok, bkz. ekranın dosya başı:
  // kapak görseli, "Lv" rozeti, takipçi/takip sayaçları, "Şu an oynuyor"
  // kartı, saat/başarım karoları.
  profile: { avatar: 96, nameTop: 12, handleRow: 22, handleGap: 8, bioTop: 10,
    statsTop: 12, statsHeight: 24, statsGap: 18, statGap: 5, actionsTop: 16, actionHeight: 40,
    chipsTop: 12, chipHeight: 28, chipPaddingH: 12, chipGap: 8, chipDot: 6 },
  // G-19 Sohbet (kit s4.py chat()).
  //
  // GÖNDERİLEN BALONCUK VURGU RENGİ DEĞİL: kitte zemin `acS` (#F5F5F7) ve
  // metin `onAc` (#0A0A0B) — yani birincil düğmenin yüzeyi. Uygulamada
  // karşılığı `primary` / `onPrimary`; saat `onPrimaryMuted`.
  chat: { headerHeight: 52, headerPaddingH: 8, headerGap: 4, headerAvatar: 38, headerNameLeft: 8, headerIcon: 22, backIcon: 24, backStroke: 2.3,
    listPaddingH: 16, listGap: 16, groupGap: 6,
    bubble: { maxWidth: 270, paddingTop: 9, paddingH: 14, paddingBottom: 8, radius: 18, corner: 6, timeTop: 2 },
    divider: { height: 24, paddingH: 10, top: 16 },
    typing: { width: 64, height: 36, dot: 7, gap: 4 },
    composer: { paddingTop: 10, paddingH: 12, minBottom: 10, gap: 8, button: 44, plusIcon: 22, sendIcon: 19,
      input: 44, inputRadius: 22, inputLeft: 16, inputRight: 2 },
    // Paylaşım kartı (kit gcard / newsc): oyun ve fragman görselli kart,
    // haber küçük resimli satır. Fiyat satırı YOK — paylaşım yükünde fiyat
    // gelmiyor ve kart başına istek açmak ters listede yükseklik oynatırdı.
    share: { width: 264, imageHeight: 124, padding: 12, buttonTop: 12, button: 40,
      newsPadding: 10, newsGap: 10, newsThumb: 64, newsThumbRadius: 10, newsTextGap: 3,
      // Kartın altındaki saat satırı (kit tstamp).
      timeHeight: 14, timeTop: 4 },
    // Görsel / GIF mesajı (kit im): saat görselin üstünde koyu rozette.
    image: { width: 220, height: 150, badgeInset: 10, badgeHeight: 20, badgePaddingH: 7, badgeRadius: 6 },
    // Alıntı kutusu (kit reply): baloncuğun içinde ayrı bir kutu.
    quote: { padding: 8, paddingH: 10, radius: 10, gap: 5, icon: 14, textTop: 8, bodyPaddingH: 6 },
    // Tepki rozeti (kit reply): baloncuğun ALT kenarına biniyor.
    reaction: { height: 26, paddingH: 8, gap: 4, ring: 2, overlap: 14, inset: 10 } },
  // G-18 Mesajlar (kit s4.py messages()).
  messages: { searchTop: 4, searchHeight: 40, onlineTop: 18, onlineLabel: 18, onlineRailTop: 10, onlineRailHeight: 92,
    tile: { width: 64, avatar: 56, nameTop: 6 }, chipsTop: 16, chipsHeight: 32, listTop: 6 },
  // G-13 Gönderi Detayı (kit s3.py post_detail()).
  thread: { rootTop: 14, statsTop: 8, statsHeight: 40, statsGap: 16, headerTop: 18, headerHeight: 34, listTop: 12, gap: 18,
    dock: { paddingTop: 10, paddingH: 16, gap: 10, avatar: 32, input: 40, inputRadius: 20, inputLeft: 16, inputRight: 6, send: 34, sendIcon: 18 } },
  // G-10 Topluluk (kit s1.py community()).
  community: { segTop: 4, composerTop: 16, railTop: 24, feedTop: 28, feedGap: 28,
    composer: { padding: 14, radius: 18, row: 36, avatar: 36, gap: 10, chipsTop: 12, chipHeight: 32, chipPadding: 10, chipRadius: 10, chipGap: 5, chipIcon: 15 },
    tile: { width: 72, image: 60, radius: 18, nameTop: 8, subTop: 2 } },
  // G-08 Fiyat Karşılaştırma (kit s1.py prices()).
  prices: { headerTop: 16, headerHeight: 64, headerGap: 12, thumbWidth: 48, thumbHeight: 64, thumbRadius: 10, cardTop: 16, alertTop: 24,
    storesTop: 28, storesHead: 28, chipsTop: 12, listTop: 12, listRadius: 18, listPaddingV: 4, trustTop: 16, trustGap: 10, trustIcon: 18,
    alert: { padding: 16, radius: 18, row: 44, gap: 12, icon: 40, glyph: 19 } },
  // G-07 Oyun Detayı (kit s1.py game_detail()).
  detail: { heroHeight: 380, barSide: 16, barGap: 10, barIcon: 20, backIcon: 22, backStroke: 2.4,
    subTop: 4, ratingRow: 24, ratingTop: 12, ratingGap: 6, ratingStar: 16, badgeHeight: 20, badgePadding: 6, badgeRadius: 5, badgeRing: 1,
    chipsTop: 14, chipHeight: 30, chipPadding: 12, chipGap: 8, platformsTop: 12, platformsRow: 20, platformsIcon: 15,
    ctaTop: 20, ctaGap: 10, ctaPrimary: 52, ctaSecondary: 48,
    card: { top: 24, padding: 18, radius: 20, headerHeight: 18, updatedIcon: 12, updatedGap: 5, storeTop: 14, storeHeight: 44, storeGap: 12,
      priceTop: 14, priceHeight: 40, priceGap: 10, oldPrice: 16, buttonTop: 16, button: 48, separatorTop: 18, othersTitleTop: 14,
      othersTop: 4, otherRow: 52, otherGap: 12, linkTop: 4, linkHeight: 44, linkChevron: 18, visibleOthers: 3 },
    trailerRatio: 197 / 350, trailerRadius: 18, trailerTag: { height: 26, paddingH: 9, radius: 8, inset: 12, gap: 6 },
    shot: { width: 200, height: 112, radius: 12 }, shotsTop: 12,
    aboutTop: 10, aboutLines: 4, readMoreHeight: 32, readMoreTop: 2, cellsTop: 14, cellGap: 12, cellInner: 2,
    review: { height: 128, padding: 16, radius: 18, gap: 20, scoreWidth: 96, votesTop: 6, bar: 6, barGap: 4, barRow: 16, barLabel: 56, barValue: 30 } },
  hero: { tagHeight: 28, tagIcon: 13, metaGap: 5, metaStar: 12, priceRow: 28, storeGap: 2 },

  // ── §4 Oyun ve fiyat (kit c.py/k.py: disc, old, price, drop, mono, store, store_row, stat, status, game_m, game_s, drop_card, deal_card, chart) ──
  discount: { paddingH: 7, radius: 6, sizes: { xs: [11, 20], sm: [12, 22], md: [13, 24], lg: [14, 26], card: [15, 26] } },
  oldPrice: 13,
  priceDrop: { icon: 2, gap: 4, stroke: 2.4 },
  storeBadge: { size: 16, radius: 5, font: 9, gap: 5, row: { size: 40, radius: 11, font: 16 }, small: { size: 32, radius: 9, font: 13 }, large: { size: 44, radius: 12, font: 18 } },
  storeRow: { height: 64, paddingLeft: 16, paddingRight: 14, gap: 12, separator: 68, chevron: 16, rightGap: 3 },
  statTile: { height: 84, padding: 12, radius: 14, icon: 18, gap: 2, valueTopWithIcon: 4, valueTopNoIcon: 20 },
  statusPill: { height: 22, paddingH: 8, radius: 6, gap: 4, dot: 6, icon: 12, star: 11 },
  gameCardMedium: { titleTop: 8, metaTop: 2, metaHeight: 16, metaGap: 5, star: 11, priceRow: 22, priceTop: 6, priceGap: 6, badge: 16, discountInset: 8 },
  gameCardSmall: { titleTop: 8, rowHeight: 20, rowTop: 2, gap: 6 },
  dropCard: { radius: 16, padding: 12, discountInset: 10, priceRow: 24, top: 6, gap: 8, arrow: 12 },
  dealCard: { radius: 20, paddingTop: 16, paddingH: 16, paddingBottom: 14, coverWidth: 64, coverHeight: 84, coverRadius: 12, gap: 12,
    dash: 1.5, notch: 18, notchOffset: -26, pricesTop: 14, priceRow: 36, buttonTop: 12, buttonBottom: 16, columnsGap: 8 },
  // G-08 "En İyi Fiyat" kartı (kaynak): köşe 22, iç 18; başlık 22; mağaza 48 (köşe 12, harf 20) üstte 14;
  // fiyat satırı 44 (40 pt fiyat, 17 eski, 15/28 indirim) üstte 16; not 18 üstte 6; buton 50 üstte 16; dipnot üstte 10.
  bestPrice: { radius: 22, padding: 18, headerHeight: 22, badgePadding: 8, badgeIcon: 12, badgeGap: 4,
    storeTop: 14, storeHeight: 48, storeBadge: 48, storeRadius: 12, storeFont: 20, storeGap: 12,
    priceTop: 16, priceHeight: 44, priceGap: 10, oldPrice: 17, noteTop: 6, noteHeight: 18, buttonTop: 16, button: 50, footTop: 10 },
  chart: { width: 318, height: 120, grid: '3 5', lowRadius: 5, lowRing: 3, haloRadius: 9, labelOffset: 22 },
  rail: { hero: [10, 344], game: [12, 160], drop: [12, 276], deal: [12, 312], video: [14, 294], friend: [8, 0], short: [12, 144],
    online: [14, 0] },

  // ── §5 Topluluk ve sosyal (avatar, friend, trend_card, post_head, post, actions, badge, comment, user_row, comm_row, msg_row, notif, nlead, count, fresh) ──
  avatar: { onlineMin: 10, onlineRatio: 0.28, onlineRing: 2.5, gameRatio: 0.46, gameRadius: 7, gameOffset: -4, ringGap: 3, ringWidth: 2, initialRatio: 0.4 },
  friendTile: { width: 96, avatar: 56, nameTop: 10, statusTop: 2, dot: 6, gap: 4 },
  trend: { radius: 18, paddingV: 4, row: 60, paddingLeft: 16, paddingRight: 14, gap: 12, box: 28, boxRadius: 8, icon: 15, separator: 56, pillHeight: 22, pillPadding: 7, pillRadius: 6, pillIcon: 11 },
  postHeader: { height: 40, avatar: 40, gap: 12, nameRow: 20, nameGap: 6, more: 40, moreIcon: 20, moreEdge: -10 },
  post: { indent: 52, bodyTop: 10, mediaTop: 12, mediaRadius: 14, gameTop: 10, actionsTop: 6 },
  gameTag: { height: 32, rowGap: 8, radius: 10, paddingLeft: 4, paddingRight: 12, gap: 7, thumb: 24, thumbRadius: 7, chevron: 13 },
  actions: { height: 40, edge: -10, minWidth: 44, paddingH: 10, gap: 6, icon: 20 },
  badgeSmall: { height: 18, paddingH: 6, radius: 5, gap: 3, icon: 11 },
  comment: { avatar: 40, replyAvatar: 32, gap: 10, headHeight: 20, nameGap: 6, textTop: 4, actionsTop: 6, actionsHeight: 28, actionsGap: 18, heart: 15, heartGap: 5, replyIndent: 52 },
  userRow: { height: 60, gap: 12, avatar: 44, thumb: 44, thumbRadius: 12 },
  // `dot`: sunucu okunmamış SAYISI vermiyor (boolean), sayaç rozeti uydurma
  // olurdu. Kitteki tek okunmamış noktası bildirim satırınınki (8, AC) — aynı
  // anlamın çizimi olduğu için ölçüsü oradan alındı.
  messageRow: { height: 72, paddingH: 20, gap: 12, avatar: 52, lineGap: 4, lineHeight: 20, previewGap: 5, check: 15, dot: 8 },
  notification: { minHeight: 76, paddingTop: 12, paddingRight: 20, paddingBottom: 12, paddingLeft: 22, gap: 12, dot: 8, dotLeft: 8,
    lead: 44, leadIcon: 20, leadRadius: 12, corner: 22, cornerIcon: 12, cornerRing: 2.5, cornerOffset: -4, thumb: 44, thumbRadius: 10, textGap: 2 },
  countBadge: { size: 20, paddingH: 6 },
  liveTime: { dot: 7, gap: 6, pulse: 6 },

  // ── §6 Medya ve haber (video, short, news_feat, news_row, media_img, playc, ovl) ──
  overlayTag: { height: 22, paddingH: 7, radius: 6, inset: 10, gap: 4, icon: 12 },
  playButton: { sizes: [44, 48, 60], iconRatio: 0.4, nudge: 2 },
  videoCard: { infoTop: 10, titleHeight: 40, lineTop: 4, gameTop: 8, chipHeight: 24, chipRadius: 7, chipPaddingLeft: 3, chipPaddingRight: 8, chipThumb: 18, chipThumbRadius: 5, chipGap: 6, avatarGap: 10 },
  shortCard: { radius: 16, inset: 10, viewsTop: 6, viewsGap: 4, playIcon: 11 },
  newsFeature: { width: 350, imageHeight: 196, radius: 18, metaHeight: 16, metaTop: 12, metaGap: 6, titleTop: 6, descTop: 6 },
  newsRow: { height: 72, gap: 14, thumbWidth: 96, thumbHeight: 72, thumbRadius: 12, metaHeight: 16, titleTop: 6 },
  mediaImage: { radius: 14, tagInset: 10, tagHeight: 24, tagRadius: 7, tagPadding: 8, tagGap: 5 },
  skeleton: { card: { titleWidth: 120, titleHeight: 14, metaWidth: 80, metaHeight: 10, priceWidth: 60, priceHeight: 16, radius: 6, gap: 8 } },
} as const;

export const theme = { colors, fonts, typography, space, layout, radius, size, shadow, blur, gradients, motion, tabBar, control, gameCard, component } as const;
export type Theme = typeof theme;
