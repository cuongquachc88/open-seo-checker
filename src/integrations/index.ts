import type { CrawlConfig } from '../types/index.js';
import { getDatabase, getUrls } from '../storage/database.js';
import { fetchGa4Data } from './ga4.js';
import { fetchGscData } from './gsc.js';
import { fetchPageSpeedData } from './psi.js';
import { fetchMajesticMetrics } from './majestic.js';
import { fetchAhrefsMetrics } from './ahrefs.js';
import { fetchMozMetrics } from './moz.js';

export * from './oauth.js';
export * from './ga4.js';
export * from './gsc.js';
export * from './psi.js';
export * from './majestic.js';
export * from './ahrefs.js';
export * from './moz.js';

export async function enrichCrawlWithIntegrations(runId: number, config: CrawlConfig): Promise<void> {
  const apiKeys = config.apiKeys ?? {};
  const configuredApis = Object.entries(apiKeys).filter(([key, value]) => {
    const relevant = ['ga4', 'gsc', 'psi', 'majestic', 'ahrefs', 'moz'];
    return relevant.includes(key) && typeof value === 'string' && value.length > 0;
  });

  if (configuredApis.length === 0) {
    return;
  }

  let urls: { id?: number; address: string; isInternal: boolean }[] = [];
  try {
    const db = getDatabase();
    urls = getUrls(runId, { isInternal: true }).map(u => ({
      id: u.id,
      address: u.address,
      isInternal: u.isInternal,
    }));

    db.exec(`
      CREATE TABLE IF NOT EXISTS integration_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        crawl_run_id INTEGER NOT NULL REFERENCES crawl_runs(id) ON DELETE CASCADE,
        url_id INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        source TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_integration_data_run ON integration_data(crawl_run_id);
      CREATE INDEX IF NOT EXISTS idx_integration_data_url ON integration_data(url_id);
      CREATE INDEX IF NOT EXISTS idx_integration_data_source ON integration_data(source);
    `);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[integrations] Cannot open database for run ${runId}: ${message}`);
    return;
  }

  for (const [apiName] of configuredApis) {
    console.log(`[integrations] Would integrate ${apiName.toUpperCase()} for run ${runId} (${urls.length} URLs)`);
  }

  if (apiKeys.psi && urls.length > 0) {
    const sampleUrls = urls.slice(0, 5);
    for (const url of sampleUrls) {
      try {
        const data = await fetchPageSpeedData(url.address, apiKeys.psi, 'mobile');
        console.log(`[integrations] PageSpeed sample for ${url.address}: score=${data.performanceScore ?? 'n/a'}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[integrations] PageSpeed failed for ${url.address}: ${message}`);
      }
    }
  }
}
