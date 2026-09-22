import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import { tabGeometry } from '../src/theme/tabGeometry.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const cache = new Map();
// Execute the actual pure token/adapter modules. Only native platform/easing
// dependencies are stubbed; palettes and compatibility mapping are not copied.
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file);
  const source = fs.readFileSync(file, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  const require = (name) => {
    if (name === 'react-native') return { Platform: { OS: 'ios', select: (x) => x.ios ?? x.default } };
    if (name === 'react-native-reanimated') return { Easing: { bezier: () => () => {}, out: () => () => {}, ease: () => {} } };
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name + '.ts')));
    throw new Error(`Unexpected dependency: ${name}`);
  };
  vm.runInNewContext(output, { module, exports: module.exports, require }, { filename: file });
  cache.set(file, module.exports);
  return module.exports;
}
const { colors, typography, tabBar } = load('src/theme/tokens.ts');
const { designPalettes, legacyDesignColors } = load('src/theme/palettes.ts');
assert.equal(colors.bg, '#0A0A0B');
assert.equal(colors.primary, '#F5F5F7');
assert.equal(colors.red, '#F34545');
assert.equal(colors.brand, '#BC0C0C');
assert.equal(tabBar.ios.height, 62);
assert.equal(tabBar.android.height, 64);

const luma = (hex) => {
  const channel = (offset) => {
    const n = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
};
const contrast = (a, b) => (Math.max(luma(a), luma(b)) + 0.05) / (Math.min(luma(a), luma(b)) + 0.05);
for (const [scheme, palette] of Object.entries(designPalettes)) {
  assert.deepEqual(Object.keys(palette).sort(), Object.keys(colors).sort(), `${scheme}: semantic key parity`);
  const legacy = legacyDesignColors(palette);
  for (const value of Object.values(legacy)) assert.equal(typeof value, 'string');
  assert.equal(legacy.accentText, palette.red);
  assert.notEqual(legacy.accent, palette.primary, 'Brand must not become primary CTA');
  for (const [fg, bg] of [['text', 'bg'], ['text2', 'surface1'], ['text3', 'surface1'], ['red', 'surface1'], ['onPrimary', 'primary'], ['white', 'brand'], ['onGreen', 'green']]) {
    const ratio = contrast(palette[fg], palette[bg]);
    assert.ok(ratio >= 4.5, `${scheme}.${fg}/${bg}: ${ratio.toFixed(2)} < 4.5`);
  }
}
for (const [platform, safe, occupied] of [
  ['ios', 0, 74], ['ios', 21, 74], ['ios', 34, 83],
  ['android', 0, 64], ['android', 24, 88], ['android', 48, 112],
]) {
  const geometry = tabGeometry(platform, safe);
  assert.equal(geometry.occupied, occupied);
  assert.equal(geometry.height, tabBar[platform].height, 'Geometry must match the handoff tokens');
  assert.equal(geometry.contentInset, occupied + 12);
  assert.ok(geometry.height >= 44, 'Each tab must remain touchable');
  assert.equal(tabGeometry(platform, safe, 30).contentInset, occupied + 30);
}
assert.equal(tabGeometry('ios', -10).bottom, 12);
for (const style of Object.values(typography)) assert.equal(typeof style.fontSize, 'number');
console.log('✓ Gamerisen 2.0: handoff identity, light/dark parity, semantic contrast, legacy mapping and 6 safe-area configurations');
