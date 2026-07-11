import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { TrellisVcsEngine } from '../../src/engine.js';
import { JsonOpLog } from '../../src/vcs/op-log.js';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const TEST_DIR = '/tmp/trellis-test-runner';

function writeManifest(
  suites: Record<string, { command: string; description?: string }>,
  extra?: Record<string, unknown>,
) {
  writeFileSync(
    join(TEST_DIR, '.trellis', 'tests.json'),
    JSON.stringify({
      version: 1,
      defaultSuite: 'smoke',
      suites,
      ...extra,
    }),
  );
}

async function initEngine(): Promise<TrellisVcsEngine> {
  const engine = new TrellisVcsEngine({ rootPath: TEST_DIR });
  await engine.initRepo();
  engine.open();
  return engine;
}

describe('VCS test runner', () => {
  beforeEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'src', 'index.ts'), 'export const x = 1;');
    mkdirSync(join(TEST_DIR, '.trellis'), { recursive: true });
    writeManifest({
      smoke: { command: 'echo smoke-ok', description: 'Smoke' },
      fail: { command: 'exit 1', description: 'Always fails' },
    });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  test('runTests emits vcs:testRun op on pass', async () => {
    const engine = await initEngine();
    const results = await engine.runTests({ suiteIds: ['smoke'] });

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('passed');
    expect(results[0].suite).toBe('smoke');
    expect(results[0].opHash).toMatch(/^trellis:op:/);

    const log = new JsonOpLog(join(TEST_DIR, '.trellis', 'ops.json'));
    log.load();
    const testOp = log.readAll().find((o) => o.kind === 'vcs:testRun');
    expect(testOp).toBeDefined();
    expect(testOp!.vcs?.testRunStatus).toBe('passed');
    expect(testOp!.vcs?.testRunSuite).toBe('smoke');
  });

  test('runTests records failure', async () => {
    const engine = await initEngine();
    const results = await engine.runTests({ suiteIds: ['fail'] });
    expect(results[0].status).toBe('failed');
    expect(results[0].exitCode).toBe(1);
  });

  test('runCriteria resolves suite from manifest', async () => {
    const engine = await initEngine();
    const issueOp = await engine.createIssue('Suite criterion', {
      criteria: [{ description: 'Smoke passes', suite: 'smoke' }],
    });
    const id = issueOp.vcs!.issueId!;

    const results = await engine.runCriteria(id);
    expect(results[0].status).toBe('passed');
    expect(results[0].command).toBe('echo smoke-ok');

    const issue = engine.getIssue(id);
    expect(issue!.criteria[0].status).toBe('passed');
  });

  test('getEditRoot uses lane worktree when bound', async () => {
    const engine = new TrellisVcsEngine({
      rootPath: TEST_DIR,
      lanes: { worktreeBind: true },
    });
    await engine.initRepo();
    engine.open();

    const wt = join(TEST_DIR, '.trellis', 'worktrees', 'lane-test');
    mkdirSync(wt, { recursive: true });

    const lane = await engine.createLane({
      worktreePath: wt,
    });
    await engine.enterLane(lane.id);

    expect(engine.getEditRoot()).toBe(wt);
    expect(engine.getEditRoot(lane.id)).toBe(wt);
  });

  test('promoteLane requireTest throws when suite fails', async () => {
    writeManifest(
      { fail: { command: 'exit 1' } },
      { promote: { require: ['fail'] } },
    );

    const engine = await initEngine();
    const lane = await engine.createLane();

    await expect(
      engine.promoteLane(lane.id, { requireTest: true }),
    ).rejects.toThrow(/required tests failed/);
  });

  test('promoteLane requireTest records testRun before empty promote', async () => {
    writeManifest(
      { smoke: { command: 'echo ok' } },
      { promote: { require: ['smoke'] } },
    );

    const engine = await initEngine();
    const lane = await engine.createLane();
    const result = await engine.promoteLane(lane.id, { requireTest: true });

    expect(result.canPromote).toBe(false);
    const log = new JsonOpLog(join(TEST_DIR, '.trellis', 'ops.json'));
    log.load();
    expect(log.readAll().some((o) => o.kind === 'vcs:testRun')).toBe(true);
  });

  test('resolveIssueStartCriteria merges default and label templates', async () => {
    const { resolveIssueStartCriteria, DEFAULT_TEST_MANIFEST } = await import(
      '../../src/vcs/test-manifest.js'
    );
    const templates = resolveIssueStartCriteria(DEFAULT_TEST_MANIFEST, [
      'needs-e2e',
    ]);
    expect(templates.map((t) => t.description)).toEqual([
      'Unit tests pass',
      'E2E suite passes',
    ]);
    expect(templates[0].suite).toBe('unit');
    expect(templates[1].suite).toBe('e2e');
  });

  test('resolveReviewLadder uses explicit review block', async () => {
    const { resolveReviewLadder } = await import(
      '../../src/vcs/test-manifest.js'
    );
    const manifest = {
      version: 1,
      suites: {
        check: { command: 'pnpm check' },
        e2e: { command: 'pnpm test:e2e e2e/smoke.spec.ts' },
      },
      review: { check: 'check', e2e: 'e2e' },
    };
    const ladder = resolveReviewLadder(manifest);
    expect(ladder.checkSuiteId).toBe('check');
    expect(ladder.e2eSuiteId).toBe('e2e');
    expect(ladder.check.command).toBe('pnpm check');
    expect(ladder.e2e.command).toContain('test:e2e');
  });

  test('resolveReviewLadder infers check and e2e suites', async () => {
    const { resolveReviewLadder } = await import(
      '../../src/vcs/test-manifest.js'
    );
    const manifest = {
      version: 1,
      suites: {
        typecheck: { command: 'pnpm run typecheck' },
        static: { command: 'pnpm check' },
        pw: { command: 'PW_REUSE=1 pnpm test:e2e e2e/foo.spec.ts' },
      },
    };
    const ladder = resolveReviewLadder(manifest);
    expect(ladder.checkSuiteId).toBe('static');
    expect(ladder.e2eSuiteId).toBe('pw');
  });

  test('resolveReviewLadder throws when e2e suite missing', async () => {
    const { resolveReviewLadder } = await import(
      '../../src/vcs/test-manifest.js'
    );
    expect(() =>
      resolveReviewLadder({
        version: 1,
        suites: { check: { command: 'pnpm check' } },
      }),
    ).toThrow(/review.e2e/);
  });

  test('initRepo writes default tests.json when missing', async () => {
    const initDir = join(TEST_DIR, 'fresh-init');
    rmSync(initDir, { recursive: true, force: true });
    mkdirSync(join(initDir, 'src'), { recursive: true });
    const engine = new TrellisVcsEngine({ rootPath: initDir });
    await engine.initRepo();
    expect(existsSync(join(initDir, '.trellis', 'tests.json'))).toBe(true);
  });
});
