/**
 * Per-lane worktree provisioning (ADR 0014 Phase 2 / W5).
 *
 * Materialization: a Btrfs reflink clone of the full repo (falls back to a
 * plain `cp -r` off-btrfs) instead of `git worktree add`. Each lane gets an
 * independent `.git`, not a worktree sharing refs with rootPath — so merging
 * a lane branch back requires an explicit `fetch` from the clone first (see
 * mergeLaneWorktree). Spiked and verified end-to-end before this swap;
 * `commitWorktree` needed no changes — it already just runs `git add -A &&
 * git commit` against whatever path it's handed.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';

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

/**
 * Btrfs reflink clone of rootPath; falls back to a plain copy off-btrfs.
 *
 * `worktreePath` lives under `rootPath/.trellis/worktrees/<id>` by default
 * (see defaultWorktreePath), so a whole-tree `cp rootPath worktreePath`
 * would copy rootPath into its own descendant — `cp` refuses outright
 * ("cannot copy a directory into itself"). Copying entries individually and
 * skipping `.trellis` sidesteps that; it's also the right behavior anyway —
 * nothing in the clone (provisionWorktree/commitWorktree/mergeLaneWorktree)
 * ever reads `.trellis`, only `.git`.
 */
function cloneReflink(rootPath: string, worktreePath: string): void {
  mkdirSync(worktreePath, { recursive: true });
  for (const entry of readdirSync(rootPath)) {
    if (entry === '.trellis') continue;
    const src = join(rootPath, entry);
    const dst = join(worktreePath, entry);
    try {
      execSync(`cp --reflink=always -r "${src}" "${dst}"`, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      execSync(`cp -r "${src}" "${dst}"`, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    }
  }
}

export function provisionWorktree(opts: {
  rootPath: string;
  worktreePath: string;
  branch: string;
  baseRef: string;
}): void {
  if (existsSync(opts.worktreePath) && isGitRepo(opts.worktreePath)) {
    return;
  }

  cloneReflink(opts.rootPath, opts.worktreePath);

  const branchExists = (() => {
    try {
      git(opts.worktreePath, `rev-parse --verify ${opts.branch}`);
      return true;
    } catch {
      return false;
    }
  })();

  if (branchExists) {
    git(opts.worktreePath, `checkout ${opts.branch}`);
  } else {
    git(opts.worktreePath, `checkout -b ${opts.branch} ${opts.baseRef}`);
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
      rmSync(opts.worktreePath, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }

  if (opts.deleteBranch && opts.branch) {
    try {
      git(opts.rootPath, `branch -D ${opts.branch}`);
    } catch {
      // branch may already be merged, absent, or never fetched into rootPath
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
 *
 * `worktreePath` is now an independent reflink clone, not a git worktree —
 * its branch isn't visible in rootPath's ref namespace until fetched.
 * Spiked and confirmed: `fetch` + `merge --no-ff` produces the same merge
 * graph a worktree-based merge would.
 */
export function mergeLaneWorktree(
  rootPath: string,
  worktreePath: string,
  branch: string,
  message: string,
): 'merged' | 'up-to-date' | 'failed' {
  if (!isGitRepo(rootPath) || !isGitRepo(worktreePath)) {
    return 'failed';
  }
  const subject = (message.split('\n')[0] ?? 'trellis: merge lane').replace(
    /"/g,
    '\\"',
  );
  try {
    const before = revParseHead(rootPath);
    git(rootPath, `fetch "${worktreePath}" +${branch}:${branch}`);
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
