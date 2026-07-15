/**
 * trellis lane — Agent Lane CLI (W2)
 */

import type { Command } from 'commander';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { join } from 'path';
import { TrellisVcsEngine } from '../engine.js';
import type { LaneMeta } from '../vcs/lane.js';
import * as lanePromoteMod from '../vcs/lane-promote.js';
import { resolveRepoRoot } from './repo-path.js';
import { PROVENANCE } from '../core/persist/canonical-op.js';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function formatLaneStatus(status: LaneMeta['status']): string {
  switch (status) {
    case 'active':
      return chalk.green('active');
    case 'promoting':
      return chalk.yellow('promoting');
    case 'promoted':
      return chalk.blue('promoted');
    case 'dropped':
      return chalk.dim('dropped');
    default:
      return status;
  }
}

async function openEngine(rootPath: string): Promise<TrellisVcsEngine> {
  const engine = new TrellisVcsEngine({ rootPath, provenance: PROVENANCE.cli });
  engine.open();
  await engine.syncEnvLaneFromEnv();
  return engine;
}

function isStaleLane(lane: LaneMeta): boolean {
  if (lane.status !== 'active') return false;
  if (lane.leaseExpiresAt) {
    return Date.now() > new Date(lane.leaseExpiresAt).getTime();
  }
  const ageMs = Date.now() - new Date(lane.createdAt).getTime();
  return ageMs > 24 * 60 * 60 * 1000;
}

