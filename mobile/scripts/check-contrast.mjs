#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// KONTRAST DENETİMİ — tasarım jetonları WCAG AA'yı geçiyor mu?
//
// Neden var: tasarım devir paketindeki `tokens.json`'ın üç değeri kendi
// yüzeylerinde 4.5:1 eşiğini geçmiyordu (dark.text3 2.90 · light.text3 2.36 ·
// light.brandText 4.42). Bu depoda TAM BU HATA bir kez düzeltilmişti —
// text3 eskiden #69707c'ydi ve 3.31 veriyordu. `src/design/tokens.js` ölçülen
// asgari düzeltmeleri uyguluyor; bu betik düzeltmelerin GERÇEKTEN yettiğini
// doğruluyor.
//
// GERÇEK KAYNAK ÖLÇÜLÜYOR, kopya değil: tokens.js'in kendi `aciklikAyarla`
// fonksiyonu ve `DUZELTME` tablosu çalıştırılıyor. Betik kendi kopyasını
// tutsaydı, biri değişip diğeri unutulduğunda denetim yeşil kalırdı.
//
// surface4 DIŞARIDA: handoff'ta yalnızca grafik yer tutucu (ikon yuvası,
// avatar, iskelet gradyanı). Referans HTML'deki 43 kullanımın hiçbirinde
// üstüne metin binmiyor.
//
// Kullanım: node scripts/check-contrast.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';

const KOK = new URL('..', import.meta.url).pathname;
const METIN_YUZEY = ['bg', 'surface', 'surface2', 'surface3'];
const METIN_TONU = ['text1', 'text2', 'text3', 'brandText'];
const ESIK = 4.5;

// tokens.js'i çalıştır. Node bare JSON import'unu kabul etmiyor (import
// attribute ister), Metro kabul ediyor — bu yüzden iki import satırı
// çalışma anında değiştiriliyor. Geri kalan kod AYNEN çalışıyor.
const kaynak = readFileSync(KOK + 'src/design/tokens.js', 'utf8')
  .replace(/^import ham from '\.\/tokens\.json';$/m,
           `const ham = JSON.parse(readFileSync('${KOK}src/design/tokens.json','utf8'));`)
  .replace(/^import hareket from '\.\/motion\.json';$/m, 'const hareket = {};')
  .replace(/^export /gm, '');

const { palette, rawPalette } = new Function(
  'readFileSync', kaynak + '\nreturn { palette, rawPalette };'
)(readFileSync);

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = (h) => {
  const x = h.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const oran = (a, b) => {
  const [x, y] = [L(a), L(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const bulgular = [];
for (const tema of ['dark', 'light']) {
  const p = palette[tema];
  const yuzeyler = METIN_YUZEY.map((k) => p[k]);
  for (const ad of METIN_TONU) {
    const oranlar = yuzeyler.map((y) => oran(p[ad], y));
    const enDar = Math.min(...oranlar);
    const turetildi = p[ad] !== rawPalette[tema][ad];
    const satir = `${tema}.${ad}`.padEnd(18) + `${p[ad]}  ${enDar.toFixed(2)}–${Math.max(...oranlar).toFixed(2)}` +
      (turetildi ? `   (handoff: ${rawPalette[tema][ad]} → erişilebilir türev)` : '');
    if (enDar < ESIK) bulgular.push(satir);
    else console.log('  ✓ ' + satir);
  }
}

if (bulgular.length) {
  console.error(`\n✗ ${bulgular.length} jeton WCAG AA (${ESIK}:1) altinda:\n`);
  for (const b of bulgular) console.error('  ' + b);
  console.error(`
Duzeltme src/design/tokens.js icindeki DUZELTME tablosundan yapilir —
tonu ve doygunlugu koruyup acikligi kaydir. tokens.json'a DOKUNMA:
o tasarim kaynagi, turetme sebebi kodda yazili kalmali.
`);
  process.exit(1);
}
console.log('\n✓ tum metin jetonlari dort metin yuzeyinde WCAG AA gecer');
