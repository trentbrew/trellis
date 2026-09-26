/**
 * Canonical repo paths for plan artifacts.
 */

import { join } from 'path';

export function normalizeIssueId(id: string): string {
  return id.replace(/^issue:/, '').trim();
}

/** Relative path, e.g. docs/plans/TRL-334-plan.md */
export function planArtifactRelPath(issueId: string): string {
  const bare = normalizeIssueId(issueId);
  const safe = bare.replace(/[^A-Za-z0-9._-]+/g, '-');
  return join('docs', 'plans', `${safe}-plan.md`);
}

export function planArtifactAbsPath(rootPath: string, issueId: string): string {
  return join(rootPath, planArtifactRelPath(issueId));
}

export function planWikiLink(issueId: string): string {
  const rel = planArtifactRelPath(issueId).replace(/\\/g, '/');
  return `[[${rel}]]`;
}

export const PLAN_LINK_PREFIX = '**Plan:**';

export function descriptionHasPlanLink(description: string | undefined, issueId: string): boolean {
  if (!description) return false;
  const rel = planArtifactRelPath(issueId).replace(/\\/g, '/');
  return description.includes(rel) || description.includes(planWikiLink(issueId));
}

export function appendPlanLinkToDescription(
  description: string | undefined,
  issueId: string,
): string {
  if (descriptionHasPlanLink(description, issueId)) {
    return description ?? '';
  }
  const link = `${PLAN_LINK_PREFIX} ${planWikiLink(issueId)}`;
  const base = (description ?? '').trimEnd();
  return base ? `${base}\n\n${link}` : link;
}
