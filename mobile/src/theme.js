import { Appearance } from 'react-native';

// Gamerisen mobil tema — web sitesinin (koyu tema) GERÇEK renkleriyle birebir
// Kaynak: app/globals.css [data-theme] koyu değişkenleri. Vurgu = KIRMIZI.
const dark = {
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
  // Yüzen sekme çubuğunun CAM OLMAYAN zemini (Android + iOS 26 öncesi).
  // FloatingTabBar'da sabit kodluydu; açık temada çubuk koyu kalıyordu ve
  // simülatörde görünmüyordu çünkü iOS 26 cam yolunu kullanıyor.
  barSolid:   'rgba(18,21,27,0.94)',
  // Sekme çubuğundaki kayan vurgu. accentBg opak, çubuğun üstünde ağır
  // duruyor; bu saydam kalmalı.
  accentPill: 'rgba(232,36,43,0.16)',
};

// ─────────────────────────────────────────────────────────────────────────────
// AÇIK TEMA
//
// Koyu paletin aynadaki karşılığı DEĞİL, rollerinin karşılığı: koyuda zemin
// koyulaştıkça kartlar ayrışıyordu; açıkta tersi çalışıyor — sayfa hafif gri,
// kartlar beyaz. Aynı hiyerarşi, ters yön.
//
// Kontrast ÖLÇÜLDÜ (WCAG, dört yüzeyin hepsinde): text 15.85–18.41,
// text2 5.29–6.15, text3 4.83–5.61, accentText 4.93–5.73, danger 4.84–5.62,
// green 4.72–5.48. En dar oran 4.72 — Apple'ın küçük metin için istediği
// 4.5:1'in üstünde.
//
// MARKA RENGİ DOLGUDA DEĞİŞMİYOR: accent iki temada da #e8242b. Yalnızca
// METİN tonu koyulaşıyor (accentText), çünkü açık zeminde marka kırmızısı
// 4.5:1'i geçmiyor — koyu temadaki kuralın aynısı, ters yöne uygulanmış.
const light = {
  bg:         '#f4f5f7',
  bgElevated: '#ffffff',
  card:       '#ffffff',
  bgInput:    '#eceef2',
  bgHover:    '#e6e9ee',
  cardBorder: 'rgba(0,0,0,0.10)',
  borderHover:'rgba(0,0,0,0.22)',
  text:       '#12141a',
  text2:      '#5a6270',
  text3:      '#616875',
  accent:     '#e8242b',
  accentText: '#c81e24',
  accentBg:   '#fdecec',
  accentSoft: 'rgba(232,36,43,0.10)',
  accentBorder: 'rgba(232,36,43,0.35)',
  accentGlow: 'rgba(232,36,43,0.28)',
  green:      '#00794a',
  steam:      '#0b74c4',
  xbox:       '#107c10',
  danger:     '#c62828',
  overlay:    'rgba(0,0,0,0.45)',
  barSolid:   'rgba(255,255,255,0.94)',
  // Açık zeminde aynı opaklık soluk kalıyor; ton koyulaşıp opaklık düşüyor
  // (accentText ile aynı karar — bkz. palet başı).
  accentPill: 'rgba(200,30,36,0.14)',
};

// ─────────────────────────────────────────────────────────────────────────────
// TEMA SEÇİMİ — AÇILIŞTA, BİR KEZ.
//
// `StyleSheet.create` modül yüklenirken değerlendiriliyor; yani palet o anda
// neyse stiller onu yakalıyor. 51 dosyadaki 877 referansı çalışma zamanında
// değiştirebilmek için hepsini `useThemedStyles` desenine çevirmek gerekirdi —
// büyük bir yeniden yazım ve regresyon riski.
//
// `Appearance.getColorScheme()` EŞZAMANLI ve bu modül değerlendirilirken
// okunabiliyor. Açılışta seçmek, 877 referansın hiçbirine dokunmadan iki temayı
// da doğru çalıştırıyor.
//
// BEDELİ: uygulama AÇIKKEN sistem teması değişirse ekran anında dönmez.
// `src/services/themeWatch.js` bunu karşılıyor — uygulama ön plana geldiğinde
// tema değiştiyse paketi yeniden yüklüyor.
//
// null (cihaz belirtmiyor) → KOYU. Uygulamanın bugüne kadarki hâli bu.
const scheme = Appearance.getColorScheme();
export const isDarkTheme = scheme !== 'light';
export const activeScheme = isDarkTheme ? 'dark' : 'light';
export const colors = isDarkTheme ? dark : light;

