/**
 * Undo-history Vanilla — framework-free bindings (ADR 0034 wedge 8).
 *
 * Import from `trellis/undo-history/vanilla`:
 *
 *   const undo = createVanillaUndoHistory();
 *   undo.actions.push(insertChar, { coalesce: true });
 *   undo.subscribe(() => renderUndoState(undo.state));
 *
 * @module trellis/undo-history/vanilla
 */

import { createUndoHistoryCore } from '../core/index.js';
import type { UndoConfig, UseUndoReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type UndoInput = UndoConfig | UseUndoReturn;

function asUndoCore(input: UndoInput): UseUndoReturn {
  return 'actions' in input ? input : createUndoHistoryCore(input);
}

/**
 * Create a framework-free undo-history from a config or an existing core
 * (to share one mount across adapters) with the standard core surface.
 */
export function createVanillaUndoHistory(input: UndoInput = {}): UseUndoReturn {
  return asUndoCore(input);
}
