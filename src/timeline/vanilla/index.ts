/**
 * Timeline Vanilla — framework-free bindings (ADR 0034 wedge 3).
 *
 * Import from `trellis/timeline/vanilla`:
 *
 *   const timeline = createVanillaTimeline({ duration: 90 });
 *   timeline.subscribe(() => render(timeline.state));
 *   setInterval(() => timeline.actions.step(1 / 60), 16);
 *
 * The core is timer-free by design — the caller drives the clock (see
 * `createTimelineCore`).
 *
 * @module trellis/timeline/vanilla
 */

import { createTimelineCore } from '../core/index.js';
import type { TimelineConfig, UseTimelineReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type TimelineInput = TimelineConfig | UseTimelineReturn;

function asTimelineCore(input: TimelineInput): UseTimelineReturn {
  return 'actions' in input ? input : createTimelineCore(input);
}

/**
 * Create a framework-free timeline from a config or an existing core (to
 * share one mount across adapters) with the standard core surface.
 */
export function createVanillaTimeline(input: TimelineInput = {}): UseTimelineReturn {
  return asTimelineCore(input);
}
