/**
 * Undo-history Vue — `useUndoHistoryVue` composable (ADR 0034 wedge 8).
 *
 * Import from `trellis/undo-history/vue`:
 *
 *   const undo = useUndoHistoryVue();
 *   undo.actions.push(insertChar, { coalesce: true });
 *   // <button :disabled="!undo.state.canUndo" @click="undo.actions.undo">
 *   //   Undo {{ undo.state.undoLabel }}
 *   // </button>
 *
 * State is a Vue `reactive` object mirrored from the core via the shared
 * `syncFromCore` bridge (same pattern as `trellis/forms/vue`).
 *
 * @module trellis/undo-history/vue
 */

import { reactive } from 'vue';
import { syncFromCore } from '../../headless/index.js';
import { createUndoHistoryCore } from '../core/index.js';
import type { UndoConfig, UndoState, UseUndoReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type UndoInput = UndoConfig | UseUndoReturn;

function asUndoCore(input: UndoInput): UseUndoReturn {
  return 'actions' in input ? input : createUndoHistoryCore(input);
}

/**
 * Create a reactive Vue undo-history. The core's state is mirrored into a
 * `reactive()` object on every mutation.
 */
export function useUndoHistoryVue(input: UndoInput = {}): UseUndoReturn {
  const core = asUndoCore(input);
  const state = reactive({ ...core.state }) as UndoState;

  syncFromCore(state, core);

  return {
    get state() {
      return state as UndoState;
    },
    actions: core.actions,
    subscribe: core.subscribe,
  };
}
