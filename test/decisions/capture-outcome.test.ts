import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { HookRegistry } from '../../src/decisions/hooks.js';
import { wrapToolHandler } from '../../src/decisions/auto-capture.js';
import type { DecisionInput } from '../../src/decisions/types.js';
import { summarizeDecisions } from '../../src/decisions/stats.js';
import type { Decision } from '../../src/decisions/types.js';

describe('Decision Auto-Capture outcomes (TRL-74)', () => {
  const originalLaneId = process.env.TRELLIS_LANE_ID;
  let captured: DecisionInput[];
  let hooks: HookRegistry;

  beforeEach(() => {
    captured = [];
    hooks = new HookRegistry();
    process.env.TRELLIS_LANE_ID = 'agent:executor';
  });

  afterEach(() => {
    if (originalLaneId === undefined) delete process.env.TRELLIS_LANE_ID;
    else process.env.TRELLIS_LANE_ID = originalLaneId;
  });

  function record(decision: DecisionInput): Promise<void> {
    captured.push(decision);
    return Promise.resolve();
  }

  test('a successful call records ok:true with duration and byte size', async () => {
    const wrapped = wrapToolHandler(
      'list_entities',
      async () => ({ content: [{ type: 'text', text: 'ok' }], rowCount: 3 }),
      { hooks, recorder: record },
    );

    const result = await wrapped({ type: 'issue' }, { sessionId: 'sess-1' });

    expect(result).toEqual({ content: [{ type: 'text', text: 'ok' }], rowCount: 3 });
    expect(captured).toHaveLength(1);
    const d = captured[0];
    expect(d.ok).toBe(true);
    expect(d.errorKind).toBeUndefined();
    expect(typeof d.durationMs).toBe('number');
    expect(d.durationMs).toBeGreaterThanOrEqual(0);
    expect(d.resultBytes).toBeGreaterThan(0);
    expect(d.resultRows).toBe(3);
    expect(d.sessionId).toBe('sess-1');
    expect(d.laneId).toBe('agent:executor');
    expect(d.queryShape).toBe('list_entities:issue:-:-');
  });

  test('an MCP isError:true result records ok:false, errorKind mcp_is_error, no throw', async () => {
    const wrapped = wrapToolHandler(
      'trellis_issue_create',
      async () => ({ isError: true, content: [{ type: 'text', text: 'bad input' }] }),
      { hooks, recorder: record },
    );

    const result = await wrapped({ title: 'x' });

    expect(result).toMatchObject({ isError: true });
    expect(captured).toHaveLength(1);
    expect(captured[0].ok).toBe(false);
    expect(captured[0].errorKind).toBe('mcp_is_error');
  });

  test('a thrown error is rethrown and still records ok:false, errorKind thrown', async () => {
    const wrapped = wrapToolHandler(
      'trellis_branch',
      async () => {
        throw new Error('disk full');
      },
      { hooks, recorder: record },
    );

    await expect(wrapped({})).rejects.toThrow('disk full');

    expect(captured).toHaveLength(1);
    const d = captured[0];
    expect(d.ok).toBe(false);
    expect(d.errorKind).toBe('thrown');
    expect(d.outputSummary).toContain('disk full');
    expect(typeof d.durationMs).toBe('number');
  });

  test('a fixture session of thrown + isError + retry rolls up ok=1/error=2 in stats', async () => {
    const wrapped = wrapToolHandler(
      'trellis_issue_create',
      async (params: Record<string, unknown>) => {
        if (params.attempt === 'first') throw new Error('boom');
        if (params.attempt === 'second') return { isError: true, content: [] };
        return { content: [{ type: 'text', text: 'Created TRL-1' }] };
      },
      { hooks, recorder: record },
    );

    await expect(wrapped({ attempt: 'first' })).rejects.toThrow('boom');
    await wrapped({ attempt: 'second' });
    await wrapped({ attempt: 'third' });

    expect(captured).toHaveLength(3);

    const now = Date.now();
    const decisions: Decision[] = captured.map((input, i) => ({
      id: `DEC-${i + 1}`,
      createdAt: new Date(now + i * 1000).toISOString(),
      relatedEntities: [],
      alternatives: [],
      ...input,
    }));

    const report = summarizeDecisions(decisions);
    expect(report.v).toBe(2);
    expect(report.totals.ok).toBe(1);
    expect(report.totals.error).toBe(2);
    expect(report.totals.errorKinds).toEqual({ thrown: 1, mcp_is_error: 1 });
  });
});
