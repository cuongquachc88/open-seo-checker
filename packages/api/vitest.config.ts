import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Each test file gets its own SQLite db (via the beforeAll/beforeEach
    // helpers in src/__tests__/setup.ts). Running serially avoids
    // conflicts on shared module-level state.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    testTimeout: 30_000,
    reporters: ['default'],
  },
  resolve: {
    alias: {
      // Allow tests to import from @/... like the production code does.
      // (Currently @ only resolves on the web side; add it here if the
      //  api code base ever moves to it.)
    },
  },
});
