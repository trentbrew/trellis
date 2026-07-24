/**
 * Gate CLI / agent commands that can shrink or rewrite durable state.
 *
 * Human escape: TRELLIS_CONFIRM_DESTRUCTIVE=1
 * CLI flag: --confirm-destructive (per command)
 *
 * Repair remote gate (TRL-235): TRELLIS_I_KNOW=1 or --i-know
 */

export const DESTRUCTIVE_ENV = 'TRELLIS_CONFIRM_DESTRUCTIVE';
/** Human ack that remote backup may be stale (repair gate). */
export const I_KNOW_ENV = 'TRELLIS_I_KNOW';

export interface DestructiveGate {
  /** e.g. repair, branch-delete, lane-drop */
  action: string;
  /** When false, throw before mutating */
  confirmDestructive?: boolean;
}

export function destructiveConfirmed(opts?: {
  confirmDestructive?: boolean;
  env?: NodeJS.ProcessEnv;
}): boolean {
  const env = opts?.env ?? process.env;
  if (opts?.confirmDestructive === true) return true;
  if (env[DESTRUCTIVE_ENV] === '1') return true;
  return false;
}

export function requireDestructiveConfirm(gate: DestructiveGate): void {
  if (destructiveConfirmed({ confirmDestructive: gate.confirmDestructive })) {
    return;
  }
  throw new Error(
    `Refusing destructive action "${gate.action}" without explicit approval. ` +
    `Re-run with --confirm-destructive or set ${DESTRUCTIVE_ENV}=1 (human only).`,
  );
}

function hasDestructiveConfirmEscape(command: string): boolean {
  if (/--confirm-destructive\b/.test(command)) return true;
  if (/\bTRELLIS_CONFIRM_DESTRUCTIVE=1\b/.test(command)) return true;
  return false;
}

function matchesLocalCli(command: string, verb: string): boolean {
  return (
    new RegExp(`\\bjust\\s+trellis\\b[^\\n|;&]*\\b${verb}\\b`).test(command) ||
    new RegExp(`src\\/cli\\/index\\.ts\\b[^\\n|;&]*\\b${verb}\\b`).test(command) ||
    new RegExp(`bin\\/trellis\\.mjs\\b[^\\n|;&]*\\b${verb}\\b`).test(command)
  );
}

/** Shell hook: block bare trellis repair without confirm flag/env. */
export function repairCommandNeedsConfirm(command: string): boolean {
  if (hasDestructiveConfirmEscape(command)) return false;
  return (
    /\btrellis\s+repair\b/.test(command) ||
    matchesLocalCli(command, 'repair')
  );
}

/** Shell hook: block branch delete without confirm. */
export function branchDeleteCommandNeedsConfirm(command: string): boolean {
  if (hasDestructiveConfirmEscape(command)) return false;
  const deleteFlag = /(?:-d\b|--delete\b)/;
  return (
    (/\btrellis\b[^\n|;&]*\bbranch\b/.test(command) && deleteFlag.test(command)) ||
    (matchesLocalCli(command, 'branch') && deleteFlag.test(command))
  );
}

/** Shell hook: block lane drop without confirm. */
export function laneDropCommandNeedsConfirm(command: string): boolean {
  if (hasDestructiveConfirmEscape(command)) return false;
  return (
    /\btrellis\b[^\n|;&]*\blane\b[^\n|;&]*\bdrop\b/.test(command) ||
    (matchesLocalCli(command, 'lane') && /\bdrop\b/.test(command))
  );
}

/** Any destructive CLI verb that agents must not run without human confirm. */
export function destructiveCommandNeedsConfirm(command: string): boolean {
  return (
    repairCommandNeedsConfirm(command) ||
    branchDeleteCommandNeedsConfirm(command) ||
    laneDropCommandNeedsConfirm(command)
  );
}

export function describeDestructiveBlock(command: string): string {
  if (repairCommandNeedsConfirm(command)) {
    return '`trellis repair` can rewrite the op journal.';
  }
  if (branchDeleteCommandNeedsConfirm(command)) {
    return '`trellis branch -d` deletes branch state from the graph.';
  }
  if (laneDropCommandNeedsConfirm(command)) {
    return '`trellis lane drop` archives a lane journal and marks it dropped.';
  }
  return 'destructive Trellis command';
}
