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
//
// DIŞARI AÇIK ve ThemeContext BUNU KULLANIYOR. Öncesinde aynı liste iki
// dosyada ayrı ayrı yazılıydı ("theme.js'teki değerlerle aynı" diye bir not
// da vardı). Faz 2'de sekme vurgusu jetonu buraya eklendi, ThemeContext'e
// eklenmedi ve vurgu HİÇ ÇİZİLMEDİ — renk `undefined` olunca RN sessizce
// saydam geçiyor, ne hata ne uyarı. Kopya kaldırıldı.
export const PALET_EK = {
  dark: {
    // ── "success" JETONU EKLENMEDİ, `green` KULLANILIYOR ──
    // Profil revizyonu handoff'u doğrulama/bağlantı durumu için yeni bir
    // jeton öneriyor (koyu #3FB950, açık #2E9E45). Eklenmedi, çünkü ölçüm
    // MEVCUT jetonun daha iyi olduğunu söylüyor:
    //
    //   koyu   #00d26e / surface2 = 8.99   ·  #3FB950 / surface2 = 7.12
    //   açık   #00794a / beyaz    = 5.48   ·  #2E9E45 / beyaz    = 3.45
    //
    // Handoff'un açık varyantı küçük metin eşiğinin (4.5) ALTINDA ve kendi
    // notu bunu "grafik öğe" diye geçiştiriyor — oysa aynı renk "312 SA"
    // rozetinde METİN taşıyor. İkinci bir yeşil eklemek hem kimliği bölerdi
    // hem de erişilebilirliği düşürürdü.
    green:      '#00d26e',
    // Doğrulanmış saat rozetinin zemini ve kenarı. Handoff'un ölçüsü
    // (%10 dolgu · %28 kenar) korundu, rengi yukarıdaki `green`den türetildi
    // — jeton listesine yeni HEX girmiyor, var olanın alfası kullanılıyor.
    greenWash:       'rgba(0,210,110,0.10)',
    greenWashBorder: 'rgba(0,210,110,0.28)',
    steam:      '#1a9fff',
    xbox:       '#4ade80',
    danger:     '#ef4949',
    accentGlow: 'rgba(232,36,43,0.42)',
    // FAZ 2 — kayan sekme vurgusu. Maket ölçüsü: rgba(232,36,43,0.16).
    // DOLGU DEĞİL TINT: kırmızı bütçesi "içerik katmanında bir tane" diyor,
    // bu kabuk katmanının kalıcı durum işareti. %16'da ikon hâlâ okunuyor.
    tabVurgu:   'rgba(232,36,43,0.16)',
    // FAZ 4 — DOLU CTA'LARIN MARKA TONU. `accent` (#E8242B) üstünde beyaz
    // 4.45:1 veriyor; bu ton 5.45:1.
    //
    // MARKA RENGİ DEĞİŞMEDİ, bilerek: kimliği taşıyan `accent` ikonlarda,
    // kenarlıklarda ve tint'lerde aynı. Değişen yalnız DOLU DÜĞMENİN zemini
    // — üstünde metin taşıyan tek yer orası.
    accentFillStrong: '#D01A21',
  },
  light: {
    green:      '#00794a',
    greenWash:       'rgba(0,121,74,0.10)',
    greenWashBorder: 'rgba(0,121,74,0.28)',
    steam:      '#0b74c4',
    xbox:       '#107c10',
    danger:     '#c62828',
    accentGlow: 'rgba(232,36,43,0.28)',
    // Açık temada aynı tint beyaz cam üstünde soluk kalıyordu → %22.
    tabVurgu:   'rgba(232,36,43,0.22)',
    // Açık temada da aynı ton: dolgu üstündeki beyaz iki temada da aynı.
    accentFillStrong: '#D01A21',
  },
};

