/**
 * MCP write authorization — anonymous read, authenticated write when apiKey is set.
 *
 * Deployed rooms always configure an apiKey; local `trellis db serve` without one
 * keeps dev-mode open writes.
 *
 * @module trellis/mcp
 */

import type { AuthContext } from '../server/auth.js';

export class McpAuthError extends Error {
  constructor(
    message = 'Authentication required for graph writes. Pass Authorization: Bearer <apiKey or JWT>.',
  ) {
    super(message);
    this.name = 'McpAuthError';
  }
}

export interface McpWriteAuthGate {
  auth: AuthContext;
  /** When true, mutating MCP tools require a valid bearer key or JWT. */
  requireAuthForWrites: boolean;
}

export function assertMcpWriteAuthorized(gate: McpWriteAuthGate): void {
  if (!gate.requireAuthForWrites) return;
  if (gate.auth.authenticated) return;
  throw new McpAuthError();
}
