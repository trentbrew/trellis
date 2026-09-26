import { describe, test, expect } from 'vitest';
import { dirname as nodeDirname } from 'path';
import { EAVStore } from '../../src/core/store/eav-store.js';
import { decompose } from '../../src/vcs/decompose.js';
import {
  enrichFileOp,
  isMintedDirEntityId,
  isMintedFileEntityId,
} from '../../src/vcs/file-entity.js';
import type { VcsOp } from '../../src/vcs/types.js';

function makeOp(kind: string, vcs: Record<string, any>): VcsOp {
  return {
    hash: 'trellis:op:test',
    kind,
    timestamp: '2026-03-29T00:00:00.000Z',
    agentId: 'agent:test',
    vcs,
  };
}

function applyFileOp(store: EAVStore, op: VcsOp): VcsOp {
  const enriched = enrichFileOp(store, op);
  const result = decompose(enriched);
  if (result.deleteFacts.length > 0) store.deleteFacts(result.deleteFacts);
  if (result.deleteLinks.length > 0) store.deleteLinks(result.deleteLinks);
  if (result.addFacts.length > 0) store.addFacts(result.addFacts);
  if (result.addLinks.length > 0) store.addLinks(result.addLinks);
  return enriched;
}

function filePaths(store: EAVStore, entityId: string): string[] {
  return store
    .getFactsByEntity(entityId)
    .filter((f) => f.a === 'path')
    .map((f) => String(f.v));
}

function contentHashes(store: EAVStore, entityId: string): string[] {
  return store
    .getFactsByEntity(entityId)
    .filter((f) => f.a === 'contentHash')
    .map((f) => String(f.v));
}

