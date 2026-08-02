/**
 * Editor core barrel (ADR 0034 wedge 4) — `trellis/editor`.
 *
 *   import { createEditorCore } from 'trellis/editor';
 *
 * Adapters: `trellis/editor/react`, `trellis/editor/vue`,
 * `trellis/editor/svelte`, `trellis/editor/vanilla`.
 *
 * @module trellis/editor
 */

export { createEditorCore } from './core/index.js';
export type {
  BlockType,
  EditorActions,
  EditorConfig,
  EditorDocJSON,
  EditorSchemaConfig,
  EditorSelection,
  EditorState,
  MarkType,
  UndoCommandLike,
  UndoLike,
  UseEditorReturn,
} from './core/index.js';
