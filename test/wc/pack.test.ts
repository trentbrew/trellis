import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

  it('builds bootstrap when dist exists', () => {
    const bootstrap = buildSandboxBootstrap(trellisRoot);
    expect(bootstrap.version).toBeTruthy();
    expect(bootstrap.binTrellis).toContain('dist/cli/index.js');
    expect(Object.keys(bootstrap.dist).length).toBeGreaterThan(10);
    expect(Object.keys(bootstrap.nodeModules).length).toBeGreaterThan(100);
  });
});
