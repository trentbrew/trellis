/**
 * Gallery entry — form (headless form engine: values, errors, dirty,
 * touched, validation, submit — no UI binding).
 */

import { createFormCore } from '../../forms/index.js';
import type { FormSchema } from '../../forms/core/index.js';
import type { RegisteredComponent } from '../../inspector/index.js';
import { el } from '../dom.js';

const schema: FormSchema = {
  typeName: 'gallery-task',
  fields: [
    { name: 'title', valueType: 'title', required: true, isTitle: true, validation: { maxLength: 40 } },
    { name: 'notes', valueType: 'rich_text', required: false, validation: { maxLength: 200 } },
    { name: 'qty', valueType: 'number', required: false, validation: { min: 0, max: 99 } },
    { name: 'done', valueType: 'checkbox', required: false },
    { name: 'lane', valueType: 'select', required: true, selectOptions: ['todo', 'doing', 'done'] },
    { name: 'email', valueType: 'email', required: false },
  ],
  titleKey: 'title',
};

export const formEntry: RegisteredComponent<{
  schema: FormSchema;
  initialValues: Record<string, unknown>;
}, ReturnType<typeof createFormCore>> = {
  type: 'form',
  name: 'Form',
  description:
    'Headless form engine — values, per-field errors (required/length/min-max), dirty/touched tracking, async validate/submit. The view renders plain inputs against core state.',
  defaultConfig: {
    schema,
    initialValues: { title: 'Ship wedge gallery', qty: 2, lane: 'doing' },
  },
  create: (config) => createFormCore(config.schema, config.initialValues),
  actions: [
    {
      label: 'Validate',
      run: (c) => {
        void c.actions.validate().then((r) => {
          if (!r.valid) {
            // surface the first error visibly via the view's error rendering
            c.actions.setTouched('title', true);
          }
        });
      },
    },
    {
      label: 'Reset',
      run: (c) => c.actions.reset(),
    },
    {
      label: 'Set sample values',
      run: (c) =>
        c.actions.setValues({ title: 'Sample', qty: 7, done: true, lane: 'done', email: 'a@b.c' }),
    },
    {
      label: 'Submit',
      run: (c) => {
        void c.actions.submit(async () => {
          await new Promise((r) => setTimeout(r, 400));
        });
      },
    },
  ],
  renderers: [
    {
      framework: 'vanilla',
      render: (core, host) => {
        const root = el('div', { class: 'form-grid' });
        const summary = el('div', { class: 'status-line' });

        const render = () => {
          const s = core.state as {
            values: Record<string, unknown>;
            errors: Record<string, string | null>;
            dirty: Record<string, boolean>;
            isValid: boolean;
            isDirty: boolean;
            isSubmitting: boolean;
          };
          root.replaceChildren();
          for (const f of schema.fields) {
            const value = s.values[f.name];
            const err = s.errors[f.name];
            let control: HTMLElement;
            if (f.valueType === 'checkbox') {
              control = el('input', {
                type: 'checkbox',
                checked: Boolean(value),
                onchange: (e: Event) => {
                  core.actions.setValue(f.name, (e.target as HTMLInputElement).checked);
                  core.actions.setTouched(f.name, true);
                },
              }) as HTMLElement;
            } else if (f.valueType === 'select') {
              control = el(
                'select',
                {
                  onchange: (e: Event) => {
                    core.actions.setValue(f.name, (e.target as HTMLSelectElement).value);
                    core.actions.setTouched(f.name, true);
                  },
                },
                ...(f.selectOptions ?? []).map((opt) =>
                  el('option', { value: String(opt), selected: String(opt) === String(value) }, String(opt)),
                ),
              ) as HTMLElement;
            } else {
              control = el('input', {
                type: f.valueType === 'number' ? 'number' : 'text',
                value: value === undefined || value === null ? '' : String(value),
                oninput: (e: Event) => {
                  const raw = (e.target as HTMLInputElement).value;
                  const next: unknown =
                    f.valueType === 'number' ? (raw === '' ? undefined : Number(raw)) : raw;
                  core.actions.setValue(f.name, next);
                  core.actions.setTouched(f.name, true);
                },
              }) as HTMLElement;
            }
            root.append(
              el(
                'label',
                { class: 'form-field' },
                el('span', { class: 'field-name' }, f.name + (f.required ? ' *' : '')),
                control,
                err
                  ? el('span', { class: 'field-err' }, err)
                  : s.dirty[f.name]
                    ? el('span', { class: 'field-dirty' }, 'dirty')
                    : null,
              ),
            );
          }
          summary.textContent =
            `isValid: ${s.isValid} · isDirty: ${s.isDirty}` +
            (s.isSubmitting ? ' · submitting…' : '');
        };

        const unsub = core.subscribe(render);
        render();
        host.append(root, summary);
        return unsub;
      },
    },
  ],
};
