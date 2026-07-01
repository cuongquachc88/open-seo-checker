import { expect, test } from '@playwright/test';

/**
 * Dashboard SPA end-to-end checks. These tests assume the backend is
 * already running (PN_BOOT=1 enables the webServer config to spawn
 * `pnpm start:sh` automatically).
 */
test.describe('Dashboard SPA', () => {
  test('renders the home page with the brand mark', async ({ page }) => {
    await page.goto('/');
    // Brand mark SVGs (api + sidebar) load with role=img. Their aria-label
    // includes the role suffix, e.g. `Open SEO Checker (FRONTEND)`.
    const brands = page.locator('[aria-label^="Open SEO Checker"]');
    await expect(brands.first()).toBeVisible();

    // Sidebar primary brand label visible.
    await expect(page.locator('aside')).toContainText('Open SEO Checker');

    // Hero h1 visible.
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('does not raise any console errors on the home page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Some React warnings may not be errors. We only fail on real
    // console errors and unhandled exceptions.
    expect(errors).toEqual([]);
  });

  test('sidebar navigation lists the canonical routes', async ({ page }) => {
    await page.goto('/');
    const navLabels = [
      'Dashboard',
      'New Crawl',
      'Crawl Runs',
      'Sitemap Studio',
      'Compare Runs',
      'AI Insights',
      'Reports',
      'Settings',
    ];
    for (const label of navLabels) {
      await expect(page.locator('aside').getByText(label).first()).toBeVisible();
    }
  });

  test('clicking New Crawl navigates to /crawl', async ({ page }) => {
    await page.goto('/');
    await page.locator('aside').getByText('New Crawl').first().click();
    await page.waitForURL(/\/crawl$/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('clicking Crawl Runs navigates to /runs', async ({ page }) => {
    await page.goto('/');
    await page.locator('aside').getByText('Crawl Runs').first().click();
    await page.waitForURL(/\/runs$/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('clicking Settings navigates to /settings', async ({ page }) => {
    await page.goto('/');
    await page.locator('aside').getByText('Settings').first().click();
    await page.waitForURL(/\/settings$/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  // ----- Full sidebar sweep -------------------------------------------------
  // Each test starts from `/` and clicks the corresponding sidebar item.
  // Verifies URL + h1 rendered and tracks console health.
  const SIDEBAR_ROUTES: Array<{ label: string; urlPattern: RegExp }> = [
    { label: 'Dashboard',     urlPattern: /\/$/ },
    { label: 'New Crawl',     urlPattern: /\/crawl$/ },
    { label: 'Crawl Runs',    urlPattern: /\/runs$/ },
    { label: 'Sitemap Studio', urlPattern: /\/sitemap$/ },
    { label: 'Compare Runs',  urlPattern: /\/compare$/ },
    { label: 'AI Insights',   urlPattern: /\/insights$/ },
    { label: 'Reports',       urlPattern: /\/reports$/ },
    { label: 'Settings',      urlPattern: /\/settings$/ },
  ];

  for (const route of SIDEBAR_ROUTES) {
    test(`clicking ${route.label} navigates to ${route.urlPattern}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', m => {
        if (m.type() === 'error') errors.push(m.text());
      });
      page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));

      await page.goto('/');
      await page.locator('aside').getByText(route.label).first().click();
      await page.waitForURL(route.urlPattern);
      await expect(page.locator('h1').first()).toBeVisible();

      const real = errors.filter(e => !e.includes('same key'));
      expect(real).toEqual([]);
    });
  }
});
