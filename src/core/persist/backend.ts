/**
 * Kernel persistence backend types.
 * Inlined from trellis-core for single-package publish.
 *
 * @module trellis/core
 */

import type { Fact, Link } from '../store/eav-store.js';
// Type-only: erased at compile, so the canonical-op ↔ backend cycle is not real.
import type { OpProvenance } from './canonical-op.js';

export type KernelOpKind =
  | 'addFacts'
  | 'addLinks'
  | 'deleteFacts'
  | 'deleteLinks';

export interface KernelOp {
  /**
   * Content hash of this operation (including previousHash).
   * Format: trellis:op:{hash}
   */
  hash: string;

  /**
   * Kind of operation.
   */
  kind: KernelOpKind;

  /**
   * ISO timestamp of when the op was created.
   */
  timestamp: string;

  /**
   * The ID of the agent that performed the operation.
   */
  agentId: string;

  /**
   * Hash of the previous operation in the local chain.
   */
  previousHash?: string;

  /**
   * The actual data payload.
   */
  facts?: Fact[];
  links?: Link[];

  /**
   * Facts to delete (for update/delete operations).
   */
  deleteFacts?: Fact[];

  /**
   * Links to delete (for update/delete operations).
   */
  deleteLinks?: Link[];

  /**
   * Preimage version (ADR 0021). Absent ⇒ v1 legacy op, whose hash is not
   * recomputable and is never reverified.
   */
  v?: number;

  /**
   * Op-level provenance (ADR 0021 §2). Reserved in Phase A — normalized into
   * the hash preimage as `null` until Phase B populates it.
   */
  provenance?: OpProvenance;
}

export interface KernelBackend {
  init(): void;
  append(op: KernelOp): void;
  readAll(): KernelOp[];
  readUntil(hash: string): KernelOp[];
  readAfter(hash: string): KernelOp[];
  readUntilTimestamp(isoTimestamp: string): KernelOp[];
  getByHash(hash: string): KernelOp | undefined;
  getLastOp(): KernelOp | undefined;
  getOpCount(): number;

  // Snapshot support
  saveSnapshot(lastOpHash: string, data: any): void;
  loadLatestSnapshot(): { lastOpHash: string; data: any } | undefined;

  close?(): void;
}
