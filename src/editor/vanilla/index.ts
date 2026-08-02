/**
 * Editor Vanilla — framework-free bindings (ADR 0034 wedge 4).
 *
 * Import from `trellis/editor/vanilla`:
 *
 *   const editor = createVanillaEditor({ undoHistory: undo });
 *   editor.actions.type('hello');
 *   editor.subscribe(() => render(editor.state.text));
 *
 * @module trellis/editor/vanilla
 */

import { createEditorCore } from '../core/index.js';
import type { EditorConfig, UseEditorReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type EditorInput = EditorConfig | UseEditorReturn;

function asEditorCore(input: EditorInput): UseEditorReturn {
  return 'actions' in input ? input : createEditorCore(input);
}

/**
 * Create a framework-free editor from a config or an existing core (to
 * share one mount across adapters) with the standard core surface.
 */
export function createVanillaEditor(input: EditorInput = {}): UseEditorReturn {
  return asEditorCore(input);
}
