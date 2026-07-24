import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  evaluateQuery,
  parseTmlAttrs,
  resolveExpr,
  isTmlTruthy,
  Store,
  WebDriver,
  PeerDriver,
  applyBindings,
  mount,
  resolvePath,
  getPath,
  expressionPaths,
} from '../../src/ui/tml-runtime.js';
import type { TmlDiagnostic } from '../../src/ui/tml-runtime.js';
import { createVcsOp } from '../../src/vcs/ops.js';

async function withFetchStub(
  run: (fetchMock: ReturnType<typeof vi.fn>) => Promise<void> | void,
): Promise<void> {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('') });
  const prev = globalThis.fetch;
  globalThis.fetch = fetchMock as typeof fetch;
  try {
    await run(fetchMock);
  } finally {
    if (prev) globalThis.fetch = prev;
    else delete (globalThis as { fetch?: unknown }).fetch;
  }
}


/* ---- fake DOM (applyBindings only needs a small surface) ---- */
class FakeEl {
  tagName: string;
  _attrs: Map<string, string>;
  _children: FakeEl[];
  _text: string;
  parent: FakeEl | null;
  listeners: Record<string, Array<(...args: unknown[]) => void>>;
  constructor(tag = 'div') {
    this.tagName = tag;
    this._attrs = new Map();
    this._children = [];
    this._text = '';
    this.parent = null;
    this.listeners = {};
  }
  setAttribute(n: string, v: string) {
    this._attrs.set(n, String(v));
  }
  removeAttribute(n: string) {
    this._attrs.delete(n);
  }
  getAttribute(n: string): string | null {
    return this._attrs.has(n) ? this._attrs.get(n)! : null;
  }
  get attributes() {
    return Array.from(this._attrs.entries()).map(([name, value]) => ({ name, value }));
  }
  get textContent() {
    return this._text;
  }
  set textContent(v: string) {
    this._text = String(v);
  }
  addEventListener(t: string, fn: (...args: unknown[]) => void) {
    (this.listeners[t] = this.listeners[t] || []).push(fn);
  }
  appendChild(c: FakeEl): FakeEl {
    this._children.push(c);
    c.parent = this;
    return c;
  }
  removeChild(c: FakeEl) {
    this._children = this._children.filter((x) => x !== c);
  }
  remove() {
    if (this.parent) {
      this.parent.removeChild(this);
      this.parent = null;
    }
  }
  get children() {
    return this._children;
  }
  get firstElementChild() {
    return this._children[0] || null;
  }
  cloneNode(): FakeEl {
    const c = new FakeEl(this.tagName);
    c._attrs = new Map(this._attrs);
    c._text = this._text;
    c._children = this._children.map((ch) => {
      const cc = ch.cloneNode();
      cc.parent = c;
      return cc;
    });
    return c;
  }
  findChild(pred: (c: FakeEl) => boolean): FakeEl | null {
    for (const c of this._children) if (pred(c)) return c;
    return null;
  }
  /** `setupContainer` clears the container by assigning innerHTML = ''. */
  set innerHTML(v: string) {
    if (v === '') this._children = [];
  }
  get innerHTML(): string {
    return this._text;
  }
  /** `mount` selects subtrees by attribute; only `[tml-query]` is used. */
  querySelectorAll(sel: string): FakeEl[] {
    const attr = sel.replace(/^\[|\]$/g, '');
    const out: FakeEl[] = [];
    const walk = (el: FakeEl) => {
      if (el._attrs.has(attr)) out.push(el);
      el._children.forEach(walk);
    };
    walk(this);
    return out;
  }
}