describe('decompose', () => {
  test('vcs:fileAdd creates file entity facts and directory link', () => {
    const op = makeOp('vcs:fileAdd', {
      filePath: 'src/utils/math.ts',
      contentHash: 'sha256:abc',
      size: 1024,
      language: 'typescript',
    });

    const result = decompose(op);

    // Should create file entity facts
    expect(result.addFacts).toContainEqual({ e: 'file:src/utils/math.ts', a: 'type', v: 'FileNode' });
    expect(result.addFacts).toContainEqual({ e: 'file:src/utils/math.ts', a: 'path', v: 'src/utils/math.ts' });
    expect(result.addFacts).toContainEqual({ e: 'file:src/utils/math.ts', a: 'contentHash', v: 'sha256:abc' });
    expect(result.addFacts).toContainEqual({ e: 'file:src/utils/math.ts', a: 'size', v: 1024 });
    expect(result.addFacts).toContainEqual({ e: 'file:src/utils/math.ts', a: 'language', v: 'typescript' });

    // Should create directory entity
    expect(result.addFacts).toContainEqual({ e: 'dir:src/utils', a: 'type', v: 'DirectoryNode' });

    // Should link directory → file
    expect(result.addLinks).toContainEqual({
      e1: 'dir:src/utils',
      a: 'contains',
      e2: 'file:src/utils/math.ts',
    });

    // No deletions
    expect(result.deleteFacts).toHaveLength(0);
    expect(result.deleteLinks).toHaveLength(0);
  });

  test('vcs:fileModify updates contentHash', () => {
    const op = makeOp('vcs:fileModify', {
      filePath: 'src/index.ts',
      contentHash: 'sha256:new',
      oldContentHash: 'sha256:old',
      size: 2048,
    });

    const result = decompose(op);

    // Should delete old hash
    expect(result.deleteFacts).toContainEqual({
      e: 'file:src/index.ts',
      a: 'contentHash',
      v: 'sha256:old',
    });

    // Should add new hash
    expect(result.addFacts).toContainEqual({
      e: 'file:src/index.ts',
      a: 'contentHash',
      v: 'sha256:new',
    });
  });

  test('vcs:fileDelete removes file entity', () => {
    const op = makeOp('vcs:fileDelete', {
      filePath: 'src/old.ts',
      contentHash: 'sha256:abc',
    });

    const result = decompose(op);

    expect(result.deleteFacts).toContainEqual({ e: 'file:src/old.ts', a: 'type', v: 'FileNode' });
    expect(result.deleteFacts).toContainEqual({ e: 'file:src/old.ts', a: 'path', v: 'src/old.ts' });
    expect(result.deleteLinks).toContainEqual({
      e1: 'dir:src',
      a: 'contains',
      e2: 'file:src/old.ts',
    });
  });

  test('vcs:fileRename preserves entity identity', () => {
    const op = makeOp('vcs:fileRename', {
      filePath: 'src/new.ts',
      oldFilePath: 'src/old.ts',
    });

    const result = decompose(op);

    // Entity ID stays the same (based on old path)
    expect(result.deleteFacts).toContainEqual({
      e: 'file:src/old.ts',
      a: 'path',
      v: 'src/old.ts',
    });
    expect(result.addFacts).toContainEqual({
      e: 'file:src/old.ts',
      a: 'path',
      v: 'src/new.ts',
    });

    // Old directory link removed, new one added
    expect(result.deleteLinks).toContainEqual({
      e1: 'dir:src',
      a: 'contains',
      e2: 'file:src/old.ts',
    });
    expect(result.addLinks).toContainEqual({
      e1: 'dir:src',
      a: 'contains',
      e2: 'file:src/old.ts', // same entity ID
    });
  });

  test('vcs:branchCreate creates branch entity', () => {
    const op = makeOp('vcs:branchCreate', {
      branchName: 'feature-x',
      baseBranch: 'main',
    });

    const result = decompose(op);

    expect(result.addFacts).toContainEqual({ e: 'branch:feature-x', a: 'type', v: 'Branch' });
    expect(result.addFacts).toContainEqual({ e: 'branch:feature-x', a: 'name', v: 'feature-x' });
    expect(result.addLinks).toContainEqual({
      e1: 'branch:feature-x',
      a: 'forkedFrom',
      e2: 'branch:main',
    });
  });

  test('vcs:milestoneCreate creates milestone entity', () => {
    const op = makeOp('vcs:milestoneCreate', {
      milestoneId: 'milestone:abc',
      message: 'fix: null auth tokens',
      fromOpHash: 'trellis:op:start',
      toOpHash: 'trellis:op:end',
    });

    const result = decompose(op);

    expect(result.addFacts).toContainEqual({ e: 'milestone:abc', a: 'type', v: 'Milestone' });
    expect(result.addFacts).toContainEqual({ e: 'milestone:abc', a: 'message', v: 'fix: null auth tokens' });
    expect(result.addFacts).toContainEqual({ e: 'milestone:abc', a: 'fromOpHash', v: 'trellis:op:start' });
    expect(result.addFacts).toContainEqual({ e: 'milestone:abc', a: 'toOpHash', v: 'trellis:op:end' });
  });

  test('issue claim release retracts concrete claim facts', () => {
    const result = decompose(
      makeOp('vcs:issueClaimRelease', {
        issueId: 'TRL-42',
        claimedLaneId: 'lane:executor',
        claimedSessionId: 'cursor-tab-1',
        claimedAt: '2026-03-29T00:00:00.000Z',
      }),
    );

    expect(result.deleteFacts).toEqual([
      { e: 'issue:TRL-42', a: 'claimedLaneId', v: 'lane:executor' },
      { e: 'issue:TRL-42', a: 'claimedSessionId', v: 'cursor-tab-1' },
      {
        e: 'issue:TRL-42',
        a: 'claimedAt',
        v: '2026-03-29T00:00:00.000Z',
      },
    ]);
  });

  test('returns empty result for op without vcs payload', () => {
    const op: VcsOp = {
      hash: 'trellis:op:test',
      kind: 'addFacts',
      timestamp: '2026-03-29T00:00:00.000Z',
      agentId: 'agent:test',
    };

    const result = decompose(op);
    expect(result.addFacts).toHaveLength(0);
    expect(result.addLinks).toHaveLength(0);
    expect(result.deleteFacts).toHaveLength(0);
    expect(result.deleteLinks).toHaveLength(0);
  });

  test('vcs:storeAssert passes through EAV facts', () => {
    const op = makeOp('vcs:storeAssert', {
      facts: [
        { e: 'person:sam-altman', a: 'type', v: 'person' },
        { e: 'person:sam-altman', a: 'name', v: 'Sam Altman' },
      ],
    });

    const result = decompose(op);

    expect(result.addFacts).toContainEqual({ e: 'person:sam-altman', a: 'type', v: 'person' });
    expect(result.addFacts).toContainEqual({ e: 'person:sam-altman', a: 'name', v: 'Sam Altman' });
    expect(result.deleteFacts).toHaveLength(0);
  });

  test('vcs:storeRetract and vcs:storeLink pass through EAV mutations', () => {
    const retract = decompose(
      makeOp('vcs:storeRetract', {
        facts: [{ e: 'person:sam-altman', a: 'bio', v: 'old bio' }],
      }),
    );
    expect(retract.deleteFacts).toContainEqual({
      e: 'person:sam-altman',
      a: 'bio',
      v: 'old bio',
    });

    const link = decompose(
      makeOp('vcs:storeLink', {
        links: [{ e1: 'person:sam-altman', a: 'leads', e2: 'organization:openai' }],
      }),
    );
    expect(link.addLinks).toContainEqual({
      e1: 'person:sam-altman',
      a: 'leads',
      e2: 'organization:openai',
    });
  });
});

