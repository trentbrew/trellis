import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { TrellisVcsEngine } from '../../src/engine.js';
import { GitReader } from '../../src/git/git-reader.js';
import {
  compileOps,
  compileIssues,
  listBugRefs,
  readBugPacks,
  importGitBug,
  gitBugOpHash,
  gitBugCombinedId,
} from '../../src/git/git-bug-importer.js';

const ROOT = `/tmp/trellis-gitbug-${process.pid}-${Date.now().toString(36)}`;
const GIT = join(ROOT, 'gitsrc');
const TRELLIS = join(ROOT, 'trellis');

function git(args: string, cwd = GIT): string {
  return execSync(`git -C "${cwd}" ${args}`, { encoding: 'utf-8' }).trim();
}

/**
 * Write one git-bug-style bug: a refs/bugs/<id> commit chain whose tree carries
 * an `ops` blob (OperationPack JSON) and an `edit-clock-N` entry.
 */
function writeBug(refId: string, packs: Array<{ clock: number; ops: unknown[] }>) {
  let parent = '';
  for (const pack of packs) {
    const opsFile = join(GIT, 'ops.json');
    writeFileSync(opsFile, JSON.stringify({ ops: pack.ops }));
    const blob = git(`hash-object -w "ops.json"`);
    git(`update-index --add --cacheinfo 100644,${blob},ops`);
    const clockFile = join(GIT, 'clock');
    writeFileSync(clockFile, String(pack.clock));
    const clockBlob = git(`hash-object -w clock`);
    git(`update-index --add --cacheinfo 100644,${clockBlob},edit-clock-${pack.clock}`);
    const tree = git('write-tree');
    const parentArg = parent ? `-p ${parent}` : '';
    const commit = execSync(
      `git -C "${GIT}" -c user.name=bug -c user.email=bug@x commit-tree ${tree} ${parentArg} -m "pack ${pack.clock}"`,
      { encoding: 'utf-8' },
    ).trim();
    parent = commit;
    // reset the index so the next pack starts clean
    git('read-tree --empty');
  }
  git(`update-ref refs/bugs/${refId} ${parent}`);
}

