import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { TrellisVcsEngine } from '../../src/engine.js';
import {
  assignLaneIndices,
  buildCausalGraphFromInputs,
  buildCausalGraphSnapshot,
  formatViewMeta,
} from '../../src/ui/causal-graph-snapshot.js';
import type { LaneMeta } from '../../src/vcs/lane.js';

function lane(partial: Partial<LaneMeta> & Pick<LaneMeta, 'id' | 'status'>): LaneMeta {
  return {
    baseBranch: 'main',
    baseOpHash: 'abc1234567890',
    targetBranch: 'issue/test',
    agentId: 'agent:test',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('buildCausalGraphFromInputs', () => {
  it('returns empty commits for fresh inputs', () => {
    const snap = buildCausalGraphFromInputs({
      integrationBranch: 'main',
      lanes: [],
      milestones: [],
    });
    expect(snap.commits).toEqual([]);
    expect(snap.stats.eventCount).toBe(0);
    expect(snap.stats.activeForkCount).toBe(0);
    expect(snap.activeLaneIds).toEqual([]);
    expect(snap.integrationBranch).toBe('main');
  });

  it('projects milestones, active head, and promoted merge nodes', () => {
    const lanes: LaneMeta[] = [
      lane({
        id: 'lane-a',
        status: 'active',
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
        headOpHash: 'deadbeef123456',
        targetBranch: 'issue/TRL-1',
      }),
      lane({
        id: 'lane-b',
        status: 'promoted',
        createdAt: '2026-01-04T00:00:00.000Z',
        updatedAt: '2026-01-05T00:00:00.000Z',
        headOpHash: 'cafebabecafeba',
      }),
    ];
    const snap = buildCausalGraphFromInputs({
      integrationBranch: 'main',
      lanes,
      milestones: [
        {
          id: 'milestone:ms-1',
          message: 'checkpoint',
          createdAt: '2026-01-01T12:00:00.000Z',
          toOpHash: '1111111111111',
          affectedFiles: [],
        },
      ],
    });

    const kinds = new Set(snap.commits.map((c) => c.kind));
    expect(kinds.has('milestone')).toBe(true);
    expect(kinds.has('head')).toBe(true);
    expect(kinds.has('promote')).toBe(true);

    const promote = snap.commits.find((c) => c.kind === 'promote');
    expect(promote?.lane).toBe(0);
    expect(snap.activeLaneIds).toEqual(['lane-a']);
    const activeHead = snap.commits.find((c) => c.kind === 'head' && c.laneId === 'lane-a');
    expect(activeHead?.active).toBe(true);
    expect(activeHead?.laneId).toBe('lane-a');
    expect(promote?.parents.length).toBeGreaterThanOrEqual(2);
    expect(promote?.branches).toEqual(['main']);
  });

  it('assigns child fork lane index greater than parent', () => {
    const lanes: LaneMeta[] = [
      lane({
        id: 'parent-lane',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
      lane({
        id: 'child-lane',
        status: 'active',
        parentLaneId: 'parent-lane',
        forkKind: 'child',
        createdAt: '2026-01-02T00:00:00.000Z',
      }),
    ];
    const cols = assignLaneIndices(lanes);
    expect(cols.get('parent-lane')).toBe(1);
    expect(cols.get('child-lane')).toBe(2);

    const snap = buildCausalGraphFromInputs({
      integrationBranch: 'main',
      lanes,
      milestones: [],
    });
    const childHead = snap.commits.find((c) => c.id === 'head:child-lane');
    const parentHead = snap.commits.find((c) => c.id === 'head:parent-lane');
    expect(childHead?.lane).toBeGreaterThan(parentHead?.lane ?? 0);
  });

  it('formatViewMeta matches design string shape', () => {
    expect(formatViewMeta({ eventCount: 7, activeForkCount: 1 }, 'main')).toBe(
      '7 events · 1 active fork · integration: main',
    );
    expect(formatViewMeta({ eventCount: 0, activeForkCount: 0 }, 'develop')).toBe(
      '0 events · 0 active forks · integration: develop',
    );
  });

  it('shortHash extracts hex from trellis:op: URIs', () => {
    const snap = buildCausalGraphFromInputs({
      integrationBranch: 'main',
      lanes: [
        lane({
          id: 'lane-x',
          status: 'active',
          headOpHash: 'trellis:op:cd58abb0dd25ce12bd06d481e29f2c0ca1b51a872d919c2cc334a4e52f1f179c',
        }),
      ],
      milestones: [],
    });
    expect(snap.commits[0].hash).toBe('cd58abb');
  });
});

describe('buildCausalGraphSnapshot', () => {
  let root: string;
  let engine: TrellisVcsEngine;

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'causal-graph-'));
    engine = new TrellisVcsEngine({ rootPath: root });
    await engine.initRepo({ indexWorkspace: false });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('builds from engine on empty repo', () => {
    const snap = buildCausalGraphSnapshot(engine);
    expect(snap.commits).toEqual([]);
    expect(snap.stats.eventCount).toBe(0);
    expect(snap.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
