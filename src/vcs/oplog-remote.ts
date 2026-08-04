/**
 * Remote sprite peer for integration JSONL journals (TRL-235 / L2).
 * Bytes-only protocol — remote never runs Trellis engine or repair.
 */
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { VcsOp } from './types.js';
import {
  parseCheckpointOps,
  verifyAttestation,
  type AttestationTarget,
} from './project.js';

export interface JournalMeta {
  format: 'jsonl';
  tailHash: string;
  byteLength: number;
  lineCount: number;
}

/** One ledger hosted by a remote sprite (discovery / clone target). */
export interface RemoteRepoInfo {
  repoId: string;
  /** Owner entity id (`identity:<did>`) — ADR 0032 identity-addressed discovery. */
  owner?: string;
  /** Repo slug scoped under the owner (`{peer}/{repo}`). */
  name?: string;
  slug?: string;
  tailHash?: string;
  byteLength?: number;
  lineCount?: number;
  updatedAt?: string;
}

export interface RemotePeerConfig {
  url: string;
  repoId: string;
  name?: string;
  lastAckHash?: string;
  lastAckAt?: string;
  /** Owner entity id + repo slug (ADR 0032) — pushed so the sprite indexes identity. */
  owner?: string;
  repo?: string;
}

export interface RemoteConfigFile {
  default?: RemotePeerConfig;
  [name: string]: RemotePeerConfig | undefined;
}

export interface RemoteSecrets {
  apiKey?: string;
}

export interface HttpResponse {
  status: number;
  body: string;
}

export interface HttpTransport {
  get(url: string, headers?: Record<string, string>): Promise<HttpResponse>;
  post(
    url: string,
    body: unknown,
    headers?: Record<string, string>,
  ): Promise<HttpResponse>;
}

export interface RemoteStatus {
  local: JournalMeta | null;
  remote: JournalMeta | null;
  synced: boolean;
  diverged: boolean;
}

export interface PushResult {
  pushed: boolean;
  tailHash: string;
  previousTail?: string;
}

export interface PullResult {
  path: string;
  tailHash: string;
  lineCount: number;
}

const DEFAULT_ACK_WINDOW_MS = 24 * 60 * 60 * 1000;

export function defaultFetchTransport(): HttpTransport {
  return {
    async get(url, headers) {
      const res = await fetch(url, { headers });
      return { status: res.status, body: await res.text() };
    },
    async post(url, body, headers) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
      });
      return { status: res.status, body: await res.text() };
    },
  };
}

export function trellisDir(rootPath: string): string {
  return join(resolve(rootPath), '.trellis');
}

export function opsPathForRoot(rootPath: string): string {
  return join(trellisDir(rootPath), 'ops.json');
}

export function configPathForRoot(rootPath: string): string {
  return join(trellisDir(rootPath), 'config.json');
}

export function secretsPathForRoot(rootPath: string): string {
  return join(trellisDir(rootPath), 'remote.json');
}

export function readRemoteSecrets(rootPath: string): RemoteSecrets {
  const p = secretsPathForRoot(rootPath);
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as RemoteSecrets;
  } catch {
    return {};
  }
}

export function writeRemoteSecrets(rootPath: string, secrets: RemoteSecrets): void {
  const dir = trellisDir(rootPath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(secretsPathForRoot(rootPath), JSON.stringify(secrets, null, 2));
}

export function readRemoteConfig(rootPath: string): RemoteConfigFile {
  const p = configPathForRoot(rootPath);
  if (!existsSync(p)) return {};
  try {
    const raw = JSON.parse(readFileSync(p, 'utf-8')) as {
      remote?: RemoteConfigFile;
    };
    return raw.remote ?? {};
  } catch {
    return {};
  }
}

/** Stable ledger identity persisted in `.trellis/config.json` (ADR 0031). */
export function readPersistedRepoId(rootPath: string): string | null {
  const p = configPathForRoot(rootPath);
  if (!existsSync(p)) return null;
  try {
    const raw = JSON.parse(readFileSync(p, 'utf-8')) as { repoId?: string };
    return raw.repoId?.trim() ? raw.repoId! : null;
  } catch {
    return null;
  }
}

export function writeRemoteConfig(
  rootPath: string,
  remote: RemoteConfigFile,
): void {
  const p = configPathForRoot(rootPath);
  let base: Record<string, unknown> = {};
  if (existsSync(p)) {
    try {
      base = JSON.parse(readFileSync(p, 'utf-8')) as Record<string, unknown>;
    } catch {
      base = {};
    }
  }
  base.remote = remote;
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(base, null, 2));
}

