/**
 * Budgeted agent context pack assembler (TRL-127).
 *
 * @module trellis/context
 * @see docs/specs/context-pack-v0.md
 */

import type { TrellisVcsEngine } from '../engine.js';
import { parseMarkdownRefs } from '../links/parser.js';
import { issueRefRegex, issuePrefixSet } from '../vcs/issue-prefix.js';
import {
  findWaitingOnYou,
  getActiveContext,
} from '../protocol/whereami.js';
import type {
  ContextPack,
  ContextPackFocus,
  ContextPackOptions,
  ContextPackRef,
  ContextPackWaiting,
  ContextVantage,
} from './types.js';
import { ContextPackFocusError } from './types.js';

const DEFAULT_BUDGET = 4000;
const AC_DESC_MAX = 80;
const PREVIEW_MAX = 80;
const REF_SUMMARY_MAX = 120;
const TITLE_MAX = 120;

const CAP = {
  waitingOnYou: 5,
  decisions: 5,
  links: 12,
  policyRefs: 4,
} as const;

export function estimateTokens(serialized: string): number {
  return Math.ceil(serialized.length / 4);
}

export function serializePack(pack: ContextPack): string {
  return JSON.stringify(pack);
}

function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function resolveFocusIssueId(
  engine: TrellisVcsEngine,
  vantage: ContextVantage,
  issueId?: string,
): string | null {
  if (issueId) {
    const issue = engine.getIssue(issueId);
    if (!issue) {
      throw new ContextPackFocusError(`Issue not found: ${issueId}`);
    }
    return issue.id;
  }

  const active = engine
    .listIssues({ status: 'in_progress' })
    .filter((i) => !i.labels.includes('message') && !i.labels.includes('decision'));

  if (active.length === 1) return active[0].id;

  if (vantage === 'boot') {
    return null;
  }

  if (active.length === 0) {
    throw new ContextPackFocusError(
      `vantage '${vantage}' requires --issue when no in_progress issue is unique`,
    );
  }
  throw new ContextPackFocusError(
    `vantage '${vantage}' requires --issue when ${active.length} in_progress issues exist`,
  );
}

function buildFocus(
  engine: TrellisVcsEngine,
  issueId: string,
): ContextPackFocus {
  const issue = engine.getIssue(issueId)!;
  return {
    issueId: issue.id,
    title: clip(issue.title ?? '(untitled)', TITLE_MAX),
    status: issue.status ?? 'unknown',
    priority: issue.priority,
    labels: issue.labels.length ? [...issue.labels] : undefined,
    ac: issue.criteria.map((c) => ({
      description: clip(c.description ?? '', AC_DESC_MAX),
      status: c.status ?? 'pending',
    })),
  };
}

function buildWaiting(engine: TrellisVcsEngine): ContextPackWaiting[] {
  return findWaitingOnYou(engine)
    .slice(0, CAP.waitingOnYou)
    .map(({ issue, envelope }) => ({
      issueId: issue.id,
      from: envelope.from,
      to: envelope.to,
      status: envelope.status,
      re: envelope.re,
      preview: clip(
        (envelope.body ?? '').split('\n')[0] || issue.title || '',
        PREVIEW_MAX,
      ),
    }));
}

function buildMilestone(
  engine: TrellisVcsEngine,
): ContextPack['milestone'] {
  const milestones = engine.listMilestones();
  if (milestones.length === 0) return null;
  // listMilestones order is newest-first in CLI; confirm by sorting createdAt
  const sorted = [...milestones].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
  const m = sorted[0];
  return {
    id: m.id,
    message: clip(m.message ?? '', REF_SUMMARY_MAX),
    at: m.createdAt ?? '',
  };
}

function buildDecisions(
  engine: TrellisVcsEngine,
  focusId: string | null,
  vantage: ContextVantage,
): ContextPackRef[] {
  if (!focusId) return [];

  const entityKeys = [focusId, `issue:${focusId}`];
  let decisions = entityKeys.flatMap((k) => engine.getDecisionChain(k));

  // Dedupe by id
  const seen = new Set<string>();
  decisions = decisions.filter((d) => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });

  if (vantage === 'review') {
    // Prefer chronological for review; chain is already chronological — take last N
    decisions = decisions.slice(-CAP.decisions);
  } else {
    decisions = [...decisions].reverse().slice(0, CAP.decisions);
  }

  return decisions.map((d) => ({
    kind: 'decision' as const,
    id: d.id,
    summary: clip(
      d.rationale ?? d.outputSummary ?? d.toolName ?? '',
      REF_SUMMARY_MAX,
    ),
  }));
}

