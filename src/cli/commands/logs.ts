import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { analyzeLogFile } from '../../crawler/log-analyzer.js';

export const logsCommand = new Command('logs')
  .description('Analyze a server log file for SEO bot crawl behavior')
  .argument('<file>', 'Log file path')
  .option('--bot <name>', 'Filter by bot name (e.g. googlebot, bingbot, gptbot)')
  .option('--start-date <date>', 'Start date ISO string')
  .option('--end-date <date>', 'End date ISO string')
  .option('-o, --output <file>', 'Output JSON file', 'log-analysis.json')
  .action(async (file, options) => {
    const logPath = path.resolve(file);
    if (!fs.existsSync(logPath)) {
      console.error(`Log file not found: ${logPath}`);
      process.exit(1);
    }

    const summary = analyzeLogFile(logPath, {
      bot: options.bot,
      startDate: options.startDate,
      endDate: options.endDate,
    });

    const outputPath = path.resolve(options.output);
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf8');

    console.log(`Total requests: ${summary.totalRequests}`);
    console.log(`Bot requests: ${summary.botRequests}`);
    console.log(`Unique URLs: ${summary.uniqueUrls}`);
    console.log(`Top URLs: ${summary.topUrls.length}`);
    console.log(`Orphan URLs: ${summary.orphanUrls.length}`);
    console.log(`Crawl budget waste: ${summary.crawlBudgetWaste.length}`);
    console.log(`Report written to ${outputPath}`);
  });
