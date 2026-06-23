import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type { CrawlConfig, CrawlIssue, CrawlLink, CrawlRun, CrawlUrl } from '../types/index.js';
import { crawlsDir } from '../utils/workspace.js';

let currentDb: Database.Database | null = null;
let currentDbPath: string | null = null;

export function getDbPath(name: string): string {
  const dir = crawlsDir();
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(dir, `${safeName}.db`);
}

export function openDatabase(dbPath: string): Database.Database {
  if (currentDb && currentDbPath === dbPath) {
    return currentDb;
  }
  closeDatabase();

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');
  db.pragma('mmap_size = 30000000000');

  currentDb = db;
  currentDbPath = dbPath;
  initializeSchema(db);
  return db;
}

export function getDatabase(): Database.Database {
  if (!currentDb) {
    throw new Error('No database open. Call openDatabase() first.');
  }
  return currentDb;
}

export function closeDatabase(): void {
  if (currentDb) {
    currentDb.close();
    currentDb = null;
    currentDbPath = null;
  }
}

export function getCurrentDbPath(): string | null {
  return currentDbPath;
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS crawl_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_url TEXT NOT NULL,
      config TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      started_at TEXT NOT NULL,
      completed_at TEXT,
      urls_crawled INTEGER DEFAULT 0,
      urls_found INTEGER DEFAULT 0,
      errors INTEGER DEFAULT 0,
      redirects INTEGER DEFAULT 0,
      blocked INTEGER DEFAULT 0,
      db_path TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crawl_run_id INTEGER NOT NULL REFERENCES crawl_runs(id) ON DELETE CASCADE,
      address TEXT NOT NULL,
      normalized_address TEXT NOT NULL,
      content_type TEXT,
      status_code INTEGER,
      status TEXT,
      status_category TEXT,
      indexability TEXT NOT NULL DEFAULT 'indexable',
      indexability_status TEXT,
      title1 TEXT,
      title1_length INTEGER,
      title1_pixel_width INTEGER,
      title2 TEXT,
      title2_length INTEGER,
      meta_description1 TEXT,
      meta_description1_length INTEGER,
      meta_description1_pixel_width INTEGER,
      meta_description2 TEXT,
      meta_description2_length INTEGER,
      meta_keywords1 TEXT,
      meta_keywords1_length INTEGER,
      meta_keywords2 TEXT,
      meta_keywords2_length INTEGER,
      h1 TEXT,
      h1_length INTEGER,
      h2 TEXT,
      h2_length INTEGER,
      h1_count INTEGER DEFAULT 0,
      h2_count INTEGER DEFAULT 0,
      meta_robots TEXT,
      x_robots_tag TEXT,
      canonical TEXT,
      canonical_header TEXT,
      rel_next TEXT,
      rel_prev TEXT,
      http_rel_next TEXT,
      http_rel_prev TEXT,
      content_length INTEGER,
      transferred_size INTEGER,
      total_transferred_size INTEGER,
      word_count INTEGER,
      text_ratio REAL,
      crawl_depth INTEGER NOT NULL DEFAULT 0,
      folder_depth INTEGER NOT NULL DEFAULT 0,
      link_score REAL,
      inlinks INTEGER DEFAULT 0,
      unique_inlinks INTEGER DEFAULT 0,
      unique_js_inlinks INTEGER DEFAULT 0,
      percent_of_total REAL,
      outlinks INTEGER DEFAULT 0,
      unique_outlinks INTEGER DEFAULT 0,
      unique_js_outlinks INTEGER DEFAULT 0,
      external_outlinks INTEGER DEFAULT 0,
      unique_external_outlinks INTEGER DEFAULT 0,
      unique_external_js_outlinks INTEGER DEFAULT 0,
      response_time REAL,
      last_modified TEXT,
      redirect_url TEXT,
      redirect_type TEXT,
      http_version TEXT,
      url_encoded_address TEXT,
      hash TEXT,
      url_length INTEGER,
      is_internal INTEGER NOT NULL DEFAULT 1,
      is_external INTEGER NOT NULL DEFAULT 0,
      has_mixed_content INTEGER DEFAULT 0,
      is_secure INTEGER DEFAULT 1,
      spelling_errors INTEGER DEFAULT 0,
      grammar_errors INTEGER DEFAULT 0,
      language TEXT,
      closest_similarity_match REAL,
      near_duplicate_count INTEGER DEFAULT 0,
      extracted_custom TEXT,
      ai_results TEXT,
      raw_html TEXT,
      rendered_html TEXT,
      headers TEXT,
      cookies TEXT,
      redirect_chain TEXT,
      resource_urls TEXT,
      crawled_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_urls_crawl_run ON urls(crawl_run_id);
    CREATE INDEX IF NOT EXISTS idx_urls_normalized ON urls(normalized_address);
    CREATE INDEX IF NOT EXISTS idx_urls_status ON urls(status_code);
    CREATE INDEX IF NOT EXISTS idx_urls_internal ON urls(is_internal);
    CREATE INDEX IF NOT EXISTS idx_urls_indexability ON urls(indexability);

    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crawl_run_id INTEGER NOT NULL REFERENCES crawl_runs(id) ON DELETE CASCADE,
      source_url_id INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
      source_url TEXT NOT NULL,
      target_url TEXT NOT NULL,
      target_normalized_url TEXT NOT NULL,
      is_internal INTEGER NOT NULL DEFAULT 1,
      is_external INTEGER NOT NULL DEFAULT 0,
      is_image INTEGER DEFAULT 0,
      is_script INTEGER DEFAULT 0,
      is_stylesheet INTEGER DEFAULT 0,
      anchor_text TEXT,
      alt_text TEXT,
      link_type TEXT NOT NULL,
      rel TEXT,
      target TEXT,
      nofollow INTEGER DEFAULT 0,
      noreferrer INTEGER DEFAULT 0,
      noopener INTEGER DEFAULT 0,
      sponsored INTEGER DEFAULT 0,
      ugc INTEGER DEFAULT 0,
      location TEXT NOT NULL DEFAULT 'html',
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_links_crawl_run ON links(crawl_run_id);
    CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_url_id);
    CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_normalized_url);
    CREATE INDEX IF NOT EXISTS idx_links_internal ON links(is_internal);

    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crawl_run_id INTEGER NOT NULL REFERENCES crawl_runs(id) ON DELETE CASCADE,
      url_id INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      detail TEXT,
      how_to_fix TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_issues_crawl_run ON issues(crawl_run_id);
    CREATE INDEX IF NOT EXISTS idx_issues_type ON issues(type);
    CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority);
    CREATE INDEX IF NOT EXISTS idx_issues_url ON issues(url_id);

    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crawl_run_id INTEGER NOT NULL REFERENCES crawl_runs(id) ON DELETE CASCADE,
      source_url_id INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      alt TEXT,
      width INTEGER,
      height INTEGER,
      size INTEGER,
      format TEXT,
      is_background INTEGER DEFAULT 0,
      missing_alt INTEGER DEFAULT 0,
      oversized INTEGER DEFAULT 0,
      missing_dimensions INTEGER DEFAULT 0,
      status_code INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_images_crawl_run ON images(crawl_run_id);
    CREATE INDEX IF NOT EXISTS idx_images_source ON images(source_url_id);

    CREATE TABLE IF NOT EXISTS structured_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crawl_run_id INTEGER NOT NULL REFERENCES crawl_runs(id) ON DELETE CASCADE,
      url_id INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      type TEXT NOT NULL,
      format TEXT NOT NULL,
      data TEXT NOT NULL,
      errors TEXT,
      warnings TEXT,
      rich_result_eligible INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_structured_data_crawl_run ON structured_data(crawl_run_id);
    CREATE INDEX IF NOT EXISTS idx_structured_data_url ON structured_data(url_id);
  `);
}

let runIdCounter = 0;

function generateRunId(): number {
  // Combine millisecond timestamp with a per-process counter so two runs
  // created in the same millisecond never collide. Result fits safely
  // inside JavaScript's exact-integer range (< 2^53) and SQLite integer.
  return Date.now() * 1000 + (++runIdCounter % 1000);
}

export function createCrawlRun(name: string, startUrl: string, config: CrawlConfig): CrawlRun {
  const db = getDatabase();
  const stmt = db.prepare(
    `INSERT INTO crawl_runs (id, name, start_url, config, status, started_at, db_path)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const startedAt = new Date().toISOString();
  const dbPath = getCurrentDbPath() || '';
  const id = generateRunId();
  stmt.run(id, name, startUrl, JSON.stringify(config), 'running', startedAt, dbPath);
  return {
    id,
    name,
    startUrl,
    config: JSON.stringify(config),
    status: 'running',
    startedAt,
    urlsCrawled: 0,
    urlsFound: 0,
    errors: 0,
    redirects: 0,
    blocked: 0,
    dbPath,
  };
}