const snapshot = {
  at: '2026-07-16T00:00:00Z',
  rootPath: '/repo',
  integrationBranch: 'main',
  lanes: [
    {
      id: 'lane-1',
      status: 'active',
      agentId: 'agent:a',
      opCount: 12,
      fileCount: 5,
      targetBranch: 'feature/x',
      issueId: 'issue:TRL-1',
      isActive: true,
    },
    {
      id: 'lane-2',
      status: 'promoted',
      agentId: 'agent:b',
      opCount: 3,
      fileCount: 1,
      targetBranch: 'feature/y',
      issueId: null,
      isActive: false,
    },
  ],
  issues: [
    { id: 'TRL-10', title: 'Backlog item', status: 'backlog', priority: 'high', laneIds: [] },
    { id: 'TRL-11', title: 'Queued item', status: 'queue', priority: 'medium', laneIds: [] },
    { id: 'TRL-12', title: 'Active work', status: 'in_progress', priority: 'high', laneIds: ['lane-1'] },
    { id: 'TRL-13', title: 'Paused work', status: 'paused', priority: 'low', laneIds: [] },
    { id: 'TRL-14', title: 'Shipped', status: 'closed', priority: 'medium', laneIds: [] },
    { id: 'TRL-15', title: 'Weird status', status: 'blocked', priority: 'high', laneIds: [] },
  ],
  milestones: [
    { id: 'abc123', message: 'Ship admin shell', createdAt: '2026-07-21T12:00:00.000Z', fileCount: 3 },
    { id: 'def456', message: 'Harden TML runtime', createdAt: '2026-07-20T12:00:00.000Z', fileCount: 0 },
  ],
};

/** Deep copy of the shared fixture, for tests that mutate or re-seed. */
const cloneSnapshot = () => JSON.parse(JSON.stringify(snapshot));

describe('evaluateQuery', () => {
  it('returns lanes by type', () => {
    expect(evaluateQuery("find ?e where type = 'Lane'", snapshot)).toHaveLength(2);
  });
  it('returns milestones by type', () => {
    expect(evaluateQuery("find ?e where type = 'Milestone'", snapshot)).toHaveLength(2);
  });
  it('filters by eq condition', () => {
    const rows = evaluateQuery("find ?e where type = 'Lane' and status = 'active'", snapshot);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('lane-1');
  });
  it('returns empty for unknown type', () => {
    expect(evaluateQuery("find ?e where type = 'Nope'", snapshot)).toEqual([]);
  });
  it('returns empty when snapshot is null', () => {
    expect(evaluateQuery("find ?e where type = 'Lane'", null)).toEqual([]);
  });
  it('OR group returns union of matching issue statuses (backlog column)', () => {
    const rows = evaluateQuery(
      "find ?e where type = 'Issue' and (status = 'backlog' or status = 'queue')",
      snapshot,
    );
    expect(rows.map((r) => r.id).sort()).toEqual(['TRL-10', 'TRL-11']);
  });
  it('OR group covers in_progress + paused', () => {
    const rows = evaluateQuery(
      "find ?e where type = 'Issue' and (status = 'in_progress' or status = 'paused')",
      snapshot,
    );
    expect(rows.map((r) => r.id).sort()).toEqual(['TRL-12', 'TRL-13']);
  });
  it('single-status column still works', () => {
    const rows = evaluateQuery("find ?e where type = 'Issue' and status = 'closed'", snapshot);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('TRL-14');
  });
  it('not-OR group places unknown statuses in Backlog with backlog+queue', () => {
    const backlogQ =
      "find ?e where type = 'Issue' and not (status = 'in_progress' or status = 'paused' or status = 'closed')";
    const inProgQ =
      "find ?e where type = 'Issue' and (status = 'in_progress' or status = 'paused')";
    const doneQ = "find ?e where type = 'Issue' and status = 'closed'";
    const backlog = evaluateQuery(backlogQ, snapshot).map((r) => r.id).sort();
    const inProg = evaluateQuery(inProgQ, snapshot).map((r) => r.id).sort();
    const done = evaluateQuery(doneQ, snapshot).map((r) => r.id).sort();
    expect(backlog).toEqual(['TRL-10', 'TRL-11', 'TRL-15']);
    expect(inProg).toEqual(['TRL-12', 'TRL-13']);
    expect(done).toEqual(['TRL-14']);
    // unknown status never appears in other columns
    expect(inProg).not.toContain('TRL-15');
    expect(done).not.toContain('TRL-15');
  });
});

describe('isTmlTruthy', () => {
  it('treats null/undefined/false/0/NaN as falsy', () => {
    expect(isTmlTruthy(null)).toBe(false);
    expect(isTmlTruthy(undefined)).toBe(false);
    expect(isTmlTruthy(false)).toBe(false);
    expect(isTmlTruthy(0)).toBe(false);
    expect(isTmlTruthy(NaN)).toBe(false);
  });
  it('treats empty string and empty array as falsy', () => {
    expect(isTmlTruthy('')).toBe(false);
    expect(isTmlTruthy([])).toBe(false);
  });
  it('treats non-empty string/array and true as truthy', () => {
    expect(isTmlTruthy('x')).toBe(true);
    expect(isTmlTruthy(['lane-1'])).toBe(true);
    expect(isTmlTruthy(true)).toBe(true);
    expect(isTmlTruthy(1)).toBe(true);
  });
});

