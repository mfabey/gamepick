#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// REDIS GERİ YÜKLEME — yalnızca AYRI bir hedefe.
//
// GERİ YÜKLEME DENENMEDEN YEDEK SAYILMAZ. Doğrulanmamış bir yedek, olduğunu
// sandığın ama olmayan bir şeydir; sorun çıktığı gün öğrenmek en kötü zaman.
//
// ── ÜRETİME YAZMAYI YAPISAL OLARAK ENGELLİYOR ──────────────────────────────
// Hedef `--target-url` ile AÇIKÇA verilmek zorunda; `.env.local`'deki üretim
// adresi hiç okunmuyor. Üstelik hedef üretim adresiyle aynıysa betik
// duruyor. "Yanlış terminalde çalıştırdım" kazasının önünü kapatmak için:
// tek bir bayrak unutulduğunda varsayılanın üretim olması kabul edilemez.
//
// KULLANIM (geri yükleme provası):
//   node scripts/redis-restore.mjs yedek.json \
//     --target-url https://<TEST-DB>.upstash.io \
//     --target-token <TEST-TOKEN> \
//     --confirm
//
// `--confirm` olmadan KURU ÇALIŞMA yapıyor: ne yazacağını söylüyor, yazmıyor.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function arg(ad) {
  const i = process.argv.indexOf(ad);
  return i > -1 ? process.argv[i + 1] : null;
}

const dosya = process.argv[2];
const hedefUrl = (arg('--target-url') || '').replace(/\/+$/, '');
const hedefToken = arg('--target-token');
const onay = process.argv.includes('--confirm');

if (!dosya || !existsSync(dosya)) {
  console.error('✗ Kullanım: node scripts/redis-restore.mjs <yedek.json> --target-url <URL> --target-token <TOKEN> [--confirm]');
  process.exit(1);
}
if (!hedefUrl || !hedefToken) {
  console.error('✗ --target-url ve --target-token ZORUNLU.');
  console.error('  Üretim adresi bilerek okunmuyor: geri yükleme provası ayrı bir veritabanına yapılır.');
  process.exit(1);
}

// ── ÜRETİM KORUMASI ─────────────────────────────────────────────────────────
// .env.local yalnızca KARŞILAŞTIRMA için okunuyor — hedef olarak değil.
const envPath = join(process.cwd(), '.env.local');
let uretimUrl = '';
if (existsSync(envPath)) {
  for (const satir of readFileSync(envPath, 'utf8').split('\n')) {
    const t = satir.trim();
    if (t.startsWith('UPSTASH_REDIS_REST_URL=')) uretimUrl = t.split('=').slice(1).join('=').trim().replace(/\/+$/, '');
  }
}
if (uretimUrl && hedefUrl === uretimUrl) {
  console.error('✗ DURDURULDU: hedef, .env.local\'deki ÜRETİM adresiyle aynı.');
  console.error('  Bu betik geri yükleme PROVASI için; üretime yazmaz.');
  process.exit(1);
}

const { meta, veri } = JSON.parse(readFileSync(dosya, 'utf8'));
const anahtarlar = Object.keys(veri);

console.log(`Yedek : ${dosya}`);
console.log(`Alındı: ${meta?.alindi || '?'}  (${anahtarlar.length} anahtar)`);
console.log(`Hedef : ${hedefUrl}`);
console.log('');

if (!onay) {
  const tipler = {};
  for (const a of anahtarlar) tipler[veri[a].tip] = (tipler[veri[a].tip] || 0) + 1;
  console.log('KURU ÇALIŞMA — hiçbir şey yazılmadı.');
  console.log('  Yazılacak tipler:', Object.entries(tipler).map(([k, v]) => `${k}=${v}`).join('  '));
  console.log('  İlk 5 anahtar:', anahtarlar.slice(0, 5).join(', '));
  console.log('\n  Gerçekten yazmak için --confirm ekle.');
  process.exit(0);
}

async function cmd(args) {
  const res = await fetch(hedefUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${hedefToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).result;
}

let yazildi = 0;
let atlandi = 0;

for (const a of anahtarlar) {
  const { tip, deger } = veri[a];
  try {
    if (deger === null || tip === 'HATA') { atlandi++; continue; }
    if (tip === 'string') await cmd(['SET', a, deger]);
    else if (tip === 'set' && deger.length) await cmd(['SADD', a, ...deger]);
    else if (tip === 'list' && deger.length) await cmd(['RPUSH', a, ...deger]);
    else if (tip === 'hash' && Object.keys(deger).length) {
      await cmd(['HSET', a, ...Object.entries(deger).flat()]);
    } else if (tip === 'zset' && deger.length) {
      // ZRANGE ... WITHSCORES [üye, skor, üye, skor…] döndürüyor;
      // ZADD ise [skor, üye] bekliyor — sıra ters çevriliyor.
      const cift = [];
      for (let i = 0; i < deger.length; i += 2) cift.push(deger[i + 1], deger[i]);
      await cmd(['ZADD', a, ...cift]);
    } else { atlandi++; continue; }
    yazildi++;
    if (yazildi % 250 === 0) process.stdout.write(`  ${yazildi} yazıldı…\r`);
  } catch (e) {
    console.error(`\n  ! ${a}: ${e.message}`);
    atlandi++;
  }
}

console.log(`\n✓ ${yazildi} anahtar yazıldı, ${atlandi} atlandı.`);
console.log('  Doğrula: hedefte DBSIZE çalıştır ve yedekteki sayıyla karşılaştır.');
