/**
 * Palette React — `usePalette` hook (ADR 0034).
 *
 * Import from `trellis/palette/react`:
 *
 *   const { state, actions } = usePalette({ items, onSelect });
 *   <input value={state.query} onInput={(e) => actions.setQuery(e.currentTarget.value)} />
 *
 * The core is created once per mount; state flows through
 * `useSyncExternalStore` (same bridge as `trellis/forms/react`).
 *
 * @module trellis/palette/react
 */

import { useRef, useSyncExternalStore } from 'react';
import { createPaletteCore } from '../core/index.js';
import type { PaletteConfig, UsePaletteReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type PaletteInput = PaletteConfig | UsePaletteReturn;

function asPaletteCore(input: PaletteInput): UsePaletteReturn {
  return 'actions' in input ? input : createPaletteCore(input);
}

/**
 * Bind a palette core to React. Pass a config for a fresh core, or an
 * existing core to share one mount across adapters. Returns the same
 * surface as the core; the `state` object is the React-observed snapshot.
 */
export function usePalette(input: PaletteInput): UsePaletteReturn {
  const ref = useRef<UsePaletteReturn | null>(null);
  if (ref.current === null) {
    ref.current = asPaletteCore(input);
  }
  const palette = ref.current;

  const state = useSyncExternalStore(
    palette.subscribe,
    () => palette.state,
    () => palette.state,
  );

  return {
    state,
    actions: palette.actions,
    subscribe: palette.subscribe,
  };
}
