/**
 * VCS-native test runner — executes manifest suites and records vcs:testRun ops.
 */

import { exec } from 'child_process';
import { randomUUID } from 'crypto';
import { promisify } from 'util';
import { createVcsOp } from './ops.js';
import type { EngineContext } from './engine-context.js';
import {
  getPromoteRequiredSuites,
  loadTestManifest,
  requireTestManifest,
  resolveSuite,
  suiteTimeoutMs,
  type TestManifest,
  type TestSuiteDef,
} from './test-manifest.js';
import { issueEntityId, testRunEntityId } from './types.js';
import { loadBrowserSteps } from '../desk/browser-steps.js';
import { runBrowserVerifyViaRelay } from '../desk/browser-verify-client.js';

const execAsync = promisify(exec);

export type TestRunTrigger =
  | 'manual'
  | 'watch'
  | 'pre-promote'
  | 'pre-close'
  | 'criterion';

export interface TestRunResult {
  testRunId: string;
  suite?: string;
  command: string;
  status: 'passed' | 'failed';
  output?: string;
  exitCode?: number;
  durationMs?: number;
  opHash?: string;
}

export interface RunTestSuiteParams {
  /** Working directory for the shell command (lane worktree or repo root). */
  cwd: string;
  /** Repo root containing `.trellis/tests.json` (defaults to `cwd`). */
  manifestRoot?: string;
  suiteId: string;
  manifest?: TestManifest;
  laneId?: string;
  issueId?: string;
  trigger?: TestRunTrigger;
}

export async function executeTestCommand(opts: {
  command: string;
  cwd: string;
  timeoutMs?: number;
}): Promise<{
  status: 'passed' | 'failed';
  output: string;
  exitCode: number;
  durationMs: number;
}> {
  const started = Date.now();
  try {
    const result = await execAsync(opts.command, {
      cwd: opts.cwd,
      timeout: opts.timeoutMs ?? 120_000,
      maxBuffer: 1024 * 1024,
    });
    const output = (result.stdout + '\n' + result.stderr).trim();
    return {
      status: 'passed',
      output,
      exitCode: 0,
      durationMs: Date.now() - started,
    };
  } catch (err: any) {
    const output = (
      (err.stdout ?? '') +
      '\n' +
      (err.stderr ?? err.message ?? '')
    ).trim();
    return {
      status: 'failed',
      output,
      exitCode: err.code ?? 1,
      durationMs: Date.now() - started,
    };
  }
}

export async function emitTestRunOp(
  ctx: EngineContext,
  params: {
    suiteId?: string;
    command: string;
    status: 'passed' | 'failed';
    output?: string;
    exitCode?: number;
    durationMs?: number;
    laneId?: string;
    issueId?: string;
    trigger: TestRunTrigger;
  },
): Promise<TestRunResult> {
  const testRunId = testRunEntityId(randomUUID());
  const op = await createVcsOp('vcs:testRun', {
    agentId: ctx.agentId,
    previousHash: ctx.getLastOp()?.hash,
    vcs: {
      testRunId,
      testRunSuite: params.suiteId,
      testRunCommand: params.command,
      testRunStatus: params.status,
      testRunOutput: params.output?.slice(0, 4096),
      testRunExitCode: params.exitCode,
      testRunDurationMs: params.durationMs,
      testRunTrigger: params.trigger,
      laneId: params.laneId,
      issueId: params.issueId,
    },
  });
  await ctx.applyOp(op);

  return {
    testRunId,
    suite: params.suiteId,
    command: params.command,
    status: params.status,
    output: params.output,
    exitCode: params.exitCode,
    durationMs: params.durationMs,
    opHash: op.hash,
  };
}

export async function runTestSuite(
  ctx: EngineContext,
  params: RunTestSuiteParams,
): Promise<TestRunResult> {
  const manifestRoot = params.manifestRoot ?? params.cwd;
  const manifest = params.manifest ?? requireTestManifest(manifestRoot);
  const suite = resolveSuite(manifest, params.suiteId);

  if (suite.kind === 'browser') {
    const steps = loadBrowserSteps(
      manifestRoot,
      params.suiteId,
      suite.stepsFile,
    );
    const executed = await runBrowserVerifyViaRelay({
      suiteId: params.suiteId,
      steps,
      timeoutMs: suiteTimeoutMs(suite),
    });
    return emitTestRunOp(ctx, {
      suiteId: params.suiteId,
      command: suite.command,
      status: executed.ok ? 'passed' : 'failed',
      output: executed.output,
      exitCode: executed.exitCode,
      durationMs: executed.durationMs,
      laneId: params.laneId,
      issueId: params.issueId,
      trigger: params.trigger ?? 'manual',
    });
  }

  const executed = await executeTestCommand({
    command: suite.command,
    cwd: params.cwd,
    timeoutMs: suiteTimeoutMs(suite),
  });

  return emitTestRunOp(ctx, {
    suiteId: params.suiteId,
    command: suite.command,
    status: executed.status,
    output: executed.output,
    exitCode: executed.exitCode,
    durationMs: executed.durationMs,
    laneId: params.laneId,
    issueId: params.issueId,
    trigger: params.trigger ?? 'manual',
  });
}

export async function runTestSuites(
  ctx: EngineContext,
  params: {
    cwd: string;
    manifestRoot?: string;
    suiteIds: string[];
    manifest?: TestManifest;
    laneId?: string;
    issueId?: string;
    trigger?: TestRunTrigger;
  },
): Promise<TestRunResult[]> {
  const manifestRoot = params.manifestRoot ?? params.cwd;
  const manifest = params.manifest ?? requireTestManifest(manifestRoot);
  const results: TestRunResult[] = [];
  for (const suiteId of params.suiteIds) {
    results.push(
      await runTestSuite(ctx, {
        cwd: params.cwd,
        manifestRoot,
        suiteId,
        manifest,
        laneId: params.laneId,
        issueId: params.issueId,
        trigger: params.trigger,
      }),
    );
  }
  return results;
}

export async function runPromoteRequiredTests(
  ctx: EngineContext,
  cwd: string,
  laneId: string,
  manifestRoot?: string,
): Promise<TestRunResult[]> {
  const root = manifestRoot ?? cwd;
  const manifest = requireTestManifest(root);
  const suiteIds = getPromoteRequiredSuites(manifest);
  if (suiteIds.length === 0) {
    throw new Error(
      'No promote test suites configured. Set promote.require or defaultSuite in .trellis/tests.json',
    );
  }
  return runTestSuites(ctx, {
    cwd,
    manifestRoot: root,
    suiteIds,
    manifest,
    laneId,
    trigger: 'pre-promote',
  });
}

export function allTestRunsPassed(results: TestRunResult[]): boolean {
  return results.length > 0 && results.every((r) => r.status === 'passed');
}

/** Load manifest if present; never throws for missing file. */
export function tryLoadTestManifest(rootPath: string): TestManifest | null {
  try {
    return loadTestManifest(rootPath);
  } catch {
    return null;
  }
}

export function describeSuite(suiteId: string, suite: TestSuiteDef): string {
  const label = suite.description ?? suiteId;
  return `${suiteId}: ${label}`;
}
