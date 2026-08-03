/**
 * Dialog Svelte — `createDialogStore` store-contract bindings (ADR 0034
 * wedge 2).
 *
 * Import from `trellis/dialog/svelte`:
 *
 *   const dialogs = createDialogStore();
 *   // In markup: {#each $dialogs.stack as d}<DialogSurface {d}/>{/each}
 *
 * No dependency on the svelte package — only the store contract, so it
 * works across Svelte 4/5 (see `src/svelte/stores.ts`).
 *
 * @module trellis/dialog/svelte
 */

import { toSvelteStore } from '../../headless/index.js';
import { createDialogCore } from '../core/index.js';
import type {
  DialogConfig,
  DialogState,
  UseDialogReturn,
} from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type DialogInput = DialogConfig | UseDialogReturn;

function asDialogCore(input: DialogInput): UseDialogReturn {
  return 'actions' in input ? input : createDialogCore(input);
}

export interface DialogStore {
  /** Full stack state (auto-subscribable). */
  state: { subscribe(run: (value: DialogState) => void): () => void };
  /** Just the topmost instance (auto-subscribable; null when empty). */
  top: { subscribe(run: (value: DialogState['top']) => void): () => void };
  actions: UseDialogReturn['actions'];
  /** Raw core (framework-free) for advanced use. */
  core: UseDialogReturn;
}

/**
 * Create a store-contract dialog stack from a config or an existing core;
 * actions mutate the shared core.
 */
export function createDialogStore(input: DialogInput = {}): DialogStore {
  const core = asDialogCore(input);

  return {
    state: toSvelteStore(core),
    top: toSvelteStore(core, (s) => s.top),
    actions: core.actions,
    core,
  };
}
