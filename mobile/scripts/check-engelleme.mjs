#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// ENGELLEME TEK KAPIDAN GEÇER — App Store Guideline 1.2 ratchet'i
//
// NEDEN VAR. Bu kural bu depoda İKİ KEZ, İKİ AYRI DALDA çiğnendi:
//
//   1. `main`'de `friends.jsx` ve `u/[username].jsx` ham `blockUser` çağırıyordu.
//   2. `giris-asamasi`'nda TÜM yollar ham `blockUser` çağırıyordu ve otomatik
//      şikayet hiç yazılmamıştı — yani "geliştiriciyi haberdar et" şartı
//      dalın tamamında eksikti.
//
// İkisi de sessizdi: engel sunucuya yazılıyordu, ekranda hiçbir şey ters
// görünmüyordu, eksik iş yalnızca moderasyon kuyruğuna bakınca fark ediliyordu.
// `check-imports.mjs`in anlattığı hata sınıfı — derleme geçer, ekran görüntüsü
// doğru çıkar.
//
// İDDİA İKİ PARÇALI:
//   1. `api/social`ten `blockUser`ı yalnızca kapı içe aktarabilir.
//   2. `engelUygula` üç işi de yapmaya devam etmeli — kapının arkası
//      boşalırsa kapıyı tek tutmanın anlamı kalmaz.
//
// KAPI `src/services/engel.js`. İki dal birleşirken `services/moderation.js`
// (main'in kapısı) buraya taşındı: yerel gizleme + `suz()` bu daldan,
// otomatik şikayet main'den geldi.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = fileURLToPath(new URL('..', import.meta.url));

// TEK KAPI ve kapının ardındaki tanım. Başka hiçbir dosya ham API'yi görmez.
const IZINLI = new Set([
  'src/services/engel.js',   // kapının kendisi
  'src/api/social.js',       // `blockUser`ın tanımlandığı yer
]);

function dosyalar(dizin, cikti = []) {
  for (const ad of readdirSync(dizin)) {
    if (ad === 'node_modules' || ad.startsWith('.')) continue;
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) dosyalar(yol, cikti);
    else if (/\.(jsx?|tsx?)$/.test(yol)) cikti.push(yol);
  }
  return cikti;
}

// Yorumlar ayıklanıyor: bu kuralı ANLATAN bir yorum kuralın ihlali sayılmamalı.
// check-plist.mjs aynı tuzağı bir kez yedi, aynı çözüm burada da uygulanıyor.
const temizle = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

// `unblockUser` DEĞİL: engeli kaldırmak serbest, engellemek değil. Soldaki
// bakış `un` önekini dışarıda bırakıyor.
const HAM = /(?<![A-Za-z_$])blockUser(?![A-Za-z0-9_$])/;
const ICE_AKTARIM = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]*api\/social)['"]/g;

const kaynak = [];
for (const kok of ['app', 'src']) {
  const d = join(KOK, kok);
  if (existsSync(d)) kaynak.push(...dosyalar(d));
}

const hatalar = [];
for (const yol of kaynak) {
  const bagil = relative(KOK, yol).split(sep).join('/');
  if (IZINLI.has(bagil)) continue;

  const govde = temizle(readFileSync(yol, 'utf8'));

  for (const m of govde.matchAll(ICE_AKTARIM)) {
    if (m[1].split(',').some((ad) => HAM.test(ad.trim().split(' as ')[0]))) {
      hatalar.push(
        `  ✗ ${bagil}\n` +
        `      '${m[2]}' icinden ham blockUser ice aktarilmis\n` +
        `      dogrusu: import { engelUygula } from '.../services/engel'`
      );
    }
  }

  // İçe aktarım gizlenmiş olabilir (yeniden dışa aktarım, ad alanı alma).
  // Çağrının kendisi aranıyor: kural adın nereden geldiğine değil, ham API'nin
  // çağrılmasına bakıyor.
  if (/(?<![A-Za-z0-9_$.])blockUser\s*\(/.test(govde)) {
    hatalar.push(
      `  ✗ ${bagil}\n` +
      `      ham blockUser() cagriliyor — engelin uc isinden ikisi atlaniyor`
    );
  }
}

// Kapının ardı: `engelUygula` üç işi de yapıyor mu?
const KAPI = join(KOK, 'src', 'services', 'engel.js');
if (!existsSync(KAPI)) {
  hatalar.push('  ✗ src/services/engel.js yok — engellemenin tek kapisi kayip');
} else {
  const kapi = temizle(readFileSync(KAPI, 'utf8'));
  if (!/export\s+async\s+function\s+engelUygula/.test(kapi)) {
    hatalar.push('  ✗ engel.js icinde `engelUygula` disa aktarilmiyor');
  }
  const isler = [
    ['blockUser(',     'sunucuya engel kaydi'],
    ['reportContent(', 'gelistiriciyi haberdar etme (Apple 1.2 parantezi)'],
    ['duyur(',         'akistan aninda kaldirma bildirimi'],
  ];
  for (const [belirtec, ne] of isler) {
    if (!kapi.includes(belirtec)) {
      hatalar.push(`  ✗ engel.js icinde ${belirtec} yok — eksik is: ${ne}`);
    }
  }
}

if (hatalar.length) {
  console.error('✗ engelleme tek kapidan gecmiyor:\n');
  console.error(hatalar.join('\n\n'));
  console.error('\nApple 1.2: "blocking should also notify the developer of the');
  console.error('inappropriate content and should remove it from the user\'s feed');
  console.error('instantly." Ham blockUser bunlarin ikisini de yapmaz.');
  console.error('Bkz. 2.6.1 (42) App Store reddi, Guideline 1.2.\n');
  process.exit(1);
}

console.log(`✓ engelleme tek kapidan geciyor (${kaynak.length} dosya tarandi, kapi: src/services/engel.js)`);
