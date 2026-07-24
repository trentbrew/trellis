/**
 * Shared resolver for kernel runtime theme CSS.
 * Used by lanes-dashboard.ts and server.ts (legacy UI).
 */

import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/**
 * Locate runtime-theme.css relative to repo root, then module/cwd candidates.
 */
export function resolveRuntimeThemeCss(rootPath?: string | null): string | null {
  if (rootPath) {
    const rooted = join(rootPath, 'src', 'ui', 'theme', 'runtime-theme.css');
    if (existsSync(rooted)) return rooted;
    const distCopy = join(rootPath, 'dist', 'ui', 'theme', 'runtime-theme.css');
    if (existsSync(distCopy)) return distCopy;
  }
  return findRuntimeThemeAsset();
}

function findRuntimeThemeAsset(): string | null {
  const name = 'theme/runtime-theme.css';
  const candidates: string[] = [];
  try {
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    // src/ui/theme/ → sibling file; dist/ui/theme/ → same
    candidates.push(join(moduleDir, 'runtime-theme.css'));
    candidates.push(join(moduleDir, '..', name));
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
