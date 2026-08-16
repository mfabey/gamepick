// ─────────────────────────────────────────────────────────────────────────────
// DIL PARITE DENETIMI
//
// Bes dil var (tr/en/de/es/pt) ve eksik bir anahtar SESSIZ bir hata degil:
// t() bulamadigi anahtari ham haliyle ekrana basiyor, yani kullanici
// "rev.mineEmptyDesc" yazisini goruyor. Bu daha once bir kez oldu.
//
// Denetim uc sey ariyor:
//   1. tr'de olup baska dilde OLMAYAN anahtar
//   2. baska dilde olup tr'de olmayan (olu anahtar)
//   3. koda yazilmis ama HICBIR dilde tanimli olmayan t('...') cagrisi
//
// tr referans alindi: urun dili o ve yeni anahtarlar once orada yaziliyor.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'fs';
import path from 'path';

const DILLER = ['tr', 'en', 'de', 'es', 'pt'];
const KOK = path.resolve(import.meta.dirname, '..');

function anahtarlariOku(dil) {
  const kaynak = fs.readFileSync(path.join(KOK, 'src/i18n', dil + '.js'), 'utf8');
  const set = new Set();
  // Satir basindaki  'anahtar': ...  kaliplari. Tek ve cift tirnak.
  const re = /^\s*(['"])([\w.]+)\1\s*:/gm;
  let m;
  while ((m = re.exec(kaynak))) set.add(m[2]);
  return set;
}

const tablo = Object.fromEntries(DILLER.map((d) => [d, anahtarlariOku(d)]));
const referans = tablo.tr;

let hata = 0;

for (const dil of DILLER.filter((d) => d !== 'tr')) {
  const eksik = [...referans].filter((k) => !tablo[dil].has(k));
  const fazla = [...tablo[dil]].filter((k) => !referans.has(k));
  if (eksik.length) {
    hata++;
    console.error(`\n✗ ${dil}: ${eksik.length} anahtar EKSIK`);
    for (const k of eksik.slice(0, 20)) console.error('    ' + k);
    if (eksik.length > 20) console.error(`    … ve ${eksik.length - 20} tane daha`);
  }
  if (fazla.length) {
    hata++;
    console.error(`\n✗ ${dil}: ${fazla.length} anahtar tr'de YOK (olu)`);
    for (const k of fazla.slice(0, 20)) console.error('    ' + k);
  }
}

// ── Kodda cagrilan ama hicbir dilde olmayan anahtarlar ──
const dosyalar = [];
(function tara(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) tara(p);
    else if (/\.(jsx?|tsx?)$/.test(p) && !p.includes('/i18n/')) dosyalar.push(p);
  }
})(KOK + '/app');
(function tara(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) tara(p);
    else if (/\.(jsx?|tsx?)$/.test(p) && !p.includes('/i18n/')) dosyalar.push(p);
  }
})(KOK + '/src');

const tanimsiz = new Map();
for (const f of dosyalar) {
  const s = fs.readFileSync(f, 'utf8');
  // Yalnizca DUZ dizeli t('...') cagrilari. Sablonlu olanlar
  // (t('filter.' + k) gibi) statik olarak cozulemez, atlaniyor.
  const re = /\bt\(\s*(['"])([\w.]+)\1\s*\)/g;
  let m;
  while ((m = re.exec(s))) {
    const k = m[2];
    if (!referans.has(k)) {
      if (!tanimsiz.has(k)) tanimsiz.set(k, new Set());
      tanimsiz.get(k).add(path.relative(KOK, f));
    }
  }
}

if (tanimsiz.size) {
  hata++;
  console.error(`\n✗ kodda cagrilan ${tanimsiz.size} anahtar tr'de TANIMSIZ`);
  for (const [k, yerler] of tanimsiz) {
    console.error(`    ${k}  ←  ${[...yerler].join(', ')}`);
  }
}

if (hata) {
  console.error('');
  process.exit(1);
}

console.log(`✓ bes dil parite TAM (${referans.size} anahtar) — kodda tanimsiz cagri yok`);
