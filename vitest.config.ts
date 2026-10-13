import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@number0/iroh': '@number0/iroh/index.js',
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup/mirror-isolation.ts'],
    globals: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
