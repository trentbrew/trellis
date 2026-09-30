/**
 * Operator surface (ADR 0050) — derived reads over engine state, exported for
 * any projection:
 *
 * @example
 * import { buildWip } from 'trellis/operator';
 * const snap = buildWip(engine, { days: 7, limit: 10 });
 */

export {
  buildWip,
  noteEntityAttrs,
  cycleAttrs,
  type WipSnapshot,
  type WipOptions,
  type OperatorEngine,
} from './wip.js';

export {
  buildCadence,
  type CadenceResult,
  type CadenceSignal,
  type CadenceOptions,
} from './cadence.js';
