/**
 * Table core barrel (ADR 0034 wedge 6) — `trellis/table`.
 *
 *   import { createTableCore } from 'trellis/table';
 *
 * Adapters: `trellis/table/react`, `trellis/table/vue`,
 * `trellis/table/svelte`, `trellis/table/vanilla`.
 *
 * @module trellis/table
 */

export { createTableCore } from './core/index.js';
export type {
  CellValueType,
  EditingCell,
  SortDirection,
  SortSpec,
  TableActions,
  TableColumn,
  TableColumnView,
  TableConfig,
  TableRowView,
  TableState,
  UndoCommandLike,
  UndoLike,
  UseTableReturn,
} from './core/index.js';
