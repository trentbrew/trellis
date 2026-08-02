/**
 * Gallery entry — colorpicker (headless color: parsing, formats,
 * recents, WCAG contrast — no eyedropper/spectrum UI).
 */

import { createColorPickerCore } from '../../colorpicker/index.js';
import type { RegisteredComponent } from '../../inspector/index.js';
import { el } from '../dom.js';

type ColorPickerConfig = { initial?: string; maxRecent?: number };

export const colorpickerEntry: RegisteredComponent<ColorPickerConfig, ReturnType<typeof createColorPickerCore>> = {
  type: 'colorpicker',
  name: 'Color picker',
  description:
    'Headless color core — parse/normalize hex·rgb·hsl, swatch draft + commit/cancel, recents ring, and live WCAG contrast checks.',
  defaultConfig: { initial: '#3366ff', maxRecent: 8 },
  create: (config) =>
    createColorPickerCore({ initial: config.initial, maxRecent: config.maxRecent }),
  actions: [
    { label: 'Open', enabled: (c) => !c.state.open, run: (c) => c.actions.open() },
    { label: 'Cancel', enabled: (c) => c.state.open, run: (c) => c.actions.cancel() },
    { label: 'Set draft “#ffcc00”', run: (c) => c.actions.setDraft('#ffcc00') },
    { label: 'Commit draft', enabled: (c) => c.state.valid, run: (c) => c.actions.commit() },
    { label: 'Format → rgb', run: (c) => c.actions.setFormat('rgb') },
    { label: 'Format → hsl', run: (c) => c.actions.setFormat('hsl') },
    { label: 'Format → hex', run: (c) => c.actions.setFormat('hex') },
    { label: 'Value #111', run: (c) => c.actions.setValue('#111111') },
  ],
  renderers: [
    {
      framework: 'vanilla',
      render: (core, host) => {
        const root = el('div', { class: 'cp-root' });
        const swatch = el('button', { class: 'cp-swatch', onclick: () => core.actions.open() });
        const valueInput = el('input', {
          type: 'text',
          spellcheck: 'false',
          onkeydown: (e: KeyboardEvent) => {
            if (e.key === 'Enter') core.actions.setValue(valueInput.value);
          },
          onblur: () => core.actions.setValue(valueInput.value),
        }) as HTMLInputElement;
        const formatSelect = el(
          'select',
          { onchange: () => core.actions.setFormat(formatSelect.value as 'hex' | 'rgb' | 'hsl') },
          el('option', { value: 'hex' }, 'hex'),
          el('option', { value: 'rgb' }, 'rgb'),
          el('option', { value: 'hsl' }, 'hsl'),
        ) as HTMLSelectElement;
        const recentRow = el('div', { class: 'row' });
        const contrastRow = el('div', { class: 'row' });
        const editor = el('div');

        const render = () => {
          const s = core.state as {
            value: string;
            format: string;
            open: boolean;
            draft: string;
            normalized: string | null;
            valid: boolean;
            recent: string[];
            contrast: { white: number; black: number; aaNormal: boolean; aaLarge: boolean } | null;
          };
          swatch.style.background = s.value;
          swatch.style.color = (s.contrast?.black ?? 0) > (s.contrast?.white ?? 0) ? '#000' : '#fff';
          valueInput.value = s.value;
          formatSelect.value = s.format;

          recentRow.replaceChildren(
            el('span', { class: 'status-line', style: 'margin:0' }, 'recent:'),
            ...s.recent.map((c) =>
              el('button', {
                class: `swatch ${c === s.value ? 'active' : ''}`,
                style: `background:${c}`,
                title: c,
                onclick: () => core.actions.setValue(c),
              }),
            ),
          );

          contrastRow.replaceChildren(
            ...(s.contrast
              ? [
                  el('span', { class: 'chip' }, `vs white ${s.contrast.white.toFixed(1)}`),
                  el('span', { class: 'chip' }, `vs black ${s.contrast.black.toFixed(1)}`),
                  el('span', { class: `chip ${s.contrast.aaNormal ? 'ok' : 'no'}` }, `AA normal ${s.contrast.aaNormal ? '✓' : '✗'}`),
                ]
              : [el('span', { class: 'chip' }, 'invalid draft')]),
          );

          editor.replaceChildren();
          if (s.open) {
            editor.append(
              el(
                'div',
                { style: 'background:var(--panel-2);border:1px solid var(--line);border-radius:8px;padding:12px' },
                el(
                  'div',
                  { class: 'row' },
                  el('input', {
                    type: 'text',
                    value: s.draft,
                    spellcheck: 'false',
                    oninput: (e: Event) => core.actions.setDraft((e.target as HTMLInputElement).value),
                    onkeydown: (e: KeyboardEvent) => {
                      if (e.key === 'Enter') core.actions.commit();
                      if (e.key === 'Escape') core.actions.cancel();
                    },
                  }),
                  el('span', { class: 'chip', style: `background:${s.normalized ?? 'transparent'}` }, s.normalized ?? ''),
                  el('button', { class: 'mini', onclick: () => core.actions.commit(), disabled: !s.valid }, 'commit'),
                  el('button', { class: 'mini', onclick: () => core.actions.cancel() }, 'cancel'),
                ),
              ),
            );
          }
        };

        const unsub = core.subscribe(render);
        render();
        root.append(
          el(
            'div',
            { class: 'row' },
            swatch,
            valueInput,
            formatSelect,
            el('span', { class: 'dim', style: 'font-size:11px' }, 'enter → set · click swatch to edit'),
          ),
          recentRow,
          contrastRow,
          editor,
        );
        host.append(root);
        return unsub;
      },
    },
  ],
};