describe('resolveExpr', () => {
  const scope = { lane: { id: 'lane-1', isActive: true, opCount: 12, fileCount: 5 } };
  it('resolves a single field path preserving type', () => {
    expect(resolveExpr('lane.isActive', scope)).toBe(true);
  });
  it('concatenates with string literals', () => {
    expect(resolveExpr("lane.opCount + ' / ' + lane.fileCount", scope)).toBe('12 / 5');
  });
  it('resolves a string literal', () => {
    expect(resolveExpr("'hi'", scope)).toBe('hi');
  });
});

describe('parseTmlAttrs', () => {
  it('parses query/each/live/ref', () => {
    const b = parseTmlAttrs({
      'tml-query': "find ?e where type = 'Lane'",
      'tml-each': 'lane of lanes',
      'tml-live': '',
      'tml-ref': 'active-lanes',
    });
    expect(b.query).toBe("find ?e where type = 'Lane'");
    expect(b.each).toEqual({ var: 'lane', collection: 'lanes' });
    expect(b.live).toBe(true);
    expect(b.ref).toBe('active-lanes');
  });
  it('parses op with default id arg', () => {
    const b = parseTmlAttrs({ 'tml-op': 'promote(lane.id)' });
    expect(b.op).toEqual({ action: 'promote', args: [{ name: 'id', expr: 'lane.id' }] });
  });
  it('parses op with named arg', () => {
    const b = parseTmlAttrs({ 'tml-op': 'promote(id: lane.id)' });
    expect(b.op).toEqual({ action: 'promote', args: [{ name: 'id', expr: 'lane.id' }] });
  });
  it('collects tml-attr-* into attrs map', () => {
    const b = parseTmlAttrs({ 'tml-attr-class': 'lane.status', 'tml-text': 'lane.id' });
    expect(b.attrs).toEqual({ class: 'lane.status' });
    expect(b.text).toBe('lane.id');
  });
});

describe('Store', () => {
  it('notifies subscribers on seed and mutate', () => {
    const s = new Store();
    const cb = vi.fn();
    s.subscribe(cb);
    // Seed a COPY: `mutate` below pushes a lane, and `snapshot` is a shared
    // module-level fixture — mutating it leaked `lane-3` into every test that
    // ran afterwards, which silently changed their row counts.
    s.seed(cloneSnapshot());
    expect(cb).toHaveBeenCalledTimes(1);
    s.mutate((snap: any) => {
      snap.lanes.push({ id: 'lane-3' });
    });
    expect(cb).toHaveBeenCalledTimes(2);
  });
  it('unsubscribe stops notifications', () => {
    const s = new Store();
    const cb = vi.fn();
    const off = s.subscribe(cb);
    off();
    s.seed(snapshot);
    expect(cb).not.toHaveBeenCalled();
  });
});

describe('WebDriver', () => {
  it('query evaluates client-side over the store', async () => {
    const d = new WebDriver();
    d.seed(cloneSnapshot());
    const rows = await d.query("find ?e where type = 'Lane' and status = 'active'");
    expect(rows).toHaveLength(1);
  });
  it('op POSTs to /api/tml-mutations', async () => {
    await withFetchStub(async (fetchMock) => {
      const d = new WebDriver({ baseUrl: 'http://test' });
      await d.op('promote', { id: 'lane-1' });
      expect(fetchMock).toHaveBeenCalledWith(
        'http://test/api/tml-mutations',
        expect.objectContaining({ method: 'POST' }),
      );
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).toEqual({ action: 'promote', args: { id: 'lane-1' } });
    });
  });
});

