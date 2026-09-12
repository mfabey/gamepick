#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// CORS POLİTİKASI DENETLEYİCİSİ — build kapısı.
//
// NEDEN VAR: bu projede CORS bilerek KAPALI (app/lib/cors-policy.js). Kapalı
// olmasının riski, bir gün birinin "mobilde CORS hatası aldım" diyerek
// `Access-Control-Allow-Origin: *` yazması ve bunun sessizce üretime
// gitmesi. O satır, tarayıcıdaki aynı-kaynak korumasını tümden kaldırır.
//
// İKİ ŞEY ARANIYOR:
//   1. Joker kaynak (`Access-Control-Allow-Origin: *`) — her yerde yasak.
//   2. `cors-policy.js` DIŞINDA elle yazılmış herhangi bir `Access-Control-*`
//      başlığı — CORS gerekiyorsa tek meşru yol `corsHeaders()`.
//
// Erişim politikası denetleyicisiyle aynı ders: kaynaktan ÇIKARSAMA yapmıyor,
// düz metin arıyor. Yorum satırındaki bahisleri elemek için yalnızca başlığın
// bir dizge/nesne değeri olarak geçtiği satırlara bakıyor.
// ─────────────────────────────────────────────────────────────────────────────

import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const MUAF = join('app', 'lib', 'cors-policy.js');
const TARANAN = ['app', 'scripts', 'middleware.js', 'next.config.mjs', 'vercel.json'];
const UZANTI = /\.(js|jsx|mjs|ts|tsx|json)$/;

function dosyalar(hedef) {
  const tam = join(ROOT, hedef);
  if (!existsSync(tam)) return [];
  if (!statSync(tam).isDirectory()) return [tam];
  const out = [];
  for (const ad of readdirSync(tam)) {
    if (ad === 'node_modules' || ad === '.next') continue;
    out.push(...dosyalar(join(hedef, ad)));
  }
  return out.filter((f) => UZANTI.test(f));
}

/** Yorum satırlarını at — "bu başlığı yazma" diyen açıklamalar eşleşmesin. */
function kodSatirlari(icerik) {
  return icerik.split('\n').map((s, i) => [i + 1, s])
    .filter(([, s]) => {
      const t = s.trim();
      return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    });
}

const bulgular = [];

for (const hedef of TARANAN) {
  for (const dosya of dosyalar(hedef)) {
    const göreli = relative(ROOT, dosya).split(sep).join('/');
    if (relative(ROOT, dosya) === MUAF) continue;

    for (const [no, satir] of kodSatirlari(readFileSync(dosya, 'utf8'))) {
      // 1. Joker kaynak — her yerde yasak.
      if (/Access-Control-Allow-Origin/i.test(satir) && /['"`]\s*\*\s*['"`]/.test(satir)) {
        bulgular.push({ dosya: göreli, no, tip: 'JOKER KAYNAK', satir: satir.trim() });
        continue;
      }
      // 2. Politika dosyası dışında elle CORS başlığı.
      if (/['"`]Access-Control-[A-Za-z-]+['"`]/.test(satir)) {
        bulgular.push({ dosya: göreli, no, tip: 'ELLE CORS BAŞLIĞI', satir: satir.trim() });
      }
    }
  }
}

if (bulgular.length) {
  console.error('\n\x1b[31m✗ CORS politikası denetimi BAŞARISIZ\x1b[0m\n');
  for (const b of bulgular) {
    console.error(`  \x1b[1m${b.tip}\x1b[0m  ${b.dosya}:${b.no}`);
    console.error(`    ${b.satir}\n`);
  }
  console.error('  CORS bu projede BİLEREK kapalı — başlık eklemek aynı-kaynak');
  console.error('  korumasını AÇAR, kısıtlamaz. Gerçekten gerekiyorsa tek yol');
  console.error('  app/lib/cors-policy.js içindeki corsHeaders(); joker kaynak');
  console.error('  ise kimlik bilgisi taşıyan isteklerde tarayıcı tarafından');
  console.error('  zaten reddedilir.\n');
  process.exit(1);
}

console.log('✓ CORS politikası: joker kaynak yok, elle yazılmış başlık yok');
