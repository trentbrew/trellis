/**
 * Upload React — `useUpload` hook (ADR 0034 wedge 5).
 *
 * Import from `trellis/upload/react`:
 *
 *   const upload = useUpload({ transport: httpTransport });
 *   upload.actions.add({ id: 'a1', name: 'photo.png', size: 2048 });
 *   // {#each tasks}: progress bar driven by task.progress
 *
 * The core is created once per mount; state flows through
 * `useSyncExternalStore` (same bridge as `trellis/forms/react`).
 *
 * @module trellis/upload/react
 */

import { useRef, useSyncExternalStore } from 'react';
import { createUploadCore } from '../core/index.js';
import type { UploadConfig, UseUploadReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type UploadInput = UploadConfig | UseUploadReturn;

function asUploadCore(input: UploadInput): UseUploadReturn {
  return 'actions' in input ? input : createUploadCore(input);
}

/**
 * Bind an upload core to React. Pass a config for a fresh core, or an
 * existing core to share one mount across adapters.
 */
export function useUpload(input: UploadInput): UseUploadReturn {
  const ref = useRef<UseUploadReturn | null>(null);
  if (ref.current === null) {
    ref.current = asUploadCore(input);
  }
  const upload = ref.current;

  const state = useSyncExternalStore(
    upload.subscribe,
    () => upload.state,
    () => upload.state,
  );

  return {
    state,
    actions: upload.actions,
    subscribe: upload.subscribe,
  };
}
