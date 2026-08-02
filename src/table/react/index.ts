/**
 * Table React — `useTable` hook (ADR 0034 wedge 6).
 *
 * Import from `trellis/table/react`:
 *
 *   const table = useTable({
 *     data: tasks,
 *     columns: [{ id: 'title', accessorKey: 'title', header: 'Title' }],
 *     undoHistory: undo,
 *   });
 *   // <tbody>{table.state.rows.map((row) => (
 *   //   <tr key={row.id}>{table.state.columns.map((col) => (
 *   //     <td onClick={() => col.editable && table.actions.startEdit(row.id, col.id)}>
 *   //       {row.cells[col.id]}
 *   //     </td>
 *   //   ))}</tr>
 *   // ))}</tbody>
 *
 * The core is created once per mount; state flows through
 * `useSyncExternalStore` (same bridge as `trellis/undo-history/react`).
 * Generic over the row type: `useTable<Task>(...)`.
 *
 * @module trellis/table/react
 */

import { useRef, useSyncExternalStore } from 'react';
import { createTableCore } from '../core/index.js';
import type { TableConfig, UseTableReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type TableInput<T> = TableConfig<T> | UseTableReturn<T>;

function asTableCore<T extends object>(input: TableInput<T>): UseTableReturn<T> {
  return 'actions' in input ? input : createTableCore<T>(input);
}

/**
 * Bind a table core to React. Pass a config for a fresh core, or an
 * existing core to share one mount across adapters.
 */
export function useTable<T extends object>(
  input: TableInput<T>,
): UseTableReturn<T> {
  const ref = useRef<UseTableReturn<T> | null>(null);
  if (ref.current === null) {
    ref.current = asTableCore(input);
  }
  const core = ref.current;

  const state = useSyncExternalStore(
    core.subscribe,
    () => core.state,
    () => core.state,
  );

  return {
    state,
    actions: core.actions,
    subscribe: core.subscribe,
  };
}
