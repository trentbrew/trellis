import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
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

  test('@trellis.computer/ui is dev-only (admin UI is vendored into dist/ui)', () => {
    expect(pkg.dependencies?.['@trellis.computer/ui']).toBeUndefined();
    expect(pkg.devDependencies?.['@trellis.computer/ui']).toMatch(/^file:/);
  });
});
