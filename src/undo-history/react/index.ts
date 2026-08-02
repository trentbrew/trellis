/**
 * Undo-history React — `useUndoHistory` hook (ADR 0034 wedge 8).
 *
 * Import from `trellis/undo-history/react`:
 *
 *   const undo = useUndoHistory();
 *   undo.actions.push(insertChar, { coalesce: true });
 *   // <button disabled={!undo.state.canUndo} onClick={undo.actions.undo}>
 *   //   Undo {undo.state.undoLabel}
 *   // </button>
 *
 * The core is created once per mount; state flows through
 * `useSyncExternalStore` (same bridge as `trellis/forms/react`).
 *
 * @module trellis/undo-history/react
 */

import { useRef, useSyncExternalStore } from 'react';
import { createUndoHistoryCore } from '../core/index.js';
import type { UndoConfig, UseUndoReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type UndoInput = UndoConfig | UseUndoReturn;

function asUndoCore(input: UndoInput): UseUndoReturn {
  return 'actions' in input ? input : createUndoHistoryCore(input);
}

/**
 * Bind an undo-history core to React. Pass a config for a fresh core, or
 * an existing core to share one mount across adapters.
 */
export function useUndoHistory(input: UndoInput = {}): UseUndoReturn {
  const ref = useRef<UseUndoReturn | null>(null);
  if (ref.current === null) {
    ref.current = asUndoCore(input);
  }
  const undo = ref.current;

  const state = useSyncExternalStore(
    undo.subscribe,
    () => undo.state,
    () => undo.state,
  );

  return {
    state,
    actions: undo.actions,
    subscribe: undo.subscribe,
  };
}
