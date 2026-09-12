#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// ENGELLEME TEK KAPIDAN GEÇER — App Store Guideline 1.2 ratchet'i
//
// NEDEN VAR. 2.6.1 reddinden sonra `src/services/moderation.js` yazıldı ve
// engellemeye Apple'ın istediği iki işi ekledi: geliştiriciyi haberdar etme
// ve içeriği akıştan ANINDA kaldırma. Ama dört engelleme yüzeyinin yalnızca
// ikisi (sohbet başlığı, gönderi kartı) servise bağlandı; `friends.jsx` ile
// `u/[username].jsx` ham `blockUser`'ı çağırmaya devam etti.
//
// SONUÇ SESSİZDİ. Engel sunucuya yazılıyordu, yani ekranda hiçbir şey ters
// görünmüyordu — ama moderasyon kuyruğuna hiçbir kayıt düşmüyor ve engellenen
// kişinin gönderileri ekranda kalmaya devam ediyordu. Aynı düğme, iki ekranda
// iki farklı davranış; hangisinin doğru olduğu koda bakmadan görülemiyordu.
//
// Bu tam olarak `check-imports.mjs`in anlattığı hata sınıfı: derleme geçer,
// ekran görüntüsü doğru çıkar, eksik iş yalnızca kuyruğa bakınca fark edilir.
// Üçüncü bir engelleme yüzeyi eklendiğinde aynı şeyin tekrar olmaması için
// kural artık denetleniyor.
//
// İDDİA İKİ PARÇALI:
//   1. `api/social`ten `blockUser` yalnızca moderation.js içe aktarabilir.
//   2. `engelle` üç işi de yapmaya devam etmeli — kapının arkası boşalırsa
//      kapıyı tek tutmanın bir anlamı kalmaz.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = fileURLToPath(new URL('..', import.meta.url));

// TEK KAPI ve kapının ardındaki tanım. Başka hiçbir dosya ham API'yi görmez.
const IZINLI = new Set([
  'src/services/moderation.js',   // kapının kendisi
  'src/api/social.js',            // `blockUser`ın tanımlandığı yer
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
// friends.jsx ve u/[username].jsx içindeki notlar `blockUser` adını geçiriyor;
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
        `      dogrusu: import { engelle } from '.../services/moderation'`
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

// Kapının ardı: `engelle` üç işi de yapıyor mu?
const KAPI = join(KOK, 'src', 'services', 'moderation.js');
if (!existsSync(KAPI)) {
  hatalar.push('  ✗ src/services/moderation.js yok — engellemenin tek kapisi kayip');
} else {
  const kapi = temizle(readFileSync(KAPI, 'utf8'));
  const isler = [
    ['blockUser(',     'sunucuya engel kaydi'],
    ['reportContent(', 'gelistiriciyi haberdar etme (Apple 1.2 parantezi)'],
    ['duyur(',         'akistan aninda kaldirma bildirimi'],
  ];
  for (const [belirtec, ne] of isler) {
    if (!kapi.includes(belirtec)) {
      hatalar.push(`  ✗ moderation.js icinde ${belirtec} yok — eksik is: ${ne}`);
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

console.log(`✓ engelleme tek kapidan geciyor (${kaynak.length} dosya tarandi, kapi: src/services/moderation.js)`);
