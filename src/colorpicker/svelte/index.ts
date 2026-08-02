/**
 * Colorpicker Svelte — `createColorPickerStore` store-contract bindings
 * (ADR 0034 wedge 9).
 *
 * Import from `trellis/colorpicker/svelte`:
 *
 *   const picker = createColorPickerStore({ initial: '#3366ff' });
 *   // In markup: <input bind:value={$draft} on:input={...} />
 *
 * No dependency on the svelte package — only the store contract, so it
 * works across Svelte 4/5 (see `src/svelte/stores.ts`).
 *
 * @module trellis/colorpicker/svelte
 */

import { toSvelteStore } from '../../headless/index.js';
import { createColorPickerCore } from '../core/index.js';
import type {
  ColorPickerConfig,
  ColorPickerState,
  UseColorPickerReturn,
} from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type ColorPickerInput = ColorPickerConfig | UseColorPickerReturn;

function asColorPickerCore(input: ColorPickerInput): UseColorPickerReturn {
  return 'actions' in input ? input : createColorPickerCore(input);
}

export interface ColorPickerStore {
  /** Full colorpicker state (auto-subscribable). */
  state: { subscribe(run: (value: ColorPickerState) => void): () => void };
  /** Committed value (auto-subscribable). */
  value: { subscribe(run: (value: string) => void): () => void };
  /** Draft while open (auto-subscribable, for the input). */
  draft: { subscribe(run: (value: string) => void): () => void };
  /** Recent swatches (auto-subscribable, for `{#each}`). */
  recent: { subscribe(run: (value: string[]) => void): () => void };
  actions: UseColorPickerReturn['actions'];
  /** Raw core (framework-free) for advanced use. */
  core: UseColorPickerReturn;
}

/**
 * Create a store-contract colorpicker from a config or an existing core;
 * actions mutate the shared core.
 */
export function createColorPickerStore(
  input: ColorPickerInput = {},
): ColorPickerStore {
  const core = asColorPickerCore(input);

  return {
    state: toSvelteStore(core),
    value: toSvelteStore(core, (s) => s.value),
    draft: toSvelteStore(core, (s) => s.draft),
    recent: toSvelteStore(core, (s) => s.recent),
    actions: core.actions,
    core,
  };
}
