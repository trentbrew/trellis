/**
 * Admin causal history graph primitive — SVG + row list.
 * Spec: docs/specs/trellis-admin-causal-graph.md
 */

import type { CausalGraphSnapshot, CausalNode } from './causal-graph-snapshot.js';

export const ROW_HEIGHT = 72;
export const LANE_GAP = 48;
export const LEFT_PAD = 28;
export const TIME_COL_W = 52;
export const DOT_R = 10;
export const LINE_W = 5;

const LANE_VAR_NAMES = [
  '--text-weak',
  '--accent',
  '--green',
  '--yellow',
] as const;

const ACTIVE_SPIN_SVG =
  '<svg class="graph-active-spin" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg>';

export function laneX(lane: number): number {
  return LEFT_PAD + lane * LANE_GAP;
}

export function laneLabelOffset(lane: number): number {
  return laneX(lane) + DOT_R + 6;
}

export function rowY(row: number): number {
  return row * ROW_HEIGHT + ROW_HEIGHT / 2;
}

export function laneColorCss(lane: number, el: Element = document.documentElement): string {
  const name = LANE_VAR_NAMES[lane % LANE_VAR_NAMES.length];
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || (lane === 0 ? 'rgba(255,255,255,0.42)' : '#9dbefe');
}

export interface GraphEdge {
  d: string;
  color: string;
  key: string;
}

export function buildEdges(
  commits: CausalNode[],
  colorForLane: (lane: number) => string,
): GraphEdge[] {
  const rowOf = new Map(commits.map((c, i) => [c.id, i]));
  const laneOfId = new Map(commits.map((c) => [c.id, c.lane]));
  const list: GraphEdge[] = [];

  for (const c of commits) {
    const childRow = rowOf.get(c.id);
    if (childRow === undefined) continue;
    for (const parentId of c.parents) {
      const parentRow = rowOf.get(parentId);
      const parentLane = laneOfId.get(parentId);
      if (parentRow === undefined || parentLane === undefined) continue;

      const xc = laneX(c.lane);
      const yc = rowY(childRow);
      const xp = laneX(parentLane);
      const yp = rowY(parentRow);
      const color = colorForLane(Math.max(c.lane, parentLane));

      let d: string;
      if (xc === xp) d = `M ${xc} ${yc} L ${xp} ${yp}`;
      else {
        const midY = (yc + yp) / 2;
        d = `M ${xc} ${yc} C ${xc} ${midY}, ${xp} ${midY}, ${xp} ${yp}`;
      }
      list.push({ d, color, key: `${c.id}->${parentId}` });
    }
  }
  return list;
}

