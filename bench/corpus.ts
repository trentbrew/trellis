import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import type { VcsOp } from '../src/vcs/types.js';

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic synthetic op corpus shaped like a small agent repo:
 * previousHash chain, per-op vcs payload, bounded repeating file set.
 */
export function mkCorpus(depth: number, seed = 7): VcsOp[] {
  const rng = mulberry32(seed);
  const start = Date.parse('2026-01-01T00:00:00.000Z');
  const files = Array.from({ length: 32 }, (_, i) => `src/mod-${i + 1}.ts`);
  const ops: VcsOp[] = [];
  let prev: string | undefined;

  for (let i = 0; i < depth; i++) {
    const filePath = files[Math.floor(rng() * files.length)];
    const contentHash = sha256(`blob-${i}-${rng()}`);
    const timestamp = new Date(start + i * 1000).toISOString();
    const preimage = `${prev ?? ''}::${filePath}::${timestamp}::${contentHash}`;
    const hash = sha256(preimage);
    ops.push({
      hash,
      kind: 'vcs:fileModify',
      timestamp,
      agentId: 'bench-agent',
      previousHash: prev,
      vcs: { filePath, contentHash },
    });
    prev = hash;
  }

  return ops;
}

export function writeJsonl(ops: VcsOp[], path: string): void {
  writeFileSync(path, ops.map((o) => JSON.stringify(o)).join('\n') + '\n');
}