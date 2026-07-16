/**
 * TML v0 — Trellis Markup Language runtime.
 *
 * Typed source; transpiled to JS on the fly by the dashboard server for the
 * browser (`/tml-runtime.js`), and imported directly by vitest under node.
 *
 * Spec: docs/specs/tml-v0.md. Core (Store / parse / evaluate) is DOM-free so it
 * unit-tests under node; only `mount` / `applyBindings` touch the DOM.
 *
 * @module trellis/ui
 */

/* Browser globals — this module is also imported by the node test, where these
 * are provided at runtime (fetch is global in Node 18+, EventSource only in the
 * browser). Declared here so tsc is happy without pulling in DOM lib types. */
declare const EventSource: {
  new (url: string): {
    addEventListener(type: string, cb: (ev: { data: string }) => void): void;
    close(): void;
  };
};

export type ResultRow = Record<string, unknown>;

export interface RefHandle {
  id: string;
  read(): unknown;
  write(value: unknown): void;
}

export interface TmlDriver {
  query(q: string): Promise<ResultRow[]>;
  op(action: string, args: Record<string, unknown>): Promise<void>;
  live(q: string, cb: (rows?: ResultRow[]) => void): () => void;
  ref(id: string): RefHandle;
}

export interface TmlBinding {
  query?: string;
  each?: { var: string; collection: string } | null;
  live?: boolean;
  ref?: string;
  op?: { action: string; args: { name: string; expr: string }[] } | null;
  if?: string;
  text?: string;
  attrs: Record<string, string>;
}

/* ------------------------------------------------------------------ *
 * Field paths + expressions
 * ------------------------------------------------------------------ */

/** Resolve a dotted field path against an object, e.g. `lane.id`. */
export function getPath(obj: unknown, path: string): unknown {
  return String(path)
    .split('.')
    .reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj);
}

/** Split an expression on `+` without breaking quoted string literals. */
function splitPlus(expr: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q: string | null = null;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (q) {
      cur += c;
      if (c === q) q = null;
    } else if (c === "'" || c === '"') {
      q = c;
      cur += c;
    } else if (c === '+') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur.trim()) out.push(cur);
  return out;
}

/**
 * Resolve a TML expression against a scope.
 * Single field path / literal -> raw value (preserves booleans/numbers).
 * Multiple parts joined by `+` -> concatenated string.
 */
export function resolveExpr(expr: string, scope: Record<string, unknown>): unknown {
  if (expr == null) return undefined;
  const resolved = splitPlus(expr).map((p) => {
    p = p.trim();
    if (/^'([^']*)'$/.test(p)) return p.slice(1, -1);
    if (/^"([^"]*)"$/.test(p)) return p.slice(1, -1);
    return getPath(scope, p);
  });
  if (resolved.length === 1) return resolved[0];
  return resolved.map((v) => (v == null ? '' : String(v))).join('');
}

/* ------------------------------------------------------------------ *
 * Attribute parsing
 * ------------------------------------------------------------------ */

function parseEach(v: string): { var: string; collection: string } | null {
  const m = v.match(/^(\w+)\s+of\s+(\w+)$/);
  if (!m) return null;
  return { var: m[1], collection: m[2] };
}

function parseOp(v: string): { action: string; args: { name: string; expr: string }[] } | null {
  const m = v.match(/^(\w+)\s*\((.*)\)$/);
  if (!m) return null;
  const inner = m[2].trim();
  const args: { name: string; expr: string }[] = [];
  if (inner) {
    const c = inner.match(/^(\w+)\s*:\s*(.+)$/);
    if (c) args.push({ name: c[1], expr: c[2].trim() });
    else args.push({ name: 'id', expr: inner });
  }
  return { action: m[1], args };
}

