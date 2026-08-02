/**
 * Colorpicker Vanilla — framework-free bindings (ADR 0034 wedge 9).
 *
 * Import from `trellis/colorpicker/vanilla`:
 *
 *   const picker = createVanillaColorPicker({ initial: '#3366ff' });
 *   picker.actions.open();
 *   picker.subscribe(() => renderSwatch(picker.state.normalized));
 *
 * @module trellis/colorpicker/vanilla
 */

import { createColorPickerCore } from '../core/index.js';
import type { ColorPickerConfig, UseColorPickerReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type ColorPickerInput = ColorPickerConfig | UseColorPickerReturn;

function asColorPickerCore(input: ColorPickerInput): UseColorPickerReturn {
  return 'actions' in input ? input : createColorPickerCore(input);
}

/**
 * Create a framework-free colorpicker from a config or an existing core
 * (to share one mount across adapters) with the standard core surface.
 */
export function createVanillaColorPicker(
  input: ColorPickerInput = {},
): UseColorPickerReturn {
  return asColorPickerCore(input);
}
