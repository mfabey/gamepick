// ─────────────────────────────────────────────────────────────────────────────
// Hesap verisi sıfırlama — madde 0'ın 2. adımı (docs/DURUM.md).
//
// NEDEN: hesap kapsamı olmadığı dönemde A'nın koleksiyonları B'nin jetonuyla
// sunucuya yazıldı ve birleştirilerek kalıcılaştı. Koleksiyonlarda sahiplik
// bilgisi olmadığı için ayıklamak güvenilir değil (KARAR C).
//
// SIRA ŞART: bu betik OTA cihazlara indikten SONRA koşmalı. Tersi olursa eski
// JS'i taşıyan bir cihaz ilk senkronda kirli kopyasını geri yükler. Yeni JS'te
// eski kapsamsız anahtarlar zaten siliniyor (owner.js:migrateLegacyKeys), yani
// güncellenmiş cihazda geri yüklenecek bir şey kalmıyor.
//
// HESAPLARA DOKUNMAZ. Yalnız dört veri ailesini siler:
//   user_taste:*  user_wishlist:*  user_collections:*  user_collections_deleted:*
// Kimlik kaydı (Firebase), sosyal profil, kullanıcı adı vb. yerinde kalır.
//
// Kullanım:
//   node scratch/reset_user_data.mjs            # yalnız ÖLÇ (varsayılan)
//   node scratch/reset_user_data.mjs --sil      # ölç, sonra sil
//
// Kimlik bilgileri .env.local'dan okunur (UPSTASH_REDIS_REST_URL/TOKEN).
// Bu makinede .env.local yoksa değerler Vercel panosunda.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// .env.local'ı elle yükle (scratch/check_redis_keys.js ile aynı desen)
try {
  const envPath = path.join(HERE, '../.env.local');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const i = line.indexOf('=');
      if (i < 1 || line.trim().startsWith('#')) continue;
      process.env[line.slice(0, i).trim()] =
        line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  }
} catch { /* yoksa aşağıdaki kontrol yakalar */ }

const URL_ = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!URL_ || !TOKEN) {
  console.error('UPSTASH_REDIS_REST_URL / _TOKEN bulunamadı.');
  console.error('.env.local yoksa değerler Vercel panosunda (Settings → Environment Variables).');
  process.exit(1);
}

const APPLY = process.argv.includes('--sil');

const FAMILIES = [
  'user_taste',
  'user_wishlist',
  'user_collections',
  'user_collections_deleted',
];

async function cmd(args) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

// KEYS değil SCAN: KEYS büyük veritabanında sunucuyu kilitler.
async function scan(pattern) {
  const found = [];
  let cursor = '0';
  do {
    const [next, batch] = await cmd(['SCAN', cursor, 'MATCH', pattern, 'COUNT', '500']);
    cursor = next;
    found.push(...batch);
  } while (cursor !== '0');
  return found;
}

const uidOf = (key) => key.slice(key.indexOf(':') + 1);

async function main() {
  console.log(`\nSunucu: ${URL_.replace(/^https:\/\/([^.]{4})[^.]*/, 'https://$1…')}`);
  console.log(`Kip: ${APPLY ? '⚠ SİLME' : 'yalnız ölçüm (silmek için --sil)'}\n`);

  // ── 1. Ölçüm ──────────────────────────────────────────────────────────────
  // DURUM.md'nin sıfırlama önkoşulu: önce kaç hesap ve kaç kayıt etkileniyor.
  const byFamily = {};
  const uids = new Set();
  for (const fam of FAMILIES) {
    const keys = await scan(`${fam}:*`);
    byFamily[fam] = keys;
    keys.forEach((k) => uids.add(uidOf(k)));
  }

  console.log('Anahtar aileleri:');
  for (const fam of FAMILIES) {
    console.log(`  ${fam.padEnd(26)} ${String(byFamily[fam].length).padStart(4)} kayıt`);
  }
  const total = Object.values(byFamily).reduce((s, a) => s + a.length, 0);
  console.log(`  ${'TOPLAM'.padEnd(26)} ${String(total).padStart(4)} kayıt`);
  console.log(`\nEtkilenen hesap (tekil uid): ${uids.size}`);

  // Koleksiyon taşıyan hesaplar ayrı gösteriliyor: karışmanın gerçekten
  // görüldüğü yer orası, sayı beklenenden büyükse durup bakmak gerekir.
  const withCols = byFamily['user_collections'].length;
  console.log(`Koleksiyon kaydı olan hesap: ${withCols}`);

  if (total === 0) {
    console.log('\nSilinecek bir şey yok.\n');
    return;
  }

  if (!APPLY) {
    console.log('\nÖlçüm bitti. Silmek için: node scratch/reset_user_data.mjs --sil\n');
    return;
  }

  // ── 2. Silme ──────────────────────────────────────────────────────────────
  const all = Object.values(byFamily).flat();
  let deleted = 0;
  for (let i = 0; i < all.length; i += 100) {
    deleted += await cmd(['DEL', ...all.slice(i, i + 100)]);
  }
  console.log(`\nSilindi: ${deleted}/${all.length} anahtar`);

  // Doğrulama — silindiğini varsaymıyoruz, tekrar sayıyoruz
  let left = 0;
  for (const fam of FAMILIES) left += (await scan(`${fam}:*`)).length;
  console.log(left === 0
    ? 'Doğrulandı: dört ailede kayıt kalmadı.\n'
    : `⚠ ${left} anahtar hâlâ duruyor — tekrar koştur.\n`);
}

main().catch((e) => { console.error('HATA:', e.message); process.exit(1); });
