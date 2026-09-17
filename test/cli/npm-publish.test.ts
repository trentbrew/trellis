import { describe, test, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const pkg = JSON.parse(
  readFileSync(join(import.meta.dirname, '../../package.json'), 'utf8'),
);

describe('npm publish manifest', () => {
  test('runtime deps have no file/link/workspace specifiers', () => {
    const runtimeFields = ['dependencies', 'optionalDependencies', 'peerDependencies'];
    const bad: string[] = [];

    for (const field of runtimeFields) {
      const deps = pkg[field];
      if (!deps || typeof deps !== 'object') continue;
      for (const [name, version] of Object.entries(deps)) {
        if (
          typeof version === 'string' &&
          (version.startsWith('file:') ||
            version.startsWith('link:') ||
            version.startsWith('workspace:'))
        ) {
          bad.push(`${field}.${name} = ${version}`);
        }
      }
    }

    expect(bad, 'move build-time deps to devDependencies and vendor into dist').toEqual([]);
  });

  test('admin UI bundle is vendored in the repo, not a local file: dependency', () => {
    // A file:../trellis-ui dependency only resolves on a machine with that
    // sibling checkout, so every CI install failed. The built bundle lives in
    // src/ui/@trellis.computer/ui/dist (refresh with `npm run sync:ui`).
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      expect(pkg[field]?.['@trellis.computer/ui']).toBeUndefined();
    }
    const vendored = join(import.meta.dirname, '../../src/ui/@trellis.computer/ui/dist');
    expect(existsSync(join(vendored, 'index.mjs'))).toBe(true);
    expect(existsSync(join(vendored, 'signal-utils.mjs'))).toBe(true);
    expect(pkg.scripts.build).toContain('cp src/ui/@trellis.computer/ui/dist/*.mjs');
  });
});
