#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// REDIS YEDEKLEME — tam anahtar uzayını tipe duyarlı olarak dışa aktarır.
//
// NEDEN VAR: bu depoda hiçbir yedekleme/dışa aktarma yolu yoktu. Upstash'in
// kendi yedeği (varsa) sağlayıcının hesabında duruyor — yani sağlayıcı
// düzeyinde bir sorun (hesap kapanması, yanlış silme, plan değişikliği) hem
// veriyi hem yedeği birlikte etkiliyor. Bu betik yedeği BAŞKA BİR ORTAMA,
// senin kontrolündeki bir dosyaya çıkarıyor.
//
// KEYS DEĞİL SCAN kullanılıyor: `KEYS *` tek komutta tüm anahtar uzayını
// tarıyor ve Redis'i o süre boyunca bloke ediyor. SCAN imleçle ilerliyor,
// üretimi durdurmuyor. (Kod tabanında iki yerde `KEYS user_connections:*`
// var — onlar dar desenli ve seyrek çağrılıyor, ama tam tarama için
// kullanılamazdı.)
//
// SALT OKUMA. Bu betik hiçbir şey yazmıyor, hiçbir şey silmiyor.
//
// KULLANIM:
//   node scripts/redis-backup.mjs                  → yedek-<tarih>.json
//   node scripts/redis-backup.mjs --out yedek.json
//
// Kimlik `.env.local`'den okunuyor (UPSTASH_REDIS_REST_URL / _TOKEN).
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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

async function cmd(args) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status} — ${args[0]}`);
  return (await res.json()).result;
}

/** Anahtar tipine göre doğru okuma komutu. */
async function degerOku(anahtar) {
  const tip = await cmd(['TYPE', anahtar]);
  switch (tip) {
    case 'string': return { tip, deger: await cmd(['GET', anahtar]) };
    case 'set':    return { tip, deger: await cmd(['SMEMBERS', anahtar]) };
    case 'list':   return { tip, deger: await cmd(['LRANGE', anahtar, '0', '-1']) };
    case 'zset':   return { tip, deger: await cmd(['ZRANGE', anahtar, '0', '-1', 'WITHSCORES']) };
    case 'hash':   return { tip, deger: await cmd(['HGETALL', anahtar]) };
    default:       return { tip, deger: null };
  }
}

const cikti = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : `yedek-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.json`;

console.log('Redis yedekleniyor…');

const veri = {};
let imlec = '0';
let sayac = 0;
let tur = 0;

do {
  // COUNT 500: tek turda çok fazla anahtar istemek Upstash'te zaman aşımına
  // düşebiliyor; çok az istemek tur sayısını şişiriyor.
  const [yeniImlec, anahtarlar] = await cmd(['SCAN', imlec, 'COUNT', '500']);
  imlec = yeniImlec;
  tur++;

  for (const a of anahtarlar) {
    try {
      veri[a] = await degerOku(a);
      sayac++;
      if (sayac % 250 === 0) process.stdout.write(`  ${sayac} anahtar…\r`);
    } catch (e) {
      // TEK ANAHTAR YEDEĞİ DÜŞÜRMESİN: okunamayan anahtar işaretlenip
      // geçiliyor, yoksa 10.000 anahtarın 9.999'u bir hata yüzünden kaybolur.
      veri[a] = { tip: 'HATA', deger: null, hata: String(e.message || e) };
    }
  }
} while (imlec !== '0');

// TTL'li anahtarlar da yedeğe giriyor ama geri yüklemede süreleri sıfırlanır;
// bunlar önbellek olduğu için sorun değil (kalıcı kullanıcı verisinde TTL yok).
const meta = {
  alindi: new Date().toISOString(),
  anahtarSayisi: sayac,
  scanTuru: tur,
  kaynak: URL_.replace(/\/\/([^.]+)/, '//***'), // konak adı maskeli
};

writeFileSync(cikti, JSON.stringify({ meta, veri }, null, 0), 'utf8');
console.log(`\n✓ ${sayac} anahtar yedeklendi → ${cikti}`);
console.log(`  (${tur} SCAN turu, ${(JSON.stringify(veri).length / 1048576).toFixed(2)} MB)`);
