/**
 * Timeline Svelte — `createTimelineStore` store-contract bindings
 * (ADR 0034 wedge 3).
 *
 * Import from `trellis/timeline/svelte`:
 *
 *   const timeline = createTimelineStore({ duration: 90 });
 *   // In markup: <div style:width={`${$timeline.progress * 100}%`} />
 *
 * No dependency on the svelte package — only the store contract, so it
 * works across Svelte 4/5 (see `src/svelte/stores.ts`).
 *
 * @module trellis/timeline/svelte
 */

import { toSvelteStore } from '../../headless/index.js';
import { createTimelineCore } from '../core/index.js';
import type {
  TimelineConfig,
  TimelineState,
  UseTimelineReturn,
} from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type TimelineInput = TimelineConfig | UseTimelineReturn;

function asTimelineCore(input: TimelineInput): UseTimelineReturn {
  return 'actions' in input ? input : createTimelineCore(input);
}

export interface TimelineStore {
  /** Full timeline state (auto-subscribable). */
  state: { subscribe(run: (value: TimelineState) => void): () => void };
  /** Just the playhead position (auto-subscribable). */
  position: { subscribe(run: (value: number) => void): () => void };
  /** Just the marks (auto-subscribable, for `{#each}`). */
  marks: { subscribe(run: (value: TimelineState['marks']) => void): () => void };
  actions: UseTimelineReturn['actions'];
  /** Raw core (framework-free) for advanced use. */
  core: UseTimelineReturn;
}

/**
 * Create a store-contract timeline from a config or an existing core;
 * actions mutate the shared core.
 */
export function createTimelineStore(input: TimelineInput = {}): TimelineStore {
  const core = asTimelineCore(input);

  return {
    state: toSvelteStore(core),
    position: toSvelteStore(core, (s) => s.position),
    marks: toSvelteStore(core, (s) => s.marks),
    actions: core.actions,
    core,
  };
}
