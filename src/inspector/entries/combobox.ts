/**
 * Gallery entry — combobox (headless autocomplete: query, filtered
 * items, active index, select-by-id — the popup binding is yours).
 */

import { createComboboxCore } from '../../combobox/index.js';
import type { RegisteredComponent } from '../../inspector/index.js';
import { el } from '../dom.js';

const FLAVORS = [
  { id: 'vanilla', label: 'Vanilla' },
  { id: 'strawberry', label: 'Strawberry' },
  { id: 'chocolate', label: 'Chocolate' },
  { id: 'matcha', label: 'Matcha' },
  { id: 'pistachio', label: 'Pistachio' },
  { id: 'salted-caramel', label: 'Salted caramel' },
  { id: 'mint', label: 'Mint chip' },
  { id: 'coffee', label: 'Coffee' },
];

export const comboboxEntry: RegisteredComponent<{ items: { id: string; label: string }[] }, ReturnType<typeof createComboboxCore>> = {
  type: 'combobox',
  name: 'Combobox',
  description:
    'Headless autocomplete — text input + list contract: query filters items, arrow keys move the active index, enter/click select. Try typing “m” or “c” below.',
  defaultConfig: { items: FLAVORS },
  create: (config) => createComboboxCore({ items: config.items ?? FLAVORS }),
  actions: [
    { label: 'Open', enabled: (c) => !c.state.open, run: (c) => c.actions.open() },
    { label: 'Close', enabled: (c) => c.state.open, run: (c) => c.actions.close() },
    { label: 'Set query “m”', run: (c) => c.actions.setQuery('m') },
    { label: 'Move ↓', enabled: (c) => c.state.results.length > 0, run: (c) => c.actions.move(1) },
    { label: 'Select active', enabled: (c) => c.state.results.length > 0, run: (c) => c.actions.select(c.state.results[c.state.activeIndex]?.id ?? '') },
    { label: 'Clear value', enabled: (c) => c.state.selectedId !== null, run: (c) => c.actions.clear() },
    { label: 'Loading (2s)', run: (c) => { c.actions.setLoading(true); setTimeout(() => c.actions.setLoading(false), 2000); } },
  ],
  renderers: [
    {
      framework: 'vanilla',
      render: (core, host) => {
        const input = el('input', {
          type: 'text',
          placeholder: 'flavor…',
          value: '',
          onfocus: () => core.actions.open(),
          oninput: (e: Event) => core.actions.setQuery((e.target as HTMLInputElement).value),
          onkeydown: (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); core.actions.move(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); core.actions.move(-1); }
            else if (e.key === 'Enter') {
              e.preventDefault();
              const s = core.state as { results: { id: string }[]; activeIndex: number };
              if (s.results[s.activeIndex]) core.actions.select(s.results[s.activeIndex].id);
            }
            else if (e.key === 'Escape') core.actions.close();
          },
        }) as HTMLInputElement;
        const list = el('div', { class: 'combo-list' });
        const selected = el('div', { class: 'status-line' });

        const render = () => {
          const s = core.state;
          if (!s.selectedId) input.value = '';
          list.replaceChildren();
          if (!s.open) list.append(el('p', { class: 'dim' }, 'closed — focus the input'));
          else if (s.loading) list.append(el('p', { class: 'dim' }, 'loading…'));
          else if (!s.results.length) list.append(el('p', { class: 'dim' }, 'no matches'));
          else
            for (const item of s.results) {
              const i = s.results.indexOf(item);
              list.append(
                el(
                  'div',
                  {
                    class: 'palette-item' + (i === s.activeIndex ? ' active' : ''),
                    onmousedown: (e: Event) => { e.preventDefault(); core.actions.select(item.id); },
                  },
                  item.label,
                ),
              );
            }
          selected.textContent = s.selectedId
            ? `selected: ${FLAVORS.find((f) => f.id === s.selectedId)?.label ?? s.selectedId}`
            : 'no selection — click an item';
        };

        const unsub = core.subscribe(render);
        render();
        host.append(input, list, selected);
        return unsub;
      },
    },
  ],
};
