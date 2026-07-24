import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAdminShell, resolveDriverMode } from '../../src/ui/admin-shell.js';
import * as tmlRuntime from '../../src/ui/tml-runtime.js';
import { PeerDriver, WebDriver } from '../../src/ui/tml-runtime.js';
import { createVcsOp } from '../../src/vcs/ops.js';

function fakeMountRoot(): Element {
  return { tagName: 'MAIN' } as Element;
}

/** Minimal DOM for mount + tml-query (matches tml-runtime.test FakeEl). */
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
  set innerHTML(v: string) {
    if (v === '') this._children = [];
  }
  get innerHTML(): string {
    return this._text;
  }
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

function gizmoProbeRoot(): { root: FakeEl; probe: FakeEl } {
  const root = new FakeEl('main');
  const probe = new FakeEl('div');
  probe.setAttribute('id', 'tml-peer-probe');
  probe.setAttribute('tml-query', 'find ?e where type = "Gizmo"');
  probe.setAttribute('tml-each', 'g of gizmos');
  probe.setAttribute('tml-live', '');
  const span = new FakeEl('span');
  span.setAttribute('class', 'peer-probe-row');
  span.setAttribute('tml-text', 'g.id');
  probe.appendChild(span);
  root.appendChild(probe);
  return { root, probe };
}

const storeAssert = (facts: { e: string; a: string; v: unknown }[]) =>
  createVcsOp('vcs:storeAssert', { agentId: 'agent:test', vcs: { facts } as never });

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('resolveDriverMode', () => {
  it('returns peer for ?driver=peer', () => {
    expect(resolveDriverMode({ mountRoot: fakeMountRoot(), locationSearch: '?driver=peer' })).toBe(
      'peer',
    );
  });

  it('returns web by default', () => {
    expect(resolveDriverMode({ mountRoot: fakeMountRoot() })).toBe('web');
    expect(resolveDriverMode({ mountRoot: fakeMountRoot(), locationSearch: '' })).toBe('web');
  });

  it('explicit driver option wins over URL', () => {
    expect(
      resolveDriverMode({
        mountRoot: fakeMountRoot(),
        driver: 'web',
        locationSearch: '?driver=peer',
      }),
    ).toBe('web');
  });
});

