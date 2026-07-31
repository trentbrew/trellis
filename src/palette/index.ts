/**
 * Headless Palette — Public API Surface (ADR 0034 pilot wedge).
 *
 * The core is framework-free and DOM-free; adapters live in subpaths:
 *
 *   import { createPaletteCore } from 'trellis/palette';
 *   import { usePalette } from 'trellis/palette/react';
 *   import { usePaletteVue } from 'trellis/palette/vue';
 *   import { createPaletteStore } from 'trellis/palette/svelte';
 *   import { createVanillaPalette } from 'trellis/palette/vanilla';
 *
 * @module trellis/palette
 */

export { createPaletteCore } from './core/index.js';
export { fuzzyMatch, fuzzyScore } from './core/fuzzy.js';
export type {
  PaletteActions,
  PaletteConfig,
  PaletteFilter,
  PaletteGroup,
  PaletteItem,
  PaletteState,
  UsePaletteReturn,
} from './core/index.js';