export function getDefaultRemote(rootPath: string): RemotePeerConfig | null {
  const remote = readRemoteConfig(rootPath);
  return remote.default ?? null;
}

export function authHeaders(rootPath: string): Record<string, string> {
  const key =
    process.env.TRELLIS_REMOTE_KEY ??
    readRemoteSecrets(rootPath).apiKey ??
    '';
  if (!key) return {};
  return { authorization: `Bearer ${key}` };
}

export function readJournalMeta(opsPath: string): JournalMeta | null {
  if (!existsSync(opsPath)) return null;
  const raw = readFileSync(opsPath, 'utf-8');
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const lines = trimmed.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return null;

  let tailHash = '';
  try {
    const last = JSON.parse(lines[lines.length - 1]!) as VcsOp;
    tailHash = last.hash ?? '';
  } catch {
    return null;
  }

  return {
    format: 'jsonl',
    tailHash,
    byteLength: Buffer.byteLength(raw, 'utf-8'),
    lineCount: lines.length,
  };
}

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + path;
}

export async function fetchRemoteTail(
  peer: RemotePeerConfig,
  transport: HttpTransport,
  headers: Record<string, string>,
): Promise<JournalMeta | null> {
  const url = joinUrl(
    peer.url,
    `/v0/ledger/tail?repoId=${encodeURIComponent(peer.repoId)}`,
  );
  const res = await transport.get(url, headers);
  if (res.status === 404) return null;
  if (res.status >= 400) {
    throw new Error(`Remote tail fetch failed (${res.status}): ${res.body.slice(0, 200)}`);
  }
  const body = JSON.parse(res.body) as JournalMeta;
  return body;
}

export async function listRemoteRepos(
  peer: RemotePeerConfig,
  transport: HttpTransport = defaultFetchTransport(),
  headers: Record<string, string> = {},
): Promise<RemoteRepoInfo[]> {
  const url = joinUrl(peer.url, '/v0/ledger/repos');
  const res = await transport.get(url, headers);
  if (res.status === 404) return [];
  if (res.status >= 400) {
    throw new Error(
      `Remote repo list failed (${res.status}): ${res.body.slice(0, 200)}`,
    );
  }
  const body = JSON.parse(res.body) as
    | RemoteRepoInfo[]
    | { repos?: RemoteRepoInfo[] };
  return Array.isArray(body) ? body : (body.repos ?? []);
}

export async function remoteStatus(
  rootPath: string,
  transport: HttpTransport = defaultFetchTransport(),
): Promise<RemoteStatus> {
  const peer = getDefaultRemote(rootPath);
  const local = readJournalMeta(opsPathForRoot(rootPath));
  if (!peer) {
    return {
      local,
      remote: null,
      synced: false,
      diverged: false,
    };
  }

  const remote = await fetchRemoteTail(peer, transport, authHeaders(rootPath));
  if (!local || !remote) {
    return {
      local,
      remote,
      synced: false,
      diverged: false,
    };
  }

  const synced = local.tailHash === remote.tailHash;
  const diverged = !synced;
  return { local, remote, synced, diverged };
}

