/**
 * Kanban React — `useKanban` hook (ADR 0034 wedge 13).
 *
 * Import from `trellis/kanban/react`:
 *
 *   const board = useKanban({
 *     data: tasks,
 *     columns: [{ id: 'title', accessorKey: 'title', header: 'Title' }],
 *     groupFields: [{ id: 'status', label: 'Status', affordance: 'select',
 *                     options: [{ value: 'todo' }, { value: 'done' }] }],
 *     groupFieldId: 'status',
 *   });
 *   // <section>{board.state.columns.map((col) => (
 *   //   <div key={col.id} data-column={col.id}>
 *   //     {col.title} · {col.count}
 *   //     {col.cards.map((card) => (
 *   //       <div key={card.id}>{card.cells.title}</div>
 *   //     ))}
 *   //   </div>
 *   // ))}</section>
 *
 * The core is created once per mount; state flows through
 * `useSyncExternalStore` (same bridge as `trellis/table/react`).
 * Generic over the row type: `useKanban<Task>(...)`.
 *
 * @module trellis/kanban/react
 */

import { useRef, useSyncExternalStore } from 'react';
import { createKanbanCore } from '../core/index.js';
import type { KanbanConfig, UseKanbanReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type KanbanInput<T> = KanbanConfig<T> | UseKanbanReturn<T>;

function asKanbanCore<T extends object>(input: KanbanInput<T>): UseKanbanReturn<T> {
  return 'actions' in input ? input : createKanbanCore<T>(input);
}

/**
 * Bind a kanban core to React. Pass a config for a fresh core, or an
 * existing core to share one mount across adapters.
 */
export function useKanban<T extends object>(
  input: KanbanInput<T>,
): UseKanbanReturn<T> {
  const ref = useRef<UseKanbanReturn<T> | null>(null);
  if (ref.current === null) {
    ref.current = asKanbanCore(input);
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
