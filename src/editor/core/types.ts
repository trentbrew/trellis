/**
 * Editor core types — the headless rich-text contract
 * (ADR 0034 §6, wedge 4).
 *
 * Rich text is the registry's note surface: the document model is
 * ProseMirror (adopted — already headless, Node-testable; its DOM view
 * is the adapter tier), wrapped behind the standard bridge. The
 * Trellis-specific layer is built, not adopted:
 *
 *   - the schema is descriptor-driven: `EditorSchemaConfig` picks the
 *     block/mark surface from the adopted schema (same shape as the
 *     forms-descriptor generator — per-surface schema constraints);
 *   - the document is serializable core data (`EditorState.doc` is
 *     ProseMirror node JSON — the descriptor shape, one op to persist);
 *   - `undoHistory` composes the undo-history service core: every
 *     mutation pushes one reversible command, and consecutive typing
 *     coalesces into a single undo step (typing bursts).
 *
 * Boundary: the DOM view (caret rendering, input events, IME) is the
 * visual runtime's job — adapters bind it; ProseMirror's built-in
 * history is unused because the shared undo-history core owns the
 * stack (ADR §6.8).
 *
 * @module trellis/editor
 */

/** Block types available on the default schema surface. */
export type BlockType =
  | 'paragraph'
  | 'blockquote'
  | 'code_block'
  | 'heading'
  | 'horizontal_rule';

/** Inline mark types available on the default schema surface. */
export type MarkType = 'strong' | 'em' | 'code' | 'link';

/** Descriptor surface — picks blocks/marks from the adopted schema. */
export interface EditorSchemaConfig {
  /** Enabled blocks (default: all). `doc`/`paragraph`/`text` are implicit. */
  blocks?: BlockType[];
  /** Enabled marks (default: all). */
  marks?: MarkType[];
}

/** Serializable document — ProseMirror node JSON. */
export interface EditorDocJSON {
  type: 'doc';
  content?: Array<Record<string, unknown>>;
}

export interface EditorSelection {
  from: number;
  to: number;
  empty: boolean;
}

export interface EditorState {
  /** The document as ProseMirror node JSON (descriptor shape). */
  doc: EditorDocJSON;
  /** Plain text of the document (search/placeholder/durable value). */
  text: string;
  selection: EditorSelection;
  /** Marks active at the cursor (stored) or spanning the selection. */
  activeMarks: MarkType[];
  /** Top-level block at the selection start. */
  blockType: BlockType;
  /** `heading` level when `blockType === 'heading'`, else null. */
  headingLevel: number | null;
  /** Undo availability — projected from the composed undo core. */
  canUndo: boolean;
  canRedo: boolean;
}

export interface EditorConfig {
  /** Initial document (default: a single empty paragraph). */
  doc?: EditorDocJSON;
  /** Schema surface (default: all blocks + marks). */
  schema?: EditorSchemaConfig;
  /** Compose the undo-history service core (edits = one step each). */
  undoHistory?: UndoLike;
}

export interface EditorActions {
  /**
   * Insert text at the selection (replacing any selection). Consecutive
   * calls coalesce into one undo step (typing bursts).
   */
  type(text: string): void;
  /** Move the selection; positions clamp to the document and normalize. */
  setSelection(from: number, to?: number): void;
  /**
   * Toggle a mark over the selection; when the selection is collapsed,
   * toggle the stored mark so subsequent typing carries it. Link marks
   * take `{ href }` attrs.
   */
  toggleMark(mark: MarkType, attrs?: Record<string, unknown>): void;
  /** Set the block type over the selection (`level` for headings). */
  setBlock(block: BlockType, level?: number): void;
  /** Split the current block at the cursor (Enter semantics). */
  insertBreak(): void;
  /** Insert a horizontal rule at the cursor. */
  insertHorizontalRule(): void;
  /** Replace the document with a single empty paragraph (undoable). */
  clear(): void;
  /** Delegate to the composed undo core; false when none is composed. */
  undo(): boolean;
  /** Delegate to the composed undo core; false when none is composed. */
  redo(): boolean;
}

/** Structural slice of the undo-history service core (decoupled). */
export interface UndoCommandLike {
  label?: string;
  execute(): void;
  invert(): UndoCommandLike;
}

export interface UndoLike {
  readonly state: { canUndo: boolean; canRedo: boolean };
  readonly actions: {
    push(command: UndoCommandLike, opts?: { coalesce?: boolean; coalesceKey?: string }): void;
    undo(): boolean;
    redo(): boolean;
  };
  subscribe(listener: () => void): () => void;
}

export interface UseEditorReturn {
  readonly state: EditorState;
  readonly actions: EditorActions;
  subscribe(listener: () => void): () => void;
}
