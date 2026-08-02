/**
 * Colorpicker React — `useColorPicker` hook (ADR 0034 wedge 9).
 *
 * Import from `trellis/colorpicker/react`:
 *
 *   const picker = useColorPicker({ initial: '#3366ff' });
 *   picker.actions.open();
 *   // <input value={picker.state.draft} onChange={e => picker.actions.setDraft(e.target.value)} />
 *   // {picker.state.contrast && `white ${picker.state.contrast.white.toFixed(2)}`}
 *
 * The core is created once per mount; state flows through
 * `useSyncExternalStore` (same bridge as `trellis/forms/react`).
 *
 * @module trellis/colorpicker/react
 */

import { useRef, useSyncExternalStore } from 'react';
import { createColorPickerCore } from '../core/index.js';
import type { ColorPickerConfig, UseColorPickerReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type ColorPickerInput = ColorPickerConfig | UseColorPickerReturn;

function asColorPickerCore(input: ColorPickerInput): UseColorPickerReturn {
  return 'actions' in input ? input : createColorPickerCore(input);
}

/**
 * Bind a colorpicker core to React. Pass a config for a fresh core, or an
 * existing core to share one mount across adapters.
 */
export function useColorPicker(input: ColorPickerInput = {}): UseColorPickerReturn {
  const ref = useRef<UseColorPickerReturn | null>(null);
  if (ref.current === null) {
    ref.current = asColorPickerCore(input);
  }
  const picker = ref.current;

  const state = useSyncExternalStore(
    picker.subscribe,
    () => picker.state,
    () => picker.state,
  );

  return {
    state,
    actions: picker.actions,
    subscribe: picker.subscribe,
  };
}