export function updateCrawlRun(
  runId: number,
  updates: Partial<CrawlRun>
): void {
  const db = getDatabase();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [key, value] of Object.entries(updates)) {
    const column = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      values.push(value ?? null);
    }
  }

  if (fields.length === 0) return;
  values.push(runId);

  const stmt = db.prepare(`UPDATE crawl_runs SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
}

export function getCrawlRun(runId: number): CrawlRun | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM crawl_runs WHERE id = ?').get(runId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToCrawlRun(row);
}

export function getCrawlRuns(): CrawlRun[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM crawl_runs ORDER BY started_at DESC').all() as Record<string, unknown>[];
  return rows.map(rowToCrawlRun);
}

export function insertUrl(crawlRunId: number, url: CrawlUrl): number {
  const db = getDatabase();
  const columns = Object.keys(urlToDbRow(url, crawlRunId));
  const placeholders = columns.map(() => '?').join(', ');
  const stmt = db.prepare(`INSERT INTO urls (${columns.join(', ')}) VALUES (${placeholders})`);
  const result = stmt.run(...Object.values(urlToDbRow(url, crawlRunId)));
  return Number(result.lastInsertRowid);
}

export function updateUrl(urlId: number, url: Partial<CrawlUrl>): void {
  const db = getDatabase();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [key, value] of Object.entries(url)) {
    const column = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase()).replace(/extracted_custom|ai_results/, m => m);
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      if (key === 'extractedCustom' || key === 'aiResults') {
        values.push(JSON.stringify(value));
      } else if (key === 'headers' || key === 'redirectChain' || key === 'resourceUrls') {
        values.push(Array.isArray(value) ? JSON.stringify(value) : (value as unknown as string) ?? null);
      } else {
        values.push(value as string | number | null ?? null);
      }
    }
  }

  if (fields.length === 0) return;
  values.push(urlId);

  const stmt = db.prepare(`UPDATE urls SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
}

