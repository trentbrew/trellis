/** Runtime deps vendored into WebContainer (native modules use stubs). */
export const WC_RUNTIME_DEPS = {
  'sql.js': '^1.14.1',
  commander: '^13.1.0',
  chalk: '^5.4.1',
  '@inquirer/prompts': '^8.2.2',
  zod: '3',
  ws: '^8.20.1',
  uqr: '^0.1.3',
} as const;

/**
 * Files excluded from vendored packages when packing a sandbox.
 *
 * sql.js ships every build variant it has ever produced (~19 MB): asm.js
 * fallbacks, debug builds, and Web Worker wrappers. The sandbox resolves
 * `sql.js` under Node semantics (`dist/sql-wasm.js` + `dist/sql-wasm.wasm`);
 * the `browser` export condition adds the two `-browser` files. Nothing else
 * is reachable, and shipping it costs ~18 MB on every cold sandbox boot.
 *
 * Keys are package names; values are predicates over the package-relative
 * POSIX path. Return true to drop the file.
 */
export const WC_PACK_PRUNE: Record<string, (relPath: string) => boolean> = {
  'sql.js': (rel) =>
    rel.startsWith('dist/') &&
    (rel.includes('-debug') || rel.includes('sql-asm') || rel.includes('worker.')),
};

export function sandboxPackageJson(version = '0.0.0') {
  return {
    name: 'trellis-wc-sandbox',
    version,
    private: true,
    type: 'module',
    bin: { trellis: './bin/trellis.mjs' },
    dependencies: { ...WC_RUNTIME_DEPS },
  };
}
