/**
 * Kernel middleware types.
 * Slim version inlined from trellis-core — only includes the types
 * used by the VCS layer (op middleware). Query middleware types are
 * omitted to avoid pulling in the full query engine dependency chain.
 *
 * @module trellis/core
 */

import type { KernelOp } from '../persist/backend.js';
import type { OpProvenance } from '../persist/canonical-op.js';

export type MiddlewareContext = {
  agentId?: string;
  /**
   * Op provenance for this call (ADR 0021 §2). Per-call rather than per-kernel
   * because one kernel serves multiple surfaces — a TenantPool kernel is
   * reached from both the HTTP server and the MCP room, so `origin` cannot be
   * a property of the kernel instance.
   */
  provenance?: OpProvenance;
  [key: string]: unknown;
};

export type OpMiddlewareNext = (
  op: KernelOp,
  ctx: MiddlewareContext,
) => void | Promise<void>;

export interface KernelMiddleware {
  name: string;

  /**
   * Hook into kernel operations (mutations).
   * Can throw to block the operation (e.g. for security).
   */
  handleOp?: (
    op: KernelOp,
    ctx: MiddlewareContext,
    next: OpMiddlewareNext,
  ) => void | Promise<void>;

  /**
   * Hook into kernel queries.
   * Typed loosely here to avoid importing the full query engine.
   */
  handleQuery?: (
    query: unknown,
    ctx: MiddlewareContext,
    next: (...args: any[]) => any,
  ) => any;
}