export function getUrlByNormalized(crawlRunId: number, normalizedUrl: string): CrawlUrl | null {
  const db = getDatabase();
  const row = db.prepare(
    'SELECT * FROM urls WHERE crawl_run_id = ? AND normalized_address = ?'
  ).get(crawlRunId, normalizedUrl) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToUrl(row);
}

export function getUrlById(urlId: number): CrawlUrl | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM urls WHERE id = ?').get(urlId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToUrl(row);
}

export function insertLinks(crawlRunId: number, links: CrawlLink[]): void {
  if (links.length === 0) return;
  const db = getDatabase();
  const columns = Object.keys(linkToDbRow(links[0], crawlRunId));
  const placeholders = columns.map(() => '?').join(', ');
  const stmt = db.prepare(`INSERT INTO links (${columns.join(', ')}) VALUES (${placeholders})`);

  const insertMany = db.transaction((items: CrawlLink[]) => {
    for (const item of items) {
      stmt.run(...Object.values(linkToDbRow(item, crawlRunId)));
    }
  });

  insertMany(links);
}

export function insertIssues(crawlRunId: number, issues: CrawlIssue[]): void {
  if (issues.length === 0) return;
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO issues (crawl_run_id, url_id, url, type, category, priority, title, description, detail, how_to_fix)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: CrawlIssue[]) => {
    for (const item of items) {
      stmt.run(
        crawlRunId,
        item.urlId,
        item.url,
        item.type,
        item.category,
        item.priority,
        item.title,
        item.description,
        item.detail ?? null,
        item.howToFix ?? null
      );
    }
  });

  insertMany(issues);
}

export interface ImageRecord {
  sourceUrlId: number;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  size?: number;
  format?: string;
  isBackground?: boolean;
  missingAlt?: boolean;
  oversized?: boolean;
  missingDimensions?: boolean;
  statusCode?: number;
}

