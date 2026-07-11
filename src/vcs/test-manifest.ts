/**
 * Repo test manifest — `.trellis/tests.json`
 *
 * Suites define shell commands; issues reference suite ids on criteria.
 * Promote gates read `promote.require`.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

export interface TestSuiteDef {
  description?: string;
  command: string;
  timeoutMs?: number;
  /** When `browser`, runs via desk relay + extension instead of shell exec. */
  kind?: 'shell' | 'browser';
  /** Path relative to repo root for browser verify steps JSON. */
  stepsFile?: string;
}

/** Template for auto-attached acceptance criteria on `issue start`. */
export interface CriterionTemplate {
  description: string;
  command?: string;
  suite?: string;
}

/** Reviewer / QA ladder — suite ids for static check then e2e. */
export interface ReviewLadderConfig {
  check?: string;
  e2e?: string;
}

export interface TestManifest {
  version: number;
  defaultSuite?: string;
  suites: Record<string, TestSuiteDef>;
  promote?: { require?: string[] };
  /** Reviewer ladder: check suite then e2e suite (see resolveReviewLadder). */
  review?: ReviewLadderConfig;
  /** Base criteria added on `issue start` when the issue has none yet. */
  issueStart?: { default?: CriterionTemplate[] };
  /** Extra criteria per issue label (e.g. needs-e2e → e2e suite). */
  issueLabels?: Record<string, CriterionTemplate[]>;
}

export interface ResolvedReviewLadder {
  checkSuiteId: string;
  e2eSuiteId: string;
  check: TestSuiteDef;
  e2e: TestSuiteDef;
}

const CHECK_CMD_INFER_RE =
  /\b(pnpm\s+check|npm\s+run\s+check|svelte-check|vue-tsc)\b/i;
const E2E_CMD_INFER_RE = /\b(test:e2e|playwright)\b/i;

const MANIFEST_REL = join('.trellis', 'tests.json');
const DEFAULT_TIMEOUT_MS = 120_000;

export function testManifestPath(rootPath: string): string {
  return join(rootPath, MANIFEST_REL);
}

