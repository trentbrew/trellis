/**
 * Headless Dialog — Public API Surface (ADR 0034 wedge 2).
 *
 * The core is framework-free and DOM-free; adapters live in subpaths:
 *
 *   import { createDialogCore } from 'trellis/dialog';
 *   import { useDialog } from 'trellis/dialog/react';
 *   import { useDialogVue } from 'trellis/dialog/vue';
 *   import { createDialogStore } from 'trellis/dialog/svelte';
 *   import { createVanillaDialog } from 'trellis/dialog/vanilla';
 *
 * @module trellis/dialog
 */

export { createDialogCore } from './core/index.js';
export type {
  DialogActions,
  DialogButton,
  DialogConfig,
  DialogInstance,
  DialogKind,
  DialogResult,
  DialogSpec,
  DialogState,
  UseDialogReturn,
} from './core/index.js';