export function registerLaneCommands(program: Command): void {
  const laneCmd = program
    .command('lane')
    .description('Agent lanes — isolated op journals for multi-agent work');

  laneCmd
    .command('fork <parentId>')
    .description('Fork a sibling lane from an existing lane (ADR 0006)')
    .option('--session <id>', 'New session id for the fork')
    .option('--issue <id>', 'Issue id override (default: inherit from parent)')
    .option('--child', 'Child fork from parent lane head (ADR 0007)')
    .option('--worktree <path>', 'Optional git worktree path (W5)')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (parentId, opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const engine = await openEngine(rootPath);

      try {
        const meta = await engine.forkLane(parentId, {
          sessionId: opts.session,
          issueId: opts.issue,
          worktreePath: opts.worktree,
          forkKind: opts.child ? 'child' : 'sibling',
        });

        console.log(chalk.green(`✓ Lane forked: ${chalk.bold(meta.id)}`));
        console.log(`  ${chalk.dim('Parent:')}   ${parentId}`);
        console.log(`  ${chalk.dim('Base:')}     ${meta.baseBranch} @ ${meta.baseOpHash.slice(0, 20)}…`);
        if (meta.issueId) {
          console.log(`  ${chalk.dim('Issue:')}    ${meta.issueId}`);
        }
        if (meta.sessionId) {
          console.log(`  ${chalk.dim('Session:')}  ${meta.sessionId}`);
        }
        if (meta.forkKind) {
          console.log(`  ${chalk.dim('Fork kind:')}  ${meta.forkKind}`);
        }
        if (meta.virtualBaseOpHash) {
          console.log(
            `  ${chalk.dim('Virtual base:')} ${meta.virtualBaseOpHash.slice(0, 20)}…`,
          );
        }
        console.log(
          chalk.dim(`  Enter: trellis lane enter ${meta.id}  |  export TRELLIS_LANE_ID=${meta.id}`),
        );
      } catch (err: unknown) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  laneCmd
    .command('create')
    .description('Create a lane forked from the integration branch head')
    .option('--from <branch>', 'Base branch (default: current)')
    .option('--to <branch>', 'Promotion target branch')
    .option('--issue <id>', 'Link to issue id')
    .option('--session <id>', 'Bind to agent session (Cursor conversation id)')
    .option('--agent <agentId>', 'Agent attribution override')
    .option('--worktree <path>', 'Optional git worktree path (W5)')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const engine = await openEngine(rootPath);

      try {
        const meta = await engine.createLane({
          fromBranch: opts.from,
          targetBranch: opts.to,
          issueId: opts.issue,
          sessionId: opts.session,
          worktreePath: opts.worktree,
        });

        console.log(chalk.green(`✓ Lane created: ${chalk.bold(meta.id)}`));
        console.log(`  ${chalk.dim('Base:')}     ${meta.baseBranch} @ ${meta.baseOpHash.slice(0, 20)}…`);
        console.log(`  ${chalk.dim('Target:')}   ${meta.targetBranch}`);
        if (meta.worktreePath) {
          console.log(`  ${chalk.dim('Worktree:')} ${meta.worktreePath}`);
        }
        if (meta.issueId) {
          console.log(`  ${chalk.dim('Issue:')}    ${meta.issueId}`);
        }
        if (meta.sessionId) {
          console.log(`  ${chalk.dim('Session:')}  ${meta.sessionId}`);
        }
        console.log(
          chalk.dim(`  Enter: trellis lane enter ${meta.id}  |  export TRELLIS_LANE_ID=${meta.id}`),
        );
        if (!meta.worktreePath) {
          console.log(
            chalk.yellow(
              '  No worktree — set lanes.worktreeBind in .trellis/config.json and use a CLI build that includes TRL-40 (bun src/cli/index.ts or rebuild dist).',
            ),
          );
        }
      } catch (err: unknown) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  laneCmd
    .command('ensure')
    .description('Find or create a session-scoped lane (Cursor tab isolation)')
    .requiredOption('--session <id>', 'Session / conversation id')
    .option('--issue <id>', 'Link to issue id')
    .option('--enter', 'Enter the lane after ensure')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const engine = await openEngine(rootPath);

      try {
        const meta = await engine.ensureSessionLane({
          sessionId: opts.session,
          issueId: opts.issue,
          enter: opts.enter,
        });

        console.log(chalk.green(`✓ Session lane: ${chalk.bold(meta.id)}`));
        if (meta.worktreePath) {
          console.log(`  ${chalk.dim('Worktree:')} ${meta.worktreePath}`);
        }
        console.log(
          chalk.dim(`  export TRELLIS_LANE_ID=${meta.id}`),
        );
      } catch (err: unknown) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  laneCmd
    .description('List agent lanes')
    .option('--active', 'Show only active lanes')
    .option('--stale', 'Show only stale active lanes (lease expired or >24h)')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const engine = await openEngine(rootPath);

      let lanes = engine.listLanes();
      if (opts.active) {
        lanes = lanes.filter((l) => l.status === 'active');
      }
      if (opts.stale) {
        lanes = lanes.filter((l) => isStaleLane(l));
      }

      if (lanes.length === 0) {
        console.log(chalk.dim('No lanes'));
        return;
      }

      console.log(chalk.bold('Agent Lanes\n'));
      for (const lane of lanes) {
        const marker =
          engine.getActiveLaneId() === lane.id ? chalk.green('* ') : '  ';
        const opCount = engine.getLaneOpCount(lane.id);
        const issue = lane.issueId ? chalk.dim(` · ${lane.issueId}`) : '';
        console.log(
          `${marker}${chalk.cyan(lane.id)}  ${formatLaneStatus(lane.status)}  ${chalk.dim(`${opCount} ops`)}${issue}`,
        );
        console.log(
          `    ${chalk.dim('fork')} ${lane.baseBranch} · ${formatRelativeTime(lane.createdAt)}`,
        );
        if (lane.parentLaneId) {
          console.log(
            `    ${chalk.dim('from')} ${lane.parentLaneId}${lane.forkKind ? ` (${lane.forkKind})` : ''}`,
          );
        }
        if (lane.worktreePath) {
          console.log(`    ${chalk.dim('worktree')} ${lane.worktreePath}`);
        }
      }
    });

  laneCmd
    .command('enter <id>')
    .description('Enter a lane (route writes to lane journal)')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (id, opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const engine = await openEngine(rootPath);

      try {
        await engine.enterLane(id);
        console.log(chalk.green(`✓ Entered lane ${chalk.bold(id)}`));
        console.log(
          chalk.dim(`  export TRELLIS_LANE_ID=${id}  for subprocess agents`),
        );
      } catch (err: unknown) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  laneCmd
    .command('leave')
    .description('Leave the active lane')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const engine = await openEngine(rootPath);

      const active = engine.getActiveLaneId();
      if (!active) {
        console.log(chalk.dim('No active lane'));
        return;
      }

      await engine.leaveLane();
      console.log(chalk.green(`✓ Left lane ${chalk.bold(active)}`));
    });

  laneCmd
    .command('status')
    .description('Show active lane or a specific lane')
    .argument('[id]', 'Lane id (default: active session)')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (id, opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const engine = await openEngine(rootPath);

      const laneId = id ?? engine.getActiveLaneId();
      if (!laneId) {
        console.log(chalk.dim('No active lane'));
        return;
      }

      const summary = engine.summarizeLane(laneId);
      const { meta, ops, filePaths, integrationHead } = summary;
      const active = engine.getActiveLaneId() === laneId;

      console.log(chalk.bold(`Lane ${meta.id}${active ? chalk.green(' (active)') : ''}\n`));
      console.log(`  ${chalk.dim('Status:')}      ${formatLaneStatus(meta.status)}`);
      console.log(`  ${chalk.dim('Base:')}        ${meta.baseBranch} @ ${meta.baseOpHash}`);
      console.log(`  ${chalk.dim('Target:')}      ${meta.targetBranch}`);
      console.log(`  ${chalk.dim('Head:')}        ${meta.headOpHash ?? '—'}`);
      console.log(`  ${chalk.dim('Ops:')}         ${ops.length} in lane journal`);
      console.log(
        `  ${chalk.dim('Integration:')} ${integrationHead ?? '—'} (${meta.targetBranch} head)`,
      );
      if (meta.issueId) {
        console.log(`  ${chalk.dim('Issue:')}       ${meta.issueId}`);
      }
      if (meta.parentLaneId) {
        console.log(`  ${chalk.dim('Parent:')}      ${meta.parentLaneId}`);
      }
        if (meta.forkKind) {
          console.log(`  ${chalk.dim('Fork kind:')}  ${meta.forkKind}`);
        }
        if (meta.virtualBaseOpHash) {
          console.log(
            `  ${chalk.dim('Virtual base:')} ${meta.virtualBaseOpHash.slice(0, 20)}…`,
          );
        }
      if (meta.sessionId) {
        console.log(`  ${chalk.dim('Session:')}     ${meta.sessionId}`);
      }
      if (meta.agentId) {
        console.log(`  ${chalk.dim('Agent:')}       ${meta.agentId}`);
      }
      if (meta.worktreePath) {
        console.log(`  ${chalk.dim('Worktree:')}   ${meta.worktreePath}`);
      }
      if (filePaths.length > 0) {
        console.log(`  ${chalk.dim('Files:')}       ${filePaths.length} touched`);
      }
      if (active) {
        const mat = engine.getMaterializationStats();
        const cacheLabel = mat.integrationCacheHit
          ? chalk.green('hit')
          : chalk.yellow('miss');
        console.log(
          `  ${chalk.dim('Materialize:')} integration replay ${mat.integrationOpsReplayed} ops (${cacheLabel}), lane overlay ${mat.laneOpsReplayed} ops`,
        );
      }
    });

  laneCmd
    .command('diff <id>')
    .description('Summarize lane journal vs integration head')
    .option('--to <branch>', 'Integration branch (default: lane target)')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (id, opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const engine = await openEngine(rootPath);

      try {
        const { meta, ops, filePaths, integrationHead } = engine.summarizeLane(id);
        const target = opts.to ?? meta.targetBranch;

        console.log(chalk.bold(`Lane diff: ${id}\n`));
        console.log(`  ${chalk.dim('Fork base:')}     ${meta.baseOpHash}`);
        console.log(
          `  ${chalk.dim('Integration head:')} ${integrationHead ?? '—'} (${target})`,
        );
        console.log(`  ${chalk.dim('Lane ops:')}        ${ops.length}`);
        console.log(`  ${chalk.dim('Kinds:')}          ${summarizeOpKinds(ops)}`);

        if (filePaths.length > 0) {
          console.log(`\n  ${chalk.bold('Touched files')}`);
          for (const path of filePaths.slice(0, 20)) {
            console.log(`    ${path}`);
          }
          if (filePaths.length > 20) {
            console.log(chalk.dim(`    … and ${filePaths.length - 20} more`));
          }
        }

        console.log(
          chalk.dim(`\n  Promote: trellis lane promote ${id}`),
        );
      } catch (err: unknown) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  laneCmd
    .command('promote <id>')
    .description('Promote lane ops onto the integration branch')
    .option('--to <branch>', 'Target branch (default: lane target)')
    .option('--dry-run', 'Run conflict detection only; no writes')
    .option('--explain', 'Human-readable conflict report')
    .option('--require-test', 'Run promote.require suites before promoting')
    .option('--force-lock', 'Clear promote lock and proceed (use when lock is stale)')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (id, opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const engine = await openEngine(rootPath);

      try {
        const result = await engine.promoteLane(id, {
          dryRun: opts.dryRun,
          explain: opts.explain,
          toBranch: opts.to,
          requireTest: opts.requireTest,
          forceLock: opts.forceLock,
        });

        if (opts.explain || opts.dryRun || !result.canPromote) {
          console.log(lanePromoteMod.formatPromoteExplain(result));
        }

        if (result.promoted) {
          console.log(
            chalk.green(
              `✓ Promoted ${chalk.bold(id)} — ${result.integrationOpsAppended ?? 0} integration ops`,
            ),
          );
          if (result.gitSync?.committed) {
            console.log(
              `  ${chalk.dim('Git:')}      committed ${result.gitSync.commitHash?.slice(0, 12) ?? ''}`,
            );
          } else if (result.gitSync && !result.gitSync.committed) {
            console.log(chalk.dim('  Git:      working tree already matches integration'));
          }
        } else if (!opts.dryRun && !result.canPromote) {
          process.exit(1);
        } else if (opts.dryRun && !result.canPromote) {
          console.log(chalk.dim('\n  Nothing to promote — add lane ops first'));
        } else if (opts.dryRun && result.canPromote) {
          console.log(chalk.dim('\n  Run without --dry-run to apply'));
        }
      } catch (err: unknown) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  laneCmd
    .command('watch')
    .description('Live lane dashboard in the browser (SSE)')
    .option('-p, --path <path>', 'Repository path', '.')
    .option('--port <port>', 'HTTP port', '3939')
    .option('--poll <ms>', 'Snapshot poll interval (ms)', '1000')
    .option('--no-open', 'Do not auto-open browser')
    .action(async (opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const port = parseInt(opts.port, 10) || 3939;
      const pollMs = parseInt(opts.poll, 10) || 1000;

      const { startLanesDashboard } = await import('../ui/lanes-dashboard.js');

      try {
        const handle = await startLanesDashboard({ rootPath, port, pollMs });
        const url = `http://localhost:${handle.port}/`;

        console.log(chalk.green(`✓ Lane dashboard → ${chalk.bold(url)}`));
        console.log(chalk.dim('  SSE stream: /api/lanes/stream'));
        console.log(chalk.dim('  Press Ctrl+C to stop\n'));

        if (opts.open !== false) {
          const { exec } = await import('child_process');
          const cmd =
            process.platform === 'darwin'
              ? 'open'
              : process.platform === 'win32'
                ? 'start'
                : 'xdg-open';
          exec(`${cmd} ${url}`);
        }

        process.on('SIGINT', () => {
          handle.stop();
          console.log(chalk.dim('\nDashboard stopped.'));
          process.exit(0);
        });
      } catch (err: unknown) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });

  laneCmd
    .command('lock-status')
    .description('Show promote lock status for this repo')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const trellisDir = join(rootPath, '.trellis');
      if (!existsSync(trellisDir)) {
        console.log(chalk.dim('Not a Trellis workspace'));
        process.exit(1);
      }
      const { getPromoteLockStatus } = await import('../vcs/promote-lock.js');
      const status = getPromoteLockStatus(trellisDir);
      if (!status.record) {
        console.log(chalk.dim('No promote lock'));
        return;
      }
      const rec = status.record;
      if (status.locked) {
        console.log(
          chalk.yellow(
            `Locked: lane ${rec.laneId} · pid ${rec.pid} · since ${rec.acquiredAt}`,
          ),
        );
      } else if (status.stale) {
        console.log(
          chalk.dim(
            `Stale lock: lane ${rec.laneId} · pid ${rec.pid} · since ${rec.acquiredAt}`,
          ),
        );
        console.log(chalk.dim('  Use trellis lane promote <id> --force-lock to clear'));
      }
    });

  laneCmd
    .command('drop <id>')
    .description('Drop a lane (archive journal on disk)')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (id, opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const engine = await openEngine(rootPath);

      try {
        await engine.dropLane(id);
        console.log(chalk.green(`✓ Dropped lane ${chalk.bold(id)}`));
      } catch (err: unknown) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    });
}

function summarizeOpKinds(ops: { kind: string }[]): string {
  const counts = new Map<string, number>();
  for (const op of ops) {
    counts.set(op.kind, (counts.get(op.kind) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([kind, n]) => `${kind.replace('vcs:', '')}:${n}`)
    .join(', ');
}
