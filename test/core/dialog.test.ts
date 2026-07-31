/**
 * Headless dialog — core behavior, bridge contract, dual-adapter test.
 * ADR 0034 wedge 2. All tests run in Node with zero DOM.
 */
import { describe, expect, test } from 'vitest';
import {
  createDialogCore,
  type DialogSpec,
} from '../../src/dialog/index.js';
import { createDialogStore } from '../../src/dialog/svelte/index.js';
import { createVanillaDialog } from '../../src/dialog/vanilla/index.js';
import { useDialog } from '../../src/dialog/react/index.js';

// ---------------------------------------------------------------------------
// Core state machine
// ---------------------------------------------------------------------------

describe('createDialogCore', () => {
  test('initial state: empty stack, no lock', () => {
    const dialogs = createDialogCore();
    expect(dialogs.state.stack).toHaveLength(0);
    expect(dialogs.state.top).toBeNull();
    expect(dialogs.state.count).toBe(0);
    expect(dialogs.state.focusLocked).toBe(false);
  });

  test('open pushes and returns a promise; top + count derive', async () => {
    const dialogs = createDialogCore();
    const promise = dialogs.actions.open({ title: 'Hello' });
    expect(dialogs.state.count).toBe(1);
    expect(dialogs.state.top?.spec.title).toBe('Hello');
    expect(promise).toBeInstanceOf(Promise);
    dialogs.actions.closeTop();
    await expect(promise).resolves.toEqual({ status: 'ok', value: undefined });
  });

  test('stack is LIFO; top is the most recent', async () => {
    const dialogs = createDialogCore();
    dialogs.actions.open({ title: 'First' });
    dialogs.actions.open({ title: 'Second' });
    expect(dialogs.state.count).toBe(2);
    expect(dialogs.state.top?.spec.title).toBe('Second');
    expect(dialogs.state.stack.map((d) => d.spec.title)).toEqual(['First', 'Second']);
    dialogs.actions.closeTop();
    expect(dialogs.state.top?.spec.title).toBe('First');
    expect(dialogs.state.count).toBe(1);
    dialogs.actions.clear();
  });

  test('close resolves with a value; dismiss resolves dismissed', async () => {
    const dialogs = createDialogCore();
    const okPromise = dialogs.actions.open({ title: 'Ok' });
    const idOk = dialogs.state.top!.id;
    dialogs.actions.close(idOk, 'picked');
    await expect(okPromise).resolves.toEqual({ status: 'ok', value: 'picked' });

    const dismissPromise = dialogs.actions.open({ title: 'Bye' });
    const idDismiss = dialogs.state.top!.id;
    dialogs.actions.dismiss(idDismiss);
    await expect(dismissPromise).resolves.toEqual({ status: 'dismissed' });
  });

  test('closeWithButton resolves with the button id; disabled buttons no-op', async () => {
    const dialogs = createDialogCore();
    const spec: DialogSpec = {
      kind: 'confirm',
      title: 'Delete?',
      buttons: [
        { id: 'delete', label: 'Delete', variant: 'danger', autoFocus: true },
        { id: 'cancel', label: 'Cancel' },
        { id: 'disabled', label: 'Nope', disabled: true },
      ],
    };
    const promise = dialogs.actions.open(spec);
    const id = dialogs.state.top!.id;

    dialogs.actions.closeWithButton(id, 'disabled');
    expect(dialogs.state.count).toBe(1); // no-op

    dialogs.actions.closeWithButton(id, 'delete');
    await expect(promise).resolves.toEqual({ status: 'ok', value: 'delete' });
    expect(dialogs.state.count).toBe(0);
  });

  test('replaceTop swaps the top instance, preserving its id', async () => {
    const dialogs = createDialogCore();
    const promise = dialogs.actions.open({ title: 'Step 1' });
    const id = dialogs.state.top!.id;
    dialogs.actions.replaceTop({ title: 'Step 2' });
    expect(dialogs.state.top?.id).toBe(id);
    expect(dialogs.state.top?.spec.title).toBe('Step 2');
    expect(dialogs.state.count).toBe(1);
    dialogs.actions.closeTop('done');
    await expect(promise).resolves.toEqual({ status: 'ok', value: 'done' });
  });

  test('setClosing marks exit; finishClosing removes', () => {
    const dialogs = createDialogCore();
    dialogs.actions.open({ title: 'Animated' });
    const id = dialogs.state.top!.id;
    dialogs.actions.setClosing(id);
    expect(dialogs.state.top?.status).toBe('closing');
    expect(dialogs.state.count).toBe(1);
    dialogs.actions.finishClosing(id);
    expect(dialogs.state.count).toBe(0);
  });

  test('clear dismisses everything', async () => {
    const dialogs = createDialogCore();
    const p1 = dialogs.actions.open({ title: 'A' });
    const p2 = dialogs.actions.open({ title: 'B' });
    dialogs.actions.clear();
    await expect(p1).resolves.toEqual({ status: 'dismissed' });
    await expect(p2).resolves.toEqual({ status: 'dismissed' });
    expect(dialogs.state.count).toBe(0);
  });

  test('close of a missing id is a no-op', async () => {
    const dialogs = createDialogCore();
    dialogs.actions.open({ title: 'Solo' });
    dialogs.actions.close('dialog-999', 'x');
    expect(dialogs.state.count).toBe(1);
    dialogs.actions.clear();
  });

  test('subscribe notifies per mutation and unsubscribes', () => {
    const dialogs = createDialogCore();
    let calls = 0;
    const unsubscribe = dialogs.subscribe(() => calls++);
    const promise = dialogs.actions.open({ title: 'X' });
    dialogs.actions.closeTop();
    void promise;
    expect(calls).toBe(2);
    unsubscribe();
    dialogs.actions.open({ title: 'Y' });
    expect(calls).toBe(2);
    dialogs.actions.clear();
  });
});

