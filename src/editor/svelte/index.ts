/**
 * Editor Svelte — `createEditorStore` store-contract bindings
 * (ADR 0034 wedge 4).
 *
 * Import from `trellis/editor/svelte`:
 *
 *   const editor = createEditorStore({ undoHistory: undo });
 *   // {editor.state.text}
 *
 * No dependency on the svelte package — only the store contract, so it
 * works across Svelte 4/5 (see `src/svelte/stores.ts`).
 *
 * @module trellis/editor/svelte
 */

import { toSvelteStore } from '../../headless/index.js';
import { createEditorCore } from '../core/index.js';
import type {
  EditorConfig,
  EditorState,
  UseEditorReturn,
} from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type EditorInput = EditorConfig | UseEditorReturn;

function asEditorCore(input: EditorInput): UseEditorReturn {
  return 'actions' in input ? input : createEditorCore(input);
}

export interface EditorStore {
  /** Full editor state (auto-subscribable). */
  state: { subscribe(run: (value: EditorState) => void): () => void };
  /** Derived: can undo (auto-subscribable). */
  canUndo: { subscribe(run: (value: boolean) => void): () => void };
  /** Derived: can redo (auto-subscribable). */
  canRedo: { subscribe(run: (value: boolean) => void): () => void };
  actions: UseEditorReturn['actions'];
  /** Raw core (framework-free) for advanced use. */
  core: UseEditorReturn;
}

/**
 * Create a store-contract editor from a config or an existing core;
 * actions mutate the shared core.
 */
export function createEditorStore(input: EditorInput = {}): EditorStore {
  const core = asEditorCore(input);

  return {
    state: toSvelteStore(core),
    canUndo: toSvelteStore(core, (s) => s.canUndo),
    canRedo: toSvelteStore(core, (s) => s.canRedo),
    actions: core.actions,
    core,
  };
}
