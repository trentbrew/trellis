/**
 * Graph-native cron — durable CronJob/CronRun + in-process CronScheduler.
 *
 * @module trellis/plugins/cron
 *
 * @example
 * ```ts
 * import { createCronPlugin, CronScheduler } from 'trellis/plugins/cron';
 * const plugin = createCronPlugin(kernel);
 * pluginRegistry.register(plugin);
 * ```
 */

export {
  CronJobType,
  CronRunType,
  cronOntology,
  type CronJob,
  type CronRun,
} from './ontology.js';
export {
  assertIntervalMs,
  isDue,
  leaseIsLive,
  nextRunAtFromInterval,
  MIN_INTERVAL_MS,
} from './cron-expr.js';
export { createBuiltinHandlers, type CronHandler } from './handlers.js';
export { CronScheduler, type CronSchedulerOptions } from './scheduler.js';
export {
  createCronPlugin,
  createKernelCronStore,
  createPoolCronStore,
  attachCronToPool,
  seedDemoPingJob,
  type CreateCronPluginOptions,
} from './plugin.js';
export type {
  CronJobRecord,
  CronRunRecord,
  CronRunStatus,
  CronStore,
  CronStatus,
  CronHandlerContext,
} from './types.js';
