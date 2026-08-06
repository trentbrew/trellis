/**
 * View core barrel — `trellis/view`.
 *
 *   import { createViewCore } from 'trellis/view';
 *
 * @module trellis/view
 */

export { createViewCore } from './core/index.js';
export type {
  ViewMode,
  ViewColumn,
  ViewSortSpec,
  ViewState,
  ViewActions,
  ViewConfig,
  UseViewReturn,
} from './core/types.js';
