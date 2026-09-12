// Gerçek ekran stillerindeki son yatay dolguyu telefon/tablet genişliklerinde ölçer.
// Native görsel testin yerine geçmez; tablet dolgusu telefon payını ezmemeli.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const root = new URL('../', import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, root), 'utf8');
const ast = (source) => parse(source, { sourceType: 'module', plugins: ['jsx'] });
const constants = {};

function value(node, env = constants) {
  if (!node) return undefined;
  if (node.type === 'NumericLiteral' || node.type === 'StringLiteral') return node.value;
  if (node.type === 'Identifier') return env[node.name];
  if (node.type === 'MemberExpression') return value(node.object, env)?.[node.property.name];
  if (node.type === 'ObjectExpression') return Object.fromEntries(node.properties.map((p) => [p.key.name, value(p.value, env)]));
  if (node.type === 'CallExpression' && node.callee.object?.name === 'Object' && node.callee.property?.name === 'freeze') return value(node.arguments[0], env);
  if (node.type === 'BinaryExpression') {
    const a = value(node.left, env), b = value(node.right, env);
    if (node.operator === '+') return a + b;
    if (node.operator === '/') return a / b;
  }
  return undefined;
}

traverse(ast(read('src/theme.js')), {
  VariableDeclarator(p) {
    if (['spacing', 'ICERIK_MAX', 'SAYFA_MAX', 'SHEET_LAYOUT'].includes(p.node.id.name)) {
      constants[p.node.id.name] = value(p.node.init);
    }
  },
});

const hookSource = read('src/hooks/useIcerikAlani.js');
let insetFunction;
traverse(ast(hookSource), {
  FunctionDeclaration(p) {
    if (p.node.id.name === 'useYanBosluk') insetFunction = hookSource.slice(p.node.start, p.node.end);
  },
});

const widths = [320, 360, 375, 390, 430, 600, 640, 768, 820, 1024, 1366];
const screens = [
  'profile-edit.jsx', 'lists.jsx', 'list/[id].jsx', 'collections.jsx',
  'collection/[id].jsx', 'friends.jsx', 'friend-requests.jsx', 'stats.jsx',
  'settings.jsx', 'social-settings.jsx', 'account.jsx', 'username-setup.jsx',
];

for (const file of screens) {
  const tree = ast(read(`app/${file}`));
  const styles = {};
  const containers = [];
  traverse(tree, {
    VariableDeclarator(p) {
      if (p.node.id.name !== 'makeStyles') return;
      for (const prop of p.node.init.body.arguments[0].properties) styles[prop.key.name] = prop.value;
    },
    JSXAttribute(p) {
      if (p.node.name.name === 'contentContainerStyle' && p.node.value?.expression?.type === 'ArrayExpression') {
        containers.push(p.node.value.expression.elements);
      }
    },
  });
  let checked = 0;
  for (const parts of containers) {
    const base = parts.find((p) => p?.type === 'MemberExpression' && p.object.name === 'styles');
    if (!base) continue;
    const props = styles[base.property.name]?.properties || [];
    const basePad = props.find((p) => p.key?.name === 'paddingHorizontal') || props.find((p) => p.key?.name === 'padding');
    const expected = value(basePad?.value);
    if (!(expected > 0)) continue;
    const override = parts.filter((p) => p?.type === 'ObjectExpression').flatMap((p) => p.properties)
      .filter((p) => p.key?.name === 'paddingHorizontal').at(-1);
    assert.ok(override, `${file}: geniş ekranda kolon dolgusu eksik`);
    for (const width of widths) {
      const yan = vm.runInNewContext(`(${insetFunction})()`, {
        ICERIK_MAX: constants.ICERIK_MAX, useWindowDimensions: () => ({ width }),
      });
      const actual = value(override.value, { ...constants, yan });
      assert.equal(actual, yan + expected, `${file} / ${width}: telefon kenar payı ezildi`);
      assert.ok(width - actual * 2 > 0, `${file}: içerik için yer kalmadı`);
      checked++;
    }
  }
  assert.ok(checked, `${file}: kontrol edilecek içerik kabı bulunamadı`);
}

const sheet = constants.SHEET_LAYOUT;
assert.equal(sheet.width, '100%');
assert.equal(sheet.alignSelf, 'center');
assert.equal(sheet.maxWidth, constants.ICERIK_MAX);
for (const width of widths) assert.ok(Math.min(width, sheet.maxWidth) <= width);

// Ortak pencere sınırı çağıran bileşenlerde de uygulanmalı.
for (const file of fs.readdirSync(new URL('src/components/', root)).filter((f) => f.endsWith('.jsx'))) {
  traverse(ast(read(`src/components/${file}`)), {
    ObjectProperty(p) {
      if (p.node.key.name !== 'sheet' || p.node.value.type !== 'ObjectExpression') return;
      assert.ok(p.node.value.properties.some((prop) => prop.type === 'SpreadElement'
        && prop.argument.name === 'SHEET_LAYOUT'), `${file}: tablet pencere sınırı eksik`);
    },
  });
}

// Kapakların toplam genişliği pencereye sığmalı; geniş ekranda sütun artmalı.
const coverSource = read('src/components/CoverGrid.jsx');
const gridEnv = { GRID_PAD: constants.spacing.s20, GRID_GAP: constants.spacing.s4, HEDEF_HUCRE: 114 };
traverse(ast(coverSource), {
  FunctionDeclaration(p) {
    if (['gridCols', 'coverWidth'].includes(p.node.id.name)) {
      gridEnv[p.node.id.name] = vm.runInNewContext(`(${coverSource.slice(p.node.start, p.node.end)})`, gridEnv);
    }
  },
});
for (const width of widths) {
  const cols = gridEnv.gridCols(width);
  const cell = gridEnv.coverWidth(width, cols);
  assert.ok(cell > 0 && cell < 160, `Kapak ölçüsü uygun değil: ${width}`);
  assert.ok(Math.abs(cell * cols + (cols - 1) * gridEnv.GRID_GAP + gridEnv.GRID_PAD * 2 - width) < 0.001);
}
for (const file of ['app/(tabs)/profile.jsx', 'app/u/[username].jsx']) {
  traverse(ast(read(file)), {
    VariableDeclarator(p) {
      if (p.node.id.name !== 'izgaraSatirlari') return;
      assert.ok(p.node.init.arguments[1].elements.some((e) => e.name === 'sutun'), `${file}: döndürmede eski sütunlar kalır`);
    },
  });
}

const mediaSource = read('src/components/GamePostCard.jsx');
let ratio;
traverse(ast(mediaSource), {
  ObjectProperty(p) {
    if (p.node.key.name === 'aspectRatio') ratio = value(p.node.value);
  },
});
assert.ok(ratio > 1, 'Akış görseli yüksekliği kart genişliğinden türemeli');
assert.ok(!mediaSource.includes('useWindowDimensions'), 'Akış görseli ekran genişliğine bağlanmamalı');

console.log(`✓ ${screens.length} ekran × ${widths.length} genişlik: telefon payları, tablet kolonu, pencere ve görsel oranı tutarlı`);
