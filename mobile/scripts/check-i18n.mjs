// ─────────────────────────────────────────────────────────────────────────────
// DIL PARITE DENETIMI
//
// Bes dil var (tr/en/de/es/pt) ve eksik bir anahtar SESSIZ bir hata degil:
// t() bulamadigi anahtari ham haliyle ekrana basiyor, yani kullanici
// "rev.mineEmptyDesc" yazisini goruyor. Bu daha once bir kez oldu.
//
// Denetim dort sey ariyor:
//   1. tr'de olup baska dilde OLMAYAN anahtar
//   2. baska dilde olup tr'de olmayan (olu anahtar)
//   3. koda yazilmis ama HICBIR dilde tanimli olmayan t('...') cagrisi
//   4. tanimli ama KODDA HIC KULLANILMAYAN anahtar
//
// tr referans alindi: urun dili o ve yeni anahtarlar once orada yaziliyor.
//
// ── DOSYA ARTIK GERCEKTEN AYRISTIRILIYOR ──
// Onceki surum anahtarlari duzenli ifadeyle okuyordu ve dosyayi hic
// ayristirmiyordu. Bedeli olculdu: bir cevirideki kacisi dusen kesme isareti
//     'Saatin Steam'den okunuyor'
// dosyayi sozdizimsel olarak bozdu, bu denetim ✓ dedi ve hata ancak
// `expo export` calistirilinca (dakikalar sonra) ortaya cikti. Diller
// bagimlisiz `export default {…}` oldugu icin dinamik import bedava bir
// sozdizimi denetimi veriyor.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const DILLER = ['tr', 'en', 'de', 'es', 'pt'];
const KOK = path.resolve(import.meta.dirname, '..');

// ── DINAMIK ONEKLER ──
// Bazi anahtarlar koda DUZ YAZILMIYOR: t('genre.' + slug) ya da
// t(`soc.err.${code}`) gibi calisma aninda kuruluyor. Bunlarin altindaki
// anahtarlar "kullanilmiyor" sayilamaz. Liste kodda TARANARAK bulunuyor,
// elle yazilmiyor — yeni bir dinamik cagri eklendiginde kendiliginden
// kapsanmis oluyor.
const DINAMIK = new Set();

async function dilYukle(dil) {
  const yol = path.join(KOK, 'src/i18n', dil + '.js');
  try {
    const mod = await import(pathToFileURL(yol).href);
    const nesne = mod.default;
    if (!nesne || typeof nesne !== 'object') {
      throw new Error('export default bir nesne degil');
    }
    return new Set(Object.keys(nesne));
  } catch (e) {
    console.error(`\n✗ src/i18n/${dil}.js OKUNAMADI — dosya bozuk olabilir:`);
    console.error('    ' + String(e?.message || e).split('\n')[0]);
    process.exit(1);
  }
}

const tablo = {};
for (const d of DILLER) tablo[d] = await dilYukle(d);
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

// ── Kaynak dosyalari ──
const dosyalar = [];
function tara(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) tara(p);
    else if (/\.(jsx?|tsx?)$/.test(p) && !p.split(path.sep).join('/').includes('/i18n/')) dosyalar.push(p);
  }
}
tara(KOK + '/app');
tara(KOK + '/src');

// Koddaki TUM anahtar gorunumlu duz dizeler. Yalnizca t(...) icine bakmak
// yetmiyor: bazi anahtarlar once bir nesnede tutulup sonra t()'ye veriliyor
// (ornek: tierFor() -> { key: 'review.positive' } -> t(tier.key)).
const kullanilan = new Set();
const tanimsiz = new Map();

