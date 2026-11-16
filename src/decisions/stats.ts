/**
 * Decision trace rollup (TRL-61).
 *
 * Pure aggregation over Decision entities: no I/O, no clock reads except
 * `generatedAt`. The CLI supplies already-filtered, newest-first decisions.
 *
 * Metric contracts live in docs/issues/TRL-57/summary.md; keep the two in
 * sync when changing gaps, repeat runs, or classification.
 */

import { createHash } from 'node:crypto';
import type { Decision } from './types.js';

export type SummaryClass = 'error' | 'empty' | 'unknown';

export interface ClassCounts {
  error: number;
  empty: number;
  unknown: number;
}

export interface StatsGroup {
  name: string;
  decisions: number;
  tools: number | null;
  sessions: number | null;
  spanMs: number | null;
  medianGapMs: number | null;
  p90GapMs: number | null;
  repeatedRuns: number;
  maxRepeatStreak: number;
  class: ClassCounts;
}

export interface RepeatPattern {
  group: 'tool' | 'session';
  name: string;
  toolName: string;
  inputKey: string;
  count: number;
}

export interface StatsReport {
  v: 1;
  generatedAt: string;
  window: {
    since: string | null;
    until: string | null;
    limit: number | null;
  };
  totals: {
    decisions: number;
    sessions: number;
    tools: number;
    firstAt: string | null;
    lastAt: string | null;
    unknownTime: number;
    class: ClassCounts;
  };
  byTool: StatsGroup[];
  bySession: StatsGroup[];
  byDay: StatsGroup[];
  patterns: { repeats: RepeatPattern[] };
}

export interface SummarizeOptions {
  generatedAt?: string;
  since?: string | null;
  until?: string | null;
  limit?: number | null;
}

const ERROR_PATTERNS = [
  /^Error\b/,
  /^Unknown tool\b/,
  /^Not a TrellisVCS repository\b/,
  /^Failed\b/,
];

const EMPTY_PATTERNS = [
  /^No\b[\s\S]*found\.?$/,
  /^Entities \(0\)/,
  /^Found 0\b/,
  /^0 rows?\b/,
];

export function emptyClassCounts(): ClassCounts {
  return { error: 0, empty: 0, unknown: 0 };
}

/**
 * Classification is a documented heuristic: capture does not record
 * success/failure yet (TRL-58), so `unknown` is the default and the only
 * honest answer when nothing matches.
 */
export function classifySummary(summary?: string): SummaryClass {
  const text = (summary ?? '').trim();
  if (!text) return 'unknown';
  if (ERROR_PATTERNS.some((re) => re.test(text))) return 'error';
  if (EMPTY_PATTERNS.some((re) => re.test(text))) return 'empty';
  return 'unknown';
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = stableValue((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value)) ?? '';
}

/** Hash of the parsed tool input; raw args never appear in stats output. */
export function stableInputKey(input?: Record<string, unknown>): string {
  if (!input) return 'none';
  return createHash('sha256')
    .update(stableStringify(input))
    .digest('hex')
    .slice(0, 12);
}

/** Nearest-rank percentile over an ascending array. */
export function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const rank = Math.ceil(p * sorted.length);
  const index = Math.min(sorted.length, Math.max(1, rank)) - 1;
  return sorted[index];
}

export function median(sorted: number[]): number | null {
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Accepts ISO-8601 or a relative `Nd` / `Nh` window. Returns ISO-8601.
 * Throws on invalid or non-positive input so the CLI can exit 2.
 */
export function parseTimeArg(value: string, now: Date = new Date()): string {
  const text = String(value ?? '').trim();
  const relative = /^(\d+)([dh])$/i.exec(text);
  if (relative) {
    const n = Number(relative[1]);
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error(`invalid time "${value}" (use ISO-8601 or 7d/36h)`);
    }
    const ms =
      relative[2].toLowerCase() === 'd' ? n * 86_400_000 : n * 3_600_000;
    return new Date(now.getTime() - ms).toISOString();
  }
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) {
    throw new Error(`invalid time "${value}" (use ISO-8601 or 7d/36h)`);
  }
  return new Date(parsed).toISOString();
}

function dayBucket(at: number): string {
  // Always bucket by the UTC calendar day. Slicing the raw createdAt string
  // would use the producer's local date for offset-bearing timestamps.
  return new Date(at).toISOString().slice(0, 10);
}

function timeOf(decision: Decision): number | null {
  if (!decision.createdAt) return null;
  const t = Date.parse(decision.createdAt);
  return Number.isFinite(t) ? t : null;
}

interface Row {
  toolName: string;
  inputKey: string;
  at: number | null;
  decision: Decision;
}

interface Acc {
  name: string;
  rows: Row[];
  /** null when the grouping dimension is the one being grouped by. */
  tools: Set<string> | null;
  sessions: Set<string> | null;
}

function makeAcc(name: string, tools: Set<string> | null, sessions: Set<string> | null): Acc {
  return { name, rows: [], tools, sessions };
}

function addTo(acc: Acc, row: Row): void {
  acc.rows.push(row);
  if (acc.tools) acc.tools.add(row.toolName);
  if (acc.sessions) acc.sessions.add(row.decision.context ?? '(none)');
}

