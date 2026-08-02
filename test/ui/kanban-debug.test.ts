import { describe, it } from 'vitest';
import { createAdminBoardCore, syncRows, ADMIN_GROUP_FIELDS } from '../../src/ui/admin-kanban.js';
import type { AdminIssueRow } from '../../src/ui/admin-kanban.js';

const issues = (): AdminIssueRow[] => [
  { id: 'TRL-1', title: 'Alpha', status: 'backlog', priority: 'high', labels: [], laneIds: [] },
  { id: 'TRL-3', title: 'Gamma', status: 'closed', priority: 'medium', labels: ['bug'], laneIds: [] },
];

describe('debug', () => {
  it('updateRow re-buckets vs moveCard', () => {
    const core = createAdminBoardCore({ op: () => {} });
    syncRows(core, issues());
    console.log('accessor on backlog row:', ADMIN_GROUP_FIELDS[0].accessorFn!({ id: 'x', status: 'closed' }));
    const r = core.actions.updateRow('TRL-1', { status: 'closed' });
    console.log('updateRow:', r, JSON.stringify(core.state.columns.map(c => [c.id, c.cards.map(x => x.id)])));
  });
});
