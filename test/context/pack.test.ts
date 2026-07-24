/**
 * Budgeted context pack (TRL-127)
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import {
  assembleContextPack,
  clampPackToBudget,
  estimateTokens,
  serializePack,
} from '../../src/context/pack.js';
import {
  ContextPackFocusError,
  type ContextPack,
} from '../../src/context/types.js';
import { formatIssueDescription } from '../../src/protocol/envelope.js';

const TEST_ROOT = '/tmp/trellis-context-pack';

describe('assembleContextPack', () => {
  let engine: TrellisVcsEngine;

  beforeEach(async () => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    mkdirSync(TEST_ROOT, { recursive: true });
    engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo({ indexWorkspace: false });
    engine.setCheckpointThreshold(0);
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test('boot with no focus still succeeds (version 1, lane + waitingOnYou)', async () => {
    const pack = assembleContextPack(engine, {
      rootPath: TEST_ROOT,
      vantage: 'boot',
      budgetTokens: 4000,
    });

    expect(pack.version).toBe(1);
    expect(pack.vantage).toBe('boot');
    expect(pack.focus).toBeNull();
    expect(Array.isArray(pack.waitingOnYou)).toBe(true);
    expect(Array.isArray(pack.decisions)).toBe(true);
    expect(Array.isArray(pack.links)).toBe(true);
    expect(Array.isArray(pack.policyRefs)).toBe(true);
    expect(pack.lane.editRoot).toBeTruthy();
    expect(pack.estimatedTokens).toBeLessThanOrEqual(pack.budgetTokens);
    expect(pack.estimatedTokens).toBe(estimateTokens(serializePack(pack)));
  });

  test('edit without --issue and zero in_progress throws ContextPackFocusError', () => {
    expect(() =>
      assembleContextPack(engine, {
        rootPath: TEST_ROOT,
        vantage: 'edit',
        budgetTokens: 4000,
      }),
    ).toThrow(ContextPackFocusError);
  });

  test('edit without --issue and >1 in_progress throws', async () => {
    await engine.createIssue('A', { status: 'in_progress' });
    await engine.createIssue('B', { status: 'in_progress' });

    expect(() =>
      assembleContextPack(engine, {
        rootPath: TEST_ROOT,
        vantage: 'edit',
      }),
    ).toThrow(/requires --issue/);
  });

  test('edit with unique in_progress resolves focus + AC', async () => {
    const op = await engine.createIssue('Pack focus', {
      status: 'queue',
      description: 'See [[TRL-1]] and [[src/engine.ts]]',
      criteria: [
        { description: 'First criterion that is intentionally long enough to clip when over eighty characters of text' },
        { description: 'Second' },
      ],
    });
    const id = op.vcs!.issueId!;
    await engine.startIssue(id);

    const pack = assembleContextPack(engine, {
      rootPath: TEST_ROOT,
      vantage: 'edit',
      budgetTokens: 4000,
    });

    expect(pack.focus?.issueId).toBe(id);
    expect(pack.focus?.ac.length).toBeGreaterThanOrEqual(1);
    expect(pack.focus!.ac[0].description.length).toBeLessThanOrEqual(80);
    expect(pack.links.some((l) => l.id.includes('engine') || l.id.includes('TRL'))).toBe(
      true,
    );
  });

  test('clamp forces truncated and estimatedTokens <= budget', async () => {
    await engine.createIssue('Fat', {
      status: 'in_progress',
      description: '[[' + 'x/'.repeat(40) + 'file.ts]]',
      criteria: Array.from({ length: 20 }, (_, i) => ({
        description: `Criterion ${i} ` + 'word '.repeat(30),
      })),
    });
    await engine.createMilestone('A milestone with a fairly long message for packing');

    const fat = assembleContextPack(engine, {
      rootPath: TEST_ROOT,
      vantage: 'boot',
      budgetTokens: 50_000,
    });

    // Artificially inflate then clamp
    const inflated: ContextPack = {
      ...fat,
      waitingOnYou: Array.from({ length: 5 }, (_, i) => ({
        issueId: `TRL-W${i}`,
        from: 'executor',
        to: 'human',
        status: 'DECISION',
        re: `TRL-W${i}`,
        preview: 'preview '.repeat(20),
      })),
      decisions: Array.from({ length: 5 }, (_, i) => ({
        kind: 'decision' as const,
        id: `DEC-${i}`,
        summary: 'summary '.repeat(30),
      })),
      links: Array.from({ length: 12 }, (_, i) => ({
        kind: 'file' as const,
        id: `src/file-${i}.ts`,
        summary: 'link '.repeat(20),
      })),
      policyRefs: Array.from({ length: 4 }, (_, i) => ({
        kind: 'policy' as const,
        id: `policy:${i}`,
        summary: 'policy '.repeat(20),
      })),
    };

    const clamped = clampPackToBudget(inflated, 200);
    expect(clamped.truncated).toBe(true);
    expect(clamped.estimatedTokens).toBeLessThanOrEqual(200);
    expect(clamped.estimatedTokens).toBe(
      estimateTokens(serializePack(clamped)),
    );
  });

  test('waitingOnYou includes open decision children', async () => {
    const parent = await engine.createIssue('Parent', { status: 'queue' });
    const parentId = parent.vcs!.issueId!;

    await engine.createIssue('msg: DECISION', {
      parentId,
      labels: ['decision'],
      description: formatIssueDescription(
        {
          from: 'executor',
          to: 'human',
          re: parentId,
          status: 'DECISION',
          body: 'Ship or stack?',
        },
        'route',
      ),
      status: 'queue',
    });

    const pack = assembleContextPack(engine, {
      rootPath: TEST_ROOT,
      vantage: 'boot',
    });

    expect(pack.waitingOnYou.length).toBeGreaterThanOrEqual(1);
    expect(pack.waitingOnYou[0].status).toBe('DECISION');
  });
});

describe('spec doc present', () => {
  test('docs/specs/context-pack-v0.md exists in repo', () => {
    const repoRoot = join(import.meta.dirname, '../..');
    expect(existsSync(join(repoRoot, 'docs/specs/context-pack-v0.md'))).toBe(
      true,
    );
  });
});
