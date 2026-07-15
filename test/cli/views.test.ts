import { describe, it, expect } from 'vitest';
import type { IssueInfo } from '../../src/vcs/issue.js';
import { buildView, STATUS_ORDER } from '../../src/cli/views.js';

function issue(partial: Partial<IssueInfo> & { id: string }): IssueInfo {
  return {
    labels: [],
    blockedBy: [],
    blocking: [],
    isBlocked: false,
    criteria: [],
    ...partial,
  } as IssueInfo;
}

describe('cli views', () => {
  const issues: IssueInfo[] = [
    issue({ id: 'TRL-1', status: 'backlog', priority: 'low' }),
    issue({ id: 'TRL-2', status: 'in_progress', priority: 'high' }),
    issue({ id: 'TRL-3', status: 'closed', priority: 'medium' }),
    issue({
      id: 'TRL-4',
      status: 'backlog',
      priority: 'critical',
      isBlocked: true,
      blockedBy: ['TRL-9'],
    }),
    issue({
      id: 'TRL-5',
      status: 'queue',
      priority: 'high',
      criteria: [
        { id: 'c1', status: 'passed' },
        { id: 'c2', status: 'failed' },
      ],
    }),
  ];

  it('sorts by priority (critical first)', () => {
    const [g] = buildView(issues, { sort: 'priority' });
    expect(g.rows.map((r) => r.issue.id)).toEqual([
      'TRL-4',
      'TRL-2',
      'TRL-5',
      'TRL-3',
      'TRL-1',
    ]);
  });

  it('sorts blocked first', () => {
    const [g] = buildView(issues, { sort: 'blocked' });
    expect(g.rows[0].issue.id).toBe('TRL-4');
    expect(g.rows[0].issue.isBlocked).toBe(true);
  });

  it('sorts by AC progress (most complete first)', () => {
    const [g] = buildView(issues, { sort: 'progress' });
    // TRL-5 has 1/2; rest have no criteria (treated as -1)
    expect(g.rows[0].issue.id).toBe('TRL-5');
  });

  it('groups by status in canonical order', () => {
    const groups = buildView(issues, { groupBy: 'status' });
    expect(groups.map((g) => g.key)).toEqual(
      STATUS_ORDER.filter((s) => issues.some((i) => i.status === s)),
    );
    const backlog = groups.find((g) => g.key === 'backlog')!;
    expect(backlog.rows.map((r) => r.issue.id)).toEqual(['TRL-1', 'TRL-4']);
  });

  it('groups by assignee with unassigned bucket', () => {
    const withAssignee = [
      ...issues,
      issue({ id: 'TRL-6', status: 'backlog', assignee: 'agent:x' }),
    ];
    const groups = buildView(withAssignee, { groupBy: 'assignee' });
    expect(groups.some((g) => g.key === 'agent:x')).toBe(true);
    expect(groups.some((g) => g.label === 'Unassigned')).toBe(true);
  });

  it('reports AC completion on rows', () => {
    const [g] = buildView(issues);
    const row5 = g.rows.find((r) => r.issue.id === 'TRL-5')!;
    expect(row5.ac).toEqual({ passed: 1, total: 2 });
    const row1 = g.rows.find((r) => r.issue.id === 'TRL-1')!;
    expect(row1.ac).toBeNull();
  });

  it('returns a single group when groupBy is omitted', () => {
    const groups = buildView(issues);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('all');
    expect(groups[0].rows).toHaveLength(issues.length);
  });
});