function buildLinks(
  engine: TrellisVcsEngine,
  focusId: string | null,
): ContextPackRef[] {
  if (!focusId) return [];
  const issue = engine.getIssue(focusId);
  if (!issue?.description) return [];

  const prefixes = issuePrefixSet(engine.getRootPath());
  const refs = parseMarkdownRefs(
    issue.description,
    `issue:${focusId}`,
    prefixes,
  );
  const out: ContextPackRef[] = [];
  const seen = new Set<string>();

  for (const ref of refs) {
    if (out.length >= CAP.links) break;
    const id = ref.anchor ? `${ref.target}#${ref.anchor}` : ref.target;
    if (seen.has(id)) continue;
    seen.add(id);

    let kind: ContextPackRef['kind'] = 'entity';
    if (ref.namespace === 'issue' || issueRefRegex(prefixes).test(ref.target)) {
      kind = 'issue';
    } else if (
      ref.namespace === 'file' ||
      /\.[a-z0-9]+$/i.test(ref.target) ||
      ref.target.includes('/')
    ) {
      kind = 'file';
    }

    out.push({
      kind,
      id,
      summary: ref.alias ? clip(ref.alias, REF_SUMMARY_MAX) : undefined,
    });
  }

  return out;
}

function buildReviewProtocolLinks(
  engine: TrellisVcsEngine,
  focusId: string,
): ContextPackRef[] {
  const children = engine.listIssues({ parentId: focusId }).filter((i) => {
    if (i.status === 'closed') return false;
    if (!i.labels.includes('message') && !i.labels.includes('decision')) {
      return false;
    }
    const desc = i.description ?? '';
    return (
      /\bstatus:\s*REJECT\b/i.test(desc) ||
      /\bstatus:\s*CLARIFY\b/i.test(desc) ||
      /\bREJECT\b/.test(i.title ?? '') ||
      /\bCLARIFY\b/.test(i.title ?? '')
    );
  });

  return children.slice(0, CAP.links).map((i) => ({
    kind: 'issue' as const,
    id: i.id,
    summary: clip(i.title ?? '', REF_SUMMARY_MAX),
  }));
}

/**
 * Drop lowest-priority fields until estimatedTokens <= budget.
 * Priority (keep high → drop low): core → waiting → ac → milestone →
 * decisions → links → policyRefs → labels/long titles.
 */
export function clampPackToBudget(
  pack: ContextPack,
  budgetTokens: number,
): ContextPack {
  let current: ContextPack = {
    ...pack,
    budgetTokens,
    estimatedTokens: estimateTokens(serializePack(pack)),
    truncated: pack.truncated,
  };

  if (current.estimatedTokens <= budgetTokens) {
    return current;
  }

  const mark = (): void => {
    current = {
      ...current,
      truncated: true,
      estimatedTokens: estimateTokens(serializePack(current)),
    };
  };

  // 8. Strip labels / shorten title
  if (current.focus) {
    current = {
      ...current,
      focus: {
        ...current.focus,
        labels: undefined,
        title: clip(current.focus.title, 40),
      },
    };
    mark();
    if (current.estimatedTokens <= budgetTokens) return current;
  }

  // 7. policyRefs
  if (current.policyRefs.length) {
    current = { ...current, policyRefs: [] };
    mark();
    if (current.estimatedTokens <= budgetTokens) return current;
  }

  // 6. links — drop from end
  while (
    current.links.length > 0 &&
    current.estimatedTokens > budgetTokens
  ) {
    current = { ...current, links: current.links.slice(0, -1) };
    mark();
  }
  if (current.estimatedTokens <= budgetTokens) return current;

  // 5. decisions
  while (
    current.decisions.length > 0 &&
    current.estimatedTokens > budgetTokens
  ) {
    current = { ...current, decisions: current.decisions.slice(0, -1) };
    mark();
  }
  if (current.estimatedTokens <= budgetTokens) return current;

  // 4. milestone
  if (current.milestone) {
    current = { ...current, milestone: null };
    mark();
    if (current.estimatedTokens <= budgetTokens) return current;
  }

  // 3. focus.ac — drop from end
  while (
    current.focus &&
    current.focus.ac.length > 0 &&
    current.estimatedTokens > budgetTokens
  ) {
    current = {
      ...current,
      focus: {
        ...current.focus,
        ac: current.focus.ac.slice(0, -1),
      },
    };
    mark();
  }
  if (current.estimatedTokens <= budgetTokens) return current;

  // 2. waitingOnYou
  while (
    current.waitingOnYou.length > 0 &&
    current.estimatedTokens > budgetTokens
  ) {
    current = {
      ...current,
      waitingOnYou: current.waitingOnYou.slice(0, -1),
    };
    mark();
  }
  if (current.estimatedTokens <= budgetTokens) return current;

  // Last resort: drop focus body, keep issueId/title/status only
  if (current.focus) {
    current = {
      ...current,
      focus: {
        issueId: current.focus.issueId,
        title: clip(current.focus.title, 24),
        status: current.focus.status,
        ac: [],
      },
      decisions: [],
      links: [],
    };
    mark();
  }

  // If still over (pathological tiny budget), truncate title further
  while (current.estimatedTokens > budgetTokens && current.focus) {
    const t = current.focus.title;
    if (t.length <= 1) break;
    current = {
      ...current,
      focus: { ...current.focus, title: t.slice(0, Math.max(1, t.length - 8)) },
    };
    mark();
  }

  return current;
}

