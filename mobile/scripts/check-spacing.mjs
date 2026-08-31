#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// BOŞLUK ÖLÇEĞİ CIRCIRI (ratchet)
//
// Ölçüm: ham boşluk değerlerinin %71'i ölçek dışındaydı. En sık kullanılanlar
// 10 (70 kez), 6 (58), 14 (54) — üçü de ölçekte yok ve her biri spacing.sm'den
// yaygın. Dağılım 1'den 28'e neredeyse kesintisiz, yani sorun "belirteç yerine
// sayı yazılmış olması" değil, sayıların KEYFİ olması.
//
// NEDEN HEPSİNİ YUVARLAMADIK. 400+ yerde 2pt kaydırmak 20+ ekranın düzenini
// değiştirir ve tek tek gözle doğrulanmadan güvenli değil. Bazı sayılar
// taşıyıcı: aritmetiğe giriyor (top: (BAR_H - 42) / 2) ya da bilinçli
// (paddingVertical: 4.5). Doğrulanamayan bir değişiklik yapılmadı.
//
// BUNUN YERİNE CIRCIR: mevcut borç dosya başına dondurulur. Bir dosyanın
// ölçek dışı sayısı ARTARSA denetim başarısız olur; azalırsa taban
// güncellenir. Yani borç tek yönde hareket eder — aşağı.
//
// Kullanım:
//   node scripts/check-spacing.mjs            → denetle
//   node scripts/check-spacing.mjs --guncelle → tabanı yeniden yaz (azalınca)
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TABAN = join(ROOT, 'scripts', 'spacing-baseline.json');
const OLCEK = new Set([0, 4, 8, 12, 16, 20, 24, 32, 40, 48]);
const PROP = /\b(padding|margin|gap)([A-Za-z]*)\s*:\s*(-?\d+(?:\.\d+)?)\b/g;

function dosyalar(dir, out = []) {
  for (const ad of readdirSync(dir)) {
    const p = join(dir, ad);
    if (statSync(p).isDirectory()) dosyalar(p, out);
    else if (p.endsWith('.jsx')) out.push(p);
  }
  return out;
}

const sayim = {};
for (const kok of ['app', 'src']) {
  for (const f of dosyalar(join(ROOT, kok))) {
    // YORUMLAR AYIKLANIYOR. Oncesinde ayiklanmiyordu ve denetim, bir
    // yorumun ICINDE gecen `marginTop: 6` metnini gercek bir deger sandi --
    // ustelik o yorum tam da "bu degeri kullanma" diyen nottu. Kendi
    // kuralini anlatan aciklama, kuralin ihlali olarak sayiliyordu.
    const s = readFileSync(f, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')   // blok yorum
      .replace(/^\s*\/\/.*$/gm, '');      // satir yorumu
    let m, n = 0;
    PROP.lastIndex = 0;
    while ((m = PROP.exec(s))) if (!OLCEK.has(Number(m[3]))) n++;
    if (n) sayim[relative(ROOT, f).split(sep).join('/')] = n;
  }
}

const toplam = Object.values(sayim).reduce((a, b) => a + b, 0);

if (process.argv.includes('--guncelle')) {
  writeFileSync(TABAN, JSON.stringify(sayim, null, 2) + '\n');
  console.log(`taban yazildi: ${Object.keys(sayim).length} dosya, ${toplam} olcek disi deger`);
  process.exit(0);
}

if (!existsSync(TABAN)) {
  console.error('taban dosyasi yok — once: node scripts/check-spacing.mjs --guncelle');
  process.exit(1);
}

const taban = JSON.parse(readFileSync(TABAN, 'utf8'));
const tabanToplam = Object.values(taban).reduce((a, b) => a + b, 0);
const artan = [];
for (const [f, n] of Object.entries(sayim)) {
  const t = taban[f] ?? 0;
  if (n > t) artan.push({ f, t, n });
}

if (artan.length) {
  console.error(`✗ olcek disi bosluk degeri ARTTI (${tabanToplam} → ${toplam}):\n`);
  for (const a of artan) console.error(`  ${a.f}: ${a.t} → ${a.n}`);
  console.error(`
Olcek: ${[...OLCEK].join(' / ')}  (src/theme.js → spacing)
Yeni bir bosluk eklerken olcekten bir basamak sec. Borcu azalttiysan:
    node scripts/check-spacing.mjs --guncelle
`);
  process.exit(1);
}

const fark = tabanToplam - toplam;
console.log(
  fark > 0
    ? `✓ olcek disi bosluk ${tabanToplam} → ${toplam} (${fark} azaldi) — tabani guncelle: --guncelle`
    : `✓ olcek disi bosluk artmadi (${toplam})`
);
