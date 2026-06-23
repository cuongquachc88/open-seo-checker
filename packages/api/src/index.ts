#!/usr/bin/env node
import { program } from 'commander';
import { buildCli } from './cli/index.js';
import pkg from '../package.json' with { type: 'json' };

async function main() {
  program
    .name('open-seo-checker')
    .description('Open-source, cross-platform SEO auditing tool with CLI and Web UI')
    .version(pkg.version);

  buildCli(program);

  await program.parseAsync(process.argv);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
