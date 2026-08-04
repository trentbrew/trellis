/**
 * trellis remote — default sprite peer for integration JSONL (TRL-235).
 */

import type { Command } from 'commander';
import chalk from 'chalk';
import { resolveRepoRoot } from './repo-path.js';
import { TrellisVcsEngine } from '../engine.js';
import { PROVENANCE } from '../core/persist/canonical-op.js';
import {
  addRemote,
  getDefaultRemote,
  installPulledOps,
  pullRemoteLedger,
  pushRemoteLedger,
  remoteStatus,
} from '../vcs/oplog-remote.js';
import { deployLedgerSprite } from '../server/deploy-ledger.js';

export function registerRemoteCommands(program: Command): void {
  const remote = program
    .command('remote')
    .description('Remote ledger peer (sprite) — push / pull / status');

  remote
    .command('add <url>')
    .description('Configure default remote sprite URL')
    .option('--name <name>', 'Remote name', 'default')
    .option('--repo-id <id>', 'Remote repo id (defaults to repo hash)')
    .option('--owner <owner>', 'Owner entity id (identity:<did>) for identity-indexing')
    .option('--repo <repo>', 'Repo slug under the owner ({peer}/{repo} right half)')
    .option('--api-key <key>', 'API key (also stored in .trellis/remote.json)')
    .option('-p, --path <path>', 'Repository path', '.')
    .action((url, opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const peer = addRemote(rootPath, url, {
        name: opts.name,
        repoId: opts.repoId,
        apiKey: opts.apiKey,
        owner: opts.owner,
        repo: opts.repo,
      });
      console.log(chalk.green(`✓ Remote ${chalk.bold(opts.name)} configured`));
      console.log(`  ${chalk.dim('URL:')}    ${peer.url}`);
      console.log(`  ${chalk.dim('Repo:')}   ${peer.repoId}`);
      if (peer.owner && peer.repo) {
        console.log(`  ${chalk.dim('Project:')} ${peer.owner}/${peer.repo}`);
      }
    });

  remote
    .command('status')
    .description('Compare local vs remote tail')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const peer = getDefaultRemote(rootPath);
      if (!peer) {
        console.log(chalk.dim('No default remote configured.'));
        return;
      }
      const status = await remoteStatus(rootPath);
      console.log(chalk.bold('Remote status\n'));
      console.log(`  ${chalk.dim('Remote:')} ${peer.url}`);
      if (status.local) {
        console.log(
          `  ${chalk.dim('Local:')}  ${status.local.tailHash.slice(0, 20)}… (${status.local.lineCount} ops)`,
        );
      } else {
        console.log(`  ${chalk.dim('Local:')}  (empty)`);
      }
      if (status.remote) {
        console.log(
          `  ${chalk.dim('Remote:')} ${status.remote.tailHash.slice(0, 20)}… (${status.remote.lineCount} ops)`,
        );
      } else {
        console.log(`  ${chalk.dim('Remote:')} (no tail)`);
      }
      if (status.synced) {
        console.log(chalk.green('\n✓ Tails match'));
      } else if (status.diverged) {
        console.log(chalk.yellow('\n⚠ Tails diverged'));
      }
    });

  remote
    .command('push')
    .description('Push integration journal to default remote')
    .option('--dry-run', 'Validate without uploading')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const engine = new TrellisVcsEngine({ rootPath, provenance: PROVENANCE.cli });
      engine.open();

      const result = await pushRemoteLedger(rootPath, undefined, {
        dryRun: opts.dryRun,
      });
      if (!opts.dryRun) {
        await engine.recordRemotePush({
          remoteName: 'default',
          remoteRepoId: getDefaultRemote(rootPath)?.repoId,
          remoteTailHash: result.tailHash,
        });
      }

      if (result.pushed) {
        console.log(chalk.green(`✓ Pushed tail ${result.tailHash.slice(0, 20)}…`));
      } else {
        console.log(chalk.dim('Remote already has local tail.'));
      }
    });

  remote
    .command('pull')
    .description('Pull remote checkpoint to ops.json.pulled')
    .option('--to <path>', 'Output path')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const engine = new TrellisVcsEngine({ rootPath, provenance: PROVENANCE.cli });
      engine.open();

      const result = await pullRemoteLedger(rootPath, undefined, { to: opts.to });
      await engine.recordRemotePull({
        remoteName: 'default',
        remoteRepoId: getDefaultRemote(rootPath)?.repoId,
        remoteTailHash: result.tailHash,
      });

      console.log(
        chalk.green(
          `✓ Pulled ${result.lineCount} ops → ${result.path} (tail ${result.tailHash.slice(0, 20)}…)`,
        ),
      );
    });

  remote
    .command('install')
    .description('Install pulled journal as integration ops.json')
    .option('--from <path>', 'Pulled file path')
    .option('--force', 'Replace even if local tail is newer')
    .option('-p, --path <path>', 'Repository path', '.')
    .action((opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const result = installPulledOps(rootPath, {
        from: opts.from,
        force: opts.force,
      });
      console.log(chalk.green(`✓ Installed journal from ${result.from}`));
      if (result.backup) {
        console.log(chalk.dim(`  Backup: ${result.backup}`));
      }
    });

  remote
    .command('provision')
    .description('Deploy ledger sprite and configure default remote')
    .requiredOption('--name <name>', 'Sprite slug for ledger handler')
    .option('--stub', 'Stub deploy (local config only)')
    .option('-p, --path <path>', 'Repository path', '.')
    .action(async (opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const deployed = await deployLedgerSprite({
        name: opts.name,
        configDir: rootPath,
        stub: opts.stub,
        onProgress: (msg) => console.log(chalk.dim(msg)),
      });
      const peer = addRemote(rootPath, deployed.url, {
        apiKey: deployed.apiKey,
      });
      console.log(chalk.green('✓ Remote provisioned'));
      console.log(`  ${chalk.dim('URL:')}  ${peer.url}`);
      console.log(`  ${chalk.dim('Repo:')} ${peer.repoId}`);
      console.log(`  ${chalk.dim('Key:')}  ${deployed.apiKey}`);
    });
}
