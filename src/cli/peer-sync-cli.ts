/**
 * Peer sync CLI — pairwise Iroh sync (ADR 0060).
 *
 *   trellis sync ticket            print this repo's stable endpoint id + ticket
 *   trellis sync serve [--timeout]  bind an endpoint, print the ticket, serve ops
 *   trellis sync pull --ticket <t>  connect to a peer and pull its ops
 *
 * Pairwise pull is the first shape (ADR 0060 §2): one peer pulls, the other
 * serves. Discovery is manual ticket exchange (§4); a rendezvous is deferred.
 * Endpoint identity is derived from the repo's identity so tickets survive
 * boots (§3). Integration runs through the engine + SyncEngine gates (§5).
 */

import { Command } from 'commander';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { TrellisVcsEngine } from '../engine.js';
import { IrohSyncTransport } from '../sync/iroh-transport.js';
import { TrellisVcsSyncPeer } from '../sync/vcs-sync-peer.js';
import { resolveRepoRoot } from './repo-path.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Stable 32-byte Iroh secret key for this repo. Derived from the repo identity
 * when present (survives clones/renames), else the resolved root path.
 */
function deriveSecretKey(rootPath: string): number[] {
  let seed = `trellis-iroh-sync/v1:${rootPath}`;
  const idPath = join(rootPath, '.trellis', 'identity.json');
  if (existsSync(idPath)) {
    try {
      const id = JSON.parse(readFileSync(idPath, 'utf-8')) as { did?: string };
      if (id?.did) seed = `trellis-iroh-sync/v1:${id.did}`;
    } catch {
      /* fall back to rootPath */
    }
  }
  return [...createHash('sha256').update(seed).digest()];
}

/** Open the repo's engine with ops loaded (the constructor does not load — ADR 0060). */
function openEngine(rootPath: string): TrellisVcsEngine {
  const engine = new TrellisVcsEngine({ rootPath, agentId: 'agent:sync-cli' });
  engine.open();
  return engine;
}

function countRejected(r: unknown): number {
  const rejected = (r as { rejected?: unknown })?.rejected;
  if (Array.isArray(rejected)) return rejected.length;
  return typeof rejected === 'number' ? rejected : 0;
}

export function registerPeerSyncCommands(program: Command): void {
  const sync = program
    .command('wire')
    .description('Peer wire — pairwise Iroh sync (ADR 0060)');

  sync
    .command('ticket')
    .description("Print this repo's stable Iroh endpoint id and shareable ticket")
    .action(async () => {
      const rootPath = resolveRepoRoot();
      const transport = await IrohSyncTransport.create({
        secretKey: deriveSecretKey(rootPath),
      });
      console.log(`endpoint ${transport.localId()}`);
      console.log(`ticket   ${transport.ticket()}`);
      await transport.close();
    });

  sync
    .command('serve')
    .description('Bind an endpoint, print the ticket, and serve ops to peers')
    .option('--timeout <seconds>', 'Serve for this many seconds (0 = until interrupted)', '120')
    .action(async (opts: { timeout: string }) => {
      const rootPath = resolveRepoRoot();
      const engine = openEngine(rootPath);
      const transport = await IrohSyncTransport.create({
        secretKey: deriveSecretKey(rootPath),
      });
      new TrellisVcsSyncPeer({
        peerId: transport.localId(),
        engine,
        transport,
        onIntegrate: (r) => {
          console.log(`integrated applied=${r.applied} rejected=${countRejected(r)}`);
        },
      });

      console.log(`endpoint ${transport.localId()}`);
      console.log(`ticket   ${transport.ticket()}`);
      console.log(`serving ${engine.getOpCount()} ops`);

      const stop = async () => {
        await transport.close();
        process.exit(0);
      };
      const seconds = Number(opts.timeout);
      if (seconds > 0) setTimeout(stop, seconds * 1000);
      process.on('SIGINT', stop);
      await new Promise(() => {});
    });

  sync
    .command('pull')
    .description("Connect to a peer ticket and pull its ops into this repo")
    .requiredOption('--ticket <ticket>', 'Peer ticket (from `trellis sync ticket` / `serve`)')
    .option('--peer-id <id>', 'Peer endpoint id (peer naming; defaults to "remote")')
    .option('--timeout <seconds>', 'Max seconds to wait for integration', '15')
    .action(async (opts: { ticket: string; peerId?: string; timeout: string }) => {
      const rootPath = resolveRepoRoot();
      const engine = openEngine(rootPath);
      const before = engine.getOpCount();

      const transport = await IrohSyncTransport.create({
        secretKey: deriveSecretKey(rootPath),
      });
      let applied = 0;
      let rejected = 0;
      const peer = new TrellisVcsSyncPeer({
        peerId: transport.localId(),
        engine,
        transport,
        onIntegrate: (r) => {
          applied += r.applied;
          rejected += countRejected(r);
        },
      });

      const peerId = opts.peerId ?? 'remote';
      await transport.connectToPeer(opts.ticket, peerId, peerId);
      console.log(`endpoint ${transport.localId()}`);
      console.log(`pulling from ${peerId}`);

      await peer.pullFrom(peerId);

      const deadline = Date.now() + Number(opts.timeout) * 1000;
      while (Date.now() < deadline) {
        await sleep(250);
        if (applied > 0 && engine.getOpCount() > before) {
          await sleep(500); // let trailing batches land
          break;
        }
      }

      const after = engine.getOpCount();
      console.log(`applied ${applied} rejected ${rejected}`);
      console.log(`ops ${before} -> ${after}`);
      await transport.close();
      process.exit(0);
    });
}
