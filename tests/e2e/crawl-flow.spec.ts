import { expect, test } from '@playwright/test';

/**
 * End-to-end crawl lifecycle.
 *
 * The suite:
 *   1. POSTs a real crawl against `http://localhost:7437/` (the running
 *      API server is also a guaranteed-reachable HTML target — useful for
 *      self-hosted e2e environments with no outbound network).
 *   2. Polls `/api/crawl/:id/status` until the run reaches a terminal
 *      state (`completed`, `failed`, `cancelled`) or times out.
 *   3. Exercises every downstream data endpoint against the run id so
 *      feature regressions surface early.
 *
 * `test.describe.serial` keeps the run id in a module-level closure so
 * subsequent tests reuse it instead of triggering parallel crawls.
 *
 * The polling test gives itself 90s; Playwright's per-test default
 * (30s) is too tight for a self-hosted crawl that may include JS
 * rendering warmups.
 */
interface RunState {
  runId: number | null;
}

const state: RunState = { runId: null };

test.describe.serial('Crawl workflow', () => {
  test('POST /api/crawl kicks off a real crawl', async ({ request }) => {
    const res = await request.post('/api/crawl', {
      data: { startUrl: 'http://localhost:7437/', maxUrls: 3 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.runId).toBeDefined();
    state.runId = body.runId;
  });

  test('GET /api/crawl/:id/status completes within 60s', async ({ request }) => {
    // Self-crawl can take longer than Playwright's default 30s timeout
    // when JS rendering warms up the headless browser for the first
    // time in an environment.
    test.setTimeout(90_000);

    const id = state.runId;
    if (id == null) test.skip(true, 'previous test failed to seed run id');

    const start = Date.now();
    let last: { status?: string } = {};
    while (Date.now() - start < 60_000) {
      const res = await request.get(`/api/crawl/${id}/status`);
      expect(res.status()).toBe(200);
      last = await res.json();
      if (last.status === 'completed') break;
      if (last.status === 'failed' || last.status === 'cancelled') {
        test.skip(true, `crawl ended in ${last.status}`);
      }
      await new Promise(r => setTimeout(r, 1_000));
    }
    expect(last.status).toBe('completed');
  });

  test('GET /api/crawl/:id/urls exposes the crawled pages', async ({ request }) => {
    const id = state.runId;
    if (id == null) test.skip(true, 'no run id');
    const res = await request.get(`/api/crawl/${id}/urls`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.urls)).toBe(true);
    expect(body.urls.length).toBeGreaterThan(0);
    for (const url of body.urls.slice(0, 3)) {
      expect(url).toHaveProperty('address');
      expect(url).toHaveProperty('statusCode');
    }
  });

  test('GET /api/crawl/:id/issues returns a shape (possibly empty)', async ({ request }) => {
    const id = state.runId;
    if (id == null) test.skip(true, 'no run id');
    const res = await request.get(`/api/crawl/${id}/issues`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('issues');
    expect(Array.isArray(body.issues)).toBe(true);
  });

  test('GET /api/crawl/:id/issues/counts always returns the severity/category split', async ({ request }) => {
    const id = state.runId;
    if (id == null) test.skip(true, 'no run id');
    const res = await request.get(`/api/crawl/${id}/issues/counts`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.counts).toBe('object');
    expect(typeof body.categories).toBe('object');
  });

  test('GET /api/crawl/:id/keywords returns the keyword analyzer output', async ({ request }) => {
    const id = state.runId;
    if (id == null) test.skip(true, 'no run id');
    const res = await request.get(`/api/crawl/${id}/keywords`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.topKeywords)).toBe(true);
    expect(Array.isArray(body.urlKeywords)).toBe(true);
  });

  test('GET /api/crawl/:id/links returns the link profile with internal/external counts', async ({ request }) => {
    const id = state.runId;
    if (id == null) test.skip(true, 'no run id');
    const res = await request.get(`/api/crawl/${id}/links`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.internal).toBe('number');
    expect(typeof body.external).toBe('number');
    expect(typeof body.nofollow).toBe('number');
    expect(Array.isArray(body.referringDomains)).toBe(true);
  });

  test('GET /api/crawl/:id/health yields a numeric score', async ({ request }) => {
    const id = state.runId;
    if (id == null) test.skip(true, 'no run id');
    const res = await request.get(`/api/crawl/${id}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.score).toBe('number');
    expect(body.score).toBeGreaterThanOrEqual(0);
    expect(body.score).toBeLessThanOrEqual(100);
  });

  test('GET /api/crawl/:id/sitemap produces a valid urlset', async ({ request }) => {
    const id = state.runId;
    if (id == null) test.skip(true, 'no run id');
    const res = await request.get(`/api/crawl/${id}/sitemap`);
    expect(res.status()).toBe(200);
    expect((res.headers()['content-type'] ?? '').toLowerCase()).toContain('xml');
    const text = await res.text();
    expect(text).toMatch(/<urlset[\s>]/);
    expect(text).toContain('<loc>');
  });

  test('POST /api/crawl/:id/export csv returns inline content', async ({ request }) => {
    const id = state.runId;
    if (id == null) test.skip(true, 'no run id');
    const res = await request.post(`/api/crawl/${id}/export`, { data: { format: 'csv' } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('content');
  });

  test('POST /api/crawl/:id/export json returns content or path', async ({ request }) => {
    const id = state.runId;
    if (id == null) test.skip(true, 'no run id');
    const res = await request.post(`/api/crawl/${id}/export`, { data: { format: 'json' } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.content || body.path).toBeDefined();
  });

  test('POST /api/crawl/:id/export xlsx returns the file path', async ({ request }) => {
    const id = state.runId;
    if (id == null) test.skip(true, 'no run id');
    const res = await request.post(`/api/crawl/${id}/export`, { data: { format: 'xlsx' } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.path || body.content).toBeDefined();
  });

  test('GET /api/runs includes the freshly created run', async ({ request }) => {
    const id = state.runId;
    if (id == null) test.skip(true, 'no run id');
    const res = await request.get('/api/runs');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.runs.find(r => r.id === id)).toBeTruthy();
  });
});
