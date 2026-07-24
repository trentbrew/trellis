import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  registerShell,
  hydrateShellSlots,
  clearShellRegistry,
  shellForVantage,
  hostFromView,
  readUiVantage,
  applyUiVantage,
  rehydrateShellsForView,
} from '../../src/ui/tml-shell-registry.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const adminHtmlPath = resolve(repoRoot, 'src/ui/admin.html');

class FakeEl {
  tagName: string;
  _attrs = new Map<string, string>();
  _children: FakeEl[] = [];
  parent: FakeEl | null = null;
  content?: FakeFragment;
  ownerDocument?: { documentElement: FakeEl };

  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
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
  set innerHTML(_v: string) {
    this._children = [];
  }
  get innerHTML() {
    return '';
  }
  appendChild(c: FakeEl | FakeFragment): FakeEl | FakeFragment {
    if (c instanceof FakeFragment) {
      for (const child of c._nodes) {
        child.parent = this;
        this._children.push(child);
      }
      return c;
    }
    this._children.push(c);
    c.parent = this;
    return c;
  }
  cloneNode(): FakeEl {
    const c = new FakeEl(this.tagName);
    c._attrs = new Map(this._attrs);
    c._children = this._children.map((ch) => ch.cloneNode());
    return c;
  }
  get children() {
    return this._children;
  }
  get firstElementChild() {
    return this._children[0] || null;
  }
  get firstChild() {
    return this._children[0] || null;
  }
  removeChild(child: FakeEl) {
    const idx = this._children.indexOf(child);
    if (idx >= 0) {
      this._children.splice(idx, 1);
      child.parent = null;
    }
    return child;
  }
  querySelector(sel: string): FakeEl | null {
    if (sel === '#tml-root' && this._attrs.get('id') === 'tml-root') return this;
    for (const child of this._queryAll(sel)) return child;
    return null;
  }
  querySelectorAll(sel: string): FakeEl[] {
    return this._queryAll(sel);
  }
  _queryAll(sel: string): FakeEl[] {
    const out: FakeEl[] = [];
    const walk = (el: FakeEl) => {
      if (sel === 'template[data-trellis-shell]') {
        if (el.tagName === 'TEMPLATE' && el._attrs.has('data-trellis-shell')) out.push(el);
      } else if (sel === '[data-shell-slot]') {
        if (el._attrs.has('data-shell-slot')) out.push(el);
      } else if (sel === '[data-shell-hydrated]') {
        if (el._attrs.has('data-shell-hydrated')) out.push(el);
      } else if (sel === '#tml-root') {
        if (el._attrs.get('id') === 'tml-root') out.push(el);
      }
      el._children.forEach(walk);
    };
    walk(this);
    return out;
  }
}

class FakeFragment {
  _nodes: FakeEl[] = [];
  cloneNode(): FakeFragment {
    const f = new FakeFragment();
    f._nodes = this._nodes.map((n) => n.cloneNode());
    return f;
  }
  get firstElementChild() {
    return this._nodes[0] || null;
  }
}

function issueCardTemplate(): FakeEl {
  const tpl = new FakeEl('template');
  tpl.setAttribute('data-trellis-shell', 'issue.card');
  const btn = new FakeEl('button');
  btn.setAttribute('class', 'issue-card');
  btn.setAttribute('data-kind', 'issue');
  const title = new FakeEl('div');
  title.setAttribute('class', 'issue-title');
  title.setAttribute('tml-text', 'issue.title');
  btn.appendChild(title);
  const frag = new FakeFragment();
  frag._nodes = [btn];
  tpl.content = frag;
  return tpl;
}

function laneCardTemplate(): FakeEl {
  const tpl = new FakeEl('template');
  tpl.setAttribute('data-trellis-shell', 'lane.card');
  const article = new FakeEl('article');
  article.setAttribute('class', 'lane-card');
  article.setAttribute('data-kind', 'lane');
  const laneId = new FakeEl('div');
  laneId.setAttribute('class', 'lane-id');
  laneId.setAttribute('tml-text', 'lane.id');
  article.appendChild(laneId);
  const frag = new FakeFragment();
  frag._nodes = [article];
  tpl.content = frag;
  return tpl;
}

function laneRowTemplate(): FakeEl {
  const tpl = new FakeEl('template');
  tpl.setAttribute('data-trellis-shell', 'lane.row');
  const tr = new FakeEl('tr');
  tr.setAttribute('data-kind', 'lane');
  tr.setAttribute('data-trellis-shell', 'row');
  const td = new FakeEl('td');
  td.setAttribute('tml-text', 'lane.id');
  tr.appendChild(td);
  const frag = new FakeFragment();
  frag._nodes = [tr];
  tpl.content = frag;
  return tpl;
}

