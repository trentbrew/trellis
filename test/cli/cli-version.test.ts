import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { cliVersion } from '../../src/cli/repo-path.js';

describe('cliVersion', () => {
  it('reports the trellis package version, not a fallback', () => {
    const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '../../package.json'), 'utf8'));
    expect(cliVersion()).toBe(pkg.version);
    expect(cliVersion()).not.toBe('0.0.0');
  });
});
