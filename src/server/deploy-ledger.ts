/**
 * Deploy Trellis ledger sprite handler to Fly Sprites (TRL-243).
 */
import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  buildDeployUrl,
  SPRITE_PUBLIC_HTTP_PORT,
  validateDeployName,
} from './deploy-meta.js';
import {
  assertSpriteCli,
  ensureSprite,
  ensureSpritePublicAccess,
  resolveSpritePublicUrl,
  runSpriteCopy,
  runSpriteExec,
  SPRITE_ENSURE_BUN_SH,
  spriteStopServiceSh,
  spriteStartServiceSh,
} from './sprites.js';

const LEDGER_REMOTE_DIR = '/home/sprite/trellis-ledger';
const LEDGER_SERVICE = 'trellis-ledger';

export interface DeployLedgerOptions {
  name: string;
  port?: number;
  configDir?: string;
  apiKey?: string;
  onProgress?: (msg: string) => void;
  stub?: boolean;
}

export interface DeployLedgerResult {
  url: string;
  name: string;
  apiKey: string;
}

export interface LedgerSpriteConfig {
  url: string;
  spriteName: string;
  apiKey: string;
  deployedAt: string;
  port: number;
}

export function writeLedgerSpriteConfig(
  cfg: LedgerSpriteConfig,
  configDir = '.',
): void {
  const path = resolve(configDir, '.trellis', 'ledger-sprite.json');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(cfg, null, 2) + '\n');
}

export function generateLedgerApiKey(): string {
  return randomBytes(24).toString('hex');
}

export async function deployLedgerSprite(
  opts: DeployLedgerOptions,
): Promise<DeployLedgerResult> {
  const { configDir = '.', onProgress = () => { } } = opts;
  const listenPort = opts.port ?? SPRITE_PUBLIC_HTTP_PORT;
  const name = validateDeployName(opts.name);
  const apiKey = opts.apiKey ?? generateLedgerApiKey();

  if (opts.stub) {
    const url = buildDeployUrl(name);
    onProgress('Stub deploy — skipping Sprites provisioning');
    writeLedgerSpriteConfig(
      {
        url,
        spriteName: name,
        apiKey,
        deployedAt: new Date().toISOString(),
        port: listenPort,
      },
      configDir,
    );
    return { url, name, apiKey };
  }

  onProgress('Checking Sprites CLI...');
  await assertSpriteCli();

  const tmpDir = resolve(configDir, '.trellis-deploy-ledger');
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

  const entrypoint = join(tmpDir, 'ledger-entry.ts');
  writeFileSync(entrypoint, generateLedgerEntrypoint({ port: listenPort, apiKey }));

  onProgress('Bundling ledger handler with Bun...');
  const bundlePath = join(tmpDir, 'ledger.js');
  await runBun([
    'build',
    entrypoint,
    '--outfile',
    bundlePath,
    '--target',
    'bun',
    '--format',
    'esm',
  ]);

  onProgress(`Ensuring Sprite: ${name}...`);
  await ensureSprite(name);
  onProgress('Configuring public URL...');
  await ensureSpritePublicAccess(name);
  const url = await resolveSpritePublicUrl(name);

  onProgress('Uploading ledger bundle...');
  await runSpriteExec(name, `mkdir -p ${LEDGER_REMOTE_DIR}/data`);
  await runSpriteCopy(bundlePath, name, `${LEDGER_REMOTE_DIR}/ledger.js`);

  onProgress('Ensuring Bun is installed...');
  const bunPath = await runSpriteExec(name, SPRITE_ENSURE_BUN_SH);
  if (!bunPath.includes('bun')) {
    throw new Error(`Bun install failed on sprite ${name}: ${bunPath || '(no output)'}`);
  }

  onProgress('Stopping previous ledger service...');
  await runSpriteExec(
    name,
    spriteStopServiceSh(LEDGER_SERVICE, '[t]rellis-ledger/ledger.js'),
  );

  onProgress('Starting ledger service (sprite-env)...');
  const bun = bunPath.trim().split('\n').pop()!.trim();
  await runSpriteExec(
    name,
    spriteStartServiceSh({
      service: LEDGER_SERVICE,
      bun,
      script: 'ledger.js',
      dir: LEDGER_REMOTE_DIR,
      port: listenPort,
    }),
  );

  onProgress('Waiting for health check...');
  await waitForHealth(url, 60_000);

  writeLedgerSpriteConfig(
    {
      url,
      spriteName: name,
      apiKey,
      deployedAt: new Date().toISOString(),
      port: listenPort,
    },
    configDir,
  );

  try {
    const { trackSprite } = await import('./vm-config.js');
    trackSprite(name, { url, hasTrellis: false });
  } catch {
    /* optional */
  }

  return { url, name, apiKey };
}

function resolveLedgerImport(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const packageRoots = [resolve(here, '..'), resolve(here, '..', '..')];
  const tried: string[] = [];
  for (const packageRoot of packageRoots) {
    for (const candidate of [
      join(packageRoot, 'dist', 'server', 'ledger-serve.js'),
      join(packageRoot, 'src', 'server', 'ledger-serve.ts'),
    ]) {
      tried.push(candidate);
      if (existsSync(candidate)) {
        return resolve(candidate).replace(/\\/g, '/');
      }
    }
  }
  throw new Error(`ledger-serve module not found (tried: ${tried.join(', ')})`);
}

function generateLedgerEntrypoint(opts: {
  port: number;
  apiKey: string;
}): string {
  const mod = resolveLedgerImport();
  return `
import { startLedgerServerFromEnv } from '${mod}';

process.env.LEDGER_API_KEY = '${opts.apiKey}';
process.env.LEDGER_DATA_DIR = '${LEDGER_REMOTE_DIR}/data';

await startLedgerServerFromEnv({ port: ${opts.port} });
console.log('Trellis ledger sprite listening on port ${opts.port}');
`;
}

async function waitForHealth(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const healthUrl = `${url.replace(/\/$/, '')}/health`;
  let lastStatus = 0;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(healthUrl);
      lastStatus = res.status;
      if (res.ok) {
        const body = (await res.json()) as { service?: string };
        if (body.service === 'trellis-ledger') return;
      }
    } catch {
      /* sprite waking */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(
    `Ledger health check timed out (${healthUrl}${lastStatus ? `, last status ${lastStatus}` : ''})`,
  );
}

async function runBun(args: string[]): Promise<void> {
  const execFileAsync = promisify(execFile);
  try {
    await execFileAsync('bun', args);
  } catch (err: any) {
    throw new Error(
      `bun ${args[0]} failed (exit ${err.code ?? '?'}): ${err.stderr ?? err.message}`,
    );
  }
}
