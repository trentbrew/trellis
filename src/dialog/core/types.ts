/**
 * Dialog core types — the stacked-dialog contract (ADR 0034 §6, wedge 2).
 *
 * @module trellis/dialog
 */

export type DialogKind = 'modal' | 'nonmodal' | 'alert' | 'confirm';

export interface DialogButton {
  id: string;
  label: string;
  /** 'primary' renders emphasized; 'danger' for destructive confirms. */
  variant?: 'primary' | 'danger' | 'ghost';
  disabled?: boolean;
  /** Focus this button when the dialog opens. */
  autoFocus?: boolean;
}

/** Pure JSON spec — the dialog's *what*, not its rendering (ADR 0034 §4). */
export interface DialogSpec<TData = unknown> {
  /** Kind selector; defaults to the core's defaultKind ('modal'). */
  kind?: DialogKind;
  title?: string;
  description?: string;
  /** 'auto' (default) sizes by kind; explicit sizes are renderer hints. */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'auto';
  /** Close on Escape (default: true for all kinds). */
  escToDismiss?: boolean;
  /** Show a backdrop (default: true for modal/alert/confirm). */
  backdrop?: boolean;
  /** Close on backdrop click (default: false). */
  dismissOnBackdrop?: boolean;
  /** Buttons resolve the dialog with `{ status: 'ok', value: buttonId }`. */
  buttons?: DialogButton[];
  /** Optional explicit focus target (CSS selector); default 'auto'. */
  focusTarget?: string;
  /** Arbitrary payload the opener needs back on resolve. */
  data?: TData;
}

export interface DialogInstance<TData = unknown> {
  /** Stable unique id. */
  id: string;
  kind: DialogKind;
  spec: DialogSpec<TData>;
  /** 'open' → 'closing' (exit animation) → removed. */
  status: 'open' | 'closing';
  /** Monotonic stack order (older = lower). */
  openedAt: number;
  /** Derived a11y contract — the adapter renders against this, never hand-authoring it. */
  a11y: {
    /** 'dialog' for modal/nonmodal, 'alertdialog' for alert/confirm. */
    role: 'dialog' | 'alertdialog';
    ariaModal: boolean;
    labelledBy: string | null;
    describedBy: string | null;
    /** Focus target: spec.focusTarget or 'auto'. */
    focusTarget: string | null;
    escToDismiss: boolean;
    backdrop: boolean;
    dismissOnBackdrop: boolean;
  };
}

export type DialogResult<T = unknown> =
  | { status: 'ok'; value: T }
  | { status: 'dismissed' };

export interface DialogState {
  /** Open + closing instances, bottom (oldest) first. */
  stack: DialogInstance[];
  /** Derived: the topmost instance, or null. */
  top: DialogInstance | null;
  /** Derived: stack depth. */
  count: number;
  /** Derived: any modal/alert/confirm open → background must be inert. */
  focusLocked: boolean;
}

export interface DialogActions {
  /**
   * Push a dialog onto the stack; resolves when it closes:
   * `{ status: 'ok', value }` on close/button, `{ status: 'dismissed' }`
   * on dismiss/esc/backdrop.
   */
  open<TResult = unknown, TData = unknown>(
    spec: DialogSpec<TData>,
  ): Promise<DialogResult<TResult>>;
  /** Close a dialog by id, resolving its promise with a value. */
  close(id: string, value?: unknown): void;
  /** Close the topmost dialog, resolving it with a value. */
  closeTop(value?: unknown): void;
  /** Dismiss (close without a value) — promise resolves `dismissed`. */
  dismiss(id: string): void;
  /** Resolve the top of the stack via a button id (`{ status: 'ok', value: buttonId }`). */
  closeWithButton(id: string, buttonId: string): void;
  /** Replace the top instance with a new spec (progress/step dialogs). */
  replaceTop<TData = unknown>(spec: DialogSpec<TData>): string;
  /** Mark the top instance as exiting (animation lifecycle). */
  setClosing(id: string): void;
  /** Remove a 'closing' instance from the stack. */
  finishClosing(id: string): void;
  /** Dismiss every open dialog. */
  clear(): void;
}

export interface DialogConfig {
  /** Default kind for specs without one (default: 'modal'). */
  defaultKind?: DialogKind;
}

export interface UseDialogReturn {
  readonly state: DialogState;
  readonly actions: DialogActions;
  subscribe(listener: () => void): () => void;
}
