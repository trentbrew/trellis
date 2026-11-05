/**
 * bwrap isolation for interactive lane sessions — the sandboxing half of
 * the reflink-clone materialization swap in lane-worktree.ts.
 *
 * Mirrors turtleos's `tbox`/turtle-sandbox script: isolated mount/pid/net
 * namespaces, no network by default, nothing outside the lane clone is
 * writable. Does not bind $HOME — a global ~/.gitconfig (user.name/email)
 * won't be visible inside the sandbox, so a manual `git commit` run from
 * inside it needs `-c user.name=... -c user.email=...`. The auto-commit
 * trellis does on the way out (ADR 0038) runs in the outer process, where
 * $HOME is visible, so it's unaffected.
 */
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';

export interface LaneShellOptions {
  worktreePath: string;
  laneId: string;
  /** Allow network access inside the sandbox. Default: no network. */
  net?: boolean;
  /** Shell to exec. Default: $SHELL, falling back to /bin/bash. */
  shell?: string;
}

/** Runs an interactive shell inside the lane clone, isolated via bwrap. Returns its exit code. */
export function runLaneShell(opts: LaneShellOptions): number {
  const args: string[] = [
    '--ro-bind', '/usr', '/usr',
    '--ro-bind', '/etc', '/etc',
    '--proc', '/proc',
    '--dev', '/dev',
    '--tmpfs', '/tmp',
    '--bind', opts.worktreePath, opts.worktreePath,
    '--chdir', opts.worktreePath,
    '--unshare-all',
    '--die-with-parent',
    '--setenv', 'TRELLIS_LANE_ID', opts.laneId,
  ];

  for (const dir of ['/bin', '/lib', '/lib64']) {
    if (existsSync(dir)) args.push('--ro-bind', dir, dir);
  }

  if (opts.net) {
    args.push('--share-net');
  }

  args.push(opts.shell ?? process.env.SHELL ?? '/bin/bash');

  const result = spawnSync('bwrap', args, { stdio: 'inherit' });
  return result.status ?? 1;
}
