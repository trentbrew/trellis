/**
 * Combobox Vue — `useComboboxVue` composable (ADR 0034).
 *
 * Import from `trellis/combobox/vue`:
 *
 *   const { state, actions } = useComboboxVue({ items, onSelect });
 *   <input :value="state.query" @input="actions.setQuery(($event.target as HTMLInputElement).value)" />
 *
 * State is a Vue `reactive` object mirrored from the core via the shared
 * `syncFromCore` bridge (same pattern as `trellis/forms/vue`).
 *
 * @module trellis/combobox/vue
 */

import { reactive } from 'vue';
import { syncFromCore } from '../../headless/index.js';
import { createComboboxCore } from '../core/index.js';
import type { ComboboxConfig, UseComboboxReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type ComboboxInput = ComboboxConfig | UseComboboxReturn;

function asComboboxCore(input: ComboboxInput): UseComboboxReturn {
  return 'actions' in input ? input : createComboboxCore(input);
}

/**
 * Create a reactive Vue combobox. The core's state is mirrored into a
 * `reactive()` object on every mutation. Pass a config for a fresh core, or
 * an existing core to share one mount across adapters.
 */
export function useComboboxVue(
  input: ComboboxInput,
): UseComboboxReturn {
  const core = asComboboxCore(input);
  const state = reactive({ ...core.state }) as ComboboxState;

  syncFromCore(state, core);

  return {
    get state() {
      return state as ComboboxState;
    },
    actions: core.actions,
    subscribe: core.subscribe,
  };
}

import type { ComboboxState } from '../core/index.js';