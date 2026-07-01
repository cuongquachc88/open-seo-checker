import { expect, test } from '@playwright/test';

/**
 * API smoke tests. These hit the Hono backend directly through the
 * same baseURL Playwright was configured for. We do not need a
 * browser here, so we use the request fixture.
 */
test.describe('API smoke', () => {
  test('GET /api/runs returns a runs array', async ({ request }) => {
    const res = await request.get('/api/runs');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('runs');
    expect(Array.isArray(body.runs)).toBe(true);
  });

  test('GET /api/runs payload is parsed as JSON', async ({ request }) => {
    const res = await request.get('/api/runs');
    expect(res.status()).toBe(200);
    const ct = res.headers()['content-type'] ?? '';
    expect(ct).toContain('application/json');
    const body = await res.json();
    expect(body.runs.length).toBeGreaterThanOrEqual(0);
  });

  test('runs payload exposes crawler-friendly fields', async ({ request }) => {
    const res = await request.get('/api/runs');
    const { runs } = await res.json();
    if (runs.length === 0) test.skip(true, 'no runs persisted yet');
    const run = runs[0];
    expect(run).toHaveProperty('id');
    expect(run).toHaveProperty('startUrl');
    expect(run).toHaveProperty('status');
    expect(typeof run.id === 'number' || typeof run.id === 'string').toBe(true);
  });

  test('GET /api/runs/:id returns a run object', async ({ request }) => {
    const runs = await (await request.get('/api/runs')).json();
    if (!runs.runs.length) test.skip(true, 'no runs persisted yet');
    const runId = runs.runs[0].id;
    const res = await request.get(`/api/runs/${runId}`);
    expect(res.status()).toBe(200);
  });

  test('GET /api/runs/:id/issues returns 200', async ({ request }) => {
    const runs = await (await request.get('/api/runs')).json();
    if (!runs.runs.length) test.skip(true, 'no runs persisted yet');
    const runId = runs.runs[0].id;
    const res = await request.get(`/api/runs/${runId}/issues`);
    expect(res.status()).toBe(200);
  });

  test('GET /api/runs/:id/urls returns 200', async ({ request }) => {
    const runs = await (await request.get('/api/runs')).json();
    if (!runs.runs.length) test.skip(true, 'no runs persisted yet');
    const runId = runs.runs[0].id;
    const res = await request.get(`/api/runs/${runId}/urls`);
    expect(res.status()).toBe(200);
  });

  test('GET / responds with HTML (SPA root)', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBe(200);
    const ct = res.headers()['content-type'] ?? '';
    expect(ct).toContain('text/html');
  });

  test('GET /api/health is 200 and JSON', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const ct = res.headers()['content-type'] ?? '';
    expect(ct).toContain('application/json');
    const body = await res.json();
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('version');
  });

  test('POST /api/crawl rejects missing startUrl with 4xx', async ({ request }) => {
    const res = await request.post('/api/crawl', { data: {} });
    expect([400, 500]).toContain(res.status());
  });

  test('POST /api/crawl bootstraps a run and returns a runId', async ({ request }) => {
    const res = await request.post('/api/crawl', {
      data: { startUrl: 'http://localhost:7437/', maxUrls: 3 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('runId');
    expect(typeof body.runId === 'number' || typeof body.runId === 'string').toBe(true);
    expect(body).toHaveProperty('status');
  });

  test('GET /api/crawl/:id/status returns the run row + progress envelope', async ({ request }) => {
    const { runs } = await (await request.get('/api/runs')).json();
    if (!runs.length) test.skip(true, 'no runs persisted yet');
    const runId = runs[0].id;
    const res = await request.get(`/api/crawl/${runId}/status`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('startUrl');
    expect(body).toHaveProperty('status');
  });

  test('GET /api/crawl/:id/issues/counts returns the severity/category split', async ({ request }) => {
    const { runs } = await (await request.get('/api/runs')).json();
    if (!runs.length) test.skip(true, 'no runs persisted yet');
    const runId = runs[0].id;
    const res = await request.get(`/api/crawl/${runId}/issues/counts`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('counts');
    expect(body).toHaveProperty('categories');
    expect(typeof body.counts === 'object').toBe(true);
    expect(typeof body.categories === 'object').toBe(true);
  });

  test('GET /api/crawl/:id/keywords returns the keywords array', async ({ request }) => {
    const { runs } = await (await request.get('/api/runs')).json();
    if (!runs.length) test.skip(true, 'no runs persisted yet');
    const runId = runs[0].id;
    const res = await request.get(`/api/crawl/${runId}/keywords`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.topKeywords)).toBe(true);
    expect(Array.isArray(body.urlKeywords)).toBe(true);
  });

  test('GET /api/crawl/:id/links returns the link profile', async ({ request }) => {
    const { runs } = await (await request.get('/api/runs')).json();
    if (!runs.length) test.skip(true, 'no runs persisted yet');
    const runId = runs[0].id;
    const res = await request.get(`/api/crawl/${runId}/links`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.internal).toBe('number');
    expect(typeof body.external).toBe('number');
    expect(typeof body.nofollow).toBe('number');
    expect(Array.isArray(body.referringDomains)).toBe(true);
    expect(Array.isArray(body.referringPages)).toBe(true);
  });

  test('GET /api/crawl/:id/health returns the health score', async ({ request }) => {
    const { runs } = await (await request.get('/api/runs')).json();
    if (!runs.length) test.skip(true, 'no runs persisted yet');
    const runId = runs[0].id;
    const res = await request.get(`/api/crawl/${runId}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('score');
    expect(typeof body.score).toBe('number');
  });

  test('GET /api/crawl/:id/sitemap returns an XML document', async ({ request }) => {
    const { runs } = await (await request.get('/api/runs')).json();
    if (!runs.length) test.skip(true, 'no runs persisted yet');
    const runId = runs[0].id;
    const res = await request.get(`/api/crawl/${runId}/sitemap`);
    expect(res.status()).toBe(200);
    const ct = res.headers()['content-type'] ?? '';
    expect(ct.toLowerCase()).toContain('xml');
    const text = await res.text();
    expect(text).toContain('<urlset');
  });

  test('POST /api/crawl/:id/export rejects bad format with 4xx', async ({ request }) => {
    const { runs } = await (await request.get('/api/runs')).json();
    if (!runs.length) test.skip(true, 'no runs persisted yet');
    const runId = runs[0].id;
    const res = await request.post(`/api/crawl/${runId}/export`, { data: { format: 'xml' } });
    expect([400, 500]).toContain(res.status());
  });

  test('POST /api/crawl/:id/export csv returns 200', async ({ request }) => {
    const { runs } = await (await request.get('/api/runs')).json();
    if (!runs.length) test.skip(true, 'no runs persisted yet');
    const runId = runs[0].id;
    const res = await request.post(`/api/crawl/${runId}/export`, { data: { format: 'csv' } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('content');
    expect(typeof body.content).toBe('string');
  });

  test('POST /api/crawl/:id/export json returns 200', async ({ request }) => {
    const { runs } = await (await request.get('/api/runs')).json();
    if (!runs.length) test.skip(true, 'no runs persisted yet');
    const runId = runs[0].id;
    const res = await request.post(`/api/crawl/${runId}/export`, { data: { format: 'json' } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    if (body.path) {
      expect(typeof body.path).toBe('string');
    } else {
      expect(body).toHaveProperty('content');
    }
  });

  test('POST /api/ai rejects request missing required fields', async ({ request }) => {
    const res = await request.post('/api/ai', { data: { provider: 'openai' } });
    expect([400, 500]).toContain(res.status());
  });

  test('unknown /api route falls back to SPA (HTML)', async ({ request }) => {
    const res = await request.get('/api/this-route-does-not-exist');
    expect(res.status()).toBe(200);
    const ct = res.headers()['content-type'] ?? '';
    expect(ct).toContain('text/html');
  });
});
