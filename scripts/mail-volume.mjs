#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// GİDEN POSTA HACMİ RAPORU — eşiği TAHMİNLE değil ÖLÇÜMLE koymak için.
//
// `app/lib/mail-metrics.js` her gerçekten giden postayı `metrics:mail:<gün>`
// altında sayıyor (60 gün ömür). Bu betik o günleri okuyup dağılımı basıyor.
//
// NEDEN VAR: sert bir günlük tavan ve alarm eşiği konacak, ama bu depoda
// üretim posta hacmi hiç ölçülmedi. Uydurulmuş bir eşik ya erken tetikler
// (meşru kullanıcıyı kilitler) ya hiç tetiklemez.
//
// KULLANIM:
//   npm run metrics:mail              → son 30 gün
//   npm run metrics:mail -- --gun 60  → son 60 gün
//
// ÖNERİLEN OKUMA: en az BİR HAFTA veri biriktikten sonra bak. p95'i gör,
// sert tavanı ~10 katına, alarm eşiğini ~3 katına koy. `passwordReset` için
// AYRI ve daha yüksek bir kova düşün — global tavanı yakan saldırgan meşru
// kullanıcıların parola sıfırlamasını da kilitler.
//
// SALT OKUMA. Hiçbir şey yazmıyor, hiçbir şey silmiyor.
//
// Kimlik `.env.local`'den okunuyor (UPSTASH_REDIS_REST_URL / _TOKEN).
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ── .env.local yükle (bu proje dotenv kullanmıyor) ──────────────────────────
const envPath = join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  for (const satir of readFileSync(envPath, 'utf8').split('\n')) {
    const m = satir.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const URL_ = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!URL_ || !TOKEN) {
  console.error('UPSTASH_REDIS_REST_URL / _TOKEN tanımlı değil (.env.local).');
  process.exit(1);
}

const argIdx = process.argv.indexOf('--gun');
const GUN_SAYISI = argIdx > -1 ? Math.max(1, Number(process.argv[argIdx + 1]) || 30) : 30;

// `registerExisting`: kayıt denenen adres ZATEN KAYITLIYSA sahibine giden
// sıfırlama postası (bkz. register/route.js — hesap sayımına kapatma).
// Ayrı sayılıyor çünkü hacmi normal kaydınkinden bağımsız artabilir ve
// anormal yükselişi doğrudan adres numaralandırma denemesine işaret eder.
const TURLER = ['register', 'registerExisting', 'verifyResend', 'passwordReset'];

async function pipeline(cmds) {
  const res = await fetch(`${URL_}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  return (await res.json()).map((r) => r?.result ?? null);
}

function gunler(n) {
  const liste = [];
  const bugun = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(bugun);
    d.setUTCDate(d.getUTCDate() - i);
    liste.push(d.toISOString().slice(0, 10));
  }
  return liste;
}

/** Doğrusal interpolasyonsuz yüzdelik — küçük örneklemde en dürüst olanı. */
function yuzdelik(sirali, p) {
  if (!sirali.length) return 0;
  const idx = Math.min(sirali.length - 1, Math.ceil((p / 100) * sirali.length) - 1);
  return sirali[Math.max(0, idx)];
}

const g = gunler(GUN_SAYISI);

// Toplam + tür kırılımı tek turda.
const komutlar = [
  ...g.map((d) => ['GET', `metrics:mail:${d}`]),
  ...g.flatMap((d) => TURLER.map((t) => ['GET', `metrics:mail:${d}:${t}`])),
];
const sonuc = await pipeline(komutlar);

const toplamlar = g.map((_, i) => Number(sonuc[i]) || 0);
const kirilim = {};
g.forEach((d, i) => {
  kirilim[d] = {};
  TURLER.forEach((t, j) => {
    kirilim[d][t] = Number(sonuc[g.length + i * TURLER.length + j]) || 0;
  });
});

// ── Rapor ───────────────────────────────────────────────────────────────────
console.log(`\nGİDEN POSTA HACMİ — son ${GUN_SAYISI} gün (UTC)\n`);
console.log('gün          toplam   register  yeniden  sıfırlama');
console.log('─'.repeat(56));

let veriliGun = 0;
g.forEach((d, i) => {
  const t = toplamlar[i];
  if (t > 0) veriliGun++;
  const k = kirilim[d];
  const cubuk = '█'.repeat(Math.min(20, Math.round(t / Math.max(1, Math.max(...toplamlar) / 20))));
  console.log(
    `${d}  ${String(t).padStart(6)}   ${String(k.register).padStart(8)}  ${String(k.verifyResend).padStart(7)}  ${String(k.passwordReset).padStart(9)}  ${cubuk}`,
  );
});

const veriler = toplamlar.filter((v) => v > 0).sort((a, b) => a - b);
const toplam = toplamlar.reduce((a, b) => a + b, 0);

console.log('─'.repeat(56));
console.log(`toplam: ${toplam}   veri olan gün: ${veriliGun}/${GUN_SAYISI}`);

if (veriler.length === 0) {
  console.log('\nHenüz veri yok. Ölçüm yeni bağlandıysa bu beklenen —');
  console.log('en az bir hafta bekleyip tekrar bak.\n');
  process.exit(0);
}

const p50 = yuzdelik(veriler, 50);
const p95 = yuzdelik(veriler, 95);
const enYuksek = veriler[veriler.length - 1];

console.log(`p50: ${p50}   p95: ${p95}   en yüksek gün: ${enYuksek}`);

if (veriliGun < 7) {
  console.log(`\n⚠ Yalnız ${veriliGun} günlük veri var. Eşik koymak için AZ.`);
  console.log('  En az 7 gün bekle — aksi hâlde eşiği yine tahminle koymuş olursun.\n');
} else {
  // KÜÇÜK ÖRNEKLEMDE p95 = EN YÜKSEK GÜN. 20 günden az veride p95 ayrı bir
  // istatistik değil, tek bir aykırı günün kendisi — ve eşik o güne göre
  // konursa saldırının olduğu gün "normal" ilan edilmiş olur.
  const p95Aykiri = p95 === enYuksek && veriler.length < 20;
  if (p95Aykiri) {
    console.log(`\n⚠ p95 (${p95}) EN YÜKSEK GÜNÜN KENDİSİ — ${veriler.length} günlük veride`);
    console.log('  p95 ayrı bir istatistik değil. Eşiği buna göre koyarsan, o günü');
    console.log(`  normal saymış olursun. p50 (${p50}) tabanı daha dürüst gösteriyor.`);
    console.log(`  Aykırı günün sebebini önce anla: ${Math.round(enYuksek / Math.max(1, p50))}× taban.`);
  }

  const temel = p95Aykiri ? p50 : p95;
  const etiket = p95Aykiri ? 'p50' : 'p95';
  console.log(`\nÖNERİ (${etiket} üzerinden):`);
  console.log(`  alarm eşiği  ≈ ${temel * 3}   (${etiket} × 3)`);
  console.log(`  sert tavan   ≈ ${temel * 10}  (${etiket} × 10)`);
  console.log('\nBunlar başlangıç noktası, kural değil. `passwordReset` için ayrı');
  console.log('ve daha yüksek bir kova düşün: global tavanı yakan saldırgan meşru');
  console.log('kullanıcıların parola sıfırlamasını da kilitler.\n');
}
