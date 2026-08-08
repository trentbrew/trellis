import type { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync, copyFileSync, existsSync } from 'fs';
import { join } from 'path';
import { resolveRepoRoot } from './repo-path.js';
import { TrellisVcsEngine } from '../engine.js';
import { PROVENANCE } from '../core/persist/canonical-op.js';
import { gcOplogMirror } from '../vcs/oplog-mirror.js';
import type { VcsOp } from '../vcs/types.js';

function readJsonl(filePath: string): VcsOp[] {
  const raw = readFileSync(filePath, 'utf-8');
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    return [];
  }

  const lines = trimmed.split('\n').filter(l => l.trim());
  return lines.map(line => JSON.parse(line) as VcsOp);
}

export function registerOpsCommands(program: Command): void {
  const ops = program
    .command('ops')
    .description('Manage VCS operations (op journal)');

  ops
    .command('import')
    .description('Import ops from an external JSONL file into the journal')
    .option('--from <path>', 'Path to JSONL ops file', 'scratch/ops.json')
    .option('-p, --path <path>', 'Repository path', '.')
    .option('--replace', 'Replace entire ops.json with the imported file (default: append)')
    .option('--force', 'Skip hash verification')
    .action(async (opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const fromPath = join(process.cwd(), opts.from);

      if (!existsSync(fromPath)) {
        console.error(chalk.red(`File not found: ${fromPath}`));
        process.exit(1);
      }

      const ops = readJsonl(fromPath);
      if (ops.length === 0) {
        console.error(chalk.red('No ops found in file'));
        process.exit(1);
      }

      if (opts.replace) {
        const opsPath = join(rootPath, '.trellis', 'ops.json');
        if (existsSync(opsPath)) {
          const backup = `${opsPath}.bak.${Date.now()}`;
          copyFileSync(opsPath, backup);
          console.log(chalk.dim(`  Backup: ${backup}`));
        }
        copyFileSync(fromPath, opsPath);

        const engine = new TrellisVcsEngine({ rootPath, provenance: PROVENANCE.cli });
        engine.open();

        console.log(chalk.green(`\u2713 Replaced and replayed ${ops.length} ops`));
        console.log(chalk.dim(`  Ops:        ${engine.getOpCount()}`));
        console.log(chalk.dim(`  Tracked:    ${engine.trackedFiles().length} files`));
        return;
      }

      const engine = new TrellisVcsEngine({ rootPath, provenance: PROVENANCE.cli });
      engine.open();

      const result = await engine.integrateOps(ops);

      console.log(chalk.green(`\u2713 Imported ${result.applied} ops (${result.skipped} skipped, ${result.rejected.length} rejected)`));
      if (result.rejected.length > 0) {
        for (const r of result.rejected) {
          console.error(chalk.red(`  \u2717 ${r.op.hash?.slice(0, 16) || '??'}... ${r.reason}: ${r.message}`));
        }
      }
      console.log(chalk.dim(`  Total:      ${engine.getOpCount()} ops`));
      console.log(chalk.dim(`  Tracked:    ${engine.trackedFiles().length} files`));
    });

  ops
    .command('mirror-gc')
    .description(
      'Prune stale ~/.trellis/oplog-mirror entries (dead scratch/test repos)',
    )
    .option('--dry-run', 'Show what would be removed without deleting')
    .action((opts) => {
      const result = gcOplogMirror(!!opts.dryRun);

      console.log(chalk.bold('Trellis Oplog Mirror GC'));
      console.log();
      console.log(
        `  ${chalk.dim('Removable:')}  ${result.removed} entries (${formatBytes(result.reclaimedBytes)})`,
      );
      console.log(`  ${chalk.dim('Live kept:')}   ${result.kept} entries`);

      if (!opts.dryRun) {
        console.log();
        console.log(
          result.removed > 0
            ? chalk.green(`Pruned ${result.removed} stale mirror entries.`)
            : chalk.green('Mirror is clean.'),
        );
      } else if (result.removed > 0) {
        console.log();
        console.log(chalk.yellow('Dry run only. Re-run without --dry-run to prune.'));
      }
    });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = -1;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unit]}`;
}
