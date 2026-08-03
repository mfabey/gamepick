// Gamerisen mobil tema — web sitesinin (koyu tema) GERÇEK renkleriyle birebir
// Kaynak: app/globals.css [data-theme] koyu değişkenleri. Vurgu = KIRMIZI.
export const colors = {
  // ── Zemin katmanları ──
  // Sadeleştirme turunda derinleştirildi. Amaç dekoratif değil: zemin
  // koyulaştıkça kapak görselleri kendiliğinden ayrışıyor ve kartların
  // kenarlığa ihtiyacı kalmıyor. Daha az çizgi = daha az göz hareketi.
  //
  // Kontrast yeniden ölçüldü — dört yüzeyin HEPSİNDE text/text2/text3/
  // accentText/danger ≥ 4.5:1 (en dar olan bgInput üzerinde text3: 4.51).
  // Zemin koyulaştığı için oranlar düşmedi, yükseldi.
  bg:         '#06070a',              // --bg-body (ana ekran arka planı)
  bgElevated: '#0d0f14',              // --bg
  card:       '#151920',              // --bg-card
  bgInput:    '#1b1f26',              // --bg-input
  bgHover:    '#1a1e24',              // --bg-hover
  cardBorder: 'rgba(255,255,255,0.07)',   // --border
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

// ─────────────────────────────────────────────────────────────────────────────
// Tipografi ölçeği
//
// Öncesinde kodda 27 farklı font boyutu vardı (11.5, 12.5, 13.5 gibi keyfi ara
// değerler dahil) ve aralarında bir sistem yoktu. Bu ölçek Apple'ın iOS metin
// stillerine yaslanıyor — HIG'e göre iOS'ta varsayılan gövde 17pt, minimum 11pt.
//
// YENİ KOD BU ÖLÇEĞİ KULLANMALI, ham sayı yazmamalı.
export const type = {
  caption2: 11,   // Apple minimumu — bunun altına inilmez
  caption:  12,
  footnote: 13,
  subhead:  15,
  body:     17,   // HIG varsayılanı
  headline: 20,
  title3:   22,
  title2:   24,
  title1:   28,
  hero:     40,
  display:  62,
};

// Basma geri bildirimi — dokunuşa 100ms içinde görsel yanıt (Apple HIG).
// Modül düzeyinde DONDURULMUŞ tek nesne: her render'da yeni nesne üretmek
// gereksiz yeniden çizime yol açıyor.
export const PRESSED = Object.freeze({ opacity: 0.65 });

// ─────────────────────────────────────────────────────────────────────────────
// Sadeleştirmenin karşılığı: dokunsal his
//
// Arayüz sakinleştikçe geri bildirimin kalitesi daha çok önem kazanıyor —
// az şey bağırdığında, dokunduğun şeyin cevap vermesi belirleyici oluyor.
// ─────────────────────────────────────────────────────────────────────────────

// Kart/karo gibi BÜYÜK yüzeyler için: hafif küçülme, parmağın altında
// "bastırılmış" hissi veriyor.
//
// Neden ayrı bir belirteç: PRESSED 63 yerde kullanılıyor ve bazıları tam
// genişlikte satır ya da mutlak konumlu öğe — hepsine ölçek uygulamak garip
// durur. Bu yüzden blanket değil, İSTEĞE BAĞLI.
//
// scale layout'u DEĞİŞTİRMEZ (derleyici dönüşümü), yani yeniden yerleşim
// tetiklemiyor. HIG'in 0.95–1.05 aralığının üst ucunda kalındı: 0.97 fark
// edilir ama sıçrama hissi vermez.
export const PRESSED_CARD = Object.freeze({
  opacity: 0.9,
  transform: [{ scale: 0.97 }],
});

// Rakamların hizası — fiyat, saat, sayaç.
// Orantılı yazıda "1" ile "8" farklı genişlikte olduğu için liste kaydırırken
// fiyat sütunu titriyor. Tablo rakamları bunu durduruyor.
export const NUMERIC = Object.freeze({ fontVariant: ['tabular-nums'] });

// Hareket süreleri — tek yerden yönetilsin ki tüm uygulama aynı ritimde olsun.
// Material/HIG: mikro etkileşim 150–300ms; çıkış girişten kısa olmalı.
export const motion = Object.freeze({
  fast:    150,   // basma, renk geçişi
  base:    240,   // giriş, açılma
  exit:    160,   // çıkış — girişin ~%65'i
  stagger:  40,   // liste öğeleri arası gecikme (MD: 30–50ms)
});

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

// Floating alt bar için ekran altına bırakılacak boşluk
export const TAB_SPACE = 104;
