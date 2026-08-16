// ─────────────────────────────────────────────────────────────────────────────
// REAKTIF TEMA CIRCIRI
//
// Sorun sadece "tema anahtari calismiyor" degil. YARIM donusum, hic
// donusumden KOTU: donusturulmus bir bilesen acik paleti secerken onu saran
// donusturulmemis ekran koyu kaliyor. Olculdu (16 Agustos 2026): sistem acik
// temadayken anasayfada oyun adlari #0A0B0D renkte, #0A0B0D zemin uzerinde
// ciziliyordu -- kontrast farki SIFIR, yazi tamamen gorunmez.
//
// Bir dosya DONUK sayiliyor: modul duzeyinde `const styles =
// StyleSheet.create(...)` var VE icinde `colors.*` kullaniyor. O nesne modul
// yuklenirken degerlendigi icin palet orada donuyor.
//
// Sayinin ARTMASI hata. Azaldiysa tabani guncelle:
//     node scripts/check-theme-reactive.mjs --guncelle
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'fs';
import path from 'path';

const KOK = path.resolve(import.meta.dirname, '..');
const TABAN = path.join(KOK, 'scripts', 'theme-reactive-baseline.json');
const guncelle = process.argv.includes('--guncelle');

const dosyalar = [];
for (const alt of ['app', 'src']) {
  (function tara(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) tara(p);
      else if (p.endsWith('.jsx')) dosyalar.push(p);
    }
  })(path.join(KOK, alt));
}

// Renk, STIL NESNESININ ICINDE mi? Dosyanin herhangi bir yerinde `colors.`
// gecmesi yetmez: EdgeFade gibi bir dosya paleti kanca ile okuyup stil
// nesnesinde hic renk tasimayabilir — o zaman donmus bir sey yoktur.
// Kaba arama onu yanlis isaretliyordu.
function stilBlogu(s) {
  const i = s.search(/^const styles = StyleSheet\.create\(/m);
  if (i < 0) return null;
  let derinlik = 0, basladi = false;
  for (let k = s.indexOf('(', i); k < s.length; k++) {
    const c = s[k];
    if (c === '(' || c === '{') { derinlik++; basladi = true; }
    else if (c === ')' || c === '}') {
      derinlik--;
      if (basladi && derinlik === 0) return s.slice(i, k + 1);
    }
  }
  return s.slice(i);
}

const donuk = [];
for (const f of dosyalar) {
  const s = fs.readFileSync(f, 'utf8');
  const blok = stilBlogu(s);
  if (!blok) continue;
  const icerdeki = blok.match(/\bcolors\.\w+/g);
  if (!icerdeki) continue;
  donuk.push({ dosya: path.relative(KOK, f), n: icerdeki.length });
}
donuk.sort((a, b) => b.n - a.n);

const simdi = donuk.length;
const toplamRef = donuk.reduce((a, b) => a + b.n, 0);

if (guncelle) {
  fs.writeFileSync(TABAN, JSON.stringify({ donuk: simdi, ref: toplamRef }, null, 2) + '\n');
  console.log(`taban yazildi: ${simdi} donuk dosya, ${toplamRef} renk basvurusu`);
  process.exit(0);
}

if (!fs.existsSync(TABAN)) {
  console.error('✗ taban yok — once: node scripts/check-theme-reactive.mjs --guncelle');
  process.exit(1);
}

const taban = JSON.parse(fs.readFileSync(TABAN, 'utf8'));

if (simdi > taban.donuk) {
  console.error(`✗ donuk dosya sayisi ARTTI (${taban.donuk} → ${simdi})`);
  console.error('  Yeni ekran/bilesen useStyles(makeStyles) kullanmali.');
  console.error('  Modul duzeyinde `const styles = StyleSheet.create` + colors.* = palet donar.\n');
  process.exit(1);
}

if (simdi < taban.donuk) {
  console.log(`✓ donuk dosya ${taban.donuk} → ${simdi} (${taban.donuk - simdi} azaldi) — tabani guncelle: --guncelle`);
  process.exit(0);
}

console.log(`✓ donuk dosya artmadi (${simdi} dosya, ${toplamRef} renk basvurusu)`);
if (donuk.length) {
  console.log('  en agir bes dosya:');
  for (const d of donuk.slice(0, 5)) console.log(`    ${String(d.n).padStart(3)}  ${d.dosya}`);
}
