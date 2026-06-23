import { Hono } from 'hono';
import { serve, type ServerType } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import path from 'path';
import fs from 'fs';
import type { CrawlConfig, CrawlProgressEvent, CrawlRun } from '../types/index.js';
import { CrawlEngine } from '../crawler/engine.js';
import { exportCrawlData } from '../exporters/index.js';
import { generateXmlSitemap } from '../exporters/sitemap-xml.js';
import { calculateHealthScore } from '../health-score.js';
import { callAI } from '../ai/index.js';
import { enrichCrawlWithIntegrations } from '../integrations/index.js';
import {
  getCrawlRun,
  getCrawlRuns,
  getDatabase,
  getInlinks,
  getIssueCounts,
  getIssues,
  getOutlinks,
  getUrlById,
  getUrls,
  openDatabase,
} from '../storage/database.js';
import pkg from '../../package.json' with { type: 'json' };
import { parseCrawlConfig } from '../config/index.js';
import { publicDir, crawlsDir, exportsDir } from '../utils/workspace.js';

const engines = new Map<number, CrawlEngine>();
const latestProgress = new Map<number, CrawlProgressEvent>();

function openRunDatabase(runId: number): CrawlRun | null {
  const run = getAllRunById(runId);
  if (!run) return null;
  openDatabase(run.dbPath);
  return run;
}

function getAllRunById(runId: number): CrawlRun | null {
  // First check current database
  try {
    const run = getCrawlRun(runId);
    if (run) return run;
  } catch {
    // ignore
  }

  // Scan all crawl databases
  const dir = crawlsDir();
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.db'));
  for (const file of files) {
    try {
      openDatabase(path.join(dir, file));
      const run = getCrawlRun(runId);
      if (run) return run;
    } catch {
      // ignore
    }
  }
  return null;
}

