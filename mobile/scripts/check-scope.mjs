// ─────────────────────────────────────────────────────────────────────────────
// KAPSAM DENETİMİ — bağlanmamış (tanımsız) ad.
//
// NEDEN VAR. `expo export`, `tsc` ve bu zincirin geri kalanı JS dosyalarında
// kapsam analizi YAPMIYOR. Kaldırılan bir içe aktarımın adı dosyada başka
// bir yerde kalırsa paket derleniyor, ekran açılıyor ve çökme yalnız o satır
// ÇALIŞTIĞINDA geliyor (ReferenceError). Bu depoda iki kez oldu:
//
//   2026-08-12  sohbet: yeniden adlandırılan işlev bağımlılık dizisinde kaldı
//   2026-09-22  Skeleton.jsx: `motion` içe aktarımı kaldırıldı, Reveal hâlâ
//               `motion.reveal` okuyordu — iskeletten içeriğe geçişte çökecekti
//
// İkisinde de bundle ve bütün denetimler yeşildi.
//
// YÖNTEM: Babel ile ayrıştır, her başvurulan ad için kapsamda bağ ara.
// TypeScript tip bağlamındaki adlar (tip takma adı, fonksiyon tipindeki
// parametre adı) çalışma anında yok — onlar sayılmıyor.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const KOK = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(join(KOK, 'package.json'));
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// React Native çalışma anında var olan globaller (ES + Hermes + RN polyfill'leri).
const GLOBAL = new Set(`undefined NaN Infinity globalThis global console process require module exports __DEV__
Object Array String Number Boolean Symbol Math Date JSON Promise Error TypeError RangeError SyntaxError ReferenceError EvalError AggregateError
Map Set WeakMap WeakSet WeakRef RegExp Intl Reflect Proxy BigInt Function arguments
parseInt parseFloat isNaN isFinite encodeURIComponent decodeURIComponent encodeURI decodeURI escape unescape
setTimeout clearTimeout setInterval clearInterval setImmediate clearImmediate requestAnimationFrame cancelAnimationFrame queueMicrotask
fetch AbortController AbortSignal URL URLSearchParams FormData Headers Request Response Blob FileReader TextEncoder TextDecoder
atob btoa performance navigator structuredClone
Uint8Array Uint16Array Uint32Array Int8Array Int16Array Int32Array Float32Array Float64Array ArrayBuffer DataView`.split(/\s+/));

function dosyalar(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) dosyalar(p, out);
    else if (/\.[jt]sx?$/.test(p) && !p.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

const tipBaglami = (p) => !!p.findParent((a) => a.isTSType?.() || a.isTSTypeAliasDeclaration?.()
  || a.isTSInterfaceDeclaration?.() || a.isTSTypeAnnotation?.() || a.isTSTypeParameterInstantiation?.());

const bulgular = [];
for (const dosya of [...dosyalar(join(KOK, 'app')), ...dosyalar(join(KOK, 'src')), ...dosyalar(join(KOK, 'modules'))]) {
  const kaynak = readFileSync(dosya, 'utf8');
  let ast;
  try {
    ast = parser.parse(kaynak, { sourceType: 'module', plugins: ['jsx', /\.tsx?$/.test(dosya) ? 'typescript' : null].filter(Boolean) });
  } catch (e) {
    bulgular.push(`${relative(KOK, dosya)}: AYRIŞTIRILAMADI — ${e.message}`);
    continue;
  }
  traverse(ast, {
    ReferencedIdentifier(p) {
      const ad = p.node.name;
      if (p.isJSXIdentifier() && /^[a-z]/.test(ad)) return;          // <View> değil <view>: yerleşik etiket
      if (p.parentPath.isJSXMemberExpression()) return;
      if (GLOBAL.has(ad) || p.scope.hasBinding(ad) || tipBaglami(p)) return;
      bulgular.push(`${relative(KOK, dosya).split('\\').join('/')}:${p.node.loc.start.line}  '${ad}'`);
    },
  });
}

if (bulgular.length) {
  console.error(`✗ bağlanmamış ad (${bulgular.length}) — çalışma anında ReferenceError:`);
  for (const b of bulgular) console.error('  ' + b);
  process.exit(1);
}
console.log('✓ kapsam: app/ src/ modules/ içinde bağlanmamış ad yok');
