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
