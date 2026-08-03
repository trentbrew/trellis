import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Harness-facing tool decision authority.
 *
 * The kernel owns the RULES; harnesses own the PLUMBING. A harness tool
 * executor calls `canToolRun()` synchronously before a tool executes; the
 * returned decision is final. No policy logic belongs in the harness — this
 * module is the single rulebook (see docs/planning/trellis-tui-fork-cycle.md).
 *
 * Prevention is layered: shell hygiene (zsh alias / PATH shim) covers the
 * human's terminal, this authority covers harness tools, and the op-log
 * watcher detects anything that slips past both. The kernel is not an
 * execution point — it cannot stop a raw `git reset`; it makes destruction
 * hard and unjournaled state unpromotable.
 */

export type ToolDecision =
  | { allow: true }
  | {
      allow: false;
      deny: true;
      reason: string;
      /** The sanctioned alternative to suggest (e.g. `trellis lane promote`). */
      redirect?: string;
    }
  | { allow: false; prompt: true; message: string; confirmLabel: string };

export interface ToolInvocation {
  /** Harness tool name: `bash`, `git`, `trellis`, `write`, `edit`, ... */
  tool: string;
  /** Raw tool args; `bash` carries `command`, `git` carries a subcommand. */
  args: Record<string, unknown>;
  /** Working directory the tool would run in. */
  cwd: string;
}

export interface AuthorityContext {
  agentId?: string;
  sessionId?: string;
  laneId?: string;
  /** Explicit Trellis root; when omitted, derived by walking up from cwd. */
  trellisRoot?: string | null;
}

/** Direct git mutations on a Trellis-owned tree (mirrors the shell guard). */
export const GIT_MUTATION_PATTERN =
  /(^|\s)git(?:\s+-C\s+\S+)?\s+(stash|checkout|switch|merge|rebase|commit|reset|cherry-pick|pull|fetch(?:\s+[-]{1,2}all)?)\b/;

/** The sanctioned git path inside a Trellis workspace. */
const SANCTIONED_GIT_SYNC_PATTERN = /\btrellis\s+git\s+sync\b/;

/** Direct writes into `.trellis/` (the op-log / journal must only be touched by the engine). */
export const TRELLIS_DIR_MUTATION_PATTERN =
  /(^|\s)(rm|mv|cp|sed|tee|truncate)\b[^\n]*[\s/]\.?\.trellis\b/;

/** Destructive trellis commands that require an explicit human confirm. */
export const TRELLIS_DESTRUCTIVE_PATTERN =
  /\btrellis\b[^\n|;&]*\b(lane\s+drop|repair|branch\s+(-d|--delete)|db\s+(create|update|delete))\b/;

const DESTRUCTIVE_ESCAPE_PATTERN = /(--confirm-destructive\b|TRELLIS_CONFIRM_DESTRUCTIVE=1\b)/;

/** Sanctioned promotion/mirror commands, never blocked. */
const SANCTIONED_TRELLIS_PATTERN = /\btrellis\s+(lane\s+promote|git\s+sync)\b/;

/**
 * Walk up from `start` to the nearest directory containing a `.trellis/config.json`
 * (the documented repo marker). Returns the canonical root, or null.
 */
export function findTrellisRoot(start: string): string | null {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  let dir = resolve(start);
  while (true) {
    if (existsSync(resolve(dir, '.trellis', 'config.json'))) {
      if (dir === home && resolve(start) !== home) {
        /* skip home-rooted repos unless the start path IS home */
      } else {
        return dir;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Extract the command string from a tool invocation ('' when not a command). */
function commandOf(inv: ToolInvocation): string {
  if (inv.tool === 'bash' || inv.tool === 'shell') {
    return typeof inv.args.command === 'string' ? inv.args.command : '';
  }
  if (inv.tool === 'git') {
    const sub = inv.args.subcommand ?? inv.args.git ?? inv.args.command;
    return typeof sub === 'string' && sub ? `git ${sub}` : '';
  }
  if (inv.tool === 'trellis') {
    const sub = inv.args.subcommand ?? inv.args.command;
    return typeof sub === 'string' && sub ? `trellis ${sub}` : '';
  }
  return '';
}

/** Resolve the directory a git `-C` flag targets (else the invocation cwd). */
function gitTargetDir(command: string, cwd: string): string {
  const m = command.match(/^git\s+-C\s+(\S+)/);
  return m ? resolve(cwd, m[1]) : cwd;
}

/** Harnesses may omit cwd; fall back to the process cwd rather than crash. */
function cwdOf(inv: ToolInvocation): string {
  return typeof inv.cwd === 'string' && inv.cwd ? inv.cwd : process.cwd();
}

/**
 * The single decision point. Pure and synchronous — harnesses call this at
 * pre-tool time; unit tests cover the full matrix without any harness.
 */
export function canToolRun(
  inv: ToolInvocation,
  ctx: AuthorityContext = {},
): ToolDecision {
  const command = commandOf(inv);
  if (!command) return { allow: true };

  // R1 — never touch `.trellis/` directly.
  if (TRELLIS_DIR_MUTATION_PATTERN.test(command)) {
    return {
      allow: false,
      deny: true,
      reason: 'Direct .trellis/ edits are blocked — the journal is engine-owned.',
      redirect: 'trellis',
    };
  }

  // Sanctioned Trellis paths always pass.
  if (SANCTIONED_TRELLIS_PATTERN.test(command)) {
    return { allow: true };
  }

  const root =
    ctx.trellisRoot !== undefined
      ? ctx.trellisRoot
      : findTrellisRoot(gitTargetDir(command, cwdOf(inv)));
  if (root === null) return { allow: true }; // not a Trellis-owned tree

  // R2 — direct git mutations on a Trellis-owned tree are denied.
  if (GIT_MUTATION_PATTERN.test(command) && !SANCTIONED_GIT_SYNC_PATTERN.test(command)) {
    return {
      allow: false,
      deny: true,
      reason:
        'Direct git mutations are blocked in Trellis workspaces — git is a promote-only mirror (ADR 0014).',
      redirect: 'trellis lane promote',
    };
  }

  // R3 — destructive trellis commands need a human confirm gate.
  if (
    TRELLIS_DESTRUCTIVE_PATTERN.test(command) &&
    !DESTRUCTIVE_ESCAPE_PATTERN.test(command)
  ) {
    return {
      allow: false,
      prompt: true,
      message: `Destructive Trellis command: "${command.trim()}". This shrinks or rewrites durable state.`,
      confirmLabel: 'Confirm destructive',
    };
  }

  return { allow: true };
}
