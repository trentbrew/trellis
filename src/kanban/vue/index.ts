/**
 * Kanban Vue — `useKanbanVue` composable (ADR 0034 wedge 13).
 *
 * Import from `trellis/kanban/vue`:
 *
 *   const board = useKanbanVue({ data: tasks, columns, groupFields, groupFieldId });
 *   // <div v-for="col in board.state.columns" :key="col.id">
 *   //   {{ col.title }} · {{ col.count }}
 *   //   <div v-for="card in col.cards" :key="card.id">{{ card.cells.title }}</div>
 *   // </div>
 *
 * State is a Vue `reactive` object mirrored from the core via the shared
 * `syncFromCore` bridge (same pattern as `trellis/table/vue`).
 * Generic over the row type.
 *
 * @module trellis/kanban/vue
 */

import { reactive } from 'vue';
import { syncFromCore } from '../../headless/index.js';
import { createKanbanCore } from '../core/index.js';
import type { KanbanConfig, KanbanState, UseKanbanReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type KanbanInput<T> = KanbanConfig<T> | UseKanbanReturn<T>;

function asKanbanCore<T extends object>(input: KanbanInput<T>): UseKanbanReturn<T> {
  return 'actions' in input ? input : createKanbanCore<T>(input);
}

/**
 * Create a reactive Vue board. The core's state is mirrored into a
 * `reactive()` object on every mutation.
 */
export function useKanbanVue<T extends object>(
  input: KanbanInput<T>,
): UseKanbanReturn<T> {
  const core = asKanbanCore(input);
  const state = reactive({ ...core.state }) as KanbanState;

  syncFromCore(state, core);

  return {
    get state() {
      return state as KanbanState;
    },
    actions: core.actions,
    subscribe: core.subscribe,
  };
}
