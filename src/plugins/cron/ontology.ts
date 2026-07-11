/**
 * CronJob / CronRun ontology + defineType schemas.
 * @module trellis/plugins/cron/ontology
 */

import { z } from 'zod';
import { defineType, type InferType } from '../../schema/define.js';
import type { OntologySchema } from '../../core/ontology/types.js';

export const CronJobType = defineType(
  'CronJob',
  {
    name: z.string().min(1),
    enabled: z.boolean().default(true),
    intervalMs: z.number().min(500),
    handler: z.string().min(1),
    payload: z.unknown().optional(),
    nextRunAt: z.string().optional(),
    lastRunAt: z.string().optional(),
    leaseOwner: z.string().optional(),
    leaseExpiresAt: z.string().optional(),
    lastError: z.string().optional(),
    timezone: z.string().optional(),
  },
  { title: 'name', label: 'Cron Job' },
);

export const CronRunType = defineType(
  'CronRun',
  {
    jobId: z.string().min(1),
    startedAt: z.string(),
    finishedAt: z.string(),
    status: z.enum(['ok', 'error', 'skipped']),
    error: z.string().optional(),
    result: z.unknown().optional(),
  },
  { title: 'jobId', label: 'Cron Run' },
);

export type CronJob = InferType<typeof CronJobType>;
export type CronRun = InferType<typeof CronRunType>;

export const cronOntology: OntologySchema = {
  id: 'trellis:cron',
  name: 'Cron',
  description: 'Graph-native scheduled jobs (ADR 0019)',
  version: '1.0.0',
  entities: [
    {
      name: 'CronJob',
      description: 'Durable schedule definition',
      attributes: [
        { name: 'name', type: 'string', required: true },
        { name: 'enabled', type: 'boolean' },
        { name: 'intervalMs', type: 'number', required: true },
        { name: 'handler', type: 'string', required: true },
        { name: 'payload', type: 'any' },
        { name: 'nextRunAt', type: 'string' },
        { name: 'lastRunAt', type: 'string' },
        { name: 'leaseOwner', type: 'string' },
        { name: 'leaseExpiresAt', type: 'string' },
        { name: 'lastError', type: 'string' },
        { name: 'timezone', type: 'string' },
      ],
    },
    {
      name: 'CronRun',
      description: 'One execution of a CronJob',
      attributes: [
        { name: 'jobId', type: 'string', required: true },
        { name: 'startedAt', type: 'string', required: true },
        { name: 'finishedAt', type: 'string', required: true },
        { name: 'status', type: 'string', required: true },
        { name: 'error', type: 'string' },
        { name: 'result', type: 'any' },
      ],
    },
  ],
  relations: [],
};