describe('applyBindings (projection)', () => {
  function cardFor(lane: any) {
    const card = new FakeEl('article');
    const id = new FakeEl('h3');
    id.setAttribute('tml-text', 'lane.id');
    const badge = new FakeEl('span');
    badge.setAttribute('tml-text', 'lane.status');
    badge.setAttribute('tml-attr-class', 'lane.status');
    const btn = new FakeEl('button');
    btn.setAttribute('tml-op', 'promote(lane.id)');
    const cond = new FakeEl('div');
    cond.setAttribute('tml-if', 'lane.isActive');
    cond.setAttribute('tml-text', 'active');
    card.appendChild(id);
    card.appendChild(badge);
    card.appendChild(btn);
    card.appendChild(cond);
    return { card, id, badge, btn, cond };
  }

  it('projects fields, attrs, and op args', () => {
    const { card, id, badge, btn } = cardFor(snapshot.lanes[0]);
    const d = new WebDriver();
    applyBindings(card, { lane: snapshot.lanes[0] }, d);
    expect(id.textContent).toBe('lane-1');
    expect(badge.textContent).toBe('active');
    expect(badge.getAttribute('class')).toBe('active');
    expect(btn.listeners.click).toHaveLength(1);
    btn.listeners.click[0]();
    // op fires async; assert via stubbed fetch
  });

  it('removes element when tml-if is falsy', () => {
    const { card, cond } = cardFor(snapshot.lanes[1]); // isActive false
    applyBindings(card, { lane: snapshot.lanes[1] }, new WebDriver());
    expect(cond.parent).toBeNull();
  });

  it('removes element when tml-if resolves to empty array', () => {
    const wrap = new FakeEl('div');
    const foot = new FakeEl('div');
    foot.setAttribute('tml-if', 'issue.laneIds');
    foot.setAttribute('tml-text', 'badge');
    wrap.appendChild(foot);
    applyBindings(wrap, { issue: snapshot.issues[0] }, new WebDriver()); // laneIds: []
    expect(foot.parent).toBeNull();
  });

  it('keeps element when tml-if resolves to non-empty array', () => {
    const wrap = new FakeEl('div');
    const foot = new FakeEl('div');
    foot.setAttribute('tml-if', 'issue.laneIds');
    foot.setAttribute('tml-text', 'badge');
    wrap.appendChild(foot);
    applyBindings(wrap, { issue: snapshot.issues[2] }, new WebDriver()); // laneIds: ['lane-1']
    expect(foot.parent).toBe(wrap);
  });

  it('op click resolves the scoped arg', async () => {
    await withFetchStub(async (fetchMock) => {
      const { btn } = cardFor(snapshot.lanes[0]);
      const d = new WebDriver({ baseUrl: 'http://test' });
      applyBindings(btn, { lane: snapshot.lanes[0] }, d);
      btn.listeners.click[0]();
      await new Promise((r) => setTimeout(r, 0));
      expect(fetchMock).toHaveBeenCalled();
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).toEqual({ action: 'promote', args: { id: 'lane-1' } });
    });
  });
});

/**
 * `mount` + `tml-live` — the projection lifecycle.
 *
 * Previously only `parseTmlAttrs` touched `tml-live`, asserting it parses to
 * `live: true`. That is a parser test: it proves the attribute is read, not that
 * anything re-renders. Nothing exercised `setupContainer`, so the live behaviour
 * itself was unverified.
 */
