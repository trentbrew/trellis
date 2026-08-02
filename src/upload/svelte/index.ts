/**
 * Upload Svelte — `createUploadStore` store-contract bindings
 * (ADR 0034 wedge 5).
 *
 * Import from `trellis/upload/svelte`:
 *
 *   const upload = createUploadStore({ transport: httpTransport });
 *   // In markup: {#each $tasks as task (task.id)} {task.name} {task.progress}
 *
 * No dependency on the svelte package — only the store contract, so it
 * works across Svelte 4/5 (see `src/svelte/stores.ts`).
 *
 * @module trellis/upload/svelte
 */

import { toSvelteStore } from '../../headless/index.js';
import { createUploadCore } from '../core/index.js';
import type {
  UploadConfig,
  UploadState,
  UploadTaskState,
  UseUploadReturn,
} from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type UploadInput = UploadConfig | UseUploadReturn;

function asUploadCore(input: UploadInput): UseUploadReturn {
  return 'actions' in input ? input : createUploadCore(input);
}

export interface UploadStore {
  /** Full upload state (auto-subscribable). */
  state: { subscribe(run: (value: UploadState) => void): () => void };
  /** Task list (auto-subscribable, for `{#each}`). */
  tasks: { subscribe(run: (value: UploadTaskState[]) => void): () => void };
  /** Aggregate progress 0..1 (auto-subscribable, for progress bars). */
  progress: { subscribe(run: (value: number) => void): () => void };
  /** Any transfer busy (auto-subscribable). */
  uploading: { subscribe(run: (value: boolean) => void): () => void };
  actions: UseUploadReturn['actions'];
  /** Raw core (framework-free) for advanced use. */
  core: UseUploadReturn;
}

/**
 * Create a store-contract upload list from a config or an existing core;
 * actions mutate the shared core.
 */
export function createUploadStore(input: UploadInput): UploadStore {
  const core = asUploadCore(input);

  return {
    state: toSvelteStore(core),
    tasks: toSvelteStore(core, (s) => s.tasks),
    progress: toSvelteStore(core, (s) => s.progress),
    uploading: toSvelteStore(core, (s) => s.uploading),
    actions: core.actions,
    core,
  };
}
