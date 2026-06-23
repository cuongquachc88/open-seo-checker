import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { CrawlEngine } from '../../crawler/engine.js';
import { defaultConfig } from '../../config/index.js';
import { generateXmlSitemap } from '../../exporters/sitemap-xml.js';
import type { CrawlConfig } from '../../types/index.js';
import { openDatabase } from '../../storage/database.js';
import { crawlsDir } from '../../utils/workspace.js';

export const sitemapCommand = new Command('sitemap')
  .description('Generate an XML sitemap by crawling a website')
  .argument('<url>', 'Starting URL to crawl')
  .option('-o, --output <file>', 'Output sitemap file path', 'sitemap.xml')
  .option('--max-urls <number>', 'Maximum number of URLs to crawl', '1000')
  .option('--max-depth <number>', 'Maximum crawl depth', '10')
  .option('--threads <number>', 'Number of concurrent threads', '10')
  .action(async (url, options) => {
    const config: CrawlConfig = {
      ...defaultConfig,
      startUrl: url,
      mode: 'spider',
      maxUrls: parseInt(options.maxUrls, 10),
      maxDepth: parseInt(options.maxDepth, 10),
      threads: parseInt(options.threads, 10),
      userAgent: 'OpenSEOCrawler/1.0',
    };

    const dbName = `sitemap-${Date.now()}`;
    openDatabase(path.join(crawlsDir(), `${dbName}.db`));

    const engine = new CrawlEngine(config, { dbName });

    engine.on('progress', event => {
      if (event.type === 'progress') {
        process.stdout.write(`\rCrawled: ${event.urlsCrawled} | Found: ${event.urlsFound}`);
      }
    });

    console.log(`Generating sitemap for ${url}`);
    const run = await engine.start();
    console.log(`\nCrawl completed. ${run.urlsCrawled} URLs crawled.`);

    const sitemap = generateXmlSitemap(run.id!, { includeImages: true });
    const outputPath = path.resolve(options.output);
    fs.writeFileSync(outputPath, sitemap);
    console.log(`Sitemap written to ${outputPath}`);
  });
