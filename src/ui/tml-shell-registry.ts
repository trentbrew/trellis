/**
 * TML shell registry — named templates cloned into projection slots before mount.
 * @module trellis/ui
 */

export type ShellId = 'issue.card' | 'lane.card' | 'lane.row';
export type EntityKind = 'issue' | 'lane';
export type ProjectionHost = 'kanban' | 'grid' | 'table';
export type AdminView = 'kanban' | 'grid' | 'table';

const registry = new Map<ShellId, HTMLTemplateElement | Element>();

/** Register a `<template>` or element as the canonical shell body. */
export function registerShell(id: ShellId, source: HTMLTemplateElement | Element): void {
  registry.set(id, source);
}

/** Test helper — clear registry between tests. */
export function clearShellRegistry(): void {
  registry.clear();
}

export function hostFromView(view: AdminView): ProjectionHost {
  return view;
}

/** Read `--ui-vantage` / `data-ui-vantage` from root (default 8). */
export function readUiVantage(root: Element): number {
  if (typeof root.getAttribute === 'function') {
    const fromRoot = root.getAttribute('data-ui-vantage');
    if (fromRoot) {
      const n = Number(fromRoot);
      if (Number.isFinite(n)) return n;
    }
  }
  const doc = root.ownerDocument?.documentElement;
  const docStyle = doc && (doc as HTMLElement).style;
  if (docStyle && typeof docStyle.getPropertyValue === 'function') {
    const css = docStyle.getPropertyValue('--ui-vantage');
    if (css) {
      const n = Number(css);
      if (Number.isFinite(n)) return n;
    }
  }
  return 8;
}

export function applyUiVantage(root: Element, vantage?: number): number {
  const v = vantage ?? readUiVantage(root);
  if (typeof root.setAttribute === 'function') {
    root.setAttribute('data-ui-vantage', String(v));
  }
  const doc = root.ownerDocument?.documentElement;
  const docStyle = doc && (doc as HTMLElement).style;
  if (docStyle && typeof docStyle.setProperty === 'function') {
    docStyle.setProperty('--ui-vantage', String(v));
  }
  return v;
}

/** Resolve shell id from entity kind + vantage + projection host. */
export function shellForVantage(
  kind: EntityKind,
  _vantage: number,
  host?: ProjectionHost,
): ShellId | null {
  if (host === 'kanban' && kind === 'issue') return 'issue.card';
  if (host === 'grid' && kind === 'lane') return 'lane.card';
  if (host === 'table' && kind === 'lane') return 'lane.row';
  if (kind === 'issue') return 'issue.card';
  if (kind === 'lane') return 'lane.row';
  return null;
}

function isTemplateEl(source: HTMLTemplateElement | Element): source is HTMLTemplateElement {
  const tag = String((source as Element).tagName || '').toUpperCase();
  return tag === 'TEMPLATE' && !!(source as HTMLTemplateElement).content;
}

function cloneShell(source: HTMLTemplateElement | Element): DocumentFragment | Element {
  if (isTemplateEl(source)) {
    return source.content.cloneNode(true) as DocumentFragment;
  }
  return source.cloneNode(true) as Element;
}

function firstElement(clone: DocumentFragment | Element): Element | null {
  const node = clone as Element & { firstElementChild?: Element | null; tagName?: string };
  if (node.tagName) return node;
  return node.firstElementChild ?? null;
}

function mergeTrShell(slot: Element, source: HTMLTemplateElement | Element): void {
  const clone = cloneShell(source);
  const tr = firstElement(clone);
  if (!tr || String(tr.tagName).toUpperCase() !== 'TR') {
    while (slot.firstChild) slot.removeChild(slot.firstChild);
    slot.appendChild(clone);
    return;
  }
  while (slot.firstChild) slot.removeChild(slot.firstChild);
  for (const child of Array.from(tr.children)) {
    slot.appendChild(child.cloneNode(true));
  }
  for (const attr of Array.from(tr.attributes)) {
    if (attr.name === 'data-shell-slot') continue;
    slot.setAttribute(attr.name, attr.value);
  }
}

function hydrateSlot(slot: Element, source: HTMLTemplateElement | Element, id: ShellId): void {
  if (String(slot.tagName).toUpperCase() === 'TR') {
    mergeTrShell(slot, source);
  } else {
    while (slot.firstChild) slot.removeChild(slot.firstChild);
    slot.appendChild(cloneShell(source));
  }
  slot.setAttribute('data-shell-hydrated', id);
}

function indexTemplates(root: Element): void {
  root.querySelectorAll('template[data-trellis-shell]').forEach((node) => {
    const id = node.getAttribute('data-trellis-shell') as ShellId | null;
    if (id) registerShell(id, node as HTMLTemplateElement);
  });
}

/** Clear hydration markers so slots can be re-filled. */
export function clearShellHydration(root: Element): void {
  root.querySelectorAll('[data-shell-hydrated]').forEach((slot) => {
    slot.removeAttribute('data-shell-hydrated');
  });
}

/** Clone registered shells into every `[data-shell-slot="<id>"]` under root. Idempotent. */
export function hydrateShellSlots(root: Element): void {
  if (typeof (root as Element).querySelectorAll !== 'function') return;

  indexTemplates(root);

  root.querySelectorAll('[data-shell-slot]').forEach((slot) => {
    const id = slot.getAttribute('data-shell-slot') as ShellId | null;
    if (!id) return;
    if (slot.getAttribute('data-shell-hydrated') === id) return;

    const source = registry.get(id);
    if (!source) {
      console.error(`[tml-shell] unknown shell id "${id}"`);
      return;
    }

    hydrateSlot(slot, source, id);
  });
}

/** Apply vantage + hydrate before TML mount. */
export function prepareShellsBeforeMount(root: Element): void {
  const tmlRoot =
    typeof (root as Element).querySelector === 'function'
      ? ((root as Element).querySelector('#tml-root') ?? root)
      : root;
  applyUiVantage(tmlRoot);
  hydrateShellSlots(tmlRoot);
}

/** Re-hydrate shells after view toggle (no page reload). */
export function rehydrateShellsForView(root: Element, _view: AdminView): void {
  clearShellHydration(root);
  hydrateShellSlots(root);
}
