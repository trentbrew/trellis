/**
 * Browser verify protocol — shared between desk relay, CLI, and extension.
 */

export type BrowserVerifyStep =
  | { type: 'visible'; selector: string }
  | { type: 'text'; selector: string; includes: string }
  | { type: 'noConsoleErrors' }
  | { type: 'wait'; ms: number }
  | {
      type: 'devHook';
      namespace: 'fractal' | 'lane';
      method: string;
      expect?: string | number | boolean | { equals?: unknown };
    };

export interface BrowserVerifyStepResult {
  index: number;
  step: BrowserVerifyStep;
  ok: boolean;
  message?: string;
  durationMs: number;
}

export interface BrowserVerifyRequest {
  jobId?: string;
  suiteId?: string;
  steps: BrowserVerifyStep[];
  timeoutMs?: number;
}

export interface BrowserVerifyResponse {
  ok: boolean;
  suiteId?: string;
  jobId?: string;
  tabId?: number;
  tabUrl?: string;
  steps: BrowserVerifyStepResult[];
  durationMs: number;
  error?: string;
}

export type BrowserRelayMessage =
  | { type: 'register'; role: 'extension'; version: 1 }
  | { type: 'verify:job'; jobId: string; suiteId?: string; steps: BrowserVerifyStep[] }
  | { type: 'verify:result'; jobId: string; result: BrowserVerifyResponse }
  | { type: 'ping' }
  | { type: 'pong'; extensionConnected: boolean };

export const DEFAULT_BROWSER_RELAY_PORT = 7420;
export const DEFAULT_BROWSER_RELAY_URL = `http://127.0.0.1:${DEFAULT_BROWSER_RELAY_PORT}`;

export const DEFAULT_BROWSER_SMOKE_STEPS: BrowserVerifyStep[] = [
  { type: 'visible', selector: 'body' },
  { type: 'noConsoleErrors' },
];
