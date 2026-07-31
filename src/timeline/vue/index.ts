/**
 * Timeline Vue — `useTimelineVue` composable (ADR 0034 wedge 3).
 *
 * Import from `trellis/timeline/vue`:
 *
 *   const { state, actions } = useTimelineVue({ duration: 90 });
 *
 * State is a Vue `reactive` object mirrored from the core via the shared
 * `syncFromCore` bridge (same pattern as `trellis/forms/vue`).
 *
 * @module trellis/timeline/vue
 */

import { reactive } from 'vue';
import { syncFromCore } from '../../headless/index.js';
import { createTimelineCore } from '../core/index.js';
import type { TimelineConfig, TimelineState, UseTimelineReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type TimelineInput = TimelineConfig | UseTimelineReturn;

function asTimelineCore(input: TimelineInput): UseTimelineReturn {
  return 'actions' in input ? input : createTimelineCore(input);
}

/**
 * Create a reactive Vue timeline. The core's state is mirrored into a
 * `reactive()` object on every mutation.
 */
export function useTimelineVue(input: TimelineInput = {}): UseTimelineReturn {
  const core = asTimelineCore(input);
  const state = reactive({ ...core.state }) as TimelineState;

  syncFromCore(state, core);

  return {
    get state() {
      return state as TimelineState;
    },
    actions: core.actions,
    subscribe: core.subscribe,
  };
}
