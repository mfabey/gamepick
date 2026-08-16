// ─────────────────────────────────────────────────────────────────────────────
// TASARIM JETONLARI — tek doğruluk kaynağı.
//
// `tokens.json` tasarım devir paketinden AYNEN kopyalandı ve bu dosya onu
// içe aktarıyor. Değerler burada elle yazılmıyor; JSON güncellenince kod
// kendiliğinden takip ediyor.
//
// ── TEK İSTİSNA: ERİŞİLEBİLİRLİK TÜRETMELERİ ──
//
// Handoff'un kendi kuralı buna izin veriyor:
//   "Yeni renk yok. tokens.json dışında hiçbir hex yazılmaz. Bir yerde renk
//    eksikse jetonlardan TÜRET ve SEBEBİNİ YAZ."
//
// Üç jeton kendi yüzeylerinde WCAG AA'nın küçük metin eşiğini (4.5:1)
// geçmiyor. Ölçüldü — beş yüzeyin hepsinde, en dar oran:
//
//   dark.text3       #6F727C   2.90   ← surface4 (#2A2C33) üstünde
//   light.text3      #8A8D94   2.36   ← surface4 (#D8D9DE) üstünde
//   light.brandText  #C0161D   4.42   ← surface4 üstünde
//
// Bu depoda TAM BU HATA bir kez düzeltilmişti: text3 eskiden #69707c'ydi ve
// 3.31 veriyordu. Aynı gerilemeyi geri getirmemek için jetonun TONU ve
// DOYGUNLUĞU korunup yalnızca AÇIKLIĞI eşiğin üstüne çıkarıldı. Renk
// değiştirilmedi, erişilebilir hâline getirildi.
//
// `onBrand` (marka dolgusu üstünde beyaz) koyu temada 4.45 veriyor. BU
// DÜZELTİLMEDİ: WCAG'ın 4.5 eşiği KÜÇÜK METİN için; marka dolgusu üstündeki
// beyaz, buton etiketi olarak 17pt/600 kullanılıyor ve büyük metin eşiği
// (3:1) rahatça sağlanıyor. Marka rengini değiştirmek kimliği bozardı.
//
// ── surface4 ÖLÇÜME DAHİL DEĞİL ──
// Ölçüldü: handoff'ta #2A2C33 (koyu) ve #D8D9DE (açık) yalnızca GRAFİK yer
// tutucu — ikon yuvası, avatar dolgusu, iskelet gradyanının orta durağı,
// kapak yer tutucusu. Referans HTML'deki 43 kullanımın hiçbirinde üstüne
// metin binmiyor. Metin tonlarını hiç oluşmayan bir birleşim için
// koyulaştırmak, gerçekte kullanılan dört yüzeydeki okunabilirliği
// gereksiz yere düşürürdü. Bir gün surface4 üstüne metin konursa oran
// ORADA çözülmeli.
// ─────────────────────────────────────────────────────────────────────────────
import ham from './tokens.json';
import hareket from './motion.json';

/** Tonu ve doygunluğu koruyarak açıklığı ayarlar (HSL üzerinden). */
function aciklikAyarla(hex, delta) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const enB = Math.max(r, g, b);
  const enK = Math.min(r, g, b);
  const l = (enB + enK) / 2;
  const d = enB - enK;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let ton = 0;
  if (d !== 0) {
    if (enB === r) ton = ((g - b) / d) % 6;
    else if (enB === g) ton = (b - r) / d + 2;
    else ton = (r - g) / d + 4;
  }
  ton *= 60;
  if (ton < 0) ton += 360;

  const yeniL = Math.min(1, Math.max(0, l + delta));
  const c = (1 - Math.abs(2 * yeniL - 1)) * s;
  const x = c * (1 - Math.abs(((ton / 60) % 2) - 1));
  const m = yeniL - c / 2;
  const [r2, g2, b2] =
    ton < 60 ? [c, x, 0] : ton < 120 ? [x, c, 0] : ton < 180 ? [0, c, x]
    : ton < 240 ? [0, x, c] : ton < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r2, g2, b2]
    .map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

// Ölçülen asgari düzeltmeler — dört METİN yüzeyine karşı (bg · surface ·
// surface2 · surface3). Her değer, 4.5 eşiğini geçen EN KÜÇÜK adım:
//   dark.text3   #6F727C → #82858F   oranlar 5.34 · 5.13 · 4.91 · 4.53
//   light.text3  #8A8D94 → #64676D   oranlar 5.67 · 5.21 · 4.94 · 4.56
// brandText her iki temada da dört metin yüzeyinde eşiği ZATEN geçiyor —
// dokunulmadı.
const DUZELTME = {
  dark:  { text3: +0.0750 },
  light: { text3: -0.1500 },
};

function paletKur(tema) {
  const p = { ...ham.color[tema] };
  for (const [ad, delta] of Object.entries(DUZELTME[tema] || {})) {
    p[ad] = aciklikAyarla(p[ad], delta);
  }
  return p;
}

export const palette = { dark: paletKur('dark'), light: paletKur('light') };
export const typography = ham.typography;
export const spacingScale = ham.spacing;
export const radiusTokens = ham.radius;
export const sizeTokens = ham.size;
export const elevationTokens = ham.elevation;
export const blurTokens = ham.blur;
export const skeletonTokens = ham.skeleton;
export const motionTokens = hareket;

/** Handoff'un ham (düzeltilmemiş) değerleri — denetim betiği karşılaştırsın. */
export const rawPalette = ham.color;
