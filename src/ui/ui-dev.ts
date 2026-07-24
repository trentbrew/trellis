/**
 * Admin/TML dev layer — esbuild watch + SSE live reload.
 *
 * Pure dev path: no Vite dev server. Trellis dashboard stays the single origin.
 * Gated by `trellis admin --dev` or TRELLIS_UI_DEV=1.
 */

import { existsSync, mkdirSync, watch as fsWatch } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { FSWatcher } from 'fs';

export const UI_DEV_SUBDIR = 'ui-dev';

/** Bundled browser entry points (add admin-shell.ts when extracted). */
export const UI_DEV_ENTRIES = ['tml-runtime.ts', 'admin-datatable.ts', 'admin-shell.ts'] as const;

export type UiDevReloadReason = 'reload' | 'css' | 'html';

export interface UiDevHandle {
  outDir: string;
  notify: (reason: UiDevReloadReason) => void;
  stop: () => Promise<void>;
}

const LIVE_RELOAD_CLIENT = `(() => {
  const es = new EventSource('/__dev/reload');
  es.addEventListener('css', () => {
    for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('http')) continue;
      const base = href.split('?')[0];
      link.setAttribute('href', base + '?v=' + Date.now());
    }
  });
  es.addEventListener('reload', () => location.reload());
  es.addEventListener('html', () => location.reload());
  es.onerror = () => {};
})();
`;

export function liveReloadClientSource(): string {
  return LIVE_RELOAD_CLIENT;
}

export function uiDevOutDir(rootPath: string): string {
  return join(rootPath, '.trellis', UI_DEV_SUBDIR);
}

function findUiAsset(name: string): string | null {
  const candidates: string[] = [];
  try {
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    candidates.push(join(moduleDir, name));
    candidates.push(join(moduleDir, '..', 'ui', name));
  } catch {
    // ignore
  }
  let cwd = process.cwd();
  for (let i = 0; i < 8; i++) {
    candidates.push(join(cwd, 'src', 'ui', name));
    candidates.push(join(cwd, 'dist', 'ui', name));
    const parent = dirname(cwd);
    if (parent === cwd) break;
    cwd = parent;
  }
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Start esbuild watch + filesystem watchers. Writes bundles to `.trellis/ui-dev/`.
 */
export async function startUiDevWatch(
  rootPath: string,
  onReload: (reason: UiDevReloadReason) => void,
): Promise<UiDevHandle> {
  const outDir = uiDevOutDir(rootPath);
  mkdirSync(outDir, { recursive: true });

  const entryPoints: string[] = [];
  for (const name of UI_DEV_ENTRIES) {
    const tsPath = findUiAsset(name);
    if (tsPath) entryPoints.push(tsPath);
  }

  if (entryPoints.length === 0) {
    throw new Error('ui-dev: no TS entry points found under src/ui/');
  }

  const { context } = await import('esbuild');
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const notifyDebounced = (reason: UiDevReloadReason) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => onReload(reason), 80);
  };

  const ctx = await context({
    entryPoints,
    bundle: true,
    format: 'esm',
    target: 'es2020',
    platform: 'browser',
    sourcemap: 'inline',
    outdir: outDir,
    logLevel: 'warning',
    plugins: [
      {
        name: 'ui-dev-reload',
        setup(build) {
          build.onEnd((result) => {
            if (result.errors.length === 0) notifyDebounced('reload');
          });
        },
      },
    ],
  });

  await ctx.watch();
  await ctx.rebuild();

  const watchers: FSWatcher[] = [];
  const watchFile = (path: string, reason: UiDevReloadReason) => {
    if (!existsSync(path)) return;
    watchers.push(fsWatch(path, () => notifyDebounced(reason)));
  };

  const adminHtml = findUiAsset('admin.html');
  if (adminHtml) watchFile(adminHtml, 'html');

  const datatableCss = findUiAsset('admin-datatable.css');
  if (datatableCss) watchFile(datatableCss, 'css');

  const themeCss = findUiAsset('theme/runtime-theme.css');
  if (themeCss) watchFile(themeCss, 'css');

  return {
    outDir,
    notify: onReload,
    stop: async () => {
      clearTimeout(debounce);
      for (const w of watchers) w.close();
      await ctx.dispose();
    },
  };
}
