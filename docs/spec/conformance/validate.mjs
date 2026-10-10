#!/usr/bin/env node
/**
 * Independent conformance validator for `.trellis` journal ops (v1).
 *
 * Reimplements docs/spec/JOURNAL-FORMAT.md §3 from the spec text alone — it
 * must not import kernel code. Zero dependencies; runs on Node >= 20 or Bun.
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

/** §3.1 — built as an object literal in this exact key order. */
const preimage = (op, vcs) =>
  JSON.stringify({
    kind: op.kind,
    timestamp: op.timestamp,
    agentId: op.agentId,
    previousHash: op.previousHash, // undefined => key omitted (genesis)
    vcs,
  });

/** §3.2 — content hash over the full op payload, signature fields included. */
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

/** §3.4 — the normative verification order. Returns { valid, ops, violations }. */
export function validateJournal(ops, keyring = {}) {
  const violations = [];
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

    if (i === 0) {
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
