/**
 * Trellis Browser Core — embedded-kernel primitives for browser bundles.
 *
 * This entrypoint intentionally avoids the wider `trellis/core` barrel because
 * that surface includes Node-only agent helpers. Browser clients that embed the
 * kernel directly can import this small set without pulling in `child_process`.
 *
 * @module trellis/browser-core
 */

export { TrellisKernel } from '../core/kernel/trellis-kernel.js';
export type {
  EntityRecord,
  KernelConfig,
  MutateResult,
} from '../core/kernel/trellis-kernel.js';

export { SqlJsKernelBackend } from '../core/persist/sqljs-backend.js';
export type { SqlJsKernelBackendOptions } from '../core/persist/sqljs-backend.js';

export { parseQuery, parseRule, parseSimple, QueryEngine } from '../core/query/index.js';
export type {
  Bindings,
  DatalogRule,
  Filter,
  FilterOp,
  Literal,
  Pattern,
  Query,
  Term,
  Variable,
} from '../core/query/index.js';

export type { Atom, Fact, Link } from '../core/store/eav-store.js';
export type { KernelBackend, KernelOp, KernelOpKind } from '../core/persist/backend.js';
export { PROVENANCE } from '../core/persist/canonical-op.js';
export type { OpProvenance } from '../core/persist/canonical-op.js';
