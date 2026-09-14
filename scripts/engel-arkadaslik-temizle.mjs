#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// ENGEL–ARKADAŞLIK TEMİZLİĞİ — tek seferlik veri düzeltmesi
//
// NEDEN VAR. `blockUser` (app/lib/social-store.js) yakın zamana kadar yalnızca
// engel kümelerine yazıyor, arkadaşlığı ve bekleyen istekleri SİLMİYORDU.
// Kod düzeltildi ama düzeltme yalnızca BUNDAN SONRAKİ engellemeleri kapsıyor:
// daha önce engellenen her arkadaş Redis'te hâlâ arkadaş olarak duruyor
// (listede görünüyor, profildeki sayıya giriyor).
//
// NE YAPIYOR. Her `user_blocks:{A}` kümesindeki her B için, `blockUser`'ın
// artık yaptığı temizliğin aynısını uygular:
//   friends:A ∌ B · friends:B ∌ A · dört yöndeki bekleyen istek
//
// VARSAYILAN: YALNIZCA RAPOR. Hiçbir şey yazmaz; kaç çiftin etkilendiğini
// sayar. Silmek için `--uygula` gerekir. Üretim verisine yazan bir betiğin
// ilk çalıştırması her zaman kuru olmalı.
//
// KİMLİK YAZDIRILMIYOR: çıktıda uid yok, yalnızca sayılar. Çıktı ekran
// görüntüsüyle paylaşılabilsin.
//
// TEKRAR ÇALIŞTIRILABİLİR: SREM olmayan üyede hiçbir şey yapmaz. İkinci
// çalıştırmada rapor sıfır göstermeli — düzeltmenin tuttuğunun kanıtı bu.
//
// KULLANIM (depo kökünden):
//   node scripts/engel-arkadaslik-temizle.mjs            → yalnızca rapor
//   node scripts/engel-arkadaslik-temizle.mjs --uygula   → siler
//
// Kimlik `.env.local`'den okunuyor (UPSTASH_REDIS_REST_URL / _TOKEN) —
// redis-backup.mjs ile aynı yükleyici.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ── .env.local yükle (bu proje dotenv kullanmıyor) ──────────────────────────
const envPath = join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  for (const satir of readFileSync(envPath, 'utf8').split('\n')) {
    const t = satir.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = t.slice(i + 1).trim();
  }
}

const URL_ = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!URL_ || !TOKEN) {
  console.error('✗ UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN bulunamadı (.env.local).');
  process.exit(1);
}

const UYGULA = process.argv.includes('--uygula');

// Anahtar adları social-store.js ile BİREBİR aynı olmalı. Oradan içe
// aktarılamıyor: o modül `./redis` üzerinden Next ortamına bağlı.
const blocksKey  = (uid) => `user_blocks:${uid}`;
const friendsKey = (uid) => `friends:${uid}`;
const reqInKey   = (uid) => `friend_req_in:${uid}`;
const reqOutKey  = (uid) => `friend_req_out:${uid}`;
const ONEK = 'user_blocks:';

async function cmd(args) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status} — ${args[0]}`);
  return (await res.json()).result;
}

/** Upstash REST pipeline: komutlar sırayla koşar, işlem (MULTI) değildir. */
async function pipeline(komutlar) {
  if (!komutlar.length) return [];
  const res = await fetch(`${URL_}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(komutlar),
  });
  if (!res.ok) throw new Error(`Redis pipeline HTTP ${res.status}`);
  const govde = await res.json();
  return govde.map((x) => {
    if (x?.error) throw new Error(`Redis: ${x.error}`);
    return x?.result;
  });
}

console.log(UYGULA
  ? 'Engel–arkadaşlık temizliği: SİLME MODU (--uygula)'
  : 'Engel–arkadaşlık temizliği: yalnızca rapor (silmek için --uygula)');

let imlec = '0';
let engelCifti = 0;
let arkadasKalan = 0;
let istekKalan = 0;
let temizlenen = 0;
let hataliAnahtar = 0;

do {
  // MATCH ile daraltılmış SCAN: yalnızca engel kümeleri geliyor, tam anahtar
  // uzayı istemciye taşınmıyor. COUNT 500 redis-backup.mjs'teki gerekçeyle.
  const [yeniImlec, anahtarlar] = await cmd(['SCAN', imlec, 'MATCH', `${ONEK}*`, 'COUNT', '500']);
  imlec = yeniImlec;

  for (const anahtar of anahtarlar) {
    const a = anahtar.slice(ONEK.length);
    let hedefler;
    try {
      hedefler = await cmd(['SMEMBERS', anahtar]);
    } catch {
      // TEK ANAHTAR TEMİZLİĞİ DÜŞÜRMESİN — sayılıp geçiliyor.
      hataliAnahtar++;
      continue;
    }
    if (!Array.isArray(hedefler)) continue;

    for (const b of hedefler) {
      if (!b || b === a) continue;
      engelCifti++;

      const [ab, ba, outA, inB, inA, outB] = await pipeline([
        ['SISMEMBER', friendsKey(a), b],
        ['SISMEMBER', friendsKey(b), a],
        ['SISMEMBER', reqOutKey(a), b],
        ['SISMEMBER', reqInKey(b), a],
        ['SISMEMBER', reqInKey(a), b],
        ['SISMEMBER', reqOutKey(b), a],
      ]);

      const arkadas = Number(ab) === 1 || Number(ba) === 1;
      const istek = [outA, inB, inA, outB].some((x) => Number(x) === 1);
      if (arkadas) arkadasKalan++;
      if (istek) istekKalan++;

      if (UYGULA && (arkadas || istek)) {
        await pipeline([
          ['SREM', friendsKey(a), b],
          ['SREM', friendsKey(b), a],
          ['SREM', reqOutKey(a), b],
          ['SREM', reqInKey(b), a],
          ['SREM', reqInKey(a), b],
          ['SREM', reqOutKey(b), a],
        ]);
        temizlenen++;
      }
    }
  }
} while (imlec !== '0');

console.log('');
console.log(`  Engel çifti                   : ${engelCifti}`);
console.log(`  Arkadaşlığı hâlâ duran çift   : ${arkadasKalan}`);
console.log(`  Bekleyen isteği duran çift    : ${istekKalan}`);
if (hataliAnahtar) console.log(`  Okunamayan engel kümesi       : ${hataliAnahtar}`);
console.log('');

if (UYGULA) {
  console.log(`✓ ${temizlenen} çift temizlendi. Doğrulamak için --uygula OLMADAN tekrar çalıştır; iki satır da 0 olmalı.`);
} else if (arkadasKalan || istekKalan) {
  console.log('Hiçbir şey yazılmadı. Temizlemek için: node scripts/engel-arkadaslik-temizle.mjs --uygula');
} else {
  console.log('✓ Temizlenecek bir şey yok.');
}