describe('mount + tml-live', () => {
  function laneList(opts: { live: boolean }) {
    const root = new FakeEl('div');
    const list = new FakeEl('div');
    list.setAttribute('tml-query', "find ?e where type = 'Lane'");
    list.setAttribute('tml-each', 'lane of lanes');
    if (opts.live) list.setAttribute('tml-live', '');
    const card = new FakeEl('article');
    card.setAttribute('tml-text', 'lane.id');
    list.appendChild(card);
    root.appendChild(list);
    return { root, list };
  }

  /** `render()` resolves a promise chain; flush it. */
  const flush = () => new Promise((r) => setTimeout(r, 0));

  it('renders one node per row and projects the row scope', async () => {
    const { root, list } = laneList({ live: false });
    const d = new WebDriver();
    d.seed(cloneSnapshot());

    mount(root, d);
    await flush();

    // v0 clones the CONTAINER per row, so each row is a wrapper copy of the
    // container holding the projected children — not the inner card directly.
    expect(list.children).toHaveLength(2);
    expect(list.children.map((c) => c.children[0].textContent)).toEqual([
      'lane-1',
      'lane-2',
    ]);
  });

  it('re-renders when the store is re-seeded', async () => {
    const { root, list } = laneList({ live: true });
    const d = new WebDriver();
    d.seed(cloneSnapshot());

    mount(root, d);
    await flush();
    expect(list.children).toHaveLength(2);

    // A new snapshot arrives — the SSE `snapshot` event calls driver.seed().
    d.seed({ ...snapshot, lanes: [snapshot.lanes[0]] });
    await flush();

    expect(list.children).toHaveLength(1);
    expect(list.children[0].children[0].textContent).toBe('lane-1');
  });

  it('does NOT re-render without tml-live', async () => {
    const { root, list } = laneList({ live: false });
    const d = new WebDriver();
    d.seed(cloneSnapshot());

    mount(root, d);
    await flush();
    expect(list.children).toHaveLength(2);

    d.seed({ ...snapshot, lanes: [snapshot.lanes[0]] });
    await flush();

    // Still the first render — `tml-live` is what opts in.
    expect(list.children).toHaveLength(2);
  });

  it('re-render does not accumulate nodes across seeds', async () => {
    const { root, list } = laneList({ live: true });
    const d = new WebDriver();
    d.seed(cloneSnapshot());

    mount(root, d);
    await flush();
    for (let i = 0; i < 3; i++) {
      d.seed({ ...snapshot });
      await flush();
    }

    // The container is cleared each render; a stale append shows up here.
    expect(list.children).toHaveLength(2);
  });

  it('holds live reproject while .cell-editing is present (TRL-215)', async () => {
    const { root, list } = laneList({ live: true });
    const d = new WebDriver();
    d.seed(cloneSnapshot());

    mount(root, d);
    await flush();
    expect(list.children).toHaveLength(2);

    const lock = new FakeEl('td');
    lock.setAttribute('class', 'cell-editing');
    list.children[0].appendChild(lock);

    d.seed({ ...snapshot, lanes: [snapshot.lanes[0]] });
    await flush();

    expect(list.children).toHaveLength(2);
    expect(
      list.children[0].findChild((c) => c.getAttribute('class') === 'cell-editing'),
    ).toBeTruthy();
  });

  it('projects <tr> directly into tbody (no nested tbody wrappers)', async () => {
    const root = new FakeEl('div');
    const table = new FakeEl('table');
    const tbody = new FakeEl('tbody');
    tbody.setAttribute('tml-query', "find ?e where type = 'Lane'");
    tbody.setAttribute('tml-each', 'lane of lanes');
    const tr = new FakeEl('tr');
    const td = new FakeEl('td');
    td.setAttribute('tml-text', 'lane.id');
    tr.appendChild(td);
    tbody.appendChild(tr);
    table.appendChild(tbody);
    root.appendChild(table);

    const d = new WebDriver();
    d.seed(cloneSnapshot());
    mount(root, d);
    await flush();

    expect(tbody.children).toHaveLength(2);
    expect(tbody.children.every((c) => c.tagName === 'tr')).toBe(true);
    expect(tbody.children.map((c) => c.children[0].textContent)).toEqual([
      'lane-1',
      'lane-2',
    ]);
  });
});

/**
 * `PeerDriver` — TML as a peer rather than a snapshot renderer.
 *
 * The point is not that it renders the same thing `WebDriver` does. It is that
 * queries go to the real `QueryEngine` over a real `EAVStore`, so TML can ask
 * things the server never anticipated — which `evaluateQuery` cannot, since it
 * filters a denormalized array with `Lane` and `Issue` hardcoded.
 */
