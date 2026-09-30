/**
 * Built-in cron handlers.
 * @module trellis/plugins/cron/handlers
 */

import type { CronJobRecord, CronHandlerContext } from './types.js';

export type CronHandler = (
  job: CronJobRecord,
  ctx: CronHandlerContext,
) => Promise<unknown> | unknown;

export function createBuiltinHandlers(): Record<string, CronHandler> {
  return {
    'builtin:ping': async (job) => ({
      ping: true,
      jobId: job.id,
      at: new Date().toISOString(),
    }),

    /**
     * Feed the singleton `clock:now` fact — the Now that cadence rules join
     * against (ADR 0047). Step 1 of the scheduler→rule→dispatch pattern: the
     * scheduler asserts wall-clock into the graph; rules read it.
     */
    'builtin:clock': async (_job, ctx) => {
      const now = new Date();
      const existing = await ctx.getEntity('clock:now');
      const attrs = {
        currentTime: now.toISOString(),
        epochMs: now.getTime(),
        tickCount: Number(existing?.tickCount ?? 0) + 1,
      };
      if (existing) await ctx.updateEntity('clock:now', attrs);
      else await ctx.createEntity('clock:now', 'Clock', attrs);
      return attrs;
    },

    'builtin:counter': async (job, ctx) => {
      const payload = (job.payload ?? {}) as { targetId?: string };
      const targetId = payload.targetId;
      if (!targetId) {
        throw new Error('builtin:counter requires payload.targetId');
      }
      const entity = await ctx.getEntity(targetId);
      if (!entity) {
        throw new Error(`counter target not found: ${targetId}`);
      }
      const prev = Number(entity.count ?? 0);
      const count = Number.isFinite(prev) ? prev + 1 : 1;
      await ctx.updateEntity(targetId, { count });
      return { targetId, count };
    },
  };
}
