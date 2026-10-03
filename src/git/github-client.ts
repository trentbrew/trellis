/**
 * GitHub REST client — thin fetch wrapper for the forge-direct bridge
 * (ADR-0036 §3, TRL-223). No SDK dependency.
 *
 * The transport is injectable (`fetchImpl`) so tests run offline against
 * fixtures — no live GitHub calls in CI.
 */

export interface GitHubUser {
  login: string;
}

export interface GitHubLabel {
  name: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  labels: Array<GitHubLabel | string>;
  user: GitHubUser | null;
  updated_at: string;
  html_url?: string;
}

export interface GitHubComment {
  id: number;
  body: string | null;
  user: GitHubUser | null;
  created_at: string;
}

export type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  statusText?: string;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

export interface GitHubClientOptions {
  /** GitHub API base (default https://api.github.com). */
  baseUrl?: string;
  /** Token; defaults to process.env.GITHUB_TOKEN. Absent → clear error on call. */
  token?: string;
  /** Injectable transport; defaults to global fetch. */
  fetchImpl?: FetchLike;
  /** Page size for list endpoints (default 100, GitHub max). */
  perPage?: number;
}

export class GitHubClient {
  private readonly baseUrl: string;
  private readonly token: string | undefined;
  private readonly fetchImpl: FetchLike;
  private readonly perPage: number;

  constructor(opts: GitHubClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? 'https://api.github.com').replace(/\/$/, '');
    this.token = opts.token ?? process.env.GITHUB_TOKEN;
    this.fetchImpl = opts.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
    this.perPage = opts.perPage ?? 100;
  }

  private headers(): Record<string, string> {
    if (!this.token) {
      throw new Error(
        'GITHUB_TOKEN is not set — refusing an unauthenticated GitHub call (set the env var or pass token)',
      );
    }
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'trellis-forge-bridge',
    };
  }

  private async getJson<T>(path: string): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, { headers: this.headers() });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`GitHub ${res.status} ${res.statusText ?? ''} for ${path}${body ? `: ${body.slice(0, 200)}` : ''}`);
    }
    return (await res.json()) as T;
  }

  /** All issues (open + closed) for a repo, paginated. */
  async listIssues(owner: string, name: string, { state = 'all' as 'all' | 'open' | 'closed' } = {}): Promise<GitHubIssue[]> {
    const out: GitHubIssue[] = [];
    for (let page = 1; ; page++) {
      const batch = await this.getJson<GitHubIssue[]>(
        `/repos/${owner}/${name}/issues?state=${state}&per_page=${this.perPage}&page=${page}`,
      );
      // GitHub returns PRs in the issues endpoint; exclude anything with pull_request.
      for (const it of batch) {
        if ((it as { pull_request?: unknown }).pull_request) continue;
        out.push(it);
      }
      if (batch.length < this.perPage) break;
    }
    return out;
  }

  /** Comments on one issue, paginated. */
  async listComments(owner: string, name: string, number: number): Promise<GitHubComment[]> {
    const out: GitHubComment[] = [];
    for (let page = 1; ; page++) {
      const batch = await this.getJson<GitHubComment[]>(
        `/repos/${owner}/${name}/issues/${number}/comments?per_page=${this.perPage}&page=${page}`,
      );
      out.push(...batch);
      if (batch.length < this.perPage) break;
    }
    return out;
  }
}

/** `owner/name` from a `--repo` argument; throws on a malformed value. */
export function parseRepoSlug(repo: string): { owner: string; name: string } {
  const m = /^([^/\s]+)\/([^/\s]+)$/.exec(repo.trim());
  if (!m) throw new Error(`--repo must be owner/name (got ${JSON.stringify(repo)})`);
  return { owner: m[1], name: m[2] };
}
