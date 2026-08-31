// ─────────────────────────────────────────────────────────────────────────────
// accent'in METİN ya da DOLGU olarak kullanımı — BORÇ RATCHET'İ
//
// NEDEN VAR. Bu ölçüm bu depoda ALTI KEZ çıktı ve her seferinde ELLE bulundu:
//   Faz 0 (varsayım) · Faz 4 filtre CTA · Faz 6 saveBtn + PostComposer ·
//   Faz 7 SmallBtn + cta · Faz 8 weekMore
//
// `accent` (#E8242B) beyaz üstünde 4.45:1, koyu zeminde metin olarak 4.27:1 —
// ikisi de AA eşiğinin (4.5) altında. Doğrusu: dolguda `accentFillStrong`
// (5.45), metinde `accentText` (5.52).
//
// BORÇ SIFIRLANDI. Başlangıçta 33 kullanım vardı; hepsi sınıflandırıldı:
// metin taşıyan dolgular accentFillStrong'a geçti, metin taşımayanlar
// (nokta, şerit, simge dairesi) ve DEĞERE BAĞLI olanlar (grafikte en yoğun
// gün, kendi beğenin) gerekçesiyle işaretlendi. Taban artık sıfır — yani
// bu ratchet sıfır-tolerans çalışıyor.
//
// KAPSAM DAR: yalnız `backgroundColor: colors.accent` ve `color:
// colors.accent`. `accentSoft`, `accentBg`, `accentGlow`, `tabVurgu` gibi
// tint'ler metin taşımıyor.
//
// İSTİSNA: satırın üstüne ya da sonuna `accent-serbest: <gerekçe>` yazılır.
// Değere bağlı renkler için meşru (grafikte en yoğun gün, beğenilmiş kalp) —
// Faz 0 kuralı: renk değere bağlıysa kalır.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = fileURLToPath(new URL('..', import.meta.url));
const TABAN = KOK + 'scripts/accent-baseline.json';
const GUNCELLE = process.argv.includes('--guncelle');

const YASAK = [
  /backgroundColor:\s*colors\.accent\b(?!\w)/,
  /color:\s*colors\.accent\b(?!\w)/,
];

function dosyalar(dizin, cikti = []) {
  for (const ad of readdirSync(dizin)) {
    if (ad === 'node_modules' || ad.startsWith('.')) continue;
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) dosyalar(yol, cikti);
    else if (ad.endsWith('.jsx')) cikti.push(yol);
  }
  return cikti;
}

const simdi = {};
for (const yol of dosyalar(KOK + 'app').concat(dosyalar(KOK + 'src'))) {
  const satirlar = readFileSync(yol, 'utf8').split('\n');
  let n = 0;
  satirlar.forEach((satir, i) => {
    if (satir.trimStart().startsWith('//')) return;
    if (!YASAK.some((r) => r.test(satir))) return;
    if (((satirlar[i - 1] || '') + satir).includes('accent-serbest:')) return;
    n++;
  });
  if (n > 0) simdi[yol.replace(KOK, '').split(sep).join('/')] = n;
}

const toplam = Object.values(simdi).reduce((a, b) => a + b, 0);
const onceki = existsSync(TABAN) ? JSON.parse(readFileSync(TABAN, 'utf8')) : null;

if (GUNCELLE || !onceki) {
  writeFileSync(TABAN, JSON.stringify(simdi, null, 2) + '\n');
  console.log(`taban yazildi: ${Object.keys(simdi).length} dosya, ${toplam} kullanim`);
  process.exit(0);
}

const oncekiToplam = Object.values(onceki).reduce((a, b) => a + b, 0);
const artan = Object.entries(simdi).filter(([f, n]) => n > (onceki[f] || 0));

if (artan.length) {
  console.error(`\n✗ accent metin/dolgu kullanimi ARTTI (${oncekiToplam} → ${toplam}):\n`);
  for (const [f, n] of artan) console.error(`  ${f}: ${onceki[f] || 0} → ${n}`);
  console.error(`
Dolguda accentFillStrong (5.45:1), metinde accentText (5.52:1) kullan.
Renk DEGERE bagliysa (grafikte en yogun gun, begenilmis kalp) satirin
ustune gerekcesini yaz:
    // accent-serbest: <neden bu renk degere bagli>
Borcu azalttiysan: node scripts/check-accent.mjs --guncelle
`);
  process.exit(1);
}

if (toplam < oncekiToplam) {
  console.log(`✓ accent borcu ${oncekiToplam} → ${toplam} (${oncekiToplam - toplam} azaldi) — tabani guncelle: --guncelle`);
} else {
  console.log(`✓ accent metin/dolgu kullanimi artmadi (${toplam})`);
}
