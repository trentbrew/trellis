/**
 * Gallery entry — palette (command palette core: fuzzy filter, keyboard
 * selection, groups — no dropdown UI).
 */

import { createPaletteCore } from '../../palette/index.js';
import type { PaletteItem } from '../../palette/core/index.js';
import type { RegisteredComponent } from '../../inspector/index.js';
import { el } from '../dom.js';

const items: PaletteItem[] = [
  { id: 'new-note', label: 'New note', keywords: ['create', 'note'], group: 'Actions', description: 'Blank rich-text note' },
  { id: 'new-task', label: 'New task', keywords: ['create', 'todo'], group: 'Actions', description: 'Task with due date' },
  { id: 'sync', label: 'Sync now', keywords: ['push', 'pull', 'iroh'], group: 'Actions' },
  { id: 'open-design', label: 'Open design', group: 'Go', description: 'Figma / shapes' },
  { id: 'open-readme', label: 'Open README', group: 'Go' },
  { id: 'open-logs', label: 'Open logs', group: 'Go' },
  { id: 'theme-dark', label: 'Dark theme', keywords: ['color', 'mode'], group: 'Settings' },
  { id: 'theme-light', label: 'Light theme', keywords: ['color', 'mode'], group: 'Settings' },
  { id: 'theme-paper', label: 'Paper theme', keywords: ['color', 'mode'], group: 'Settings' },
];

export const paletteEntry: RegisteredComponent<{
  items: PaletteItem[];
  onSelect?: (item: PaletteItem) => void;
}, ReturnType<typeof createPaletteCore>> = {
  type: 'palette',
  name: 'Palette',
  description:
    'Headless command palette — fuzzy filter with stable ranking, grouped results, keyboard move/select, loading flag. Try a query below.',
  defaultConfig: { items },
  create: (config) =>
    createPaletteCore({ items: config.items ?? items, onSelect: config.onSelect }),
  actions: [
    { label: 'Open', enabled: (c) => !c.state.open, run: (c) => c.actions.open() },
    { label: 'Close', enabled: (c) => c.state.open, run: (c) => c.actions.close() },
    { label: 'Toggle', run: (c) => c.actions.toggle() },
    {
      label: 'Move ↓',
      enabled: (c) => c.state.results.length > 0,
      run: (c) => c.actions.moveSelection(1),
    },
    {
      label: 'Move ↑',
      enabled: (c) => c.state.results.length > 0,
      run: (c) => c.actions.moveSelection(-1),
    },
    {
      label: 'Select',
      enabled: (c) => c.state.results.length > 0,
      run: (c) => c.actions.select(),
    },
    { label: 'Set query “sync”', run: (c) => c.actions.setQuery('sync') },
    { label: 'Loading (2s)', run: (c) => { c.actions.setLoading(true); setTimeout(() => c.actions.setLoading(false), 2000); } },
  ],
  renderers: [
    {
      framework: 'vanilla',
      render: (core, host) => {
        const input = el('input', {
          type: 'text',
          placeholder: 'query (e.g. theme)',
          value: '',
          oninput: (e: Event) => core.actions.setQuery((e.target as HTMLInputElement).value),
        }) as HTMLInputElement;
        const list = el('div', { class: 'palette-list' });
        const status = el('div', { class: 'status-line' });

        const render = () => {
          const s = core.state;
          list.replaceChildren();
          if (!s.open) {
            list.append(el('p', { class: 'dim' }, 'closed — click Open'));
          } else if (s.loading) {
            list.append(el('p', { class: 'dim' }, 'loading…'));
          } else if (s.empty) {
            list.append(el('p', { class: 'dim' }, 'no results'));
          } else {
            for (const g of s.groups) {
              list.append(el('div', { class: 'palette-group' }, g.title));
              for (const item of g.items) {
                const idx = s.results.indexOf(item);
                list.append(
                  el(
                    'div',
                    {
                      class: 'palette-item' + (idx === s.selectedIndex ? ' active' : ''),
                      onclick: () => core.actions.select(),
                    },
                    el('span', {}, item.label),
                    item.description ? el('span', { class: 'dim' }, item.description) : null,
                  ),
                );
              }
            }
          }
          status.textContent =
            `open: ${s.open} · results: ${s.results.length}` +
            (s.results.length ? ` · selected: ${s.results[s.selectedIndex]?.label}` : '');
        };

        const unsub = core.subscribe(render);
        render();
        host.append(input, list, status);
        return unsub;
      },
    },
  ],
};
