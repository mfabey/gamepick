// Erken dönüşün arkasında kalan hook'lar oturum değişiminde ekranı düşürür.
// Bu kontrol tam bir Rules of Hooks linter'ı değildir; bu gerilemeyi korur.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

export function lateHooks(source, file) {
  const errors = [];
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  traverse(ast, {
    Function(fn) {
      const returns = [];
      fn.traverse({
        // İç fonksiyonun dönüşü dış bileşeni sonlandırmaz.
        Function(inner) { inner.skip(); },
        ReturnStatement(ret) { returns.push(ret.node.end); },
        CallExpression(call) {
          const { callee, start, loc } = call.node;
          if (callee.type === 'Identifier' && /^use[A-Z]/.test(callee.name)
              && returns.some((pos) => pos < start)) {
            errors.push(`${file}:${loc.start.line} ${callee.name}: erken dönüşten sonra hook`);
          }
        },
      });
    },
  });
  return errors;
}

function scan(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return scan(file);
    return /\.[jt]sx?$/.test(file) ? lateHooks(fs.readFileSync(file, 'utf8'), file) : [];
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const errors = ['app', 'src'].flatMap((dir) => scan(path.join(root, dir)));
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('✓ ekran ve bileşenlerde erken dönüşten sonra hook yok');
  }
}
