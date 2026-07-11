#!/usr/bin/env node
/**
 * Copy kernel artifacts to downstream repos per docs/kernel-touch-manifest.json.
 *
 * Usage:
 *   node scripts/sync-downstream.mjs
 *   node scripts/sync-downstream.mjs --check   # verify only, no copies
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(
  readFileSync(join(repoRoot, 'docs/kernel-touch-manifest.json'), 'utf8'),
);
const checkOnly = process.argv.includes('--check');

let failed = 0;

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}
function fail(msg) {
  console.error(`  ✗ ${msg}`);
  failed += 1;
}

function expandPath(p) {
  if (p.startsWith('~/')) return join(homedir(), p.slice(2));
  return resolve(repoRoot, p);
}

function getNested(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function globPackageJsons(base, globPattern) {
  const dir = dirname(globPattern);
  const fullDir = join(base, dir);
  if (!existsSync(fullDir)) return [];
  return readdirSync(fullDir)
    .filter((name) => name === 'package.json' || existsSync(join(fullDir, name, 'package.json')))
    .flatMap((name) => {
      if (name === 'package.json') return [join(fullDir, name)];
      const pkg = join(fullDir, name, 'package.json');
      return existsSync(pkg) ? [pkg] : [];
    });
}

console.log(`Sync downstream (kernel ${manifest.version})\n`);

for (const consumer of manifest.consumers) {
  const base = expandPath(consumer.path);
  console.log(`${consumer.id} (${base})`);

  if (!existsSync(base) && consumer.id !== 'cursor-global') {
    fail(`path missing: ${base}`);
    continue;
  }

  for (const item of consumer.sync ?? []) {
    const src = join(repoRoot, item.from);
    const dest = join(base, item.to);
    if (!existsSync(src)) {
      fail(`source missing: ${item.from}`);
      continue;
    }
    if (checkOnly) {
      if (!existsSync(dest)) {
        fail(`dest missing: ${item.to}`);
        continue;
      }
      const a = readFileSync(src, 'utf8');
      const b = readFileSync(dest, 'utf8');
      if (a !== b) fail(`drift: ${item.to}`);
      else ok(`in sync: ${item.to}`);
      continue;
    }
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    ok(`copied → ${item.to}`);
  }

  for (const pin of consumer.pins ?? []) {
    const parent = join(base, dirname(pin.glob));
    const templateDir = dirname(pin.glob).split('/')[0];
    const templatesRoot = join(base, templateDir);
    if (!existsSync(templatesRoot)) {
      fail(`templates dir missing for pins`);
      continue;
    }
    for (const entry of readdirSync(templatesRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const pkgPath = join(templatesRoot, entry.name, 'package.json');
      if (!existsSync(pkgPath)) continue;
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      const val = getNested(pkg, pin.field);
      if (val !== pin.expect) {
        if (checkOnly) fail(`${entry.name}: ${pin.field}=${val} (want ${pin.expect})`);
        else {
          pkg.dependencies = pkg.dependencies ?? {};
          pkg.dependencies.trellis = pin.expect;
          writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
          ok(`pinned ${entry.name} → ${pin.expect}`);
        }
      } else {
        ok(`${entry.name} pin OK`);
      }
    }
  }

  if (consumer.packageVersion && !checkOnly) {
    const pkgPath = join(base, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (pkg.version !== consumer.packageVersion) {
        pkg.version = consumer.packageVersion;
        if (pkg.engines) pkg.engines.node = '>=20';
        writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
        ok(`package.json → ${consumer.packageVersion}`);
      }
    }
  }

  console.log('');
}

if (failed) {
  console.error(`\n${failed} issue(s)`);
  process.exit(1);
}
console.log('Downstream sync OK');