const dark  = { ...paletten(T.dark),  ...PALET_EK.dark };
const light = { ...paletten(T.light), ...PALET_EK.light };

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
// 80+ EŞİĞİ İKİ FARKLI ZEMİNE ÇİZİLİYOR — tek renk ikisini karşılamıyor.
// (Buradaki eski not "iki yeşilin ayrışması ayrı bir iş" diyordu; o iş bu.)
//
// ÖLÇÜLDÜ (2026-09-05, Android 16 emülatörü, ham kare tamponundan piksel
// sayımı — rozetin gövdesi 336 SAF piksel, kenar karışımı değil):
//
//   • kart rozeti — GameCard.mcBadge perdesi rgba(8,10,14,0.75), ölçülen
//     rgb(7,8,11). Bu perde TEMA BAĞIMSIZ (stilin kendi notu: "zemin
//     gorsel"); AÇIK temada da koyu ölçüldü.
//         açık palet  #00794a →  3.66:1  ✗ AA (gövde metni için 4.5 gerek)
//         koyu palet  #00d26e →  9.96:1
//         scale.best  #4ade80 → 11.49:1  ✓ (SEÇİLEN — ölçüldü: açık
//                                 soğuk açılış, koyu soğuk açılış ve
//                                 çalışırken tema değişimi, ÜÇÜ DE 11.49)
//   • detay meta çipi ve GamePostCard.mc — TEMALI yüzey. Orada kural tersine
//     dönüyor: #4ade80 açık zeminde okunmuyor, paletin yeşili gerekiyor.
//
// Tek renk ikisini birden karşılayamadığı için İKİ çözücü var; eşik mantığı
// yine TEK yerde (metacriticTier).
//
// `colors` ARTIK PARAMETRE. Modül seviyesindeki `colors` açılışta donuyor
// (satır 134: Appearance.getColorScheme() bir kez okunuyor), yani uygulama
// içi tema tercihi OS'tan farklıysa ya da tema çalışırken değişirse yanlış
// paleti veriyordu — yukarıdaki 3.66 satırı tam olarak bu.
function metacriticTier(n) {
  if (n >= 80) return 'best';
  if (n >= 60) return 'mid';
  return 'bad';
}

// TEMALI yüzeyler için. `colors` useTheme()'den gelmeli.
export function metacriticColor(n, colors) {
  const tier = metacriticTier(n);
  if (tier !== 'best') return scale[tier];
  // SESSİZ YEDEK YOK: bu hata tam da sessiz kaldığı için fark edilmedi.
  if (__DEV__ && !colors) {
    throw new Error(
      "metacriticColor: 'colors' ZORUNLU — useTheme()'den geçir. "
      + 'Koyu perde üstünde çiziyorsan metacriticColorOnDark kullan.',
    );
  }
  return colors.green;
}

// TEMA BAĞIMSIZ koyu perde üstü (oyun kapağındaki rozet).
export function metacriticColorOnDark(n) {
  return scale[metacriticTier(n)];
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
  // FAZ 2, "beşinde ortak": basma = .9 opaklık + scale .97.
  // Opaklık bir ara kaldırılmıştı (kapak görselini soldurup kartı devre dışı
  // gibi gösteriyordu) ve yerine GameCover'da %6 aydınlanma vardı; Faz 2 tek
  // ortak reçete istiyor ve iki katman birlikte (biri soldurup biri
  // aydınlatarak) birbirini götürüyordu.
  opacity: 0.9,
  transform: [{ scale: 0.97 }],
});

// ── BASMA AYDINLANMASI ──
// PRESS_LIFT SİLİNDİ (Faz 2). Eski gerekçe şuydu ve ÖLÇÜM OLARAK HÂLÂ
// DOĞRU: koyu temada opaklığı düşürmek öğeyi siyaha yaklaştırır, yani
// karartır — eski maket ise "%6 aydınlanma" istiyordu, o yüzden kapak
// üstüne rgba(255,255,255,0.06) bir katman konmuştu.
//
// Faz 2 ortak basma reçetesini tek bir satıra indiriyor (.9 + scale .97) ve
// kullanıcı bu yönü seçti. İki katman birlikte çalışırken biri soldurup
// diğeri aydınlatıyordu; net etki neredeyse yoktu. Düz zeminli çağrı
// yerleri hâlâ `basiliYuzey`i kullanıyor — orada karıştırma serbest.

