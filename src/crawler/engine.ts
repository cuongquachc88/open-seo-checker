import EventEmitter from 'events';
import type { CrawlConfig, CrawlProgressEvent, CrawlRun, CrawlUrl } from '../types/index.js';
import {
  closeDatabase,
  countUrls,
  createCrawlRun,
  getDbPath,
  insertImages,
  insertLinks,
  insertStructuredData,
  insertUrl,
  openDatabase,
  updateCrawlRun,
} from '../storage/database.js';
import {
  applyQueryStringHandling,
  CrawlFrontier,
  isValidSeedUrl,
  type FrontierItem,
} from './frontier.js';
import { fetchUrl } from './fetcher.js';
import { renderPage } from '../renderer/playwright.js';
import { deduplicateLinks, extractLinksFromHtml, filterCrawlableUrls } from './links.js';
import { fetchRobotsTxt, isAllowedByRobots } from './robots.js';
import { getDomain, isHtmlUrl, isInternalUrl, normalizeUrl } from '../utils/url.js';
import {
  extractImagesFromHtml,
  extractStructuredDataFromHtml,
  getIndexabilityStatus,
  isNoindex,
  parseHtml,
} from './parser.js';
import { runPostCrawlAnalysis } from '../analyzer/index.js';
import { enrichCrawlWithIntegrations } from '../integrations/index.js';
import { runAIAnalysis } from '../ai/index.js';

export interface CrawlEngineOptions {
  onProgress?: (event: CrawlProgressEvent) => void;
  dbName?: string;
}

export class CrawlEngine extends EventEmitter {
  private config: CrawlConfig;
  private run: CrawlRun | null = null;
  private frontier: CrawlFrontier;
  private startUrl: string;
  private robotsInfo: Map<string, { content: string; crawlDelay?: number }> = new Map();
  private cancelled = false;
  private paused = false;
  private dbName: string;

  constructor(config: CrawlConfig, options: CrawlEngineOptions = {}) {
    super();
    this.config = config;
    this.startUrl = normalizeUrl(config.startUrl);
    this.frontier = new CrawlFrontier(this.startUrl, config);
    this.dbName = options.dbName || `crawl-${Date.now()}`;
  }

  async start(): Promise<CrawlRun> {
    if (!isValidSeedUrl(this.startUrl)) {
      throw new Error(`Invalid seed URL: ${this.startUrl}`);
    }

    const dbPath = openDatabase(getDbPath(this.dbName));
    this.run = createCrawlRun(this.dbName, this.startUrl, this.config);

    // Add list URLs if in list mode
    if (this.config.mode === 'list' && this.config.listUrls) {
      for (const url of this.config.listUrls) {
        this.frontier.add({ url: normalizeUrl(url), depth: 0 });
      }
    }

    // Add sitemap URLs if configured
    if (this.config.useSitemaps && this.config.sitemapUrls) {
      for (const sitemapUrl of this.config.sitemapUrls) {
        // Parse sitemap and add URLs (simplified - fetch and parse XML)
        try {
          const response = await fetch(sitemapUrl, { headers: { 'User-Agent': this.config.userAgent } });
          if (response.ok) {
            const text = await response.text();
            const urlMatches = text.matchAll(/<loc>([^<]+)<\/loc>/g);
            for (const match of urlMatches) {
              this.frontier.add({ url: match[1], depth: 0, fromSitemap: true });
            }
          }
        } catch (err) {
          this.emit('progress', {
            type: 'error',
            runId: this.run.id!,
            urlsCrawled: 0,
            urlsFound: 0,
            urlsQueued: this.frontier.size(),
            errors: 0,
            redirects: 0,
            message: `Failed to fetch sitemap: ${sitemapUrl}`,
            timestamp: new Date().toISOString(),
          } as CrawlProgressEvent);
        }
      }
    }

    this.emit('progress', {
      type: 'started',
      runId: this.run.id!,
      urlsCrawled: 0,
      urlsFound: this.frontier.seenCount(),
      urlsQueued: this.frontier.size(),
      errors: 0,
      redirects: 0,
      timestamp: new Date().toISOString(),
    } as CrawlProgressEvent);

    await this.crawlLoop();
    return this.run;
  }

