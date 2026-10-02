/**
 * Terminal formatters shared by the `trellis` CLI and embedded shells (tsh).
 *
 * Pure: data in, lines out. No I/O, no process state, no chalk import —
 * callers inject a {@link Style}. chalk satisfies it structurally; `ansi` is a
 * dependency-free equivalent for hosts that write to a raw TTY stream, and
 * `plain` strips color entirely. JSON shapes here are the agent contract for
 * `--json` and must stay stable.
 */

import type { EntityRecord } from '../core/kernel/trellis-kernel.js';
import type { QueryResult } from '../core/query/engine.js';
import type { Fact, Link } from '../core/store/eav-store.js';
import type { IssueInfo } from '../vcs/issue.js';
import {
  buildView,
  STATUS_ORDER,
  type IssueGroup,
  type IssueGroupBy,
  type IssueSort,
  type IssueView,
} from '../cli/views.js';

type Paint = (s: string) => string;

export interface Style {
  bold: Paint;
  dim: Paint;
  red: Paint;
  green: Paint;
  yellow: Paint;
  blue: Paint;
  magenta: Paint;
  cyan: Paint;
  white: Paint;
  gray: Paint;
}

const sgr =
  (open: number, close: number): Paint =>
  (s) =>
    `\u001b[${open}m${s}\u001b[${close}m`;

export const ansi: Style = {
  bold: sgr(1, 22),
  dim: sgr(2, 22),
  red: sgr(31, 39),
  green: sgr(32, 39),
  yellow: sgr(33, 39),
  blue: sgr(34, 39),
  magenta: sgr(35, 39),
  cyan: sgr(36, 39),
  white: sgr(37, 39),
  gray: sgr(90, 39),
};

const id: Paint = (s) => s;

export const plain: Style = {
  bold: id,
  dim: id,
  red: id,
  green: id,
  yellow: id,
  blue: id,
  magenta: id,
  cyan: id,
  white: id,
  gray: id,
};

