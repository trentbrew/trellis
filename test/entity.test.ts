import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { TrellisVcsEngine } from '../src/engine.js';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DIR = '/tmp/trellis-entity-test';

function setupTestRepo() {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
  writeFileSync(join(TEST_DIR, 'src', 'a.ts'), 'export const a = 1;');
  writeFileSync(join(TEST_DIR, 'src', 'b.ts'), 'export const b = 2;');
}

async function initEngine(): Promise<TrellisVcsEngine> {
  const engine = new TrellisVcsEngine({ rootPath: TEST_DIR });
  await engine.initRepo();
  engine.open();
  return engine;
}

describe('Generic entity lifecycle', () => {
  beforeEach(() => setupTestRepo());
  afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  // ---------------------------------------------------------------------
  // Archive (generic, works on any entity)
  // ---------------------------------------------------------------------

  test('archiveEntity works on a file entity', async () => {
    const engine = await initEngine();

    expect(engine.isEntityArchived('file:src/a.ts')).toBe(false);

    const result = await engine.archiveEntity('file:src/a.ts');
    expect(result.op.kind).toBe('vcs:entityArchive');
    expect(result.op.vcs?.entityId).toBe('file:src/a.ts');
    expect(engine.isEntityArchived('file:src/a.ts')).toBe(true);
  });

  test('archiveEntity records reason when provided', async () => {
    const engine = await initEngine();

    const result = await engine.archiveEntity('file:src/a.ts', {
      reason: 'deprecated module',
    });

    expect(result.op.vcs?.archiveReason).toBe('deprecated module');
  });

  test('unarchiveEntity reverses archive', async () => {
    const engine = await initEngine();

    await engine.archiveEntity('file:src/a.ts');
    expect(engine.isEntityArchived('file:src/a.ts')).toBe(true);

    await engine.unarchiveEntity('file:src/a.ts');
    expect(engine.isEntityArchived('file:src/a.ts')).toBe(false);
  });

  test('archiveEntity throws on unknown entity', async () => {
    const engine = await initEngine();
    await expect(
      engine.archiveEntity('file:does/not/exist.ts'),
    ).rejects.toThrow('not found');
  });

  test('archiveEntity throws when already archived', async () => {
    const engine = await initEngine();
    await engine.archiveEntity('file:src/a.ts');
    await expect(engine.archiveEntity('file:src/a.ts')).rejects.toThrow(
      'already archived',
    );
  });

  test('archive cascades to children (Issue → Criteria)', async () => {
    const engine = await initEngine();

    const op = await engine.createIssue('With criteria', {
      criteria: [{ description: 'C1' }, { description: 'C2' }],
    });
    const issueEntityId = `issue:${op.vcs!.issueId!}`;

    const result = await engine.archiveEntity(issueEntityId);

    // Two criteria should have cascade-archived.
    expect(result.cascadedEntityIds.length).toBe(2);
    for (const childId of result.cascadedEntityIds) {
      expect(engine.isEntityArchived(childId)).toBe(true);
    }
  });

  test('unarchive restores cascaded children', async () => {
    const engine = await initEngine();

    const op = await engine.createIssue('Round trip', {
      criteria: [{ description: 'C1' }],
    });
    const issueEntityId = `issue:${op.vcs!.issueId!}`;

    const archiveResult = await engine.archiveEntity(issueEntityId);
    const childId = archiveResult.cascadedEntityIds[0];
    expect(engine.isEntityArchived(childId)).toBe(true);

    await engine.unarchiveEntity(issueEntityId);
    expect(engine.isEntityArchived(childId)).toBe(false);
  });

  test('archive with cascade:false leaves children alone', async () => {
    const engine = await initEngine();

    const op = await engine.createIssue('No cascade', {
      criteria: [{ description: 'C1' }],
    });
    const issueEntityId = `issue:${op.vcs!.issueId!}`;

    const result = await engine.archiveEntity(issueEntityId, {
      cascade: false,
    });

    expect(result.cascadedEntityIds).toEqual([]);
  });

  // ---------------------------------------------------------------------
  // Tombstone (hard delete)
  // ---------------------------------------------------------------------

  test('tombstoneEntity retracts all facts on the entity', async () => {
    const engine = await initEngine();

    expect(engine.isEntityTombstoned('file:src/a.ts')).toBe(false);

    const result = await engine.tombstoneEntity('file:src/a.ts');
    expect(result.op.kind).toBe('vcs:entityTombstone');
    expect(result.factsRetracted).toBeGreaterThan(0);

    // The type fact is gone; lookups by type won't return this entity.
    const fileEntities = engine
      .getStore()
      .getFactsByAttribute('type')
      .filter((f) => f.v === 'FileNode' && f.e === 'file:src/a.ts');
    expect(fileEntities).toEqual([]);

    // But tombstone marker remains.
    expect(engine.isEntityTombstoned('file:src/a.ts')).toBe(true);
  });

  test('tombstoneEntity retracts incoming and outgoing links', async () => {
    const engine = await initEngine();

    // Set up a link: file:src/a.ts is referenced by an issue
    const op = await engine.createIssue('References a.ts');
    const issueId = op.vcs!.issueId!;

    // Manually create a cross-entity link via the store
    const store = engine.getStore();
    store.addLinks([
      { e1: `issue:${issueId}`, a: 'references', e2: 'file:src/a.ts' },
      { e1: 'file:src/a.ts', a: 'definedIn', e2: 'dir:src' },
    ]);

    // Sanity: link exists
    const before = store
      .getLinksByEntity('file:src/a.ts')
      .filter((l) => l.a === 'references' || l.a === 'definedIn');
    expect(before.length).toBeGreaterThan(0);

    const result = await engine.tombstoneEntity('file:src/a.ts');
    expect(result.linksRetracted).toBeGreaterThan(0);

    // Both directions are retracted.
    const remaining = store
      .getLinksByEntity('file:src/a.ts')
      .filter((l) => l.a === 'references' || l.a === 'definedIn');
    expect(remaining).toEqual([]);
  });

  test('tombstone is irreversible (no unarchive path)', async () => {
    const engine = await initEngine();

    await engine.tombstoneEntity('file:src/a.ts');

    // Cannot archive a tombstoned entity.
    await expect(engine.archiveEntity('file:src/a.ts')).rejects.toThrow(
      'not found',
    );
    // Cannot tombstone again.
    await expect(engine.tombstoneEntity('file:src/a.ts')).rejects.toThrow(
      'already tombstoned',
    );
  });

  test('tombstone cascades to children', async () => {
    const engine = await initEngine();

    const op = await engine.createIssue('Cascade tomb', {
      criteria: [{ description: 'C1' }, { description: 'C2' }],
    });
    const issueEntityId = `issue:${op.vcs!.issueId!}`;
    const issueRecord = engine.getIssue(op.vcs!.issueId!)!;
    const criterionIds = issueRecord.criteria.map((c) => c.id);

    const result = await engine.tombstoneEntity(issueEntityId);

    expect(result.cascadedEntityIds.sort()).toEqual(criterionIds.sort());
    for (const cid of criterionIds) {
      expect(engine.isEntityTombstoned(cid)).toBe(true);
    }
  });

  test('tombstone reason is recorded on the entity', async () => {
    const engine = await initEngine();

    await engine.tombstoneEntity('file:src/a.ts', {
      reason: 'accidental commit of secret',
    });

    const facts = engine.getStore().getFactsByEntity('file:src/a.ts');
    const reason = facts.find((f) => f.a === 'tombstoneReason');
    expect(reason?.v).toBe('accidental commit of secret');
  });

  // ---------------------------------------------------------------------
  // Interaction with issue-specific archive (back-compat)
  // ---------------------------------------------------------------------

  test('archiveIssue still works (delegates to archiveEntity)', async () => {
    const engine = await initEngine();

    const op = await engine.createIssue('Compat test');
    const id = op.vcs!.issueId!;

    const result = await engine.archiveIssue(id);
    expect(result.op.kind).toBe('vcs:entityArchive');
    expect(result.op.vcs?.entityId).toBe(`issue:${id}`);
    expect(engine.getIssue(id)!.archived).toBe(true);
  });

  test('archiveIssue still auto-unblocks dependents', async () => {
    const engine = await initEngine();

    const blockerOp = await engine.createIssue('Blocker');
    const depOp = await engine.createIssue('Dependent');
    const blockerId = blockerOp.vcs!.issueId!;
    const depId = depOp.vcs!.issueId!;

    await engine.blockIssue(depId, blockerId);
    expect(engine.getIssue(depId)!.isBlocked).toBe(true);

    const result = await engine.archiveIssue(blockerId);
    expect(result.unblockedDependents).toEqual([depId]);
    expect(engine.getIssue(depId)!.isBlocked).toBe(false);
  });
});
