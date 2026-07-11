/**
 * `trellis browser` — desk relay + live-tab verify via Trellis extension.
 */

import chalk from 'chalk';
import { TrellisVcsEngine } from '../engine.js';
import { createBrowserRelay } from '../desk/browser-relay.js';
import { loadBrowserSteps } from '../desk/browser-steps.js';
import {
  DEFAULT_BROWSER_RELAY_URL,
  DEFAULT_BROWSER_SMOKE_STEPS,
} from '../desk/browser-types.js';
import {
  relayHealth,
  runBrowserVerifyViaRelay,
} from '../desk/browser-verify-client.js';
import { resolveRepoRoot } from './repo-path.js';

async function openEngine(rootPath: string): Promise<TrellisVcsEngine> {
  const engine = new TrellisVcsEngine({ rootPath });
  engine.open();
  await engine.syncEnvLaneFromEnv();
  return engine;
}

function printVerifyOutput(output: string) {
  for (const line of output.split('\n')) {
    console.log(`  ${chalk.dim(line)}`);
  }
}

export function registerBrowserCommands(program: import('commander').Command): void {
  const browserCmd = program
    .command('browser')
    .description('Live-tab browser verify via Trellis Chrome extension');

  browserCmd
    .command('relay')
    .description('Start desk browser relay (extension connects via WebSocket)')
    .option('-p, --port <port>', 'Listen port', '7420')
    .option('--host <host>', 'Bind host', '127.0.0.1')
    .action(async (opts) => {
      const port = Number(opts.port);
      const relay = await createBrowserRelay({ port, host: opts.host });
      console.log(chalk.green('Browser relay listening'));
      console.log(chalk.dim(`  HTTP  ${relay.url}/browser/verify`));
      console.log(chalk.dim(`  WS    ws://${opts.host}:${port}/browser`));
      console.log(chalk.dim('  Load Trellis extension — it connects automatically.'));

      const shutdown = async () => {
        await relay.close();
        process.exit(0);
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    });

  browserCmd
    .command('verify')
    .description('Run verify steps in the active browser tab via extension relay')
    .argument('[suite]', 'Browser suite id (default: browser-smoke)')
    .option('-p, --path <path>', 'Repository path', '.')
    .option('--relay <url>', 'Relay base URL', DEFAULT_BROWSER_RELAY_URL)
    .option('--steps-file <path>', 'Override steps JSON path')
    .option('--no-record', 'Skip vcs:testRun op')
    .option('--timeout <ms>', 'Job timeout ms', '30000')
    .action(async (suite: string | undefined, opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const suiteId = suite ?? 'browser-smoke';
      const relayUrl = opts.relay as string;

      const health = await relayHealth(relayUrl);
      if (!health.ok) {
        console.error(
          chalk.red(
            `Browser relay unreachable at ${relayUrl}. Run: trellis browser relay`,
          ),
        );
        process.exit(1);
      }
      if (!health.extensionConnected) {
        console.error(
          chalk.red(
            'Trellis extension not connected. Load unpacked extension in Chrome.',
          ),
        );
        process.exit(1);
      }

      console.log(chalk.bold(`Browser verify: ${suiteId}\n`));

      if (opts.record !== false) {
        try {
          const engine = await openEngine(rootPath);
          const results = await engine.runTests({ suiteIds: [suiteId] });
          const result = results[0];
          if (result?.output) printVerifyOutput(result.output);
          console.log();
          if (result?.status === 'passed') {
            console.log(chalk.green('✓ PASSED'));
            if (result.testRunId) {
              console.log(chalk.dim(`Recorded ${result.testRunId}`));
            }
            process.exit(0);
          }
          console.log(chalk.red('✗ FAILED'));
          process.exit(result?.exitCode ?? 1);
        } catch (err) {
          // Fall through to direct verify when manifest missing browser suite
          if (suiteId !== 'browser-smoke') {
            console.error(chalk.red((err as Error).message));
            process.exit(1);
          }
        }
      }

      let steps = DEFAULT_BROWSER_SMOKE_STEPS;
      try {
        steps = loadBrowserSteps(rootPath, suiteId, opts.stepsFile);
      } catch (err) {
        if (opts.stepsFile) {
          console.error(chalk.red((err as Error).message));
          process.exit(1);
        }
      }

      const result = await runBrowserVerifyViaRelay({
        relayUrl,
        suiteId,
        steps,
        timeoutMs: Number(opts.timeout),
      });

      printVerifyOutput(result.output);
      console.log();
      if (result.ok) {
        console.log(chalk.green('✓ PASSED'));
        process.exit(0);
      }
      console.log(chalk.red('✗ FAILED'));
      if (result.error) console.log(chalk.red(`  ${result.error}`));
      process.exit(result.exitCode);
    });
}
