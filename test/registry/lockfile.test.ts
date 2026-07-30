import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import {
  computeContentHash,
  createLockfile,
  addToLockfile,
  removeFromLockfile,
  findDependents,
  readLockfile,
  writeLockfile,
  validateLockfile,
} from '../../src/registry/lockfile.js';

describe('computeContentHash', () => {
  it('produces sha256 hash for JSON body', () => {
    const hash = computeContentHash('{"a":1,"b":2}');
    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('normalizes key order', () => {
    expect(computeContentHash('{"b":2,"a":1}')).toBe(computeContentHash('{"a":1,"b":2}'));
  });
});

describe('createLockfile', () => {
  it('creates empty lockfile', () => {
    const lf = createLockfile();
    expect(lf.version).toBe(1);
    expect(lf.lockfileVersion).toBe('1.0.0');
    expect(lf.resolved).toEqual({});
    expect(lf.root.depends).toEqual({});
  });
});

describe('addToLockfile / removeFromLockfile', () => {
  it('adds and removes a package', () => {
    const lf = createLockfile();
    const pkg = {
      name: '@trellis.computer/agents/test',
      version: '1.0.0',
      content: 'sha256:abc',
      revision: 'refs/tags/v1.0.0',
      schemas: [
        { '@id': 'trellis:test', version: '1.0.0', content: 'sha256:def' },
      ],
    };

    addToLockfile(lf, pkg);
    expect(lf.resolved['@trellis.computer/agents/test']).toBeDefined();
    expect(lf.resolved['@trellis.computer/agents/test'].version).toBe('1.0.0');

    expect(removeFromLockfile(lf, '@trellis.computer/agents/test')).toBe(true);
    expect(lf.resolved['@trellis.computer/agents/test']).toBeUndefined();

    expect(removeFromLockfile(lf, 'nonexistent')).toBe(false);
  });
});

describe('findDependents', () => {
  it('finds packages that share schema IDs', () => {
    const lf = createLockfile();
    addToLockfile(lf, {
      name: '@trellis.computer/agents/a',
      version: '1.0.0',
      content: 'sha256:a',
      revision: 'refs/tags/v1.0.0',
      schemas: [{ '@id': 'trellis:alpha', version: '1.0.0', content: 'sha256:x' }],
    });
    addToLockfile(lf, {
      name: '@trellis.computer/agents/b',
      version: '1.0.0',
      content: 'sha256:b',
      revision: 'refs/tags/v1.0.0',
      schemas: [{ '@id': 'trellis:alpha', version: '1.0.0', content: 'sha256:x' }],
    });
    addToLockfile(lf, {
      name: '@trellis.computer/agents/c',
      version: '1.0.0',
      content: 'sha256:c',
      revision: 'refs/tags/v1.0.0',
      schemas: [{ '@id': 'trellis:gamma', version: '1.0.0', content: 'sha256:z' }],
    });

    const deps = findDependents(lf, '@trellis.computer/agents/a');
    expect(deps).toContain('@trellis.computer/agents/b');
    expect(deps).not.toContain('@trellis.computer/agents/c');
  });

  it('returns empty for nonexistent package', () => {
    const lf = createLockfile();
    expect(findDependents(lf, 'nonexistent')).toEqual([]);
  });
});

describe('readLockfile / writeLockfile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'trellis-lockfile-test-' + randomUUID());
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes and reads lockfile', () => {
    const lf = createLockfile();
    addToLockfile(lf, {
      name: '@trellis.computer/agents/test',
      version: '1.0.0',
      content: 'sha256:abc',
      revision: 'refs/tags/v1.0.0',
      schemas: [{ '@id': 'trellis:test', version: '1.0.0', content: 'sha256:def' }],
    });

    writeLockfile(tmpDir, lf);
    expect(existsSync(join(tmpDir, '.trellis', 'deps.json'))).toBe(true);

    const loaded = readLockfile(tmpDir)!;
    expect(loaded.resolved['@trellis.computer/agents/test'].version).toBe('1.0.0');
  });

  it('returns null when no lockfile exists', () => {
    expect(readLockfile(tmpDir)).toBeNull();
  });

  it('uses atomic write (no .tmp file after write)', () => {
    const lf = createLockfile();
    writeLockfile(tmpDir, lf);
    expect(existsSync(join(tmpDir, '.trellis', 'deps.json.tmp'))).toBe(false);
    expect(existsSync(join(tmpDir, '.trellis', 'deps.json'))).toBe(true);
  });
});

describe('validateLockfile', () => {
  it('validates a valid lockfile', () => {
    const data = {
      version: 1,
      lockfileVersion: '1.0.0',
      resolved: {},
      root: { depends: {} },
    };
    expect(() => validateLockfile(data)).not.toThrow();
  });

  it('rejects invalid version', () => {
    expect(() => validateLockfile({ version: 2, lockfileVersion: '1.0.0', resolved: {}, root: { depends: {} } })).toThrow();
  });

  it('rejects null data', () => {
    expect(() => validateLockfile(null)).toThrow();
  });
});
