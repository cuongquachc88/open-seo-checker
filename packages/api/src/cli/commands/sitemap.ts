import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { CrawlEngine } from '../../crawler/engine.js';
import { defaultConfig } from '../../config/index.js';
import { generateXmlSitemap } from '../../exporters/sitemap-xml.js';
import { ANSI, printRoleBanner, printOk, printBullet } from '../banner.js';
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
        process.stdout.write(
          `\r${ANSI.dim}Crawled:${ANSI.reset} ${ANSI.bold}${event.urlsCrawled}${ANSI.reset}  ${ANSI.dim}Found:${ANSI.reset} ${event.urlsFound}    `,
        );
      }
    });

    printRoleBanner({
      role: 'sitemap',
      stack: 'XML sitemap generator',
      lines: [
        `  ${ANSI.dim}target${ANSI.reset}  ${ANSI.bold}${url}${ANSI.reset}`,
        `  ${ANSI.dim}output${ANSI.reset}  ${ANSI.bold}${path.resolve(options.output)}${ANSI.reset}`,
      ],
    });

    const run = await engine.start();
    process.stdout.write('\n');

    printOk('Crawl completed', `${ANSI.bold}${run.urlsCrawled}${ANSI.reset} URLs crawled`);

    const sitemap = generateXmlSitemap(run.id!, { includeImages: true });
    const outputPath = path.resolve(options.output);
    fs.writeFileSync(outputPath, sitemap);
    printBullet('Sitemap size', `${(sitemap.length / 1024).toFixed(1)} KiB`);
    printOk('Sitemap written', outputPath);
  });