export function insertImages(crawlRunId: number, images: ImageRecord[]): void {
  if (images.length === 0) return;
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO images (crawl_run_id, source_url_id, url, alt, width, height, size, format, is_background, missing_alt, oversized, missing_dimensions, status_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: ImageRecord[]) => {
    for (const item of items) {
      stmt.run(
        crawlRunId,
        item.sourceUrlId,
        item.url,
        item.alt ?? null,
        item.width ?? null,
        item.height ?? null,
        item.size ?? null,
        item.format ?? null,
        item.isBackground ? 1 : 0,
        item.missingAlt ? 1 : 0,
        item.oversized ? 1 : 0,
        item.missingDimensions ? 1 : 0,
        item.statusCode ?? null
      );
    }
  });

  insertMany(images);
}

export function getImages(crawlRunId: number, sourceUrlId?: number): ImageRecord[] {
  const db = getDatabase();
  if (sourceUrlId !== undefined) {
    const rows = db.prepare('SELECT * FROM images WHERE crawl_run_id = ? AND source_url_id = ?').all(crawlRunId, sourceUrlId) as Record<string, unknown>[];
    return rows.map(rowToImage);
  }
  const rows = db.prepare('SELECT * FROM images WHERE crawl_run_id = ?').all(crawlRunId) as Record<string, unknown>[];
  return rows.map(rowToImage);
}

export interface StructuredDataRecord {
  urlId: number;
  url: string;
  type: 'json-ld' | 'microdata' | 'rdfa';
  format: string;
  data: unknown;
  errors?: string[];
  warnings?: string[];
  richResultEligible?: boolean;
}

export function insertStructuredData(crawlRunId: number, records: StructuredDataRecord[]): void {
  if (records.length === 0) return;
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO structured_data (crawl_run_id, url_id, url, type, format, data, errors, warnings, rich_result_eligible)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: StructuredDataRecord[]) => {
    for (const item of items) {
      stmt.run(
        crawlRunId,
        item.urlId,
        item.url,
        item.type,
        item.format,
        JSON.stringify(item.data),
        item.errors ? JSON.stringify(item.errors) : null,
        item.warnings ? JSON.stringify(item.warnings) : null,
        item.richResultEligible ? 1 : 0
      );
    }
  });

  insertMany(records);
}

export function getStructuredData(crawlRunId: number): StructuredDataRecord[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM structured_data WHERE crawl_run_id = ?').all(crawlRunId) as Record<string, unknown>[];
  return rows.map(rowToStructuredData);
}

export function getUrls(
  crawlRunId: number,
  options: {
    isInternal?: boolean;
    statusCategory?: string;
    contentType?: string;
    limit?: number;
    offset?: number;
  } = {}
): CrawlUrl[] {
  const db = getDatabase();
  const conditions: string[] = ['crawl_run_id = ?'];
  const values: (string | number)[] = [crawlRunId];

  if (options.isInternal !== undefined) {
    conditions.push('is_internal = ?');
    values.push(options.isInternal ? 1 : 0);
  }
  if (options.statusCategory) {
    conditions.push('status_category = ?');
    values.push(options.statusCategory);
  }
  if (options.contentType) {
    conditions.push('content_type = ?');
    values.push(options.contentType);
  }

  const where = conditions.join(' AND ');
  const limit = options.limit ? `LIMIT ${options.limit}` : '';
  const offset = options.offset ? `OFFSET ${options.offset}` : '';

  const rows = db.prepare(
    `SELECT * FROM urls WHERE ${where} ${limit} ${offset}`
  ).all(...values) as Record<string, unknown>[];
  return rows.map(rowToUrl);
}

export function getIssues(crawlRunId: number, type?: string, priority?: string): CrawlIssue[] {
  const db = getDatabase();
  const conditions: string[] = ['crawl_run_id = ?'];
  const values: (string | number)[] = [crawlRunId];

  if (type) {
    conditions.push('type = ?');
    values.push(type);
  }
  if (priority) {
    conditions.push('priority = ?');
    values.push(priority);
  }

  const rows = db.prepare(
    `SELECT * FROM issues WHERE ${conditions.join(' AND ')} ORDER BY priority, created_at`
  ).all(...values) as Record<string, unknown>[];
  return rows.map(rowToIssue);
}

