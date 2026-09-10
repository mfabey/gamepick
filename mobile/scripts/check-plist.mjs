#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// GİZLİLİK AÇIKLAMASI DENETİMİ
//
// NEDEN VAR. 2.6.1 (build 42) App Store incelemesinde ÇÖKTÜ ve sebebi tahmin
// değil, Apple'ın eklediği crash log'unda yazılı:
//
//   "termination" : { "namespace" : "TCC", "details" : [
//      "This app has crashed because it attempted to access privacy-sensitive
//       data without a usage description. The app's Info.plist must contain an
//       NSPhotoLibraryUsageDescription key ..." ]}
//
// TCC uygulamayı SIGABRT ile öldürüyor — yakalanabilir bir hata değil, süreç
// anında bitiyor. İki ayrı olay kaydı, aynı build, aynı cihaz (iPad15,3).
//
// ANAHTAR app.json'DA VARDI. `expo-image-picker` eklentisi 2.4'ten beri
// `photosPermission` ile duruyor ve o commit'te `expo prebuild` çalıştırılınca
// anahtar ÜRETİLİYOR (yeniden denendi, çıktı doğrulandı). Buna rağmen
// gönderilen binary'de yoktu. Neden uygulanmadığı tespit edilemedi.
//
// DENETİMİN İDDİASI BU YÜZDEN DAR VE SERT: uygulamanın çağırdığı her gizlilik
// API'si için açıklama, `ios.infoPlist` altında AÇIKÇA tanımlı olmalı. Oradaki
// değerler Expo'nun çekirdek yapılandırmasından geliyor; üçüncü parti bir
// eklentinin çalışmasına bağlı değil. Eklentiler kalabilir — ama tek başlarına
// güvenilmez oldukları ölçüldü.
//
// KULLANILAN API'LER KODDA TARANIYOR, elle yazılmıyor: yeni bir gizlilik
// çağrısı eklendiğinde denetim kendiliğinden onu da ister.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// çağrı deseni → gerektirdiği Info.plist anahtarı
const KURALLAR = [
  {
    anahtar: 'NSPhotoLibraryUsageDescription',
    desen: /launchImageLibraryAsync|requestMediaLibraryPermissionsAsync/,
    ne: 'galeriden fotoğraf seçme',
  },
  {
    anahtar: 'NSCameraUsageDescription',
    desen: /launchCameraAsync|requestCameraPermissionsAsync/,
    ne: 'kamera',
  },
  {
    anahtar: 'NSLocationWhenInUseUsageDescription',
    desen: /getCurrentPositionAsync|requestForegroundPermissionsAsync/,
    ne: 'konum',
  },
];

function dosyalar(dir, out = []) {
  for (const ad of readdirSync(dir)) {
    if (ad === 'node_modules' || ad.startsWith('.')) continue;
    const p = join(dir, ad);
    if (statSync(p).isDirectory()) dosyalar(p, out);
    else if (/\.(jsx?|tsx?)$/.test(p)) out.push(p);
  }
  return out;
}

const kaynak = [];
for (const kok of ['app', 'src']) {
  const d = join(ROOT, kok);
  if (existsSync(d)) kaynak.push(...dosyalar(d));
}

const kullanim = new Map();   // anahtar → [dosya, ...]
for (const f of kaynak) {
  // Yorumlar ayıklanıyor: bu denetimi ANLATAN bir yorum, denetimin girdisi
  // olmamalı (check-spacing.mjs aynı hatayı bir kez yaptı).
  const s = readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  for (const k of KURALLAR) {
    if (k.desen.test(s)) {
      if (!kullanim.has(k.anahtar)) kullanim.set(k.anahtar, []);
      kullanim.get(k.anahtar).push(relative(ROOT, f).split(sep).join('/'));
    }
  }
}

const cfg = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8'));
const plist = cfg?.expo?.ios?.infoPlist ?? {};

const hatalar = [];
for (const k of KURALLAR) {
  const yerler = kullanim.get(k.anahtar);
  if (!yerler) continue;
  const deger = plist[k.anahtar];
  if (typeof deger !== 'string' || deger.trim().length === 0) {
    hatalar.push(
      `  ✗ ${k.anahtar}\n` +
      `      gerekli: ${k.ne} — ${yerler.length} dosyada çağrılıyor\n` +
      `      ilk: ${yerler[0]}\n` +
      `      app.json → expo.ios.infoPlist altında AÇIKÇA tanımlanmalı`
    );
  }
}

// Üretilmiş plist varsa o da denetleniyor: app.json doğru olup prebuild'in
// bozuk çıkması tam olarak 2.6.1'de yaşanan şeydi.
const uretilmis = join(ROOT, 'ios', 'Gamerisen', 'Info.plist');
if (existsSync(uretilmis)) {
  const ham = readFileSync(uretilmis, 'utf8');
  for (const k of KURALLAR) {
    if (!kullanim.has(k.anahtar)) continue;
    if (!ham.includes(`<key>${k.anahtar}</key>`)) {
      hatalar.push(`  ✗ ${k.anahtar} — ios/Gamerisen/Info.plist ÜRETİLMİŞ dosyada yok`);
    }
  }
}

if (hatalar.length) {
  console.error('✗ gizlilik aciklamasi eksik — TCC uygulamayi SIGABRT ile oldurur:\n');
  console.error(hatalar.join('\n\n'));
  console.error('\nBkz. 2.6.1 (42) App Store reddi, Guideline 2.1(a).');
  process.exit(1);
}

const sayi = kullanim.size;
const fazla = Object.keys(plist).filter(
  (k) => k.endsWith('UsageDescription') && !kullanim.has(k)
);
console.log(`✓ gizlilik aciklamalari tam (${sayi} API, hepsi app.json'da acikca tanimli)`);
if (fazla.length) {
  console.log(`  not: kodda cagrilmayan ${fazla.length} anahtar tanimli — ${fazla.join(', ')}`);
  console.log('       kullanilmayan izin App Store incelemesinde aciklama isteyebilir');
}
