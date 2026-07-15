/**
 * Branch Management Module
 *
 * Extracted from engine.ts per DESIGN.md §8.1.
 * Handles create, switch, list, delete branch operations.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createVcsOp } from './ops.js';
import type { VcsOp } from './types.js';
import type { EngineContext } from './engine-context.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BranchInfo {
  name: string;
  isCurrent: boolean;
  createdAt?: string;
}

export interface BranchState {
  currentBranch: string;
  /** Active agent lane (W1.1). */
  activeLaneId?: string;
}

const BRANCH_ADVANCE_SKIP_KINDS = new Set([
  'vcs:branchAdvance',
  'vcs:branchCreate',
  'vcs:branchDelete',
  'vcs:checkpointCreate',
]);

/** Whether an integration-journal op should emit a follow-up branchAdvance (ADR 0004). */
export function shouldAdvanceBranchHead(kind: string): boolean {
  return !BRANCH_ADVANCE_SKIP_KINDS.has(kind);
}

/**
 * Read branch:NAME headOpHash.
 *
 * Resolved from the causally-ordered op log, NOT the materialized fact-set. The
 * `headOpHash` facts are accumulated add-only (ADR 0022 §1) so their store
 * insertion order is network-arrival order — two peers with identical ops would
 * otherwise resolve different heads. The ops themselves are hash-chained and
 * timestamp-ordered, so the last `branchAdvance` for the branch is deterministic
 * across peers.
 *
 * `principal` scopes the head to one writer's per-principal ref zone (ADR 0022 §4):
 * two writers advancing the *same* personal branch never share a pointer, so the
 * order-dependence dissolves instead of needing a convergence rule. When omitted,
 * the head is the integration-style single-owner ref — the one audit trail where
 * position-order is meaningful because a single principal advances it. The writer
 * key is the signed `did:key` principal (`vcs.signedBy`), falling back to the
 * self-asserted `agentId` for unsigned ops.
 */
export function getBranchHeadOpHash(
  ctx: EngineContext,
  branchName: string,
  principal?: string,
): string | undefined {
  let advances = ctx
    .readAllOps()
    .filter(
      (op) =>
        op.kind === 'vcs:branchAdvance' &&
        op.vcs?.branchName === branchName &&
        op.vcs?.targetOpHash,
    );
  if (principal) {
    advances = advances.filter(
      (op) => writerPrincipal(op) === principal,
    );
  }
  // Hash tiebreak: two writers can advance in the same millisecond, and
  // Array.prototype.sort is stable — an unbroken tie falls back to journal
  // order, which on a syncing peer is ARRIVAL order. That reopens the exact
  // divergence this resolver exists to close. The hash is hash-covered by
  // definition and identical across peers, so it is the deterministic break.
  const sorted = advances.sort(
    (a, b) => a.timestamp.localeCompare(b.timestamp) || a.hash.localeCompare(b.hash),
  );
  return sorted.at(-1)?.vcs?.targetOpHash as string | undefined;
}

/** Writer identity = signed Agent Ed25519 principal; unsigned ops fall back to `agentId`. */
export function writerPrincipal(op: VcsOp): string {
  return op.vcs?.signedBy ?? op.agentId;
}

/**
 * Resolve the entity id of a per-writer branch head ("ref zone"). `integration`
 * and the default branch collapse to the shared `branch:NAME` entity; every
 * other branch gets a per-writer entity `branch:NAME@<principal>` so each writer
 * owns their own ref (ADR 0022 §4).
 */
export function branchHeadEntity(
  branchName: string,
  principal?: string,
  defaultBranch = 'main',
): string {
  if (!principal || branchName === defaultBranch || branchName === 'integration') {
    return `branch:${branchName}`;
  }
  return `branch:${branchName}@${principal}`;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * Create a new branch forked from the current branch.
 */
export async function createBranch(
  ctx: EngineContext,
  name: string,
  currentBranch: string,
): Promise<VcsOp> {
  const existing = ctx.store
    .getFactsByAttribute('type')
    .filter((f) => f.v === 'Branch' && f.e === `branch:${name}`);
  if (existing.length > 0) {
    throw new Error(`Branch '${name}' already exists`);
  }

  const op = await createVcsOp('vcs:branchCreate', {
    agentId: ctx.agentId,
    previousHash: ctx.getLastOp()?.hash,
    vcs: {
      branchName: name,
      baseBranch: currentBranch,
      targetOpHash: ctx.getLastOp()?.hash,
    },
  });
  await ctx.applyOp(op);
  return op;
}

/**
 * Switch to an existing branch.
 */
export function switchBranch(
  ctx: EngineContext,
  name: string,
): void {
  const branchFacts = ctx.store
    .getFactsByEntity(`branch:${name}`)
    .filter((f) => f.a === 'type' && f.v === 'Branch');
  if (branchFacts.length === 0) {
    throw new Error(`Branch '${name}' does not exist`);
  }
}

/**
 * List all branches.
 */
export function listBranches(
  ctx: EngineContext,
  currentBranch: string,
): BranchInfo[] {
  const branchFacts = ctx.store
    .getFactsByAttribute('type')
    .filter((f) => f.v === 'Branch');

  return branchFacts.map((f) => {
    const nameFact = ctx.store
      .getFactsByEntity(f.e)
      .find((ef) => ef.a === 'name');
    const createdFact = ctx.store
      .getFactsByEntity(f.e)
      .find((ef) => ef.a === 'createdAt');
    const name = (nameFact?.v as string) ?? f.e.replace('branch:', '');
    return {
      name,
      isCurrent: name === currentBranch,
      createdAt: createdFact?.v as string | undefined,
    };
  });
}

/**
 * Delete a branch (cannot delete the current branch).
 */
export async function deleteBranch(
  ctx: EngineContext,
  name: string,
  currentBranch: string,
): Promise<VcsOp> {
  if (name === currentBranch) {
    throw new Error(`Cannot delete the current branch '${name}'`);
  }
  const branchFacts = ctx.store
    .getFactsByEntity(`branch:${name}`)
    .filter((f) => f.a === 'type' && f.v === 'Branch');
  if (branchFacts.length === 0) {
    throw new Error(`Branch '${name}' does not exist`);
  }

  const op = await createVcsOp('vcs:branchDelete', {
    agentId: ctx.agentId,
    previousHash: ctx.getLastOp()?.hash,
    vcs: { branchName: name },
  });
  await ctx.applyOp(op);
  return op;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export function saveBranchState(rootPath: string, state: BranchState): void {
  const statePath = join(rootPath, '.trellis', 'state.json');
  writeFileSync(statePath, JSON.stringify(state));
}

export function loadBranchState(rootPath: string): BranchState {
  const statePath = join(rootPath, '.trellis', 'state.json');
  if (existsSync(statePath)) {
    try {
      const raw = readFileSync(statePath, 'utf-8');
      const state = JSON.parse(raw);
      if (state.currentBranch) {
        return {
          currentBranch: state.currentBranch,
          activeLaneId: state.activeLaneId,
        };
      }
    } catch {}
  }
  return { currentBranch: 'main' };
}
