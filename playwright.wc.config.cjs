const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'test/wc',
  testMatch: '**/*.e2e.ts',
  workers: 1,
  timeout: 360_000,
  use: {
    baseURL: process.env.WC_SANDBOX_URL ?? 'http://127.0.0.1:4321',
  },
  webServer: {
    command: 'node test/webcontainer/server.mjs',
    url: process.env.WC_SANDBOX_URL ?? 'http://127.0.0.1:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
