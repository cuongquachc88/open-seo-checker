import { Command } from 'commander';
import { calculateHealthScore } from '../../health-score.js';
import { openDatabase, getCrawlRuns } from '../../storage/database.js';

export const healthCommand = new Command('health')
  .description('Calculate SEO health score for a crawl database')
  .argument('<db>', 'Crawl database file (.db)')
  .option('--run-id <id>', 'Run ID (defaults to the first run in the database)', '1')
  .action(async (input, options) => {
    const dbPath = input.endsWith('.db') ? input : input + '.db';
    openDatabase(dbPath);

    const runId = parseInt(options.runId, 10);
    const runs = getCrawlRuns();
    const targetRunId = runs.find(r => r.id === runId)?.id || runs[0]?.id || 1;

    const result = calculateHealthScore(targetRunId);

    console.log(`SEO Health Score: ${result.score}/100`);
    console.log('Breakdown:');
    for (const [category, score] of Object.entries(result.breakdown)) {
      console.log(`  ${category}: ${score}/100`);
    }
    console.log(`Total issues: ${result.issues}`);
  });
