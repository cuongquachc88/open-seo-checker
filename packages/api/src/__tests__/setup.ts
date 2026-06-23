/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Vitest helpers for the API analyzer suites.
 *
 * Each test file gets a fresh better-sqlite3 database opened via the
 * production `openDatabase()` so the schema is identical to runtime.
 * The DB lives in os.tmpdir() under `oseo-test-<pid>-<random>.db` and
 * is deleted automatically when the file handle closes.
 */
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll } from 'vitest';

import {
  closeDatabase,
  createCrawlRun,
  getDatabase,
  insertUrl,
  openDatabase,
} from '../storage/database.js';
import type { CrawlConfig, CrawlRun, CrawlUrl } from '../types/index.js';

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oseo-test-'));
  openDatabase(join(tmpDir, 'crawl.db'));
});

afterAll(() => {
  closeDatabase();
  if (tmpDir) {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
});

/** Minimum config needed to satisfy createCrawlRun's contract. */
export function makeConfig(): CrawlConfig {
  return {
    startUrl: 'https://example.com/',
    mode: 'spider',
    maxUrls: 100,
    maxDepth: 5,
    threads: 4,
    userAgent: 'OpenSEOTest/1.0',
    respectRobotsTxt: true,
    allowSubdomains: false,
    crawlExternal: false,
    followRedirects: true,
    queryStringHandling: 'keep',
    excludePatterns: [],
    includePatterns: [],
    renderJs: false,
    useSitemaps: false,
  } as CrawlConfig;
}

/** Create a fresh crawl run under the test DB. */
export function makeRun(name = 'test'): CrawlRun {
  return createCrawlRun(name, 'https://example.com/', makeConfig());
}

/** Insert a URL into a run with sensible defaults. */
export function makeUrl(
  runId: number,
  overrides: Partial<CrawlUrl> & { address: string },
): number {
  const base: CrawlUrl = {
    address: overrides.address,
    normalizedAddress: overrides.address,
    indexability: 'indexable',
    crawlDepth: 0,
    folderDepth: 0,
    isInternal: true,
    isExternal: false,
  };
  const merged = { ...base, ...overrides };
  return insertUrl(runId, merged);
}

/** Run an SQL query against the open DB. */
export function query<T = any>(sql: string, params: any[] = []): T[] {
  return getDatabase().prepare(sql).all(...params) as T[];
}

/** Re-export getDatabase so test files can insert e.g. raw image rows. */
export { getDatabase };
