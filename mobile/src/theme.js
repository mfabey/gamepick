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
// AÇILIŞ PALETİ — ARTIK YALNIZCA YEDEK.
//
// Bu blok bir zamanlar temayı SEÇEN yerdi: palet açılışta bir kez okunuyor,
// `StyleSheet.create` o değerleri yakalıyordu. Bedeli, uygulama açıkken tema
// değişince ekranın eski palette kalmasıydı; `services/themeWatch.js` bunu
// paketi yeniden yükleyerek karşılıyordu.
//
// GEÇİŞ BİTTİ. Her ekran artık `useStyles(makeStyles)` + `useTheme()`
// kullanıyor (check-theme-reactive: 0 donuk dosya) ve tema yeniden yükleme
// OLMADAN dönüyor. themeWatch silindi — iki mekanizmayı bir arada bırakmak,
// reaktif tema zaten doğru rengi çizdikten SONRA gereksiz bir reloadAsync
// tetikliyordu: kullanıcının kaydırma konumu ve yazdığı metin gidiyordu.
// (`activeScheme` açılışta donduğu için karşılaştırma her seferinde
// eşitsizlik veriyordu.)
//
// `colors` yalnızca tema BAĞLAMI DIŞINDA kalan yerler için duruyor —
// bileşen ağacının dışındaki modül seviyesi hesaplar. Ekranlarda
// kullanılmamalı; `import { colors }` araması sıfır sonuç vermeli.
const scheme = Appearance.getColorScheme();
const isDarkTheme = scheme !== 'light';
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
 *
 * ARTIK FONKSİYON, sabit değil: sabit hâli açılıştaki paletten bir kez
 * hesaplanıyordu, yani tema değişince eski zeminin saydamı kalıyordu —
 * düzeltmek için yazıldığı hatanın reaktif sürümü.
 */
