/**
 * Blob ladder — tier composition.
 *
 * ADR 0017: *"A `GET` miss walks up the ladder (peer/cold → hot); decay pushes
 * down."* This composes rungs into one `BlobTier` that does the walking, so
 * consumers write against a single store and never branch on which tier holds
 * what.
 *
 * Tiers are ordered **warmest first** — for a browser client that is
 * `[opfs, relay]`: try local, fall back to the network, and re-warm local on
 * the way back so the second read is free.
 *
 * @module trellis/blobs
 */
import { hashBlob, type BlobHash, type BlobTier, type BlobTierMeta } from './tier.js';

export type BlobLadderOptions = {
  name?: string;
  /**
   * Called when a tier operation fails. A ladder deliberately tolerates a
   * single failing rung — an offline relay must not break local reads — so
   * without this hook those failures are invisible.
   */
  onTierError?: (tier: string, operation: string, error: unknown) => void;
};

class BlobLadder implements BlobTier {
  readonly name: string;

  constructor(
    private readonly tiers: BlobTier[],
    private readonly options: BlobLadderOptions = {},
  ) {
    if (tiers.length === 0) {
      throw new Error('A blob ladder needs at least one tier.');
    }
    this.name = options.name ?? `ladder(${tiers.map((t) => t.name).join('→')})`;
  }

  private report(tier: string, operation: string, error: unknown): void {
    this.options.onTierError?.(tier, operation, error);
  }

  /**
   * Walk up the ladder, re-warming every colder-than-hit tier on the way back.
   *
   * Re-warm failures are reported but never fail the read: the caller has the
   * bytes, and a cache that could not be filled is a performance problem, not a
   * correctness one.
   */
  async get(hash: BlobHash): Promise<Uint8Array | null> {
    for (let index = 0; index < this.tiers.length; index += 1) {
      const tier = this.tiers[index]!;
      let found: Uint8Array | null = null;
      try {
        found = await tier.get(hash);
      } catch (err) {
        this.report(tier.name, 'get', err);
        continue;
      }
      if (!found) continue;

      for (const warmer of this.tiers.slice(0, index)) {
        try {
          await warmer.put(found);
        } catch (err) {
          this.report(warmer.name, 'rewarm', err);
        }
      }
      return found;
    }
    return null;
  }

  async has(hash: BlobHash): Promise<boolean> {
    for (const tier of this.tiers) {
      try {
        if (await tier.has(hash)) return true;
      } catch (err) {
        this.report(tier.name, 'has', err);
      }
    }
    return false;
  }

  /**
   * Write to every tier.
   *
   * ADR 0017 pins a freshly `PUT` blob until it is backed up — writing the whole
   * ladder is how a client satisfies that: the bytes exist locally *and* on the
   * relay before the put resolves. Partial failure resolves (the content is
   * stored somewhere and the address is valid) but is reported; only a total
   * failure throws.
   */
  async put(content: Uint8Array, meta?: BlobTierMeta): Promise<BlobHash> {
    const expected = await hashBlob(content);
    const failures: unknown[] = [];

    for (const tier of this.tiers) {
      try {
        const hash = await tier.put(content, meta);
        if (hash !== expected) {
          // Tiers disagreeing on an address means dedup is broken — surface it
          // rather than storing the same bytes under two names.
          throw new Error(
            `Tier ${tier.name} addressed content as ${hash}, expected ${expected}.`,
          );
        }
      } catch (err) {
        this.report(tier.name, 'put', err);
        failures.push(err);
      }
    }

    if (failures.length === this.tiers.length) {
      throw new Error(
        `Every blob tier failed to store content (${this.name}): ${String(failures[0])}`,
      );
    }
    return expected;
  }
}

/** Compose tiers into one store, warmest first. */
export function createBlobLadder(
  tiers: BlobTier[],
  options: BlobLadderOptions = {},
): BlobTier {
  return new BlobLadder(tiers, options);
}
