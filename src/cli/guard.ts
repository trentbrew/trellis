/**
 * trellis guard — cross-agent file ownership check (ADR 0015).
 *
 * A thin CLI surface over the engine's lane-ownership policy (`trellis/vcs`), so
 * host hooks and OS enforce the identical rule instead of reimplementing it
 * (desk-health-plan workstream D). Exit 1 when a write is denied.
 */
import type { Command } from 'commander';
import chalk from 'chalk';
import { relative, resolve } from 'node:path';
import {
  fileOwnerFor,
  formatCrossAgentOwnershipMessage,
} from '../vcs/lane-ownership.js';
import { loadIdentity } from '../identity/identity.js';
import { resolveRepoRoot } from './repo-path.js';

export function registerGuardCommand(program: Command): void {
  program
    .command('guard')
    .description(
      'Check whether a write to <path> is allowed (cross-agent lane ownership, ADR 0015)',
    )
    .argument('<path>', 'File path the writer intends to modify')
    .option('--agent <id>', 'Writing agent id (defaults to repo identity)')
    .option(
      '--exclude-lane <id>',
      "Ignore this lane (the writer's own)",
      process.env.TRELLIS_LANE_ID,
    )
    .option('--json', 'Emit machine-readable JSON')
    .option('-p, --path <path>', 'Repository path', '.')
    .action((file: string, opts: any) => {
      const rootPath = resolveRepoRoot(opts.path);
      const trellisDir = resolve(rootPath, '.trellis');
      const writerAgent =
        opts.agent ?? loadIdentity(trellisDir)?.entityId ?? 'agent:unknown';
      const rel = relative(rootPath, resolve(rootPath, file));
      const owner = fileOwnerFor(trellisDir, rel, {
        excludeLaneId: opts.excludeLane,
      });
      const allowed = !owner || owner.agentId === writerAgent;
      const reason =
        owner && !allowed
          ? formatCrossAgentOwnershipMessage(rel, owner, writerAgent)
          : owner
            ? `owned by you (${owner.laneId})`
            : 'no conflicting live lane';

      if (opts.json) {
        console.log(
          JSON.stringify(
            { allowed, path: rel, writer: writerAgent, owner: owner ?? null, reason },
            null,
            2,
          ),
        );
      } else if (allowed) {
        console.log(chalk.green(`✓ ${rel} — writable`));
      } else {
        console.error(chalk.red(reason));
      }
      process.exitCode = allowed ? 0 : 1;
    });
}
