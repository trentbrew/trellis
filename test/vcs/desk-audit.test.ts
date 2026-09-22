import { describe, expect, test } from 'vitest';
import {
  buildBriefingLine,
  buildRecommendations,
  deskAuditExitCode,
  groupPathsByTheme,
  themeKeyForPath,
  type DeskAuditGit,
  type DeskAuditTrellis,
} from '../../src/vcs/desk-audit.js';

describe('desk audit themes', () => {
  test('themeKeyForPath buckets src and packages', () => {
    expect(themeKeyForPath('src/vcs/issue.ts')).toBe('src/vcs');
    expect(themeKeyForPath('mcpkit/src/host.ts')).toBe('mcpkit');
    expect(themeKeyForPath('docs/adr/0042.md')).toBe('docs/adr');
    expect(themeKeyForPath('test/blobs/tier.test.ts')).toBe('test/blobs');
  });

  test('groupPathsByTheme merges and sorts', () => {
    const themes = groupPathsByTheme([
      'src/blobs/tier.ts',
      'src/vcs/issue.ts',
      'src/blobs/memory.ts',
    ]);
    expect(themes.map((t) => t.key)).toEqual(['src/blobs', 'src/vcs']);
    expect(themes[0].files).toHaveLength(2);
  });
});

describe('desk audit helpers', () => {
  const cleanGit: DeskAuditGit = {
    branch: 'main',
    upstream: 'origin/main',
    ahead: 0,
    behind: 0,
    unpushedCommits: [],
    staged: [],
    unstaged: [],
    untracked: [],
    dirtyFileCount: 0,
    themes: [],
  };

  const trellisOk: DeskAuditTrellis = {
    branch: 'main',
    totalOps: 1,
    activeLaneId: 'lane-1',
    laneIssueId: 'issue:TRL-1',
    laneOpCount: 2,
    laneSuggestSplit: false,
    laneSplitReason: null,
    activeIssueCount: 1,
    activeIssueIds: ['TRL-1'],
  };

  test('exit codes', () => {
    expect(deskAuditExitCode(cleanGit)).toBe(0);
    expect(deskAuditExitCode({ ...cleanGit, ahead: 1, unpushedCommits: [{ hash: 'a', subject: 'x' }] })).toBe(2);
    expect(deskAuditExitCode({ ...cleanGit, dirtyFileCount: 1, unstaged: ['a.ts'], themes: [{ key: 'a.ts', files: ['a.ts'] }] })).toBe(1);
  });

  test('briefing line', () => {
    expect(buildBriefingLine(cleanGit)).toContain('clean');
    const dirty = {
      ...cleanGit,
      dirtyFileCount: 2,
      unstaged: ['src/vcs/a.ts', 'mcpkit/b.ts'],
      themes: groupPathsByTheme(['src/vcs/a.ts', 'mcpkit/b.ts']),
    };
    expect(buildBriefingLine(dirty)).toMatch(/2 dirty/);
  });

  test('recommendations flag multi-theme and no lane', () => {
    const git: DeskAuditGit = {
      ...cleanGit,
      dirtyFileCount: 3,
      unstaged: ['a', 'b', 'c'],
      themes: [
        { key: 'src/vcs', files: ['a'] },
        { key: 'mcpkit', files: ['b'] },
        { key: 'src/blobs', files: ['c'] },
      ],
    };
    const recs = buildRecommendations(git, {
      ...trellisOk,
      activeLaneId: null,
      laneOpCount: null,
    });
    expect(recs.some((r) => r.includes('3 themes'))).toBe(true);
    expect(recs.some((r) => r.includes('No active lane'))).toBe(true);
  });
});
