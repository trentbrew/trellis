/**
 * ADR-shaped plan scaffold body.
 */

import { normalizeIssueId } from './paths.js';

export function buildPlanScaffoldBody(issue: {
  id: string;
  title?: string;
  description?: string;
}): string {
  const ref = normalizeIssueId(issue.id);
  const title = issue.title ?? '(untitled)';
  return `# Plan: ${issue.id} — ${title}

> **Status:** Proposed · canonical copy lives in this file after \`trellis plan capture\`.

## Context

<!-- Current state, constraints, motivation. -->

${issue.description ? `\n${issue.description.trim()}\n` : ''}

## Decision

<!-- Approach, variants held constant, chosen direction. -->

## Consequences

<!-- Tradeoffs, risks, follow-on issues, verification. -->

## Verification

<!-- How we know the plan succeeded — maps to issue AC where possible. -->

## Links

[[issue:${ref}]]
`;
}

export function inferTitleFromBody(body: string, fallback: string): string {
  const firstHeading = body.match(/^#\s+(.+)$/m);
  if (firstHeading) return firstHeading[1].trim();
  const firstLine = body.split('\n').find((l) => l.trim());
  if (firstLine && firstLine.length < 120) return firstLine.replace(/^#+\s*/, '').trim();
  return fallback;
}