export function updateIssue(issueId: number, updates: Partial<CrawlIssue>): void {
  const db = getDatabase();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      const column = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
      fields.push(`${column} = ?`);
      values.push(value as string | number | null ?? null);
    }
  }

  if (fields.length === 0) return;
  values.push(issueId);

  const stmt = db.prepare(`UPDATE issues SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
}

export function getIssueCounts(crawlRunId: number): { type: string; priority: string; count: number }[] {
  const db = getDatabase();
  return db.prepare(
    `SELECT type, priority, COUNT(*) as count FROM issues WHERE crawl_run_id = ? GROUP BY type, priority`
  ).all(crawlRunId) as { type: string; priority: string; count: number }[];
}

export function getInlinks(crawlRunId: number, normalizedUrl: string): CrawlLink[] {
  const db = getDatabase();
  const rows = db.prepare(
    `SELECT * FROM links WHERE crawl_run_id = ? AND target_normalized_url = ? ORDER BY source_url`
  ).all(crawlRunId, normalizedUrl) as Record<string, unknown>[];
  return rows.map(rowToLink);
}

export function getOutlinks(crawlRunId: number, urlId: number): CrawlLink[] {
  const db = getDatabase();
  const rows = db.prepare(
    `SELECT * FROM links WHERE crawl_run_id = ? AND source_url_id = ? ORDER BY target_url`
  ).all(crawlRunId, urlId) as Record<string, unknown>[];
  return rows.map(rowToLink);
}

export function countUrls(crawlRunId: number, options: { isInternal?: boolean } = {}): number {
  const db = getDatabase();
  if (options.isInternal !== undefined) {
    const row = db.prepare(
      'SELECT COUNT(*) as count FROM urls WHERE crawl_run_id = ? AND is_internal = ?'
    ).get(crawlRunId, options.isInternal ? 1 : 0) as { count: number };
    return row.count;
  }
  const row = db.prepare('SELECT COUNT(*) as count FROM urls WHERE crawl_run_id = ?').get(crawlRunId) as { count: number };
  return row.count;
}

export function getLinksForAnalysis(crawlRunId: number): { source_url_id: number; target_normalized_url: string; is_internal: number; nofollow: number }[] {
  const db = getDatabase();
  return db.prepare(
    `SELECT source_url_id, target_normalized_url, is_internal, nofollow FROM links WHERE crawl_run_id = ?`
  ).all(crawlRunId) as { source_url_id: number; target_normalized_url: string; is_internal: number; nofollow: number }[];
}

export function updateLinkCounts(urlId: number, updates: Partial<Pick<CrawlUrl, 'inlinks' | 'uniqueInlinks' | 'outlinks' | 'uniqueOutlinks' | 'externalOutlinks' | 'uniqueExternalOutlinks' | 'linkScore' | 'percentOfTotal'>>): void {
  const db = getDatabase();
  const fields: string[] = [];
  const values: (number | null)[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      const column = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
      fields.push(`${column} = ?`);
      values.push(value ?? null);
    }
  }
  if (fields.length === 0) return;
  values.push(urlId);

  const stmt = db.prepare(`UPDATE urls SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
}