function buildGroup(acc: Acc): StatsGroup {
  const cls = emptyClassCounts();
  for (const row of acc.rows) cls[classifySummary(row.decision.outputSummary)]++;

  const times = acc.rows
    .map((r) => r.at)
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b);

  const gaps: number[] = [];
  for (let i = 1; i < times.length; i++) gaps.push(times[i] - times[i - 1]);

  // Repeat runs follow createdAt order; untimed rows keep source order at the end.
  const ordered = [...acc.rows].sort((a, b) => {
    if (a.at === null && b.at === null) return 0;
    if (a.at === null) return 1;
    if (b.at === null) return -1;
    return a.at - b.at;
  });
  let repeatedRuns = 0;
  let maxRepeatStreak = 0;
  let streak = 0;
  let prev: Row | null = null;
  for (const row of ordered) {
    if (prev && row.toolName === prev.toolName && row.inputKey === prev.inputKey) {
      streak++;
    } else {
      if (streak > 0) repeatedRuns += streak - 1;
      maxRepeatStreak = Math.max(maxRepeatStreak, streak);
      streak = 1;
    }
    prev = row;
  }
  if (streak > 0) {
    repeatedRuns += streak - 1;
    maxRepeatStreak = Math.max(maxRepeatStreak, streak);
  }

  const spanMs = times.length >= 2 ? times[times.length - 1] - times[0] : null;

  return {
    name: acc.name,
    decisions: acc.rows.length,
    tools: acc.tools ? acc.tools.size : null,
    sessions: acc.sessions ? acc.sessions.size : null,
    spanMs,
    medianGapMs: median(gaps),
    p90GapMs: percentile(gaps, 0.9),
    repeatedRuns,
    maxRepeatStreak,
    class: cls,
  };
}

function byCountThenName(a: { decisions: number; name: string }, b: { decisions: number; name: string }): number {
  if (b.decisions !== a.decisions) return b.decisions - a.decisions;
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

/**
 * Aggregate already-filtered decisions into the v1 report shape.
 */
export function summarizeDecisions(
  decisions: Decision[],
  opts: SummarizeOptions = {},
): StatsReport {
  const allTools = new Set<string>();
  const allSessions = new Set<string>();
  const totalClass = emptyClassCounts();
  let unknownTime = 0;
  let firstAt: number | null = null;
  let lastAt: number | null = null;

  const toolAccs = new Map<string, Acc>();
  const sessionAccs = new Map<string, Acc>();
  const dayAccs = new Map<string, Acc>();

  for (const decision of decisions) {
    const toolName = decision.toolName || '(unknown)';
    const context = decision.context ?? '(none)';
    const key = stableInputKey(decision.input);
    const at = timeOf(decision);

    allTools.add(toolName);
    allSessions.add(context);
    totalClass[classifySummary(decision.outputSummary)]++;
    if (at === null) {
      unknownTime++;
    } else {
      firstAt = firstAt === null ? at : Math.min(firstAt, at);
      lastAt = lastAt === null ? at : Math.max(lastAt, at);
    }

    const row: Row = { toolName, inputKey: key, at, decision };

    const toolAcc = toolAccs.get(toolName) ?? makeAcc(toolName, null, new Set());
    addTo(toolAcc, row);
    toolAccs.set(toolName, toolAcc);

    const sessionAcc =
      sessionAccs.get(context) ?? makeAcc(context, new Set(), null);
    addTo(sessionAcc, row);
    sessionAccs.set(context, sessionAcc);

    if (decision.createdAt && at !== null) {
      const day = dayBucket(at);
      const dayAcc = dayAccs.get(day) ?? makeAcc(day, new Set(), new Set());
      addTo(dayAcc, row);
      dayAccs.set(day, dayAcc);
    }
  }

  const byTool = [...toolAccs.values()]
    .map(buildGroup)
    .sort(byCountThenName);
  const bySession = [...sessionAccs.values()]
    .map(buildGroup)
    .sort(byCountThenName);
  const byDay = [...dayAccs.values()]
    .map(buildGroup)
    .sort((a, b) => (a.name < b.name ? 1 : a.name > b.name ? -1 : 0));

  const repeatMap = new Map<string, RepeatPattern>();
  const collect = (accs: Map<string, Acc>, group: 'tool' | 'session') => {
    for (const acc of accs.values()) {
      const counts = new Map<string, RepeatPattern>();
      for (const row of acc.rows) {
        const k = `${row.toolName}\u0000${row.inputKey}`;
        const existing = counts.get(k);
        if (existing) existing.count++;
        else {
          counts.set(k, {
            group,
            name: acc.name,
            toolName: row.toolName,
            inputKey: row.inputKey,
            count: 1,
          });
        }
      }
      for (const [k, value] of counts) {
        if (value.count > 1) repeatMap.set(`${group}\u0000${acc.name}\u0000${k}`, value);
      }
    }
  };
  collect(toolAccs, 'tool');
  collect(sessionAccs, 'session');

  const repeats = [...repeatMap.values()]
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.group !== b.group) return a.group < b.group ? -1 : 1;
      if (a.name !== b.name) return a.name < b.name ? -1 : 1;
      if (a.toolName !== b.toolName) return a.toolName < b.toolName ? -1 : 1;
      return a.inputKey < b.inputKey ? -1 : a.inputKey > b.inputKey ? 1 : 0;
    })
    .slice(0, 20);

  return {
    v: 1,
    generatedAt: opts.generatedAt ?? new Date().toISOString(),
    window: {
      since: opts.since ?? null,
      until: opts.until ?? null,
      limit: opts.limit ?? null,
    },
    totals: {
      decisions: decisions.length,
      sessions: allSessions.size,
      tools: allTools.size,
      firstAt: firstAt === null ? null : new Date(firstAt).toISOString(),
      lastAt: lastAt === null ? null : new Date(lastAt).toISOString(),
      unknownTime,
      class: totalClass,
    },
    byTool,
    bySession,
    byDay,
    patterns: { repeats },
  };
}
