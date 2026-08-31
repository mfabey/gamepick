// ─────────────────────────────────────────────────────────────────────────────
// EKSİK İÇE AKTARIM RATCHET'İ
//
// NEDEN VAR. Bu depoda AYNI HATA SINIFI üç kez çıktı ve `expo export` üçünü
// de sessizce geçirdi:
//
//   1. FloatingTabBar — `badge` stili bir kodmod tarafından silindi
//   2. game/[id].jsx  — `withDelay` kullanıldı, içe aktarılmadı
//   3. GameCard       — "×" düğmesinde `PRESSED` kullanıldı, alınmadı
//
// Üçüncüsü en sinsisiydi: `pressed && PRESSED` ifadesi PRESSED'i yalnızca
// düğmeye BASILDIĞINDA değerlendiriyor. Ekran açılıyor, kart çiziliyor,
// ekran görüntüsü doğru görünüyor — çökme yalnız gerçek bir dokunuşta.
//
// Metro paketleyicisi tanımsız adı derleme hatası saymıyor (JS'te bu
// çalışma anı ReferenceError'ı). Bu yüzden ayrı bir denetim gerekiyor.
//
// KAPSAM DAR VE BİLEREK: yalnızca theme.js'in BÜYÜK_HARF sabitleri. `colors`
// gibi adlar makeStyles parametresinden, `scale` gibi adlar transform
// özelliklerinden geliyor — onları da denetlemek gürültü üretir ve ratchet
// güvenilirliğini kaybeder. Sabitler belirsizlik taşımıyor.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = fileURLToPath(new URL('..', import.meta.url));

function dosyalar(dizin, cikti = []) {
  for (const ad of readdirSync(dizin)) {
    if (ad === 'node_modules' || ad.startsWith('.')) continue;
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) dosyalar(yol, cikti);
    else if (ad.endsWith('.jsx') || ad.endsWith('.js')) cikti.push(yol);
  }
  return cikti;
}

const tema = readFileSync(KOK + 'src/theme.js', 'utf8');
const SABITLER = [...tema.matchAll(/export const\s+([A-Z][A-Z0-9_]+)\b/g)].map((m) => m[1]);

// Yorumları ve dizeleri çıkarıyor: bir sabitin adı yorumda geçtiği için
// "kullanılıyor" sayılmasın.
const temizle = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')
  .replace(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g, "''");

const bulgular = [];
for (const yol of dosyalar(KOK + 'app').concat(dosyalar(KOK + 'src'))) {
  if (yol.split(sep).join('/').endsWith('src/theme.js')) continue;
  const ham = readFileSync(yol, 'utf8');
  const m = ham.match(/import \{([^}]*)\} from '[^']*theme';/);
  const alinan = new Set(m ? m[1].split(',').map((x) => x.trim().split(' as ')[0]) : []);
  const govde = temizle(ham);
  for (const ad of SABITLER) {
    if (alinan.has(ad)) continue;
    if (new RegExp(`(?<![\\w.])${ad}(?![\\w])`).test(govde)) {
      bulgular.push(`${yol.replace(KOK, '').split(sep).join('/')}: ${ad}`);
    }
  }
}

if (bulgular.length) {
  console.error(`\n✗ ${bulgular.length} tema sabiti kullaniliyor ama ice aktarilmamis:\n`);
  for (const b of bulgular) console.error('  ' + b);
  console.error('\nBunlar CALISMA ANI hatasi — derleme yakalamiyor.\n');
  process.exit(1);
}
console.log(`✓ tema sabitleri (${SABITLER.length}) her kullanildigi yerde ice aktarilmis`);