function urlToDbRow(url: CrawlUrl, crawlRunId: number): Record<string, unknown> {
  return {
    crawl_run_id: crawlRunId,
    address: url.address,
    normalized_address: url.normalizedAddress,
    content_type: url.contentType ?? null,
    status_code: url.statusCode ?? null,
    status: url.status ?? null,
    status_category: url.statusCategory ?? null,
    indexability: url.indexability,
    indexability_status: url.indexabilityStatus ?? null,
    title1: url.title1 ?? null,
    title1_length: url.title1Length ?? null,
    title1_pixel_width: url.title1PixelWidth ?? null,
    title2: url.title2 ?? null,
    title2_length: url.title2Length ?? null,
    meta_description1: url.metaDescription1 ?? null,
    meta_description1_length: url.metaDescription1Length ?? null,
    meta_description1_pixel_width: url.metaDescription1PixelWidth ?? null,
    meta_description2: url.metaDescription2 ?? null,
    meta_description2_length: url.metaDescription2Length ?? null,
    meta_keywords1: url.metaKeywords1 ?? null,
    meta_keywords1_length: url.metaKeywords1Length ?? null,
    meta_keywords2: url.metaKeywords2 ?? null,
    meta_keywords2_length: url.metaKeywords2Length ?? null,
    h1: url.h1 ?? null,
    h1_length: url.h1Length ?? null,
    h2: url.h2 ?? null,
    h2_length: url.h2Length ?? null,
    h1_count: url.h1Count ?? 0,
    h2_count: url.h2Count ?? 0,
    meta_robots: url.metaRobots ?? null,
    x_robots_tag: url.xRobotsTag ?? null,
    canonical: url.canonical ?? null,
    canonical_header: url.canonicalHeader ?? null,
    rel_next: url.relNext ?? null,
    rel_prev: url.relPrev ?? null,
    http_rel_next: url.httpRelNext ?? null,
    http_rel_prev: url.httpRelPrev ?? null,
    content_length: url.contentLength ?? null,
    transferred_size: url.transferredSize ?? null,
    total_transferred_size: url.totalTransferredSize ?? null,
    word_count: url.wordCount ?? null,
    text_ratio: url.textRatio ?? null,
    crawl_depth: url.crawlDepth,
    folder_depth: url.folderDepth,
    link_score: url.linkScore ?? null,
    inlinks: url.inlinks ?? 0,
    unique_inlinks: url.uniqueInlinks ?? 0,
    unique_js_inlinks: url.uniqueJsInlinks ?? 0,
    percent_of_total: url.percentOfTotal ?? null,
    outlinks: url.outlinks ?? 0,
    unique_outlinks: url.uniqueOutlinks ?? 0,
    unique_js_outlinks: url.uniqueJsOutlinks ?? 0,
    external_outlinks: url.externalOutlinks ?? 0,
    unique_external_outlinks: url.uniqueExternalOutlinks ?? 0,
    unique_external_js_outlinks: url.uniqueExternalJsOutlinks ?? 0,
    response_time: url.responseTime ?? null,
    last_modified: url.lastModified ?? null,
    redirect_url: url.redirectUrl ?? null,
    redirect_type: url.redirectType ?? null,
    http_version: url.httpVersion ?? null,
    url_encoded_address: url.urlEncodedAddress ?? null,
    hash: url.hash ?? null,
    url_length: url.urlLength ?? null,
    is_internal: url.isInternal ? 1 : 0,
    is_external: url.isExternal ? 1 : 0,
    has_mixed_content: url.hasMixedContent ? 1 : 0,
    is_secure: url.isSecure ? 1 : 0,
    spelling_errors: url.spellingErrors ?? 0,
    grammar_errors: url.grammarErrors ?? 0,
    language: url.language ?? null,
    closest_similarity_match: url.closestSimilarityMatch ?? null,
    near_duplicate_count: url.nearDuplicateCount ?? 0,
    extracted_custom: url.extractedCustom ? JSON.stringify(url.extractedCustom) : null,
    ai_results: url.aiResults ? JSON.stringify(url.aiResults) : null,
    raw_html: url.rawHtml ?? null,
    rendered_html: url.renderedHtml ?? null,
    headers: url.headers ? JSON.stringify(url.headers) : null,
    cookies: url.cookies ?? null,
    redirect_chain: url.redirectChain ? JSON.stringify(url.redirectChain) : null,
    resource_urls: url.resourceUrls ? JSON.stringify(url.resourceUrls) : null,
    crawled_at: url.crawledAt ?? null,
    created_at: url.createdAt ?? new Date().toISOString(),
    updated_at: url.updatedAt ?? new Date().toISOString(),
  };
}

