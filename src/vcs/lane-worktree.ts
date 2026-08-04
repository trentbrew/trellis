/**
 * Per-lane git worktree provisioning (ADR 0014 Phase 2 / W5).
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

export function laneShortId(laneId: string): string {
  return laneId.replace(/^lane-/, '').slice(0, 8);
}

export function laneGitBranch(laneId: string): string {
  return `lane/${laneShortId(laneId)}`;
}

export function defaultWorktreePath(trellisDir: string, laneId: string): string {
  return join(trellisDir, 'worktrees', laneShortId(laneId));
}

export function isGitRepo(rootPath: string): boolean {
  return existsSync(join(rootPath, '.git'));
}

function git(rootPath: string, command: string): string {
  return execSync(`git -C "${rootPath}" ${command}`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

export function resolveBaseRef(rootPath: string, baseBranch: string): string {
  try {
    return git(rootPath, `rev-parse ${baseBranch}`);
  } catch {
    return git(rootPath, 'rev-parse HEAD');
  }
}

function isRegisteredWorktree(rootPath: string, worktreePath: string): boolean {
  try {
    const list = git(rootPath, 'worktree list --porcelain');
    return list.split('\n').some((line) => line === `worktree ${worktreePath}`);
  } catch {
    return false;
  }
}

export function provisionWorktree(opts: {
  rootPath: string;
  worktreePath: string;
  branch: string;
  baseRef: string;
}): void {
  if (
    existsSync(opts.worktreePath) &&
    isRegisteredWorktree(opts.rootPath, opts.worktreePath)
  ) {
    return;
  }

  mkdirSync(dirname(opts.worktreePath), { recursive: true });

  const branchExists = (() => {
    try {
      git(opts.rootPath, `rev-parse --verify ${opts.branch}`);
      return true;
    } catch {
      return false;
    }
  })();

  if (branchExists) {
    git(
      opts.rootPath,
      `worktree add "${opts.worktreePath}" ${opts.branch}`,
    );
  } else {
    git(
      opts.rootPath,
      `worktree add -b ${opts.branch} "${opts.worktreePath}" ${opts.baseRef}`,
    );
  }
}

export function removeWorktree(opts: {
  rootPath: string;
  worktreePath: string;
  branch?: string;
  deleteBranch?: boolean;
}): void {
  if (existsSync(opts.worktreePath)) {
    try {
      git(opts.rootPath, `worktree remove --force "${opts.worktreePath}"`);
    } catch {
      // best-effort cleanup
    }
  }

  if (opts.deleteBranch && opts.branch) {
    try {
      git(opts.rootPath, `branch -D ${opts.branch}`);
    } catch {
      // branch may already be merged or absent
    }
  }
}

/**
 * Commit whatever the agent left in the worktree (ADR 0038).
 *
 * The working tree is the source of truth for file bytes: auto-saving it
 * ensures the lane branch captures the agent's edits even when the agent
 * never ran an explicit `git commit`. No-ops when the worktree is clean.
 */
export function commitWorktree(
  worktreePath: string,
  message: string,
): { committed: boolean; commitHash?: string } {
  if (!existsSync(worktreePath) || !isGitRepo(worktreePath)) {
    return { committed: false };
  }
  git(worktreePath, 'add -A');
  const dirty = git(worktreePath, 'status --porcelain').trim().length > 0;
  if (!dirty) {
    return { committed: false };
  }
  const subject = message.split('\n')[0] ?? 'trellis sync';
  git(
    worktreePath,
    `commit -m "${subject.replace(/"/g, '\\"')}" -m "${message.replace(/"/g, '\\"')}"`,
  );
  return {
    committed: true,
    commitHash: git(worktreePath, 'rev-parse HEAD'),
  };
}

/**
 * Merge a lane branch into the current HEAD of the main worktree (ADR 0038).
 *
 * The lane branch holds the agent's actual bytes; the merge (not the op-log)
 * is what moves those bytes to the integration head. `up-to-date` means no
 * new commit was needed; `failed` means a merge conflict — the caller should
 * abort the promote (git is the authority, so a conflicted merge cannot be
 * papered over with a synthesized file state).
 */
export function mergeLaneWorktree(
  rootPath: string,
  branch: string,
  message: string,
): 'merged' | 'up-to-date' | 'failed' {
  if (!isGitRepo(rootPath)) {
    return 'failed';
  }
  const subject = (message.split('\n')[0] ?? 'trellis: merge lane').replace(
    /"/g,
    '\\"',
  );
  try {
    const before = revParseHead(rootPath);
    git(rootPath, `merge --no-ff -m "${subject}" ${branch}`);
    const after = revParseHead(rootPath);
    return before === after ? 'up-to-date' : 'merged';
  } catch {
    try {
      git(rootPath, 'merge --abort');
    } catch {
      // leave the tree untouched on abort failure
    }
    return 'failed';
  }
}

/** Resolve the current HEAD commit of a worktree/repo. */
export function revParseHead(rootPath: string): string {
  return git(rootPath, 'rev-parse HEAD');
}
