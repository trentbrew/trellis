/**
 * Upload Vue — `useUploadVue` composable (ADR 0034 wedge 5).
 *
 * Import from `trellis/upload/vue`:
 *
 *   const upload = useUploadVue({ transport: httpTransport });
 *   upload.actions.add({ id: 'a1', name: 'photo.png', size: 2048 });
 *
 * State is a Vue `reactive` object mirrored from the core via the shared
 * `syncFromCore` bridge (same pattern as `trellis/forms/vue`).
 *
 * @module trellis/upload/vue
 */

import { reactive } from 'vue';
import { syncFromCore } from '../../headless/index.js';
import { createUploadCore } from '../core/index.js';
import type { UploadConfig, UploadState, UseUploadReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type UploadInput = UploadConfig | UseUploadReturn;

function asUploadCore(input: UploadInput): UseUploadReturn {
  return 'actions' in input ? input : createUploadCore(input);
}

/**
 * Create a reactive Vue upload list. The core's state is mirrored into a
 * `reactive()` object on every mutation.
 */
export function useUploadVue(input: UploadInput): UseUploadReturn {
  const core = asUploadCore(input);
  const state = reactive({ ...core.state }) as UploadState;

  syncFromCore(state, core);

  return {
    get state() {
      return state as UploadState;
    },
    actions: core.actions,
    subscribe: core.subscribe,
  };
}
