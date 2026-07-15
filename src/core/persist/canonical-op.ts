/**
 * Canonical op serialization and hashing.
 *
 * ADR 0021. The op hash was previously unverifiable: the kernel hashed the
 * caller's payload object verbatim while each backend independently
 * reconstructed a differently-shaped payload to store. Two writers, two shapes,
 * no way to recompute a hash from storage.
 *
 * This module is the single serializer. `hashKernelOp` (mint) and every
 * backend's `append()` (persist) must both go through it — neither may
 * hand-roll an object literal. That property is what makes the hash a real
 * content address rather than a unique-ish identifier.
 *
 * @module trellis/core
 */

import type { Fact, FactMeta, Link, Source } from '../store/eav-store.js';
import type { KernelOp } from './backend.js';

/**
 * Preimage version. v1 = the legacy, unrecoverable `|`-joined format; ops
 * predating this module carry no `v` and are grandfathered as opaque history
 * (their preimages cannot be reconstructed — that was the bug).
 */
export const OP_PREIMAGE_VERSION = 2;

/**
 * Op-level provenance (ADR 0021 §2, Phase B).
 *
 * The slot exists in the canonical shape from Phase A onward, normalized to
 * `null` when absent. Phase B populates it. Because both phases run the same
 * normalization, populating it later changes values but not shape — Phase-A ops
 * keep verifying, and provenance lands without a second preimage break.
 */
export interface OpProvenance {
  actorType: 'user' | 'machine' | 'ai';
  origin: 'cli' | 'sdk' | 'http' | 'mcp' | 'sync' | 'migration' | 'cron';
}

/**
 * Per-surface provenance defaults (ADR 0021 §2).
 *
 * `origin` is genuinely knowable — it is the transport the op arrived on.
 * `actorType` is an *assertion by the minting process*, not a proof; binding it
 * to a device key is ADR 0020's territory (see ADR 0021 "Deferred"). Treat
 * these as best-available claims:
 *
 * - `mcp` ⇒ `ai` — MCP is the agent tool protocol; the caller is an agent.
 * - `agent` ⇒ `ai` over `origin: 'sdk'` — an in-process AI agent calling the
 *   kernel directly (the harness, plan execution, agent memory). Keyed by
 *   actor rather than transport because `sdk` is the transport and `ai` is the
 *   part that carries information.
 * - `cli` ⇒ `user` — a person ran a command. Note this is the weakest claim
 *   here: agents shell out to the CLI too, and nothing distinguishes them.
 * - everything else ⇒ `machine` — the honest "a program did this, we do not
 *   know on whose behalf".
 */
export const PROVENANCE = {
  cli: { actorType: 'user', origin: 'cli' },
  http: { actorType: 'machine', origin: 'http' },
  mcp: { actorType: 'ai', origin: 'mcp' },
  sdk: { actorType: 'machine', origin: 'sdk' },
  agent: { actorType: 'ai', origin: 'sdk' },
  sync: { actorType: 'machine', origin: 'sync' },
  migration: { actorType: 'machine', origin: 'migration' },
  cron: { actorType: 'machine', origin: 'cron' },
} as const satisfies Record<string, OpProvenance>;

/** The caller-supplied body of a mutation, before normalization. */
export interface OpPayloadInput {
  facts?: Fact[];
  links?: Link[];
  deleteFacts?: Fact[];
  deleteLinks?: Link[];
  provenance?: OpProvenance;
}

/**
 * Canonical body — what lands in the `payload` column and what the preimage
 * embeds. Every key is always present, in this fixed order.
 *
 * `v` is omitted entirely for legacy ops (see `toCanonicalBody`), since its
 * absence is what marks an op as v1.
 */
interface CanonicalBody {
  v?: number;
  facts: Fact[];
  links: Link[];
  deleteFacts: Fact[];
  deleteLinks: Link[];
  provenance: OpProvenance | null;
}

/**
 * Rebuild a fact with fixed key order; caller key order must not affect the
 * digest. `meta` (ADR 0021 §2) rides inside `facts[]`, so value-level
 * provenance is covered by the hash for free.
 */
function canonicalFact(f: Fact): Fact {
  const out: Fact = { e: f.e, a: f.a, v: f.v };
  if (f.meta !== undefined) out.meta = canonicalFactMeta(f.meta);
  return out;
}

/** Fixed key order for value-level provenance, including nested sources. */
function canonicalFactMeta(m: FactMeta): FactMeta {
  const out: FactMeta = {};
  if (m.confidence !== undefined) out.confidence = m.confidence;
  if (m.dataTypeId !== undefined) out.dataTypeId = m.dataTypeId;
  if (m.sources !== undefined) out.sources = m.sources.map(canonicalSource);
  return out;
}

