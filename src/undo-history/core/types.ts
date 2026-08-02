/**
 * Undo-history core types — the generic command-stack contract
 * (ADR 0034 §6, wedge 8).
 *
 * A service core, not a registry type: it renders nothing, it augments
 * everything. Shared by editor/code/table/composer cores.
 *
 * The invert contract lets any domain core plug in:
 *
 *   const insertChar = {
 *     label: 'Insert "a"',
 *     coalesceKey: 'type',
 *     execute: () => doc.insert(char, at),
 *     invert: () => ({ execute: () => doc.delete(range), invert: insertChar }),
 *   };
 *   undo.actions.push(insertChar, { coalesce: true });
 *
 * Boundary: this is the transient ergonomic layer — durable reversal of
 * applied changes stays in the op-log + semantic diff/merge machinery.
 *
 * @module trellis/undo-history
 */

/**
 * A reversible operation. `execute` applies (or re-applies on redo); the
 * core derives the undo step from `invert()`. Commands are opaque to the
 * core — domain cores own their semantics.
 */
export interface UndoCommand {
  /** Menu/tooltip label — surfaces as `undoLabel`/`redoLabel` (a11y data). */
  label?: string;
  /**
   * Coalescing key: adjacent pushes with the same key (and
   * `{ coalesce: true }`) merge into one undo step (typing bursts).
   */
  coalesceKey?: string;
  /** Apply the command (called by the caller on push, by the core on redo). */
  execute(): void;
  /** Produce the inverse command — the core executes it on undo. */
  invert(): UndoCommand;
}

export interface UndoState {
  /** Derived: undo stack non-empty. */
  canUndo: boolean;
  /** Derived: redo stack non-empty. */
  canRedo: boolean;
  /** Number of undo steps (one step may group many commands). */
  undoCount: number;
  /** Number of redo steps. */
  redoCount: number;
  /** Label of the next undo step, or null ("Undo <label>" tooltips). */
  undoLabel: string | null;
  /** Label of the next redo step, or null. */
  redoLabel: string | null;
}

export interface UndoPushOptions {
  /**
   * Merge with the previous entry when its `coalesceKey` matches
   * (`opts.coalesceKey ?? command.coalesceKey ?? command.label`). A plain
   * push (or undo/redo/clear) breaks the coalesce window.
   */
  coalesce?: boolean;
  /** Coalescing key override (defaults to `command.coalesceKey`). */
  coalesceKey?: string;
}

export interface UndoActions {
  /**
   * Record a command that the caller already executed. Invalidates the
   * redo stack (new edits cut the future).
   */
  push(command: UndoCommand, opts?: UndoPushOptions): void;
  /**
   * Record a set of already-executed commands as a single undo step.
   * Equivalent to `beginGroup` + `push` each + `endGroup`.
   */
  pushGroup(commands: UndoCommand[], label?: string): void;
  /** Open a group: subsequent pushes join one step until `endGroup`. */
  beginGroup(label?: string): void;
  /** Close the current group (no-op when none is open). */
  endGroup(): void;
  /**
   * Undo the most recent step: execute each command's inverse in reverse
   * order and move the step to the redo stack. Returns false when the
   * stack is empty (imperative commands report un-applicability).
   */
  undo(): boolean;
  /** Redo: re-execute the most recent undone step in order. */
  redo(): boolean;
  /** Drop all history and close any open group. */
  clear(): void;
}

export interface UndoConfig {
  /**
   * Maximum undo steps kept; older steps are forgotten (memory bound).
   * Default 100; `<= 0` means unlimited.
   */
  maxDepth?: number;
}

export interface UseUndoReturn {
  readonly state: UndoState;
  readonly actions: UndoActions;
  subscribe(listener: () => void): () => void;
}
