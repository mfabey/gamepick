// Gamerisen mobil tema — web sitesinin (koyu tema) GERÇEK renkleriyle birebir
// Kaynak: app/globals.css [data-theme] koyu değişkenleri. Vurgu = KIRMIZI.
export const colors = {
  bg:         '#080a0d',              // --bg-body (ana ekran arka planı)
  bgElevated: '#0e1014',              // --bg
  card:       '#14171c',              // --bg-card
  bgInput:    '#1b1f26',              // --bg-input
  bgHover:    '#1a1e24',              // --bg-hover
  cardBorder: 'rgba(255,255,255,0.08)',   // --border
  borderHover:'rgba(255,255,255,0.16)',   // --border-hover
  text:       '#f2f4f7',              // --text
  text2:      '#9aa3b0',              // --text-2
  // text3 eskiden #69707c idi: en açık yüzeyimizde 3.31:1 veriyordu ve Apple'ın
  // küçük metin için istediği 4.5:1'in altındaydı (HIG Accessibility tablosu).
  // Ton korunarak açıklık yükseltildi → tüm yüzeylerde ≥4.5:1.
  text3:      '#808690',              // --text-3 (erişilebilir)
  accent:     '#e8242b',              // --accent (KIRMIZI) — dolgu/kenarlık/ikon
  // Marka kırmızısı METİN olarak 3.71–4.45:1 arasında kalıyordu. Marka rengini
  // bozmamak için ayrı bir metin tonu var: dolgular #e8242b kalır, yalnızca
  // yazı bu tonu kullanır. (İkonlar grafik sayıldığı için 3:1 eşiğine tabi ve
  // zaten uygun — onlar da marka tonunda kalıyor.)
  accentText: '#ec4d52',              // yalnızca metin için
  accentBg:   '#241012',              // --accent-bg
  accentSoft: 'rgba(232,36,43,0.14)',
  accentBorder: 'rgba(232,36,43,0.40)',   // --accent-border tonunda
  accentGlow: 'rgba(232,36,43,0.42)',     // --accent-glow
  green:      '#00d26e',              // --green
  steam:      '#1a9fff',
  xbox:       '#4ade80',
  danger:     '#ef4949',              // en açık yüzeyde 4.39 → 4.50:1
  overlay:    'rgba(0,0,0,0.6)',
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

// Floating alt bar için ekran altına bırakılacak boşluk
export const TAB_SPACE = 104;