function canonicalSource(s: Source): Source {
  const out: Source = {};
  if (s.authors !== undefined) out.authors = [...s.authors];
  if (s.location !== undefined) out.location = { uri: s.location.uri };
  if (s.loadedAt !== undefined) out.loadedAt = s.loadedAt;
  if (s.firstPublished !== undefined) out.firstPublished = s.firstPublished;
  if (s.lastUpdated !== undefined) out.lastUpdated = s.lastUpdated;
  return out;
}

/** Rebuild a link with fixed key order. */
function canonicalLink(l: Link): Link {
  return { e1: l.e1, a: l.a, e2: l.e2 };
}

function canonicalProvenance(p: OpProvenance | undefined): OpProvenance | null {
  if (!p) return null;
  return { actorType: p.actorType, origin: p.origin };
}

/**
 * @param version Preimage version to stamp. `undefined` marks a legacy v1 op
 *   and omits the key — relabeling a v1 op as v2 would make it claim to be
 *   verifiable and then fail, so the version always travels with the op rather
 *   than being assumed.
 */
function toCanonicalBody(
  payload: OpPayloadInput,
  version: number | undefined,
): CanonicalBody {
  return {
    ...(version !== undefined ? { v: version } : {}),
    facts: (payload.facts ?? []).map(canonicalFact),
    links: (payload.links ?? []).map(canonicalLink),
    deleteFacts: (payload.deleteFacts ?? []).map(canonicalFact),
    deleteLinks: (payload.deleteLinks ?? []).map(canonicalLink),
    provenance: canonicalProvenance(payload.provenance),
  };
}

/**
 * Serialize a newly-minted op body to its canonical JSON string.
 *
 * This exact string is what backends write to the `payload` column, so the
 * stored bytes are the hashed bytes.
 */
export function canonicalOpBody(payload: OpPayloadInput): string {
  return JSON.stringify(toCanonicalBody(payload, OP_PREIMAGE_VERSION));
}

/**
 * Serialize a persisted op's body, preserving its own preimage version.
 *
 * Used by `append()`. Ops arriving via `appendBatch` from a peer may be v1;
 * those must round-trip as v1 (opaque history), not be restamped as v2.
 */
export function canonicalOpBodyFromOp(op: KernelOp): string {
  return JSON.stringify(
    toCanonicalBody(
      {
        facts: op.facts,
        links: op.links,
        deleteFacts: op.deleteFacts,
        deleteLinks: op.deleteLinks,
        provenance: op.provenance,
      },
      op.v,
    ),
  );
}

/** Header fields that sit outside the body but inside the preimage. */
export interface OpHeader {
  kind: string;
  timestamp: string;
  agentId: string;
  previousHash?: string;
}

/**
 * The full preimage: header + body, as canonical JSON.
 *
 * Replaces the legacy `${kind}|${timestamp}|${agentId}|${previousHash}|${payload}`
 * join, which was ambiguous — nothing constrained `agentId` to exclude `|`, so
 * `agentId="a|b", previousHash="c"` and `agentId="a", previousHash="b|c"`
 * produced identical preimages. JSON escaping removes the injection entirely.
 */
function canonicalPreimage(header: OpHeader, payload: OpPayloadInput): string {
  return JSON.stringify({
    v: OP_PREIMAGE_VERSION,
    kind: header.kind,
    timestamp: header.timestamp,
    agentId: header.agentId,
    previousHash: header.previousHash ?? null,
    body: toCanonicalBody(payload, OP_PREIMAGE_VERSION),
  });
}

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Compute an op's content hash from its header and caller payload (mint path). */
export async function hashKernelOp(
  header: OpHeader,
  payload: OpPayloadInput,
): Promise<string> {
  return `trellis:op:${await sha256Hex(canonicalPreimage(header, payload))}`;
}

export interface VerifyResult {
  valid: boolean;
  /** True for pre-ADR-0021 ops, whose preimages are unrecoverable by construction. */
  legacy: boolean;
}

/**
 * Recompute a persisted op's hash and compare.
 *
 * v1 ops (no `v` in the stored body) are grandfathered: reported
 * `{valid: true, legacy: true}` rather than failed, since their preimages
 * cannot be reconstructed. v2 ops must genuinely verify.
 */
export async function verifyOpHash(op: KernelOp): Promise<VerifyResult> {
  const version = (op as { v?: number }).v;
  if (version !== OP_PREIMAGE_VERSION) {
    return { valid: true, legacy: true };
  }
  const expected = await hashKernelOp(
    {
      kind: op.kind,
      timestamp: op.timestamp,
      agentId: op.agentId,
      previousHash: op.previousHash,
    },
    {
      facts: op.facts,
      links: op.links,
      deleteFacts: op.deleteFacts,
      deleteLinks: op.deleteLinks,
      provenance: (op as { provenance?: OpProvenance }).provenance,
    },
  );
  return { valid: expected === op.hash, legacy: false };
}