export async function pushRemoteLedger(
  rootPath: string,
  transport: HttpTransport = defaultFetchTransport(),
  opts?: { dryRun?: boolean },
): Promise<PushResult> {
  const peer = getDefaultRemote(rootPath);
  if (!peer) {
    throw new Error('No default remote configured. Run: trellis remote add <url>');
  }

  const opsPath = opsPathForRoot(rootPath);
  const local = readJournalMeta(opsPath);
  if (!local) {
    throw new Error('Local integration journal is empty or missing.');
  }

  const headers = authHeaders(rootPath);
  const remoteTail = await fetchRemoteTail(peer, transport, headers);
  const previousTail = remoteTail?.tailHash ?? peer.lastAckHash ?? '';

  if (remoteTail && remoteTail.tailHash === local.tailHash) {
    return { pushed: false, tailHash: local.tailHash, previousTail };
  }

  if (
    remoteTail &&
    remoteTail.tailHash &&
    peer.lastAckHash &&
    remoteTail.tailHash !== peer.lastAckHash &&
    remoteTail.tailHash !== local.tailHash
  ) {
    throw new Error(
      `Remote diverged (remote=${remoteTail.tailHash.slice(0, 16)}… local=${local.tailHash.slice(0, 16)}…)`,
    );
  }

  const raw = readFileSync(opsPath, 'utf-8');
  const payload = {
    repoId: peer.repoId,
    previousTail,
    tailHash: local.tailHash,
    format: local.format,
    byteLength: local.byteLength,
    lineCount: local.lineCount,
    owner: peer.owner,
    name: peer.repo,
    checkpoint: raw,
  };

  if (opts?.dryRun) {
    return { pushed: false, tailHash: local.tailHash, previousTail };
  }

  const url = joinUrl(peer.url, '/v0/ledger/push');
  const res = await transport.post(url, payload, headers);
  if (res.status === 409) {
    throw new Error(`Remote rejected push (409 tail mismatch): ${res.body.slice(0, 200)}`);
  }
  if (res.status >= 400) {
    throw new Error(`Remote push failed (${res.status}): ${res.body.slice(0, 200)}`);
  }

  const remote = readRemoteConfig(rootPath);
  const name = peer.name ?? 'default';
  const updated: RemotePeerConfig = {
    ...peer,
    lastAckHash: local.tailHash,
    lastAckAt: new Date().toISOString(),
  };
  remote[name === 'default' ? 'default' : name] = updated;
  if (name === 'default') remote.default = updated;
  writeRemoteConfig(rootPath, remote);

  return { pushed: true, tailHash: local.tailHash, previousTail };
}

export async function pullRemoteLedger(
  rootPath: string,
  transport: HttpTransport = defaultFetchTransport(),
  opts?: { to?: string },
): Promise<PullResult> {
  const peer = getDefaultRemote(rootPath);
  if (!peer) {
    throw new Error('No default remote configured. Run: trellis remote add <url>');
  }

  const headers = authHeaders(rootPath);
  const remote = await fetchRemoteTail(peer, transport, headers);
  if (!remote?.tailHash) {
    throw new Error('Remote has no ledger tail to pull.');
  }

  const url = joinUrl(
    peer.url,
    `/v0/ledger/checkpoints/${encodeURIComponent(remote.tailHash)}`,
  );
  const res = await transport.get(url, headers);
  if (res.status >= 400) {
    throw new Error(`Remote pull failed (${res.status}): ${res.body.slice(0, 200)}`);
  }

  const dest =
    opts?.to ?? join(trellisDir(rootPath), 'ops.json.pulled');
  mkdirSync(dirname(dest), { recursive: true });

  let content = res.body;
  try {
    const parsed = JSON.parse(res.body) as { checkpoint?: string };
    if (typeof parsed.checkpoint === 'string') content = parsed.checkpoint;
  } catch {
    /* raw jsonl body */
  }

  validateJsonl(content);
  writeFileSync(dest, content.endsWith('\n') ? content : `${content}\n`);

  const meta = readJournalMeta(dest);
  if (!meta) throw new Error('Pulled ledger failed validation.');

  return { path: dest, tailHash: meta.tailHash, lineCount: meta.lineCount };
}

export function validateJsonl(raw: string): void {
  const lines = raw.split('\n').filter((l) => l.trim());
  for (const line of lines) {
    JSON.parse(line);
  }
}

export function tailIsNewer(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a > b;
}

