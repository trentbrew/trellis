import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  formatProfileContextText,
  profileContextStats,
  resolveProfileContextArm,
  saveProfile,
  type UserProfile,
} from '../../src/scaffold/profile.js';

describe('profile context formatter', () => {
  const originalHome = process.env.HOME;
  const originalArm = process.env.TRELLIS_PROFILE_CONTEXT_ARM;
  let home: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'profile-ctx-'));
    process.env.HOME = home;
  });

  afterEach(() => {
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    if (originalArm === undefined) delete process.env.TRELLIS_PROFILE_CONTEXT_ARM;
    else process.env.TRELLIS_PROFILE_CONTEXT_ARM = originalArm;
    if (existsSync(home)) rmSync(home, { recursive: true, force: true });
  });

  const base: UserProfile = {
    name: 'Trent',
    bio: 'Builder',
    skills: ['TypeScript'],
    style: 'minimal',
    preferences: { verbosity: 'concise', tone: 'peer' },
    learnings: [
      {
        id: 'a1',
        fact: 'Prefers small diffs',
        category: 'style',
        addedAt: '2026-09-23T00:00:00.000Z',
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('formatProfileContextText respects budget', () => {
    const text = formatProfileContextText(base, { budgetChars: 80 });
    expect(text.length).toBeLessThanOrEqual(80);
    expect(text).toContain('Trent');
  });

  it('profileContextStats reports learnings count', () => {
    saveProfile(base);
    const stats = profileContextStats(base);
    expect(stats.learningsCount).toBe(1);
    expect(stats.chars).toBeGreaterThan(0);
  });

  it('resolveProfileContextArm reads env', () => {
    process.env.TRELLIS_PROFILE_CONTEXT_ARM = 'session';
    expect(resolveProfileContextArm()).toBe('session');
    process.env.TRELLIS_PROFILE_CONTEXT_ARM = 'invalid';
    expect(resolveProfileContextArm()).toBe('off');
  });
});
