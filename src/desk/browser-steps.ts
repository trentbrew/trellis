/**
 * Load browser verify step definitions from `.trellis/browser-suites/`.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  DEFAULT_BROWSER_SMOKE_STEPS,
  type BrowserVerifyStep,
} from './browser-types.js';

export interface BrowserStepsFile {
  steps: BrowserVerifyStep[];
  target?: { urlPattern?: string };
}

export function browserSuitePath(rootPath: string, suiteId: string): string {
  return join(rootPath, '.trellis', 'browser-suites', `${suiteId}.json`);
}

export function loadBrowserSteps(
  rootPath: string,
  suiteId: string,
  stepsFile?: string,
): BrowserVerifyStep[] {
  const path = stepsFile
    ? join(rootPath, stepsFile)
    : browserSuitePath(rootPath, suiteId);

  if (!existsSync(path)) {
    if (suiteId === 'browser-smoke') return DEFAULT_BROWSER_SMOKE_STEPS;
    throw new Error(
      `Browser suite steps not found at ${path}. Add steps or use suite id browser-smoke.`,
    );
  }

  const raw = JSON.parse(readFileSync(path, 'utf-8')) as BrowserStepsFile;
  if (!Array.isArray(raw.steps) || raw.steps.length === 0) {
    throw new Error(`Invalid browser steps file ${path}: missing "steps" array`);
  }
  return raw.steps;
}
