/**
 * Gallery entry — dialog (headless stack of dialog instances; exit
 * animation states, z-order, dismiss rules, focus contract — no shell UI).
 */

import { createDialogCore } from '../../dialog/index.js';
import type { DialogSpec } from '../../dialog/core/index.js';
import type { RegisteredComponent } from '../../inspector/index.js';
import { el } from '../dom.js';

const modal: DialogSpec = {
  kind: 'modal',
  title: 'Publish note?',
  description: 'Sync this note to peers via Iroh.',
  size: 'sm',
  buttons: [
    { id: 'cancel', label: 'Cancel', variant: 'ghost' },
    { id: 'publish', label: 'Publish', variant: 'primary', autoFocus: true },
  ],
};

const confirm: DialogSpec = {
  kind: 'confirm',
  title: 'Delete workspace?',
  description: 'This removes the local workspace. Recoverable via VCS.',
  buttons: [
    { id: 'keep', label: 'Keep', variant: 'ghost' },
    { id: 'delete', label: 'Delete', variant: 'danger' },
  ],
};

const alert: DialogSpec = {
  kind: 'alert',
  title: 'Sync complete',
  description: '3 peers updated.',
};

export const dialogEntry: RegisteredComponent<{
  onResult?: (value: unknown) => void;
}, ReturnType<typeof createDialogCore>> = {
  type: 'dialog',
  name: 'Dialog',
  description:
    'Headless dialog stack — modal/confirm/alert kinds, exit-animation (closing) state, per-button resolve, dismiss rules. The view renders each instance on the stack.',
  defaultConfig: {},
  create: () => createDialogCore({}),
  actions: [
    { label: 'Open modal', run: (c) => c.actions.open(modal) },
    { label: 'Open confirm', run: (c) => c.actions.open(confirm) },
    { label: 'Open alert', run: (c) => c.actions.open(alert) },
    { label: 'Close top', enabled: (c) => c.state.count > 0, run: (c) => c.actions.closeTop() },
    { label: 'Dismiss top', enabled: (c) => c.state.count > 0, run: (c) => c.actions.dismiss(c.state.stack[c.state.stack.length - 1].id) },
    { label: 'Clear', enabled: (c) => c.state.count > 0, run: (c) => c.actions.clear() },
  ],
  renderers: [
    {
      framework: 'vanilla',
      render: (core, host) => {
        const list = el('div', { class: 'dialog-stack' });
        const status = el('div', { class: 'status-line' });

        const render = () => {
          const s = core.state as {
            count: number;
            stack: { id: string; kind: string; status: string; spec: DialogSpec }[];
            focusLocked: boolean;
          };
          list.replaceChildren();
          if (!s.count) list.append(el('p', { class: 'dim' }, 'stack empty'));
          for (const inst of s.stack) {
            const row = el('div', { class: 'dialog-row' });
            row.append(
              el(
                'div',
                { class: 'dialog-banner' + (inst.status === 'closing' ? ' closing' : '') },
                el('code', { class: 'chip' }, inst.kind),
                el('code', { class: 'chip' }, inst.status),
                el('strong', {}, inst.spec.title ?? 'untitled'),
                el('div', { class: 'row' }),
              ),
            );
            for (const btn of inst.spec.buttons ?? []) {
              row.append(
                el(
                  'button',
                  {
                    class: 'mini',
                    onclick: () => core.actions.closeWithButton(inst.id, btn.id),
                  },
                  `${btn.label} → close(${btn.id})`,
                ),
              );
            }
            row.append(
              el('button', { class: 'mini', onclick: () => core.actions.close(inst.id) }, 'close()'),
              el('button', { class: 'mini', onclick: () => core.actions.dismiss(inst.id) }, 'dismiss()'),
            );
            list.append(row);
          }
          status.textContent = `stack: ${s.count} · focusLocked: ${s.focusLocked}`;
        };

        const unsub = core.subscribe(render);
        render();
        host.append(list, status);
        return unsub;
      },
    },
  ],
};
