#!/usr/bin/env node
// Lockstep version bump for all Blueprint packages.
//
// Usage:
//   node scripts/bump-version.mjs           # bump patch on all packages (0.0.1 -> 0.0.2)
//   node scripts/bump-version.mjs 0.0.1     # set all packages to an explicit version
//
// Pre-launch policy: Blueprint ships only to GitHub (nothing on npm), so every
// push bumps the patch as an audit marker. Switch to semantic bumps once these
// packages are published to a registry and consumers rely on the semver contract.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const TARGETS = [
  'packages/blueprint-core/package.json',
  'packages/blueprint-runtime/package.json',
  'packages/blueprint-tw/package.json',
  'packages/blueprint-mui/package.json',
  'packages/blueprint/package.json',
  'apps/builder/package.json',
];

function read(rel) {
  return JSON.parse(readFileSync(join(root, rel), 'utf8'));
}

const explicit = process.argv[2];

let next;
if (explicit) {
  if (!/^\d+\.\d+\.\d+$/.test(explicit)) {
    console.error(`Invalid version "${explicit}" — expected x.y.z`);
    process.exit(1);
  }
  next = explicit;
} else {
  // Bump the patch off the highest current version so the set stays lockstep.
  const versions = TARGETS.map((rel) => read(rel).version);
  const max = versions
    .map((v) => v.split('.').map(Number))
    .sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2])[0];
  next = `${max[0]}.${max[1]}.${max[2] + 1}`;
}

for (const rel of TARGETS) {
  const pkg = read(rel);
  const prev = pkg.version;
  pkg.version = next;
  writeFileSync(join(root, rel), JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  ${pkg.name}: ${prev} -> ${next}`);
}

console.log(`\nAll Blueprint packages set to ${next}`);
