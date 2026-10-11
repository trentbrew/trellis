#!/usr/bin/env node
/**
 * Independent conformance validator for `.trellis` journal ops.
 *
 * Implements docs/spec/JOURNAL-FORMAT.md §3 (v1) and §6 (v2 `parents[]`).
 * Reimplemented from the spec text alone — it must not import kernel code.
 * Zero dependencies; runs on Node >= 20 or Bun.
 *
 *   node validate.mjs <journal.jsonl> [--keyring keys.json]
 *   bun  validate.mjs <journal.jsonl> [--keyring keys.json]
 */

import { createHash, createPublicKey, verify as ed25519Verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OP_HASH_RE = /^trellis:op:[0-9a-f]{64}$/;

const sha256Hex = (s) =>
  createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');

/** §3.1 — v1 preimage (built as an object literal in this exact key order). */
const preimageV1 = (op, vcs) =>
  JSON.stringify({
    kind: op.kind,
    timestamp: op.timestamp,
    agentId: op.agentId,
    previousHash: op.previousHash, // undefined => key omitted (genesis)
    vcs,
  });

/** §6 — v2 preimage: `parents` is always present (`[]` for a root). */
const preimageV2 = (op, vcs) =>
  JSON.stringify({
    v: 2,
    kind: op.kind,
    timestamp: op.timestamp,
    agentId: op.agentId,
    parents: op.parents ?? [],
    vcs,
  });

const preimage = (op, vcs) =>
  op.v === 2 ? preimageV2(op, vcs) : preimageV1(op, vcs);

/** §3.2/§6 — content hash over the full op payload, signature fields included. */
export function opHash(op) {
  return `trellis:op:${sha256Hex(preimage(op, op.vcs))}`;
}

/** §3.3 — the signature preimage: vcs minus signature fields, order preserved. */
export function bodyHash(op) {
  if (!op.vcs) return opHash(op);
  const { signature, signedBy, signedWith, ...rest } = op.vcs;
  return `trellis:op:${sha256Hex(preimage(op, rest))}`;
}

export function parseJournal(text) {
  return text
    .split('\n')
    .map((raw, i) => ({ raw: raw.trim(), line: i + 1 }))
    .filter(({ raw }) => raw.length > 0)
    .map(({ raw, line }) => {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return { __parseError: `line ${line}: ${e.message}` };
      }
    });
}

/**
 * §3.4 / §6 — the normative verification order, per op version.
 *
 * v1 ops chain linearly (`previousHash`; omitted on genesis).
 * v2 ops carry `parents[]`; every parent must appear earlier in the journal.
 * A v2 root (`parents: []`) may start a new history line anywhere.
 */
export function validateJournal(ops, keyring = {}) {
  const violations = [];
  const seen = new Set();
  let prev = null;
  let signedSeen = false;

  ops.forEach((op, i) => {
    const at = `op[${i}]`;

    if (op && typeof op === 'object' && op.__parseError) {
      violations.push(`${at}: ${op.__parseError}`);
      return;
    }
    if (!op || typeof op !== 'object') {
      violations.push(`${at}: not an object`);
      return;
    }

    if (typeof op.kind !== 'string' || typeof op.timestamp !== 'string' || typeof op.agentId !== 'string') {
      violations.push(`${at}: kind/timestamp/agentId must be strings`);
    }

    if (!OP_HASH_RE.test(op.hash ?? '')) {
      violations.push(`${at}: malformed hash`);
    } else {
      const recomputed = opHash(op);
      if (recomputed !== op.hash) {
        violations.push(`${at}: hash mismatch (recomputed ${recomputed.slice(0, 24)}…)`);
      }
    }

    if (op.v === 2) {
      if (!Array.isArray(op.parents)) {
        violations.push(`${at}: v2 op must carry parents[]`);
      } else {
        for (const p of op.parents) {
          if (!seen.has(p)) {
            violations.push(`${at}: unknown parent ${String(p).slice(0, 24)}…`);
          }
        }
      }
      if ('previousHash' in op) {
        violations.push(`${at}: v2 op must not carry previousHash`);
      }
    } else if (i === 0) {
      if ('previousHash' in op) violations.push(`${at}: genesis must omit previousHash`);
    } else if (op.previousHash !== prev?.hash) {
      violations.push(`${at}: previousHash does not chain to the previous op`);
    }

    const sig = op.vcs?.signature;
    if (sig) {
      signedSeen = true;
      const signedBy = op.vcs.signedBy;
      if (!signedBy) {
        violations.push(`${at}: signature present without signedBy`);
      } else if (!keyring[signedBy]) {
        violations.push(`${at}: unknown identity ${signedBy}`);
      } else {
        try {
          const key = createPublicKey({
            key: Buffer.from(keyring[signedBy], 'base64'),
            format: 'der',
            type: 'spki',
          });
          const ok = ed25519Verify(
            null,
            Buffer.from(bodyHash(op), 'utf8'),
            key,
            Buffer.from(sig, 'base64'),
          );
          if (!ok) violations.push(`${at}: invalid Ed25519 signature`);
        } catch (e) {
          violations.push(`${at}: signature/key decode error (${e.message})`);
        }
      }
    } else if (signedSeen) {
      violations.push(`${at}: unsigned op after first signed op`);
    }

    seen.add(op.hash);
    prev = op;
  });

  return { valid: violations.length === 0, ops: ops.length, violations };
}

// --- CLI -------------------------------------------------------------------

const isMain =
  (typeof import.meta.main === 'boolean' && import.meta.main) ||
  (typeof process.argv[1] === 'string' && fileURLToPath(import.meta.url) === process.argv[1]);

if (isMain) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const keyringIdx = args.indexOf('--keyring');
  if (!file) {
    console.error('usage: validate.mjs <journal.jsonl> [--keyring keys.json]');
    process.exit(2);
  }
  const keyring =
    keyringIdx >= 0 && args[keyringIdx + 1]
      ? JSON.parse(readFileSync(args[keyringIdx + 1], 'utf8'))
      : {};
  const result = validateJournal(parseJournal(readFileSync(file, 'utf8')), keyring);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.valid ? 0 : 1);
}
