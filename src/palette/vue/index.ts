/**
 * Palette Vue — `usePaletteVue` composable (ADR 0034).
 *
 * Import from `trellis/palette/vue`:
 *
 *   const { state, actions } = usePaletteVue({ items, onSelect });
 *   <input :value="state.query" @input="actions.setQuery(($event.target as HTMLInputElement).value)" />
 *
 * State is a Vue `reactive` object mirrored from the core via the shared
 * `syncFromCore` bridge (same pattern as `trellis/forms/vue`).
 *
 * @module trellis/palette/vue
 */

import { reactive } from 'vue';
import { syncFromCore } from '../../headless/index.js';
import { createPaletteCore } from '../core/index.js';
import type { PaletteConfig, PaletteState, UsePaletteReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type PaletteInput = PaletteConfig | UsePaletteReturn;

function asPaletteCore(input: PaletteInput): UsePaletteReturn {
  return 'actions' in input ? input : createPaletteCore(input);
}

/**
 * Create a reactive Vue palette. The core's state is mirrored into a
 * `reactive()` object on every mutation. Pass a config for a fresh core, or
 * an existing core to share one mount across adapters.
 */
export function usePaletteVue(
  input: PaletteInput,
): UsePaletteReturn {
  const core = asPaletteCore(input);
  const state = reactive({ ...core.state }) as PaletteState;

  syncFromCore(state, core);

  return {
    get state() {
      return state as PaletteState;
    },
    actions: core.actions,
    subscribe: core.subscribe,
  };
}