/**
 * `decompose` used to import `dirname` from Node's `path` for one pure string
 * operation, which made the whole module — and therefore any browser peer that
 * wants to materialize ops locally — unbundleable. It now uses a local
 * `dirname`. These pin the equivalence that swap relies on.
 *
 * Scope of the claim: repo-relative POSIX paths, which is the only thing
 * `vcs.filePath` ever holds. Node's Windows/UNC/absolute rules are out of scope
 * by construction, not by oversight.
 */
describe('TRL-456 minted file identity', () => {
  test('rename then re-add at original path yields two distinct FileNode entities', () => {
    const store = new EAVStore();
    const add1 = applyFileOp(
      store,
      makeOp('vcs:fileAdd', {
        filePath: 'a.ts',
        contentHash: 'sha256:H1',
      }),
    );
    const id1 = add1.vcs!.fileEntityId!;
    expect(isMintedFileEntityId(id1)).toBe(true);

    applyFileOp(
      store,
      makeOp('vcs:fileRename', {
        filePath: 'b.ts',
        oldFilePath: 'a.ts',
        fileEntityId: id1,
      }),
    );

    const add2 = applyFileOp(
      store,
      makeOp('vcs:fileAdd', {
        filePath: 'a.ts',
        contentHash: 'sha256:H2',
      }),
    );
    const id2 = add2.vcs!.fileEntityId!;

    expect(id2).not.toBe(id1);
    expect(filePaths(store, id1)).toEqual(['b.ts']);
    expect(filePaths(store, id2)).toEqual(['a.ts']);
    expect(contentHashes(store, id1)).toEqual(['sha256:H1']);
    expect(contentHashes(store, id2)).toEqual(['sha256:H2']);
    expect(store.getFactsByEntity('file:a.ts')).toHaveLength(0);
    expect(store.getFactsByEntity('file:b.ts')).toHaveLength(0);
  });

  test('fileRename mints a distinct parent DirectoryNode for the new path', () => {
    const store = new EAVStore();
    const add = applyFileOp(
      store,
      makeOp('vcs:fileAdd', {
        filePath: 'pkg/a.ts',
        contentHash: 'sha256:H1',
      }),
    );
    const oldDir = add.vcs!.dirEntityId!;
    expect(isMintedDirEntityId(oldDir)).toBe(true);

    const renamed = applyFileOp(
      store,
      makeOp('vcs:fileRename', {
        filePath: 'moved/a.ts',
        oldFilePath: 'pkg/a.ts',
        fileEntityId: add.vcs!.fileEntityId,
        oldDirEntityId: oldDir,
      }),
    );
    const newDir = renamed.vcs!.newDirEntityId!;

    expect(newDir).not.toBe(oldDir);
    expect(isMintedDirEntityId(newDir)).toBe(true);
    expect(filePaths(store, oldDir)).toEqual(['pkg']);
    expect(filePaths(store, newDir)).toEqual(['moved']);
    expect(store.getFactsByEntity('dir:pkg')).toHaveLength(0);
    expect(store.getFactsByEntity('dir:moved')).toHaveLength(0);
  });
});

describe('dir facts use a browser-safe dirname', () => {
  const repoPaths = [
    'src/vcs/decompose.ts',
    'README.md',
    'a/b/c/d.ts',
    'docs/adr/0022-zone-capability-model.md',
    '.gitignore',
    'deep/nested/path/to/file.tsx',
  ];

  test.each(repoPaths)('matches node path.dirname for %s', (p) => {
    const op = makeOp('vcs:fileAdd', { filePath: p, contentHash: 'abc' });
    const facts = decompose(op).addFacts;
    const dirNode = facts.find((f) => f.a === 'type' && f.v === 'DirectoryNode');
    const dirPath = facts.find((f) => f.e === dirNode?.e && f.a === 'path');

    // `decompose` normalizes a root-level file's '.' to '' before projecting.
    const expected = nodeDirname(p) === '.' ? '' : nodeDirname(p);
    expect(dirPath?.v).toBe(expected);
  });
});
