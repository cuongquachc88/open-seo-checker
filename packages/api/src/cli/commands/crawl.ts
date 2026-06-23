import { Command } from 'commander';
import path from 'path';
import { CrawlEngine } from '../../crawler/engine.js';
import { defaultConfig, parseCrawlConfig } from '../../config/index.js';
import { exportCrawlData } from '../../exporters/index.js';
import type { CrawlConfig } from '../../types/index.js';
import { openDatabase } from '../../storage/database.js';
import { crawlsDir } from '../../utils/workspace.js';

export const crawlCommand = new Command('crawl')
  .description('Crawl a website and export the results')
  .argument('<url>', 'Starting URL to crawl')
  .option('-o, --output <file>', 'Output file path for the report')
  .option('--format <format>', 'Export format: csv, json, xlsx (default: csv)', 'csv')
  .option('--max-urls <number>', 'Maximum number of URLs to crawl', '1000')
  .option('--max-depth <number>', 'Maximum crawl depth', '10')
  .option('--threads <number>', 'Number of concurrent threads', '10')
  .option('--user-agent <ua>', 'User agent string', 'OpenSEOCrawler/1.0')
  .option('--render', 'Render JavaScript pages using Playwright', false)
  .option('--no-robots', 'Do not respect robots.txt', false)
  .option('--allow-subdomains', 'Crawl subdomains as internal', false)
  .option('--crawl-external', 'Follow and record external links', true)
  .option('--follow-redirects', 'Follow redirects', true)
  .option('--query-string <mode>', 'Query string handling: keep, remove, remove-except-first', 'keep')
  .option('--exclude <pattern>', 'Regex pattern to exclude URLs (can be used multiple times)', collect, [])
  .option('--include <pattern>', 'Regex pattern to include URLs (can be used multiple times)', collect, [])
  .option('--db-name <name>', 'Database name for this crawl')
  .option('--sitemap <url>', 'Sitemap URL to seed crawl')
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (url, options) => {
    const config: CrawlConfig = {
      ...defaultConfig,
      startUrl: url,
      mode: 'spider',
      maxUrls: parseInt(options.maxUrls, 10),
      maxDepth: parseInt(options.maxDepth, 10),
      threads: parseInt(options.threads, 10),
      userAgent: options.userAgent,
      respectRobotsTxt: !options.noRobots,
      allowSubdomains: options.allowSubdomains,
      crawlExternal: options.crawlExternal,
      followRedirects: options.followRedirects,
      queryStringHandling: options.queryString,
      excludePatterns: options.exclude,
      includePatterns: options.include,
      renderJs: options.render,
      useSitemaps: !!options.sitemap,
      sitemapUrls: options.sitemap ? [options.sitemap] : undefined,
    };

    const dbName = options.dbName || `crawl-${Date.now()}`;
    openDatabase(path.join(crawlsDir(), `${dbName}.db`));

    const engine = new CrawlEngine(config, { dbName });

    engine.on('progress', event => {
      if (options.verbose) {
        console.log(`[${event.type}] Crawled: ${event.urlsCrawled}, Found: ${event.urlsFound}, Errors: ${event.errors}`);
      } else if (event.type === 'progress') {
        process.stdout.write(`\rCrawled: ${event.urlsCrawled} | Found: ${event.urlsFound} | Errors: ${event.errors} | Queue: ${event.urlsQueued}`);
      }
    });

    console.log(`Starting crawl of ${url}`);
    const run = await engine.start();
    console.log(`\nCrawl completed. Run ID: ${run.id}`);
    console.log(`URLs crawled: ${run.urlsCrawled}`);
    console.log(`URLs found: ${run.urlsFound}`);
    console.log(`Errors: ${run.errors}`);
    console.log(`Redirects: ${run.redirects}`);

    if (options.output) {
      const outputPath = path.resolve(options.output);
      await exportCrawlData(run.id!, {
        format: options.format,
        filePath: outputPath,
      });
      console.log(`Report exported to ${outputPath}`);
    }
  });

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}
