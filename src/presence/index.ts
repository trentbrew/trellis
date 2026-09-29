/**
 * Agent presence + liveness census (ADR 0024, ADR 0052).
 *
 * A host-facing, local-first surface — deliberately OUTSIDE the op log, so
 * liveness never pollutes milestones, the garden, or sync. Exported as a
 * package subpath (`trellis/presence`) so every projection shares one
 * generator: the CLI (`trellis who` / `trellis agents`) and, per ADR 0052 d5,
 * turtleOS / os-sandbox surfaces import these functions rather than
 * reimplementing the read.
 *
 * Note: distinct from `trellis/realtime` presence, which is multiplayer UI
 * cursors/awareness — this module is about agent sessions on a host: who is
 * working, where, with which harness and model.
 *
 * @example
 * import { readCensus, writeHeartbeat, readPresence } from 'trellis/presence';
 * const agents = await readCensus(process.cwd(), { staleMs: 5 * 60_000 });
 */

export {
  DEFAULT_STALE_MS,
  presenceDir,
  writeHeartbeat,
  clearHeartbeat,
  readPresence,
  resolveSessionId,
  type PresenceInfo,
  type ReadPresenceOpts,
} from './ledger.js';

export {
  readCensus,
  fromLedger,
  fromOpencodeDb,
  fromClaudeProjects,
  opencodeDbPath,
  claudeProjectsDir,
  isUnder,
  censusWorkLabel,
  mergeCensusAgent,
  type CensusAgent,
  type CensusOptions,
  type CensusSource,
} from './census.js';
