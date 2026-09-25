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

// G-23 düzenindeki ekranlar ve ListGroup DIŞINDA kendi 20'lik payını taşıyan
// yerel stilleri (tam genişlik kart, çıkış düğmesi, bozuk bandı).
const G23 = {
  'settings.jsx': ['profile', 'signOut'],
  'social-settings.jsx': ['bozukBant'],
};

for (const file of screens) {
  const tree = ast(read(`app/${file}`));
  // G-23: the shared ListGroup owns the 20 pt phone gutter. The ScrollView
  // adds only the wide-window inset; adding the old phone padding doubles it.
  if (G23[file]) {
    let content, localStyles;
    traverse(tree, {
      VariableDeclarator(p) {
        if (p.node.id.name === 'styles') localStyles = p.node.init.arguments[0];
      },
      JSXAttribute(p) {
        if (p.node.name.name === 'contentContainerStyle') content = p.node.value.expression;
      },
    });
    // Kap ya düz nesne ({ paddingHorizontal: yan }) ya da dizi
    // ([styles.body, { paddingHorizontal: yan }]); dizideki taban stil yatay
    // dolgu EKLEMEMELİ — eklerse telefon payı ikiye katlanır.
    const parts = content?.type === 'ArrayExpression' ? content.elements : [content];
    const props = parts.filter(p => p?.type === 'ObjectExpression').flatMap(p => p.properties);
    const inset = props.find(p => p.key.name === 'paddingHorizontal');
    assert.ok(inset, `${file}: wide-window inset missing`);
    for (const base of parts.filter(p => p?.type === 'MemberExpression' && p.object.name === 'styles')) {
      const baseProps = localStyles.properties.find(p => p.key.name === base.property.name)?.value?.properties || [];
      assert.ok(!baseProps.some(p => ['padding', 'paddingHorizontal'].includes(p.key?.name)),
        `${file}: styles.${base.property.name} telefon payını ikinci kez ekliyor`);
    }
    const tokensSource = parse(read('src/theme/tokens.ts'), { sourceType: 'module', plugins: ['typescript'] });
    let gutter;
    traverse(tokensSource, {
      VariableDeclarator(p) {
        if (p.node.id.name === 'layout') gutter = value(p.node.init.expression)?.gutter;
      },
    });
    for (const name of G23[file]) {
      const style = localStyles.properties.find(p => p.key.name === name)?.value;
      assert.equal(value(style, { ...constants, layout: { gutter } })?.marginHorizontal, 20, `${file}: ${name} gutter`);
    }
    const primitives = parse(read('src/components/ui/Primitives.tsx'), { sourceType: 'module', plugins: ['jsx', 'typescript'] });
    let groupMargin;
    traverse(primitives, {
      ObjectProperty(p) {
        if (p.node.key.name === 'listGroup') groupMargin = p.node.value.properties.find(prop => prop.key.name === 'marginHorizontal')?.value;
      },
    });
    assert.equal(gutter, 20);
    assert.equal(value(groupMargin, { layout: { gutter } }), 20);
    for (const width of widths) {
      const yan = vm.runInNewContext(`(${insetFunction})()`, {
        ICERIK_MAX: constants.ICERIK_MAX, useWindowDimensions: () => ({ width }),
      });
      const actual = value(inset.value, { yan }) + gutter;
      assert.equal(actual, yan + 20, `${file} / ${width}: doubled or missing phone gutter`);
      assert.ok(width - actual * 2 > 0);
    }
    continue;
  }
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
// CoverGrid.jsx'teki sabitlerle AYNI olmalı (2.0: GameCardSmall, 16 boşluk, 106 hücre).
const gridEnv = { GRID_PAD: constants.spacing.s20, GRID_GAP: constants.spacing.s16, HEDEF_HUCRE: 106 };
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
