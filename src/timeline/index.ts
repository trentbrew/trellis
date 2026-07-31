/**
 * Headless Timeline — Public API Surface (ADR 0034 wedge 3).
 *
 * The core is framework-free, DOM-free, and timer-free (time advances only
 * via explicit `step`); adapters live in subpaths:
 *
 *   import { createTimelineCore } from 'trellis/timeline';
 *   import { useTimeline } from 'trellis/timeline/react';
 *   import { useTimelineVue } from 'trellis/timeline/vue';
 *   import { createTimelineStore } from 'trellis/timeline/svelte';
 *   import { createVanillaTimeline } from 'trellis/timeline/vanilla';
 *
 * @module trellis/timeline
 */

export { createTimelineCore } from './core/index.js';
export type {
  TimelineActions,
  TimelineConfig,
  TimelineMark,
  TimelineRange,
  TimelineState,
  UseTimelineReturn,
} from './core/index.js';
