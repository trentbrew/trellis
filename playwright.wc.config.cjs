const { defineConfig } = require('@playwright/test');

/** E2E port — avoids collision with dev `just wc-sandbox` / issue-check on :4321 */
const e2ePort = process.env.WC_E2E_PORT ?? '14321';
const sandboxUrl =
  process.env.WC_SANDBOX_URL ?? `http://127.0.0.1:${e2ePort}`;

module.exports = defineConfig({
  testDir: 'test/wc',
  testMatch: '**/*.e2e.ts',
  workers: 1,
  timeout: 360_000,
  use: {
    baseURL: sandboxUrl,
  },
  webServer: {
    command: `PORT=${e2ePort} node test/webcontainer/server.mjs`,
    url: sandboxUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
