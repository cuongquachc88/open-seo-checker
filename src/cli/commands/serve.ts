import { Command } from 'commander';
import { startServer } from '../../server/app.js';
import open from 'open';

export const serveCommand = new Command('serve')
  .description('Start the web UI server')
  .option('-p, --port <number>', 'Port to run the server on', '7437')
  .option('--no-open', 'Do not automatically open the browser', false)
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    const server = await startServer(port);

    console.log(`Open SEO Checker server running at http://localhost:${port}`);

    if (options.open) {
      await open(`http://localhost:${port}`);
    }

    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\nShutting down server...');
      server.close(() => {
        process.exit(0);
      });
    });
  });
