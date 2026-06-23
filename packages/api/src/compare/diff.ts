import { openDatabase, getUrls, getCrawlRuns, getCurrentDbPath, closeDatabase } from '../storage/database.js';
import type { CrawlUrl } from '../types/index.js';

export interface CrawlDiff {
  added: CrawlUrl[];
  removed: CrawlUrl[];
  changed: {
    url: string;
    changes: { field: string; old: unknown; new: unknown }[];
  }[];
}

export async function compareCrawls(
  dbPath1: string,
  dbPath2: string,
  options: { urlMapping?: Record<string, string> } = {}
): Promise<CrawlDiff> {
  const urls1 = loadUrlsWithDbState(dbPath1);
  const urls2 = loadUrlsWithDbState(dbPath2);

  const map1 = new Map(urls1.map(u => [applyMapping(u.normalizedAddress, options.urlMapping), u]));
  const map2 = new Map(urls2.map(u => [applyMapping(u.normalizedAddress, options.urlMapping), u]));

  const added: CrawlUrl[] = [];
  const removed: CrawlUrl[] = [];
  const changed: CrawlDiff['changed'] = [];

  for (const [key, url] of map2) {
    if (!map1.has(key)) {
      added.push(url);
    }
  }

  for (const [key, url] of map1) {
    if (!map2.has(key)) {
      removed.push(url);
    }
  }

  for (const [key, url1] of map1) {
    const url2 = map2.get(key);
    if (!url2) continue;

    const changes = detectChanges(url1, url2);
    if (changes.length > 0) {
      changed.push({ url: url1.address, changes });
    }
  }

  return { added: added.map(stripRawHtml), removed: removed.map(stripRawHtml), changed };
}

function stripRawHtml(url: CrawlUrl): CrawlUrl {
  return { ...url, rawHtml: undefined, renderedHtml: undefined };
}

function loadUrlsFromDb(dbPath: string): CrawlUrl[] {
  openDatabase(dbPath);
  const runs = getCrawlRuns();
  if (runs.length === 0) {
    return [];
  }
  // Prefer the most recent completed or running run
  const run = runs.find(r => r.status === 'completed') ?? runs[0];
  return getUrls(run.id!, {});
}

function loadUrlsWithDbState(dbPath: string): CrawlUrl[] {
  const previousDbPath = getCurrentDbPath();
  if (previousDbPath === dbPath) {
    return loadUrlsFromDb(dbPath);
  }
  try {
    return loadUrlsFromDb(dbPath);
  } finally {
    if (previousDbPath) {
      openDatabase(previousDbPath);
    } else {
      closeDatabase();
    }
  }
}

function applyMapping(normalizedAddress: string, mapping?: Record<string, string>): string {
  if (!mapping) return normalizedAddress;
  for (const [from, to] of Object.entries(mapping)) {
    if (normalizedAddress === from || normalizedAddress.startsWith(from)) {
      return normalizedAddress.replace(from, to);
    }
  }
  return normalizedAddress;
}

const COMPARABLE_FIELDS: { key: keyof CrawlUrl; label: string }[] = [
  { key: 'statusCode', label: 'statusCode' },
  { key: 'status', label: 'status' },
  { key: 'statusCategory', label: 'statusCategory' },
  { key: 'indexability', label: 'indexability' },
  { key: 'indexabilityStatus', label: 'indexabilityStatus' },
  { key: 'title1', label: 'title' },
  { key: 'title1Length', label: 'titleLength' },
  { key: 'metaDescription1', label: 'metaDescription' },
  { key: 'metaDescription1Length', label: 'metaDescriptionLength' },
  { key: 'h1', label: 'h1' },
  { key: 'h1Count', label: 'h1Count' },
  { key: 'h2Count', label: 'h2Count' },
  { key: 'canonical', label: 'canonical' },
  { key: 'canonicalHeader', label: 'canonicalHeader' },
  { key: 'metaRobots', label: 'metaRobots' },
  { key: 'xRobotsTag', label: 'xRobotsTag' },
  { key: 'wordCount', label: 'wordCount' },
  { key: 'contentLength', label: 'contentLength' },
  { key: 'responseTime', label: 'responseTime' },
  { key: 'isSecure', label: 'isSecure' },
  { key: 'hasMixedContent', label: 'hasMixedContent' },
];

function detectChanges(oldUrl: CrawlUrl, newUrl: CrawlUrl): { field: string; old: unknown; new: unknown }[] {
  const changes: { field: string; old: unknown; new: unknown }[] = [];

  for (const { key, label } of COMPARABLE_FIELDS) {
    const oldValue = oldUrl[key];
    const newValue = newUrl[key];
    if (!valuesEqual(oldValue, newValue)) {
      changes.push({ field: label, old: oldValue, new: newValue });
    }
  }

  return changes;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || a === null) return b === undefined || b === null || b === '';
  if (b === undefined || b === null) return a === '';
  if (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) return true;
  return String(a) === String(b);
}
