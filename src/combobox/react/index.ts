/**
 * Combobox React — `useCombobox` hook (ADR 0034).
 *
 * Import from `trellis/combobox/react`:
 *
 *   const { state, actions } = useCombobox({ items, onSelect });
 *   <input value={state.query} onInput={(e) => actions.setQuery(e.currentTarget.value)} />
 *
 * The core is created once per mount; state flows through
 * `useSyncExternalStore` (same bridge as `trellis/forms/react`).
 *
 * @module trellis/combobox/react
 */

import { useRef, useSyncExternalStore } from 'react';
import { createComboboxCore } from '../core/index.js';
import type { ComboboxConfig, UseComboboxReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type ComboboxInput = ComboboxConfig | UseComboboxReturn;

function asComboboxCore(input: ComboboxInput): UseComboboxReturn {
  return 'actions' in input ? input : createComboboxCore(input);
}

/**
 * Bind a combobox core to React. Pass a config for a fresh core, or an
 * existing core to share one mount across adapters. Returns the same
 * surface as the core; the `state` object is the React-observed snapshot.
 */
export function useCombobox(input: ComboboxInput): UseComboboxReturn {
  const ref = useRef<UseComboboxReturn | null>(null);
  if (ref.current === null) {
    ref.current = asComboboxCore(input);
  }
  const combobox = ref.current;

  const state = useSyncExternalStore(
    combobox.subscribe,
    () => combobox.state,
    () => combobox.state,
  );

  return {
    state,
    actions: combobox.actions,
    subscribe: combobox.subscribe,
  };
}