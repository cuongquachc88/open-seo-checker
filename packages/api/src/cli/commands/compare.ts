import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { compareCrawls } from '../../compare/diff.js';

export const compareCommand = new Command('compare')
  .description('Compare two crawl databases')
  .argument('<db1>', 'First crawl database file (.db)')
  .argument('<db2>', 'Second crawl database file (.db)')
  .option('-o, --output <file>', 'Output JSON file for the diff report', 'crawl-diff.json')
  .option('--mapping <file>', 'JSON file with URL mapping (staging -> production)')
  .action(async (db1, db2, options) => {
    const dbPath1 = path.resolve(db1);
    const dbPath2 = path.resolve(db2);

    if (!fs.existsSync(dbPath1) || !fs.existsSync(dbPath2)) {
      console.error('One or both database files do not exist');
      process.exit(1);
    }

    let mapping: Record<string, string> | undefined;
    if (options.mapping) {
      mapping = JSON.parse(fs.readFileSync(path.resolve(options.mapping), 'utf8'));
    }

    const diff = await compareCrawls(dbPath1, dbPath2, { urlMapping: mapping });

    const outputPath = path.resolve(options.output);
    fs.writeFileSync(outputPath, JSON.stringify(diff, null, 2), 'utf8');

    console.log(`Added: ${diff.added.length}`);
    console.log(`Removed: ${diff.removed.length}`);
    console.log(`Changed: ${diff.changed.length}`);
    console.log(`Diff written to ${outputPath}`);
  });
