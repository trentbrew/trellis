/**
 * Admin TML shell — connect/seed/mount lifecycle + unified mutation facade.
 * @module trellis/ui
 */

import { WebDriver, PeerDriver, mount, type TmlDriver } from './tml-runtime.js';
import { prepareShellsBeforeMount } from './tml-shell-registry.js';

export { rehydrateShellsForView } from './tml-shell-registry.js';

export type AdminDriverMode = 'web' | 'peer';

export interface AdminShellOptions {
  /** DOM subtree root for `mount()` — typically `.main` */
  mountRoot: Element;
  /** Called on every snapshot seed (initial connect + SSE snapshot events) */
  onSnapshot?: (snap: unknown) => void;
  baseUrl?: string;
  /** Default `'web'`. Read from `?driver=peer` when omitted. */
  driver?: AdminDriverMode;
  /** Test hook — overrides `location.search` for driver resolution */
  locationSearch?: string;
  snapshotUrl?: string;
  streamUrl?: string;
}

export interface AdminShell {
  readonly driver: TmlDriver;
  /** Fetch snapshot, seed store, subscribe SSE snapshots, then mount TML */
  connect(): Promise<void>;
  /** POST /api/tml-mutations via driver */
  op(action: string, args: Record<string, unknown>): Promise<void>;
}

export function resolveDriverMode(opts: AdminShellOptions): AdminDriverMode {
  if (opts.driver) return opts.driver;
  const search =
    opts.locationSearch ?? (typeof location !== 'undefined' ? location.search : '');
  const p = new URLSearchParams(search).get('driver');
  return p === 'peer' ? 'peer' : 'web';
}

export function createAdminShell(opts: AdminShellOptions): AdminShell {
  const mode = resolveDriverMode(opts);
  const baseUrl = opts.baseUrl ?? '';
  const snapshotUrl = opts.snapshotUrl ?? '/api/lanes';
  let connected = false;

  if (mode === 'peer') {
    const driver = new PeerDriver({ baseUrl });
    const streamUrl = opts.streamUrl ?? '/api/lanes/stream';

    return {
      driver,
      async connect() {
        if (connected) return;
        connected = true;

        const res = await fetch(baseUrl + snapshotUrl);
        if (res.ok) {
          const snap = await res.json();
          opts.onSnapshot?.(snap);
        }

        driver.connect({ streamUrl });
        prepareShellsBeforeMount(opts.mountRoot);
        mount(opts.mountRoot, driver);
      },
      op(action: string, args: Record<string, unknown>) {
        return driver.op(action, args);
      },
    };
  }

  const driver = new WebDriver({ baseUrl });
  const seedOrig = driver.seed.bind(driver);
  driver.seed = (snap: unknown) => {
    seedOrig(snap);
    opts.onSnapshot?.(snap);
  };

  const streamUrl = opts.streamUrl ?? '/api/lanes/stream?events=snapshot';

  return {
    driver,
    async connect() {
      if (connected) return;
      connected = true;
      await driver.connect({ snapshotUrl, streamUrl });
      prepareShellsBeforeMount(opts.mountRoot);
      mount(opts.mountRoot, driver);
    },
    op(action: string, args: Record<string, unknown>) {
      return driver.op(action, args);
    },
  };
}
