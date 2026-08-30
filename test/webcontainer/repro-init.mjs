#!/usr/bin/env node
/**
 * Local stand-in for WebContainer boot + trellis init.
 * Mirrors host-vendored node_modules + iroh stub (no npm install).
 */
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const trellisRoot = join(here, '../..');

const PACKAGE_JSON = {
  name: 'trellis-wc-sandbox',
  version: '0.0.0',
  private: true,
  type: 'module',
  bin: { trellis: './bin/trellis.mjs' },
  dependencies: {
    'sql.js': '^1.14.1',
    commander: '^13.1.0',
    chalk: '^5.4.1',
    '@inquirer/prompts': '^8.2.2',
    zod: '3',
    ws: '^8.20.1',
    uqr: '^0.1.3',
  },
};

const TEXT_EXTS = new Set(['.js', '.mjs', '.cjs', '.json', '.map', '.css', '.html', '.txt', '.md']);
const BINARY_EXTS = new Set(['.wasm']);

function resolvePkgDir(name) {
  const entry = require.resolve(name, { paths: [trellisRoot] });
  let dir = dirname(entry);
  while (dir !== dirname(dir)) {
    const pkgPath = join(dir, 'package.json');
    if (!require('fs').existsSync(pkgPath)) {
      dir = dirname(dir);
      continue;
    }
    const pkg = JSON.parse(require('fs').readFileSync(pkgPath, 'utf8'));
    if (pkg.name === name) return dir;
    dir = dirname(dir);
  }
  throw new Error(`Could not resolve ${name}`);
}

function copyPackage(name, destRoot, seen = new Set()) {
  if (seen.has(name)) return;
  seen.add(name);
  const pkgDir = resolvePkgDir(name);
  const destDir = join(destRoot, 'node_modules', name);
  mkdirSync(destDir, { recursive: true });
  cpSync(pkgDir, destDir, { recursive: true, filter: (src) => !src.includes(`${name}/node_modules`) });
  const pkg = JSON.parse(require('fs').readFileSync(join(pkgDir, 'package.json'), 'utf8'));
  for (const dep of Object.keys(pkg.dependencies ?? {})) {
    copyPackage(dep, destRoot, seen);
  }
}

const dir = mkdtempSync(join(tmpdir(), 'wc-init-'));
try {
  mkdirSync(join(dir, 'bin'), { recursive: true });
  cpSync(join(trellisRoot, 'bin/trellis.mjs'), join(dir, 'bin/trellis.mjs'));
  cpSync(join(trellisRoot, 'dist'), join(dir, 'dist'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify(PACKAGE_JSON, null, 2));

  for (const dep of Object.keys(PACKAGE_JSON.dependencies)) {
    copyPackage(dep, dir);
  }
  cpSync(join(here, 'stubs/number0-iroh'), join(dir, 'node_modules/@number0/iroh'), { recursive: true });

  const init = spawnSync(
    process.execPath,
    [
      'bin/trellis.mjs',
      'init',
      '--no-interactive',
      '--identity',
      'skip',
      '--framework',
      'node',
    ],
    { cwd: dir, encoding: 'utf8' },
  );
  console.log('init exit:', init.status);
  if (init.stdout) console.log(init.stdout);
  if (init.stderr) console.error(init.stderr);
  process.exit(init.status ?? 1);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