function rowToUrl(row: Record<string, unknown>): CrawlUrl {
  return {
    id: row.id as number,
    address: row.address as string,
    normalizedAddress: row.normalized_address as string,
    contentType: row.content_type as string | undefined,
    statusCode: row.status_code as number | undefined,
    status: row.status as string | undefined,
    statusCategory: row.status_category as CrawlUrl['statusCategory'],
    indexability: row.indexability as 'indexable' | 'non-indexable',
    indexabilityStatus: row.indexability_status as string | undefined,
    title1: row.title1 as string | undefined,
    title1Length: row.title1_length as number | undefined,
    title1PixelWidth: row.title1_pixel_width as number | undefined,
    title2: row.title2 as string | undefined,
    title2Length: row.title2_length as number | undefined,
    metaDescription1: row.meta_description1 as string | undefined,
    metaDescription1Length: row.meta_description1_length as number | undefined,
    metaDescription1PixelWidth: row.meta_description1_pixel_width as number | undefined,
    metaDescription2: row.meta_description2 as string | undefined,
    metaDescription2Length: row.meta_description2_length as number | undefined,
    metaKeywords1: row.meta_keywords1 as string | undefined,
    metaKeywords1Length: row.meta_keywords1_length as number | undefined,
    metaKeywords2: row.meta_keywords2 as string | undefined,
    metaKeywords2Length: row.meta_keywords2_length as number | undefined,
    h1: row.h1 as string | undefined,
    h1Length: row.h1_length as number | undefined,
    h2: row.h2 as string | undefined,
    h2Length: row.h2_length as number | undefined,
    h1Count: row.h1_count as number,
    h2Count: row.h2_count as number,
    metaRobots: row.meta_robots as string | undefined,
    xRobotsTag: row.x_robots_tag as string | undefined,
    canonical: row.canonical as string | undefined,
    canonicalHeader: row.canonical_header as string | undefined,
    relNext: row.rel_next as string | undefined,
    relPrev: row.rel_prev as string | undefined,
    httpRelNext: row.http_rel_next as string | undefined,
    httpRelPrev: row.http_rel_prev as string | undefined,
    contentLength: row.content_length as number | undefined,
    transferredSize: row.transferred_size as number | undefined,
    totalTransferredSize: row.total_transferred_size as number | undefined,
    wordCount: row.word_count as number | undefined,
    textRatio: row.text_ratio as number | undefined,
    crawlDepth: row.crawl_depth as number,
    folderDepth: row.folder_depth as number,
    linkScore: row.link_score as number | undefined,
    inlinks: row.inlinks as number,
    uniqueInlinks: row.unique_inlinks as number,
    uniqueJsInlinks: row.unique_js_inlinks as number,
    percentOfTotal: row.percent_of_total as number | undefined,
    outlinks: row.outlinks as number,
    uniqueOutlinks: row.unique_outlinks as number,
    uniqueJsOutlinks: row.unique_js_outlinks as number,
    externalOutlinks: row.external_outlinks as number,
    uniqueExternalOutlinks: row.unique_external_outlinks as number,
    uniqueExternalJsOutlinks: row.unique_external_js_outlinks as number,
    responseTime: row.response_time as number | undefined,
    lastModified: row.last_modified as string | undefined,
    redirectUrl: row.redirect_url as string | undefined,
    redirectType: row.redirect_type as CrawlUrl['redirectType'],
    httpVersion: row.http_version as string | undefined,
    urlEncodedAddress: row.url_encoded_address as string | undefined,
    hash: row.hash as string | undefined,
    urlLength: row.url_length as number | undefined,
    isInternal: Boolean(row.is_internal),
    isExternal: Boolean(row.is_external),
    hasMixedContent: Boolean(row.has_mixed_content),
    isSecure: Boolean(row.is_secure),
    spellingErrors: row.spelling_errors as number,
    grammarErrors: row.grammar_errors as number,
    language: row.language as string | undefined,
    closestSimilarityMatch: row.closest_similarity_match as number | undefined,
    nearDuplicateCount: row.near_duplicate_count as number,
    extractedCustom: row.extracted_custom ? JSON.parse(row.extracted_custom as string) : undefined,
    aiResults: row.ai_results ? JSON.parse(row.ai_results as string) : undefined,
    rawHtml: row.raw_html as string | undefined,
    renderedHtml: row.rendered_html as string | undefined,
    headers: row.headers ? JSON.parse(row.headers as string) : undefined,
    cookies: row.cookies as string | undefined,
    redirectChain: row.redirect_chain ? JSON.parse(row.redirect_chain as string) : undefined,
    resourceUrls: row.resource_urls ? JSON.parse(row.resource_urls as string) : undefined,
    crawledAt: row.crawled_at as string | undefined,
    createdAt: row.created_at as string | undefined,
    updatedAt: row.updated_at as string | undefined,
  };
}

