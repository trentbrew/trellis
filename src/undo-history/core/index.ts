/**
 * Undo-history core — generic command stack (ADR 0034 wedge 8).
 *
 * Framework-free, DOM-free, timer-free: state only changes through
 * explicit `actions`, so every behavior is deterministic and testable in
 * Node. It is a service core — it renders nothing; it augments every
 * domain that can be edited (editor/code/table/composer cores).
 *
 *   const undo = createUndoHistoryCore();
 *   undo.actions.push(insertChar, { coalesce: true }); // typing burst
 *   undo.actions.undo();                               // one step back
 *   undo.actions.redo();
 *
 * Contract: the caller executes a command, then pushes it. Undo executes
 * the pushed command's `invert()`; redo re-executes the original. The core
 * owns grouping (one gesture = one step), coalescing (adjacent same-key
 * commands merge), depth limiting, and redo invalidation on new edits.
 *
 * @module trellis/undo-history
 */

import type {
  UndoActions,
  UndoCommand,
  UndoConfig,
  UndoPushOptions,
  UndoState,
  UseUndoReturn,
} from './types.js';

export type {
  UndoActions,
  UndoCommand,
  UndoConfig,
  UndoPushOptions,
  UndoState,
  UseUndoReturn,
} from './types.js';

/** One undo/redo step: one or more commands (group or coalesce). */
interface UndoEntry {
  commands: UndoCommand[];
  label: string | null;
  /** Present only when the entry is coalesce-eligible. */
  coalesceKey?: string;
}

/** Open group frame — pushes land here until `endGroup`. */
interface GroupFrame {
  label: string | null;
  commands: UndoCommand[];
}

export function createUndoHistoryCore(config: UndoConfig = {}): UseUndoReturn {
  const maxDepth = config.maxDepth ?? 100;

  const undoStack: UndoEntry[] = [];
  const redoStack: UndoEntry[] = [];
  const groupStack: GroupFrame[] = [];
  let lastCoalesce: { key: string; eligible: boolean } | null = null;

  let state = deriveState();
  const subscribers = new Set<() => void>();
  const notify = () => subscribers.forEach((fn) => fn());

  function deriveState(): UndoState {
    const top = undoStack[undoStack.length - 1];
    const redoTop = redoStack[redoStack.length - 1];
    return {
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
      undoCount: undoStack.length,
      redoCount: redoStack.length,
      undoLabel: top?.label ?? null,
      redoLabel: redoTop?.label ?? null,
    };
  }

  function enforceDepth(): void {
    if (maxDepth <= 0) return;
    while (undoStack.length > maxDepth) undoStack.shift();
  }

  /** Root-level push of a fully-formed entry; breaks any coalesce window. */
  function commitEntry(entry: UndoEntry): void {
    undoStack.push(entry);
    enforceDepth();
    lastCoalesce = null;
    state = deriveState();
    notify();
  }

  function commitGroup(label: string | null, commands: UndoCommand[]): void {
    if (commands.length === 0) return;
    commitEntry({
      commands,
      label: label ?? commands[0]?.label ?? null,
    });
  }

  const actions: UndoActions = {
    push: (command, opts?: UndoPushOptions) => {
      redoStack.length = 0; // new edits cut the future

      // Open group: append to the frame (coalescing is frame-wide later).
      if (groupStack.length > 0) {
        const frame = groupStack[groupStack.length - 1]!;
        if (!frame.label && command.label) frame.label = command.label;
        frame.commands.push(command);
        lastCoalesce = null;
        state = deriveState();
        notify();
        return;
      }

      const key =
        opts?.coalesceKey ?? command.coalesceKey ?? command.label ?? null;
      const canCoalesce =
        key !== null &&
        opts?.coalesce === true &&
        lastCoalesce?.eligible === true &&
        lastCoalesce.key === key;

      if (canCoalesce) {
        const top = undoStack[undoStack.length - 1]!;
        top.commands.push(command);
        if (!top.label && command.label) top.label = command.label;
        state = deriveState();
        notify();
        return;
      }

      commitEntry({
        commands: [command],
        label: command.label ?? null,
        ...(key !== null && opts?.coalesce === true ? { coalesceKey: key } : {}),
      });
      lastCoalesce = key !== null ? { key, eligible: opts?.coalesce === true } : null;
    },

    pushGroup: (commands, label) => {
      if (commands.length === 0) return;
      redoStack.length = 0;
      commitGroup(label ?? null, commands);
    },

    beginGroup: (label) => {
      groupStack.push({ label: label ?? null, commands: [] });
      lastCoalesce = null;
      state = deriveState();
      notify();
    },

    endGroup: () => {
      if (groupStack.length === 0) return;
      const frame = groupStack.pop()!;
      if (groupStack.length > 0) {
        // Nested group: merge into the enclosing frame.
        const parent = groupStack[groupStack.length - 1]!;
        parent.commands.push(...frame.commands);
        if (!parent.label && frame.label) parent.label = frame.label;
        lastCoalesce = null;
        state = deriveState();
        notify();
        return;
      }
      commitGroup(frame.label, frame.commands);
    },

    undo: () => {
      const entry = undoStack.pop();
      if (!entry) return false;
      for (let i = entry.commands.length - 1; i >= 0; i--) {
        const command = entry.commands[i]!;
        command.invert().execute();
      }
      redoStack.push(entry);
      lastCoalesce = null;
      state = deriveState();
      notify();
      return true;
    },

    redo: () => {
      const entry = redoStack.pop();
      if (!entry) return false;
      for (const command of entry.commands) command.execute();
      undoStack.push(entry);
      enforceDepth();
      lastCoalesce = null;
      state = deriveState();
      notify();
      return true;
    },

    clear: () => {
      undoStack.length = 0;
      redoStack.length = 0;
      groupStack.length = 0;
      lastCoalesce = null;
      state = deriveState();
      notify();
    },
  };

  const core: UseUndoReturn = {
    get state(): UndoState {
      return state;
    },
    actions,
    subscribe: (listener: () => void) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
  };

  return core;
}