/**
 * Basılan yüzeyin rengi — "%6 aydınlanma"nın düz zeminlerde karşılığı.
 *
 * Katman koymak yerine karıştırma: düz zeminli bir kartta sonuç birebir
 * aynı (üstüne %6 beyaz koymakla rengi %6 beyaza kaydırmak aynı hesap) ama
 * fazladan bir View gerektirmiyor. GÖRSEL üstündeki kartlarda karıştırılacak
 * zemin yok; orada PRESSED_CARD'ın opaklığı devrede.
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
// AVATAR ÇAPLARI
//
// Ölçek 30/32'de bitiyordu; profil revizyonunun kimlik bloğu 88'lik bir avatar
// istiyor ve arkadaş listesi satırı 44 kullanıyor. Sayılar sekiz dosyaya
// dağılmadan tek yerde duruyor.
//
// BOŞLUK ÖLÇEĞİNDE DEĞİLLER, olmaları da gerekmiyor: bunlar ÇAP, boşluk
// adımı değil (TOUCH_MIN'in aynı gerekçesi).
// ─────────────────────────────────────────────────────────────────────────────
export const avatar = { sm: 30, md: 32, lg: 40, list: 44, xl: 88 };

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

  // KART GÖLGESİ — handoff'un `elevation.card` jetonu (#000 · .35 · r20 · y8).
  // TEK KULLANIM YERİ VAR ve olması da gereken bu: konu görünümünün inceleme
  // kökü. Gölge burada süs değil, "bu öğe akıştaki satırlarla aynı şey değil"
  // demenin renk harcamayan yolu. İkinci bir yere konursa anlamı düşer.
  card: isDarkTheme
    // tema-bagimsiz: golge her zaman siyah; temaya gore degisen opaklik
    ? { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 8 }
    // tema-bagimsiz: ayni gerekce — acik temada ayni gecis cok agir durur
    : { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 16, elevation: 4 },
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
  // FAZ 2: 64 → 58. 64, ikon + 11pt etiket satırını sığdırmak içindi;
  // etiketler kalkınca o gerekçe düştü. Maketin gerçek çubuğu 58.
  height: 58,
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
// BÖLÜM BAŞLIĞI — ÜSTYAZI (overline), başlık değil.
//
// ── BU DEĞER BİR KEZ YANLIŞ DEĞİŞTİRİLDİ, GERİ ALINDI ──
// Eski handoff'un maketi ölçüldüğünde 17/650/cümle düzeni çıkmıştı ve öyle
// uygulandı. Yeni tasarım projesi (Faz 1, "00 · Faz 0'da düzelttiğim üç
// şey") bunu AÇIKÇA düzeltiyor:
//
//   "Bölüm başlığı title3 22 değil. Kod caption 12 · Bold · uppercase ·
//    ls 1.1 · text2 kullanıyor ve BU DAHA DOĞRU: başlık bir üstyazı
//    (overline), içerikle yarışmıyor."
//
// Yani kodun ÖNCEKİ hâli doğruymuş. Fark ton: 17pt bir başlık kapakların
// dikkatini bölüyor, 12pt üstyazı yalnızca gruplandırma yapıyor.
//
// Renk BURADA YOK: palete bağlı. Çağrı yeri `colors.text2` ekliyor —
// üstyazı ikincil, birincil değil.
// ─────────────────────────────────────────────────────────────────────────────
export const SECTION_TITLE = Object.freeze({
  fontSize: type.caption,      // 12
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: 1.1,
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
