/**
 * Shared CLI banner printer.
 *
 * Prints the Open SEO Checker ASCII mark with optional ANSI styling. Falls
 * back to plain output when stdout is piped (no TTY) so logs stay parseable.
 */
const BANNER = `
 O P E N   S E O   C H E C K E R
`;

const USE_COLOR =
  process.stdout.isTTY &&
  process.env.NO_COLOR === undefined &&
  process.env.FORCE_COLOR !== '0';

const ANSI = {
  reset: USE_COLOR ? '\x1b[0m' : '',
  bold: USE_COLOR ? '\x1b[1m' : '',
  dim: USE_COLOR ? '\x1b[2m' : '',
  cyan: USE_COLOR ? '\x1b[36m' : '',
  blue: USE_COLOR ? '\x1b[34m' : '',
  magenta: USE_COLOR ? '\x1b[35m' : '',
  green: USE_COLOR ? '\x1b[32m' : '',
};

export interface BannerOptions {
  /** Headline above the marks (e.g. role or stage). */
  title?: string;
  /** Taglines below the marks, e.g. version, ports. */
  lines?: string[];
  /** Extra empty line before the banner. */
  newlineBefore?: boolean;
}

export function printBanner(options: BannerOptions = {}): void {
  const { title, lines = [], newlineBefore = true } = options;
  const out: string[] = [];
  if (newlineBefore) out.push('');
  if (title) {
    out.push(`${ANSI.bold}${ANSI.cyan}=== ${title} ===${ANSI.reset}`);
    out.push('');
  }
  out.push(`${ANSI.bold}${ANSI.cyan}${BANNER}${ANSI.reset}`);
  for (const line of lines) {
    out.push(line);
  }
  out.push('');
  process.stdout.write(out.join('\n'));
}

/** Convenience: print the role-specific banner. */
export function printServerBanner(port: number, version?: string): void {
  printBanner({
    title: 'backend · Hono',
    lines: [
      `${ANSI.blue}v${version ?? '0.1.0'}${ANSI.reset}  listening on ${ANSI.bold}http://localhost:${port}${ANSI.reset}`,
      `Dashboard SPA served on the same port (no separate frontend needed).`,
      `${ANSI.dim}Ctrl+C to stop. Logs are forwarded to ${process.stdout.isTTY ? 'the terminal' : 'stdout'}.${ANSI.reset}`,
    ],
  });
}

export function printCrawlBanner(target: string, mode: string): void {
  printBanner({
    title: `crawler · ${mode}`,
    lines: [
      `Target: ${ANSI.bold}${target}${ANSI.reset}`,
      `${ANSI.dim}Press Ctrl+C to interrupt the crawl. Results stream to the database.${ANSI.reset}`,
    ],
  });
}
