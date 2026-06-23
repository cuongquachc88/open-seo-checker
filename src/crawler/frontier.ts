import type { CrawlConfig } from '../types/index.js';
import {
  hasInternalSearchParameter,
  isInternalUrl,
  matchRegexPatterns,
  normalizeUrl,
  removeQueryString,
} from '../utils/url.js';

export interface FrontierItem {
  url: string;
  depth: number;
  sourceUrl?: string;
  sourceUrlId?: number;
  fromSitemap?: boolean;
}

export class CrawlFrontier {
  private queue: FrontierItem[] = [];
  private seen = new Set<string>();
  private crawled = new Set<string>();
  private startUrl: string;
  private config: CrawlConfig;

  constructor(startUrl: string, config: CrawlConfig) {
    this.startUrl = normalizeUrl(startUrl);
    this.config = config;
    this.add({ url: this.startUrl, depth: 0 });
  }

  add(item: FrontierItem): boolean {
    const normalizedUrl = normalizeUrl(item.url, this.startUrl);
    if (!normalizedUrl) return false;
    if (this.seen.has(normalizedUrl)) return false;

    if (this.shouldSkip(normalizedUrl, item.depth)) return false;

    this.seen.add(normalizedUrl);
    this.queue.push({ ...item, url: normalizedUrl });
    return true;
  }

  addMany(items: FrontierItem[]): number {
    let added = 0;
    for (const item of items) {
      if (this.add(item)) added++;
    }
    return added;
  }

  next(): FrontierItem | undefined {
    return this.queue.shift();
  }

  markCrawled(url: string): void {
    this.crawled.add(normalizeUrl(url));
  }

  hasMore(): boolean {
    return this.queue.length > 0;
  }

  size(): number {
    return this.queue.length;
  }

  seenCount(): number {
    return this.seen.size;
  }

  crawledCount(): number {
    return this.crawled.size;
  }

  private shouldSkip(url: string, depth: number): boolean {
    if (depth > this.config.maxDepth) return true;
    if (this.seen.size >= this.config.maxUrls) return true;

    // Internal search URLs
    if (hasInternalSearchParameter(url) && this.config.excludePatterns.length === 0) {
      return true;
    }

    // Include/exclude patterns
    if (this.config.includePatterns.length > 0 && !matchRegexPatterns(url, this.config.includePatterns)) {
      return true;
    }
    if (this.config.excludePatterns.length > 0 && matchRegexPatterns(url, this.config.excludePatterns)) {
      return true;
    }

    return false;
  }

  getDiscoveredUrls(): string[] {
    return Array.from(this.seen);
  }

  getCrawledUrls(): string[] {
    return Array.from(this.crawled);
  }
}

export function applyQueryStringHandling(url: string, handling: CrawlConfig['queryStringHandling']): string {
  if (handling === 'keep') return url;
  if (handling === 'remove') return removeQueryString(url);
  if (handling === 'remove-except-first') {
    try {
      const parsed = new URL(url);
      const firstKey = parsed.searchParams.keys().next().value;
      if (firstKey) {
        const value = parsed.searchParams.get(firstKey);
        parsed.search = `?${firstKey}=${value}`;
      } else {
        parsed.search = '';
      }
      return parsed.href;
    } catch {
      return url;
    }
  }
  return url;
}

export function isValidSeedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
