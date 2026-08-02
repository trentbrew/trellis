/**
 * Gallery entry — editor (rich text over ProseMirror). The live view is a
 * textarea synced to the core: printable keys type through the core,
 * Enter splits the block; the caret is driven from state.selection.
 */

import { createEditorCore } from '../../editor/index.js';
import type { EditorConfig } from '../../editor/index.js';
import type { RegisteredComponent } from '../../inspector/index.js';
import { el } from '../dom.js';

const SAMPLE = 'Type here — the caret is core state.';

export const editorEntry: RegisteredComponent<EditorConfig, ReturnType<typeof createEditorCore>> = {
  type: 'richtext',
  name: 'Editor',
  description:
    'Headless rich text: typing, marks (stored marks carry into new text), block types, rules, and undo composed with the undo-history core (typing bursts coalesce).',
  defaultConfig: {},
  create: (config) =>
    createEditorCore({
      ...config,
      undoHistory: config.undoHistory ?? undefined,
    }),
  actions: [
    { label: 'Type sample', run: (c) => c.actions.type(SAMPLE) },
    { label: 'Bold', run: (c) => c.actions.toggleMark('strong') },
    { label: 'Italic', run: (c) => c.actions.toggleMark('em') },
    { label: 'Code mark', run: (c) => c.actions.toggleMark('code') },
    {
      label: 'Link',
      run: (c) => c.actions.toggleMark('link', { href: 'https://trellis.computer' }),
    },
    { label: 'Paragraph', run: (c) => c.actions.setBlock('paragraph') },
    { label: 'H1', run: (c) => c.actions.setBlock('heading', 1) },
    { label: 'H2', run: (c) => c.actions.setBlock('heading', 2) },
    { label: 'Blockquote', run: (c) => c.actions.setBlock('blockquote') },
    { label: 'Code block', run: (c) => c.actions.setBlock('code_block') },
    { label: 'Break', run: (c) => c.actions.insertBreak() },
    { label: 'Rule', run: (c) => c.actions.insertHorizontalRule() },
    { label: 'Clear', run: (c) => c.actions.clear() },
    { label: 'Undo', enabled: (c) => c.state.canUndo, run: (c) => void c.actions.undo() },
    { label: 'Redo', enabled: (c) => c.state.canRedo, run: (c) => void c.actions.redo() },
  ],
  renderers: [
    {
      framework: 'vanilla',
      render: (core, host) => {
        const area = el('textarea', {
          class: 'editor-area',
          spellcheck: 'false',
          placeholder: 'Click and type…',
        }) as HTMLTextAreaElement;

        const chips = el('div', { class: 'row' });
        let chipsRender = () => {};

        const render = () => {
          const s = core.state as {
            text: string;
            selection: { from: number; to: number };
            activeMarks: string[];
            blockType: string;
            headingLevel: number | null;
          };
          area.value = s.text;
          const from = Math.min(s.selection.from, s.text.length);
          const to = Math.min(s.selection.to, s.text.length);
          area.setSelectionRange(from, to);
          chips.replaceChildren(
            el('span', { class: 'chip' }, s.blockType + (s.headingLevel ? ` ${s.headingLevel}` : '')),
            ...s.activeMarks.map((m) => el('span', { class: 'chip ok' }, m)),
          );
        };

        area.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.metaKey || e.ctrlKey || e.altKey) return;
          if (e.key === 'Enter') {
            e.preventDefault();
            core.actions.insertBreak();
            return;
          }
          if (e.key === 'Backspace') return; // no delete action yet — see wedge surface
          if (e.key.length === 1) {
            e.preventDefault();
            core.actions.type(e.key);
          }
        });

        const unsub = core.subscribe(render);
        render();
        host.append(
          el(
            'div',
            { class: 'row' },
            el('span', { class: 'status-line', style: 'margin:0' }, 'live (vanilla view):'),
          ),
          area,
          chips,
          el('kbd', {}, 'printable keys type · Enter splits the block · marks come from core'),
        );
        return unsub;
      },
    },
  ],
};
