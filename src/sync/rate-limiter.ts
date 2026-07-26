/**
 * Rate Limiter for Sync Operations (TRL-336)
 *
 * Prevents DoS via message flood by limiting per-peer message frequency.
 */

export interface RateLimiterOptions {
  /** Maximum messages per window (default: 100). */
  maxMessages?: number;
  /** Window duration in ms (default: 1000). */
  windowMs?: number;
}

export interface RateLimiterState {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Token bucket rate limiter per peer.
 */
export class RateLimiter {
  private options: RateLimiterOptions;
  private peerBuckets = new Map<string, { count: number; resetTime: number }>();

  constructor(opts: RateLimiterOptions = {}) {
    this.options = {
      maxMessages: 100,
      windowMs: 1000,
      ...opts,
    };
  }

  /**
   * Check if a peer is allowed to send a message.
   */
  check(peerId: string): RateLimiterState {
    const now = Date.now();
    const bucket = this.peerBuckets.get(peerId);

    // Reset bucket if window expired
    if (!bucket || now > bucket.resetTime) {
      const resetTime = now + this.options.windowMs!;
      this.peerBuckets.set(peerId, { count: 1, resetTime });
      return { allowed: true, remaining: this.options.maxMessages! - 1, resetTime };
    }

    // Check if limit exceeded
    if (bucket.count >= this.options.maxMessages!) {
      return { allowed: false, remaining: 0, resetTime: bucket.resetTime };
    }

    // Increment count
    bucket.count++;
    return { allowed: true, remaining: this.options.maxMessages! - bucket.count, resetTime: bucket.resetTime };
  }

  /**
   * Reset a peer's rate limit bucket.
   */
  reset(peerId: string): void {
    this.peerBuckets.delete(peerId);
  }

  /**
   * Clear all peer buckets.
   */
  clear(): void {
    this.peerBuckets.clear();
  }

  /**
   * Get current state for a peer.
   */
  getState(peerId: string): RateLimiterState | null {
    const bucket = this.peerBuckets.get(peerId);
    if (!bucket) return null;

    const now = Date.now();
    if (now > bucket.resetTime) {
      return { allowed: true, remaining: this.options.maxMessages! - 1, resetTime: now + this.options.windowMs! };
    }

    return {
      allowed: bucket.count < this.options.maxMessages!,
      remaining: Math.max(0, this.options.maxMessages! - bucket.count),
      resetTime: bucket.resetTime,
    };
  }
}
