import chalk from 'chalk';
import type { Command } from 'commander';
import { join } from 'path';
import { BlobStore } from '../vcs/blob-store.js';
import { BlobResolver } from '../vcs/blob-resolver.js';
import { LaneOpLog, JsonOpLog } from '../vcs/op-log.js';
import { listLaneIds, laneDir } from '../vcs/lane.js';
import type { VcsOp } from '../vcs/types.js';
import { resolveRepoRoot } from './repo-path.js';

export interface BlobStorageStats {
  totalBlobs: number;
  totalBytes: number;
  referencedBlobs: number;
  referencedBytes: number;
  unreferencedBlobs: number;
  unreferencedBytes: number;
  missingReferencedBlobs: number;
  gitResolvedBlobs: number;
  gitResolvedBytes: number;
}

function collectHashesFromOp(op: VcsOp, into: Set<string>): void {
  const vcs = op.vcs;
  if (!vcs) return;
  if (vcs.contentHash) into.add(vcs.contentHash);
  if (vcs.oldContentHash) into.add(vcs.oldContentHash);
  if (vcs.facts) {
    for (const fact of vcs.facts) {
      if (fact.a === 'contentHash' && typeof fact.v === 'string') {
        into.add(fact.v);
      }
    }
  }
}

function readAllRepoOps(rootPath: string): VcsOp[] {
  const trellisDir = join(rootPath, '.trellis');
  const integrationLog = new JsonOpLog(join(trellisDir, 'ops.json'));
  integrationLog.load();
  const ops = integrationLog.readAll();
  for (const laneId of listLaneIds(trellisDir)) {
    const log = new LaneOpLog(laneDir(trellisDir, laneId));
    log.load();
    ops.push(...log.readAll());
  }
  return ops;
}

export function collectReferencedBlobHashes(rootPath: string): Set<string> {
  const hashes = new Set<string>();
  for (const op of readAllRepoOps(rootPath)) {
    collectHashesFromOp(op, hashes);
  }
  return hashes;
}

export function inspectBlobStorage(
  rootPath: string,
  blobResolver?: BlobResolver | null,
): BlobStorageStats {
  const trellisDir = join(rootPath, '.trellis');
  const store = blobResolver?.getBlobStore() ?? new BlobStore(trellisDir);
  if (!store) return emptyStats();
  const existing = store.listHashes();
  const referenced = collectReferencedBlobHashes(rootPath);

  let referencedBytes = 0;
  let unreferencedBytes = 0;
  let unreferencedBlobs = 0;
  let missingReferencedBlobs = 0;
  let referencedBlobs = 0;
  let gitResolvedBlobs = 0;
  let gitResolvedBytes = 0;

  const existingSet = new Set(existing);
  for (const hash of referenced) {
    if (!existingSet.has(hash)) {
      missingReferencedBlobs += 1;
      continue;
    }
    referencedBlobs += 1;
    const size = store.size(hash) ?? 0;
    referencedBytes += size;
    if (blobResolver && !blobResolver.hasLocal(hash)) {
      gitResolvedBlobs += 1;
      gitResolvedBytes += size;
    }
  }

  for (const hash of existing) {
    if (referenced.has(hash)) continue;
    unreferencedBlobs += 1;
    unreferencedBytes += store.size(hash) ?? 0;
  }

  return {
    totalBlobs: existing.length,
    totalBytes: store.totalSize(),
    referencedBlobs,
    referencedBytes,
    unreferencedBlobs,
    unreferencedBytes,
    missingReferencedBlobs,
    gitResolvedBlobs,
    gitResolvedBytes,
  };
}

function emptyStats(): BlobStorageStats {
  return {
    totalBlobs: 0,
    totalBytes: 0,
    referencedBlobs: 0,
    referencedBytes: 0,
    unreferencedBlobs: 0,
    unreferencedBytes: 0,
    missingReferencedBlobs: 0,
    gitResolvedBlobs: 0,
    gitResolvedBytes: 0,
  };
}

export function pruneUnreferencedBlobs(rootPath: string): {
  deletedBlobs: number;
  deletedBytes: number;
} {
  const trellisDir = join(rootPath, '.trellis');
  const store = new BlobStore(trellisDir);
  const referenced = collectReferencedBlobHashes(rootPath);
  let deletedBlobs = 0;
  let deletedBytes = 0;

  for (const hash of store.listHashes()) {
    if (referenced.has(hash)) continue;
    deletedBytes += store.size(hash) ?? 0;
    if (store.delete(hash)) deletedBlobs += 1;
  }

  return { deletedBlobs, deletedBytes };
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

export function registerStorageCommand(program: Command): void {
  program
    .command('storage')
    .description(
      'Inspect blob-store usage and optionally prune unreferenced blobs',
    )
    .option('-p, --path <path>', 'Repository path', '.')
    .option('--prune', 'Delete unreferenced blobs from .trellis/blobs')
    .action((opts) => {
      const rootPath = resolveRepoRoot(opts.path);
      const before = inspectBlobStorage(rootPath);

      console.log(chalk.bold('Trellis Blob Storage'));
      console.log();
      console.log(`  ${chalk.dim('Repo:')}               ${rootPath}`);
      console.log(`  ${chalk.dim('Total blobs:')}        ${before.totalBlobs}`);
      console.log(
        `  ${chalk.dim('Referenced:')}         ${before.referencedBlobs} (${formatBytes(before.referencedBytes)})`,
      );
      if (before.gitResolvedBlobs > 0) {
        console.log(
          `  ${chalk.dim('Git-resolved:')}       ${before.gitResolvedBlobs} (${formatBytes(before.gitResolvedBytes)})`,
        );
      }
      console.log(
        `  ${chalk.dim('Unreferenced:')}       ${before.unreferencedBlobs} (${formatBytes(before.unreferencedBytes)})`,
      );
      console.log(
        `  ${chalk.dim('Store size:')}         ${formatBytes(before.totalBytes)}`,
      );
      if (before.missingReferencedBlobs > 0) {
        console.log(
          `  ${chalk.dim('Missing referenced:')} ${chalk.yellow(String(before.missingReferencedBlobs))}`,
        );
      }

      if (!opts.prune) {
        console.log();
        console.log(
          before.unreferencedBlobs > 0
            ? chalk.yellow(
                'Dry run only. Re-run with --prune to reclaim unreferenced blob storage.',
              )
            : chalk.green('No unreferenced blobs found.'),
        );
        return;
      }

      const deleted = pruneUnreferencedBlobs(rootPath);
      const after = inspectBlobStorage(rootPath);
      console.log();
      console.log(
        chalk.green(
          `Deleted ${deleted.deletedBlobs} blob(s), reclaimed ${formatBytes(deleted.deletedBytes)}.`,
        ),
      );
      console.log(
        `  ${chalk.dim('New store size:')}     ${formatBytes(after.totalBytes)}`,
      );
      console.log(
        `  ${chalk.dim('Remaining orphans:')} ${after.unreferencedBlobs}`,
      );
    });
}
