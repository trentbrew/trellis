import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import fs from 'node:fs';
import os from 'node:os';

import {
  buildSandboxBootstrap,
  packNodeModules,
  resolveSandboxAssetsDir,
} from '../../src/wc/pack.js';

const trellisRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('wc pack', () => {
  it('resolves sandbox assets', () => {
    const assets = resolveSandboxAssetsDir(trellisRoot);
    expect(assets).toContain('wc');
    expect(assets).toMatch(/src\/wc\/assets$/);
  });

  // Regression: the published package has no `src/`, so resolution must fall
  // back to `dist/wc/assets`. This previously threw because the only fallback
  // was derived from `import.meta.url`, which esbuild hoists to `<pkg>/dist`.
  it('resolves assets from a published-package layout (no src/)', () => {
    const fake = fs.mkdtempSync(path.join(os.tmpdir(), 'trellis-pkg-'));
    try {
      const assetsDir = path.join(fake, 'dist/wc/assets');
      fs.mkdirSync(assetsDir, { recursive: true });
      fs.writeFileSync(path.join(assetsDir, 'index.html'), '<!doctype html>');
      expect(resolveSandboxAssetsDir(fake)).toBe(assetsDir);
    } finally {
      fs.rmSync(fake, { recursive: true, force: true });
    }
  });


  it('packs runtime node_modules with iroh stub and sql.js wasm', () => {
    const assets = resolveSandboxAssetsDir(trellisRoot);
    const files = packNodeModules(trellisRoot, path.join(assets, 'stubs'));
    const keys = Object.keys(files);
    expect(keys.some((k) => k.includes('node_modules/@number0/iroh/'))).toBe(true);
    expect(keys.some((k) => k.includes('node_modules/sql.js/') && k.endsWith('.wasm'))).toBe(
      true,
    );
    expect(keys.some((k) => k.startsWith('node_modules/commander/'))).toBe(true);
  });

  it('prunes unreachable sql.js build variants but keeps the wasm runtime', () => {
    const assets = resolveSandboxAssetsDir(trellisRoot);
    const keys = Object.keys(packNodeModules(trellisRoot, path.join(assets, 'stubs')));

    // Node resolves sql.js to dist/sql-wasm.js; the browser condition adds
    // dist/sql-wasm-browser.js. Both need their sibling .wasm.
    for (const required of [
      'node_modules/sql.js/dist/sql-wasm.js',
      'node_modules/sql.js/dist/sql-wasm.wasm',
      'node_modules/sql.js/dist/sql-wasm-browser.js',
      'node_modules/sql.js/dist/sql-wasm-browser.wasm',
      'node_modules/sql.js/package.json',
    ]) {
      expect(keys).toContain(required);
    }

    const sqlJs = keys.filter((k) => k.startsWith('node_modules/sql.js/'));
    expect(sqlJs.some((k) => k.includes('sql-asm'))).toBe(false);
    expect(sqlJs.some((k) => k.includes('-debug'))).toBe(false);
    expect(sqlJs.some((k) => k.includes('worker.'))).toBe(false);
  });

  it('honours prune: false', () => {
    const assets = resolveSandboxAssetsDir(trellisRoot);
    const keys = Object.keys(
      packNodeModules(trellisRoot, path.join(assets, 'stubs'), { prune: false }),
    );
    expect(keys).toContain('node_modules/sql.js/dist/sql-asm.js');
  });

  it('builds bootstrap when dist exists', () => {
    const bootstrap = buildSandboxBootstrap(trellisRoot);
    expect(bootstrap.version).toBeTruthy();
    expect(bootstrap.binTrellis).toContain('dist/cli/index.js');
    expect(Object.keys(bootstrap.dist).length).toBeGreaterThan(10);
    expect(Object.keys(bootstrap.nodeModules).length).toBeGreaterThan(100);
  });

  // Regression: the sandbox package.json hardcoded version "0.0.0", so
  // `trellis --version` inside the sandbox was unattributable to a release.
  it('stamps the real Trellis version into the sandbox package.json', () => {
    const bootstrap = buildSandboxBootstrap(trellisRoot);
    const pkgVersion = JSON.parse(
      fs.readFileSync(path.join(trellisRoot, 'package.json'), 'utf8'),
    ).version;
    expect(bootstrap.version).toBe(pkgVersion);
    expect(bootstrap.packageJson.version).toBe(pkgVersion);
    expect(bootstrap.packageJson.version).not.toBe('0.0.0');
  });

  it('omits sourcemaps by default and includes them on request', () => {
    const lean = buildSandboxBootstrap(trellisRoot);
    expect(Object.keys(lean.dist).some((k) => k.endsWith('.map'))).toBe(false);

    const mapped = buildSandboxBootstrap(trellisRoot, { sourcemaps: true });
    expect(Object.keys(mapped.dist).some((k) => k.endsWith('.map'))).toBe(true);
  });

  it('accepts a legacy positional assetsDir', () => {
    const assets = resolveSandboxAssetsDir(trellisRoot);
    const bootstrap = buildSandboxBootstrap(trellisRoot, assets);
    expect(Object.keys(bootstrap.nodeModules).length).toBeGreaterThan(100);
  });
});
