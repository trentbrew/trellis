/**
 * Dialog Vue — `useDialogVue` composable (ADR 0034 wedge 2).
 *
 * Import from `trellis/dialog/vue`:
 *
 *   const { state, actions } = useDialogVue();
 *   const result = await actions.open({ title: 'Delete?', kind: 'confirm' });
 *
 * State is a Vue `reactive` object mirrored from the core via the shared
 * `syncFromCore` bridge (same pattern as `trellis/forms/vue`).
 *
 * @module trellis/dialog/vue
 */

import { reactive } from 'vue';
import { syncFromCore } from '../../headless/index.js';
import { createDialogCore } from '../core/index.js';
import type { DialogConfig, DialogState, UseDialogReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type DialogInput = DialogConfig | UseDialogReturn;

function asDialogCore(input: DialogInput): UseDialogReturn {
  return 'actions' in input ? input : createDialogCore(input);
}

/**
 * Create a reactive Vue dialog stack. The core's state is mirrored into a
 * `reactive()` object on every mutation.
 */
export function useDialogVue(input: DialogInput = {}): UseDialogReturn {
  const core = asDialogCore(input);
  const state = reactive({ ...core.state }) as DialogState;

  syncFromCore(state, core);

  return {
    get state() {
      return state as DialogState;
    },
    actions: core.actions,
    subscribe: core.subscribe,
  };
}