// ---------------------------------------------------------------------------
// A11y contract (derived, never hand-authored)
// ---------------------------------------------------------------------------

describe('dialog a11y data', () => {
  test('modal kind: role dialog, ariaModal, labelledBy/describedBy', () => {
    const dialogs = createDialogCore();
    dialogs.actions.open({ title: 'Edit', description: 'Fill the form' });
    const a11y = dialogs.state.top!.a11y;
    expect(a11y.role).toBe('dialog');
    expect(a11y.ariaModal).toBe(true);
    expect(a11y.labelledBy).toBe(`${dialogs.state.top!.id}-title`);
    expect(a11y.describedBy).toBe(`${dialogs.state.top!.id}-description`);
    expect(a11y.escToDismiss).toBe(true);
    expect(a11y.backdrop).toBe(true);
    expect(a11y.dismissOnBackdrop).toBe(false);
    expect(a11y.focusTarget).toBe('auto');
    dialogs.actions.clear();
  });

  test('confirm/alert kinds: alertdialog role; nonmodal: no ariaModal', () => {
    const dialogs = createDialogCore();
    dialogs.actions.open({ kind: 'confirm', title: 'Sure?' });
    expect(dialogs.state.top!.a11y.role).toBe('alertdialog');
    expect(dialogs.state.top!.a11y.ariaModal).toBe(true);
    dialogs.actions.closeTop();

    dialogs.actions.open({ kind: 'nonmodal', title: 'Sidecar' });
    expect(dialogs.state.top!.a11y.role).toBe('dialog');
    expect(dialogs.state.top!.a11y.ariaModal).toBe(false);
    dialogs.actions.clear();
  });

  test('focusLocked while any modal is open; released when only nonmodal remains', () => {
    const dialogs = createDialogCore();
    dialogs.actions.open({ kind: 'nonmodal', title: 'Side' });
    expect(dialogs.state.focusLocked).toBe(false);
    dialogs.actions.open({ title: 'Modal' });
    expect(dialogs.state.focusLocked).toBe(true);
    dialogs.actions.closeTop();
    expect(dialogs.state.focusLocked).toBe(false);
    dialogs.actions.clear();
  });

  test('explicit focusTarget and policy overrides flow through', () => {
    const dialogs = createDialogCore();
    dialogs.actions.open({
      title: 'Overrides',
      focusTarget: '#cancel-btn',
      escToDismiss: false,
      dismissOnBackdrop: true,
    });
    const a11y = dialogs.state.top!.a11y;
    expect(a11y.focusTarget).toBe('#cancel-btn');
    expect(a11y.escToDismiss).toBe(false);
    expect(a11y.dismissOnBackdrop).toBe(true);
    dialogs.actions.clear();
  });

  test('specs stay pure JSON (kind rides inside the spec)', () => {
    const dialogs = createDialogCore();
    dialogs.actions.open({ kind: 'confirm', title: 'Pure' });
    const spec = dialogs.state.top!.spec;
    expect(JSON.parse(JSON.stringify(spec))).toEqual({ kind: 'confirm', title: 'Pure' });
    dialogs.actions.clear();
  });
});

// ---------------------------------------------------------------------------
// Bridge contract + dual adapter (ADR 0034 §2/§3)
// ---------------------------------------------------------------------------

describe('dialog adapters', () => {
  test('svelte + vanilla mounted on one shared core agree', async () => {
    const core = createDialogCore();
    const store = createDialogStore(core);
    const vanilla = createVanillaDialog(core);
    const storeSeen: Array<string | null> = [];
    const vanillaSeen: Array<string | null> = [];
    let lastTopTitle: string | null = null;
    const unsubStore = store.top.subscribe((top) => {
      lastTopTitle = top?.spec.title ?? null;
      storeSeen.push(lastTopTitle);
    });
    const unsubVanilla = vanilla.subscribe(() =>
      vanillaSeen.push(vanilla.state.top?.spec.title ?? null),
    );
    expect(storeSeen).toEqual([null]);
    expect(store.core).toBe(core);
    expect(vanilla).toBe(core);

    const promise = store.actions.open({ title: 'Shared' });
    expect(lastTopTitle).toBe('Shared');
    expect(vanilla.state.top?.spec.title).toBe('Shared');
    expect(store.core.state.stack[0]?.spec.title).toBe('Shared');
    expect(storeSeen).toEqual([null, 'Shared']);
    expect(vanillaSeen).toEqual(['Shared']);
    expect(vanilla.state.focusLocked).toBe(true);

    store.actions.closeTop('value');
    await promise;
    expect(lastTopTitle).toBeNull();
    expect(vanilla.state.count).toBe(0);

    unsubStore();
    unsubVanilla();
  });

  test('react useDialog is a function', () => {
    expect(typeof useDialog).toBe('function');
  });

  test('svelte createDialogStore returns the documented surface', () => {
    const store = createDialogStore();
    expect(typeof store.actions.open).toBe('function');
    expect(typeof store.actions.closeTop).toBe('function');
    expect(typeof store.state.subscribe).toBe('function');
    expect(typeof store.top.subscribe).toBe('function');
  });
});
