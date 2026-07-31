/**
 * Dialog core — headless stacked-dialog manager (ADR 0034 wedge 2).
 *
 * Framework-free and DOM-free: the stack, async resolution, esc/backdrop
 * policy, and a11y data all live here and are verified in Node. Adapters
 * (`trellis/dialog/react|vue|svelte|vanilla`) render the stack per framework.
 *
 *   const dialogs = createDialogCore();
 *   const result = await dialogs.actions.open({
 *     kind: 'confirm',
 *     title: 'Delete task?',
 *     buttons: [
 *       { id: 'delete', label: 'Delete', variant: 'danger', autoFocus: true },
 *       { id: 'cancel', label: 'Cancel' },
 *     ],
 *   });
 *   if (result.status === 'ok' && result.value === 'delete') { /* … *\/ }
 *
 * @module trellis/dialog
 */

import type {
  DialogActions,
  DialogConfig,
  DialogInstance,
  DialogKind,
  DialogResult,
  DialogSpec,
  DialogState,
  UseDialogReturn,
} from './types.js';

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
} from './types.js';

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `dialog-${idCounter}`;
}

const DEFAULT_BACKDROP: Record<DialogKind, boolean> = {
  modal: true,
  nonmodal: false,
  alert: true,
  confirm: true,
};

function deriveA11y(
  id: string,
  kind: DialogKind,
  spec: DialogSpec,
): DialogInstance['a11y'] {
  const modal = kind === 'modal' || kind === 'alert' || kind === 'confirm';
  return {
    role: kind === 'alert' || kind === 'confirm' ? 'alertdialog' : 'dialog',
    ariaModal: modal,
    labelledBy: spec.title ? `${id}-title` : null,
    describedBy: spec.description ? `${id}-description` : null,
    focusTarget: spec.focusTarget ?? 'auto',
    escToDismiss: spec.escToDismiss ?? true,
    backdrop: spec.backdrop ?? DEFAULT_BACKDROP[kind],
    dismissOnBackdrop: spec.dismissOnBackdrop ?? false,
  };
}

function deriveState(stack: DialogInstance[]): DialogState {
  return {
    stack,
    top: stack.length > 0 ? stack[stack.length - 1]! : null,
    count: stack.length,
    focusLocked: stack.some((d) => d.a11y.ariaModal && d.status === 'open'),
  };
}

export function createDialogCore(config: DialogConfig = {}): UseDialogReturn {
  const defaultKind = config.defaultKind ?? 'modal';
  const resolvers = new Map<string, (result: DialogResult<unknown>) => void>();

  let stack: DialogInstance[] = [];
  const subscribers = new Set<() => void>();
  const notify = () => subscribers.forEach((fn) => fn());

  function pushInstance(instance: DialogInstance): void {
    stack = [...stack, instance];
    notify();
  }

  function removeInstance(id: string): void {
    stack = stack.filter((d) => d.id !== id);
    notify();
  }

  function resolve(id: string, result: DialogResult): void {
    const resolver = resolvers.get(id);
    if (!resolver) return;
    resolvers.delete(id);
    resolver(result);
  }

  const actions: DialogActions = {
    open: <TResult = unknown, TData = unknown>(spec: DialogSpec<TData>) => {
      const id = nextId();
      const kind = spec.kind ?? defaultKind;
      const instance: DialogInstance = {
        id,
        kind,
        spec,
        status: 'open',
        openedAt: stack.length + 1,
        a11y: deriveA11y(id, kind, spec),
      };
      const promise = new Promise<DialogResult<unknown>>((resolvePromise) => {
        // Register before notify() so a subscriber that synchronously
        // closes this dialog still resolves the promise.
        resolvers.set(id, resolvePromise);
      });
      pushInstance(instance);
      // The caller declares TResult; the resolver itself is untyped.
      return promise as Promise<DialogResult<TResult>>;
    },

    close: (id, value) => {
      if (!stack.some((d) => d.id === id)) return;
      removeInstance(id);
      resolve(id, { status: 'ok', value });
    },

    closeTop: (value) => {
      const top = stack[stack.length - 1];
      if (!top) return;
      removeInstance(top.id);
      resolve(top.id, { status: 'ok', value });
    },

    dismiss: (id) => {
      if (!stack.some((d) => d.id === id)) return;
      removeInstance(id);
      resolve(id, { status: 'dismissed' });
    },

    closeWithButton: (id, buttonId) => {
      const instance = stack.find((d) => d.id === id);
      const button = instance?.spec.buttons?.find((b) => b.id === buttonId);
      if (!instance || !button || button.disabled) return;
      removeInstance(id);
      resolve(id, { status: 'ok', value: buttonId });
    },

    replaceTop: (spec) => {
      const top = stack[stack.length - 1];
      const id = top?.id ?? nextId();
      const kind = spec.kind ?? top?.kind ?? defaultKind;
      const instance: DialogInstance = {
        id,
        kind,
        spec,
        status: 'open',
        openedAt: top?.openedAt ?? stack.length + 1,
        a11y: deriveA11y(id, kind, spec),
      };
      stack = top ? [...stack.slice(0, -1), instance] : [instance];
      notify();
      return id;
    },

    setClosing: (id) => {
      stack = stack.map((d) => (d.id === id ? { ...d, status: 'closing' as const } : d));
      notify();
    },

    finishClosing: (id) => {
      removeInstance(id);
    },

    clear: () => {
      const ids = stack.map((d) => d.id);
      stack = [];
      for (const id of ids) resolve(id, { status: 'dismissed' });
      notify();
    },
  };

  const core: UseDialogReturn = {
    get state(): DialogState {
      return deriveState(stack);
    },
    actions,
    subscribe: (listener: () => void) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
  };

  return core;
}
