/**
 * Kanban Vanilla — framework-free bindings (ADR 0034 wedge 13).
 *
 * Import from `trellis/kanban/vanilla`:
 *
 *   const board = createVanillaKanban({ data, columns, groupFields, groupFieldId });
 *   board.actions.moveCard('t1', 'o:todo', 'o:done');
 *   board.subscribe(() => render(board.state));
 *
 * @module trellis/kanban/vanilla
 */

import { createKanbanCore } from '../core/index.js';
import type { KanbanConfig, UseKanbanReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type KanbanInput<T> = KanbanConfig<T> | UseKanbanReturn<T>;

function asKanbanCore<T extends object>(input: KanbanInput<T>): UseKanbanReturn<T> {
  return 'actions' in input ? input : createKanbanCore<T>(input);
}

/**
 * Create a framework-free board from a config or an existing core (to
 * share one mount across adapters) with the standard core surface.
 */
export function createVanillaKanban<T extends object>(
  input: KanbanInput<T>,
): UseKanbanReturn<T> {
  return asKanbanCore(input);
}
