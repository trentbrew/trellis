/**
 * Palette Vanilla — framework-free bindings (ADR 0034).
 *
 * Import from `trellis/palette/vanilla`:
 *
 *   const palette = createVanillaPalette({ items, onSelect });
 *   palette.subscribe(() => render(palette.state));
 *   document.addEventListener('keydown', (e) => {
 *     if (e.key === 'Escape') palette.actions.close();
 *     if (e.key === 'ArrowDown') palette.actions.moveSelection(1);
 *     if (e.key === 'Enter') palette.actions.select();
 *   });
 *
 * @module trellis/palette/vanilla
 */

import { createPaletteCore } from '../core/index.js';
import type { PaletteConfig, UsePaletteReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type PaletteInput = PaletteConfig | UsePaletteReturn;

function asPaletteCore(input: PaletteInput): UsePaletteReturn {
  return 'actions' in input ? input : createPaletteCore(input);
}

/**
 * Create a framework-free palette from a config or an existing core (to
 * share one mount across adapters) with the standard core surface.
 */
export function createVanillaPalette(input: PaletteInput): UsePaletteReturn {
  return asPaletteCore(input);
}