describe('PeerDriver (materializing)', () => {
  const storeAssert = (facts: { e: string; a: string; v: unknown }[]) =>
    createVcsOp('vcs:storeAssert', { agentId: 'agent:test', vcs: { facts } as never });

  it('materializes ops into a queryable store', async () => {
    const d = new PeerDriver();
    d.applyOps([
      await storeAssert([
        { e: 'thing:1', a: 'type', v: 'Widget' },
        { e: 'thing:1', a: 'name', v: 'first' },
      ]),
    ]);

    const rows = await d.query('find ?e where type = "Widget"');
    expect(rows).toHaveLength(1);
  });

  it('answers a type the server never projected — WebDriver cannot', async () => {
    const gizmo = { id: 'gizmo:1', label: 'novel' };

    // WebDriver, handed a snapshot that literally contains the data:
    // `collectionFor` only knows Lane and Issue, so anything else hits its
    // default branch and returns []. The server has to have anticipated it.
    const web = new WebDriver();
    web.seed({ ...cloneSnapshot(), gizmos: [gizmo] });
    expect(await web.query("find ?e where type = 'Gizmo'")).toHaveLength(0);

    // PeerDriver holds the graph, so it does not care what anyone anticipated.
    const peer = new PeerDriver();
    peer.applyOps([
      await storeAssert([
        { e: 'gizmo:1', a: 'type', v: 'Gizmo' },
        { e: 'gizmo:1', a: 'label', v: 'novel' },
      ]),
    ]);
    expect(await peer.query('find ?e where type = "Gizmo"')).toHaveLength(1);
  });

  it('is idempotent by op hash — replays do not double-project', async () => {
    const d = new PeerDriver();
    const op = await storeAssert([{ e: 'thing:1', a: 'type', v: 'Widget' }]);

    d.applyOps([op]);
    d.applyOps([op]); // the stream replays on reconnect

    expect(await d.query('find ?e where type = "Widget"')).toHaveLength(1);
  });

  it('notifies live subscribers once per batch, not per op', async () => {
    const d = new PeerDriver();
    const cb = vi.fn();
    d.live('', cb);

    d.applyOps([
      await storeAssert([{ e: 'a:1', a: 'type', v: 'Widget' }]),
      await storeAssert([{ e: 'a:2', a: 'type', v: 'Widget' }]),
    ]);

    // Per-op notify would re-render the DOM once per op in a cold replay.
    expect(cb).toHaveBeenCalledTimes(1);
    expect(await d.query('find ?e where type = "Widget"')).toHaveLength(2);
  });

  it('reflects retractions, not just asserts', async () => {
    const d = new PeerDriver();
    d.applyOps([await storeAssert([{ e: 'thing:1', a: 'type', v: 'Widget' }])]);
    expect(await d.query('find ?e where type = "Widget"')).toHaveLength(1);

    d.applyOps([
      await createVcsOp('vcs:storeRetract', {
        agentId: 'agent:test',
        vcs: { facts: [{ e: 'thing:1', a: 'type', v: 'Widget' }] } as never,
      }),
    ]);

    expect(await d.query('find ?e where type = "Widget"')).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ *
 * Binding diagnostics — docs/specs/tml-v0.2-binding-diagnostics.md
 * ------------------------------------------------------------------ */

describe('resolvePath', () => {
  it('separates a present key from an absent one', () => {
    expect(resolvePath({ a: { b: 1 } }, 'a.b')).toEqual({ ok: true, value: 1 });
    expect(resolvePath({ a: { b: 1 } }, 'a.c')).toEqual({ ok: false, value: undefined });
  });

  it('treats a key present with value undefined as resolved', () => {
    expect(resolvePath({ a: { b: undefined } }, 'a.b')).toEqual({ ok: true, value: undefined });
  });

  it('reports unresolved when walking through a null intermediate', () => {
    expect(resolvePath({ a: null }, 'a.b')).toEqual({ ok: false, value: undefined });
  });

  it('leaves getPath behaviour unchanged', () => {
    expect(getPath({ a: { b: 1 } }, 'a.b')).toBe(1);
    expect(getPath({ a: { b: 1 } }, 'a.c')).toBeUndefined();
    expect(getPath({ a: null }, 'a.b')).toBeUndefined();
  });
});

describe('expressionPaths', () => {
  it('ignores quoted literals and keeps field paths', () => {
    expect(expressionPaths("lane.opCount + ' / ' + lane.fileCount")).toEqual([
      'lane.opCount',
      'lane.fileCount',
    ]);
    expect(expressionPaths("'just a literal'")).toEqual([]);
  });
});

describe('binding diagnostics', () => {
  const collect = () => {
    const seen: TmlDiagnostic[] = [];
    return { seen, onDiagnostic: (d: TmlDiagnostic) => seen.push(d) };
  };
  const flush = () => new Promise((r) => setTimeout(r, 0));

  function board(attrs: Record<string, string>, childAttrs: Record<string, string>) {
    const root = new FakeEl('div');
    const list = new FakeEl('div');
    for (const [k, v] of Object.entries(attrs)) list.setAttribute(k, v);
    const card = new FakeEl('article');
    for (const [k, v] of Object.entries(childAttrs)) card.setAttribute(k, v);
    list.appendChild(card);
    root.appendChild(list);
    return root;
  }

  it('reports a malformed tml-each (of -> in) that would blank the whole card', () => {
    const { seen, onDiagnostic } = collect();
    const root = board(
      { 'tml-query': "find ?e where type = 'Lane'", 'tml-each': 'lane in lanes' },
      { 'tml-text': 'lane.id' },
    );
    const d = new WebDriver();
    d.seed(cloneSnapshot());
    mount(root, d, { onDiagnostic });

    expect(seen.map((s) => s.code)).toContain('malformed-each');
    expect(seen.find((s) => s.code === 'malformed-each')?.attr).toBe('tml-each');
  });

  it('reports a malformed tml-op', () => {
    const { seen, onDiagnostic } = collect();
    const root = board(
      { 'tml-query': "find ?e where type = 'Lane'", 'tml-each': 'lane of lanes' },
      { 'tml-op': 'promote lane.id' },
    );
    const d = new WebDriver();
    d.seed(cloneSnapshot());
    mount(root, d, { onDiagnostic });

    expect(seen.map((s) => s.code)).toContain('malformed-op');
  });

  it('reports tml-each with no tml-query', () => {
    const { seen, onDiagnostic } = collect();
    const root = new FakeEl('div');
    const stray = new FakeEl('div');
    stray.setAttribute('tml-each', 'lane of lanes');
    root.appendChild(stray);

    mount(root, new WebDriver(), { onDiagnostic });
    expect(seen.map((s) => s.code)).toContain('each-without-query');
  });

  it('reports an unresolved field path against a real row, with scope keys', async () => {
    const { seen, onDiagnostic } = collect();
    const root = board(
      { 'tml-query': "find ?e where type = 'Lane'", 'tml-each': 'lane of lanes' },
      { 'tml-text': 'lane.od' },
    );
    const d = new WebDriver();
    d.seed(cloneSnapshot());
    mount(root, d, { onDiagnostic });
    await flush();

    const hit = seen.find((s) => s.code === 'unresolved-path');
    expect(hit?.expr).toBe('lane.od');
    expect(hit?.detail).toContain('lane');
  });

  it('stays silent for a well-formed board', async () => {
    const { seen, onDiagnostic } = collect();
    const root = board(
      { 'tml-query': "find ?e where type = 'Lane'", 'tml-each': 'lane of lanes' },
      { 'tml-text': 'lane.id' },
    );
    const d = new WebDriver();
    d.seed(cloneSnapshot());
    mount(root, d, { onDiagnostic });
    await flush();

    expect(seen).toEqual([]);
  });

  it('distinguishes an empty array from a typo on tml-if - same render, different report', async () => {
    // Empty array: node removed, no diagnostic.
    const empty = collect();
    const r1 = board(
      { 'tml-query': "find ?e where type = 'Lane'", 'tml-each': 'lane of lanes' },
      { 'tml-if': 'lane.tags' },
    );
    const d1 = new WebDriver();
    const s1 = cloneSnapshot();
    s1.lanes.forEach((l: Record<string, unknown>) => (l.tags = []));
    d1.seed(s1);
    mount(r1, d1, { onDiagnostic: empty.onDiagnostic });
    await flush();
    expect(empty.seen).toEqual([]);

    // Typo: node also removed, but reported.
    const typo = collect();
    const r2 = board(
      { 'tml-query': "find ?e where type = 'Lane'", 'tml-each': 'lane of lanes' },
      { 'tml-if': 'lane.tgs' },
    );
    const d2 = new WebDriver();
    const s2 = cloneSnapshot();
    s2.lanes.forEach((l: Record<string, unknown>) => (l.tags = []));
    d2.seed(s2);
    mount(r2, d2, { onDiagnostic: typo.onDiagnostic });
    await flush();
    expect(typo.seen.map((s) => s.code)).toEqual(['unresolved-path']);
  });

  it('runs the shape tier once across many live re-renders', async () => {
    const { seen, onDiagnostic } = collect();
    const root = board(
      { 'tml-query': "find ?e where type = 'Lane'", 'tml-each': 'lane of lanes', 'tml-live': '' },
      { 'tml-text': 'lane.od' },
    );
    const d = new WebDriver();
    d.seed(cloneSnapshot());
    mount(root, d, { onDiagnostic });
    await flush();
    d.seed(cloneSnapshot());
    await flush();
    d.seed(cloneSnapshot());
    await flush();

    expect(seen.filter((s) => s.code === 'unresolved-path')).toHaveLength(1);
  });

  it('throws on the first diagnostic in strict mode', () => {
    const root = board(
      { 'tml-query': "find ?e where type = 'Lane'", 'tml-each': 'lane in lanes' },
      { 'tml-text': 'lane.id' },
    );
    expect(() => mount(root, new WebDriver(), { strict: true })).toThrow(/malformed-each/);
  });
});
