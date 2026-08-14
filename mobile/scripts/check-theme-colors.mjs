#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// TEMA SIZINTISI DENETİMİ
//
// Neden var: açık tema eklendikten sonra ekranların bir kısmı koyu kaldı.
// Sebep her seferinde aynıydı — bir yüzey rengi palete değil, dosyaya
// yazılmıştı. Örnekler (hepsi gerçek, hepsi düzeltildi):
//
//   Skeleton.jsx     '#1b1f26'            → koyu paletin bgInput'u; BÜTÜN
//                                           iskeletler açık temada koyu kutu
//   FloatingTabBar   'rgba(18,21,27,.94)' → sekme çubuğu açık temada koyu
//                                           (Android + iOS 26 öncesi; cam
//                                           yolunda görünmediği için gözden
//                                           kaçıyordu)
//   library.jsx      'rgba(255,255,255,.10)' → seçili çip beyaz üstünde beyaz
//
// NEDEN SADECE ZEMİN VE KENAR RENGİ. Metin renklerinin çoğu meşru sabit:
// bir oyun kapağının üstündeki beyaz yazı iki temada da beyaz kalmalı,
// `colors.text` yapılırsa açık temada kapakta kaybolur. Yani metni taramak
// gürültü üretir. Tehlike zeminlerde: zemin, temanın kendisidir.
//
// İSTİSNA NASIL VERİLİR. Satırda ya da bir üstündeki satırda:
//     // tema-bagimsiz: <sebep>
// Sebep zorunlu — işaretin amacı sızıntıyı susturmak değil, gerekçeyi
// dosyada tutmak.
//
// Kullanım:  node scripts/check-theme-colors.mjs
// Çıkış kodu 1 = işaretsiz sabit renk var.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const TARAN = ['app', 'src'];
const PROP = /(backgroundColor|borderColor|shadowColor)\s*:\s*'(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))'/g;
const ISARET = /tema-bagimsiz\s*:\s*\S/;

function dosyalar(dir, out = []) {
  for (const ad of readdirSync(dir)) {
    const p = join(dir, ad);
    if (statSync(p).isDirectory()) dosyalar(p, out);
    else if (p.endsWith('.jsx') || p.endsWith('.js')) out.push(p);
  }
  return out;
}

const bulgular = [];
for (const kok of TARAN) {
  for (const f of dosyalar(join(ROOT, kok))) {
    const satirlar = readFileSync(f, 'utf8').split('\n');
    satirlar.forEach((satir, i) => {
      PROP.lastIndex = 0;
      let m;
      while ((m = PROP.exec(satir))) {
        // İşaret aynı satırda ya da hemen üstünde olabilir: uzun stil
        // satırlarında yorumu üste almak tek okunur seçenek.
        const ust = satirlar[i - 1] || '';
        if (ISARET.test(satir) || ISARET.test(ust)) continue;
        bulgular.push({ f: relative(ROOT, f), n: i + 1, prop: m[1], val: m[2] });
      }
    });
  }
}

if (bulgular.length === 0) {
  console.log('✓ tema sizintisi yok — her sabit zemin/kenar rengi gerekcelendirilmis');
  process.exit(0);
}

console.error(`✗ ${bulgular.length} isaretsiz sabit renk:\n`);
for (const b of bulgular) console.error(`  ${b.f}:${b.n}  ${b.prop} = ${b.val}`);
console.error(`
Her biri icin ya paletten bir belirtec kullan (src/theme.js) ya da
satirin sonuna/ustune gerekcesini yaz:
    // tema-bagimsiz: <neden bu renk iki temada da ayni kalmali>
`);
process.exit(1);
