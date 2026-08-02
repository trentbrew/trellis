/**
 * Colorpicker Vue — `useColorPickerVue` composable (ADR 0034 wedge 9).
 *
 * Import from `trellis/colorpicker/vue`:
 *
 *   const picker = useColorPickerVue({ initial: '#3366ff' });
 *   picker.actions.setDraft('#ff8800');
 *
 * State is a Vue `reactive` object mirrored from the core via the shared
 * `syncFromCore` bridge (same pattern as `trellis/forms/vue`).
 *
 * @module trellis/colorpicker/vue
 */

import { reactive } from 'vue';
import { syncFromCore } from '../../headless/index.js';
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

/**
 * Create a reactive Vue colorpicker. The core's state is mirrored into a
 * `reactive()` object on every mutation.
 */
export function useColorPickerVue(
  input: ColorPickerInput = {},
): UseColorPickerReturn {
  const core = asColorPickerCore(input);
  const state = reactive({ ...core.state }) as ColorPickerState;

  syncFromCore(state, core);

  return {
    get state() {
      return state as ColorPickerState;
    },
    actions: core.actions,
    subscribe: core.subscribe,
  };
}