/** Parse a flat attribute map into a structured TML binding. */
export function parseTmlAttrs(attrs: Record<string, string | null>): TmlBinding {
  const binding: TmlBinding = { attrs: {} };
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'tml-query') binding.query = v;
    else if (k === 'tml-each') binding.each = parseEach(v);
    else if (k === 'tml-live') binding.live = true;
    else if (k === 'tml-ref') binding.ref = v;
    else if (k === 'tml-op') binding.op = parseOp(v);
    else if (k === 'tml-if') binding.if = v;
    else if (k === 'tml-text') binding.text = v;
    else if (k.startsWith('tml-attr-')) binding.attrs[k.slice('tml-attr-'.length)] = v;
  }
  return binding;
}

/* ------------------------------------------------------------------ *
 * Minimal TQL evaluator (v0) — over a LanesSnapshot
 * ------------------------------------------------------------------ */

function collectionFor(type: string, snapshot: any): ResultRow[] {
  switch (type) {
    case 'Lane':
      return (snapshot?.lanes as ResultRow[]) || [];
    case 'Issue':
      return (snapshot?.issues as ResultRow[]) || [];
    default:
      return [];
  }
}

function parseValue(raw: string): unknown {
  const s = raw.trim();
  if (/^'.*'$/.test(s) || /^".*"$/.test(s)) return s.slice(1, -1);
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

function matchCond(row: ResultRow, c: { field: string; op: string; value: unknown }): boolean {
  const actual = getPath(row, c.field);
  const expected = c.value;
  switch (c.op) {
    case '=':
      return actual === expected;
    case '!=':
      return actual !== expected;
    case '<':
      return Number(actual) < Number(expected);
    case '>':
      return Number(actual) > Number(expected);
    case '<=':
      return Number(actual) <= Number(expected);
    case '>=':
      return Number(actual) >= Number(expected);
    case 'contains':
      return String(actual).includes(String(expected));
    case 'startswith':
      return String(actual).startsWith(String(expected));
    case 'endswith':
      return String(actual).endsWith(String(expected));
    default:
      return false;
  }
}

/**
 * Evaluate a minimal TQL `find ?e where type = 'X' [and <f> <op> <v> …]`
 * against a LanesSnapshot. v0 covers the grid projection's needs only.
 */
export function evaluateQuery(query: string, snapshot: unknown): ResultRow[] {
  if (!snapshot) return [];
  const m = query.match(/find\s+\?e\s+where\s+type\s*=\s*'([^']+)'/i);
  if (!m) return [];
  const rows = collectionFor(m[1], snapshot);
  const rest = query.slice((m.index ?? 0) + m[0].length).trim();
  const andMatch = rest.match(/^and\s+(.+)$/is);
  if (!andMatch) return rows;
  const conditions = andMatch[1]
    .split(/\s+and\s+/i)
    .map((c) => {
      const cm = c.match(/^(\w+)\s*(=|!=|<=|>=|<|>|contains|startsWith|endsWith)\s*(.+)$/i);
      return cm
        ? { field: cm[1], op: cm[2].toLowerCase(), value: parseValue(cm[3]) }
        : null;
    })
    .filter(Boolean) as { field: string; op: string; value: unknown }[];
  return rows.filter((r) => conditions.every((c) => matchCond(r, c)));
}

/* ------------------------------------------------------------------ *
 * Store — reactive snapshot holder
 * ------------------------------------------------------------------ */

export class Store {
  snapshot: unknown = null;
  private _subs = new Set<() => void>();
  seed(s: unknown): void {
    this.snapshot = s;
    this._notify();
  }
  mutate(fn: (s: unknown) => void): void {
    if (this.snapshot) {
      fn(this.snapshot);
      this._notify();
    }
  }
  subscribe(cb: (rows?: ResultRow[]) => void): () => void {
    this._subs.add(cb);
    return () => this._subs.delete(cb);
  }
  private _notify(): void {
    this._subs.forEach((cb) => cb());
  }
}

/* ------------------------------------------------------------------ *
 * Web driver — client-side query + HTTP mutation + SSE live
 * ------------------------------------------------------------------ */

