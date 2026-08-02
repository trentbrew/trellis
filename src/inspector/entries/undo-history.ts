/**
 * Gallery entry — undo-history (service core: nothing renders; the stack
 * is the component). The demo "document" is a string the pushed commands
 * mutate, so undo/redo has something visible to move.
 */

import { createUndoHistoryCore } from '../../undo-history/index.js';
import type { RegisteredComponent } from '../../inspector/index.js';
import type { UndoCommand } from '../../undo-history/index.js';
import { el } from '../dom.js';

interface UndoDoc {
  text: string;
}

const doc: UndoDoc = { text: '' };

/** Command with a real inverse — undo must undo what execute did. */
function cmd(label: string, doFn: () => void, undoFn: () => void): UndoCommand {
  return {
    label,
    execute: doFn,
    invert: () => ({ label, execute: undoFn, invert: () => cmd(label, doFn, undoFn) }),
  };
}

const pushA = cmd('Insert "a"', () => (doc.text += 'a'), () => (doc.text = doc.text.slice(0, -1)));
const pushB = cmd('Insert "b"', () => (doc.text += 'b'), () => (doc.text = doc.text.slice(0, -1)));
const bold = cmd(
  'Bold',
  () => (doc.text = `*${doc.text}*`),
  () => (doc.text = doc.text.replace(/^\*(.*)\*$/, '$1')),
);

export const undoHistoryEntry: RegisteredComponent<{ doc: UndoDoc }, ReturnType<typeof createUndoHistoryCore>> = {
  type: 'undo-history',
  name: 'Undo history',
  description:
    'Generic command stack — one gesture = one step, adjacent same-key pushes coalesce (typing bursts), redo is cut by new edits. Composes into every editable core.',
  defaultConfig: { doc },
  create: () => createUndoHistoryCore(),
  actions: [
    { label: 'Push a (coalesce)', run: (c) => c.actions.push(pushA, { coalesce: true, coalesceKey: 'type' }) },
    { label: 'Push b (coalesce)', run: (c) => c.actions.push(pushB, { coalesce: true, coalesceKey: 'type' }) },
    { label: 'Push Bold (breaks window)', run: (c) => c.actions.push(bold) },
    {
      label: 'Push group',
      run: (c) => {
        c.actions.beginGroup('Two edits');
        c.actions.push(pushA, { coalesce: true, coalesceKey: 'type' });
        c.actions.push(pushB, { coalesce: true, coalesceKey: 'type' });
        c.actions.endGroup();
      },
    },
    { label: 'Undo', enabled: (c) => c.state.canUndo, run: (c) => void c.actions.undo() },
    { label: 'Redo', enabled: (c) => c.state.canRedo, run: (c) => void c.actions.redo() },
    { label: 'Clear', enabled: (c) => c.state.canUndo || c.state.canRedo, run: (c) => c.actions.clear() },
  ],
  renderers: [
    {
      framework: 'vanilla',
      render: (core, host) => {
        let label = el('div', { class: 'doc' }, doc.text || '·');
        let stateLine = el('div', { class: 'status-line' });
        const render = () => {
          const s = core.state as { undoCount: number; redoCount: number; undoLabel: string | null; redoLabel: string | null };
          label.textContent = doc.text || '·';
          stateLine.textContent =
            `${s.undoCount} undo step${s.undoCount === 1 ? '' : 's'} · ` +
            `${s.redoCount} redo · next undo: “${s.undoLabel ?? '—'}”`;
        };
        const unsub = core.subscribe(render);
        render();
        host.append(
          el('div', { class: 'toolbar' }, el('span', { class: 'chip' }, 'demo doc:')),
          label,
          stateLine,
        );
        return unsub;
      },
    },
  ],
};
