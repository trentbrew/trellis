/**
 * trellis eval — agent evaluation commands
 */

import type { Command } from 'commander';
import chalk from 'chalk';
import { join } from 'path';
import {
  runProfileContextEval,
  loadProfileContextCorpus,
} from '../evals/profile-context-runner.js';
import {
  resolveProfileContextArm,
  type ProfileContextArm,
} from '../scaffold/profile.js';

const ARMS: ProfileContextArm[] = ['off', 'session', 'pack', 'both'];

function parseArm(raw: string | undefined): ProfileContextArm {
  const arm = (raw ?? 'off').toLowerCase() as ProfileContextArm;
  if (!ARMS.includes(arm)) {
    console.error(chalk.red(`Invalid --arm '${raw}'. Use: ${ARMS.join(' | ')}`));
    process.exit(1);
  }
  return arm;
}

export function registerEvalCommands(program: Command): void {
  const evalCmd = program
    .command('eval')
    .description('Agent evaluation harnesses');

  evalCmd
    .command('profile-context')
    .description('Run L1 profile-context corpus against an injection arm')
    .option(
      '--corpus <path>',
      'Path to tasks.jsonl',
      'experiments/profile-context/corpus/tasks.jsonl',
    )
    .option('--arm <name>', 'off | session | pack | both', 'session')
    .option('--trials <n>', 'Runs per task', '1')
    .option(
      '--manifest <path>',
      'Append results to manifest.jsonl',
      'experiments/profile-context/runs/manifest.jsonl',
    )
    .option('--seed <n>', 'Base seed', '0')
    .action((opts) => {
      const arm = parseArm(opts.arm);
      const trials = parseInt(String(opts.trials), 10);
      const seed = parseInt(String(opts.seed), 10);
      if (!Number.isFinite(trials) || trials < 1) {
        console.error(chalk.red('--trials must be a positive integer'));
        process.exit(1);
      }

      const corpusPath = join(process.cwd(), opts.corpus);
      const manifestPath = join(process.cwd(), opts.manifest);

      const prevArm = process.env.TRELLIS_PROFILE_CONTEXT_ARM;
      process.env.TRELLIS_PROFILE_CONTEXT_ARM = arm;

      try {
        const tasks = loadProfileContextCorpus(corpusPath);
        const records = runProfileContextEval({
          corpusPath,
          arm,
          trials,
          manifestPath,
          seed,
        });

        const passed = records.filter((r) => r.outcome === 'success').length;
        const rate = records.length ? (passed / records.length) * 100 : 0;

        console.log(
          chalk.bold(
            `\n  profile-context eval · arm=${arm} · ${passed}/${records.length} passed (${rate.toFixed(1)}%)\n`,
          ),
        );
        for (const r of records) {
          const mark = r.outcome === 'success' ? chalk.green('✓') : chalk.red('✗');
          console.log(
            `  ${mark} ${r.taskId} · context=${r.metrics.contextIncludesProfile} · rubric=${r.metrics.rubricPass}`,
          );
          if (r.metrics.rubricFailures.length) {
            console.log(chalk.dim(`      ${r.metrics.rubricFailures.join(', ')}`));
          }
        }
        console.log(chalk.dim(`\n  corpus: ${tasks.length} tasks · manifest: ${manifestPath}\n`));

        if (passed < records.length) process.exit(1);
      } finally {
        if (prevArm === undefined) delete process.env.TRELLIS_PROFILE_CONTEXT_ARM;
        else process.env.TRELLIS_PROFILE_CONTEXT_ARM = prevArm;
      }
    });
}
