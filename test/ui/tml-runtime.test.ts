import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  evaluateQuery,
  parseTmlAttrs,
  resolveExpr,
  Store,
  WebDriver,
  applyBindings,
} from '../../src/ui/tml-runtime.js';

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
  issues: [],
};

describe('evaluateQuery', () => {
  it('returns lanes by type', () => {
    expect(evaluateQuery("find ?e where type = 'Lane'", snapshot)).toHaveLength(2);
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
    s.seed(snapshot);
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
    d.seed(snapshot);
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