export function formatRelativeTime(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

/** Flatten an entity to `{ id, type, ...facts }` (the `--json` shape). */
export function entityToJson(entity: EntityRecord): Record<string, unknown> {
  const obj: Record<string, unknown> = { id: entity.id, type: entity.type };
  for (const f of entity.facts) {
    if (f.a !== 'type') obj[f.a] = f.v;
  }
  return obj;
}

export function formatEntityList(
  entities: EntityRecord[],
  opts: { type?: string; json?: boolean; style?: Style } = {},
): string[] {
  const s = opts.style ?? plain;
  if (opts.json) return [JSON.stringify(entities.map(entityToJson), null, 2)];
  if (entities.length === 0) return [s.dim('No entities found.')];

  const typeLabel = opts.type ? ` (type: ${opts.type})` : '';
  const lines = [s.bold(`Entities (${entities.length})${typeLabel}`), ''];
  for (const e of entities) {
    const labelFact =
      e.facts.find((f) => f.a === 'title') ??
      e.facts.find((f) => f.a === 'name');
    const name = labelFact ? ` ${s.white(String(labelFact.v))}` : '';
    lines.push(`  ${s.cyan(e.type.padEnd(16))} ${s.bold(e.id)}${name}`);
  }
  return lines;
}

export function formatEntity(
  entity: EntityRecord,
  opts: { json?: boolean; style?: Style } = {},
): string[] {
  const s = opts.style ?? plain;
  if (opts.json) {
    const obj = entityToJson(entity);
    obj._links = entity.links.map((l) => ({
      attribute: l.a,
      target: l.e2,
      source: l.e1,
    }));
    return [JSON.stringify(obj, null, 2)];
  }

  const lines = [s.bold(`${entity.type}: ${entity.id}`), ''];
  for (const f of entity.facts) {
    lines.push(`  ${s.dim(f.a.padEnd(20))} ${f.v}`);
  }
  if (entity.links.length > 0) {
    lines.push('', `  ${s.bold('Links:')}`);
    for (const l of entity.links) {
      const out = l.e1 === entity.id;
      lines.push(`    ${out ? '→' : '←'} ${s.dim(l.a)} ${out ? l.e2 : l.e1}`);
    }
  }
  return lines;
}

const ROW_CAP = 100;
const TERMINAL_TABLE_COL_CAP = 6;
const TERMINAL_COL_GAP = 2;
const TERMINAL_CELL_MAX = 48;
const ANSI_STRIP_RE = /\u001b\[[0-9;?]*[A-Za-z]/g;

function visibleTerminalWidth(text: string): number {
  return text.replace(ANSI_STRIP_RE, '').length;
}

function padTerminalCell(text: string, width: number): string {
  const pad = width - visibleTerminalWidth(text);
  return pad > 0 ? text + ' '.repeat(pad) : text;
}

export interface FormatTerminalHints {
  layout?: 'auto' | 'table' | 'kv';
  title?: string;
  emptyMessage?: string;
  columns?: string[];
  maxRows?: number;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function inferTableColumns(
  rows: Record<string, unknown>[],
  prefer?: string[],
): string[] {
  if (prefer?.length) return prefer.slice(0, TERMINAL_TABLE_COL_CAP);
  const keys = new Set<string>();
  for (const row of rows.slice(0, 8)) {
    for (const k of Object.keys(row)) keys.add(k);
  }
  const all = [...keys];
  const priority = ['id', 'name', 'title', 'type', 'status', 'mutates', 'version'];
  return all
    .sort((a, b) => {
      const ai = priority.indexOf(a);
      const bi = priority.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return a.localeCompare(b);
    })
    .slice(0, TERMINAL_TABLE_COL_CAP);
}

function formatTerminalCell(v: unknown, s: Style): string {
  if (v === null || v === undefined) return s.dim('—');
  if (typeof v === 'boolean') return v ? s.green('true') : s.red('false');
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') {
    return v.length > 56 ? `${v.slice(0, 53)}…` : v;
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return s.dim('[]');
    if (v.every((x) => typeof x === 'string' || typeof x === 'number')) {
      const joined = v.map(String).join(', ');
      return joined.length > 52 ? s.dim(`${v.length} items`) : joined;
    }
    return s.dim(`[${v.length}]`);
  }
  if (isRecord(v)) {
    const compact = JSON.stringify(v);
    return compact.length > 52 ? s.dim('{…}') : s.dim(compact);
  }
  return String(v);
}

function terminalTableLines(
  rows: Record<string, unknown>[],
  s: Style,
  hints: FormatTerminalHints,
): string[] {
  const maxRows = hints.maxRows ?? ROW_CAP;
  const cols = inferTableColumns(rows, hints.columns);
  if (cols.length === 0) return terminalKvLines(rows[0] ?? {}, s, hints);

  const slice = rows.slice(0, maxRows);
  const widths = cols.map((col) => {
    let w = col.length;
    for (const row of slice) {
      w = Math.max(w, formatTerminalCell(row[col], plain).length);
    }
    return Math.min(w, TERMINAL_CELL_MAX);
  });

  const gap = ' '.repeat(TERMINAL_COL_GAP);
  const lines: string[] = [];
  const title = hints.title ?? `Rows (${rows.length})`;
  lines.push(s.bold(title), '');
  lines.push(
    `  ${cols.map((c, i) => padTerminalCell(s.dim(c), widths[i])).join(gap)}`,
  );
  lines.push(
    `  ${cols.map((_, i) => s.dim('─'.repeat(widths[i]))).join(gap)}`,
  );
  for (const row of slice) {
    const cells = cols.map((col, i) => {
      const plainText = formatTerminalCell(row[col], plain);
      const clipped =
        plainText.length > TERMINAL_CELL_MAX
          ? `${plainText.slice(0, TERMINAL_CELL_MAX - 1)}…`
          : plainText;
      let display: string;
      if (i === 0) display = s.cyan(clipped);
      else if (typeof row[col] === 'boolean') display = formatTerminalCell(row[col], s);
      else if (row[col] === null || row[col] === undefined) display = formatTerminalCell(row[col], s);
      else display = clipped;
      return padTerminalCell(display, widths[i]);
    });
    lines.push(`  ${cells.join(gap)}`);
  }
  if (rows.length > maxRows) {
    lines.push(s.dim(`  … +${rows.length - maxRows} more`));
  }
  return lines;
}

function terminalKvLines(
  obj: Record<string, unknown>,
  s: Style,
  hints: FormatTerminalHints,
): string[] {
  const lines: string[] = [];
  if (hints.title) lines.push(s.bold(hints.title), '');
  const entries = Object.entries(obj);
  if (entries.length === 0) return [s.dim(hints.emptyMessage ?? 'Empty.')];
  for (const [k, v] of entries) {
    if (Array.isArray(v) && v.every((x) => typeof x === 'string' || typeof x === 'number')) {
      lines.push(`  ${s.dim(`${k}:`)}`);
      for (const item of v.slice(0, maxKvList(hints))) {
        lines.push(`    ${formatTerminalCell(item, s)}`);
      }
      if (v.length > maxKvList(hints)) {
        lines.push(s.dim(`    … +${v.length - maxKvList(hints)} more`));
      }
      continue;
    }
    lines.push(`  ${s.dim(`${k.padEnd(16)}`)} ${formatTerminalCell(v, s)}`);
  }
  return lines;
}

function maxKvList(hints: FormatTerminalHints): number {
  return hints.maxRows ?? 24;
}

/**
 * Generic JSON → terminal lines (spike: table / kv heuristics + optional hints).
 * Stable `--json` payloads stay separate; this is human-facing only.
 */
export function formatTerminal(
  value: unknown,
  opts: { hints?: FormatTerminalHints; style?: Style } = {},
): string[] {
  const s = opts.style ?? plain;
  const hints = opts.hints ?? {};
  const empty = hints.emptyMessage ?? 'No results.';

  if (value === null || value === undefined) return [s.dim(empty)];

  const layout = hints.layout ?? 'auto';

  if (Array.isArray(value)) {
    if (value.length === 0) {
      if (hints.title) return [s.bold(hints.title), '', s.dim(empty)];
      return [s.dim(empty)];
    }
    const records = value.filter(isRecord) as Record<string, unknown>[];
    const tableOk =
      layout === 'table' ||
      (layout === 'auto' && records.length === value.length && records.length > 0);
    if (tableOk) return terminalTableLines(records, s, hints);
    const lines = [s.bold(hints.title ?? `List (${value.length})`), ''];
    for (const item of value.slice(0, hints.maxRows ?? ROW_CAP)) {
      lines.push(`  • ${formatTerminalCell(item, s)}`);
    }
    if (value.length > (hints.maxRows ?? ROW_CAP)) {
      lines.push(s.dim(`  … +${value.length - (hints.maxRows ?? ROW_CAP)} more`));
    }
    return lines;
  }

  if (isRecord(value)) {
    if (layout === 'table') return terminalTableLines([value], s, hints);
    return terminalKvLines(value, s, hints);
  }

  return [String(value)];
}

export function formatFactList(
  facts: Fact[],
  opts: { json?: boolean; style?: Style } = {},
): string[] {
  const s = opts.style ?? plain;
  if (opts.json) return [JSON.stringify(facts, null, 2)];
  if (facts.length === 0) return [s.dim('No facts found.')];

  const lines = [s.bold(`Facts (${facts.length})`), ''];
  for (const f of facts.slice(0, ROW_CAP)) {
    lines.push(`  ${s.cyan(f.e.padEnd(24))} ${s.dim(f.a.padEnd(20))} ${f.v}`);
  }
  if (facts.length > ROW_CAP) lines.push(s.dim(`  … +${facts.length - ROW_CAP} more`));
  return lines;
}

export function formatLinkList(
  links: Link[],
  opts: { json?: boolean; style?: Style } = {},
): string[] {
  const s = opts.style ?? plain;
  if (opts.json) return [JSON.stringify(links, null, 2)];
  if (links.length === 0) return [s.dim('No links found.')];

  const lines = [s.bold(`Links (${links.length})`), ''];
  for (const l of links.slice(0, ROW_CAP)) {
    lines.push(`  ${s.cyan(l.e1)} —[${s.dim(l.a)}]→ ${s.cyan(l.e2)}`);
  }
  if (links.length > ROW_CAP) lines.push(s.dim(`  … +${links.length - ROW_CAP} more`));
  return lines;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function formatQueryResult(
  result: QueryResult,
  opts: { json?: boolean; style?: Style } = {},
): string[] {
  const s = opts.style ?? plain;
  if (opts.json) return [JSON.stringify(result.bindings, null, 2)];
  if (result.count === 0) return [s.dim('No results.')];

  const cols =
    result.bindings.length > 0 ? Object.keys(result.bindings[0]) : [];
  const lines = [
    s.bold(cols.map((c) => `?${c}`).join('\t')),
    s.dim('─'.repeat(cols.length * 20)),
  ];
  for (const row of result.bindings) {
    lines.push(cols.map((c) => String(row[c] ?? '')).join('\t'));
  }
  lines.push(
    '',
    s.dim(
      `${result.count} result(s) in ${result.executionTime.toFixed(1)}ms`,
    ),
  );
  return lines;
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

export function formatIssueStatus(status: string | undefined, s: Style = plain): string {
  switch (status) {
    case 'backlog':
      return s.gray('backlog');
    case 'queue':
      return s.blue('queue');
    case 'in_progress':
      return s.yellow('in_progress');
    case 'paused':
      return s.magenta('paused');
    case 'closed':
      return s.green('closed');
    default:
      return s.dim(status ?? 'unknown');
  }
}

export function formatPriority(p: string | undefined, s: Style = plain): string {
  switch (p) {
    case 'critical':
      return s.red('critical');
    case 'high':
      return s.yellow('high');
    case 'medium':
      return s.cyan('medium');
    case 'low':
      return s.dim('low');
    default:
      return s.dim(p ?? '');
  }
}

export function formatCriterionStatus(status: string | undefined, s: Style = plain): string {
  switch (status) {
    case 'passed':
      return s.green('✓ passed');
    case 'failed':
      return s.red('✗ failed');
    case 'pending':
      return s.dim('○ pending');
    default:
      return s.dim(status ?? 'pending');
  }
}

function formatRowTail(issue: IssueInfo, s: Style): string {
  const parts: string[] = [];
  if (issue.labels?.length) parts.push(s.dim(` [${issue.labels.join(',')}]`));
  if (issue.assignee) parts.push(s.dim(` → ${issue.assignee}`));
  if (issue.claimedLaneId) parts.push(s.dim(` ⤷ ${issue.claimedLaneId}`));
  if (issue.isBlocked) parts.push(s.yellow(' 🔒 blocked'));
  if (issue.criteria?.length) {
    const passed = issue.criteria.filter((c) => c.status === 'passed').length;
    parts.push(s.dim(` (${passed}/${issue.criteria.length} AC)`));
  }
  return parts.join('');
}

/** The `issue list --json` shape (agent contract: stable, color-free). */
export function issueToJson(i: IssueInfo): Record<string, unknown> {
  return {
    id: i.id,
    title: i.title ?? null,
    status: i.status ?? null,
    priority: i.priority ?? null,
    labels: i.labels ?? [],
    assignee: i.assignee ?? null,
    parentId: i.parentId ?? null,
    isBlocked: i.isBlocked,
    blockedBy: i.blockedBy ?? [],
    startedAt: i.startedAt ?? null,
    createdAt: i.createdAt ?? null,
    closedAt: i.closedAt ?? null,
    criteria: (i.criteria ?? []).map((c) => ({
      id: c.id,
      status: c.status ?? null,
      description: c.description ?? null,
    })),
  };
}

/** Kanban: one column per status (backlog → closed), issues listed inside. */
function kanbanLines(groups: IssueGroup[], s: Style): string[] {
  const byStatus = new Map<string, IssueInfo[]>();
  for (const issue of groups.flatMap((g) => g.rows.map((r) => r.issue))) {
    const status = issue.status ?? 'unknown';
    if (!byStatus.has(status)) byStatus.set(status, []);
    byStatus.get(status)!.push(issue);
  }
  const lines: string[] = [];
  for (const status of STATUS_ORDER.filter((st) => byStatus.has(st))) {
    const col = byStatus.get(status)!;
    lines.push('', `${formatIssueStatus(status, s)} ${s.dim(`(${col.length})`)}`);
    for (const issue of col) {
      lines.push(`  ${s.bold(issue.id)} ${issue.title ?? ''}${formatRowTail(issue, s)}`);
    }
  }
  return lines;
}

function groupedLines(groups: IssueGroup[], s: Style, table: boolean): string[] {
  const showGroup = groups.length > 1 || groups[0]?.key !== 'all';
  const lines: string[] = [];
  for (const group of groups) {
    if (showGroup) {
      lines.push('', `${s.bold(group.label)} ${s.dim(`(${group.rows.length})`)}`);
    }
    for (const row of group.rows) {
      const i = row.issue;
      const ac = table && row.ac ? s.dim(` ${row.ac.passed}/${row.ac.total} AC`) : '';
      lines.push(
        `  ${formatPriority(i.priority, s)} ${s.bold(i.id)} ${formatIssueStatus(i.status, s)} ${i.title ?? ''}${ac}${formatRowTail(i, s)}`,
      );
    }
  }
  return lines;
}

export function formatIssueList(
  issues: IssueInfo[],
  opts: {
    view?: IssueView;
    sort?: IssueSort;
    groupBy?: IssueGroupBy;
    json?: boolean;
    style?: Style;
  } = {},
): string[] {
  const s = opts.style ?? plain;
  if (opts.json) {
    return [JSON.stringify({ issues: issues.map(issueToJson) }, null, 2)];
  }
  if (issues.length === 0) return [s.dim('No issues found.')];

  const groups = buildView(issues, { sort: opts.sort, groupBy: opts.groupBy });
  if (opts.view === 'kanban') return kanbanLines(groups, s);
  return groupedLines(groups, s, opts.view === 'table');
}

export function formatIssue(
  issue: IssueInfo,
  opts: { style?: Style; now?: number } = {},
): string[] {
  const s = opts.style ?? plain;
  const rel = (iso: string) => formatRelativeTime(iso, opts.now);
  const lines = [s.bold(`${issue.id}: ${issue.title ?? '(untitled)'}`), ''];
  if (issue.description) lines.push(`  ${s.dim(issue.description)}`, '');

  lines.push(`  ${s.dim('Status:')}    ${formatIssueStatus(issue.status, s)}`);
  lines.push(`  ${s.dim('Priority:')}  ${formatPriority(issue.priority, s)}`);
  if ((issue.labels?.length ?? 0) > 0) {
    lines.push(`  ${s.dim('Labels:')}    ${issue.labels.join(', ')}`);
  }
  if (issue.assignee) lines.push(`  ${s.dim('Assignee:')}  ${issue.assignee}`);
  if (issue.parentId) lines.push(`  ${s.dim('Parent:')}    ${issue.parentId}`);
  if (issue.branchName) lines.push(`  ${s.dim('Branch:')}    ${issue.branchName}`);
  if (issue.claimedLaneId) {
    const claim = [issue.claimedLaneId];
    if (issue.claimedSessionId) claim.push(`session ${issue.claimedSessionId}`);
    if (issue.claimedAt) claim.push(rel(issue.claimedAt));
    lines.push(`  ${s.dim('Claim:')}     ${claim.join(' · ')}`);
  }
  if ((issue.blockedBy?.length ?? 0) > 0) {
    lines.push(`  ${s.dim('Blocked by:')} ${issue.blockedBy.map((b) => s.yellow(b)).join(', ')}`);
  }
  if ((issue.blocking?.length ?? 0) > 0) {
    lines.push(`  ${s.dim('Blocking:')}  ${issue.blocking.map((b) => s.cyan(b)).join(', ')}`);
  }
  if (issue.createdAt) lines.push(`  ${s.dim('Created:')}   ${rel(issue.createdAt)}`);
  if (issue.startedAt) lines.push(`  ${s.dim('Started:')}   ${rel(issue.startedAt)}`);
  if (issue.closedAt) lines.push(`  ${s.dim('Closed:')}    ${rel(issue.closedAt)}`);

  if ((issue.criteria?.length ?? 0) > 0) {
    lines.push('', `  ${s.bold('Acceptance Criteria:')}`);
    for (const c of issue.criteria) {
      const cmd = c.command ? s.dim(` (${c.command})`) : '';
      lines.push(`    ${formatCriterionStatus(c.status, s)} ${c.description ?? c.id}${cmd}`);
    }
  }
  return lines;
}
