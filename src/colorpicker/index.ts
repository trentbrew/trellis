/**
 * Headless Colorpicker — Public API Surface (ADR 0034 wedge 9).
 *
 * The core is framework-free, DOM-free, and timer-free (pure math + a
 * draft/commit state machine); adapters live in subpaths:
 *
 *   import { createColorPickerCore } from 'trellis/colorpicker';
 *   import { useColorPicker } from 'trellis/colorpicker/react';
 *   import { useColorPickerVue } from 'trellis/colorpicker/vue';
 *   import { createColorPickerStore } from 'trellis/colorpicker/svelte';
 *   import { createVanillaColorPicker } from 'trellis/colorpicker/vanilla';
 *
 * @module trellis/colorpicker
 */

export { createColorPickerCore } from './core/index.js';
export type {
  ColorContrast,
  ColorFormat,
  ColorPickerActions,
  ColorPickerConfig,
  ColorPickerState,
  UseColorPickerReturn,
} from './core/index.js';
