/**
 * WebSocket Transport Security Tests (TRL-336)
 *
 * Behavioral tests for TLS enforcement, message size limits,
 * and rate limiting in the WebSocket transport layer.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketTransport } from '../../src/sync/websocket-transport.js';
import { RateLimiter } from '../../src/sync/rate-limiter.js';

describe('WebSocketTransport TLS enforcement', () => {
  let originalWebSocket: typeof WebSocket | undefined;

  beforeEach(() => {
    originalWebSocket = globalThis.WebSocket;
  });

  afterEach(() => {
    if (originalWebSocket) {
      globalThis.WebSocket = originalWebSocket;
    }
    vi.restoreAllMocks();
  });

  it('should reject ws:// connections when enforceTls is true', async () => {
    const MockWs = vi.fn(() => ({
      readyState: 1,
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      send: vi.fn(),
      close: vi.fn(),
    })) as unknown as typeof WebSocket;
    MockWs.OPEN = 1;
    globalThis.WebSocket = MockWs;

    const transport = new WebSocketTransport({
      url: 'ws://localhost:8231/sync',
      localPeerId: 'peer-1',
      enforceTls: true,
    });

    await expect(transport.connect()).rejects.toThrow(
      'TLS enforcement: ws:// not allowed in production environment. Use wss://',
    );
  });

  it('should reject ws:// connections when enforceTls defaults to true in production', async () => {
    const originalEnv = process.env.TRELLIS_SYNC_ENV;
    process.env.TRELLIS_SYNC_ENV = 'production';

    const MockWs = vi.fn(() => ({
      readyState: 1,
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      send: vi.fn(),
      close: vi.fn(),
    })) as unknown as typeof WebSocket;
    MockWs.OPEN = 1;
    globalThis.WebSocket = MockWs;

    const transport = new WebSocketTransport({
      url: 'ws://localhost:8231/sync',
      localPeerId: 'peer-1',
    });

    await expect(transport.connect()).rejects.toThrow(
      'TLS enforcement: ws:// not allowed in production environment. Use wss://',
    );

    if (originalEnv !== undefined) {
      process.env.TRELLIS_SYNC_ENV = originalEnv;
    } else {
      delete process.env.TRELLIS_SYNC_ENV;
    }
  });

  it('should allow wss:// connections when enforceTls is true', async () => {
    const mockWs = {
      readyState: 1,
      onopen: null as (() => void) | null,
      onmessage: null as ((event: { data: Buffer }) => void) | null,
      onerror: null as ((err: Error) => void) | null,
      onclose: null as (() => void) | null,
      send: vi.fn(),
      close: vi.fn(),
    };

    const MockWs = vi.fn(() => mockWs) as unknown as typeof WebSocket;
    MockWs.OPEN = 1;
    globalThis.WebSocket = MockWs;

    const transport = new WebSocketTransport({
      url: 'wss://localhost:8231/sync',
      localPeerId: 'peer-1',
      enforceTls: true,
    });

    const connectPromise = transport.connect();
    mockWs.onopen?.();
    await connectPromise;
    transport.disconnect();
  });
});

describe('WebSocketTransport message size limit', () => {
  let originalWebSocket: typeof WebSocket | undefined;

  beforeEach(() => {
    originalWebSocket = globalThis.WebSocket;
  });

  afterEach(() => {
    if (originalWebSocket) {
      globalThis.WebSocket = originalWebSocket;
    }
  });

  it('should close connection when message exceeds maxMessageSize', async () => {
    const mockWs = {
      readyState: 1,
      onopen: null as (() => void) | null,
      onmessage: null as ((event: { data: Buffer }) => void) | null,
      onerror: null as ((err: Error) => void) | null,
      onclose: null as (() => void) | null,
      send: vi.fn(),
      close: vi.fn(),
    };

    const MockWs = vi.fn(() => mockWs) as unknown as typeof WebSocket;
    MockWs.OPEN = 1;
    globalThis.WebSocket = MockWs;

    const transport = new WebSocketTransport({
      url: 'wss://localhost:8231/sync',
      localPeerId: 'peer-1',
      maxMessageSize: 100,
    });

    const connectPromise = transport.connect();
    mockWs.onopen?.();
    await connectPromise;

    const originalError = console.error;
    console.error = vi.fn();

    mockWs.onmessage?.({
      data: Buffer.alloc(200),
    } as unknown as MessageEvent);

    expect(mockWs.close).toHaveBeenCalled();

    console.error = originalError;
    transport.disconnect();
  });

  it('should allow messages within maxMessageSize', async () => {
    const mockWs = {
      readyState: 1,
      onopen: null as (() => void) | null,
      onmessage: null as ((event: { data: Buffer }) => void) | null,
      onerror: null as ((err: Error) => void) | null,
      onclose: null as (() => void) | null,
      send: vi.fn(),
      close: vi.fn(),
    };

    const MockWs = vi.fn(() => mockWs) as unknown as typeof WebSocket;
    MockWs.OPEN = 1;
    globalThis.WebSocket = MockWs;

    const transport = new WebSocketTransport({
      url: 'wss://localhost:8231/sync',
      localPeerId: 'peer-1',
      maxMessageSize: 1000,
    });

    const connectPromise = transport.connect();
    mockWs.onopen?.();
    await connectPromise;

    const handler = vi.fn();
    transport.onMessage(handler);

    mockWs.onmessage?.({
      data: Buffer.from(JSON.stringify({ type: 'ops', ops: [] })),
    } as unknown as MessageEvent);

    expect(handler).toHaveBeenCalled();
    transport.disconnect();
  });
});

describe('RateLimiter', () => {
  it('should allow messages within the rate limit', () => {
    const limiter = new RateLimiter({ maxMessages: 100, windowMs: 1000 });
    const result = limiter.check('peer-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(99);
  });

  it('should block messages exceeding the rate limit', () => {
    const limiter = new RateLimiter({ maxMessages: 3, windowMs: 1000 });
    limiter.check('peer-1');
    limiter.check('peer-1');
    limiter.check('peer-1');
    const result = limiter.check('peer-1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should track different peers independently', () => {
    const limiter = new RateLimiter({ maxMessages: 2, windowMs: 1000 });
    limiter.check('peer-1');
    limiter.check('peer-1');
    const result1 = limiter.check('peer-1');
    limiter.check('peer-2');
    const result2 = limiter.check('peer-2');
    expect(result1.allowed).toBe(false);
    expect(result2.allowed).toBe(true);
  });

  it('should reset bucket after window expires', async () => {
    const limiter = new RateLimiter({ maxMessages: 2, windowMs: 50 });
    limiter.check('peer-1');
    limiter.check('peer-1');
    const resultBefore = limiter.check('peer-1');
    expect(resultBefore.allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 60));
    const resultAfter = limiter.check('peer-1');
    expect(resultAfter.allowed).toBe(true);
  });

  it('should return rate limit state for a peer', () => {
    const limiter = new RateLimiter({ maxMessages: 2, windowMs: 1000 });
    limiter.check('peer-1');
    const state = limiter.getState('peer-1');
    expect(state).not.toBeNull();
    expect(state!.allowed).toBe(true);
    expect(state!.remaining).toBe(1);
  });

  it('should reset and clear peer buckets', () => {
    const limiter = new RateLimiter({ maxMessages: 2, windowMs: 1000 });
    limiter.check('peer-1');
    limiter.reset('peer-1');
    const state = limiter.getState('peer-1');
    expect(state).toBeNull();
  });
});