describe('tml-shell-registry', () => {
  beforeEach(() => {
    clearShellRegistry();
  });

  it('register + hydrate clones issue.card into slot', () => {
    const root = new FakeEl('main');
    const slot = new FakeEl('div');
    slot.setAttribute('data-shell-slot', 'issue.card');
    root.appendChild(slot);

    registerShell('issue.card', issueCardTemplate() as unknown as HTMLTemplateElement);
    hydrateShellSlots(root as unknown as Element);

    expect(slot.getAttribute('data-shell-hydrated')).toBe('issue.card');
    expect(slot.children).toHaveLength(1);
    expect(slot.children[0].tagName).toBe('BUTTON');
    expect(slot.children[0].getAttribute('class')).toBe('issue-card');
  });

  it('hydrates three slots from one registered template', () => {
    const root = new FakeEl('main');
    for (let i = 0; i < 3; i++) {
      const slot = new FakeEl('div');
      slot.setAttribute('data-shell-slot', 'issue.card');
      root.appendChild(slot);
    }

    registerShell('issue.card', issueCardTemplate() as unknown as HTMLTemplateElement);
    hydrateShellSlots(root as unknown as Element);

    for (const slot of root.children) {
      expect(slot.getAttribute('data-shell-hydrated')).toBe('issue.card');
      expect(slot.children[0]?.tagName).toBe('BUTTON');
    }
  });

  it('hydrate is idempotent — second call does not duplicate nodes', () => {
    const root = new FakeEl('main');
    const slot = new FakeEl('div');
    slot.setAttribute('data-shell-slot', 'issue.card');
    root.appendChild(slot);

    registerShell('issue.card', issueCardTemplate() as unknown as HTMLTemplateElement);
    hydrateShellSlots(root as unknown as Element);
    hydrateShellSlots(root as unknown as Element);

    expect(slot.children).toHaveLength(1);
  });

  it('auto-registers template[data-trellis-shell] under root', () => {
    const root = new FakeEl('main');
    const tpl = issueCardTemplate();
    root.appendChild(tpl);
    const slot = new FakeEl('div');
    slot.setAttribute('data-shell-slot', 'issue.card');
    root.appendChild(slot);

    hydrateShellSlots(root as unknown as Element);

    expect(slot.children).toHaveLength(1);
    expect(slot.children[0].tagName).toBe('BUTTON');
  });

  describe('shellForVantage', () => {
    it('returns issue.card for kanban host', () => {
      expect(shellForVantage('issue', 8, 'kanban')).toBe('issue.card');
    });

    it('returns lane.card for grid host', () => {
      expect(shellForVantage('lane', 8, 'grid')).toBe('lane.card');
    });

    it('returns lane.row for table host', () => {
      expect(shellForVantage('lane', 8, 'table')).toBe('lane.row');
    });

    it('hostFromView maps view names', () => {
      expect(hostFromView('table')).toBe('table');
    });
  });

  describe('lane shell', () => {
    it('hydrates lane.card into div slot', () => {
      const root = new FakeEl('main');
      const slot = new FakeEl('div');
      slot.setAttribute('data-shell-slot', 'lane.card');
      root.appendChild(slot);

      registerShell('lane.card', laneCardTemplate() as unknown as HTMLTemplateElement);
      hydrateShellSlots(root as unknown as Element);

      expect(slot.getAttribute('data-shell-hydrated')).toBe('lane.card');
      expect(slot.children[0]?.tagName).toBe('ARTICLE');
    });

    it('hydrates lane.row into tr slot via merge', () => {
      const root = new FakeEl('main');
      const slot = new FakeEl('tr');
      slot.setAttribute('data-shell-slot', 'lane.row');
      root.appendChild(slot);

      registerShell('lane.row', laneRowTemplate() as unknown as HTMLTemplateElement);
      hydrateShellSlots(root as unknown as Element);

      expect(slot.getAttribute('data-shell-hydrated')).toBe('lane.row');
      expect(slot.getAttribute('data-kind')).toBe('lane');
      expect(slot.children[0]?.tagName).toBe('TD');
    });
  });

  it('rehydrateShellsForView clears hydration markers', () => {
    const root = new FakeEl('main');
    const slot = new FakeEl('div');
    slot.setAttribute('data-shell-slot', 'issue.card');
    root.appendChild(slot);
    registerShell('issue.card', issueCardTemplate() as unknown as HTMLTemplateElement);
    hydrateShellSlots(root as unknown as Element);
    expect(slot.getAttribute('data-shell-hydrated')).toBe('issue.card');

    rehydrateShellsForView(root as unknown as Element, 'grid');
    expect(slot.getAttribute('data-shell-hydrated')).toBe('issue.card');
  });

  it('applyUiVantage sets data-ui-vantage on root', () => {
    const root = new FakeEl('div');
    root.setAttribute('id', 'tml-root');
    const doc = new FakeEl('html');
    (doc as FakeEl & { style: { setProperty: (k: string, v: string) => void } }).style = {
      setProperty: () => { },
    };
    root.ownerDocument = { documentElement: doc };
    expect(applyUiVantage(root as unknown as Element, 8)).toBe(8);
    expect(root.getAttribute('data-ui-vantage')).toBe('8');
    expect(readUiVantage(root as unknown as Element)).toBe(8);
  });

  describe('admin.html grep', () => {
    it('issue.title binding defined once in shell template', () => {
      const html = readFileSync(adminHtmlPath, 'utf8');
      const matches = html.match(/tml-text="issue\.title"/g) || [];
      expect(matches).toHaveLength(1);
    });

    it('lanes-board ref unified on grid and table', () => {
      const html = readFileSync(adminHtmlPath, 'utf8');
      expect(html).not.toMatch(/tml-ref="grid-lanes"/);
      expect(html).not.toMatch(/tml-ref="table-lanes"/);
      const refs = html.match(/tml-ref="lanes-board"/g) || [];
      expect(refs).toHaveLength(2);
    });

    it('lane shells registered as templates', () => {
      const html = readFileSync(adminHtmlPath, 'utf8');
      expect(html).toContain('data-trellis-shell="lane.card"');
      expect(html).toContain('data-trellis-shell="lane.row"');
      expect(html).toContain('data-shell-slot="lane.card"');
      expect(html).toContain('data-shell-slot="lane.row"');
    });
  });
});
