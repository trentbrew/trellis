import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { WC_PACK_PRUNE, sandboxPackageJson } from './constants.js';
import type { PackedFile, SandboxBootstrap, SandboxPackOptions } from './types.js';

const TEXT_EXTS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.map',
  '.css',
  '.html',
  '.txt',
  '.md',
]);
const BINARY_EXTS = new Set(['.wasm']);

export function resolvePkgDir(
  name: string,
  trellisRoot: string,
  requireFn = createRequire(import.meta.url),
): string {
  const entry = requireFn.resolve(name, { paths: [trellisRoot] });
  let dir = path.dirname(entry);
  while (dir !== path.dirname(dir)) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
        name?: string;
      };
      if (pkg.name === name) return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error(`Could not resolve package directory for ${name}`);
}

/**
 * Recursively collect dist JS files → { relativePath → utf8 content }.
 *
 * Sourcemaps are excluded by default: the sandbox has no debugger attached to
 * consume them, and they roughly triple the file count the WebContainer has to
 * materialise on boot. Pass `sourcemaps: true` when debugging the sandbox.
 */
export function packDist(
  distDir: string,
  options: { sourcemaps?: boolean } = {},
): Record<string, string> {
  const exts = options.sourcemaps ? ['.js', '.map'] : ['.js'];
  const result: Record<string, string> = {};
  const walk = (dir: string, base = dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(base, full).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        walk(full, base);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (exts.includes(ext)) {
        result[rel] = fs.readFileSync(full, 'utf8');
      }
    }
  };
  walk(distDir);
  return result;
}

export function packStubDir(
  dir: string,
  mountPrefix: string,
): Record<string, string> {
  const files: Record<string, string> = {};
  const walk = (current: string, base = dir) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full, base);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!TEXT_EXTS.has(ext)) continue;
      const rel = path.relative(base, full).replace(/\\/g, '/');
      files[path.posix.join(mountPrefix, rel)] = fs.readFileSync(full, 'utf8');
    }
  };
  walk(dir);
  return files;
}

export function packNodePackage(
  name: string,
  trellisRoot: string,
  seen = new Set<string>(),
  requireFn = createRequire(import.meta.url),
  prune = true,
): Record<string, PackedFile> {
  if (seen.has(name)) return {};
  seen.add(name);

  const isPruned = prune ? (WC_PACK_PRUNE[name] ?? null) : null;

  let pkgDir: string;
  try {
    pkgDir = resolvePkgDir(name, trellisRoot, requireFn);
  } catch {
    return {};
  }

  const files: Record<string, PackedFile> = {};
  const mountPrefix = path.posix.join('node_modules', name);

  const walk = (dir: string, base = pkgDir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, base);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      const relToPkg = path.relative(base, full).replace(/\\/g, '/');
      if (isPruned?.(relToPkg)) continue;
      const relPath = path.posix.join(mountPrefix, relToPkg);
      if (TEXT_EXTS.has(ext)) {
        files[relPath] = fs.readFileSync(full, 'utf8');
      } else if (BINARY_EXTS.has(ext)) {
        files[relPath] = {
          binary: fs.readFileSync(full).toString('base64'),
        };
      }
    }
  };

  walk(pkgDir);

  const pkg = JSON.parse(
    fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'),
  ) as { dependencies?: Record<string, string> };
  for (const dep of Object.keys(pkg.dependencies ?? {})) {
    Object.assign(
      files,
      packNodePackage(dep, trellisRoot, seen, requireFn, prune),
    );
  }
  return files;
}

export function packNodeModules(
  trellisRoot: string,
  stubsDir: string,
  options: { prune?: boolean } = {},
): Record<string, PackedFile> {
  const prune = options.prune ?? true;
  const deps = Object.keys(sandboxPackageJson().dependencies);
  const files: Record<string, PackedFile> = {};
  for (const dep of deps) {
    Object.assign(
      files,
      packNodePackage(dep, trellisRoot, new Set<string>(), undefined, prune),
    );
  }
  Object.assign(
    files,
    packStubDir(path.join(stubsDir, 'number0-iroh'), 'node_modules/@number0/iroh'),
  );
  return files;
}

export function resolveSandboxAssetsDir(trellisRoot: string): string {
  // Candidates are derived from `trellisRoot` first, because it is the package
  // root in both layouts (repo checkout during dev, install dir in production)
  // and — unlike `import.meta.url` — is unaffected by how esbuild chunks the
  // bundle. This function gets hoisted into a shared `dist/chunk-*.js`, so
  // `moduleDir` is `<pkg>/dist`, not `<pkg>/dist/wc`; the moduleDir entries
  // below are last-resort fallbacks only.
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(trellisRoot, 'src/wc/assets'), // repo source during dev
    path.join(trellisRoot, 'dist/wc/assets'), // published package
    path.join(moduleDir, 'assets'), // unbundled dist/wc/pack.js
    path.join(moduleDir, 'wc/assets'), // hoisted into dist/chunk-*.js
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) return candidate;
  }
  throw new Error(
    `WebContainer sandbox assets not found (index.html). Looked in:\n` +
      candidates.map((c) => `  - ${c}`).join('\n') +
      `\nRun \`npm run build\` if this is a source checkout.`,
  );
}

export function buildSandboxBootstrap(
  trellisRoot: string,
  optionsOrAssetsDir?: string | SandboxPackOptions,
): SandboxBootstrap {
  const options: SandboxPackOptions =
    typeof optionsOrAssetsDir === 'string'
      ? { assetsDir: optionsOrAssetsDir }
      : (optionsOrAssetsDir ?? {});

  const distDir = path.join(trellisRoot, 'dist');
  const binPath = path.join(trellisRoot, 'bin/trellis.mjs');
  const resolvedAssets = options.assetsDir ?? resolveSandboxAssetsDir(trellisRoot);

  if (!fs.existsSync(distDir)) {
    throw new Error('dist/ not found — run: npm run build');
  }
  if (!fs.existsSync(binPath)) {
    throw new Error('bin/trellis.mjs not found');
  }

  const clientHtmlPath = path.join(distDir, 'ui/client.html');
  const version = JSON.parse(
    fs.readFileSync(path.join(trellisRoot, 'package.json'), 'utf8'),
  ).version as string;

  return {
    // The sandbox `package.json` carries the real Trellis version so that
    // `trellis --version` inside the sandbox is attributable to a release.
    packageJson: sandboxPackageJson(version),
    binTrellis: fs.readFileSync(binPath, 'utf8'),
    dist: packDist(distDir, { sourcemaps: options.sourcemaps }),
    nodeModules: packNodeModules(trellisRoot, path.join(resolvedAssets, 'stubs'), {
      prune: options.prune,
    }),
    clientHtml: fs.existsSync(clientHtmlPath)
      ? fs.readFileSync(clientHtmlPath, 'utf8')
      : null,
    version,
  };
}
