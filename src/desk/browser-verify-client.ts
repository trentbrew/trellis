/**
 * HTTP client for browser verify jobs via desk relay.
 */

import type {
  BrowserVerifyRequest,
  BrowserVerifyResponse,
  BrowserVerifyStep,
} from './browser-types.js';
import { DEFAULT_BROWSER_RELAY_URL } from './browser-types.js';

export interface RunBrowserVerifyOpts {
  relayUrl?: string;
  suiteId?: string;
  steps: BrowserVerifyStep[];
  timeoutMs?: number;
}

export async function relayHealth(
  relayUrl = DEFAULT_BROWSER_RELAY_URL,
): Promise<{ ok: boolean; extensionConnected?: boolean }> {
  try {
    const res = await fetch(`${relayUrl.replace(/\/$/, '')}/health`);
    if (!res.ok) return { ok: false };
    return (await res.json()) as { ok: boolean; extensionConnected?: boolean };
  } catch {
    return { ok: false };
  }
}

export async function runBrowserVerifyViaRelay(
  opts: RunBrowserVerifyOpts,
): Promise<BrowserVerifyResponse & { exitCode: number; output: string }> {
  const relayUrl = (opts.relayUrl ?? DEFAULT_BROWSER_RELAY_URL).replace(/\/$/, '');
  const body: BrowserVerifyRequest = {
    suiteId: opts.suiteId,
    steps: opts.steps,
    timeoutMs: opts.timeoutMs,
  };

  let res: Response;
  try {
    res = await fetch(`${relayUrl}/browser/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not reach browser relay';
    return {
      ok: false,
      suiteId: opts.suiteId,
      steps: [],
      durationMs: 0,
      error: `${message}. Start relay: trellis browser relay`,
      exitCode: 1,
      output: message,
    };
  }

  const result = (await res.json()) as BrowserVerifyResponse;
  const output = formatVerifyOutput(result);
  const exitCode = result.ok ? 0 : 1;

  if (!res.ok && !result.error) {
    result.error = `HTTP ${res.status}`;
  }

  return { ...result, exitCode, output };
}

function formatVerifyOutput(result: BrowserVerifyResponse): string {
  const lines: string[] = [];
  if (result.tabUrl) lines.push(`tab: ${result.tabUrl}`);
  if (result.error) lines.push(`error: ${result.error}`);
  for (const step of result.steps) {
    const label =
      step.step.type +
      ('selector' in step.step ? ` ${step.step.selector}` : '');
    lines.push(`${step.ok ? '✓' : '✗'} ${label}${step.message ? ` — ${step.message}` : ''}`);
  }
  lines.push(`duration: ${result.durationMs.toFixed(0)}ms`);
  return lines.join('\n');
}
