// ─────────────────────────────────────────────────────────────────────────────
// EDGE-TO-EDGE / DESTEĞİ SONLANDIRILAN PENCERE API'LERİ DENETİMİ
//
// NEDEN VAR. Play Console, AAB'nin bytecode'unu tarayıp Android 15'te desteği
// sonlandırılan pencere API'lerini bildiriyor:
//
//   Window.setStatusBarColor / getStatusBarColor
//   Window.setNavigationBarColor / getNavigationBarColor
//   LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES / _DEFAULT
//
// Gelen raporda listelenen ÇAĞRI NOKTALARININ HEPSİ kütüphane içiydi:
// React Native çekirdeği (StatusBarModule, WindowUtilKt), Material Components,
// react-native-screens, expo-image-picker. Yani uyarı bilgilendirmeydi;
// yayını engellemiyordu ve bizim silebileceğimiz bir satır yoktu.
//
// UYARI TAMAMEN KALDIRILAMIYOR — 2026-08 ölçümü. SDK 57'ye çıkılsa 9 çağrı
// noktasının 5'i düşüyor, 4'ü KALIYOR. Her biri ilgili sürümün kaynağından
// doğrulandı:
//
//   DÜŞEN   StatusBarModule.setColor            RN 0.86'da kaldırılmış
//   DÜŞEN   StatusBarModule.getTypedExported…   artık yalnız HEIGHT dönüyor
//   DÜŞEN   ScreenWindowTraits.setColor         rn-screens 4.26 →
//   DÜŞEN   ScreenWindowTraits.setNavigationB…  WindowInsetsControllerCompat
//   DÜŞEN   ExpoCropImageUtils.applyWindowThe…  expo-image-picker 57'de silinmiş
//   KALIYOR WindowUtilKt.enableEdgeToEdge       RN 0.86 VE 0.87'de duruyor
//   KALIYOR Material EdgeToEdgeUtils / BottomSheetDialog / SheetDialog
//
// Material'ınki `if (SDK_INT < VANILLA_ICE_CREAM)` korumasının ALTINDA, yani
// Android 15'te hiç çalışmıyor — kod doğru, yine de işaretleniyor. Google'ın
// kendi kütüphanesi Google'ın kendi tarayıcısına takılıyor. Sebep: tarama
// erişilebilirlik değil REFERANS taraması, DEX'te sembol geçmesi yetiyor.
//
// Sonuç: SDK yükseltmesini bu uyarı için yapma, gerekçe olmaz. Uyarı kalır.
//
// TEHLİKE BUNDAN SONRASI. Aşağıdakilerden BİRİ eklenirse o çağrılar gerçekten
// bizim koda taşınır ve uyarı haklı hale gelir:
//
//   • app.json → androidStatusBar.backgroundColor / .translucent
//     prebuild styles.xml'e `android:statusBarColor` yazıyor. Ölçüldü:
//     @expo/config-plugins StatusBar.js — `add: floatElement || !!hexString`,
//     yani alan YOKKEN hiçbir şey yazılmıyor. Alanı eklemek yazdırıyor.
//   • app.json → androidNavigationBar.backgroundColor / .visible
//     `android:navigationBarColor` yazıyor; `.visible` için Expo'nun kendisi
//     de "Android 11'de sonlandırıldı" uyarısı veriyor.
//   • app.json → android.edgeToEdgeEnabled: false
//     SDK 54'te alan yalnız `true` kabul ediyor; false uyarı üretiyor ve
//     Android 16'da (targetSdk 36) zaten etkisiz.
//   • kodda `import { StatusBar } from 'react-native'`
//     RN'in StatusBarModule'ü — setColor doğrudan setStatusBarColor çağırıyor.
//     Doğru olan `expo-status-bar`; onun `style` prop'u WindowInsetsController
//     kullanıyor, desteği sonlandırılan setter'a hiç dokunmuyor.
//   • `<StatusBar backgroundColor=` / `translucent=`
//     expo-status-bar'ın bu iki prop'u da eski setter'lara iniyor.
//   • ekran seçeneklerinde `statusBarColor:` / `navigationBarColor:`
//     react-native-screens'in ScreenWindowTraits yolu — kendi kaynağında
//     @Deprecated işaretli.
//   • plugins/ içinde `windowOptOutEdgeToEdgeEnforcement`
//     Uyarıyı SUSTURMAZ; yalnız targetSdk 35'te işe yarardı, 36'da yok sayılıyor.
//
// KAPSAM DIŞI, BİLEREK: `<Modal statusBarTranslucent>` meşru bir RN prop'u ve
// Play'in listesinde yok. `androidStatusBar.barStyle` de güvenli — o
// `windowLightStatusBar` yazıyor, desteği sonlandırılan bir API değil.
//
// Bu bir RATCHET DEĞİL, sert kural: doğru sayı sıfır, taban dosyası yok.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = fileURLToPath(new URL('..', import.meta.url));

