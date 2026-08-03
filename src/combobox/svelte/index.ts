/**
 * Combobox Svelte — `createComboboxStore` store-contract bindings (ADR 0034).
 *
 * Import from `trellis/combobox/svelte`:
 *
 *   const combobox = createComboboxStore({ items, onSelect });
 *   {#if $combobox.state.open}…{/if}
 *   <input bind:value={$combobox.query} />
 *
 * No dependency on the svelte package — only the store contract
 * (`subscribe(run) => unsubscribe`, `run` invoked immediately), so it works
 * across Svelte 4/5 (see `src/svelte/stores.ts`, `trellis/forms/svelte`).
 *
 * @module trellis/combobox/svelte
 */

import { toSvelteStore, syncFromCore } from '../../headless/index.js';
import { createComboboxCore } from '../core/index.js';
import type { ComboboxConfig, ComboboxState, UseComboboxReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type ComboboxInput = ComboboxConfig | UseComboboxReturn;

function asComboboxCore(input: ComboboxInput): UseComboboxReturn {
  return 'actions' in input ? input : createComboboxCore(input);
}

export interface ComboboxStore {
  /** Full combobox state (auto-subscribable). */
  state: { subscribe(run: (value: ComboboxState) => void): () => void };
  /** Just the query string (auto-subscribable, for `bind:value`). */
  query: { subscribe(run: (value: string) => void): () => void };
  /** Just the filtered results (auto-subscribable, for `{#each}`). */
  results: { subscribe(run: (value: ComboboxState['results']) => void): () => void };
  /** Per-result highlight ranges (auto-subscribable). */
  highlight: { subscribe(run: (value: ComboboxState['highlight']) => void): () => void };
  actions: UseComboboxReturn['actions'];
  /** Raw core (framework-free) for advanced use. */
  core: UseComboboxReturn;
}

/**
 * Create a store-contract combobox from a config or an existing core;
 * actions mutate the shared core.
 */
export function createComboboxStore(input: ComboboxInput): ComboboxStore {
  const core = asComboboxCore(input);

  return {
    state: toSvelteStore(core),
    query: toSvelteStore(core, (s) => s.query),
    results: toSvelteStore(core, (s) => s.results),
    highlight: toSvelteStore(core, (s) => s.highlight),
    actions: core.actions,
    core,
  };
}