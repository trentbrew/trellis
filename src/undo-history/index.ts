/**
 * Headless Undo-history — Public API Surface (ADR 0034 wedge 8).
 *
 * A service core, not a registry type: it renders nothing; it augments
 * every editable domain (editor/code/table/composer cores). The core is
 * framework-free, DOM-free, and timer-free; adapters live in subpaths:
 *
 *   import { createUndoHistoryCore } from 'trellis/undo-history';
 *   import { useUndoHistory } from 'trellis/undo-history/react';
 *   import { useUndoHistoryVue } from 'trellis/undo-history/vue';
 *   import { createUndoHistoryStore } from 'trellis/undo-history/svelte';
 *   import { createVanillaUndoHistory } from 'trellis/undo-history/vanilla';
 *
 * @module trellis/undo-history
 */

export { createUndoHistoryCore } from './core/index.js';
export type {
  UndoActions,
  UndoCommand,
  UndoConfig,
  UndoPushOptions,
  UndoState,
  UseUndoReturn,
} from './core/index.js';