  private async crawlLoop(): Promise<void> {
    if (!this.run) return;

    const runId = this.run.id!;

    while (this.frontier.hasMore() && !this.cancelled) {
      while (this.paused && !this.cancelled) {
        await sleep(100);
      }
      if (this.cancelled) break;

      const batch: { item: FrontierItem | undefined; index: number }[] = [];
      const batchSize = Math.min(this.config.threads, this.frontier.size());

      for (let i = 0; i < batchSize; i++) {
        const item = this.frontier.next();
        if (item) batch.push({ item, index: i });
      }

      if (batch.length === 0) break;

      const results = await Promise.allSettled(
        batch.map(({ item }) => this.crawlUrl(item!.url, item!.depth, item!.sourceUrl, item!.sourceUrlId))
      );

      let errors = 0;
      let redirects = 0;

      for (const result of results) {
        if (result.status === 'rejected') {
          errors++;
        } else {
          if (result.value.statusCategory === 'redirect') redirects++;
          if (result.value.statusCategory === 'client-error' || result.value.statusCategory === 'server-error' || result.value.statusCategory === 'no-response') errors++;
        }
      }

      updateCrawlRun(runId, {
        urlsCrawled: this.frontier.crawledCount(),
        urlsFound: this.frontier.seenCount(),
        errors: (this.run.errors || 0) + errors,
        redirects: (this.run.redirects || 0) + redirects,
      });

      this.run.urlsCrawled = this.frontier.crawledCount();
      this.run.urlsFound = this.frontier.seenCount();
      this.run.errors = (this.run.errors || 0) + errors;
      this.run.redirects = (this.run.redirects || 0) + redirects;

      this.emit('progress', {
        type: 'progress',
        runId,
        urlsCrawled: this.run.urlsCrawled,
        urlsFound: this.run.urlsFound,
        urlsQueued: this.frontier.size(),
        errors: this.run.errors,
        redirects: this.run.redirects,
        currentUrl: batch[batch.length - 1]?.item?.url,
        timestamp: new Date().toISOString(),
      } as CrawlProgressEvent);
    }

    if (!this.cancelled) {
      await this.postCrawlAnalysis();
      updateCrawlRun(runId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        urlsCrawled: this.frontier.crawledCount(),
        urlsFound: this.frontier.seenCount(),
      });
      this.emit('progress', {
        type: 'completed',
        runId,
        urlsCrawled: this.frontier.crawledCount(),
        urlsFound: this.frontier.seenCount(),
        urlsQueued: 0,
        errors: this.run.errors || 0,
        redirects: this.run.redirects || 0,
        timestamp: new Date().toISOString(),
      } as CrawlProgressEvent);
    } else {
      updateCrawlRun(runId, {
        status: 'cancelled',
        completedAt: new Date().toISOString(),
      });
      this.emit('progress', {
        type: 'cancelled',
        runId,
        urlsCrawled: this.frontier.crawledCount(),
        urlsFound: this.frontier.seenCount(),
        urlsQueued: this.frontier.size(),
        errors: this.run.errors || 0,
        redirects: this.run.redirects || 0,
        timestamp: new Date().toISOString(),
      } as CrawlProgressEvent);
    }
  }

  private async crawlUrl(
    url: string,
    depth: number,
    sourceUrl?: string,
    sourceUrlId?: number
  ): Promise<CrawlUrl> {
    const normalizedUrl = normalizeUrl(url, this.startUrl);
    const domain = getDomain(normalizedUrl);

    // Check robots.txt
    if (this.config.respectRobotsTxt && domain) {
      let robots = this.robotsInfo.get(domain);
      if (!robots) {
        try {
          const info = await fetchRobotsTxt(domain);
          robots = { content: info.content, crawlDelay: info.crawlDelay };
          this.robotsInfo.set(domain, robots);
        } catch {
          robots = { content: '' };
          this.robotsInfo.set(domain, robots);
        }
      }

      if (!isAllowedByRobots(normalizedUrl, robots.content, this.config.userAgent)) {
        this.frontier.markCrawled(normalizedUrl);
        const blockedUrl: CrawlUrl = {
          address: normalizedUrl,
          normalizedAddress: normalizedUrl,
          statusCode: 0,
          status: 'Blocked by Robots.txt',
          statusCategory: 'no-response',
          indexability: 'non-indexable',
          indexabilityStatus: 'Blocked by Robots.txt',
          crawlDepth: depth,
          folderDepth: 0,
          isInternal: isInternalUrl(normalizedUrl, this.startUrl, this.config.allowSubdomains),
          isExternal: !isInternalUrl(normalizedUrl, this.startUrl, this.config.allowSubdomains),
          isSecure: normalizedUrl.startsWith('https:'),
          crawledAt: new Date().toISOString(),
        };
        const id = insertUrl(this.run!.id!, blockedUrl);
        blockedUrl.id = id;
        return blockedUrl;
      }

      // Apply crawl delay
      if (robots.crawlDelay && robots.crawlDelay > 0) {
        await sleep(robots.crawlDelay * 1000);
      }
    }

    // Fetch URL. When followRedirects is true, the fetcher already chained
    // through 3xx responses and returned the final response with the full
    // redirect history attached, so we parse that as the page content.
    const fetchResult = await fetchUrl(normalizedUrl, this.config);
    this.frontier.markCrawled(normalizedUrl);

    // If the user disabled followRedirects, surface the 3xx as its own URL
    // record and stop before parsing the (tiny) redirect body.
    if (
      !this.config.followRedirects &&
      fetchResult.statusCategory === 'redirect' &&
      fetchResult.redirectUrl
    ) {
      const redirectUrl: CrawlUrl = {
        address: normalizedUrl,
        normalizedAddress: normalizedUrl,
        statusCode: fetchResult.statusCode,
        status: fetchResult.status,
        statusCategory: 'redirect',
        redirectUrl: fetchResult.redirectUrl,
        redirectType: fetchResult.redirectType ?? 'http',
        redirectChain: fetchResult.redirectChain ?? [],
        indexability: 'indexable',
        crawlDepth: depth,
        folderDepth: 0,
        isInternal: isInternalUrl(normalizedUrl, this.startUrl, this.config.allowSubdomains),
        isExternal: !isInternalUrl(normalizedUrl, this.startUrl, this.config.allowSubdomains),
        isSecure: normalizedUrl.startsWith('https:'),
        responseTime: fetchResult.responseTime,
        crawledAt: new Date().toISOString(),
      };
      const redirectId = insertUrl(this.run!.id!, redirectUrl);
      redirectUrl.id = redirectId;
      return redirectUrl;
    }

    // When followRedirects is true the fetcher resolved to the final URL.
    // Treat the final URL as the canonical address so the rest of the pipeline
    // stores a single row per logical resource, with the chain recorded as
    // metadata.
    const effectiveUrl =
      this.config.followRedirects &&
      fetchResult.redirectChain &&
      fetchResult.redirectChain.length > 0 &&
      fetchResult.normalizedUrl &&
      fetchResult.normalizedUrl !== normalizedUrl
        ? fetchResult.normalizedUrl
        : normalizedUrl;
    if (effectiveUrl !== normalizedUrl) {
      this.frontier.markCrawled(effectiveUrl);
    }
    const redirectChain = fetchResult.redirectChain ?? [];

    // Render JS if configured (render the FINAL URL so we pick up JS-discovered
    // links from the real destination rather than the redirect body).
    let renderResult: { html: string; resources: string[] } | undefined;
    const shouldRender =
      this.config.renderJs &&
      fetchResult.statusCode === 200 &&
      fetchResult.contentType?.toLowerCase().includes('text/html');

    if (shouldRender) {
      try {
        renderResult = await renderPage(effectiveUrl, this.config.renderTimeout);
      } catch {
        // Fall back to the raw HTML below.
      }
    }

    const effectiveBody = renderResult?.html ?? fetchResult.body;

    // Parse HTML
    const parseResult = parseHtml(effectiveUrl, { ...fetchResult, body: effectiveBody }, this.startUrl, {
      allowSubdomains: this.config.allowSubdomains,
      followCanonical: this.config.followCanonical,
    });

    const crawlUrl = parseResult.url;
    crawlUrl.address = effectiveUrl;
    crawlUrl.normalizedAddress = effectiveUrl;
    crawlUrl.crawlDepth = depth;
    crawlUrl.rawHtml = fetchResult.body;
    if (renderResult) {
      crawlUrl.renderedHtml = renderResult.html;
      crawlUrl.resourceUrls = renderResult.resources;
    }
    if (redirectChain.length > 0) {
      crawlUrl.redirectChain = redirectChain;
      if (this.config.followRedirects && redirectChain[0] !== effectiveUrl) {
        crawlUrl.redirectUrl = effectiveUrl;
        crawlUrl.redirectType = 'http';
      }
    }
    crawlUrl.isInternal = isInternalUrl(effectiveUrl, this.startUrl, this.config.allowSubdomains);
    crawlUrl.isExternal = !crawlUrl.isInternal;

    // Determine indexability status
    const robotsContent = domain ? this.robotsInfo.get(domain)?.content : undefined;
    crawlUrl.indexabilityStatus = getIndexabilityStatus(crawlUrl, robotsContent, this.config.userAgent);
    if (crawlUrl.indexabilityStatus || (crawlUrl.metaRobots && isNoindex(crawlUrl.metaRobots)) || (crawlUrl.xRobotsTag && isNoindex(crawlUrl.xRobotsTag))) {
      crawlUrl.indexability = 'non-indexable';
    }

    // Save URL
    const urlId = insertUrl(this.run!.id!, crawlUrl);
    crawlUrl.id = urlId;

    // Extract links from HTML
    if (effectiveBody && fetchResult.statusCode === 200) {
      const location: 'html' | 'rendered' = renderResult ? 'rendered' : 'html';
      const links = extractLinksFromHtml(effectiveUrl, urlId, effectiveBody, this.startUrl, this.config, location);
      const deduped = deduplicateLinks(links);
      insertLinks(this.run!.id!, deduped);

      // Extract images
      const images = extractImagesFromHtml(effectiveBody, urlId, effectiveUrl);
      insertImages(this.run!.id!, images);

      // Extract structured data
      const structuredData = extractStructuredDataFromHtml(effectiveBody, urlId, effectiveUrl);
      insertStructuredData(this.run!.id!, structuredData);

      // Add internal links to frontier
      const crawlable = filterCrawlableUrls(deduped).filter(link => {
        if (link.linkType !== 'a' && link.linkType !== 'link' && link.linkType !== 'iframe') return false;
        if (!link.isInternal) return false;
        if (this.config.crawlExternal) {
          // External links can be added but not crawled deeply
        }
        return link.isInternal;
      });

      for (const link of crawlable) {
        let targetUrl = applyQueryStringHandling(link.targetUrl, this.config.queryStringHandling);
        if (isHtmlUrl(targetUrl)) {
          this.frontier.add({ url: targetUrl, depth: depth + 1, sourceUrl: effectiveUrl, sourceUrlId: urlId });
        }
      }
    }

    return crawlUrl;
  }

  private async postCrawlAnalysis(): Promise<void> {
    if (!this.run) return;
    const runId = this.run.id!;

    const urls = countUrls(runId, { isInternal: true });
    if (urls > 0) {
      runPostCrawlAnalysis(runId, this.config);
    }

    // Optional: enrich with external API integrations (GA4, GSC, PSI, etc.)
    if (this.config.apiKeys && Object.values(this.config.apiKeys).some(v => v)) {
      try {
        await enrichCrawlWithIntegrations(runId, this.config);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.emit('progress', {
          type: 'error',
          runId,
          urlsCrawled: this.run.urlsCrawled,
          urlsFound: this.run.urlsFound,
          urlsQueued: this.frontier.size(),
          errors: this.run.errors,
          redirects: this.run.redirects,
          message: `Integration enrichment failed: ${message}`,
          timestamp: new Date().toISOString(),
        } as CrawlProgressEvent);
      }
    }

    // Optional: run AI analysis prompts
    if (this.config.aiPrompts && this.config.aiPrompts.length > 0) {
      try {
        await runAIAnalysis(runId, this.config);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.emit('progress', {
          type: 'error',
          runId,
          urlsCrawled: this.run.urlsCrawled,
          urlsFound: this.run.urlsFound,
          urlsQueued: this.frontier.size(),
          errors: this.run.errors,
          redirects: this.run.redirects,
          message: `AI analysis failed: ${message}`,
          timestamp: new Date().toISOString(),
        } as CrawlProgressEvent);
      }
    }
  }

  cancel(): void {
    this.cancelled = true;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  getRun(): CrawlRun | null {
    return this.run;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export { closeDatabase };
