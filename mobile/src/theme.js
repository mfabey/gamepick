import { palette } from './design/tokens';
import { Appearance } from 'react-native';

// Gamerisen mobil tema.
// Kaynak: 2026-08 tasarım handoff'u (design_handoff_gamerisen). Vurgu = KIRMIZI.
// Handoff jetonları birebir alındı; YALNIZ erişilebilirlik eşiğinde kalan
// metin tonları ölçümle düzeltildi — gerekçeleri paletlerin içinde.
// ─────────────────────────────────────────────────────────────────────────────
// PALETLER — src/design/tokens.js'ten TÜRETİLİYOR, elle yazılmıyor.
//
// Eski adlar (bg, card, text, accent…) KORUNDU: kodda 877 referans var ve
// hepsini yeniden adlandırmak davranış değiştirmeyen dev bir kodmod olurdu.
// Her ad artık handoff'taki karşılığına bakıyor.
//
// HANDOFF'TA OLMAYANLAR aşağıda ayrıca duruyor: green/steam/xbox/danger
// (durum ve mağaza renkleri) ve accentGlow. Tasarım paketi bunları
// tanımlamıyor ama kodda 78 kullanımları var; silmek özellik kaybı olurdu.
// Bunlar handoff'un kapsamı dışında ve öyle işaretli.
// ─────────────────────────────────────────────────────────────────────────────
const T = { dark: palette.dark, light: palette.light };

function paletten(t) {
  return {
    bg:          t.bg,
    bgElevated:  t.surface,
    card:        t.surface2,
    bgInput:     t.surface3,
    bgHover:     t.surface3,
    cardBorder:  t.border,
    borderHover: t.borderStrong,
    text:        t.text1,
    text2:       t.text2,
    text3:       t.text3,
    accent:      t.brand,
    accentText:  t.brandText,
    accentBg:    t.brandWash,
    accentSoft:  t.brandWash,
    accentBorder: t.brandWashBorder,
    accentPill:  t.brandWash,
    onAccent:    t.onBrand,
    // Grafik yer tutucu yüzeyi: ikon yuvası, avatar dolgusu, monogram zemini.
    surfaceTile: t.surface4,
    // Cam sekme çubuğu
    glassFill:     t.glassFill,
    glassBorder:   t.glassBorder,
    barSolid:      t.glassFallback,
    overlay:       t.overlayScrimTop,
    overlayStrong: t.overlayScrimBottom ?? t.overlayScrimTop,
  };
}

// HANDOFF KAPSAMI DIŞI — tasarım paketi durum/mağaza renklerini tanımlamıyor.
const dark = {
  ...paletten(T.dark),
  green:      '#00d26e',
  steam:      '#1a9fff',
  xbox:       '#4ade80',
  danger:     '#ef4949',
  accentGlow: 'rgba(232,36,43,0.42)',
};