function dosyalar(dizin, cikti = []) {
  if (!existsSync(dizin)) return cikti;
  for (const ad of readdirSync(dizin)) {
    if (ad === 'node_modules' || ad.startsWith('.')) continue;
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) dosyalar(yol, cikti);
    else if (/\.(jsx?|mjs|tsx?)$/.test(ad)) cikti.push(yol);
  }
  return cikti;
}

// Yorumlar çıkarılıyor: bu dosyanın kendi başlığı da dahil, bir adın yorumda
// geçmesi ihlal sayılmasın.
const temizle = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

const bulgular = [];
const bildir = (yer, ne, cozum) => bulgular.push({ yer, ne, cozum });

// ── 1. app.json ─────────────────────────────────────────────────────────────
const cfg = JSON.parse(readFileSync(KOK + 'app.json', 'utf8')).expo ?? {};

if (cfg.android?.edgeToEdgeEnabled === false) {
  bildir('app.json', 'android.edgeToEdgeEnabled: false',
    'Alani KALDIR. SDK 54 yalniz true kabul ediyor, Android 16da zaten etkisiz.');
}
for (const alan of ['backgroundColor', 'translucent']) {
  if (cfg.androidStatusBar?.[alan] !== undefined) {
    bildir('app.json', `androidStatusBar.${alan}`,
      'Alani KALDIR; prebuild android:statusBarColor yaziyor. Ikon rengi icin expo-status-bar style prop u.');
  }
}
for (const alan of ['backgroundColor', 'visible']) {
  if (cfg.androidNavigationBar?.[alan] !== undefined) {
    bildir('app.json', `androidNavigationBar.${alan}`,
      'Alani KALDIR; prebuild android:navigationBarColor yaziyor.');
  }
}

// ── 2. kaynak kodu ──────────────────────────────────────────────────────────
const KURALLAR = [
  {
    ad: "react-native StatusBar ice aktarimi",
    // Cok satirli import bloklarini da yakalar.
    sina: (s) => /import\s*\{[^}]*\bStatusBar\b[^}]*\}\s*from\s*'react-native'/s.test(s),
    cozum: "expo-status-bar kullan: import { StatusBar } from 'expo-status-bar'",
  },
  {
    ad: 'StatusBar backgroundColor / translucent prop u',
    sina: (s) => /<StatusBar\b[^>]*\b(backgroundColor|translucent)\s*=/s.test(s),
    cozum: 'Yalniz style prop u kullan; zemin rengi edge-to-edge de zaten seffaf.',
  },
  {
    ad: 'setStatusBarBackgroundColor cagrisi',
    sina: (s) => /\bsetStatusBarBackgroundColor\s*\(/.test(s),
    cozum: 'Kaldir; desteklenen karsiligi yok, cubuk seffaf kalmali.',
  },
  {
    ad: 'expo-navigation-bar zemin rengi',
    sina: (s) => /from\s*'expo-navigation-bar'/.test(s) && /\bsetBackgroundColorAsync\s*\(/.test(s),
    cozum: 'Kaldir; setNavigationBarColor destegi sonlandirildi.',
  },
  {
    ad: 'ekran secenegi statusBarColor / navigationBarColor',
    sina: (s) => /\b(statusBarColor|navigationBarColor)\s*:/.test(s),
    cozum: 'Kaldir; react-native-screens in bu yolu @Deprecated.',
  },
  {
    ad: 'windowOptOutEdgeToEdgeEnforcement',
    sina: (s) => /windowOptOutEdgeToEdgeEnforcement/.test(s),
    cozum: 'Kaldir; uyariyi susturmuyor ve targetSdk 36 da yok sayiliyor.',
  },
];

const taranan = dosyalar(KOK + 'app')
  .concat(dosyalar(KOK + 'src'))
  .concat(dosyalar(KOK + 'plugins'));

for (const yol of taranan) {
  if (yol.split(sep).join('/').endsWith('scripts/check-edge-to-edge.mjs')) continue;
  const govde = temizle(readFileSync(yol, 'utf8'));
  for (const k of KURALLAR) {
    if (k.sina(govde)) bildir(yol.replace(KOK, '').split(sep).join('/'), k.ad, k.cozum);
  }
}

// ── rapor ───────────────────────────────────────────────────────────────────
if (bulgular.length) {
  console.error(`\n✗ ${bulgular.length} yerde destegi sonlandirilan pencere API si:\n`);
  for (const b of bulgular) {
    console.error(`  ${b.yer}`);
    console.error(`    ${b.ne}`);
    console.error(`    → ${b.cozum}\n`);
  }
  console.error('Bunlar Play Console un Android 15 uyari listesine BIZIM kodumuzu ekler.\n');
  process.exit(1);
}
console.log(`✓ edge-to-edge temiz — ${KURALLAR.length} kural, ${taranan.length} dosya + app.json`);