export function installPulledOps(
  rootPath: string,
  opts?: { from?: string; force?: boolean },
): { installed: boolean; from: string; backup?: string } {
  const opsPath = opsPathForRoot(rootPath);
  const from = opts?.from ?? join(trellisDir(rootPath), 'ops.json.pulled');
  if (!existsSync(from)) {
    throw new Error(`Pulled file not found: ${from}`);
  }

  const pulled = readJournalMeta(from);
  const local = readJournalMeta(opsPath);
  if (
    local &&
    pulled &&
    !opts?.force &&
    tailIsNewer(local.tailHash, pulled.tailHash)
  ) {
    throw new Error(
      'Local tail is newer than pulled ledger. Re-run with --force to replace.',
    );
  }

  let backup: string | undefined;
  if (existsSync(opsPath)) {
    backup = `${opsPath}.corrupted.${Date.now()}`;
    copyFileSync(opsPath, backup);
  }

  copyFileSync(from, opsPath);
  return { installed: true, from, backup };
}

/** Read the persisted `project` metadata block (owner/name/kind) from config. */
export function readPersistedProject(
  rootPath: string,
): { owner?: string; name?: string; kind?: string } {
  const p = configPathForRoot(rootPath);
  if (!existsSync(p)) return {};
  try {
    const raw = JSON.parse(readFileSync(p, 'utf-8')) as {
      project?: { owner?: string; name?: string; kind?: string };
    };
    return raw.project ?? {};
  } catch {
    return {};
  }
}

export function addRemote(
  rootPath: string,
  url: string,
  opts?: { name?: string; repoId?: string; apiKey?: string; owner?: string; repo?: string },
): RemotePeerConfig {
  const name = opts?.name ?? 'default';
  const project = readPersistedProject(rootPath);
  const repoId =
    opts?.repoId ?? readPersistedRepoId(rootPath) ?? repoKeyFromRoot(rootPath);
  const peer: RemotePeerConfig = {
    url,
    repoId,
    name,
    owner: opts?.owner ?? project.owner,
    repo: opts?.repo ?? project.name,
  };
  const remote = readRemoteConfig(rootPath);
  if (name === 'default') remote.default = peer;
  else remote[name] = peer;
  writeRemoteConfig(rootPath, remote);
  if (opts?.apiKey) {
    writeRemoteSecrets(rootPath, { apiKey: opts.apiKey });
  }
  return peer;
}

export interface CloneOptions {
  /** Override repo discovery — must match a ledger hosted by the remote. */
  repoId?: string;
  apiKey?: string;
  /** Git URL for the byte tier; cloned into `destDir` before materialize. */
  gitUrl?: string;
  /** Skip worktree materialization — chain + config only. */
  opsOnly?: boolean;
  /**
   * Identity-addressed clone (ADR 0032): when set, the ledger's repo
   * attestation is verified against the person's public key before the
   * checkpoint is accepted, and the owner/name are persisted to config.
   */
  expected?: AttestationTarget;
}

export interface CloneResult {
  repoId: string;
  tailHash: string;
  lineCount: number;
  opsPath: string;
  materialized: boolean;
  /** Owner entity id + repo slug, when attested/known. */
  owner?: string;
  name?: string;
}

