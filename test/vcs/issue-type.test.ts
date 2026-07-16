/**
 * `issueType` is a field, not a title prefix (ADR 0026).
 *
 * "Epic" was a convention: three issues were epics because someone typed
 * `Epic:` at the front of a string, while twenty other issues had children and
 * were not called anything. You could not query for epics, could not enforce
 * that work rolls up to one, and a rename silently broke it.
 *
 * Same lesson ADR 0022 applied to zones — a name must not do the work of a type.
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TrellisVcsEngine } from '../../src/engine.js';
import { ISSUE_TYPES } from '../../src/vcs/types.js';

const TEST_ROOT = join(tmpdir(), 'trellis-issue-type');

describe('issueType (ADR 0026)', () => {
  let engine: TrellisVcsEngine;

  beforeEach(async () => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
    mkdirSync(TEST_ROOT, { recursive: true });
    engine = new TrellisVcsEngine({ rootPath: TEST_ROOT });
    await engine.initRepo();
    engine.setCheckpointThreshold(0);
  });

  afterEach(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  test('defaults to issue', async () => {
    const op = await engine.createIssue('A task');
    const id = op.vcs!.issueId!;
    expect(engine.getIssue(id)?.issueType).toBe('issue');
  });

  test('an epic is a type, not a title', async () => {
    const op = await engine.createIssue('Ship the thing', { issueType: 'epic' });
    const id = op.vcs!.issueId!;

    const issue = engine.getIssue(id);
    expect(issue?.issueType).toBe('epic');
    // The title carries no structural meaning.
    expect(issue?.title).toBe('Ship the thing');
  });

  // The query a title prefix could never support.
  test('epics are queryable', async () => {
    await engine.createIssue('Epic: legacy naming', { issueType: 'issue' });
    const e = await engine.createIssue('Marketing', { issueType: 'epic' });
    await engine.createIssue('A leaf');

    const epics = engine.listIssues({ issueType: 'epic' });

    expect(epics).toHaveLength(1);
    expect(epics[0]!.id).toBe(e.vcs!.issueId!);
    // Crucially: the issue TITLED "Epic:" is not one. The convention is dead.
    expect(epics[0]!.title).toBe('Marketing');
  });

  test('a leaf walks to its epic — telos becomes a graph walk', async () => {
    const epic = await engine.createIssue('Licensing', { issueType: 'epic' });
    const epicId = epic.vcs!.issueId!;
    const leaf = await engine.createIssue('Pick a license', { parentId: epicId });
    const leafId = leaf.vcs!.issueId!;

    // An agent holding only the leaf can find out why the work exists.
    const parentId = engine.getIssue(leafId)!.parentId;
    expect(parentId).toBe(epicId);
    expect(engine.getIssue(parentId!)?.issueType).toBe('epic');
  });

  test('changing type leaves exactly one issueType fact', async () => {
    const op = await engine.createIssue('Was a task');
    const id = op.vcs!.issueId!;

    await engine.updateIssue(id, { issueType: 'epic' });

    // Bounded domain ⇒ decompose enumerates and deletes every prior value, so
    // the register cannot degrade into an append log read by array position
    // (ADR 0022 §2).
    const facts = engine
      .getEavStore()
      .getFactsByEntity(`issue:${id}`)
      .filter((f) => f.a === 'issueType');
    expect(facts).toHaveLength(1);
    expect(engine.getIssue(id)?.issueType).toBe('epic');
  });

  test('every declared type round-trips', async () => {
    for (const t of ISSUE_TYPES) {
      const op = await engine.createIssue(`a ${t}`, { issueType: t });
      expect(engine.getIssue(op.vcs!.issueId!)?.issueType).toBe(t);
    }
  });
});
