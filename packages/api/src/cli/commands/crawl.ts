import { Command } from 'commander';
import path from 'path';
import { CrawlEngine } from '../../crawler/engine.js';
import { defaultConfig, parseCrawlConfig } from '../../config/index.js';
import { exportCrawlData } from '../../exporters/index.js';
import { ANSI, printOk, printError, printBullet, printCrawlBanner } from '../banner.js';
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
        console.log(`${ANSI.dim}[${event.type}]${ANSI.reset} Crawled: ${ANSI.bold}${event.urlsCrawled}${ANSI.reset}, Found: ${event.urlsFound}, Errors: ${event.errors}`);
      } else if (event.type === 'progress') {
        process.stdout.write(
          `\r${ANSI.dim}Crawled:${ANSI.reset} ${ANSI.bold}${event.urlsCrawled}${ANSI.reset}  ${ANSI.dim}Found:${ANSI.reset} ${event.urlsFound}  ${ANSI.dim}Errors:${ANSI.reset} ${event.errors}  ${ANSI.dim}Queue:${ANSI.reset} ${event.urlsQueued}    `,
        );
      }
    });

    printCrawlBanner(url, config.mode);

    const run = await engine.start();
    // Move past the live progress line so the summary doesn't collide.
    process.stdout.write('\n');

    printOk(`Crawl completed`, `run id ${ANSI.bold}${run.id}${ANSI.reset}`);
    printBullet('URLs crawled', `${ANSI.bold}${run.urlsCrawled}${ANSI.reset}`);
    printBullet('URLs found', `${run.urlsFound}`);
    if (run.errors > 0) {
      printError('Errors during crawl', `${run.errors} — see the database for details`);
    } else {
      printOk('No errors');
    }
    printBullet('Redirects', `${run.redirects}`);

    if (options.output) {
      const outputPath = path.resolve(options.output);
      await exportCrawlData(run.id!, {
        format: options.format,
        filePath: outputPath,
      });
      printOk('Report exported', outputPath);
    }
  });

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}
