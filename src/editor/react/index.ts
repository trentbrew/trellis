/**
 * Editor React — `useEditor` hook (ADR 0034 wedge 4).
 *
 * Import from `trellis/editor/react`:
 *
 *   const editor = useEditor({ undoHistory: undo });
 *   editor.actions.type('hello');
 *   // <div onKeyDown={(e) => editor.actions.type(e.key)}>
 *   //   {editor.state.text}
 *   // </div>
 *
 * The core is created once per mount; state flows through
 * `useSyncExternalStore` (same bridge as `trellis/table/react`).
 *
 * @module trellis/editor/react
 */

import { useRef, useSyncExternalStore } from 'react';
import { createEditorCore } from '../core/index.js';
import type { EditorConfig, UseEditorReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type EditorInput = EditorConfig | UseEditorReturn;

function asEditorCore(input: EditorInput): UseEditorReturn {
  return 'actions' in input ? input : createEditorCore(input);
}

/**
 * Bind an editor core to React. Pass a config for a fresh core, or an
 * existing core to share one mount across adapters.
 */
export function useEditor(input: EditorInput = {}): UseEditorReturn {
  const ref = useRef<UseEditorReturn | null>(null);
  if (ref.current === null) {
    ref.current = asEditorCore(input);
  }
  const core = ref.current;

  const state = useSyncExternalStore(
    core.subscribe,
    () => core.state,
    () => core.state,
  );

  return {
    state,
    actions: core.actions,
    subscribe: core.subscribe,
  };
}
