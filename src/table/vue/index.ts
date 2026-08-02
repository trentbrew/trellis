/**
 * Table Vue — `useTableVue` composable (ADR 0034 wedge 6).
 *
 * Import from `trellis/table/vue`:
 *
 *   const table = useTableVue({
 *     data: tasks,
 *     columns: [{ id: 'title', accessorKey: 'title', header: 'Title' }],
 *   });
 *   // <tbody>
 *   //   <tr v-for="row in table.state.rows" :key="row.id">
 *   //     <td v-for="col in table.state.columns" :key="col.id">
 *   //       {{ row.cells[col.id] }}
 *   //     </td>
 *   //   </tr>
 *   // </tbody>
 *
 * State is a Vue `reactive` object mirrored from the core via the shared
 * `syncFromCore` bridge (same pattern as `trellis/undo-history/vue`).
 * Generic over the row type.
 *
 * @module trellis/table/vue
 */

import { reactive } from 'vue';
import { syncFromCore } from '../../headless/index.js';
import { createTableCore } from '../core/index.js';
import type { TableConfig, TableState, UseTableReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type TableInput<T> = TableConfig<T> | UseTableReturn<T>;

function asTableCore<T extends object>(input: TableInput<T>): UseTableReturn<T> {
  return 'actions' in input ? input : createTableCore<T>(input);
}

/**
 * Create a reactive Vue table. The core's state is mirrored into a
 * `reactive()` object on every mutation.
 */
export function useTableVue<T extends object>(
  input: TableInput<T>,
): UseTableReturn<T> {
  const core = asTableCore(input);
  const state = reactive({ ...core.state }) as TableState;

  syncFromCore(state, core);

  return {
    get state() {
      return state as TableState;
    },
    actions: core.actions,
    subscribe: core.subscribe,
  };
}
