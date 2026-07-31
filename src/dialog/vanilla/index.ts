/**
 * Dialog Vanilla — framework-free bindings (ADR 0034 wedge 2).
 *
 * Import from `trellis/dialog/vanilla`:
 *
 *   const dialogs = createVanillaDialog();
 *   dialogs.subscribe(() => renderStack(dialogs.state));
 *   document.addEventListener('keydown', (e) => {
 *     if (e.key === 'Escape' && dialogs.state.top?.a11y.escToDismiss) {
 *       dialogs.actions.dismiss(dialogs.state.top.id);
 *     }
 *   });
 *
 * The core owns the a11y contract; DOM focus management belongs to the
 * renderer (follow-up wedge).
 *
 * @module trellis/dialog/vanilla
 */

import { createDialogCore } from '../core/index.js';
import type { DialogConfig, UseDialogReturn } from '../core/index.js';

/** Accept either a config (fresh core) or an existing core (shared mount). */
export type DialogInput = DialogConfig | UseDialogReturn;

function asDialogCore(input: DialogInput): UseDialogReturn {
  return 'actions' in input ? input : createDialogCore(input);
}

/**
 * Create a framework-free dialog stack from a config or an existing core
 * (to share one mount across adapters) with the standard core surface.
 */
export function createVanillaDialog(input: DialogInput = {}): UseDialogReturn {
  return asDialogCore(input);
}
