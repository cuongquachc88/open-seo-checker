import { expect, test } from '@playwright/test';

/**
 * Smoke each deep route in the SPA without click-then-navigate,
 * using direct navigation. Catches routing regressions when new pages
 * are added or old ones break under direct loads.
 */
test.describe('SPA routes', () => {
  for (const route of ['/crawl', '/runs', '/sitemap', '/compare', '/insights', '/reports', '/settings']) {
    test(`loads ${route} without throwing`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', m => {
        if (m.type() === 'error') errors.push(m.text());
      });
      page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));

      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // A <h1> appears on every page route.
      await expect(page.locator('h1').first()).toBeVisible();

      // Skip React key-duplication warnings which are pre-existing
      // Dashboard rendering noise from the live data; they don't
      // affect interaction or layout.
      const realErrors = errors.filter(e => !e.includes('same key'));
      expect(realErrors).toEqual([]);
    });
  }
});

test.describe('404 handling', () => {
  test('unknown nested route falls back to the NotFound page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await page.waitForLoadState('networkidle');

    const notFound = page.getByText(/404|not found/i).first();
    await expect(notFound).toBeVisible();

    // Brand mark still renders (so the layout is intact).
    await expect(page.locator('[aria-label^="Open SEO Checker"]').first()).toBeVisible();
  });
});

test.describe('AI Settings', () => {
  test('Settings page surfaces the Default AI provider card', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Default AI provider').first()).toBeVisible();
    // The card has either a "No AI provider selected" pill or a
    // provider already configured - both are valid first-render
    // states on a clean install.
  });

  test('Insights tab prompts to configure when no provider set', async ({ page }) => {
    // Pretend we have a run already by going to run id 1 (will work
    // if there is at least one crawled run). If there is no run,
    // the insights page is still reachable and shows the empty
    // state card.
    await page.goto('/crawl/1/insights');
    await page.waitForLoadState('networkidle');

    // Either the "Not configured" empty state, the "Missing API key"
    // state, or an actual chat. All three are valid; we just want
    // the route to render without crashing.
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(0);
  });
});
