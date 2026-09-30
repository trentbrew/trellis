import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { findTurtleAdminDir } from '../../src/cli/turtle-admin-dev.js';

describe('findTurtleAdminDir', () => {
  it('finds admin next to repo root', () => {
    const scope = mkdtempSync(join(tmpdir(), 'turtle-admin-find-'));
    const repo = join(scope, 'kernel');
    const admin = join(scope, 'admin');
    mkdirSync(repo, { recursive: true });
    mkdirSync(admin, { recursive: true });
    writeFileSync(join(admin, 'package.json'), JSON.stringify({ name: 'turtle-admin' }));

    expect(findTurtleAdminDir(repo)).toBe(admin);
  });

  it('finds admin inside repo root (desk layout)', () => {
    const desk = mkdtempSync(join(tmpdir(), 'turtle-admin-desk-'));
    const admin = join(desk, 'admin');
    mkdirSync(admin, { recursive: true });
    writeFileSync(join(admin, 'package.json'), JSON.stringify({ name: 'turtle-admin' }));

    expect(findTurtleAdminDir(desk)).toBe(admin);
  });
});