/** Fresh local `.trellis/` initialized from a remote sprite's latest checkpoint (ADR 0031). */
export async function cloneRemoteLedger(
  url: string,
  destDir: string,
  opts: CloneOptions = {},
  transport: HttpTransport = defaultFetchTransport(),
): Promise<CloneResult> {
  const headers: Record<string, string> = opts.apiKey
    ? { authorization: `Bearer ${opts.apiKey}` }
    : {};
  const peer = { url, repoId: opts.repoId ?? '' };
  const root = resolve(destDir);

  // 1. Discover repoId when not provided.
  let repoId = opts.repoId;
  if (!repoId) {
    const repos = await listRemoteRepos(peer, transport, headers);
    if (repos.length === 0) {
      throw new Error(
        `Remote ${url} hosts no ledgers. Pass --repo <repoId> to disambiguate.`,
      );
    }
    if (repos.length > 1) {
      throw new Error(
        `Remote ${url} hosts ${repos.length} ledgers (${repos
          .map((r) => r.repoId)
          .join(', ')}). Pass --repo <repoId>.`,
      );
    }
    const single = repos[0];
    if (single) repoId = single.repoId;
  }
  if (!repoId) {
    throw new Error(
      `Remote ${url} hosts no ledgers. Pass --repo <repoId> to disambiguate.`,
    );
  }

  const target = { url, repoId };

  // 2. Fetch remote tail (latest checkpoint hash).
  const tail = await fetchRemoteTail(target, transport, headers);
  if (!tail?.tailHash) {
    throw new Error(`Remote ledger ${repoId} has no checkpoint to clone.`);
  }

  // 3. Fetch latest checkpoint bytes.
  const checkpointUrl = joinUrl(
    url,
    `/v0/ledger/checkpoints/${encodeURIComponent(tail.tailHash)}`,
  );
  const res = await transport.get(checkpointUrl, headers);
  if (res.status >= 400) {
    throw new Error(
      `Clone checkpoint fetch failed (${res.status}): ${res.body.slice(0, 200)}`,
    );
  }
  let content = res.body;
  try {
    const parsed = JSON.parse(res.body) as { checkpoint?: string };
    if (typeof parsed.checkpoint === 'string') content = parsed.checkpoint;
  } catch {
    /* raw jsonl body */
  }
  validateJsonl(content);

  // 3.5 Identity-addressed clone (ADR 0032 §4): verify the owner's
  //     attestation is in the chain and signed by the person's public key
  //     before accepting the checkpoint. Trust the person, not the URL.
  if (opts.expected) {
    const ops = parseCheckpointOps(content);
    const attestationError = await verifyAttestation(ops, opts.expected);
    if (attestationError) {
      throw new Error(attestationError);
    }
  }

  // 4. Bytes first: git checkout (byte tier B) must run while dest is empty.
  let materialized = false;
  if (opts.gitUrl && !opts.opsOnly) {
    const { execSync } = await import('node:child_process');
    try {
      execSync(`git clone "${opts.gitUrl}" "${root}"`, {
        stdio: 'pipe',
      });
    } catch (err) {
      const stderr =
        err instanceof Error && err.message.includes('\n')
          ? err.message.split('\n')[0]
          : err instanceof Error
            ? err.message
            : String(err);
      throw new Error(`git clone failed: ${stderr}`);
    }
    materialized = true;
  }

  // 5. Init fresh .trellis at destDir (full persisted config — engine.open()
  //    spreads ignorePatterns etc., so `remote` alone is not enough).
  mkdirSync(trellisDir(root), { recursive: true });
  const opsPath = opsPathForRoot(root);
  writeFileSync(opsPath, content.endsWith('\n') ? content : `${content}\n`);

  const now = new Date().toISOString();
  const owner = opts.expected?.owner;
  const name = opts.expected?.repoName;
  writeFileSync(
    configPathForRoot(root),
    JSON.stringify(
      {
        rootPath: root,
        ignorePatterns: DEFAULT_IGNORE_PATTERNS,
        debounceMs: 300,
        defaultBranch: 'main',
        indexWorkspace: false,
        repoId,
        agentId: `agent:${process.env.USER ?? 'unknown'}`,
        createdAt: now,
        project: owner || name ? { owner, name } : undefined,
        remote: {
          default: {
            url,
            repoId,
            owner,
            repo: name,
            lastAckHash: tail.tailHash,
            lastAckAt: now,
          },
        },
      },
      null,
      2,
    ),
  );
  if (opts.apiKey) {
    writeRemoteSecrets(root, { apiKey: opts.apiKey });
  }

  // 6. Verify the installed chain tail matches the remote tail.
  const installed = readJournalMeta(opsPath);
  if (!installed || installed.tailHash !== tail.tailHash) {
    throw new Error(
      'Cloned ledger failed tail verification — refusing to leave partial repo.',
    );
  }

  return {
    repoId,
    tailHash: tail.tailHash,
    lineCount: tail.lineCount,
    opsPath,
    materialized,
    owner,
    name,
  };
}

const DEFAULT_IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.trellis',
  'dist',
  'build',
  '.DS_Store',
  '*.log',
  '.vercel',
  '.next',
  'coverage',
  'target/',
  '*.sqlite',
  '.turbo',
  '.output',
];

function repoKeyFromRoot(rootPath: string): string {
  return createHash('sha256').update(resolve(rootPath)).digest('hex').slice(0, 16);
}

export function remoteAckWindowMs(): number {
  const raw = process.env.TRELLIS_REMOTE_ACK_WINDOW_MS;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return DEFAULT_ACK_WINDOW_MS;
}

