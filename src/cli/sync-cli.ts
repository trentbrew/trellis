/**
 * Sync CLI Commands (TRL-334)
 *
 * CLI interface for the sync daemon and realtime sync operations.
 */

import { Command } from 'commander';
import { SyncDaemon } from '../sync/sync-daemon.js';
import { QuarantineStore } from '../vcs/sync-policy.js';
import { readFileSync } from 'fs';
import { resolveRepoRoot } from './repo-path.js';
import { opsPathForRoot } from '../vcs/oplog-remote.js';
import type { VcsOp } from '../vcs/types.js';

let daemonInstance: SyncDaemon | null = null;

export function registerSyncCommands(program: Command): void {
  const sync = program
    .command('realtime-sync')
    .description('Realtime sync daemon and operations');

  sync
    .command('start')
    .description('Start background sync daemon')
    .option(
      '-u, --url <url>',
      'WebSocket server URL',
      'ws://localhost:8231/sync',
    )
    .option('-i, --interval <ms>', 'Sync interval in ms', '1000')
    .option('--bootstrap', 'Enable automatic bootstrap for empty remotes')
    .action(async (opts) => {
      const repoPath = resolveRepoRoot();
      const peerId = `local-${Date.now()}`;

      const readOps = (): VcsOp[] => {
        const opsPath = opsPathForRoot(repoPath);
        const raw = readFileSync(opsPath, 'utf-8');
        const lines = raw
          .trim()
          .split('\n')
          .filter((l) => l.trim());
        return lines.map((line) => JSON.parse(line) as VcsOp);
      };

      const integrateOps = async (ops: VcsOp[]): Promise<void> => {
        const opsPath = opsPathForRoot(repoPath);
        const existingOps = readOps();
        const existingHashes = new Set(existingOps.map((op) => op.hash));
        const newOps = ops.filter((op) => !existingHashes.has(op.hash));

        if (newOps.length === 0) return;

        const lines = newOps.map((op) => JSON.stringify(op));
        const content = lines.join('\n') + '\n';
        // Append to ops file
        const { appendFileSync } = await import('fs');
        appendFileSync(opsPath, content);
      };

      daemonInstance = new SyncDaemon({
        url: opts.url,
        localPeerId: peerId,
        getLocalOps: readOps,
        onOpsReceived: integrateOps,
        syncInterval: parseInt(opts.interval, 10),
        rootPath: repoPath,
        enableBootstrap: opts.bootstrap,
      });

      await daemonInstance.start();
      console.log('Sync daemon running. Press Ctrl+C to stop.');

      // Keep process alive
      process.on('SIGINT', () => {
        console.log('\nStopping sync daemon...');
        daemonInstance?.stop();
        process.exit(0);
      });
    });

  sync
    .command('status')
    .description('Show sync daemon status')
    .action(() => {
      if (!daemonInstance) {
        console.log('Sync daemon not running');
        return;
      }

      const state = daemonInstance.getState();
      console.log('Sync daemon status:');
      console.log(`  Running: ${state.running}`);
      console.log(`  Connected: ${state.connected}`);
      console.log(`  Last sync: ${state.lastSyncTime ?? 'never'}`);
      console.log(`  Sync count: ${state.syncCount}`);
      console.log(`  Quarantine count: ${state.quarantineCount}`);
    });

  sync
    .command('pause')
    .description('Pause sync daemon')
    .action(() => {
      if (!daemonInstance) {
        console.log('Sync daemon not running');
        return;
      }

      daemonInstance.stop();
      console.log('Sync daemon paused');
    });

  sync
    .command('quarantine')
    .description('List quarantined changes')
    .action(() => {
      const quarantine = new QuarantineStore();
      const entries = quarantine.getAll();

      if (entries.length === 0) {
        console.log('No quarantined changes');
        return;
      }

      console.log(`Quarantined changes (${entries.length}):`);
      for (const entry of entries) {
        console.log(`  ${entry.id}: ${entry.risk.risk} - ${entry.risk.reason}`);
        console.log(`    Source: ${entry.sourcePeerId}`);
        console.log(`    Time: ${entry.timestamp}`);
        console.log(`    Reviewed: ${entry.reviewed}`);
      }
    });

  sync
    .command('apply')
    .description('Apply a quarantined change')
    .argument('<id>', 'Quarantine entry ID')
    .action(async (id) => {
      if (!daemonInstance) {
        console.error('Sync daemon not running');
        process.exit(1);
      }

      try {
        await daemonInstance.applyQuarantine(id);
        console.log(`Applied quarantined change ${id}`);
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    });

  sync
    .command('reject')
    .description('Reject a quarantined change')
    .argument('<id>', 'Quarantine entry ID')
    .action((id) => {
      const quarantine = new QuarantineStore();

      try {
        quarantine.markReviewed(id);
        quarantine.remove(id);
        console.log(`Rejected quarantined change ${id}`);
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    });

  sync
    .command('bootstrap')
    .description('Explicitly bootstrap a remote environment')
    .option(
      '-u, --url <url>',
      'WebSocket server URL',
      'ws://localhost:8231/sync',
    )
    .action(async (opts) => {
      const repoPath = resolveRepoRoot();
      const peerId = `local-${Date.now()}`;

      const readOps = (): VcsOp[] => {
        const opsPath = opsPathForRoot(repoPath);
        const raw = readFileSync(opsPath, 'utf-8');
        const lines = raw
          .trim()
          .split('\n')
          .filter((l) => l.trim());
        return lines.map((line) => JSON.parse(line) as VcsOp);
      };

      const integrateOps = async (ops: VcsOp[]): Promise<void> => {
        const opsPath = opsPathForRoot(repoPath);
        const existingOps = readOps();
        const existingHashes = new Set(existingOps.map((op) => op.hash));
        const newOps = ops.filter((op) => !existingHashes.has(op.hash));

        if (newOps.length === 0) return;

        const lines = newOps.map((op) => JSON.stringify(op));
        const content = lines.join('\n') + '\n';
        const { appendFileSync } = await import('fs');
        appendFileSync(opsPath, content);
      };

      const bootstrapDaemon = new SyncDaemon({
        url: opts.url,
        localPeerId: peerId,
        getLocalOps: readOps,
        onOpsReceived: integrateOps,
        rootPath: repoPath,
        enableBootstrap: true,
      });

      try {
        await bootstrapDaemon.bootstrap();
        console.log('Bootstrap complete');
      } catch (err) {
        console.error('Bootstrap failed:', err);
        process.exit(1);
      }
    });
}
