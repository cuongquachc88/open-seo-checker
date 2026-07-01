#!/usr/bin/env node
// Updates version in the three package.json files that must stay in sync:
//   package.json, packages/api/package.json, packages/web/package.json
//
// Usage:
//   pnpm version:bump 0.2.0
//   node scripts/version-bump.mjs 0.2.0
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+/.test(version)) {
  console.error('Usage: pnpm version:bump <semver>   e.g.  pnpm version:bump 0.2.0');
  process.exit(1);
}

const targets = [
  'package.json',
  'packages/api/package.json',
  'packages/web/package.json',
];

for (const rel of targets) {
  const file = resolve(root, rel);
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  const prev = pkg.version;
  pkg.version = version;
  writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  ${rel}: ${prev} → ${version}`);
}

console.log(`\nDone. Next steps:`);
console.log(`  git add package.json packages/api/package.json packages/web/package.json`);
console.log(`  git commit -m "chore: bump version to ${version}"`);
console.log(`  git tag v${version} && git push origin main --tags`);
