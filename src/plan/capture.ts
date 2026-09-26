/**
 * Capture IDE plan artifacts into repo-durable docs/plans/ and link issues.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import type { TrellisVcsEngine } from '../engine.js';
import {
  parsePlanFrontmatter,
  serializePlanDocument,
  splitFrontmatter,
} from './frontmatter.js';
import {
  extractCodexPlanFromSession,
  resolveSourcePath,
} from './origins.js';
import {
  appendPlanLinkToDescription,
  planArtifactAbsPath,
  planArtifactRelPath,
} from './paths.js';
import { buildPlanScaffoldBody, inferTitleFromBody } from './template.js';
import type {
  CapturePlanOptions,
  CapturePlanResult,
  PlanArtifactFrontmatter,
} from './types.js';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadSourceBody(
  origin: CapturePlanOptions['origin'],
  sourcePath: string,
): string {
  if (origin === 'codex') {
    const extracted = extractCodexPlanFromSession(sourcePath);
    if (!extracted) {
      throw new Error(
        `No plan-like assistant message found in Codex session: ${sourcePath}`,
      );
    }
    return extracted;
  }
  return readFileSync(sourcePath, 'utf-8');
}

function mergeFrontmatter(
  parsed: Partial<PlanArtifactFrontmatter>,
  opts: CapturePlanOptions,
  body: string,
  sourcePath: string,
): PlanArtifactFrontmatter {
  const issue = opts.issueId.replace(/^issue:/, '').trim();
  return {
    name:
      opts.title ??
      parsed.name ??
      inferTitleFromBody(body, `Plan for ${issue}`),
    overview: parsed.overview,
    status: opts.status ?? parsed.status ?? 'proposed',
    issue,
    date: parsed.date ?? todayIsoDate(),
    depends_on: parsed.depends_on,
    todos: parsed.todos,
    isProject: parsed.isProject,
    source: {
      tool: opts.origin === 'path' ? 'path' : opts.origin,
      path: sourcePath,
      capturedAt: new Date().toISOString(),
      session: opts.session,
    },
  };
}

export function capturePlanArtifact(opts: CapturePlanOptions): CapturePlanResult {
  const sourcePath = resolveSourcePath(opts.origin, {
    rootPath: opts.rootPath,
    path: opts.sourcePath,
    session: opts.session,
    homeDir: opts.homeDir,
  });

  if (!sourcePath) {
    throw new Error(
      `Could not resolve plan source for origin '${opts.origin}'. Pass --path or --session.`,
    );
  }

  const relPath = planArtifactRelPath(opts.issueId);
  const absPath = planArtifactAbsPath(opts.rootPath, opts.issueId);

  if (existsSync(absPath) && !opts.overwrite) {
    throw new Error(
      `Plan artifact already exists: ${relPath} (pass --overwrite to replace)`,
    );
  }

  const raw = loadSourceBody(opts.origin, sourcePath);
  const split = splitFrontmatter(raw);
  const parsed = split ? parsePlanFrontmatter(split.frontmatter) : {};
  const body = split?.body ?? raw;
  const frontmatter = mergeFrontmatter(parsed, opts, body, sourcePath);
  const document = serializePlanDocument(frontmatter, body);

  if (opts.dryRun) {
    return {
      relPath,
      absPath,
      sourcePath,
      linkedIssue: opts.issueId,
      created: false,
    };
  }

  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, document, 'utf-8');

  return {
    relPath,
    absPath,
    sourcePath,
    linkedIssue: opts.issueId,
    created: true,
  };
}

export async function linkPlanToIssue(
  engine: TrellisVcsEngine,
  issueId: string,
  planRelPath?: string,
): Promise<void> {
  const issue = engine.getIssue(issueId);
  if (!issue) {
    throw new Error(`Issue not found: ${issueId}`);
  }
  const rel = planRelPath ?? planArtifactRelPath(issueId);
  const normalized = rel.replace(/\\/g, '/');
  const desc = issue.description ?? '';
  if (desc.includes(normalized)) return;
  const next = appendPlanLinkToDescription(desc, issueId);
  await engine.updateIssue(issueId, { description: next });
}

export function scaffoldPlanArtifact(
  rootPath: string,
  issue: { id: string; title?: string; description?: string },
  overwrite = false,
): string {
  const absPath = planArtifactAbsPath(rootPath, issue.id);
  if (existsSync(absPath) && !overwrite) {
    throw new Error(`Plan artifact already exists: ${planArtifactRelPath(issue.id)}`);
  }
  const body = buildPlanScaffoldBody(issue);
  const fm: PlanArtifactFrontmatter = {
    name: issue.title ?? `Plan for ${issue.id}`,
    status: 'proposed',
    issue: issue.id.replace(/^issue:/, ''),
    date: todayIsoDate(),
  };
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, serializePlanDocument(fm, body), 'utf-8');
  return absPath;
}
