/**
 * Engine Context
 *
 * Shared interface that module functions (branch, milestone, checkpoint)
 * use to access engine internals without depending on the engine class.
 */

import type { EAVStore, Fact } from '../core/store/eav-store.js';
import type { VcsOp } from './types.js';

export interface EngineContext {
  /** The EAV store for querying/mutating graph state. */
  store: EAVStore;

  /** Agent ID for op attribution. */
  agentId: string;

  /** Get all ops from the log. */
  readAllOps(): VcsOp[];

  /** Get the last op in the log. */
  getLastOp(): VcsOp | undefined;

  /** Apply an op (decompose + persist + auto-checkpoint flag). */
  applyOp(op: VcsOp): void;
}
