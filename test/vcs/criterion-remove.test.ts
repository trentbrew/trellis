/**
 * Criterion removal (TRL-1).
 *
 * Removal is a tombstone, not an erasure. That is not a stylistic choice:
 * `addCriterion` mints ids as `ac-${count + 1}`, so if a removal deleted the
 * criterion entity, the count would drop and a later add would mint the id of
 * a *surviving* criterion — remove ac-2 of 3, add one, and the new criterion
 * lands on ac-3, merging its facts into the existing ac-3.
 *
 * The middle-removal test below is the one that fails under a naive
 * implementation. It is TRL-1's AC#4.
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import { verifyVcsOpHash } from '../../src/vcs/ops.js';

const TEST_ROOT = join(tmpdir(), 'trellis-criterion-remove');

describe('criterion removal', () => {
  let engine: TrellisVcsEngine;
  let issueId: string;

  beforeEach(async () => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    mkdirSync(TEST_ROOT, { recursive: true });
    engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo();
    engine.setCheckpointThreshold(0);

    const op = await engine.createIssue('Test issue');
    issueId = op.vcs!.issueId!;
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  const criteria = () => engine.getIssue(issueId)!.criteria;
  const descriptions = () => criteria().map((c) => c.description);

  test('removed criterion disappears from the issue', async () => {
    await engine.addCriterion(issueId, 'first');
    await engine.addCriterion(issueId, 'second');
    expect(descriptions()).toEqual(['first', 'second']);

    await engine.removeCriterion(issueId, 1);

    expect(descriptions()).toEqual(['second']);
  });

  // TRL-1 AC#4 — the collision case.
  test('removing a MIDDLE criterion does not corrupt later additions', async () => {
    await engine.addCriterion(issueId, 'one');
    await engine.addCriterion(issueId, 'two');
    await engine.addCriterion(issueId, 'three');

    const thirdId = criteria()[2]!.id;

    await engine.removeCriterion(issueId, 2); // drop "two"
    expect(descriptions()).toEqual(['one', 'three']);

    await engine.addCriterion(issueId, 'four');

    // Under a naive delete, `four` would mint ac-3 and merge into `three`.
    expect(descriptions()).toEqual(['one', 'three', 'four']);

    const ids = criteria().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length); // no id reuse
    expect(criteria().find((c) => c.description === 'four')!.id).not.toBe(
      thirdId,
    );
  });

  test('removing the LAST criterion does not corrupt later additions', async () => {
    await engine.addCriterion(issueId, 'one');
    await engine.addCriterion(issueId, 'two');
    const secondId = criteria()[1]!.id;

    await engine.removeCriterion(issueId, 2);
    expect(descriptions()).toEqual(['one']);

    await engine.addCriterion(issueId, 'three');

    expect(descriptions()).toEqual(['one', 'three']);
    expect(criteria().find((c) => c.description === 'three')!.id).not.toBe(
      secondId,
    );
  });

  test('removing every criterion then adding still does not reuse ids', async () => {
    await engine.addCriterion(issueId, 'a');
    await engine.addCriterion(issueId, 'b');
    const originals = criteria().map((c) => c.id);

    await engine.removeCriterion(issueId, 1);
    await engine.removeCriterion(issueId, 1); // list shrinks; index 1 again
    expect(criteria()).toEqual([]);

    await engine.addCriterion(issueId, 'c');
    expect(descriptions()).toEqual(['c']);
    expect(originals).not.toContain(criteria()[0]!.id);
  });

  test('indices address the live list after a removal', async () => {
    await engine.addCriterion(issueId, 'one');
    await engine.addCriterion(issueId, 'two');
    await engine.addCriterion(issueId, 'three');

    await engine.removeCriterion(issueId, 1); // live list: two, three

    await engine.setCriterionStatus(issueId, 1, 'passed');

    expect(criteria().find((c) => c.description === 'two')!.status).toBe(
      'passed',
    );
    expect(criteria().find((c) => c.description === 'three')!.status).toBe(
      'pending',
    );
  });

  test('rejects an out-of-range index', async () => {
    await engine.addCriterion(issueId, 'only');

    await expect(engine.removeCriterion(issueId, 2)).rejects.toThrow(
      /out of range/,
    );
    await expect(engine.removeCriterion(issueId, 0)).rejects.toThrow(
      /out of range/,
    );
  });

  // TRL-1 AC#1 — retraction must not rewrite history.
  test('rewrites no existing op, and the removal op verifies', async () => {
    await engine.addCriterion(issueId, 'one');
    await engine.addCriterion(issueId, 'two');

    const before = engine.getOps().map((o) => o.hash);

    const op = await engine.removeCriterion(issueId, 1);

    const after = engine.getOps();

    // The point of AC#1: nothing already in the log is rewritten. Removal is
    // purely additive. It appends `vcs:criterionRemove` plus the engine's usual
    // `vcs:branchAdvance` (engine.ts:2628), so the count grows by more than one.
    expect(after.map((o) => o.hash).slice(0, before.length)).toEqual(before);
    expect(after.length).toBeGreaterThan(before.length);
    expect(after.map((o) => o.kind)).toContain('vcs:criterionRemove');
    expect(await verifyVcsOpHash(op)).toBe(true);
  });
});
