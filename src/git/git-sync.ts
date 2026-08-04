/**
 * Git Sync — commit the working tree to the target branch (ADR 0038).
 *
 * Git is the sole authority over file bytes. Sync never materializes op-log
 * state over disk: it stages the actual working tree and commits it, then
 * optionally pushes. The op-log is not consulted for file content.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { isGitRepo } from '../vcs/lane-worktree.js';
import type { LaneMeta } from '../vcs/lane.js';
import type { VcsOp } from '../vcs/types.js';

export interface GitSyncOptions {
  rootPath: string;
  branch?: string;
  remote?: string;
  authorName?: string;
  authorEmail?: string;
  /** Commit message body (first line becomes subject). */
  message: string;
  /** Push after commit when true and remote configured. */
  push?: boolean;
  /** Skip commit when working tree matches HEAD (default true). */
  skipIfClean?: boolean;
}

export interface GitSyncResult {
  committed: boolean;
  commitHash?: string;
  pushed: boolean;
  /** Number of files staged from the working tree. */
  filesMaterialized: number;
}

export interface PromoteCommitMessageParams {
  lane: LaneMeta;
  laneOps: VcsOp[];
  issueTitle?: string;
}

/** Build a git commit message from lane promote context + op log summary. */
export function buildPromoteCommitMessage(
  params: PromoteCommitMessageParams,
): string {
  const { lane, laneOps, issueTitle } = params;
  const issueRef = lane.issueId
    ? lane.issueId.replace(/^issue:/, '').toUpperCase()
    : undefined;
  const subjectParts: string[] = [];
  if (issueRef) subjectParts.push(issueRef);
  if (issueTitle) subjectParts.push(issueTitle);
  else subjectParts.push('lane promote');

  const subject = subjectParts.join(': ').slice(0, 72);
  const fileOps = laneOps.filter((op) =>
    /file(Add|Modify|Delete|Rename)/.test(op.kind),
  );
  const kindCounts = summarizeOpKinds(laneOps);

  const lines = [
    subject,
    '',
    `Promoted ${laneOps.length} ops from ${lane.id} onto ${lane.targetBranch}.`,
    `Agent: ${lane.agentId}`,
  ];
  if (lane.sessionId) {
    lines.push(`Session: ${lane.sessionId}`);
  }
  if (kindCounts) {
    lines.push(`Ops: ${kindCounts}`);
  }
  if (fileOps.length > 0) {
    lines.push('');
    lines.push('Files:');
    const paths = [
      ...new Set(
        fileOps
          .map((op) => op.vcs?.filePath ?? op.vcs?.oldFilePath)
          .filter((p): p is string => Boolean(p)),
      ),
    ];
    for (const path of paths.slice(0, 12)) {
      lines.push(`  ${path}`);
    }
    if (paths.length > 12) {
      lines.push(`  … and ${paths.length - 12} more`);
    }
  }
  return lines.join('\n');
}

function summarizeOpKinds(ops: VcsOp[]): string {
  const counts = new Map<string, number>();
  for (const op of ops) {
    const short = op.kind.replace(/^vcs:/, '');
    counts.set(short, (counts.get(short) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([kind, n]) => `${kind}:${n}`)
    .join(', ');
}

function git(rootPath: string, command: string): string {
  return execSync(`git -C "${rootPath}" ${command}`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function escapeMessage(msg: string): string {
  return msg.replace(/"/g, '\\"');
}

function ensureGitUser(rootPath: string, name: string, email: string): void {
  try {
    git(rootPath, 'config user.email');
  } catch {
    git(rootPath, `config user.email "${email}"`);
  }
  try {
    git(rootPath, 'config user.name');
  } catch {
    git(rootPath, `config user.name "${name}"`);
  }
}

/**
 * Commit the actual working tree to `branch`, and optionally push to `remote`.
 *
 * The working tree is the source of truth (ADR 0038): no op-log state is
 * materialized over disk. `filesMaterialized` reports the number of files
 * staged from disk, so callers can gauge what the commit captured.
 */
export function syncIntegrationToGit(
  opts: GitSyncOptions,
): GitSyncResult {
  if (!isGitRepo(opts.rootPath)) {
    return { committed: false, pushed: false, filesMaterialized: 0 };
  }

  const branch = opts.branch ?? 'main';
  const authorName = opts.authorName ?? 'TrellisVCS';
  const authorEmail = opts.authorEmail ?? 'trellis@local.dev';

  ensureGitUser(opts.rootPath, authorName, authorEmail);

  try {
    git(opts.rootPath, `checkout ${branch}`);
  } catch {
    try {
      git(opts.rootPath, `checkout -B ${branch}`);
    } catch {
      // best-effort — repo may use master or detached HEAD
    }
  }

  git(opts.rootPath, 'add -A');
  const status = git(opts.rootPath, 'status --porcelain');
  const stagedCount = status
    .split('\n')
    .filter((line) => line.trim().length > 0).length;

  if (opts.skipIfClean !== false && stagedCount === 0) {
    let pushed = false;
    if (opts.push && opts.remote) {
      pushed = tryPush(opts.rootPath, opts.remote, branch);
    }
    return {
      committed: false,
      pushed,
      filesMaterialized: stagedCount,
    };
  }

  const subject = opts.message.split('\n')[0] ?? 'trellis sync';
  git(
    opts.rootPath,
    `commit -m "${escapeMessage(subject)}" -m "${escapeMessage(opts.message)}"`,
  );
  const commitHash = git(opts.rootPath, 'rev-parse HEAD');

  let pushed = false;
  if (opts.push && opts.remote) {
    pushed = tryPush(opts.rootPath, opts.remote, branch);
  }

  return {
    committed: true,
    commitHash,
    pushed,
    filesMaterialized: stagedCount,
  };
}

function tryPush(rootPath: string, remote: string, branch: string): boolean {
  try {
    git(rootPath, `push ${remote} ${branch}`);
    return true;
  } catch {
    return false;
  }
}

/** Resolve integration branch head from ops. */
export function resolveIntegrationHead(
  ops: VcsOp[],
  branchName: string,
): string | undefined {
  for (let i = ops.length - 1; i >= 0; i--) {
    const op = ops[i]!;
    if (
      op.kind === 'vcs:branchAdvance' &&
      op.vcs?.branchName === branchName &&
      op.vcs?.targetOpHash
    ) {
      return op.vcs.targetOpHash;
    }
  }
  return undefined;
}

export interface GitSyncConfig {
  syncOnPromote?: boolean;
  pushOnClose?: boolean;
  remote?: string;
  branch?: string;
}

export function readGitSyncConfig(
  rootPath: string,
): GitSyncConfig | undefined {
  const configPath = join(rootPath, '.trellis', 'config.json');
  if (!existsSync(configPath)) return undefined;
  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8')) as {
      git?: GitSyncConfig;
    };
    return raw.git;
  } catch {
    return undefined;
  }
}