export class WebDriver implements TmlDriver {
  base: string;
  store: Store;
  private _refs: Record<string, RefHandle> = {};
  constructor(opts: { baseUrl?: string } = {}) {
    this.base = opts.baseUrl || '';
    this.store = new Store();
  }
  seed(snapshot: unknown): void {
    this.store.seed(snapshot);
  }
  query(q: string): Promise<ResultRow[]> {
    return Promise.resolve(evaluateQuery(q, this.store.snapshot));
  }
  live(_q: string, cb: (rows?: ResultRow[]) => void): () => void {
    return this.store.subscribe(cb);
  }
  async op(action: string, args: Record<string, unknown>): Promise<void> {
    const res = await fetch(this.base + '/api/tml-mutations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, args }),
    });
    if (!res.ok) throw new Error('tml op failed: ' + (await res.text()));
  }
  ref(id: string): RefHandle {
    if (!this._refs[id]) {
      this._refs[id] = { id, read: () => this.store.snapshot, write: () => {} };
    }
    return this._refs[id];
  }
  /** Seed from snapshot, then subscribe to the SSE op stream. Returns the EventSource. */
  async connect(opts: { snapshotUrl: string; streamUrl: string }): Promise<unknown> {
    const snap = await (await fetch(this.base + opts.snapshotUrl)).json();
    this.seed(snap);
    const es = new EventSource(this.base + opts.streamUrl);
    es.addEventListener('snapshot', (ev) => this.seed(JSON.parse(ev.data)));
    return es;
  }
}

/* ------------------------------------------------------------------ *
 * DOM projection (browser only)
 * ------------------------------------------------------------------ */

function getAttrs(el: any): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const a of Array.from(el.attributes) as { name: string; value: string }[]) {
    out[a.name] = a.value;
  }
  return out;
}

/**
 * Resolve text/attr/if/op bindings on `el` and its children against `scope`.
 * Returns false if the element was removed by a falsy `tml-if` (caller skips it).
 */
export function applyBindings(el: any, scope: Record<string, unknown>, driver: TmlDriver): boolean {
  const binding = parseTmlAttrs(getAttrs(el));

  if (binding.if) {
    if (!resolveExpr(binding.if, scope)) {
      el.remove();
      return false;
    }
  }
  if (binding.text !== undefined) {
    el.textContent = String(resolveExpr(binding.text, scope) ?? '');
  }
  for (const [name, expr] of Object.entries(binding.attrs)) {
    el.setAttribute(name, String(resolveExpr(expr, scope) ?? ''));
  }
  if (binding.op) {
    el.addEventListener('click', () => {
      const args: Record<string, unknown> = {};
      for (const a of binding.op!.args) args[a.name] = resolveExpr(a.expr, scope);
      driver.op(binding.op!.action, args).catch((e: unknown) => console.error('[tml] op failed', e));
    });
  }

  // Leaf elements with text content have no meaningful children to project.
  if (binding.text === undefined) {
    for (const child of Array.from(el.children)) applyBindings(child, scope, driver);
  }
  return true;
}

function setupContainer(container: any, driver: TmlDriver): void {
  const binding = parseTmlAttrs(getAttrs(container));
  if (!binding.query) return;

  const template = container.cloneNode(true);
  ['tml-query', 'tml-each', 'tml-live', 'tml-ref'].forEach((a) => template.removeAttribute(a));
  const eachVar = binding.each?.var || 'item';

  const render = () => {
    driver
      .query(binding.query!)
      .then((rows) => {
        container.innerHTML = '';
        for (const row of rows) {
          const card = template.cloneNode(true);
          if (applyBindings(card, { [eachVar]: row }, driver)) {
            container.appendChild(card);
          }
        }
      })
      .catch((e: unknown) => console.error('[tml] query failed', e));
  };

  if (binding.live) driver.live(binding.query, render);
  render();
}

/** Mount all `tml-query` subtrees under `root` against `driver`. */
export function mount(root: any, driver: TmlDriver): void {
  root.querySelectorAll('[tml-query]').forEach((c: any) => setupContainer(c, driver));
}
