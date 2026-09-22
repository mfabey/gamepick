import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import ts from 'typescript';
const root = resolve(import.meta.dirname, '..');
const iconSource = readFileSync(join(root, 'src/components/Icon.tsx'), 'utf8');
const names = new Set([...iconSource.matchAll(/^  "([^"]+)":/gm)].map(match => match[1]));
const errors = [];
function visitDir(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) { visitDir(path); continue; }
    if (!/\.[jt]sx$/.test(path)) continue;
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const bindings = new Map();
    source.statements.forEach(statement => {
      if (!ts.isImportDeclaration(statement)) return;
      const module = statement.moduleSpecifier.text;
      if (!module.endsWith('/Icon') && !module.endsWith('/ui/Primitives') && module !== './Primitives') return;
      for (const binding of statement.importClause?.namedBindings?.elements || []) {
        const name = binding.propertyName?.text || binding.name.text;
        if (['Icon', 'IconButton', 'Button', 'Chip', 'ListRow'].includes(name)) bindings.set(binding.name.text, name === 'Icon' ? 'name' : 'icon');
      }
    });
    function walk(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const attribute = bindings.get(node.tagName.getText(source));
        if (attribute) for (const prop of node.attributes.properties) {
          if (ts.isJsxAttribute(prop) && prop.name.getText(source) === attribute && prop.initializer && ts.isStringLiteral(prop.initializer) && !names.has(prop.initializer.text)) errors.push(`${path}: unknown icon ${prop.initializer.text}`);
        }
      }
      ts.forEachChild(node, walk);
    }
    walk(source);
  }
}
visitDir(join(root, 'app')); visitDir(join(root, 'src'));
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('✓ New design icon references resolve in JSX and TSX');
