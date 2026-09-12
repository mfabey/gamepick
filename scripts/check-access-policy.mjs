#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// ERİŞİM POLİTİKASI DENETLEYİCİSİ — build kapısı
//
// TEK İŞİ EKSİKSİZLİK: diskteki her `app/api/**/route.js` manifestte
// sınıflandırılmış mı, ve manifestte artık var olmayan bir kayıt kalmış mı?
//
// NEDEN AUTH'U KAYNAKTAN ÇIKARSAMIYOR: denendi ve İKİ KEZ yanlış sonuç
// verdi. (1) Bir route'un YORUMUNDA geçen "verifyMobileToken" kelimesi onu
// korunuyor gösterdi. (2) Kaynaktaki `.replace(/\/+$/, '')` gibi ifadeler
// blok-yorum ayıklamasını şaşırtıp dosyanın geri kalanını yuttu ve
// `cron/price-alerts` ile OAuth callback'leri "kimliksiz" göründü.
//
// Statik çıkarsama bu kod tabanında güvenilir değil; denetleyici bu yüzden
// yalnızca BEYAN eksikliğini arıyor. Bir ucun beyan ettiği kategoriye
// gerçekten uyup uymadığı insan incelemesinin işi — ama sınıflandırılmamış
// bir ucun sessizce canlıya çıkması artık mümkün değil.
// ─────────────────────────────────────────────────────────────────────────────

import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const API_DIR = join(process.cwd(), 'app', 'api');
const POLICY = join(process.cwd(), 'app', 'lib', 'access-policy.js');

function findRoutes(dir, base = '') {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...findRoutes(full, base ? `${base}/${entry}` : entry));
    } else if (entry === 'route.js' || entry === 'route.ts') {
      out.push(base);
    }
  }
  return out;
}

function fail(lines) {
  console.error('\n\x1b[31m✗ Erişim politikası denetimi BAŞARISIZ\x1b[0m\n');
  for (const l of lines) console.error(l);
  console.error('');
  process.exit(1);
}

if (!existsSync(API_DIR)) {
  console.log('✓ app/api yok — denetlenecek route bulunmadı.');
  process.exit(0);
}
if (!existsSync(POLICY)) {
  fail(['  app/lib/access-policy.js bulunamadı — manifest silinmiş olabilir.']);
}

const { ALL_CLASSIFIED, DEV_ONLY_ROUTES } = await import(pathToFileURL(POLICY).href);

const onDisk = findRoutes(API_DIR).map((r) => r.split(sep).join('/')).sort();
const classified = new Set(ALL_CLASSIFIED.keys());

const unclassified = onDisk.filter((r) => !classified.has(r));
const stale = [...classified].filter((r) => !onDisk.includes(r)).sort();

const problems = [];

if (unclassified.length) {
  problems.push(
    `  \x1b[1mSINIFLANDIRILMAMIŞ ROUTE (${unclassified.length}):\x1b[0m`,
    ...unclassified.map((r) => `    • app/api/${r}/route.js`),
    '',
    '  Bu uçların kimliksiz erişilebilir olup olmadığı BEYAN EDİLMEMİŞ.',
    '  app/lib/access-policy.js içindeki kümelerden birine ekle.',
    '  Hangisi olduğundan emin değilsen doğru cevap PUBLIC DEĞİL —',
    '  önce hangi verinin kime açıldığını sor.',
    '',
  );
}

// ── DEV_ONLY: BEYAN YETMEZ, KAPI DA OLMALI ──────────────────────────────────
// Manifeste "DEV_ONLY" yazmak tek başına hiçbir şey yapmıyor; ucu üretimde
// kapatan asıl şey route içindeki `NODE_ENV === 'production'` kontrolü.
// Beyan ile gerçeğin ayrışması tam olarak bu denetleyicinin var olma sebebi:
// biri kapıyı silse ya da hiç eklemeden sınıflandırsa, uç sessizce üretimde
// açık kalırdı.
//
// Bu bir ÇIKARSAMA DEĞİL, sözleşme kontrolü: aranan şey düz metin. Farklı
// yazan biri açık bir hata mesajı alıyor.
const GUARD = "NODE_ENV === 'production'";
const kapisiz = [...(DEV_ONLY_ROUTES || [])].filter((r) => {
  const f = join(API_DIR, ...r.split('/'), 'route.js');
  if (!existsSync(f)) return false; // stale kontrolü zaten yakalıyor
  return !readFileSync(f, 'utf8').includes(GUARD);
});

if (kapisiz.length) {
  problems.push(
    `  \x1b[1mDEV_ONLY AMA ÜRETİM KAPISI YOK (${kapisiz.length}):\x1b[0m`,
    ...kapisiz.map((r) => `    • app/api/${r}/route.js`),
    '',
    `  Manifestte DEV_ONLY yazıyor ama route içinde "${GUARD}" yok.`,
    '  Beyan tek başına ucu kapatmıyor — üretimde 404 dönmesi için',
    '  route\'un başına şu kontrolü ekle:',
    "    if (process.env.NODE_ENV === 'production') {",
    '      return new NextResponse(null, { status: 404 });',
    '    }',
    '',
  );
}

if (stale.length) {
  problems.push(
    `  \x1b[1mMANİFESTTE FAZLA KAYIT (${stale.length}):\x1b[0m`,
    ...stale.map((r) => `    • ${r} — diskte böyle bir route yok`),
    '',
    '  Route silinmiş ya da yeniden adlandırılmış. Manifestten çıkar.',
    '',
  );
}

if (problems.length) fail(problems);

const counts = {};
for (const [, cat] of ALL_CLASSIFIED) counts[cat] = (counts[cat] || 0) + 1;
const summary = Object.entries(counts)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${k}=${v}`)
  .join('  ');

console.log(`✓ Erişim politikası: ${onDisk.length} route sınıflandırılmış  (${summary})`);
