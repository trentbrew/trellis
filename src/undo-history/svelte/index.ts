/**
 * Undo-history Svelte — `createUndoHistoryStore` store-contract bindings
 * (ADR 0034 wedge 8).
 *
 * Import from `trellis/undo-history/svelte`:
 *
 *   const undo = createUndoHistoryStore();
 *   // In markup: <button disabled={!$undo.canUndo} on:click={undo.actions.undo}>
 *   //   Undo {$undo.undoLabel}
 *   // </button>
 *
 * No dependency on the svelte package — only the store contract, so it
 * works across Svelte 4/5 (see `src/svelte/stores.ts`).
 *
 * @module trellis/undo-history/svelte
 */

import { toSvelteStore } from '../../headless/index.js';
import { createUndoHistoryCore } from '../core/index.js';
import type {
  UndoConfig,
  UndoState,
  UseUndoReturn,
} from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type UndoInput = UndoConfig | UseUndoReturn;

function asUndoCore(input: UndoInput): UseUndoReturn {
  return 'actions' in input ? input : createUndoHistoryCore(input);
}

export interface UndoHistoryStore {
  /** Full undo state (auto-subscribable). */
  state: { subscribe(run: (value: UndoState) => void): () => void };
  /** Derived: can undo (auto-subscribable). */
  canUndo: { subscribe(run: (value: boolean) => void): () => void };
  /** Derived: can redo (auto-subscribable). */
  canRedo: { subscribe(run: (value: boolean) => void): () => void };
  /** Next undo label, or null (auto-subscribable). */
  undoLabel: { subscribe(run: (value: string | null) => void): () => void };
  /** Next redo label, or null (auto-subscribable). */
  redoLabel: { subscribe(run: (value: string | null) => void): () => void };
  actions: UseUndoReturn['actions'];
  /** Raw core (framework-free) for advanced use. */
  core: UseUndoReturn;
}

/**
 * Create a store-contract undo-history from a config or an existing core;
 * actions mutate the shared core.
 */
export function createUndoHistoryStore(input: UndoInput = {}): UndoHistoryStore {
  const core = asUndoCore(input);

  return {
    state: toSvelteStore(core),
    canUndo: toSvelteStore(core, (s) => s.canUndo),
    canRedo: toSvelteStore(core, (s) => s.canRedo),
    undoLabel: toSvelteStore(core, (s) => s.undoLabel),
    redoLabel: toSvelteStore(core, (s) => s.redoLabel),
    actions: core.actions,
    core,
  };
}
