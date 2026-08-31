// ─────────────────────────────────────────────────────────────────────────────
// STEAM KAPAK ADRESİ RATCHET'İ
//
// NEDEN VAR. Steam varlık yollarını HASH'Lİ biçime taşıdı:
//
//   ✗ /apps/3065940/header.jpg                        → 404
//   ✓ /apps/3065940/a50a3d05…/header_alt_assets_0.jpg  → 200
//
// Hash KURULAMIYOR — yalnızca Steam API'sinin `header_image` alanından
// okunuyor; bazı oyunlarda dosya adı bile farklı (`header_alt_assets_0`).
//
// Kırılma sinsiydi: ESKİ oyunlarda düz yol hâlâ çalışıyor, o yüzden
// yalnızca YENİ çıkanlarda ortaya çıktı — yani en çok bakılan şeritte.
// Üstelik `api/games/route.js` detayı ZATEN çekiyordu ama `header_image`'i
// kullanmıyordu.
//
// Bu denetim, adresi elle birleştiren yeni kodu yakalar. Doğru yol:
// `getSteamDetailsCached(appid)` → `header_image`.
//
// MUAF: `app/lib/curated-lists.js` — elle yazılmış sabit liste, hepsi eski
// oyun ve çalışıyor; sunucu detay çektiğinde zaten gerçek adresle
// değiştiriyor. Yeni satır eklenirse burada görünsün diye SAYILIYOR.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = fileURLToPath(new URL('../..', import.meta.url));   // depo kökü
const TABAN = fileURLToPath(new URL('./image-url-baseline.json', import.meta.url));
const GUNCELLE = process.argv.includes('--guncelle');

// Şablon ifadesiyle appid'den adres kuran satırlar.
const KURUYOR = /store_item_assets\/steam\/apps\/\$\{[^}]+\}\/header\.jpg|\/steam\/apps\/\$\{[^}]+\}\/header\.jpg/;

const ATLA = new Set(['node_modules', '.next', '.git', 'dist', 'ios', 'android', '.expo']);

function dosyalar(dizin, cikti = []) {
  let girisler;
  try { girisler = readdirSync(dizin); } catch { return cikti; }
  for (const ad of girisler) {
    if (ATLA.has(ad) || ad.startsWith('.')) continue;
    const yol = join(dizin, ad);
    let st;
    try { st = statSync(yol); } catch { continue; }
    if (st.isDirectory()) dosyalar(yol, cikti);
    else if (/\.(js|jsx|mjs)$/.test(ad)) cikti.push(yol);
  }
  return cikti;
}

const simdi = {};
for (const yol of dosyalar(KOK)) {
  const goreli = yol.replace(KOK, '').split(sep).join('/');
  if (goreli.includes('scripts/check-image-urls')) continue;
  const satirlar = readFileSync(yol, 'utf8').split('\n');
  let n = 0;
  satirlar.forEach((satir, i) => {
    if (satir.trimStart().startsWith('//') || satir.trimStart().startsWith('*')) return;
    if (!KURUYOR.test(satir)) return;
    // `d.header_image || <kurulan>` biçimi MEŞRU: gerçek adres varsa o
    // kullanılıyor, kurulan yalnızca yedek.
    const onceki = satirlar[i - 1] || '';
    if (/header_image\s*(\|\||$)/.test(onceki) || /header_image\s*\|\|/.test(satir)) return;
    n++;
  });
  if (n > 0) simdi[goreli] = n;
}

const toplam = Object.values(simdi).reduce((a, b) => a + b, 0);
const onceki = existsSync(TABAN) ? JSON.parse(readFileSync(TABAN, 'utf8')) : null;

if (GUNCELLE || !onceki) {
  writeFileSync(TABAN, JSON.stringify(simdi, null, 2) + '\n');
  console.log(`taban yazildi: ${Object.keys(simdi).length} dosya, ${toplam} kurulan adres`);
  process.exit(0);
}

const oncekiToplam = Object.values(onceki).reduce((a, b) => a + b, 0);
const artan = Object.entries(simdi).filter(([f, n]) => n > (onceki[f] || 0));

if (artan.length) {
  console.error(`\n✗ elle kurulan Steam kapak adresi ARTTI (${oncekiToplam} → ${toplam}):\n`);
  for (const [f, n] of artan) console.error(`  ${f}: ${onceki[f] || 0} → ${n}`);
  console.error(`
Steam varlik yollari HASH'li: /apps/<id>/header.jpg yeni oyunlarda 404.
Hash kurulamiyor — getSteamDetailsCached(appid).header_image kullan.
Yedek olarak kuruyorsan ayni satirda "header_image ||" ile yaz.
Borcu azalttiysan: node scripts/check-image-urls.mjs --guncelle
`);
  process.exit(1);
}

console.log(toplam < oncekiToplam
  ? `✓ kurulan kapak adresi ${oncekiToplam} → ${toplam} (${oncekiToplam - toplam} azaldi) — tabani guncelle: --guncelle`
  : `✓ elle kurulan Steam kapak adresi artmadi (${toplam})`);
