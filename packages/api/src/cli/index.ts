import { Command } from 'commander';
import { crawlCommand } from './commands/crawl.js';
import { serveCommand } from './commands/serve.js';
import { sitemapCommand } from './commands/sitemap.js';
import { compareCommand } from './commands/compare.js';
import { logsCommand } from './commands/logs.js';
import { healthCommand } from './commands/health.js';

export function buildCli(program: Command): void {
  program.addCommand(crawlCommand);
  program.addCommand(serveCommand);
  program.addCommand(sitemapCommand);
  program.addCommand(compareCommand);
  program.addCommand(logsCommand);
  program.addCommand(healthCommand);

  // Default: if no command, show help
  program.action(() => {
    program.help();
  });
}
