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

export function sandboxPackageJson() {
  return {
    name: 'trellis-wc-sandbox',
    version: '0.0.0',
    private: true,
    type: 'module',
    bin: { trellis: './bin/trellis.mjs' },
    dependencies: { ...WC_RUNTIME_DEPS },
  };
}
