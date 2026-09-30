/**
 * builtin:clock — scheduler-fed Now fact (ADR 0019/0047, TRL-88).
 *
 * Step 1 of the scheduler→rule→dispatch pattern: the scheduler asserts wall-clock
 * into the graph so cadence rules can join against it.
 */
import { describe, expect, it } from 'vitest';
import { createBuiltinHandlers } from '../../src/plugins/cron/handlers.js';
import type {
  CronJobRecord,
  CronHandlerContext,
} from '../../src/plugins/cron/types.js';

function createCtx(): CronHandlerContext & {
  entities: Map<string, Record<string, unknown>>;
} {
  const entities = new Map<string, Record<string, unknown>>();
  return {
    entities,
    async getEntity(id) {
      return entities.get(id) ?? null;
    },
    async updateEntity(id, attrs) {
      entities.set(id, { ...(entities.get(id) ?? { id }), ...attrs });
    },
    async createEntity(id, type, attrs) {
      entities.set(id, { id, type, ...attrs });
    },
  };
}

const job = (handler: string): CronJobRecord => ({
  id: `cron:${handler}`,
  name: handler,
  enabled: true,
  intervalMs: 1000,
  handler,
});

describe('builtin:clock', () => {
  it('creates the singleton clock:now and increments tickCount', async () => {
    const ctx = createCtx();
    const clock = createBuiltinHandlers()['builtin:clock'];

    const first = (await clock(job('builtin:clock'), ctx)) as {
      currentTime: string;
      epochMs: number;
      tickCount: number;
    };
    expect(first.tickCount).toBe(1);
    expect(Number.isFinite(Date.parse(first.currentTime))).toBe(true);

    const second = (await clock(job('builtin:clock'), ctx)) as {
      tickCount: number;
    };
    expect(second.tickCount).toBe(2);

    const stored = ctx.entities.get('clock:now');
    expect(stored?.type).toBe('Clock');
    expect(stored?.tickCount).toBe(2);
    expect(typeof stored?.currentTime).toBe('string');
  });
});