const light = {
  ...paletten(T.light),
  green:      '#00794a',
  steam:      '#0b74c4',
  xbox:       '#107c10',
  danger:     '#c62828',
  accentGlow: 'rgba(232,36,43,0.28)',
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
  // Handoff'un "Ekran başlığı" kademesi (34 / 700 / −2.2%). Mevcut on bir
  // kademe BOZULMADI — handoff altı kademe öneriyor ama 363 kullanımı
  // yeniden eşlemek kırıcı bir iş; eksik olan basamak eklendi.
  display1: 34,
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
//
// ÖLÇÜM (sonradan): bu ölçek vardı ama HİÇ KULLANILMIYORDU — uygulamada 16
// farklı süre ve 4 farklı yay ayarı elle yazılmıştı. Ölçek yanlış değildi,
// yalnızca eksikti: görsel çözülmesi ve yay ayarları için karşılığı yoktu,
// o yüzden herkes kendi sayısını yazıyordu. Eksik basamaklar eklendi;
// mevcut dördü DEĞİŞTİRİLMEDİ.
export const motion = Object.freeze({
  fast:    150,   // basma, renk geçişi
  base:    240,   // giriş, açılma
  exit:    160,   // çıkış — girişin ~%65'i
  stagger:  40,   // liste öğeleri arası gecikme (MD: 30–50ms)

  // Görsel çözülmesi TEK değer. Öncesinde 100/120/140/150/200/220/250 vardı —
  // hiçbiri tek başına fark edilmiyor ama yan yana yükleyen iki görsel farklı
  // hızda beliriyordu.
  image:   200,

  // ── Yükleme ──
  // Handoff, iskelet için iki sayı veriyor: süpürme 1400 ms linear, içerik
  // gelince 160 ms fade. İkincisi `exit` ile aynı sayı ama AYNI ŞEY DEĞİL —
  // biri çıkış, bu bir giriş. Ayrı adla duruyor ki biri değişince öteki
  // sessizce sürüklenmesin.
  skeleton: 1400,  // parıltı süpürmesi — tek tur
  reveal:    160,  // iskeletten içeriğe geçiş (fade + 4px yukarı)

  // ── Yaylar ──
  // İkisi çelişmiyor, farklı işler. İkisi de zaten ölçülmüştü; burada
  // yalnızca adlandırıldılar.
  //   pop  → aşma İSTENEN yer: "bir şey oldu" hissi. ζ = 14/(2·√260) ≈ 0.43
  //   firm → aşma İSTENMEYEN yer: hedefe en hızlı, hiç aşmadan. (Sekme
  //          vurgusu: aşıp geri gelmesi bozukluk gibi görünüyordu.)
  pop:  { stiffness: 260, damping: 14 },
  firm: { duration: 300, dampingRatio: 1, overshootClamping: true },
});

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

// ─────────────────────────────────────────────────────────────────────────────
// YÜKSELTME GÖLGESİ — yüzen sekme çubuğu ve alt sayfalar.
//
// Handoff: koyu temada `0 16px 40px rgba(0,0,0,.55)`, açıkta
// `0 12px 32px rgba(0,0,0,.12)`. RN'de gölge dört ayrı özellik olduğu için
// jeton bir NESNE; doğrudan style dizisine konabiliyor.
//
// FloatingTabBar'da sabit kodluydu ve açık temada koyu temanın gölgesini
// kullanıyordu — beyaz zeminde ağır duruyordu.
export const shadows = {
  floating: isDarkTheme
    // tema-bagimsiz: golge her zaman siyah; temaya gore degisen opaklik ve yaricap
    ? { shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.55, shadowRadius: 40, elevation: 18 }
    // tema-bagimsiz: ayni gerekce
    : { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 32, elevation: 10 },
};


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
// ─────────────────────────────────────────────────────────────────────────────
// YÜZEN SEKME ÇUBUĞU ÖLÇÜLERİ — tasarım handoff'undan.
//
// TEK KAYNAK. Öncesinde BAR_H iki dosyada ayrı ayrı tanımlıydı
// (FloatingTabBar ve videos.jsx) ve elle eşitleniyordu; biri değişip diğeri
// unutulsaydı reels'in alt eylem rayı yanlış yere otururdu.
//
// Handoff: yükseklik 64, yarıçap tam kapsül, yan kenardan 20, alttan 24.
// TAB_SPACE (liste alt güvenli boşluğu) handoff'ta da 104 — değişmedi.
export const TAB_BAR = {
  height: 64,
  side: 20,
  bottom: 24,
};

export const TAB_SPACE = 104;

// ─────────────────────────────────────────────────────────────────────────────
// EN KÜÇÜK DOKUNMA HEDEFİ — Apple HIG: 44×44 pt.
//
// Bu sayı boşluk ölçeğinde YOK ve olmamalı da: 4pt ızgarasındaki bir boşluk
// adımı değil, bir DENETİM YÜKSEKLİĞİ. Ölçeğe 44 eklemek boşluk basamağı
// olarak da kullanılmasının önünü açardı.
//
// Handoff'un fiyat satırı ölçüsü de aynı sayı (44 yükseklik satır).
//
// NOT: kod tabanında hâlâ 38 yerde düz `44` yazıyor. Buraya taşınmaları
// ayrı bir iş; yeni kod bu sabiti kullanmalı.
// ─────────────────────────────────────────────────────────────────────────────
export const TOUCH_MIN = 44;
