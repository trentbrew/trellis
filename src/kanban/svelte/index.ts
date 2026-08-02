/**
 * Kanban Svelte — `createKanbanStore` store-contract bindings
 * (ADR 0034 wedge 13).
 *
 * Import from `trellis/kanban/svelte`:
 *
 *   const board = createKanbanStore({ data, columns, groupFields, groupFieldId });
 *   // {#each $board.state.columns as col (col.id)}
 *   //   {col.title} · {col.count}
 *   //   {#each col.cards as card (card.id)}
 *   //     {card.cells.title}
 *   //   {/each}
 *   // {/each}
 *
 * No dependency on the svelte package — only the store contract, so it
 * works across Svelte 4/5 (see `src/svelte/stores.ts`).
 *
 * @module trellis/kanban/svelte
 */

import { toSvelteStore } from '../../headless/index.js';
import { createKanbanCore } from '../core/index.js';
import type {
  KanbanConfig,
  KanbanState,
  UseKanbanReturn,
} from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type KanbanInput<T> = KanbanConfig<T> | UseKanbanReturn<T>;

function asKanbanCore<T extends object>(input: KanbanInput<T>): UseKanbanReturn<T> {
  return 'actions' in input ? input : createKanbanCore<T>(input);
}

export interface KanbanStore<T> {
  /** Full board state (auto-subscribable). */
  state: { subscribe(run: (value: KanbanState) => void): () => void };
  /** Derived: can undo (auto-subscribable). */
  canUndo: { subscribe(run: (value: boolean) => void): () => void };
  /** Derived: can redo (auto-subscribable). */
  canRedo: { subscribe(run: (value: boolean) => void): () => void };
  actions: UseKanbanReturn<T>['actions'];
  /** Raw core (framework-free) for advanced use. */
  core: UseKanbanReturn<T>;
}

/**
 * Create a store-contract board from a config or an existing core;
 * actions mutate the shared core.
 */
export function createKanbanStore<T extends object>(
  input: KanbanInput<T>,
): KanbanStore<T> {
  const core = asKanbanCore(input);

  return {
    state: toSvelteStore(core),
    canUndo: toSvelteStore(core, (s) => s.canUndo),
    canRedo: toSvelteStore(core, (s) => s.canRedo),
    actions: core.actions,
    core,
  };
}
