/**
 * Editor Vue — `useEditorVue` composable (ADR 0034 wedge 4).
 *
 * Import from `trellis/editor/vue`:
 *
 *   const editor = useEditorVue({ undoHistory: undo });
 *   // <div v-html="editor.state.text"></div>
 *
 * State is a Vue `reactive` object mirrored from the core via the shared
 * `syncFromCore` bridge (same pattern as `trellis/table/vue`).
 *
 * @module trellis/editor/vue
 */

import { reactive } from 'vue';
import { syncFromCore } from '../../headless/index.js';
import { createEditorCore } from '../core/index.js';
import type { EditorConfig, EditorState, UseEditorReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type EditorInput = EditorConfig | UseEditorReturn;

function asEditorCore(input: EditorInput): UseEditorReturn {
  return 'actions' in input ? input : createEditorCore(input);
}

/**
 * Create a reactive Vue editor. The core's state is mirrored into a
 * `reactive()` object on every mutation.
 */
export function useEditorVue(input: EditorInput = {}): UseEditorReturn {
  const core = asEditorCore(input);
  const state = reactive({ ...core.state }) as EditorState;

  syncFromCore(state, core);

  return {
    get state() {
      return state as EditorState;
    },
    actions: core.actions,
    subscribe: core.subscribe,
  };
}
