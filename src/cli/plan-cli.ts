/**
 * trellis plan — capture cross-IDE plan artifacts into repo-durable ADR-shaped docs
 */

import type { Command } from 'commander';
import chalk from 'chalk';
import { relative } from 'path';
import { TrellisVcsEngine } from '../engine.js';
import { PROVENANCE } from '../core/persist/canonical-op.js';
import { resolveRepoRoot } from './repo-path.js';
import {
  PLAN_ORIGINS,
  capturePlanArtifact,
  linkPlanToIssue,
  scaffoldPlanArtifact,
  type PlanOrigin,
} from '../plan/index.js';

const ORIGINS: PlanOrigin[] = [
  'cursor',
  'claude',
  'opencode',
  'antigravity',
  'gemini',
  'codex',
  'path',
];

function parseOrigin(raw: string | undefined): PlanOrigin {
  const id = (raw ?? 'path').toLowerCase() as PlanOrigin;
  if (!ORIGINS.includes(id)) {
    console.error(
      chalk.red(`Invalid --from '${raw}'. Use: ${ORIGINS.join(' | ')}`),
    );
    process.exit(1);
  }
  return id;
}

export function registerPlanCommands(program: Command): void {
  const planCmd = program
    .command('plan')
    .description(
      'Capture IDE plan artifacts into docs/plans/ and link Trellis issues',
    );

  planCmd
    .command('origins')
    .description('List known per-IDE plan artifact locations')
    .option('--json', 'Emit JSON')
    .action((opts) => {
      if (opts.json) {
        console.log(JSON.stringify(PLAN_ORIGINS, null, 2));
        return;
      }
      console.log(chalk.bold('\n  Plan artifact origins\n'));
      for (const o of PLAN_ORIGINS) {
        console.log(`  ${chalk.cyan(o.id.padEnd(12))} ${o.label}`);
        console.log(chalk.dim(`    path:  ${o.defaultGlob}`));
        console.log(chalk.dim(`    scope: ${o.scope}`));
        console.log(chalk.dim(`    note:  ${o.notes}`));
        console.log('');
      }
      console.log(
        chalk.dim(
          '  Canonical repo target: docs/plans/<issue-id>-plan.md (ADR-shaped)',
        ),
      );
    });

  planCmd
    .command('scaffold')
    .description('Create an empty ADR-shaped plan doc for an issue')
    .argument('<issue>', 'Issue ID (e.g. TRL-334)')
    .option('-p, --path <path>', 'Repository path', '.')
    .option('--overwrite', 'Replace existing plan artifact')
    .option('--link', 'Append plan wiki-link to issue description')
    .action(async (issueId, opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const engine = new TrellisVcsEngine({
        rootPath,
        provenance: PROVENANCE.cli,
      });
      engine.open();

      const issue = engine.getIssue(issueId);
      if (!issue) {
        console.error(chalk.red(`Issue not found: ${issueId}`));
        process.exit(1);
      }

      const absPath = scaffoldPlanArtifact(rootPath, issue, opts.overwrite);
      console.log(
        chalk.green(
          `✓ Plan scaffold: ${chalk.bold(relative(rootPath, absPath))}`,
        ),
      );

      if (opts.link) {
        await linkPlanToIssue(engine, issueId);
        console.log(chalk.green(`✓ Linked ${chalk.bold(issueId)} → plan doc`));
      }
    });

  planCmd
    .command('capture')
    .description(
      'Copy/sync a plan from Cursor, Claude, OpenCode, Antigravity, Gemini CLI, or Codex',
    )
    .requiredOption('--issue <id>', 'Issue ID to attach (e.g. TRL-334)')
    .option(
      '--from <origin>',
      'cursor | claude | opencode | antigravity | gemini | codex | path',
      'path',
    )
    .option('--path <file>', 'Explicit source file (required when --from path)')
    .option(
      '--session <id>',
      'Antigravity brain uuid or Codex rollout jsonl path',
    )
    .option('--title <text>', 'Override plan title in frontmatter')
    .option(
      '--status <status>',
      'proposed | accepted | superseded | rejected',
      'proposed',
    )
    .option('-p, --repo <path>', 'Repository path', '.')
    .option('--overwrite', 'Replace existing docs/plans/<issue>-plan.md')
    .option('--no-link', 'Skip appending plan wiki-link to issue description')
    .option('--dry-run', 'Resolve paths only; do not write')
    .action(async (opts) => {
      const origin = parseOrigin(opts.from);
      if (origin === 'path' && !opts.path) {
        console.error(chalk.red('--path is required when --from path'));
        process.exit(1);
      }

      const rootPath = resolveRepoRoot(opts.repo);
      const engine = new TrellisVcsEngine({
        rootPath,
        provenance: PROVENANCE.cli,
      });
      engine.open();

      if (!engine.getIssue(opts.issue)) {
        console.error(chalk.red(`Issue not found: ${opts.issue}`));
        process.exit(1);
      }

      const result = capturePlanArtifact({
        rootPath,
        issueId: opts.issue,
        origin,
        sourcePath: opts.path,
        session: opts.session,
        title: opts.title,
        status: opts.status,
        overwrite: opts.overwrite,
        dryRun: opts.dryRun,
      });

      if (opts.dryRun) {
        console.log(chalk.yellow('Dry run — no files written'));
        console.log(`  source: ${result.sourcePath}`);
        console.log(`  target: ${result.relPath}`);
        return;
      }

      console.log(
        chalk.green(`✓ Captured plan → ${chalk.bold(result.relPath)}`),
      );
      console.log(chalk.dim(`  from: ${result.sourcePath}`));

      if (opts.link !== false) {
        await linkPlanToIssue(engine, opts.issue);
        console.log(
          chalk.green(`✓ Linked ${chalk.bold(opts.issue)} in issue graph`),
        );
      }
    });

  planCmd
    .command('link')
    .description(
      'Link an existing in-repo plan file to an issue (no copy; for .opencode/plans/)',
    )
    .requiredOption('--issue <id>', 'Issue ID')
    .option(
      '--plan <path>',
      'Plan file relative to repo (default: docs/plans/<issue>-plan.md)',
    )
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const engine = new TrellisVcsEngine({
        rootPath,
        provenance: PROVENANCE.cli,
      });
      engine.open();

      if (!engine.getIssue(opts.issue)) {
        console.error(chalk.red(`Issue not found: ${opts.issue}`));
        process.exit(1);
      }

      await linkPlanToIssue(engine, opts.issue, opts.plan);
      console.log(
        chalk.green(
          `✓ Issue ${chalk.bold(opts.issue)} references ${opts.plan ?? 'docs/plans/<issue>-plan.md'}`,
        ),
      );
    });
}
