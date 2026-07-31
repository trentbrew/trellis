/**
 * Timeline React — `useTimeline` hook (ADR 0034 wedge 3).
 *
 * Import from `trellis/timeline/react`:
 *
 *   const { state, actions } = useTimeline({ duration: 90 });
 *   useEffect(() => {
 *     const id = setInterval(() => actions.step(1 / 60), 16);
 *     return () => clearInterval(id);
 *   }, []);
 *
 * The core is created once per mount; state flows through
 * `useSyncExternalStore` (same bridge as `trellis/forms/react`).
 *
 * @module trellis/timeline/react
 */

import { useRef, useSyncExternalStore } from 'react';
import { createTimelineCore } from '../core/index.js';
import type { TimelineConfig, UseTimelineReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type TimelineInput = TimelineConfig | UseTimelineReturn;

function asTimelineCore(input: TimelineInput): UseTimelineReturn {
  return 'actions' in input ? input : createTimelineCore(input);
}

/**
 * Bind a timeline core to React. Pass a config for a fresh core, or an
 * existing core to share one mount across adapters.
 */
export function useTimeline(input: TimelineInput = {}): UseTimelineReturn {
  const ref = useRef<UseTimelineReturn | null>(null);
  if (ref.current === null) {
    ref.current = asTimelineCore(input);
  }
  const timeline = ref.current;

  const state = useSyncExternalStore(
    timeline.subscribe,
    () => timeline.state,
    () => timeline.state,
  );

  return {
    state,
    actions: timeline.actions,
    subscribe: timeline.subscribe,
  };
}
