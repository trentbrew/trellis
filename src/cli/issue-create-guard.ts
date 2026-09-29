/** Guardrails for `trellis issue create -t` — catch flag/help typos and subcommand mistakes. */

export const ISSUE_SUBCOMMANDS = new Set([
  'active',
  'ac',
  'ac-rm',
  'block',
  'check',
  'close',
  'create',
  'describe',
  'doc',
  'list',
  'pause',
  'reopen',
  'resume',
  'show',
  'start',
  'triage',
  'unblock',
  'update',
]);

const TYPO_TO_SUBCOMMAND: Record<string, string> = {
  actuve: 'active',
  activ: 'active',
  actve: 'active',
  lsit: 'list',
  shwo: 'show',
  creat: 'create',
  statu: 'list',
  hel: 'list',
};

export type IssueCreateTitleValidation =
  | { ok: true }
  | { ok: false; message: string };

export function validateIssueCreateTitle(title: string): IssueCreateTitleValidation {
  const trimmed = title.trim();
  if (!trimmed) {
    return {
      ok: false,
      message: 'Issue title is required. Try: trellis issue create -t "Title"',
    };
  }

  if (trimmed.startsWith('-')) {
    if (trimmed === '-h' || trimmed === '--help') {
      return {
        ok: false,
        message: 'Did you mean: trellis issue --help (or trellis issue create --help)?',
      };
    }
    return {
      ok: false,
      message: `Title cannot start with "${trimmed}". Flags are not issue titles.`,
    };
  }

  const lower = trimmed.toLowerCase();
  if (ISSUE_SUBCOMMANDS.has(lower)) {
    return {
      ok: false,
      message: `Did you mean: trellis issue ${lower} (not create a title named "${trimmed}")?`,
    };
  }

  const typo = TYPO_TO_SUBCOMMAND[lower];
  if (typo) {
    return {
      ok: false,
      message: `Did you mean: trellis issue ${typo}? (not create a title named "${trimmed}")`,
    };
  }

  if (!/\s/.test(trimmed) && trimmed.length >= 3) {
    for (const cmd of ISSUE_SUBCOMMANDS) {
      if (editDistance(lower, cmd) === 1) {
        return {
          ok: false,
          message: `Did you mean: trellis issue ${cmd}? (not create a title named "${trimmed}")`,
        };
      }
    }
  }

  return { ok: true };
}

function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}