export function assembleContextPack(
  engine: TrellisVcsEngine,
  opts: ContextPackOptions,
): ContextPack {
  const budgetTokens = opts.budgetTokens ?? DEFAULT_BUDGET;
  const vantage: ContextVantage = opts.vantage ?? 'boot';
  const rootPath = opts.rootPath;

  const focusId = resolveFocusIssueId(engine, vantage, opts.issueId);
  const active = getActiveContext(engine, rootPath);

  let links = buildLinks(engine, focusId);
  if (vantage === 'review' && focusId) {
    const protocolLinks = buildReviewProtocolLinks(engine, focusId);
    const seen = new Set(links.map((l) => l.id));
    for (const p of protocolLinks) {
      if (seen.has(p.id)) continue;
      links.push(p);
      if (links.length >= CAP.links) break;
    }
  }

  const raw: ContextPack = {
    version: 1,
    vantage,
    budgetTokens,
    estimatedTokens: 0,
    truncated: false,
    generatedAt: new Date().toISOString(),
    lane: {
      id: active.laneId ?? null,
      worktreePath: active.worktreePath ?? null,
      editRoot: active.editRoot,
    },
    focus: focusId ? buildFocus(engine, focusId) : null,
    waitingOnYou: buildWaiting(engine),
    milestone: buildMilestone(engine),
    decisions: buildDecisions(engine, focusId, vantage),
    links,
    policyRefs: [],
  };

  // Mark truncated if we already clipped AC descriptions etc.
  if (
    focusId &&
    engine
      .getIssue(focusId)!
      .criteria.some((c) => (c.description?.length ?? 0) > AC_DESC_MAX)
  ) {
    raw.truncated = true;
  }

  return clampPackToBudget(raw, budgetTokens);
}

/** Compact markdown-ish text for hooks (same clamp — pack already budgeted). */
export function formatContextPackText(pack: ContextPack): string {
  const lines: string[] = [
    `Trellis context pack v${pack.version}`,
    `vantage: ${pack.vantage} · budget: ${pack.budgetTokens} · ~${pack.estimatedTokens} tokens${pack.truncated ? ' · truncated' : ''}`,
    `generated: ${pack.generatedAt}`,
    '',
    '## lane',
    `id: ${pack.lane.id ?? '(none)'}`,
    `editRoot: ${pack.lane.editRoot}`,
  ];
  if (pack.lane.worktreePath) {
    lines.push(`worktree: ${pack.lane.worktreePath}`);
  }

  lines.push('', '## focus');
  if (!pack.focus) {
    lines.push('(none)');
  } else {
    lines.push(
      `${pack.focus.issueId} · ${pack.focus.title} [${pack.focus.status}]`,
    );
    if (pack.focus.priority) lines.push(`priority: ${pack.focus.priority}`);
    for (const ac of pack.focus.ac) {
      lines.push(`  - [${ac.status}] ${ac.description}`);
    }
  }

  lines.push('', '## waitingOnYou');
  if (pack.waitingOnYou.length === 0) {
    lines.push('(none)');
  } else {
    for (const w of pack.waitingOnYou) {
      lines.push(
        `${w.issueId} · ${w.status} · ${w.from}→${w.to} · re:${w.re}`,
      );
      if (w.preview) lines.push(`  ${w.preview}`);
    }
  }

  lines.push('', '## milestone');
  if (!pack.milestone) {
    lines.push('(none)');
  } else {
    lines.push(
      `${pack.milestone.id} · ${pack.milestone.message} (${pack.milestone.at})`,
    );
  }

  lines.push('', '## decisions');
  if (pack.decisions.length === 0) {
    lines.push('(none)');
  } else {
    for (const d of pack.decisions) {
      lines.push(`${d.id}${d.summary ? ` · ${d.summary}` : ''}`);
    }
  }

  lines.push('', '## links');
  if (pack.links.length === 0) {
    lines.push('(none)');
  } else {
    for (const l of pack.links) {
      lines.push(`${l.kind}:${l.id}${l.summary ? ` · ${l.summary}` : ''}`);
    }
  }

  lines.push('', '## policyRefs');
  if (pack.policyRefs.length === 0) {
    lines.push('(none)');
  } else {
    for (const p of pack.policyRefs) {
      lines.push(`${p.id}${p.summary ? ` · ${p.summary}` : ''}`);
    }
  }

  return lines.join('\n');
}
