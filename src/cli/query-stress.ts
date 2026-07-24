/**
 * trellis query stress — query path regression battery
 */

import type { Command } from 'commander';
import chalk from 'chalk';
import { TrellisVcsEngine } from '../engine.js';
import { runQueryStress } from '../query/stress.js';
import { resolveRepoRoot } from './repo-path.js';
import { PROVENANCE } from '../core/persist/canonical-op.js';

async function openEngine(rootPath: string): Promise<TrellisVcsEngine> {
  const engine = new TrellisVcsEngine({ rootPath, provenance: PROVENANCE.cli });
  engine.open();
  await engine.syncEnvLaneFromEnv();
  return engine;
}

export function registerQueryStressCommand(program: Command): void {
  program
    .command('query-stress')
    .description(
      'Run query-path regression battery (EQL-S, childOf, context pack budget)',
    )
    .option('-p, --path <path>', 'Repository path', '.')
    .option('--budget <n>', 'Context pack token budget', '4000')
    .option('--json', 'Output JSON report')
    .option('--require-child-of', 'Fail when no childOf links exist')
    .option('--require-decisions', 'Fail when no Decision entities exist')
    .action(async (opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const engine = await openEngine(rootPath);
      const budgetTokens = parseInt(String(opts.budget), 10);
      if (!Number.isFinite(budgetTokens) || budgetTokens < 1) {
        console.error(chalk.red('--budget must be a positive integer'));
        process.exit(1);
      }

      const report = runQueryStress(engine, rootPath, {
        budgetTokens,
        requireChildOf: Boolean(opts.requireChildOf),
        requireDecisions: Boolean(opts.requireDecisions),
      });

      if (opts.json) {
        console.log(JSON.stringify(report, null, 2));
        process.exit(report.ok ? 0 : 1);
        return;
      }

      console.log(chalk.cyan.bold('Query path stress'));
      console.log(chalk.dim(`  repo: ${rootPath}\n`));

      for (const check of report.checks) {
        const icon = check.ok ? chalk.green('✓') : chalk.red('✗');
        const timing =
          check.ms != null ? chalk.dim(` (${check.ms.toFixed(1)}ms)`) : '';
        console.log(`  ${icon} ${check.name}${timing}`);
        console.log(chalk.dim(`      ${check.detail}`));
      }

      console.log();
      if (report.ok) {
        console.log(chalk.green(`All ${report.checks.length} checks passed.`));
        process.exit(0);
      } else {
        const failed = report.checks.filter((c) => !c.ok).map((c) => c.name);
        console.error(
          chalk.red(`Failed: ${failed.join(', ')}`),
        );
        process.exit(1);
      }
    });
}