/**
 * Aktif zeminin ALFA 0 hâli — kenar sönümlemesi gradyanının bitiş rengi.
 *
 * `transparent` kullanılamıyor: iOS gradyanı saydam SİYAHA doğru
 * interpolasyona sokuyor ve açık zeminde gri bir leke bırakıyor
 * (bkz. components/EdgeFade.jsx). Bitiş rengi zeminin kendisi olmalı,
 * yalnızca alfası 0.
 *
 * Değer paletten TÜRETİLİYOR, elle yazılmıyor: EdgeFade'de 'rgba(6,7,10,0)'
 * sabiti duruyordu ve açık temaya geçince tam bu lekeyi üretti.
 */
export const bgAlpha0 = (() => {
  const h = colors.bg.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},0)`;
})();

// ─────────────────────────────────────────────────────────────────────────────
// Değere bağlı renk ölçeği
//
// Kural: RENK DEĞERE BAĞLIYSA KALIR, SABİT ETİKETSE NOTRLEŞIR. Metacritic
// puanı, yorum oranı gibi ölçütlerin rengi bilgi taşıyor — vurgu rengiyle
// karıştırılmamalı, o dikkat çekmek için. Bu yüzden accent'ten AYRI grup.
//
// Değerler dört dosyaya dağılmış ham hex olarak duruyordu; buraya taşınırken
// AYNEN korundu, yani görsel bir değişiklik yok.
export const scale = {
  best: '#4ade80',
  good: '#86efac',
  mid:  '#fbbf24',
  weak: '#fb923c',
  bad:  '#f87171',
};

// Metacritic eşik kuralı ÜÇ yerde birebir kopyalanmıştı: anasayfa kartı,
// oyun detayı ve GameCard. Eşik değişirse üçünü birden değiştirmek
// gerekiyordu — tek kaynak.
//
// 80+ için scale.best değil colors.green kullanılıyor: mevcut davranış buydu
// ve değiştirmek görsel bir karar olurdu. İki yeşilin ayrışması ayrı bir iş.
export function metacriticColor(n) {
  if (n >= 80) return colors.green;
  if (n >= 60) return scale.mid;
  return scale.bad;
}

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

// ─────────────────────────────────────────────────────────────────────────────
// BOŞLUK ÖLÇEĞİ
//
// KANONİK OLAN SAYISAL AD (s4…s48). Sebebi ölçüldü: eksik basamaklardan biri
// 20 ve onu tişört adlandırmasına sokmak `xl`i kaydırmayı gerektiriyordu —
// `xl` şu an 24 olarak 60+ yerde kullanılıyor, yani sessiz bir kayma olurdu.
//
// Tişört adları ALIAS olarak duruyor: 186 kullanım var, hepsini dönüştürmek
// davranış değiştirmeyen büyük bir kodmod demekti. İkisi de aynı sayıya
// çıkıyor, yani karışıklık yalnızca isimde.
//
// ÖLÇEĞİN KENDİSİ SORUNU ÇÖZMÜYOR: ölçüm, ham boşluk değerlerinin %71'inin
// ölçek DIŞINDA olduğunu gösterdi (en sık 10, 6, 14 — üçü de burada yok).
// O borç scripts/check-spacing.mjs ile dondurulmuş durumda; ekranlara
// dokunuldukça gözle doğrulanarak eritiliyor.
// ─────────────────────────────────────────────────────────────────────────────
export const spacing = {
  s4: 4, s8: 8, s12: 12, s16: 16, s20: 20, s24: 24, s32: 32, s40: 40, s48: 48,
  // Eski adlar — hâlâ geçerli, aynı değerler.
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24,
};

// Floating alt bar için ekran altına bırakılacak boşluk
export const TAB_SPACE = 104;