export function alfaSifir(hex) {
  const h = String(hex).replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},0)`;
}

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
  transform: [{ scale: 0.97 }],
});

// ── BASMA AYDINLANMASI ──
// Maket: "Parmak değdiği an 0.97 ölçek + %6 AYDINLANMA."
// Bizde `opacity: 0.9` vardı ve bu koyu temada TERS yönde çalışıyor: opaklığı
// düşürmek öğeyi arka plana (siyaha) yaklaştırır, yani karartır. Maket
// aydınlatmak istiyor.
//
// RN'de `filter: brightness` yok; %6 aydınlanmanın karşılığı üstüne
// rgba(255,255,255,0.06) bir katman koymak. Bu bir STİL değil KATMAN olduğu
// için PRESSED_CARD'ın içine giremiyor — zemini olan çağrı yerleri bunu
// ayrı bir View olarak koyuyor.
export const PRESS_LIFT = 'rgba(255,255,255,0.06)';

/**
 * Basılan yüzeyin rengi — "%6 aydınlanma"nın düz zeminlerde karşılığı.
 *
 * Katman koymak yerine karıştırma: düz zeminli bir kartta sonuç birebir
 * aynı (üstüne %6 beyaz koymakla rengi %6 beyaza kaydırmak aynı hesap) ama
 * fazladan bir View gerektirmiyor. GÖRSEL üstündeki basmalarda
 * karıştırılacak zemin yok; orası PRESS_LIFT katmanını kullanıyor.
 *
 * ── YÖN TEMAYA GÖRE DEĞİŞİYOR ──
 * Maket koyu tema üzerine yazılmış ve "aydınlanma" diyor. Açık temada bu
 * kural çalışmıyor: yüzey zaten beyaza yakın (#EFEFF2), %6 daha
 * aydınlatınca fark ÖLÇÜLDÜ ve görünmüyor — rgb(240,240,243).
 *
 * Kuralın özü "parlaklaştır" değil, SAYFA ZEMİNİNDEN UZAKLAŞ: koyu temada
 * bu aydınlanmak, açıkta koyulaşmak demek. İki temada da basılan yüzey
 * çevresinden ayrışıyor.
 */
export function basiliYuzey(colors, oran = 0.06) {
  const h = String(colors.card).replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  // Sayfa zemini koyu mu? Kanalların ortalaması eşik.
  const zemin = String(colors.bg).replace('#', '');
  const zn = zemin.length === 3 ? zemin.split('').map((c) => c + c).join('') : zemin;
  const koyuZemin = (parseInt(zn.slice(0, 2), 16) + parseInt(zn.slice(2, 4), 16)
                   + parseInt(zn.slice(4, 6), 16)) / 3 < 128;
  const hedef = koyuZemin ? 255 : 0;
  const k = (i) => {
    const v = parseInt(n.slice(i, i + 2), 16);
    return Math.round(v + (hedef - v) * oran);
  };
  return `rgb(${k(0)},${k(2)},${k(4)})`;
}

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

  // ── MAKETİN ADLANDIRDIĞI ADIMLAR ──
  // Handoff'un hareket tablosu (screens/05-bolum.png) her etkileşime bir
  // süre veriyor. Bunlar eksikti; kod ham sayı yazıyordu.
  //
  // ÜST SINIR 320: "Aralık 100–320 ms." Bunun dışındaki iki değer
  // (RotateGlowButton 2600, SwipeGlowButton 1500) DEKORATİF döngü, etkileşim
  // geri bildirimi değil — o yüzden bu ölçeğin dışında kalıyorlar.
  screen: 200,   // ekran geçişi: 0.96→1 ölçek + fade
  chip:   180,   // filtre çipi dolgusunun merkezden dışa açılması
  list:   120,   // filtre sonrası sonuç listesinin çözülmesi
  sheet:  320,   // alt sayfa yükselirken (firm yay)

  // ── Yaylar ──
  // İkisi çelişmiyor, farklı işler. İkisi de zaten ölçülmüştü; burada
  // yalnızca adlandırıldılar.
  //   pop  → aşma İSTENEN yer: "bir şey oldu" hissi. ζ = 14/(2·√260) ≈ 0.43
  //   firm → aşma İSTENMEYEN yer: hedefe en hızlı, hiç aşmadan. (Sekme
  //          vurgusu: aşıp geri gelmesi bozukluk gibi görünüyordu.)
  pop:  { stiffness: 260, damping: 14 },
  // firm SÜRE TAŞIMIYOR. Maket aynı yayı İKİ farklı sürede kullanıyor:
  // segment/sheet geçişi 240, alt sayfa yükselişi 320. Süre baked olsaydı
  // ikisinden biri yanlış olurdu; çağrı yeri `{ ...motion.firm, duration }`
  // diye kendi adımını veriyor.
  firm: { dampingRatio: 1, overshootClamping: true },
});

// xs: 4 — maketten. Haftalik rapor cubuklari ve kucuk isaretler bu
// basamagi kullaniyor; oncesinde olcekte yoktu ve duz 4 yaziliyordu.
export const radius = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

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

// ─────────────────────────────────────────────────────────────────────────────
// BÖLÜM BAŞLIĞI — maketten ÖLÇÜLDÜ, README'den değil.
//
// Handoff HTML'i tarayıcıda açılıp elementler ölçüldü (handoff CLAUDE.md'nin
// kendi talimatı: "tarayıcıda aç ve elementi ölç; tahmin etme"):
//
//   "Yeni Çıkanlar"  →  17px / 650 / -0.17px / text1 / CÜMLE DÜZENİ
//
// Bizde 12px / 700 / +1.1 / text2 / BÜYÜK HARF idi. Maket hiçbir yerde büyük
// harf kullanmıyor; uygulamada 17 yerde vardı. Fark yalnızca boyut değil
// TON: harf aralığı açılmış büyük harf bağırıyor, cümle düzeni konuşuyor.
//
// AĞIRLIK 650 DEĞİL 600: React Native fontWeight'te yalnızca yüzlük
// basamakları kabul ediyor ('100'…'900'). 650 yazılsaydı sessizce
// yuvarlanırdı; hangi değere yuvarlandığı platforma kalırdı.
//
// RENK BURADA YOK: palete bağlı ve bu nesne modül düzeyinde donuyor.
// Çağrı yeri kendi `colors.text`ini ekliyor.
// ─────────────────────────────────────────────────────────────────────────────
export const SECTION_TITLE = Object.freeze({
  fontSize: type.body,      // 17
  fontWeight: '600',
  letterSpacing: -0.17,
});

// ─────────────────────────────────────────────────────────────────────────────
// ÇİP — maketten ölçüldü (handoff HTML'i tarayıcıda açılıp sayıldı).
//
// Makette çip TEK geometri: yarıçap hap, dolgu 8/12, metin 13.
// Pasif yüzey surface3 ve KENARLIK YOK. Bizde dağınıktı: kimi `card`
// (surface2) + 1px kenarlık, kimi yatay dolgu 14 (ölçek dışı), metin 500.
//
// ── İKİ AKTİF DİLİ VAR, İKİSİ DE MAKETTE ──
//   segment   ("Tümü", "Popüler")  → text1 dolgu + koyu metin
//   filtre    ("Aksiyon", "Strateji") → MARKA dolgusu + beyaz metin
//
// İkisi aynı şey değil: segment bir GÖRÜNÜM seçiyor (hangi listedeyim),
// filtre bir KISITLAMA ekliyor (neyi eledim). Maket ikincisini marka
// rengiyle işaretliyor çünkü kısıtlama geri alınması gereken bir durum.
//
// Renk burada yok — palete bağlı, çağrı yeri ekliyor.
// ─────────────────────────────────────────────────────────────────────────────
export const CHIP = Object.freeze({
  borderRadius: radius.pill,
  paddingHorizontal: spacing.s12,
  paddingVertical: spacing.s8,
});

export const CHIP_TEXT = Object.freeze({
  fontSize: type.footnote,   // 13
  fontWeight: '400',
});

/** Seçili çip metni — iki dilde de 600. */
export const CHIP_TEXT_ON = Object.freeze({
  fontSize: type.footnote,
  fontWeight: '600',
});
