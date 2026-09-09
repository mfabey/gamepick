// ─────────────────────────────────────────────────────────────────────────────
// GALERİ İZNİ / KOD UYUMU DENETİMİ
//
// NEDEN VAR. 2.6.1 (42) App Store'da Guideline 2.1(a) ile reddedildi:
// "the app crashed upon tapping the Photo button". Sebep bir mantık hatası
// değil, İKİ AYRI YERDE DURAN TEK BİR KARARDI:
//
//   app.json  → photosPermission: false   (izin metni Info.plist'te yok)
//   sunucu    → photos: true              (düğmeyi çizdiren bayrak)
//
// İzin metni yokken `requestMediaLibraryPermissionsAsync` çağrıldığında iOS
// uygulamayı SONLANDIRIYOR. Yani düğmeyi gizleyen tek şey uzaktaki bir
// yapılandırmaydı ve o yapılandırma yanlış daldaydı.
//
// AGENTS.md bunu yazılı olarak uyarıyordu. Yetmedi: yazılı uyarı build'i
// düşürmüyor. Bu denetim düşürüyor.
//
// İKİ ŞEY DENETLENİYOR:
//   1. UYUM      — `GALERI_IZNI_VAR` ile `photosPermission` aynı şeyi söylemeli.
//   2. RATCHET   — galeriyi/kamerayı açan her dosya sabiti içe aktarmalı.
//
// İkincisi olmadan birincisi yetmez: yarın sabiti okumayan yeni bir çağrı
// yeri eklenirse uyum denetimi bunu göremez.
//
// Kullanım: node scripts/check-galeri-izni.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = fileURLToPath(new URL('..', import.meta.url));
const SABIT = 'GALERI_IZNI_VAR';

// Galeriye/kameraya giden çağrılar. Biri bile izin metni olmadan çalışırsa
// iOS uygulamayı sonlandırıyor, o yüzden hepsi aynı kapıdan geçmeli.
const RISKLI = [
  'launchImageLibraryAsync',
  'launchCameraAsync',
  'requestMediaLibraryPermissionsAsync',
  'requestCameraPermissionsAsync',
];

// Yorumlar ve dizeler çıkarılıyor: bir çağrının ADI belgelendiği için
// "çağrı var" sayılmasın. check-imports.mjs aynı sebeple aynısını yapıyor.
const temizle = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
  .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
  .replace(/`(?:[^`\\]|\\.)*`/g, '``');

function dosyalar(dizin, cikti = []) {
  for (const ad of readdirSync(dizin)) {
    if (ad === 'node_modules' || ad.startsWith('.')) continue;
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) dosyalar(yol, cikti);
    else if (ad.endsWith('.jsx') || ad.endsWith('.js')) cikti.push(yol);
  }
  return cikti;
}

const hatalar = [];

// ── 1. UYUM ────────────────────────────────────────────────────────────────
const appJson = JSON.parse(readFileSync(KOK + 'app.json', 'utf8'));
const eklenti = (appJson.expo?.plugins || [])
  .find((p) => Array.isArray(p) && p[0] === 'expo-image-picker');

// Eklenti hiç yoksa izin metni de yok demektir; sabit de kapalı olmalı.
const izinMetni = eklenti ? eklenti[1]?.photosPermission : false;
const izinVar = typeof izinMetni === 'string' && izinMetni.trim().length > 0;

const medya = readFileSync(KOK + 'src/services/medya.js', 'utf8');
const esles = medya.match(new RegExp(`export const\\s+${SABIT}\\s*=\\s*(true|false)`));
if (!esles) {
  hatalar.push(`src/services/medya.js içinde \`export const ${SABIT} = true|false\` bulunamadı.`);
} else {
  const sabit = esles[1] === 'true';
  if (sabit !== izinVar) {
    hatalar.push(
      `UYUŞMAZLIK — ${SABIT} = ${sabit}, app.json photosPermission = ${izinVar ? 'metin var' : 'YOK'}.\n` +
      (sabit
        ? '      Sabit açık ama izin metni yok: galeri açıldığı anda iOS uygulamayı SONLANDIRIR.\n' +
          '      Çözüm: app.json → expo-image-picker → photosPermission metnini geri koy.'
        : '      İzin metni var ama sabit kapalı: uygulamanın YAPMADIĞI bir şeyi anlatan ölü metin.\n' +
          '      Çözüm: metni kaldır ya da sabiti true yap (sunucu bayrağını da yayına al).'),
    );
  }
}

// ── 2. RATCHET ─────────────────────────────────────────────────────────────
for (const yol of [...dosyalar(KOK + 'app'), ...dosyalar(KOK + 'src')]) {
  const ham = readFileSync(yol, 'utf8');
  const kod = temizle(ham);
  const gecen = RISKLI.filter((c) => kod.includes(c));
  if (gecen.length === 0) continue;
  const goreli = yol.slice(KOK.length).split(sep).join('/');

  if (!kod.includes(SABIT)) {
    hatalar.push(
      `KORUMASIZ ÇAĞRI — ${goreli}\n` +
      `      ${gecen.join(', ')} çağrılıyor ama ${SABIT} okunmuyor.\n` +
      `      Çözüm: src/services/medya.js'ten içe aktar ve çağrıdan ÖNCE kontrol et.`,
    );
    continue;
  }

  // ADI GEÇMEK YETMİYOR, İÇE AKTARILMIŞ DA OLMALI. Bu depoda `expo export`
  // tanımsız değişkeni ÜÇ KEZ sessizce geçirdi (bkz. check-imports.mjs);
  // orada sonuç bozuk stildi, burada çalışma anı ReferenceError'ı olurdu —
  // yani düğmeye basınca yine çökme. Yol ayrıca DİSKTE aranıyor: yanlış
  // göreli yol da aynı sonucu verir.
  const ie = ham.match(
    new RegExp(`import\\s*\\{[^}]*\\b${SABIT}\\b[^}]*\\}\\s*from\\s*['"]([^'"]+)['"]`),
  );
  if (!ie) {
    hatalar.push(
      `İÇE AKTARILMAMIŞ — ${goreli}\n` +
      `      ${SABIT} kullanılıyor ama import satırı yok (çalışma anı ReferenceError).`,
    );
    continue;
  }
  const hedef = join(yol, '..', ie[1]);
  if (!['', '.js', '.jsx'].some((u) => existsSync(hedef + u))) {
    hatalar.push(
      `YOL ÇÖZÜLMÜYOR — ${goreli}\n` +
      `      '${ie[1]}' diskte bulunamadı.`,
    );
  }
}

// ── Sonuç ──────────────────────────────────────────────────────────────────
if (hatalar.length) {
  console.error('\n✗ GALERİ İZNİ DENETİMİ DÜŞTÜ\n');
  for (const h of hatalar) console.error('  • ' + h + '\n');
  console.error('  Ayrıntı: src/services/medya.js ve mobile/AGENTS.md\n');
  process.exit(1);
}

console.log(
  `✓ galeri izni tutarlı — ${SABIT} = ${izinVar}, ` +
  `photosPermission ${izinVar ? 'var' : 'yok'}, korumasız çağrı yok`,
);
