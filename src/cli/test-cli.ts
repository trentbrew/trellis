/**
 * `trellis test` — manifest-driven test runner with vcs:testRun ops.
 */

import chalk from 'chalk';
import { TrellisVcsEngine } from '../engine.js';
import {
  listSuiteIds,
  loadTestManifest,
  resolveReviewLadder,
  resolveSuite,
  suiteTimeoutMs,
  type TestManifest,
} from '../vcs/test-manifest.js';
import {
  describeSuite,
  executeTestCommand,
} from '../vcs/test-runner.js';
import { resolveRepoRoot } from './repo-path.js';

async function openEngine(rootPath: string): Promise<TrellisVcsEngine> {
  const engine = new TrellisVcsEngine({ rootPath });
  engine.open();
  await engine.syncEnvLaneFromEnv();
  return engine;
}

function formatTestStatus(status: 'passed' | 'failed'): string {
  return status === 'passed' ? chalk.green('✓ PASSED') : chalk.red('✗ FAILED');
}

async function runShellOnlySuites(
  manifest: TestManifest,
  rootPath: string,
  suiteIds: string[],
): Promise<number> {
  let exitCode = 0;
  for (const suiteId of suiteIds) {
    const suite = resolveSuite(manifest, suiteId);
    console.log(chalk.bold(`\n${suiteId}`));
    console.log(chalk.dim(`  $ ${suite.command}`));

    const result = await executeTestCommand({
      command: suite.command,
      cwd: rootPath,
      timeoutMs: suiteTimeoutMs(suite),
    });
    console.log(`  exit ${result.exitCode}`);
    if (result.status === 'failed') {
      exitCode = 1;
      for (const line of result.output.split('\n').slice(0, 8)) {
        console.log(chalk.dim(`    ${line}`));
      }
    }
  }
  return exitCode;
}

export function registerTestCommands(program: import('commander').Command): void {
  program
    .command('test')
    .description('Run test suites from .trellis/tests.json')
    .argument('[suite]', 'Suite id (default: defaultSuite or all suites)')
    .option('--list', 'List configured suites')
    .option('--all', 'Run every suite in the manifest')
    .option('--review', 'Run review ladder (check then e2e from manifest.review)')
    .option(
      '--shell-only',
      'Execute suite commands directly without vcs:testRun (fast / pipeline evidence)',
    )
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (suite: string | undefined, opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const manifest = loadTestManifest(rootPath);

      if (!manifest) {
        console.error(
          chalk.red('No .trellis/tests.json found. Add a test manifest first.'),
        );
        process.exit(1);
      }

      if (opts.list) {
        console.log(chalk.bold('Test suites:\n'));
        for (const id of listSuiteIds(manifest)) {
          const def = manifest.suites[id];
          const kind = def.kind === 'browser' ? chalk.magenta(' [browser]') : '';
          console.log(`  ${chalk.cyan(id)}${kind}  ${describeSuite(id, def)}`);
          console.log(`    ${chalk.dim('$')} ${def.command}`);
        }
        if (manifest.defaultSuite) {
          console.log(
            chalk.dim(`\nDefault suite: ${manifest.defaultSuite}`),
          );
        }
        const required = manifest.promote?.require ?? [];
        if (required.length > 0) {
          console.log(
            chalk.dim(`Promote requires: ${required.join(', ')}`),
          );
        }
        if (manifest.review) {
          console.log(
            chalk.dim(
              `Review ladder: ${manifest.review.check ?? '(infer)'} → ${manifest.review.e2e ?? '(infer)'}`,
            ),
          );
        }
        return;
      }

      if (opts.review) {
        const ladder = resolveReviewLadder(manifest);
        const suiteIds = [ladder.checkSuiteId, ladder.e2eSuiteId];
        console.log(
          chalk.bold(
            `Review ladder: ${ladder.checkSuiteId} → ${ladder.e2eSuiteId}\n`,
          ),
        );

        if (opts.shellOnly) {
          const code = await runShellOnlySuites(manifest, rootPath, suiteIds);
          process.exit(code === 0 ? 0 : 1);
        }

        const engine = await openEngine(rootPath);
        const editRoot = engine.getEditRoot();
        if (editRoot !== rootPath) {
          console.log(chalk.dim(`Edit root: ${editRoot}\n`));
        }

        let exitCode = 0;
        const results = await engine.runTests({ suiteIds });
        for (const r of results) {
          const label = r.suite ?? r.command;
          console.log(`  ${formatTestStatus(r.status)}  ${label}`);
          console.log(`    ${chalk.dim('$')} ${r.command}`);
          console.log(`    exit ${r.exitCode ?? (r.status === 'passed' ? 0 : 1)}`);
          if (r.status === 'failed') exitCode = 1;
        }
        process.exit(exitCode === 0 ? 0 : 1);
      }

      if (opts.shellOnly && suite) {
        const code = await runShellOnlySuites(manifest, rootPath, [suite]);
        process.exit(code === 0 ? 0 : 1);
      }

      const engine = await openEngine(rootPath);
      const editRoot = engine.getEditRoot();
      if (editRoot !== rootPath) {
        console.log(chalk.dim(`Edit root: ${editRoot}\n`));
      }

      let suiteIds: string[];
      if (opts.all) {
        suiteIds = listSuiteIds(manifest);
      } else if (suite) {
        resolveSuite(manifest, suite);
        suiteIds = [suite];
      } else if (manifest.defaultSuite) {
        suiteIds = [manifest.defaultSuite];
      } else {
        suiteIds = listSuiteIds(manifest);
      }

      if (suiteIds.length === 0) {
        console.error(chalk.red('No suites configured in tests.json'));
        process.exit(1);
      }

      console.log(chalk.bold(`Running ${suiteIds.length} suite(s)...\n`));
      let exitCode = 0;

      try {
        const results = await engine.runTests({ suiteIds });
        for (const r of results) {
          const label = r.suite ?? r.command;
          console.log(`  ${formatTestStatus(r.status)}  ${label}`);
          console.log(`    ${chalk.dim('$')} ${r.command}`);
          if (r.durationMs !== undefined) {
            console.log(chalk.dim(`    (${r.durationMs}ms)`));
          }
          if (r.status === 'failed' && r.output) {
            for (const line of r.output.split('\n').slice(0, 5)) {
              console.log(`    ${chalk.dim(line)}`);
            }
          }
          if (r.status === 'failed') exitCode = 1;
        }

        const passed = results.filter((r) => r.status === 'passed').length;
        console.log();
        if (passed === results.length) {
          console.log(
            chalk.green(`All ${results.length} suite(s) passed.`),
          );
        } else {
          console.log(
            chalk.yellow(`${passed}/${results.length} suite(s) passed.`),
          );
        }
      } catch (err: unknown) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }

      if (exitCode !== 0) process.exit(exitCode);
    });
}
