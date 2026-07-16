/**
 * Engine Context
 *
 * Shared interface that module functions (branch, milestone, checkpoint)
 * use to access engine internals without depending on the engine class.
 */

import type { EAVStore, Fact } from '../core/store/eav-store.js';
import type { VcsOp } from './types.js';

/** Options for engine op ingestion (integration vs lane journals). */
export interface ApplyOpOptions {
  /** Skip emitting vcs:branchAdvance after this op (replay, promote, advance ops). */
  skipBranchAdvance?: boolean;
  /** Write to integration journal while a lane is active (lane create/drop, promote). */
  allowIntegrationWrite?: boolean;
  /**
   * Skip TRL-117 cross-agent file ownership checks (promote replay, sync
   * ingest, workspace index). Live agent writes must not set this.
   */
  skipOwnershipCheck?: boolean;
}

export interface EngineContext {
  /** The EAV store for querying/mutating graph state. */
  store: EAVStore;

  /** Agent ID for op attribution. */
  agentId: string;

  /**
   * Provenance stamped into each minted op's `vcs` payload (ADR 0021 §2).
   * Optional so existing context builders keep compiling; absent means the op
   * carries no provenance claim, which is honest rather than a guess.
   */
  provenance?: import('../core/persist/canonical-op.js').OpProvenance;

  /**
   * Local signing material (ADR 0022 Phase 3). When present, authorization
   * ops minted through this context are signed so an `IdentityResolver` at the
   * ingest boundary can cryptographically verify them. Absent = ops mint
   * unsigned (identity-less repos, most tests).
   */
  signingMaterial?: {
    privateKey: string;
    identityEntityId: string;
    signedWith: string;
  };

  /** Get all ops from the log. */
  readAllOps(): VcsOp[];

  /** Get the last op in the log. */
  getLastOp(): VcsOp | undefined;

  /** Apply an op (decompose + persist + branch advance + auto-checkpoint flag). */
  applyOp(op: VcsOp, opts?: ApplyOpOptions): Promise<void>;
}
