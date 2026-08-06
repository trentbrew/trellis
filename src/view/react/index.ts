/**
 * View React — `useView` hook (ADR 0034 / Phase C).
 *
 *   const view = useView({
 *     entityType: 'issue',
 *     defaultMode: 'table',
 *     defaultColumns: ['title', 'status'],
 *   });
 *   view.actions.setMode('kanban');   // seamless morph
 *   view.state.mode;                  // 'kanban'
 *   view.state.columns;              // ['title', 'status']
 *
 * The core is created once per mount; state flows through
 * `useSyncExternalStore` (same bridge as `trellis/table/react`).
 *
 * @module trellis/view/react
 */

import { useRef, useSyncExternalStore } from 'react';
import { createViewCore } from '../core/index.js';
import type { ViewConfig, UseViewReturn } from '../core/index.js';

export function useView<T extends Record<string, unknown> = Record<string, unknown>>(
  config: ViewConfig<T>,
): UseViewReturn<T> {
  const ref = useRef<UseViewReturn<T> | null>(null);
  if (ref.current === null) {
    ref.current = createViewCore<T>(config);
  }
  const core = ref.current;

  const state = useSyncExternalStore(
    core.subscribe,
    () => core.state,
    () => core.state,
  );

  return {
    state,
    actions: core.actions,
    subscribe: core.subscribe,
  };
}
