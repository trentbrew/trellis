/**
 * Palette fuzzy matching — re-exported from the shared headless
 * furniture module (ADR 0034 §3). The canonical implementation
 * lives in `src/headless/fuzzy.ts`.
 *
 * @module trellis/palette
 */

export { fuzzyScore, fuzzyMatch, fuzzyRanges } from '../../headless/fuzzy.js';