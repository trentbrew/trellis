/**
 * Headless Combobox — Public API Surface (ADR 0034 wedge 2).
 *
 * The core is framework-free and DOM-free; adapters live in subpaths:
 *
 *   import { createComboboxCore } from 'trellis/combobox';
 *   import { useCombobox } from 'trellis/combobox/react';
 *   import { useComboboxVue } from 'trellis/combobox/vue';
 *   import { createComboboxStore } from 'trellis/combobox/svelte';
 *   import { createVanillaCombobox } from 'trellis/combobox/vanilla';
 *
 * @module trellis/combobox
 */

export { createComboboxCore } from './core/index.js';
export { fuzzyScore, fuzzyRanges } from '../headless/fuzzy.js';
export type {
  ComboboxActions,
  ComboboxConfig,
  ComboboxFilter,
  ComboboxItem,
  ComboboxState,
  UseComboboxReturn,
} from './core/index.js';