export function formatGraphTime(iso?: string, trunk = false): string {
  if (!iso) return trunk ? '—' : '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso.slice(0, 10);
  const d = new Date(t);
  if (trunk) {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export type AdminCausalGraphHandle = {
  refresh(data?: CausalGraphSnapshot): void;
  destroy(): void;
};

export { formatViewMeta } from './causal-graph-snapshot.js';

export function mountAdminCausalGraph(
  root: HTMLElement,
  opts: {
    fetchUrl?: string;
    onSelect?: (node: CausalNode | null) => void;
    onStats?: (stats: CausalGraphSnapshot['stats'], integrationBranch: string) => void;
  } = {},
): AdminCausalGraphHandle {
  const fetchUrl = opts.fetchUrl ?? '/api/causal-graph';
  let selected: string | null = null;
  let data: CausalGraphSnapshot | null = null;
  let loading = true;

  root.classList.add('causal-graph-mount');
  root.innerHTML = '';

  const host = document.createElement('div');
  host.className = 'graph-row-host';
  root.appendChild(host);

  function renderSkeleton() {
    host.innerHTML = `
      <div class="causal-graph-skeleton" aria-busy="true">
        <div class="skeleton-row"></div>
        <div class="skeleton-row"></div>
        <div class="skeleton-row"></div>
      </div>`;
  }

  function renderEmpty() {
    host.innerHTML = `
      <div class="causal-graph-empty" role="status">
        <strong>No fork history yet</strong>
        <span>Start an issue to create an agent fork, then promote when done.</span>
      </div>`;
  }

  function renderGraph() {
    if (!data) return;
    if (!data.commits.length) {
      renderEmpty();
      return;
    }

    const commits = data.commits;
    const colorFor = (lane: number) => laneColorCss(lane, root);
    const edges = buildEdges(commits, colorFor);
    const maxLane = Math.max(...commits.map((c) => c.lane));
    const svgW = laneX(maxLane) + LEFT_PAD;
    const svgH = commits.length * ROW_HEIGHT;

    const paths = edges
      .map(
        (e) =>
          `<path d="${e.d}" fill="none" stroke="${e.color}" stroke-width="${LINE_W}" stroke-linecap="round"/>`,
      )
      .join('');

    const dots = commits
      .map((c, i) => {
        const sel = selected === c.id;
        const merge = c.kind === 'promote' || c.parents.length > 1;
        const r = sel ? DOT_R + 2 : DOT_R;
        const fill = merge ? 'var(--surface-raised-base, #1c1c1c)' : colorFor(c.lane);
        const stroke = colorFor(c.lane);
        const sw = merge ? LINE_W : sel ? 3 : 0;
        const activeRing =
          c.active && c.kind === 'head'
            ? `<circle cx="${laneX(c.lane)}" cy="${rowY(i)}" r="${r + 5}" fill="none" stroke="var(--green, #12c905)" stroke-width="2" stroke-opacity="0.55"/>`
            : '';
        return `${activeRing}<circle cx="${laneX(c.lane)}" cy="${rowY(i)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" data-node-id="${c.id}" tabindex="-1"/>`;
      })
      .join('');

    const times = commits
      .map((c) => {
        const trunk = c.lane === 0;
        const label = formatGraphTime(c.date, trunk);
        return `<li class="graph-time${trunk ? ' trunk' : ''}">${escapeHtml(label)}</li>`;
      })
      .join('');

    const list = commits
      .map((c) => {
        const sel = selected === c.id;
        const trunk = c.lane === 0;
        const pills = (c.branches || [])
          .map(
            (b) =>
              `<span class="graph-pill${trunk ? ' trunk' : ''}">${escapeHtml(b)}</span>`,
          )
          .join('');
        const flags = (c.tags || [])
          .map((t) => `<span class="graph-flag">${escapeHtml(t)}</span>`)
          .join('');
        const activeBadge =
          c.active && c.kind === 'head'
            ? `<span class="graph-active-badge" title="Active lane · ${escapeAttr(c.author || 'agent')}"><span class="graph-active-dot" aria-hidden="true"></span>${ACTIVE_SPIN_SVG}<span class="graph-active-label">active</span></span>`
            : '';
        const meta =
          sel && (c.hash || c.author)
            ? `<span class="graph-meta">${escapeHtml(c.hash)}${c.author ? ` · ${escapeHtml(c.author)}` : ''}${c.date ? ` · ${escapeHtml(formatRelative(c.date))}` : ''}</span>`
            : '';
        const label = `${c.message}, ${c.kind || 'event'}, lane ${c.lane}`;
        return `<li><button type="button" class="graph-row-btn${sel ? ' selected' : ''}" data-node-id="${c.id}" aria-selected="${sel}" aria-label="${escapeAttr(label)}">${activeBadge}${pills}${flags}<span class="graph-msg-wrap"><span class="graph-msg${trunk ? ' trunk' : ''}">${escapeHtml(c.message)}</span>${meta}</span></button></li>`;
      })
      .join('');

    host.innerHTML = `
      <div class="graph-row">
        <ul class="graph-times" aria-hidden="true">${times}</ul>
        <svg class="graph-svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" aria-hidden="true">${paths}${dots}</svg>
        <ul class="graph-list">${list}</ul>
      </div>`;

    host.querySelectorAll('[data-node-id]').forEach((el) => {
      el.addEventListener('click', () => toggleSelect(el.getAttribute('data-node-id')));
    });
  }

  function toggleSelect(id: string | null) {
    if (!id) return;
    selected = selected === id ? null : id;
    const node = data?.commits.find((c) => c.id === id) ?? null;
    opts.onSelect?.(selected ? node : null);
    if (loading) return;
    renderGraph();
  }

  function refresh(next?: CausalGraphSnapshot) {
    if (next) {
      loading = false;
      data = next;
      opts.onStats?.(next.stats, next.integrationBranch);
      renderGraph();
      return;
    }
    loading = true;
    renderSkeleton();
    fetch(fetchUrl)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((json: CausalGraphSnapshot) => {
        loading = false;
        data = json;
        opts.onStats?.(json.stats, json.integrationBranch);
        renderGraph();
      })
      .catch(() => {
        loading = false;
        host.innerHTML = `<div class="causal-graph-empty" role="alert"><strong>Graph unavailable</strong><span>Could not load causal history.</span></div>`;
      });
  }

  function destroy() {
    root.replaceChildren();
    root.classList.remove('causal-graph-mount');
    selected = null;
    data = null;
  }

  renderSkeleton();
  refresh();

  return { refresh, destroy };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

function formatRelative(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
