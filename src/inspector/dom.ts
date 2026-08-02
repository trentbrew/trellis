/**
 * Inspector DOM helpers — tiny element factory + query shorthand.
 * Shared by the registry entries and the admin Components panel.
 */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, unknown> = {},
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = String(v);
    else if (k === 'style') node.setAttribute('style', String(v));
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2), v as EventListener);
    } else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined) continue;
    node.append(c instanceof Node ? c : document.createTextNode(c));
  }
  return node;
}

export const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;
