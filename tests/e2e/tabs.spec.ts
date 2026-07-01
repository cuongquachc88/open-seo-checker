import { expect, test } from '@playwright/test';

/**
 * Crawl Detail tabs.
 *
 * For each tab URL (`/crawl/:id/.../{tab}`), the dashboard must render
 * the page shell without raising any console error and must show the
 * canonical <h1>. This catches routing+rendering regressions on the
 * deep links that the rest of the dashboard hyperlinks from.
 *
 * The run id is read from `/api/runs` once; if the API is empty the
 * suite skips gracefully.
 */

const TABS = [
  'overview',   // → /crawl/:id (no suffix)
  'issues',
  'urls',
  'sitemap',
  'keywords',
  'links',
  'compare',
  'insights',
];

interface RunState {
  runId: number | null;
}

const state: RunState = { runId: null };

test.describe.serial('Crawl Detail tabs', () => {
  test('seed: pick the latest crawl run id', async ({ request }) => {
    const res = await request.get('/api/runs');
    expect(res.status()).toBe(200);
    const body = await res.json();
    if (!body.runs?.length) test.skip(true, 'no runs yet — run crawl-flow first');
    state.runId = body.runs[0].id;
  });

  for (const tab of TABS) {
    test(`/${tab} renders without console errors`, async ({ page }) => {
      const id = state.runId;
      if (id == null) test.skip(true, 'no run id available');

      const errors: string[] = [];
      page.on('console', m => {
        if (m.type() === 'error') errors.push(m.text());
      });
      page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));

      const url = tab === 'overview' ? `/crawl/${id}` : `/crawl/${id}/${tab}`;
      await page.goto(url);
      await expect(page.locator('h1').first()).toBeVisible();

      // React key warnings are noise on mock data; ignore them.
      const real = errors.filter(e => !e.includes('same key'));
      expect(real).toEqual([]);
    });
  }

  test('exposes the canonical 8 tabs inside the run detail layout', async ({ page }) => {
    const id = state.runId;
    if (id == null) test.skip(true, 'no run id available');
    await page.goto(`/crawl/${id}`);
    await page.waitForLoadState('networkidle');

    const expectedLabels = ['Overview', 'Issues', 'URLs', 'Sitemap', 'Keywords', 'Links', 'Compare', 'AI Insights'];
    const layout = page.locator('[role="tablist"]').first();
    for (const label of expectedLabels) {
      await expect(layout.getByText(label, { exact: false }).first()).toBeVisible();
    }
  });
});
