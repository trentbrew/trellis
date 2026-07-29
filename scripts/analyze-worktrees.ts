#!/usr/bin/env bun
/**
 * Analyze worktrees to identify safe cleanup candidates.
 *
 * This script identifies worktrees that can be safely removed:
 * - Promoted lanes (work completed and integrated)
 * - Dropped lanes (explicitly abandoned)
 * - Active lanes with 0 ops and old age (likely abandoned)
 * - Active lanes with few ops and old age (potentially stalled)
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

interface LaneMeta {
  id: string;
  status: 'active' | 'promoted' | 'dropped';
  headOpHash?: string;
  worktreePath?: string;
  updatedAt: string;
  baseBranch: string;
  targetBranch: string;
}

interface WorktreeCandidate {
  laneId: string;
  status: string;
  ops: number;
  issue?: string;
  age: string;
  worktree: string;
  size: string;
  reason: string;
}

function getLaneMetas(trellisDir: string): LaneMeta[] {
  const lanesDir = join(trellisDir, 'lanes');
  if (!existsSync(lanesDir)) return [];

  const metas: LaneMeta[] = [];
  const entries = readdirSync(lanesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('lane-')) continue;

    try {
      const metaFile = join(lanesDir, entry.name, 'meta.json');
      const content = readFileSync(metaFile, 'utf-8');
      const meta = JSON.parse(content) as LaneMeta;
      metas.push(meta);
    } catch (e) {
      // Skip invalid files
    }
  }

  return metas;
}

function getWorktreeSize(path: string): string {
  if (!existsSync(path)) return '0B';
  try {
    const { execSync } = require('child_process');
    const output = execSync(`du -sk "${path}"`, { encoding: 'utf-8' });
    const kb = parseInt(output.split('\t')[0].trim(), 10);
    if (kb === 0) return '0B';
    if (kb < 1024) return `${kb}KB`;
    if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)}MB`;
    return `${(kb / (1024 * 1024)).toFixed(2)}GB`;
  } catch {
    return 'unknown';
  }
}

function getWorktreeAgeDays(path: string): number {
  if (!existsSync(path)) return 0;
  try {
    const stats = statSync(path);
    const ageMs = Date.now() - stats.mtimeMs;
    return Math.floor(ageMs / (24 * 60 * 60 * 1000));
  } catch {
    return 0;
  }
}

function getLaneAgeDays(updatedAt: string): number {
  try {
    const updated = new Date(updatedAt);
    const ageMs = Date.now() - updated.getTime();
    return Math.floor(ageMs / (24 * 60 * 60 * 1000));
  } catch {
    return 0;
  }
}

function getOpCount(trellisDir: string, laneId: string): number {
  const laneOpsFile = join(trellisDir, 'lanes', `${laneId}.ops.json`);
  if (!existsSync(laneOpsFile)) return 0;

  try {
    const content = readFileSync(laneOpsFile, 'utf-8');
    const ops = JSON.parse(content);
    return Array.isArray(ops) ? ops.length : 0;
  } catch {
    return 0;
  }
}

function extractIssueFromLaneId(laneId: string): string | undefined {
  // Try to find issue reference from lane metadata or context
  // For now, return undefined as we'd need to parse more complex metadata
  return undefined;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i];
}

function main() {
  const trellisDir = join(process.cwd(), '.trellis');
  console.log('Analyzing worktrees for safe cleanup candidates...\n');

  const lanes = getLaneMetas(trellisDir);
  console.log(`Found ${lanes.length} lanes\n`);

  const candidates: WorktreeCandidate[] = [];

  for (const lane of lanes) {
    if (!lane.worktreePath) continue;

    const size = getWorktreeSize(lane.worktreePath);
    const worktreeAge = getWorktreeAgeDays(lane.worktreePath);
    const laneAge = getLaneAgeDays(lane.updatedAt);
    const ops = getOpCount(trellisDir, lane.id);

    let reason: string | null = null;

    // Safe: Promoted lanes
    if (lane.status === 'promoted') {
      reason = 'Promoted - work completed and integrated';
    }
    // Safe: Dropped lanes
    else if (lane.status === 'dropped') {
      reason = 'Dropped - explicitly abandoned';
    }
    // Likely abandoned: Active with 0 ops and old
    else if (lane.status === 'active' && ops === 0 && laneAge >= 7) {
      reason = `Active but 0 ops, ${laneAge} days old - likely abandoned`;
    }
    // Potentially stalled: Active with few ops and very old
    else if (lane.status === 'active' && ops <= 5 && laneAge >= 30) {
      reason = `Active with only ${ops} ops, ${laneAge} days old - potentially stalled`;
    }

    if (reason) {
      candidates.push({
        laneId: lane.id,
        status: lane.status,
        ops,
        issue: extractIssueFromLaneId(lane.id),
        age: `${laneAge}d`,
        worktree: lane.worktreePath,
        size,
        reason,
      });
    }
  }

  if (candidates.length === 0) {
    console.log('No safe cleanup candidates found.');
    console.log('\nAll lanes with worktrees are either:');
    console.log('  - Active with recent activity');
    console.log('  - Active with significant ops (in use)');
    console.log('  - Too young to be considered stale');
    return;
  }

  // Group by reason
  const byReason = new Map<string, WorktreeCandidate[]>();
  for (const candidate of candidates) {
    if (!byReason.has(candidate.reason)) {
      byReason.set(candidate.reason, []);
    }
    byReason.get(candidate.reason)!.push(candidate);
  }

  // Calculate total savings (only for existing worktrees)
  let totalSize = 0;
  let existingCount = 0;
  for (const candidate of candidates) {
    if (!existsSync(candidate.worktree)) continue;

    const sizeMatch = candidate.size.match(/^([\d.]+)([KMG]B)?$/);
    if (sizeMatch) {
      const [, value, unit = 'B'] = sizeMatch;
      const num = parseFloat(value);
      const multiplier =
        unit === 'GB'
          ? 1024 ** 3
          : unit === 'MB'
            ? 1024 ** 2
            : unit === 'KB'
              ? 1024
              : 1;
      totalSize += num * multiplier;
      existingCount++;
    }
  }

  console.log(`Found ${candidates.length} safe cleanup candidates:\n`);

  for (const [reason, group] of byReason.entries()) {
    console.log(`\n${reason}`);
    console.log('─'.repeat(reason.length));

    let groupSize = 0;
    for (const candidate of group) {
      const sizeMatch = candidate.size.match(/^([\d.]+)([KMG]B)?$/);
      if (sizeMatch) {
        const [, value, unit = 'B'] = sizeMatch;
        const num = parseFloat(value);
        const multiplier =
          unit === 'GB'
            ? 1024 ** 3
            : unit === 'MB'
              ? 1024 ** 2
              : unit === 'KB'
                ? 1024
                : 1;
        groupSize += num * multiplier;
      }

      console.log(`  ${candidate.laneId}`);
      console.log(
        `    Status: ${candidate.status}, ${candidate.ops} ops, ${candidate.age} old`,
      );
      console.log(`    Worktree: ${candidate.worktree}`);
      console.log(`    Size: ${candidate.size}`);
      console.log();
    }

    console.log(`  Group total: ${formatBytes(groupSize)}\n`);
  }

  console.log('═'.repeat(50));
  console.log(`Total potential savings: ${formatBytes(totalSize)}`);
  console.log(
    `Total worktrees to clean: ${existingCount} (of ${candidates.length} candidates)`,
  );
  console.log('\nTo clean up these worktrees, you can:');
  console.log('1. Promote/close the associated issues (automatic cleanup)');
  console.log(
    '2. Manually remove worktrees: git worktree remove --force <path>',
  );
  console.log(
    '3. Use: trellis lane prune-worktrees (after closing/promoting lanes)',
  );
}

main();
