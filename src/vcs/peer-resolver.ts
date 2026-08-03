/**
 * Peer resolver (ADR 0032 §2 / §4).
 *
 * Maps a person's Trellis identity (`{peer}`) to the sprites that host their
 * repos. URLs live here — in resolver config — never in the command surface.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface PeerRecord {
  /** did:key identity of the person. */
  did: string;
  /** Entity id (`identity:<did>`) — the repo `owner` value. */
  entityId: string;
  /** Ed25519 public key (base64) — used to verify the genesis attestation. */
  publicKey: string;
  /** Sprite endpoints that host this person's repos. */
  spriteUrls: string[];
  /** Optional human name for display. */
  displayName?: string;
}

export type PeersFile = Record<string, PeerRecord>;

export function peersPath(): string {
  return join(homedir(), '.trellis', 'peers.json');
}

export function loadPeers(): PeersFile {
  const p = peersPath();
  if (!existsSync(p)) return {};
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf-8')) as PeersFile;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function savePeers(peers: PeersFile): void {
  const p = peersPath();
  mkdirSync(join(homedir(), '.trellis'), { recursive: true });
  writeFileSync(p, JSON.stringify(peers, null, 2));
}

/** Add or replace a peer by name and persist. */
export function addPeer(name: string, record: PeerRecord): PeerRecord {
  const peers = loadPeers();
  peers[name] = record;
  savePeers(peers);
  return record;
}

/** Remove a peer by name; returns true when it existed. */
export function removePeer(name: string): boolean {
  const peers = loadPeers();
  if (!(name in peers)) return false;
  delete peers[name];
  savePeers(peers);
  return true;
}

/**
 * Resolve a `{peer}` reference to a known person. Accepts a registered name,
 * a bare `did:key:…`, or an `identity:<did>` entity id.
 */
export function resolvePeer(ref: string): PeerRecord | null {
  const peers = loadPeers();
  const exact = peers[ref];
  if (exact) return exact;
  for (const record of Object.values(peers)) {
    if (record.did === ref || record.entityId === ref) return record;
  }
  return null;
}

/** Split a `{peer}/{repo}` project reference into its two parts. */
export function parseProjectRef(
  ref: string,
): { peer: string; repo: string } {
  const slash = ref.indexOf('/');
  if (slash <= 0 || slash === ref.length - 1) {
    throw new Error(
      `Expected {peer}/{repo} (e.g. alice/trellis-node), got: ${ref}`,
    );
  }
  return { peer: ref.slice(0, slash), repo: ref.slice(slash + 1) };
}
