#!/usr/bin/env bun
/**
 * Regenerate the journal conformance fixtures from the reference mint code.
 *
 * Run from the repo root:  bun docs/spec/conformance/make-fixtures.mjs
 *
 * Mints with the actual kernel implementation (`hashVcsOp` / `hashVcsOpV2` +
 * `signOp`), so the committed fixtures are reference-minted; the validator is
 * the independent, hand-rolled side. A fresh Ed25519 keypair is generated per
 * run, so regeneration rewrites `keys.json` and every signature — regenerate
 * only when the mint code changes (see README).
 */

import { generateKeyPairSync } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashVcsOp, hashVcsOpV2 } from '../../../src/vcs/ops.ts';
import { signOp } from '../../../src/identity/signing-middleware.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, 'fixtures');
mkdirSync(fixturesDir, { recursive: true });

const IDENTITY = 'identity:did:key:z6MkConformanceAlice';
const DEVICE = 'conformance-device-1';
const AGENT = 'agent:conformance';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const privB64 = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
const pubB64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');

/** v1 mint: linear `previousHash` chain (`op.v` absent). */
async function mint({ kind, vcs, ts, prev, signed = true }) {
  const base = { kind, timestamp: ts, agentId: AGENT, vcs };
  if (prev) base.previousHash = prev;
  const hash = await hashVcsOp(base);
  let op = { ...base, hash };
  if (signed) op = await signOp(op, privB64, IDENTITY, DEVICE);
  return op;
}

/** v2 mint: `parents[]` DAG (`v: 2`; `[]` marks a root). */
async function mintV2({ kind, vcs, ts, parents = [], signed = true }) {
  const base = { v: 2, kind, timestamp: ts, agentId: AGENT, parents, vcs };
  const hash = await hashVcsOpV2(base);
  let op = { ...base, hash };
  if (signed) op = await signOp(op, privB64, IDENTITY, DEVICE);
  return op;
}

const t = (s) => `2026-10-10T00:00:0${s}.000Z`;
const zeroHash = (fill) => `sha256:${fill.repeat(64)}`;

// linear-signed: signed genesis + two chained signed ops
const genesis = await mint({ kind: 'vcs:branchCreate', vcs: { branchName: 'main' }, ts: t(0) });
const write = await mint({
  kind: 'vcs:fileWrite',
  vcs: { path: 'notes/hello.md', contentHash: zeroHash('0'), size: 12 },
  ts: t(1),
  prev: genesis.hash,
});
const milestone = await mint({
  kind: 'vcs:milestoneCreate',
  vcs: { message: 'fixture milestone' },
  ts: t(2),
  prev: write.hash,
});
const linear = [genesis, write, milestone];

// unsigned-prefix: unsigned genesis is admissible before the first signed op
const uGenesis = await mint({ kind: 'vcs:branchCreate', vcs: { branchName: 'main' }, ts: t(0), signed: false });
const uWrite = await mint({
  kind: 'vcs:fileWrite',
  vcs: { path: 'notes/hello.md', contentHash: zeroHash('1'), size: 5 },
  ts: t(1),
  prev: uGenesis.hash,
});

// signed-then-unsigned: violation of the signing policy (§3.4.5)
const sGenesis = await mint({ kind: 'vcs:branchCreate', vcs: { branchName: 'main' }, ts: t(0) });
const sUnsigned = await mint({
  kind: 'vcs:fileWrite',
  vcs: { path: 'notes/oops.md', contentHash: zeroHash('2'), size: 1 },
  ts: t(1),
  prev: sGenesis.hash,
  signed: false,
});

// tampered-hash: payload mutated after minting — hash recompute must fail
const tampered = JSON.parse(JSON.stringify(linear));
tampered[1].vcs.size = 999;

// broken-chain: previousHash does not chain
const broken = JSON.parse(JSON.stringify(linear));
broken[2].previousHash = `trellis:op:${'f'.repeat(64)}`;

// diverged-dag (v2): two roots + a merge op with parents [rootA, rootB]
const rootA = await mintV2({ kind: 'vcs:branchCreate', vcs: { branchName: 'main' }, ts: t(0) });
const rootB = await mintV2({
  kind: 'vcs:fileWrite',
  vcs: { path: 'notes/other.md', contentHash: zeroHash('3'), size: 3 },
  ts: t(1),
  parents: [],
});
const merge = await mintV2({
  kind: 'vcs:milestoneCreate',
  vcs: { message: 'merge of two roots' },
  ts: t(2),
  parents: [rootA.hash, rootB.hash],
});

// unknown-parent (v2): a parent hash that never appears in the journal
const rootC = await mintV2({ kind: 'vcs:branchCreate', vcs: { branchName: 'main' }, ts: t(0) });
const orphan = await mintV2({
  kind: 'vcs:fileWrite',
  vcs: { path: 'notes/orphan.md', contentHash: zeroHash('4'), size: 4 },
  ts: t(1),
  parents: [`trellis:op:${'e'.repeat(64)}`],
});

const writeJsonl = (name, ops) =>
  writeFileSync(join(fixturesDir, name), ops.map((o) => JSON.stringify(o)).join('\n') + '\n');

writeJsonl('linear-signed.jsonl', linear);
writeJsonl('unsigned-prefix.jsonl', [uGenesis, uWrite]);
writeJsonl('signed-then-unsigned.jsonl', [sGenesis, sUnsigned]);
writeJsonl('tampered-hash.jsonl', tampered);
writeJsonl('broken-chain.jsonl', broken);
writeJsonl('diverged-dag.jsonl', [rootA, rootB, merge]);
writeJsonl('unknown-parent.jsonl', [rootC, orphan]);
writeFileSync(join(fixturesDir, 'keys.json'), JSON.stringify({ [IDENTITY]: pubB64 }, null, 2) + '\n');

console.log(
  JSON.stringify(
    {
      ok: true,
      identity: IDENTITY,
      device: DEVICE,
      fixtures: [
        'linear-signed.jsonl',
        'unsigned-prefix.jsonl',
        'signed-then-unsigned.jsonl',
        'tampered-hash.jsonl',
        'broken-chain.jsonl',
        'diverged-dag.jsonl',
        'unknown-parent.jsonl',
        'keys.json',
      ],
    },
    null,
    2,
  ),
);
