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
});