export function hasRecentRemoteAck(rootPath: string): boolean {
  const peer = getDefaultRemote(rootPath);
  if (!peer?.lastAckAt) return false;
  const age = Date.now() - new Date(peer.lastAckAt).getTime();
  return age <= remoteAckWindowMs();
}

export function assertRecentRemoteAckForRepair(
  rootPath: string,
  opts?: { iKnow?: boolean; confirmDestructive?: boolean },
): void {
  const peer = getDefaultRemote(rootPath);
  if (!peer) return;
  if (opts?.iKnow || opts?.confirmDestructive) return;
  if (process.env.TRELLIS_I_KNOW === '1') return;
  if (process.env.TRELLIS_CONFIRM_DESTRUCTIVE === '1') return;
  if (hasRecentRemoteAck(rootPath)) return;

  throw new Error(
    'Refusing repair without a recent remote ack. Run `trellis remote push` first, ' +
    'or pass --i-know / --confirm-destructive (human only).',
  );
}

/** In-memory sprite for tests. */
export class MemoryRemoteSprite implements HttpTransport {
  private tips = new Map<string, JournalMeta>();
  private checkpoints = new Map<string, string>();
  private projectMeta = new Map<string, { owner?: string; name?: string }>();

  get(url: string): Promise<HttpResponse> {
    const u = new URL(url, 'http://sprite.test');
    if (u.pathname === '/v0/ledger/tail') {
      const repoId = u.searchParams.get('repoId') ?? '';
      const tip = this.tips.get(repoId);
      if (!tip) return Promise.resolve({ status: 404, body: '{}' });
      return Promise.resolve({ status: 200, body: JSON.stringify(tip) });
    }
    if (u.pathname === '/v0/ledger/repos') {
      const repos: RemoteRepoInfo[] = [...this.tips.entries()].map(
        ([repoId, meta]) => ({
          repoId,
          ...(this.projectMeta.get(repoId) ?? {}),
          tailHash: meta.tailHash,
          byteLength: meta.byteLength,
          lineCount: meta.lineCount,
        }),
      );
      return Promise.resolve({ status: 200, body: JSON.stringify(repos) });
    }
    const m = u.pathname.match(/^\/v0\/ledger\/checkpoints\/(.+)$/);
    if (m) {
      const hash = decodeURIComponent(m[1]!);
      const body = this.checkpoints.get(hash);
      if (!body) return Promise.resolve({ status: 404, body: 'missing' });
      return Promise.resolve({ status: 200, body });
    }
    return Promise.resolve({ status: 404, body: 'not found' });
  }

  post(url: string, body: unknown): Promise<HttpResponse> {
    const u = new URL(url, 'http://sprite.test');
    if (u.pathname !== '/v0/ledger/push') {
      return Promise.resolve({ status: 404, body: 'not found' });
    }
    const payload = body as {
      repoId: string;
      previousTail?: string;
      tailHash: string;
      format: string;
      byteLength: number;
      lineCount: number;
      checkpoint: string;
      owner?: string;
      name?: string;
    };
    const existing = this.tips.get(payload.repoId);
    if (
      existing &&
      payload.previousTail &&
      existing.tailHash !== payload.previousTail
    ) {
      return Promise.resolve({ status: 409, body: 'tail mismatch' });
    }
    const meta: JournalMeta = {
      format: 'jsonl',
      tailHash: payload.tailHash,
      byteLength: payload.byteLength,
      lineCount: payload.lineCount,
    };
    this.tips.set(payload.repoId, meta);
    this.checkpoints.set(payload.tailHash, payload.checkpoint);
    if (payload.owner || payload.name) {
      this.projectMeta.set(payload.repoId, {
        owner: payload.owner,
        name: payload.name,
      });
    }
    return Promise.resolve({ status: 200, body: JSON.stringify({ ok: true }) });
  }

  /** Test helper: set remote ahead of local without push from client. */
  seedRemote(repoId: string, meta: JournalMeta, checkpoint: string): void {
    this.tips.set(repoId, meta);
    this.checkpoints.set(meta.tailHash, checkpoint);
  }
}
