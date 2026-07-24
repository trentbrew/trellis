const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.{spec,cjs}',
  workers: 1,
  use: {
    baseURL: 'http://localhost:3939',
  },
  webServer: {
    // Source CLI (tsx) — dist/bin lags uncommitted UI routes (e.g. GET /client).
    // --no-open: e2e must not spawn system browser tabs on every run.
    command: 'pnpm exec tsx src/cli/index.ts lane watch --port 3939 --no-open',
    port: 3939,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
