/**
 * Typed graph tool helpers — no freeform EQL-S in agent surface.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { TrellisKernel } from '../../src/core/kernel/trellis-kernel.js';
import { BetterSqliteKernelBackend } from '../../src/core/persist/better-sqlite-backend.js';
import { AgentHarness } from '../../src/core/agents/harness.js';
import {
  entityView,
  listEntitiesFiltered,
  registerTypedGraphTools,
} from '../../src/core/agents/typed-graph-tools.js';

describe('typed graph tools', () => {
  let tmpDir: string;
  let kernel: TrellisKernel;
  let harness: AgentHarness;

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), `trellis-typed-graph--${process.pid}-${Date.now().toString(36)}`));
    kernel = new TrellisKernel({
      backend: new BetterSqliteKernelBackend(join(tmpDir, 'kernel.db')),
      agentId: 'test-agent',
    });
    kernel.boot();
    harness = new AgentHarness(kernel);
    await kernel.createEntity('proj:alpha', 'Project', { name: 'Alpha', status: 'active' });
    await kernel.createEntity('proj:beta', 'Project', { name: 'Beta', status: 'done' });
  });

  afterEach(() => {
    kernel.close();
    try {
      rmSync(tmpDir, { recursive: true });
    } catch {}
  });

  it('listEntitiesFiltered applies attribute filters', () => {
    const rows = listEntitiesFiltered(kernel, {
      type: 'Project',
      filter: { status: 'active' },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('proj:alpha');
  });

  it('entityView flattens facts', () => {
    const rec = kernel.getEntity('proj:alpha')!;
    const view = entityView(rec);
    expect(view.name).toBe('Alpha');
    expect(view.type).toBe('Project');
  });

  it('registerTypedGraphTools wires harness handlers', async () => {
    const ids = await registerTypedGraphTools(harness, kernel);
    const agent = await harness.createAgent({
      name: 'GraphReader',
      status: 'active',
      tools: [ids.listEntities, ids.getEntity],
    });
    const runId = await harness.startRun(agent.id);

    const list = await harness.invokeTool(runId, ids.listEntities, {
      type: 'Project',
      filter: { status: 'active' },
    });
    expect(list.success).toBe(true);
    expect((list.output as unknown[]).length).toBe(1);

    const one = await harness.invokeTool(runId, ids.getEntity, { id: 'proj:alpha' });
    expect(one.success).toBe(true);
    expect((one.output as { name: string }).name).toBe('Alpha');
  });
});
