/**
 * trellis context — budgeted agent orientation pack (TRL-127)
 */

import type { Command } from 'commander';
import chalk from 'chalk';
import {
  assembleContextPack,
  formatContextPackText,
  serializePack,
} from '../context/pack.js';
import {
  ContextPackFocusError,
  type ContextVantage,
} from '../context/types.js';
import { TrellisVcsEngine } from '../engine.js';
import { resolveRepoRoot } from './repo-path.js';
import { PROVENANCE } from '../core/persist/canonical-op.js';

async function openEngine(rootPath: string): Promise<TrellisVcsEngine> {
  const engine = new TrellisVcsEngine({ rootPath, provenance: PROVENANCE.cli });
  engine.open();
  await engine.syncEnvLaneFromEnv();
  return engine;
}

function parseVantage(raw: string | undefined): ContextVantage {
  const v = (raw ?? 'boot') as ContextVantage;
  if (v !== 'boot' && v !== 'edit' && v !== 'review') {
    console.error(
      chalk.red(`Invalid --vantage '${raw}'. Use boot | edit | review.`),
    );
    process.exit(1);
  }
  return v;
}

export function registerContextCommands(program: Command): void {
  const contextCmd = program
    .command('context')
    .description('Token-budgeted agent orientation projections');

  contextCmd
    .command('pack')
    .description(
      'Emit a budgeted context pack (JSON or text) for session boot / edit / review',
    )
    .option('--budget <n>', 'Token budget (chars/4 estimator)', '4000')
    .option(
      '--vantage <name>',
      'boot | edit | review (default: boot)',
      'boot',
    )
    .option('--issue <id>', 'Focus issue id')
    .option('--format <fmt>', 'json | text', 'json')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const engine = await openEngine(rootPath);
      const budgetTokens = parseInt(String(opts.budget), 10);
      if (!Number.isFinite(budgetTokens) || budgetTokens < 1) {
        console.error(chalk.red('--budget must be a positive integer'));
        process.exit(1);
      }

      const vantage = parseVantage(opts.vantage);
      const format = String(opts.format ?? 'json').toLowerCase();
      if (format !== 'json' && format !== 'text') {
        console.error(chalk.red(`Invalid --format '${opts.format}'. Use json | text.`));
        process.exit(1);
      }

      try {
        const pack = assembleContextPack(engine, {
          rootPath,
          budgetTokens,
          vantage,
          issueId: opts.issue,
        });

        if (format === 'text') {
          console.log(formatContextPackText(pack));
        } else {
          console.log(serializePack(pack));
        }
      } catch (err) {
        if (err instanceof ContextPackFocusError) {
          console.error(chalk.red(`✗ ${err.message}`));
          process.exit(1);
        }
        throw err;
      }
    });
}
