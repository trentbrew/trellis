import { mkdtempSync, readFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  appendLearning,
  formatLearningsMarkdown,
  getProfile,
  loadProfile,
  MAX_PROFILE_LEARNINGS,
  removeLearning,
  saveProfile,
  setProfileFields,
  type UserProfile,
} from '../../src/scaffold/profile.js';
import { writeAgentScaffold } from '../../src/scaffold/write.js';
import type { ProjectContext } from '../../src/scaffold/infer.js';

describe('profile learnings', () => {
  const originalHome = process.env.HOME;
  let home: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'profile-test-'));
    process.env.HOME = home;
  });

  afterEach(() => {
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    if (existsSync(home)) rmSync(home, { recursive: true, force: true });
  });

  const baseProfile: UserProfile = {
    name: 'Trent',
    bio: 'Builder',
    skills: ['TypeScript'],
    style: 'minimal',
    preferences: { verbosity: 'concise', tone: 'peer' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('getProfile defaults missing learnings to []', () => {
    saveProfile({ ...baseProfile });
    expect(getProfile()?.learnings).toEqual([]);
  });

  it('appendLearning persists and dedupes by normalized fact', () => {
    saveProfile({ ...baseProfile });
    appendLearning({ fact: 'Prefers concise reviews', category: 'preference' });
    appendLearning({ fact: '  prefers concise reviews  ' });
    const profile = getProfile();
    expect(profile?.learnings).toHaveLength(1);
    expect(profile?.learnings?.[0].fact).toBe('Prefers concise reviews');
    expect(profile?.learnings?.[0].category).toBe('preference');
  });

  it('removeLearning deletes by id', () => {
    saveProfile({ ...baseProfile });
    appendLearning({ fact: 'First fact' });
    const id = getProfile()?.learnings?.[0].id;
    expect(id).toBeTruthy();
    removeLearning(id!);
    expect(getProfile()?.learnings).toHaveLength(0);
  });

  it('caps learnings at MAX_PROFILE_LEARNINGS', () => {
    saveProfile({ ...baseProfile, learnings: [] });
    for (let i = 0; i < MAX_PROFILE_LEARNINGS + 5; i++) {
      appendLearning({ fact: `fact number ${i}` });
    }
    expect(getProfile()?.learnings).toHaveLength(MAX_PROFILE_LEARNINGS);
    expect(getProfile()?.learnings?.[0].fact).toBe('fact number 5');
  });

  it('setProfileFields updates core fields without touching learnings', () => {
    saveProfile({ ...baseProfile });
    appendLearning({ fact: 'Keep me' });
    setProfileFields({ bio: 'Updated bio' });
    const profile = loadProfile();
    expect(profile?.bio).toBe('Updated bio');
    expect(profile?.learnings).toHaveLength(1);
  });

  it('formatLearningsMarkdown renders recent learnings', () => {
    const md = formatLearningsMarkdown({
      ...baseProfile,
      learnings: [
        {
          id: 'abc',
          fact: 'Avoid drive-by refactors',
          category: 'style',
          addedAt: '2026-09-23T12:00:00.000Z',
        },
      ],
    });
    expect(md).toContain('## Learned Context');
    expect(md).toContain('[style] Avoid drive-by refactors');
    expect(md).toContain('2026-09-23');
  });

  it('writeAgentScaffold injects learnings into AGENTS.md', () => {
    const repo = mkdtempSync(join(tmpdir(), 'profile-scaffold-'));
    mkdirSync(join(repo, '.trellis'), { recursive: true });
    const profile = {
      ...baseProfile,
      learnings: [
        {
          id: 'x1',
          fact: 'Ship small diffs',
          category: 'preference' as const,
          addedAt: '2026-09-23T00:00:00.000Z',
        },
      ],
    };
    const context: ProjectContext = {
      domain: 'devtools',
      description: 'test',
      ecosystem: 'bun',
      framework: 'none',
      name: 'test-repo',
      fileCount: 1,
      confidence: 'high',
      indicators: [],
    };
    writeAgentScaffold(repo, { profile, context });
    const agentsMd = readFileSync(join(repo, '.trellis', 'agents', 'AGENTS.md'), 'utf-8');
    expect(agentsMd).toContain('## Learned Context');
    expect(agentsMd).toContain('Ship small diffs');
    rmSync(repo, { recursive: true, force: true });
  });
});