describe('git-bug adapter (ADR 0049 Phase 1)', () => {
  beforeEach(() => {
    rmSync(ROOT, { recursive: true, force: true });
    mkdirSync(GIT, { recursive: true });
    mkdirSync(TRELLIS, { recursive: true });
    execSync(`git init -q "${GIT}"`);
    git('config user.email "bug@example.com"');
    git('config user.name "Bug"');
    git('config core.autocrlf false');
  });

  afterEach(() => {
    rmSync(ROOT, { recursive: true, force: true });
  });

  test('lists bug refs and compiles canonical order', async () => {
    writeBug('bug1', [
      { clock: 1, ops: [{ type: 1, title: 'First bug', message: 'body' }] },
      { clock: 3, ops: [{ type: 2, title: 'First bug (edited)' }] },
    ]);
    writeBug('bug2', [{ clock: 2, ops: [{ type: 1, title: 'Second bug' }] }]);

    const reader = new GitReader(GIT);
    const refs = listBugRefs(reader);
    expect(refs.sort()).toEqual(['refs/bugs/bug1', 'refs/bugs/bug2']);

    const perRef = await Promise.all(
      refs.map(async (ref) => ({ ref, ops: await compileOps(readBugPacks(reader, ref)) })),
    );
    // Each bug ref is its own DAG; within a ref, ops are clock-ordered.
    const bug1 = perRef.find((r) => r.ref === 'refs/bugs/bug1')!;
    expect(bug1.ops.map((c) => c.gitBugLamport)).toEqual([1, 3]);

    const issues = compileIssues(perRef);
    expect(issues).toHaveLength(2);
    const first = issues.find((i) => i.title.startsWith('First bug'));
    expect(first?.title).toBe('First bug (edited)');
  });

  test('compile is deterministic and order-stable across runs', async () => {
    writeBug('bugA', [
      { clock: 5, ops: [{ type: 1, title: 'A' }] },
      { clock: 7, ops: [{ type: 4, status: 2 }] },
    ]);
    const reader = new GitReader(GIT);
    const run = async () =>
      (
        await Promise.all(
          listBugRefs(reader).map(async (ref) => await compileOps(readBugPacks(reader, ref))),
        )
      )
        .flat()
        .map((c) => c.gitBugOpId);
    expect(await run()).toEqual(await run());
  });

  test('imports issues + Integration bookkeeping, and is idempotent', async () => {
    writeBug('bug1', [
      { clock: 1, ops: [{ type: 1, title: 'Imported one', message: 'hello' }] },
    ]);
    writeBug('bug2', [
      {
        clock: 2,
        ops: [
          { type: 1, title: 'Imported two' },
          { type: 5, added: ['urgent'], removed: [] },
          { type: 3, message: 'a comment' },
        ],
      },
    ]);

    const engine = new TrellisVcsEngine({ rootPath: TRELLIS });
    await engine.initRepo();
    const ctx = engine.capabilityContext();

    const first = await importGitBug(ctx, { repoPath: GIT, repoIdentity: 'example/repo' });
    expect(first.issuesImported).toBe(2);
    expect(first.opsCreated).toBeGreaterThanOrEqual(2);
    expect(first.integrationId).toBe('integration:git-bug:example/repo');

    // Integration bookkeeping exists with the right provider.
    const integ = ctx.store.getFactsByEntity('integration:git-bug:example/repo');
    expect(integ.some((f) => f.a === 'provider' && f.v === 'git-bug')).toBe(true);
    expect(integ.some((f) => f.a === 'type' && f.v === 'Integration')).toBe(true);

    // Second run over the same refs appends nothing new (idempotent).
    const opsBefore = ctx.readAllOps().length;
    const second = await importGitBug(ctx, { repoPath: GIT, repoIdentity: 'example/repo' });
    expect(second.opsCreated).toBe(0);
    expect(ctx.readAllOps().length).toBe(opsBefore);
  });

  test('gitBugOpId is a content hash; comment edits match by combined id', async () => {
    // Content hash: same op → same id; different op → different id.
    const a = await gitBugOpHash({ type: 1, title: 'A' });
    const b = await gitBugOpHash({ type: 1, title: 'A' });
    const c = await gitBugOpHash({ type: 1, title: 'B' });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);

    // Combined id derives from author + nonce.
    expect(gitBugCombinedId('alice', 'n1')).toBe('alice/n1');

    // AddComment (author alice, nonce n1) then EditComment targeting alice/n1.
    writeBug('bugEdit', [
      {
        clock: 1,
        ops: [
          { type: 1, title: 'With comment' },
          { type: 3, message: 'original', base: { author: { id: 'alice' }, timestamp: 1, nonce: 'n1' } },
          { type: 6, target: 'alice/n1', message: 'edited' },
        ],
      },
    ]);

    const reader = new GitReader(GIT);
    const ops = await compileOps(readBugPacks(reader, 'refs/bugs/bugEdit'));
    const issues = compileIssues([{ ref: 'refs/bugs/bugEdit', ops }]);
    expect(issues).toHaveLength(1);
    expect(issues[0].comments).toHaveLength(1);
    expect(issues[0].comments[0].id).toBe('alice/n1');
    expect(issues[0].comments[0].message).toBe('edited');
  });

  test('provenance is queryable on imported ops', async () => {
    writeBug('bug1', [{ clock: 1, ops: [{ type: 1, title: 'Prov' }] }]);
    const engine = new TrellisVcsEngine({ rootPath: TRELLIS });
    await engine.initRepo();
    const ctx = engine.capabilityContext();
    await importGitBug(ctx, { repoPath: GIT, repoIdentity: 'p/r' });

    const imported = ctx.readAllOps().filter((op) => {
      const v = op.vcs as { provenance?: Record<string, unknown> };
      return v?.provenance?.importSource === 'git-bug';
    });
    expect(imported.length).toBeGreaterThan(0);
    for (const op of imported) {
      const p = (op.vcs as { provenance?: Record<string, unknown> }).provenance!;
      expect(typeof p.gitBugOpId).toBe('string');
      expect(typeof p.gitBugPackId).toBe('string');
      expect(typeof p.gitBugLamport).toBe('number');
      expect(typeof p.gitBugAuthorId).toBe('string');
    }
  });
});