for (const f of dosyalar) {
  const s = fs.readFileSync(f, 'utf8');

  // 1) Duz dizeli t() cagrilari — TANIMSIZ denetimi yalnizca bunlara bakiyor,
  //    cunku yalnizca burada "bu bir ceviri anahtaridir" kesin.
  const reT = /\bt\(\s*(['"])([\w.]+)\1\s*\)/g;
  let m;
  while ((m = reT.exec(s))) {
    const k = m[2];
    kullanilan.add(k);
    if (!referans.has(k)) {
      if (!tanimsiz.has(k)) tanimsiz.set(k, new Set());
      tanimsiz.get(k).add(path.relative(KOK, f));
    }
  }

  // 2) Anahtar gorunumlu her duz dize (nokta iceren, bosluksuz).
  const reD = /(['"])([a-z][\w]*(?:\.[\w]+)+)\1/g;
  while ((m = reD.exec(s))) kullanilan.add(m[2]);

  // 3) Dinamik onekler:  t('genre.' + x)   ve   `soc.err.${x}`
  //
  // SABLON ARAMASI t() ICINE BAKMIYOR, BILEREK. Olculdu: kod anahtari once
  // bir degiskende kuruyor, sonra t()'ye veriyor —
  //     const k = `auth.err.${r.error}`;  … t(k)
  // Yalnizca t(`…`) kalibi aransaydi `auth.err.*` altindaki uc anahtar
  // "kullanilmiyor" diye raporlanir ve silinseydi hata mesajlari ham anahtar
  // olarak ekrana basardi. Nokta iceren her sablon oneki dinamik sayiliyor.
  const reP1 = /['"]([\w.]*\.)['"]\s*\+/g;
  while ((m = reP1.exec(s))) DINAMIK.add(m[1]);
  const reP2 = /`([a-z][\w]*(?:\.[\w]+)*\.)\$\{/g;
  while ((m = reP2.exec(s))) DINAMIK.add(m[1]);
}

if (tanimsiz.size) {
  hata++;
  console.error(`\n✗ kodda cagrilan ${tanimsiz.size} anahtar tr'de TANIMSIZ`);
  for (const [k, yerler] of tanimsiz) {
    console.error(`    ${k}  ←  ${[...yerler].join(', ')}`);
  }
}

// ── Kullanilmayan anahtarlar ──
// Bir ekran silindiginde anahtarlari geride kaliyor ve kimse fark etmiyor;
// `/social` ekrani kalkinca tam olarak bu oldu. Olu ceviri zararsiz gorunur
// ama bes dilde bakim yuku uretir ve yeni anahtar ararken gurultu yapar.
const dinamikOnekler = [...DINAMIK];
const kullanilmayan = [...referans].filter((k) => {
  if (kullanilan.has(k)) return false;
  return !dinamikOnekler.some((on) => k.startsWith(on));
});

// ── OLU ANAHTAR BORCU: RATCHET ──
// Denetim ilk kosuldugunda 78 kullanilmayan anahtar buldu ve cogu bu
// projeden ONCE olusmustu (silinmis ekranlarin kalintilari). Hepsini birden
// silmek, dinamik kullanimi kacirilmis bir anahtari da goturme riski
// tasiyordu — bu depo boyle kampanyalar yapmiyor (bkz. check-spacing.mjs).
//
// Bunun yerine borc DONDURULDU: listeye YENI bir anahtar eklenirse denetim
// duser, liste kisalirsa taban guncellenir. Borc tek yonde hareket ediyor.
const TABAN_YOLU = path.join(KOK, 'scripts', 'i18n-unused-baseline.json');

if (process.argv.includes('--guncelle')) {
  fs.writeFileSync(TABAN_YOLU, JSON.stringify(kullanilmayan.sort(), null, 2) + '\n');
  console.log(`taban yazildi: ${kullanilmayan.length} kullanilmayan anahtar`);
  process.exit(0);
}

const taban = fs.existsSync(TABAN_YOLU)
  ? new Set(JSON.parse(fs.readFileSync(TABAN_YOLU, 'utf8')))
  : new Set();

const yeniOlu = kullanilmayan.filter((k) => !taban.has(k));
if (yeniOlu.length) {
  hata++;
  console.error(`\n✗ ${yeniOlu.length} YENI anahtar tanimli ama kodda kullanilmiyor`);
  for (const k of yeniOlu.slice(0, 40)) console.error('    ' + k);
  console.error('\n  Silin ya da (dinamik kuruluyorsa) cagrildigi yeri duz dize yapin.');
}

const azalma = taban.size - kullanilmayan.length;
if (!hata && azalma > 0) {
  console.log(`  olu anahtar ${taban.size} → ${kullanilmayan.length} (${azalma} azaldi) — taban: --guncelle`);
}

if (hata) {
  console.error('');
  process.exit(1);
}

console.log(
  `✓ bes dil parite TAM (${referans.size} anahtar) — sozdizimi gecerli, ` +
  'tanimsiz cagri ve olu anahtar yok'
);
