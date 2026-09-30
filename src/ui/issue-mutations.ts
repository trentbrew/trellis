/**
 * Issue writes the admin HTTP API allows — the planning subset of the issue
 * lifecycle. `issue start` (creates lanes/branches) and `issue close` (runs
 * criteria commands, removes worktrees, may push) stay CLI-only: an
 * unauthenticated localhost port should not execute shell or touch git.
 */

import type { TrellisVcsEngine } from '../engine.js';

type Args = Record<string, unknown> | undefined;
type Priority = 'critical' | 'high' | 'medium' | 'low';

/** Statuses a client may set directly; the rest have their own verbs. */
const SETTABLE_STATUS = new Set(['backlog', 'queue']);
const PRIORITIES = new Set(['critical', 'high', 'medium', 'low']);

const ACTIONS = [
  'issueCreate',
  'issueUpdate',
  'issueTriage',
  'issueReopen',
  'issueAssign',
  'issueBlock',
  'issueUnblock',
] as const;
export type IssueMutation = (typeof ACTIONS)[number];

export function isIssueMutation(action: unknown): action is IssueMutation {
  return typeof action === 'string' && (ACTIONS as readonly string[]).includes(action);
}

function str(args: Args, key: string): string | undefined {
  const value = args?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function required(args: Args, key: string): string {
  const value = str(args, key);
  if (!value) throw new Error(`${key} required`);
  return value;
}

function priority(args: Args): Priority | undefined {
  const value = str(args, 'priority');
  if (value === undefined) return undefined;
  if (!PRIORITIES.has(value)) throw new Error(`invalid priority: ${value}`);
  return value as Priority;
}

function status(args: Args): 'backlog' | 'queue' | undefined {
  const value = str(args, 'status');
  if (value === undefined) return undefined;
  if (!SETTABLE_STATUS.has(value)) {
    throw new Error(
      `status "${value}" is not settable over HTTP — use \`trellis issue start|pause|close\``,
    );
  }
  return value as 'backlog' | 'queue';
}

function labels(args: Args): string[] | undefined {
  const value = args?.labels;
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((l) => typeof l !== 'string')) {
    throw new Error('labels must be a string array');
  }
  return value as string[];
}

/** Apply one issue mutation through the engine; returns the affected issue id. */
export async function runIssueMutation(
  engine: TrellisVcsEngine,
  action: IssueMutation,
  args: Args,
): Promise<{ issueId: string }> {
  switch (action) {
    case 'issueCreate': {
      const op = await engine.createIssue(required(args, 'title'), {
        description: str(args, 'description'),
        priority: priority(args),
        labels: labels(args),
        assignee: str(args, 'assignee'),
        parentId: str(args, 'parentId'),
        status: status(args),
      });
      const issueId = (op.vcs as { issueId?: string } | undefined)?.issueId;
      if (!issueId) throw new Error('issue create returned no id');
      return { issueId };
    }
    case 'issueUpdate': {
      const id = required(args, 'id');
      const parent = args && 'parentId' in args ? (str(args, 'parentId') ?? null) : undefined;
      await engine.updateIssue(id, {
        title: str(args, 'title'),
        description: typeof args?.description === 'string' ? args.description : undefined,
        priority: priority(args),
        labels: labels(args),
        assignee: str(args, 'assignee'),
        status: status(args),
        parentId: parent,
      });
      return { issueId: id };
    }
    case 'issueTriage': {
      const id = required(args, 'id');
      await engine.triageIssue(id);
      return { issueId: id };
    }
    case 'issueReopen': {
      const id = required(args, 'id');
      await engine.reopenIssue(id);
      return { issueId: id };
    }
    case 'issueAssign': {
      const id = required(args, 'id');
      await engine.assignIssue(id, required(args, 'agentId'));
      return { issueId: id };
    }
    case 'issueBlock': {
      const id = required(args, 'id');
      await engine.blockIssue(id, required(args, 'blockedById'));
      return { issueId: id };
    }
    case 'issueUnblock': {
      const id = required(args, 'id');
      await engine.unblockIssue(id, required(args, 'blockedById'));
      return { issueId: id };
    }
  }
}