export function loadTestManifest(rootPath: string): TestManifest | null {
  const path = testManifestPath(rootPath);
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8')) as TestManifest;
    if (!raw?.suites || typeof raw.suites !== 'object') {
      throw new Error('tests.json: missing "suites" object');
    }
    return raw;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid ${MANIFEST_REL}: ${msg}`);
  }
}

export function requireTestManifest(rootPath: string): TestManifest {
  const manifest = loadTestManifest(rootPath);
  if (!manifest) {
    throw new Error(
      `No test manifest at ${MANIFEST_REL}. Add suites or pass an explicit command on criteria.`,
    );
  }
  return manifest;
}

export function resolveSuite(
  manifest: TestManifest,
  suiteId: string,
): TestSuiteDef {
  const suite = manifest.suites[suiteId];
  if (!suite?.command) {
    const known = Object.keys(manifest.suites).sort().join(', ') || '(none)';
    throw new Error(
      `Unknown test suite "${suiteId}". Known suites: ${known}`,
    );
  }
  return suite;
}

export function suiteTimeoutMs(suite: TestSuiteDef): number {
  return suite.timeoutMs ?? DEFAULT_TIMEOUT_MS;
}

export function listSuiteIds(manifest: TestManifest): string[] {
  return Object.keys(manifest.suites).sort();
}

/** Suites required before lane promote when --require-test is set. */
export function getPromoteRequiredSuites(manifest: TestManifest): string[] {
  const fromPromote = manifest.promote?.require?.filter(Boolean) ?? [];
  if (fromPromote.length > 0) return fromPromote;
  if (manifest.defaultSuite) return [manifest.defaultSuite];
  return [];
}

function inferCheckSuiteId(manifest: TestManifest): string | undefined {
  for (const id of listSuiteIds(manifest)) {
    const cmd = manifest.suites[id]?.command ?? '';
    if (CHECK_CMD_INFER_RE.test(cmd)) return id;
  }
  return undefined;
}

function inferE2eSuiteId(manifest: TestManifest): string | undefined {
  for (const id of listSuiteIds(manifest)) {
    const cmd = manifest.suites[id]?.command ?? '';
    if (E2E_CMD_INFER_RE.test(cmd)) return id;
  }
  return undefined;
}

/**
 * Resolve reviewer ladder suite ids from manifest.review or command heuristics.
 */
export function resolveReviewLadder(manifest: TestManifest): ResolvedReviewLadder {
  const checkSuiteId =
    manifest.review?.check ?? inferCheckSuiteId(manifest);
  const e2eSuiteId = manifest.review?.e2e ?? inferE2eSuiteId(manifest);

  if (!checkSuiteId) {
    throw new Error(
      `${MANIFEST_REL}: review.check suite missing and no check-like suite found (pnpm check, svelte-check, etc.)`,
    );
  }
  if (!e2eSuiteId) {
    throw new Error(
      `${MANIFEST_REL}: review.e2e suite missing and no e2e-like suite found (test:e2e, playwright)`,
    );
  }

  return {
    checkSuiteId,
    e2eSuiteId,
    check: resolveSuite(manifest, checkSuiteId),
    e2e: resolveSuite(manifest, e2eSuiteId),
  };
}

export function resolveCriterionCommand(
  manifest: TestManifest | null,
  criterion: { command?: string; suite?: string },
): string | undefined {
  if (criterion.command) return criterion.command;
  if (!criterion.suite) return undefined;
  if (!manifest) {
    throw new Error(
      `Criterion references suite "${criterion.suite}" but ${MANIFEST_REL} is missing`,
    );
  }
  return resolveSuite(manifest, criterion.suite).command;
}

/** Deduped criteria templates for a new issue from manifest defaults + labels. */
export function resolveIssueStartCriteria(
  manifest: TestManifest | null,
  labels: string[],
): CriterionTemplate[] {
  if (!manifest) return [];

  const seen = new Set<string>();
  const out: CriterionTemplate[] = [];

  const add = (templates: CriterionTemplate[] | undefined) => {
    if (!templates) return;
    for (const t of templates) {
      const key = `${t.suite ?? ''}\0${t.command ?? ''}\0${t.description}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
  };

  add(manifest.issueStart?.default);
  for (const label of labels) {
    add(manifest.issueLabels?.[label]);
  }
  return out;
}

export const DEFAULT_TEST_MANIFEST: TestManifest = {
  version: 1,
  defaultSuite: 'unit',
  suites: {
    unit: {
      description: 'Unit tests',
      command: 'npm test',
    },
    e2e: {
      description: 'End-to-end tests',
      command: 'npx playwright test',
      timeoutMs: 600_000,
    },
    'browser-smoke': {
      description: 'Live-tab smoke via Trellis extension',
      kind: 'browser',
      command: 'trellis browser verify browser-smoke',
      stepsFile: '.trellis/browser-suites/browser-smoke.json',
      timeoutMs: 30_000,
    },
  },
  promote: { require: ['unit'] },
  issueStart: {
    default: [{ description: 'Unit tests pass', suite: 'unit' }],
  },
  issueLabels: {
    'needs-e2e': [{ description: 'E2E suite passes', suite: 'e2e' }],
  },
  review: {
    check: 'unit',
    e2e: 'e2e',
  },
};

/** Write `.trellis/tests.json` when missing (e.g. on `trellis init`). */
export function ensureDefaultTestManifest(
  rootPath: string,
  template: TestManifest = DEFAULT_TEST_MANIFEST,
): boolean {
  const path = testManifestPath(rootPath);
  if (existsSync(path)) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(template, null, 2)}\n`, 'utf-8');
  return true;
}