function getAllRuns(): CrawlRun[] {
  const dir = crawlsDir();
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.db'));
  const runs: CrawlRun[] = [];
  for (const file of files) {
    try {
      openDatabase(path.join(dir, file));
      runs.push(...getCrawlRuns());
    } catch {
      // ignore
    }
  }
  return runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

export async function startServer(port: number): Promise<ServerType> {
  const app = new Hono();

  app.use(cors());
  app.use('*', async (c, next) => {
    c.header('X-Powered-By', 'Open SEO Checker');
    await next();
  });

  app.get('/api/health', c => {
    return c.json({ status: 'ok', version: pkg.version });
  });

  app.post('/api/crawl', async c => {
    try {
      const body = await c.req.json<Partial<CrawlConfig>>();
      if (!body.startUrl) {
        return c.json({ error: 'startUrl is required' }, 400);
      }
      const config = parseCrawlConfig(body);
      const dbName = `crawl-${Date.now()}`;
      const engine = new CrawlEngine(config, { dbName });

      engine.on('progress', event => {
        latestProgress.set(event.runId, event);
      });

      // Start the engine in the background so the API response returns immediately.
      engine.start().catch(err => {
        console.error('Crawl engine error:', err);
      });

      const run = engine.getRun();
      if (!run || !run.id) {
        return c.json({ error: 'Failed to start crawl' }, 500);
      }
      engines.set(run.id, engine);
      return c.json({ runId: run.id, status: run.status });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message }, 500);
    }
  });

  app.get('/api/crawl/:id/status', async c => {
    const runId = parseInt(c.req.param('id'), 10);
    if (Number.isNaN(runId)) return c.json({ error: 'Invalid run id' }, 400);

    try {
      const run = openRunDatabase(runId);
      if (!run) return c.json({ error: 'Run not found' }, 404);
      const progress = latestProgress.get(runId);
      return c.json({ ...run, progress });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message }, 500);
    }
  });

  app.get('/api/crawl/:id/urls', async c => {
    const runId = parseInt(c.req.param('id'), 10);
    if (Number.isNaN(runId)) return c.json({ error: 'Invalid run id' }, 400);

    try {
      const run = openRunDatabase(runId);
      if (!run) return c.json({ error: 'Run not found' }, 404);

      const query = c.req.query();
      const options: Parameters<typeof getUrls>[1] = {};
      if (query.isInternal !== undefined) {
        options.isInternal = query.isInternal === 'true' || query.isInternal === '1';
      }
      if (query.statusCategory) {
        options.statusCategory = query.statusCategory;
      }
      if (query.limit) {
        options.limit = parseInt(query.limit, 10);
      }
      if (query.offset) {
        options.offset = parseInt(query.offset, 10);
      }

      const urls = getUrls(runId, options);
      return c.json({ urls, count: urls.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message }, 500);
    }
  });

  app.get('/api/crawl/:id/issues', async c => {
    const runId = parseInt(c.req.param('id'), 10);
    if (Number.isNaN(runId)) return c.json({ error: 'Invalid run id' }, 400);

    try {
      const run = openRunDatabase(runId);
      if (!run) return c.json({ error: 'Run not found' }, 404);

      const query = c.req.query();
      const issues = getIssues(runId, query.type, query.priority);
      return c.json({ issues, count: issues.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message }, 500);
    }
  });

  app.get('/api/crawl/:id/issues/counts', async c => {
    const runId = parseInt(c.req.param('id'), 10);
    if (Number.isNaN(runId)) return c.json({ error: 'Invalid run id' }, 400);

    try {
      const run = openRunDatabase(runId);
      if (!run) return c.json({ error: 'Run not found' }, 404);
      const counts = getIssueCounts(runId);
      return c.json({ counts });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message }, 500);
    }
  });

  app.post('/api/crawl/:id/export', async c => {
    const runId = parseInt(c.req.param('id'), 10);
    if (Number.isNaN(runId)) return c.json({ error: 'Invalid run id' }, 400);

    try {
      const run = openRunDatabase(runId);
      if (!run) return c.json({ error: 'Run not found' }, 404);

      const body = await c.req.json<{ format?: 'csv' | 'json' | 'xlsx'; filePath?: string }>();
      if (!body.format || !['csv', 'json', 'xlsx'].includes(body.format)) {
        return c.json({ error: 'format is required and must be csv, json, or xlsx' }, 400);
      }

      if (body.filePath) {
        const filePath = path.resolve(body.filePath);
        const exportDir = path.dirname(filePath);
        if (!fs.existsSync(exportDir)) {
          fs.mkdirSync(exportDir, { recursive: true });
        }
        const result = await exportCrawlData(runId, { format: body.format, filePath });
        return c.json({ path: result });
      }

      if (body.format === 'xlsx') {
        const dir = exportsDir();
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const filePath = path.join(dir, `crawl-${runId}.xlsx`);
        const result = await exportCrawlData(runId, { format: body.format, filePath });
        return c.json({ path: result });
      }

      const content = await exportCrawlData(runId, { format: body.format });
      return c.json({ content });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message }, 500);
    }
  });

  app.get('/api/crawl/:id/url/:urlId', async c => {
    const runId = parseInt(c.req.param('id'), 10);
    const urlId = parseInt(c.req.param('urlId'), 10);
    if (Number.isNaN(runId) || Number.isNaN(urlId)) {
      return c.json({ error: 'Invalid run id or url id' }, 400);
    }

    try {
      const run = openRunDatabase(runId);
      if (!run) return c.json({ error: 'Run not found' }, 404);

      const url = getUrlById(urlId);
      if (!url) return c.json({ error: 'URL not found' }, 404);

      const inlinks = getInlinks(runId, url.normalizedAddress);
      const outlinks = getOutlinks(runId, urlId);
      return c.json({ url, inlinks, outlinks });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message }, 500);
    }
  });

  app.get('/api/runs', async c => {
    try {
      const runs = getAllRuns();
      return c.json({ runs });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message }, 500);
    }
  });

  app.get('/api/crawl/:id/sitemap', async c => {
    const runId = parseInt(c.req.param('id'), 10);
    if (Number.isNaN(runId)) return c.json({ error: 'Invalid run id' }, 400);

    try {
      const run = openRunDatabase(runId);
      if (!run) return c.json({ error: 'Run not found' }, 404);
      const sitemap = generateXmlSitemap(runId, { includeImages: true });
      c.header('Content-Type', 'application/xml');
      return c.body(sitemap);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message }, 500);
    }
  });

  app.get('/api/crawl/:id/health', async c => {
    const runId = parseInt(c.req.param('id'), 10);
    if (Number.isNaN(runId)) return c.json({ error: 'Invalid run id' }, 400);

    try {
      const run = openRunDatabase(runId);
      if (!run) return c.json({ error: 'Run not found' }, 404);
      const result = calculateHealthScore(runId);
      return c.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message }, 500);
    }
  });

  app.post('/api/crawl/:id/integrations', async c => {
    const runId = parseInt(c.req.param('id'), 10);
    if (Number.isNaN(runId)) return c.json({ error: 'Invalid run id' }, 400);

    try {
      const run = openRunDatabase(runId);
      if (!run) return c.json({ error: 'Run not found' }, 404);
      const config = parseCrawlConfig(JSON.parse(run.config));
      await enrichCrawlWithIntegrations(runId, config);
      return c.json({ status: 'ok', message: 'Integration enrichment started' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message }, 500);
    }
  });

  app.post('/api/ai', async c => {
    try {
      const body = await c.req.json<{ provider: string; model: string; prompt: string; apiKey: string }>();
      if (!body.provider || !body.model || !body.prompt || !body.apiKey) {
        return c.json({ error: 'provider, model, prompt, and apiKey are required' }, 400);
      }
      const result = await callAI({
        provider: body.provider as any,
        model: body.model,
        prompt: body.prompt,
        apiKey: body.apiKey,
      });
      return c.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message }, 500);
    }
  });

  // Static files
  app.use('*', serveStatic({ root: publicDir() }));

  // SPA fallback
  app.get('*', c => {
    const indexPath = path.join(publicDir(), 'index.html');
    if (fs.existsSync(indexPath)) {
      return c.html(fs.readFileSync(indexPath, 'utf8'));
    }
    return c.notFound();
  });

  return new Promise(resolve => {
    const server = serve({
      fetch: app.fetch,
      port,
    }, () => {
      resolve(server);
    });
  });
}

// Unused helper for direct database access if needed
export function getDb(): ReturnType<typeof getDatabase> {
  return getDatabase();
}
