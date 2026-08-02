/**
 * Table Svelte — `createTableStore` store-contract bindings
 * (ADR 0034 wedge 6).
 *
 * Import from `trellis/table/svelte`:
 *
 *   const table = createTableStore({ data, columns });
 *   // {#each $table.state.rows as row (row.id)}
 *   //   {#each $table.state.columns as col}
 *   //     {row.cells[col.id]}
 *   //   {/each}
 *   // {/each}
 *
 * No dependency on the svelte package — only the store contract, so it
 * works across Svelte 4/5 (see `src/svelte/stores.ts`).
 *
 * @module trellis/table/svelte
 */

import { toSvelteStore } from '../../headless/index.js';
import { createTableCore } from '../core/index.js';
import type {
  TableConfig,
  TableState,
  UseTableReturn,
} from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type TableInput<T> = TableConfig<T> | UseTableReturn<T>;

function asTableCore<T extends object>(input: TableInput<T>): UseTableReturn<T> {
  return 'actions' in input ? input : createTableCore<T>(input);
}

export interface TableStore<T> {
  /** Full table state (auto-subscribable). */
  state: { subscribe(run: (value: TableState) => void): () => void };
  /** Derived: can undo (auto-subscribable). */
  canUndo: { subscribe(run: (value: boolean) => void): () => void };
  /** Derived: can redo (auto-subscribable). */
  canRedo: { subscribe(run: (value: boolean) => void): () => void };
  actions: UseTableReturn<T>['actions'];
  /** Raw core (framework-free) for advanced use. */
  core: UseTableReturn<T>;
}

/**
 * Create a store-contract table from a config or an existing core;
 * actions mutate the shared core.
 */
export function createTableStore<T extends object>(
  input: TableInput<T>,
): TableStore<T> {
  const core = asTableCore(input);

  return {
    state: toSvelteStore(core),
    canUndo: toSvelteStore(core, (s) => s.canUndo),
    canRedo: toSvelteStore(core, (s) => s.canRedo),
    actions: core.actions,
    core,
  };
}
