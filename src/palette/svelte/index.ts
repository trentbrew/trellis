/**
 * Palette Svelte — `createPaletteStore` store-contract bindings (ADR 0034).
 *
 * Import from `trellis/palette/svelte`:
 *
 *   const palette = createPaletteStore({ items, onSelect });
 *   // In markup: {#if $palette.state.open}…{/if}
 *   <input bind:value={$palette.query} />
 *
 * No dependency on the svelte package — only the store contract
 * (`subscribe(run) => unsubscribe`, `run` invoked immediately), so it works
 * across Svelte 4/5 (see `src/svelte/stores.ts`, `trellis/forms/svelte`).
 *
 * @module trellis/palette/svelte
 */

import { toSvelteStore } from '../../headless/index.js';
import { createPaletteCore } from '../core/index.js';
import type { PaletteConfig, PaletteState, UsePaletteReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type PaletteInput = PaletteConfig | UsePaletteReturn;

function asPaletteCore(input: PaletteInput): UsePaletteReturn {
  return 'actions' in input ? input : createPaletteCore(input);
}

export interface PaletteStore {
  /** Full palette state (auto-subscribable). */
  state: { subscribe(run: (value: PaletteState) => void): () => void };
  /** Just the query string (auto-subscribable, for `bind:value`). */
  query: { subscribe(run: (value: string) => void): () => void };
  /** Just the filtered results (auto-subscribable, for `{#each}`). */
  results: { subscribe(run: (value: PaletteState['results']) => void): () => void };
  actions: UsePaletteReturn['actions'];
  /** Raw core (framework-free) for advanced use. */
  core: UsePaletteReturn;
}

/**
 * Create a store-contract palette from a config or an existing core;
 * actions mutate the shared core.
 */
export function createPaletteStore(input: PaletteInput): PaletteStore {
  const core = asPaletteCore(input);

  return {
    state: toSvelteStore(core),
    query: toSvelteStore(core, (s) => s.query),
    results: toSvelteStore(core, (s) => s.results),
    actions: core.actions,
    core,
  };
}
