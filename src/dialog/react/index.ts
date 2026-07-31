/**
 * Dialog React — `useDialog` hook (ADR 0034 wedge 2).
 *
 * Import from `trellis/dialog/react`:
 *
 *   const { state, actions } = useDialog();
 *   const result = await actions.open({ title: 'Confirm', kind: 'confirm', buttons: […] });
 *   {state.stack.map((d) => <DialogSurface key={d.id} instance={d} />)}
 *
 * The core is created once per mount; state flows through
 * `useSyncExternalStore` (same bridge as `trellis/forms/react`).
 *
 * @module trellis/dialog/react
 */

import { useRef, useSyncExternalStore } from 'react';
import { createDialogCore } from '../core/index.js';
import type { DialogConfig, UseDialogReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type DialogInput = DialogConfig | UseDialogReturn;

function asDialogCore(input: DialogInput): UseDialogReturn {
  return 'actions' in input ? input : createDialogCore(input);
}

/**
 * Bind a dialog stack to React. Pass a config for a fresh core, or an
 * existing core to share one mount across adapters.
 */
export function useDialog(input: DialogInput = {}): UseDialogReturn {
  const ref = useRef<UseDialogReturn | null>(null);
  if (ref.current === null) {
    ref.current = asDialogCore(input);
  }
  const dialogs = ref.current;

  const state = useSyncExternalStore(
    dialogs.subscribe,
    () => dialogs.state,
    () => dialogs.state,
  );

  return {
    state,
    actions: dialogs.actions,
    subscribe: dialogs.subscribe,
  };
}
