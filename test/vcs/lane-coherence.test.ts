/**
 * TRL-117 AC5 — lane coherence / domain-spread signal.
 */

import { describe, test, expect } from 'vitest';
import {
  analyzeLaneCoherence,
  inferReposFromPaths,
  partitionFileOpsByAffinity,
} from '../../src/vcs/lane-coherence.js';
import type { LaneMeta } from '../../src/vcs/lane.js';
import type { VcsOp } from '../../src/vcs/types.js';

let n = 0;
function fileOp(path: string, issueId?: string): VcsOp {
  n += 1;
  return {
    hash: `h${n}`,
    kind: 'vcs:fileModify',
    timestamp: new Date().toISOString(),
    agentId: 'agent:test',
    vcs: { filePath: path, contentHash: `c${n}`, issueId },
  } as VcsOp;
}

function meta(partial?: Partial<LaneMeta>): LaneMeta {
  return {
    id: 'lane-test',
    status: 'active',
    baseBranch: 'main',
    baseOpHash: 'base',
    targetBranch: 'main',
    agentId: 'agent:test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

describe('TRL-117 AC5 lane coherence', () => {
  test('partitionFileOpsByAffinity groups by directory overlap', () => {
    n = 0;
    const groups = partitionFileOpsByAffinity([
      fileOp('src/cli/lane.ts'),
      fileOp('src/cli/index.ts'),
      fileOp('docs/planning/lanes.md'),
      fileOp('docs/planning/other.md'),
    ]);
    expect(groups).toHaveLength(2);
  });

  test('analyzeLaneCoherence suggests split when domains diverge', () => {
    n = 0;
    const ops = [
      fileOp('src/auth/login.ts'),
      fileOp('src/auth/session.ts'),
      fileOp('docs/VISION.md'),
      fileOp('docs/ROADMAP.md'),
    ];
    const files = ops.map((o) => o.vcs!.filePath!);
    const report = analyzeLaneCoherence(meta({ name: 'catch-all' }), ops, files);

    expect(report.domainCount).toBeGreaterThan(1);
    expect(report.suggestSplit).toBe(true);
    expect(report.reason).toMatch(/split/i);
    expect(report.repoCount).toBe(1);
    expect(report.repos).toEqual(['.']);
  });

  test('single domain does not suggest split', () => {
    n = 0;
    const ops = [
      fileOp('src/cli/lane.ts'),
      fileOp('src/cli/doctor.ts'),
      fileOp('src/cli/index.ts'),
    ];
    const files = ops.map((o) => o.vcs!.filePath!);
    const report = analyzeLaneCoherence(meta({ name: 'cli' }), ops, files);

    expect(report.suggestSplit).toBe(false);
    expect(report.domainCount).toBe(1);
  });

  test('multi-issue journal suggests split', () => {
    n = 0;
    const ops = [
      fileOp('src/a.ts', 'TRL-1'),
      fileOp('src/b.ts', 'TRL-2'),
    ];
    // Same dir affinity → one group, but two issue intents
    const report = analyzeLaneCoherence(
      meta({ issueId: 'issue:TRL-1' }),
      ops,
      ['src/a.ts', 'src/b.ts'],
    );
    expect(report.suggestSplit).toBe(true);
    expect(report.reason).toMatch(/issues/i);
  });

  test('inferReposFromPaths detects parent and absolute repos', () => {
    expect(inferReposFromPaths(['src/a.ts', 'docs/b.md'])).toEqual(['.']);
    expect(
      inferReposFromPaths(['src/a.ts', '../studio/README.md']),
    ).toContain('../studio');
    expect(inferReposFromPaths(['/Users/me/repo/src/a.ts'])).not.toEqual([
      '.',
    ]);
  });
});
