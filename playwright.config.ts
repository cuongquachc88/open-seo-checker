import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for the Open SEO Checker dashboard.
 *
 * The e2e suite assumes the backend (which also serves the SPA) is
 * listening on :7437. Run:
 *
 *   pnpm server        (production build, single port)
 *   #  or
 *   pnpm start:sh      (orchestrator + dev proxy on :5173)
 *
 * then run:
 *
 *   pnpm test:e2e
 *
 * In CI, you can let Playwright manage the server itself by setting
 * PW_BOOT=1 in the environment; it will then call
 * ./start.sh before the suite starts and tear it down at the end.
 */
const useWebServer = process.env.PW_BOOT === '1';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './tests/e2e/.results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'list',
  use: {
    baseURL: process.env.PW_BASE_URL ?? 'http://localhost:7437',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: useWebServer
    ? {
        // pnpm start:sh orchestrates both backend (Hono on :7437) and
        // frontend (Vite on :5173). It also installs playwright
        // chromium on first run, so the e2e environment is ready.
        command: 'pnpm start:sh',
        url: 'http://localhost:7437/api/runs',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    : undefined,
});
