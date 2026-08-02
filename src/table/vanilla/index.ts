/**
 * Table Vanilla — framework-free bindings (ADR 0034 wedge 6).
 *
 * Import from `trellis/table/vanilla`:
 *
 *   const table = createVanillaTable({ data, columns });
 *   table.actions.startEdit('t1', 'title');
 *   table.subscribe(() => render(table.state));
 *
 * @module trellis/table/vanilla
 */

import { createTableCore } from '../core/index.js';
import type { TableConfig, UseTableReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type TableInput<T> = TableConfig<T> | UseTableReturn<T>;

function asTableCore<T extends object>(input: TableInput<T>): UseTableReturn<T> {
  return 'actions' in input ? input : createTableCore<T>(input);
}

/**
 * Create a framework-free table from a config or an existing core (to
 * share one mount across adapters) with the standard core surface.
 */
export function createVanillaTable<T extends object>(
  input: TableInput<T>,
): UseTableReturn<T> {
  return asTableCore(input);
}