describe('createAdminShell', () => {
  it('wraps seed and calls onSnapshot', () => {
    const onSnapshot = vi.fn();
    const mountRoot = fakeMountRoot();
    const shell = createAdminShell({ mountRoot, onSnapshot });
    const snap = { lanes: [{ id: 'lane-1' }] };
    shell.driver.seed(snap);
    expect(onSnapshot).toHaveBeenCalledWith(snap);
  });

  it('op delegates to POST /api/tml-mutations', async () => {
    await withFetchStub(async (fetchMock) => {
      const shell = createAdminShell({
        mountRoot: fakeMountRoot(),
        baseUrl: 'http://test',
      });
      await shell.op('promote', { id: 'lane-1' });
      expect(fetchMock).toHaveBeenCalledWith(
        'http://test/api/tml-mutations',
        expect.objectContaining({ method: 'POST' }),
      );
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).toEqual({ action: 'promote', args: { id: 'lane-1' } });
    });
  });

  it('op surfaces server JSON error message', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve(JSON.stringify({ error: 'invalid issueId' })),
    });
    const prev = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;
    try {
      const shell = createAdminShell({ mountRoot: fakeMountRoot() });
      await expect(shell.op('updateLaneMeta', { id: 'lane-x' })).rejects.toThrow('invalid issueId');
    } finally {
      if (prev) globalThis.fetch = prev;
      else delete (globalThis as { fetch?: unknown }).fetch;
    }
  });

  describe('connect', () => {
    let mountSpy: ReturnType<typeof vi.spyOn>;
    let eventSourceMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mountSpy = vi.spyOn(tmlRuntime, 'mount').mockImplementation(() => { });
      eventSourceMock = vi.fn(() => ({
        addEventListener: vi.fn(),
        close: vi.fn(),
      }));
      (globalThis as { EventSource?: unknown }).EventSource = eventSourceMock as unknown as typeof EventSource;
    });

    afterEach(() => {
      mountSpy.mockRestore();
      delete (globalThis as { EventSource?: unknown }).EventSource;
    });

    it('connects, mounts once, and is idempotent', async () => {
      const mountRoot = fakeMountRoot();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ lanes: [], issues: [] }),
        });
      const prevFetch = globalThis.fetch;
      globalThis.fetch = fetchMock as typeof fetch;

      const shell = createAdminShell({ mountRoot });
      await shell.connect();
      await shell.connect();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(mountSpy).toHaveBeenCalledTimes(1);
      expect(mountSpy).toHaveBeenCalledWith(mountRoot, shell.driver);
      expect(eventSourceMock).toHaveBeenCalledTimes(1);
      expect(eventSourceMock.mock.calls[0][0]).toContain('events=snapshot');

      if (prevFetch) globalThis.fetch = prevFetch;
      else delete (globalThis as { fetch?: unknown }).fetch;
    });

    it('peer mode fetches snapshot for chrome, uses op stream, and mounts PeerDriver', async () => {
      const mountRoot = fakeMountRoot();
      const onSnapshot = vi.fn();
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ lanes: [], issues: [], opCount: 3 }),
      });
      const prevFetch = globalThis.fetch;
      globalThis.fetch = fetchMock as typeof fetch;

      const shell = createAdminShell({ mountRoot, driver: 'peer', onSnapshot, baseUrl: 'http://test' });
      await shell.connect();

      expect(shell.driver).toBeInstanceOf(PeerDriver);
      expect(fetchMock).toHaveBeenCalledWith('http://test/api/lanes');
      expect(onSnapshot).toHaveBeenCalledWith({ lanes: [], issues: [], opCount: 3 });
      expect(eventSourceMock).toHaveBeenCalledWith('http://test/api/lanes/stream');
      expect(mountSpy).toHaveBeenCalledWith(mountRoot, shell.driver);

      if (prevFetch) globalThis.fetch = prevFetch;
      else delete (globalThis as { fetch?: unknown }).fetch;
    });
  });

  describe('peer probe', () => {
    let mountSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mountSpy = vi.spyOn(tmlRuntime, 'mount').mockRestore();
      (globalThis as { EventSource?: unknown }).EventSource = vi.fn(() => ({
        addEventListener: vi.fn(),
        close: vi.fn(),
      })) as unknown as typeof EventSource;
    });

    afterEach(() => {
      delete (globalThis as { EventSource?: unknown }).EventSource;
    });

    it('web mode renders 0 Gizmo rows even when snapshot carries gizmos', async () => {
      const { root, probe } = gizmoProbeRoot();
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            lanes: [],
            issues: [],
            gizmos: [{ id: 'gizmo:1', label: 'novel' }],
          }),
      });
      const prevFetch = globalThis.fetch;
      globalThis.fetch = fetchMock as typeof fetch;

      const shell = createAdminShell({ mountRoot: root as unknown as Element, driver: 'web' });
      await shell.connect();
      await flush();

      expect(shell.driver).toBeInstanceOf(WebDriver);
      expect(probe.children).toHaveLength(0);

      if (prevFetch) globalThis.fetch = prevFetch;
      else delete (globalThis as { fetch?: unknown }).fetch;
    });

    it('peer mode renders Gizmo rows after op materialization', async () => {
      const { root, probe } = gizmoProbeRoot();
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ lanes: [], issues: [] }),
      });
      const prevFetch = globalThis.fetch;
      globalThis.fetch = fetchMock as typeof fetch;

      const shell = createAdminShell({ mountRoot: root as unknown as Element, driver: 'peer' });
      await shell.connect();
      const peer = shell.driver as PeerDriver;
      peer.applyOps([
        await storeAssert([
          { e: 'gizmo:1', a: 'type', v: 'Gizmo' },
          { e: 'gizmo:1', a: 'label', v: 'novel' },
        ]),
      ]);
      await flush();

      expect(peer).toBeInstanceOf(PeerDriver);
      expect(probe.children).toHaveLength(1);
      expect(probe.children[0].children[0].textContent).toBe('gizmo:1');

      if (prevFetch) globalThis.fetch = prevFetch;
      else delete (globalThis as { fetch?: unknown }).fetch;
    });
  });
});
