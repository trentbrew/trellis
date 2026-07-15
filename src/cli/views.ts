/**
 * Issue list view transforms.
 *
 * Pure functions that turn IssueInfo[] into grouped/sorted rows for the
 * `trellis issue list` command. No I/O, no color — rendering is the caller's
 * job. The TUI (OpenTUI) and web clients are separate surfaces that speak
 * their own projection engines; this module owns only the plain-text/JSON CLI
 * views.
 */

import type { IssueInfo } from '../vcs/issue.js';

export type IssueView = 'list' | 'table' | 'kanban';
export type IssueSort = 'priority' | 'created' | 'started' | 'progress' | 'blocked';
export type IssueGroupBy = 'status' | 'priority' | 'label' | 'assignee';

export const STATUS_ORDER = [
  'backlog',
  'queue',
  'in_progress',
  'paused',
  'closed',
] as const;

export const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;

export interface IssueRow {
  issue: IssueInfo;
  /** Acceptance-criteria completion as `passed/total`, or null when none. */
  ac: { passed: number; total: number } | null;
}

export interface IssueGroup {
  key: string;
  label: string;
  rows: IssueRow[];
}

function acCompletion(issue: IssueInfo): { passed: number; total: number } | null {
  const total = issue.criteria?.length ?? 0;
  if (total === 0) return null;
  const passed = issue.criteria.filter((c) => c.status === 'passed').length;
  return { passed, total };
}

function toRow(issue: IssueInfo): IssueRow {
  return { issue, ac: acCompletion(issue) };
}

function priorityRank(p: string | undefined): number {
  const i = PRIORITY_ORDER.indexOf(p as (typeof PRIORITY_ORDER)[number]);
  return i === -1 ? PRIORITY_ORDER.length : i;
}

function statusRank(s: string | undefined): number {
  const i = STATUS_ORDER.indexOf(s as (typeof STATUS_ORDER)[number]);
  return i === -1 ? STATUS_ORDER.length : i;
}

function compare(a: IssueRow, b: IssueRow, sort: IssueSort): number {
  switch (sort) {
    case 'priority':
      return priorityRank(a.issue.priority) - priorityRank(b.issue.priority);
    case 'created':
      return (a.issue.createdAt ?? '').localeCompare(b.issue.createdAt ?? '');
    case 'started':
      return (a.issue.startedAt ?? '').localeCompare(b.issue.startedAt ?? '');
    case 'progress': {
      const pa = a.ac ? a.ac.passed / a.ac.total : -1;
      const pb = b.ac ? b.ac.passed / b.ac.total : -1;
      return pb - pa;
    }
    case 'blocked':
      return Number(b.issue.isBlocked) - Number(a.issue.isBlocked);
  }
}

export function sortRows(rows: IssueRow[], sort?: IssueSort): IssueRow[] {
  if (!sort) return rows;
  return [...rows].sort((a, b) => {
    const primary = compare(a, b, sort);
    if (primary !== 0) return primary;
    return (a.issue.id ?? '').localeCompare(b.issue.id ?? '');
  });
}

function groupKey(issue: IssueInfo, groupBy: IssueGroupBy): string {
  switch (groupBy) {
    case 'status':
      return issue.status ?? 'unknown';
    case 'priority':
      return issue.priority ?? 'none';
    case 'assignee':
      return issue.assignee ?? 'unassigned';
    case 'label':
      return (issue.labels?.length ?? 0) > 0 ? issue.labels.join(',') : 'untagged';
  }
}

function groupLabel(key: string, groupBy: IssueGroupBy): string {
  if (groupBy === 'assignee' && key === 'unassigned') return 'Unassigned';
  if (groupBy === 'label' && key === 'untagged') return 'Untagged';
  return key;
}

/**
 * Build ordered, sorted, grouped rows for rendering.
 * Groups are ordered sensibly (status/priority order, alpha otherwise).
 */
export function buildView(
  issues: IssueInfo[],
  opts: { sort?: IssueSort; groupBy?: IssueGroupBy } = {},
): IssueGroup[] {
  const rows = sortRows(
    issues.map((i) => toRow(i)),
    opts.sort,
  );

  if (!opts.groupBy) {
    return [{ key: 'all', label: 'all', rows }];
  }

  const map = new Map<string, IssueRow[]>();
  for (const row of rows) {
    const key = groupKey(row.issue, opts.groupBy);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }

  const keys = [...map.keys()].sort((a, b) => {
    if (opts.groupBy === 'status') return statusRank(a) - statusRank(b);
    if (opts.groupBy === 'priority') return priorityRank(a) - priorityRank(b);
    return a.localeCompare(b);
  });

  return keys.map((key) => ({
    key,
    label: groupLabel(key, opts.groupBy!),
    rows: map.get(key)!,
  }));
}
