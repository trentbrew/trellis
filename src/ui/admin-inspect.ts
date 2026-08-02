/**
 * Admin Components panel — render any registered headless component in
 * isolation inside the admin inspector rail (ADR 0034 §4.3 Studio tooling).
 *
 * Consumes the shared `inspectorRegistry` and the canonical entries from
 * `src/inspector/entries`: a picker selects a component, the panel mounts
 * its vanilla renderer against a fresh core and shows live state JSON plus
 * the entry's action buttons. Behavior stays in the cores; this is a thin
 * consumer, the same inspect wrapper wedge-smoke uses.
 */

import type { HeadlessCore } from '../headless/index.js';
import { inspectorRegistry } from '../inspector/index.js';
import '../inspector/entries/index.js';
import type {
  RegisteredComponent,
  VisualRenderer,
} from '../inspector/index.js';
import { el } from '../inspector/dom.js';

export interface AdminInspectHandle {
  destroy(): void;
}

export function mountAdminInspect(host: HTMLElement): AdminInspectHandle {
  let core: HeadlessCore<unknown> | null = null;
  let entry: RegisteredComponent<unknown> | undefined;
  let viewCleanup: (() => void) | undefined;
  let unsub: (() => void) | undefined;
  let buttons: HTMLButtonElement[] = [];

  const picker = el('select', {
    class: 'admin-inspect-picker',
    'aria-label': 'Component',
    onchange: (e: Event) =>
      select((e.target as HTMLSelectElement).value as string),
  }) as HTMLSelectElement;

  const viewHost = el('div', { class: 'admin-inspect-view' });
  const jsonPre = el('pre', { class: 'admin-inspect-json' }) as HTMLPreElement;
  const actionRow = el('div', { class: 'admin-inspect-actions' });
  const status = el('div', { class: 'admin-inspect-status' });

  function refresh(): void {
    if (!core || !entry) return;
    jsonPre.textContent = JSON.stringify(core.state, null, 2);
    for (const [i, btn] of buttons.entries()) {
      const action = entry.actions?.[i];
      if (action?.enabled) btn.disabled = !action.enabled(core);
    }
  }

  function mountView(): void {
    viewCleanup?.();
    viewCleanup = undefined;
    viewHost.replaceChildren();
    const vanilla = entry?.renderers.find(
      (r): r is VisualRenderer<unknown> => r.framework === 'vanilla',
    );
    if (entry && core && vanilla) {
      try {
        viewCleanup = vanilla.render(core, viewHost, entry.defaultConfig ?? {});
      } catch (err) {
        viewHost.append(
          el('p', { class: 'dim' }, `render failed: ${(err as Error).message}`),
        );
      }
    } else {
      viewHost.append(el('p', { class: 'dim' }, 'no vanilla renderer'));
    }
  }

  function reset(): void {
    if (!entry) return;
    unsub?.();
    core = entry.create(entry.defaultConfig ?? ({} as never));
    unsub = core.subscribe(refresh);
    mountView();
    refresh();
  }

  function select(type: string): void {
    const target = type
      ? (inspectorRegistry.getComponent(type as never) as
          | RegisteredComponent<unknown>
          | undefined)
      : (inspectorRegistry.listComponents()[0] as
          | RegisteredComponent<unknown>
          | undefined);
    if (!target) return;
    entry = target;
    picker.value = String(entry.type);
    buttons = [];
    actionRow.replaceChildren();
    if (entry.actions?.length) {
      for (const action of entry.actions) {
        const btn = el('button', { onclick: () => action.run(core!) }, action.label);
        buttons.push(btn);
        actionRow.append(btn);
      }
    }
    actionRow.append(
      el('button', { class: 'admin-inspect-reset', onclick: reset }, '↺ reset'),
    );
    status.textContent = `${entry.name} · ${entry.type}`;
    reset();
  }

  const list = inspectorRegistry.listComponents();
  if (!list.length) {
    host.replaceChildren(
      el('p', { class: 'dim' }, 'no components registered'),
    );
    return { destroy() {} };
  }
  picker.append(...list.map((c) => el('option', { value: String(c.type) }, c.name)));
  select('');

  host.append(
    picker,
    viewHost,
    el(
      'details',
      { class: 'admin-inspect-state', open: '' },
      el('summary', {}, 'state'),
      jsonPre,
    ),
    el(
      'details',
      { class: 'admin-inspect-actions-box', open: '' },
      el('summary', {}, 'actions'),
      actionRow,
    ),
    status,
  );

  return {
    destroy() {
      viewCleanup?.();
      unsub?.();
      viewCleanup = undefined;
      unsub = undefined;
      core = null;
      entry = undefined;
      host.replaceChildren();
    },
  };
}