function linkToDbRow(link: CrawlLink, crawlRunId: number): Record<string, unknown> {
  return {
    crawl_run_id: crawlRunId,
    source_url_id: link.sourceUrlId,
    source_url: link.sourceUrl,
    target_url: link.targetUrl,
    target_normalized_url: link.targetNormalizedUrl,
    is_internal: link.isInternal ? 1 : 0,
    is_external: link.isExternal ? 1 : 0,
    is_image: link.isImage ? 1 : 0,
    is_script: link.isScript ? 1 : 0,
    is_stylesheet: link.isStylesheet ? 1 : 0,
    anchor_text: link.anchorText ?? null,
    alt_text: link.altText ?? null,
    link_type: link.linkType,
    rel: link.rel ?? null,
    target: link.target ?? null,
    nofollow: link.nofollow ? 1 : 0,
    noreferrer: link.noreferrer ? 1 : 0,
    noopener: link.noopener ? 1 : 0,
    sponsored: link.sponsored ? 1 : 0,
    ugc: link.ugc ? 1 : 0,
    location: link.location,
    position: link.position ?? 0,
    created_at: link.createdAt ?? new Date().toISOString(),
  };
}

function rowToLink(row: Record<string, unknown>): CrawlLink {
  return {
    id: row.id as number,
    sourceUrlId: row.source_url_id as number,
    sourceUrl: row.source_url as string,
    targetUrl: row.target_url as string,
    targetNormalizedUrl: row.target_normalized_url as string,
    isInternal: Boolean(row.is_internal),
    isExternal: Boolean(row.is_external),
    isImage: Boolean(row.is_image),
    isScript: Boolean(row.is_script),
    isStylesheet: Boolean(row.is_stylesheet),
    anchorText: row.anchor_text as string | undefined,
    altText: row.alt_text as string | undefined,
    linkType: row.link_type as CrawlLink['linkType'],
    rel: row.rel as string | undefined,
    target: row.target as string | undefined,
    nofollow: Boolean(row.nofollow),
    noreferrer: Boolean(row.noreferrer),
    noopener: Boolean(row.noopener),
    sponsored: Boolean(row.sponsored),
    ugc: Boolean(row.ugc),
    location: row.location as CrawlLink['location'],
    position: row.position as number,
    createdAt: row.created_at as string | undefined,
  };
}

function rowToIssue(row: Record<string, unknown>): CrawlIssue {
  return {
    id: row.id as number,
    urlId: row.url_id as number,
    url: row.url as string,
    type: row.type as string,
    category: row.category as string,
    priority: row.priority as CrawlIssue['priority'],
    title: row.title as string,
    description: row.description as string,
    detail: row.detail as string | undefined,
    howToFix: row.how_to_fix as string | undefined,
    createdAt: row.created_at as string | undefined,
  };
}

function rowToCrawlRun(row: Record<string, unknown>): CrawlRun {
  return {
    id: row.id as number,
    name: row.name as string,
    startUrl: row.start_url as string,
    config: row.config as string,
    status: row.status as CrawlRun['status'],
    startedAt: row.started_at as string,
    completedAt: row.completed_at as string | undefined,
    urlsCrawled: row.urls_crawled as number,
    urlsFound: row.urls_found as number,
    errors: row.errors as number,
    redirects: row.redirects as number,
    blocked: row.blocked as number,
    dbPath: row.db_path as string,
  };
}

function rowToImage(row: Record<string, unknown>): ImageRecord {
  return {
    sourceUrlId: row.source_url_id as number,
    url: row.url as string,
    alt: row.alt as string | undefined,
    width: row.width as number | undefined,
    height: row.height as number | undefined,
    size: row.size as number | undefined,
    format: row.format as string | undefined,
    isBackground: Boolean(row.is_background),
    missingAlt: Boolean(row.missing_alt),
    oversized: Boolean(row.oversized),
    missingDimensions: Boolean(row.missing_dimensions),
    statusCode: row.status_code as number | undefined,
  };
}

function rowToStructuredData(row: Record<string, unknown>): StructuredDataRecord {
  return {
    urlId: row.url_id as number,
    url: row.url as string,
    type: row.type as 'json-ld' | 'microdata' | 'rdfa',
    format: row.format as string,
    data: row.data ? JSON.parse(row.data as string) : null,
    errors: row.errors ? JSON.parse(row.errors as string) : undefined,
    warnings: row.warnings ? JSON.parse(row.warnings as string) : undefined,
    richResultEligible: Boolean(row.rich_result_eligible),
  };
}
