/**
 * Kanban core barrel (ADR 0034 wedge 13) — `trellis/kanban`.
 *
 *   import { createKanbanCore } from 'trellis/kanban';
 *
 * Adapters: `trellis/kanban/react`, `trellis/kanban/vue`,
 * `trellis/kanban/svelte`, `trellis/kanban/vanilla`.
 *
 * @module trellis/kanban
 */

export { createKanbanCore } from './core/index.js';
export type {
  BoardDescriptor,
  KanbanActions,
  KanbanCardView,
  KanbanColumnSort,
  KanbanColumnView,
  KanbanConfig,
  KanbanDragState,
  KanbanFieldAffordance,
  KanbanGroupField,
  KanbanGroupValue,
  KanbanState,
  KanbanWriteHooks,
  UseKanbanReturn,
} from './core/index.js';
