/**
 * Combobox Vanilla — framework-free bindings (ADR 0034).
 *
 * Import from `trellis/combobox/vanilla`:
 *
 *   const combobox = createVanillaCombobox({ items, onSelect });
 *   combobox.subscribe(() => render(combobox.state));
 *   document.addEventListener('keydown', (e) => {
 *     if (e.key === 'Escape') combobox.actions.close();
 *     if (e.key === 'ArrowDown') combobox.actions.move(1);
 *     if (e.key === 'Enter') combobox.actions.select();
 *   });
 *
 * @module trellis/combobox/vanilla
 */

import { createComboboxCore } from '../core/index.js';
import type { ComboboxConfig, UseComboboxReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type ComboboxInput = ComboboxConfig | UseComboboxReturn;

function asComboboxCore(input: ComboboxInput): UseComboboxReturn {
  return 'actions' in input ? input : createComboboxCore(input);
}

/**
 * Create a framework-free combobox from a config or an existing core (to
 * share one mount across adapters) with the standard core surface.
 */
export function createVanillaCombobox(input: ComboboxInput): UseComboboxReturn {
  return asComboboxCore(input);
}