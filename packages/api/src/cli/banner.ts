/**
 * Shared CLI banner printer + coloured status helpers.
 *
 * Conventions
 * ===========
 *   - Frame / wordmark  ->  cyan / bold
 *   - backend role      ->  blue
 *   - frontend role     ->  magenta
 *   - success / ok      ->  green
 *   - warning           ->  yellow
 *   - error             ->  red
 *   - taglines / info   ->  dim
 *
 * Falls back to plain output when stdout is piped (no TTY) so logs stay
 * parseable for tools like CI / log aggregators.
 */
const USE_COLOR =
  process.stdout.isTTY &&
  process.env.NO_COLOR === undefined &&
  process.env.FORCE_COLOR !== '0';

export const ANSI = {
  reset: USE_COLOR ? '\x1b[0m' : '',
  bold: USE_COLOR ? '\x1b[1m' : '',
  dim: USE_COLOR ? '\x1b[2m' : '',
  cyan: USE_COLOR ? '\x1b[36m' : '',
  blue: USE_COLOR ? '\x1b[34m' : '',
  magenta: USE_COLOR ? '\x1b[35m' : '',
  green: USE_COLOR ? '\x1b[32m' : '',
  yellow: USE_COLOR ? '\x1b[33m' : '',
  red: USE_COLOR ? '\x1b[31m' : '',
};

const WORDMARK_BLOCK = [
  '  ____                  _____ ____ ___   _____                       ',
  ' / __ \\                / ___|  __/ __ \\ / ____|                      ',
  '| |  | |_ __   ___ _ _| (___ |__ \\ ___ | (___                       ',
  '| |  | |\'_ \\ / _ \\ \'_ \\___ \\| |/ / |__/_ \\___ \\                     ',
  '| |__| | |_) |  __/ | | __/ / |__| | __| __/ /                      ',
  ' \\___\\_| .__/ \\___|_| |_____/|_|  | _____|\\____|                      ',
  '       |_|                                                           ',
];

const TAGLINE = 'O P E N   S E O   C H E C K E R';

/** Render the bordered ASCII banner around the wordmark + tagline. */
function renderBanner(color: string = ANSI.cyan): string {
  const wordmarkWidths = WORDMARK_BLOCK.map(l => l.length);
  const innerWidth = Math.max(...wordmarkWidths, TAGLINE.length);
  const frame = `${ANSI.bold}${color}`;
  const reset = ANSI.reset;
  const fill = (s: string, w: number) => s.padEnd(w, ' ');
  const horiz = `${frame}+${'='.repeat(innerWidth + 2)}+${reset}`;
  const inner = WORDMARK_BLOCK.map(
    l => `${frame}|${reset} ${ANSI.bold}${color}${fill(l, innerWidth)}${reset} ${frame}|${reset}`,
  );
  const sub = `${frame}|${reset} ${ANSI.dim}${color}${fill(TAGLINE, innerWidth)}${reset} ${frame}|${reset}`;
  return [horiz, ...inner, sub, horiz].join('\n');
}

export interface RoleBannerOptions {
  /** Logical role, e.g. "backend", "frontend", "crawler". */
  role: 'backend' | 'frontend' | 'crawler' | 'sitemap' | 'compare' | 'logs' | string;
  /** Stack used by the role, e.g. "Hono + SQLite". */
  stack: string;
  /** Taglines printed below the box. */
  lines?: string[];
  /** When true, render the box (default). */
  boxed?: boolean;
  /** When false, skip the leading empty line (for chained output). */
  newlineBefore?: boolean;
}

/** Big role banner used when the server, crawler or sitemap command boots. */
export function printRoleBanner({
  role,
  stack,
  lines = [],
  boxed: boxedRender = true,
  newlineBefore = true,
}: RoleBannerOptions): void {
  const roleColor =
    role === 'backend' || role === 'api' || role === 'server'
      ? ANSI.blue
      : role === 'frontend' || role === 'web'
      ? ANSI.magenta
      : ANSI.cyan;
  const dim = ANSI.dim;
  const reset = ANSI.reset;
  const out: string[] = [];
  if (newlineBefore) out.push('');
  if (boxedRender) {
    out.push(renderBanner(ANSI.cyan));
  }
  out.push(
    `  ${ANSI.bold}${roleColor}\u25CF${reset}  ${ANSI.bold}${role.toUpperCase()}${reset}  ${dim}x${reset} ${ANSI.bold}${stack}${reset}`,
  );
  for (const line of lines) out.push(line);
  out.push('');
  process.stdout.write(out.join('\n'));
}

/** Convenience: server banner. */
export function printServerBanner(port: number, version?: string): void {
  printRoleBanner({
    role: 'backend',
    stack: 'Hono + SQLite',
    lines: [
      `  ${ANSI.dim}v${version ?? '0.1.0'}${ANSI.reset}    ${ANSI.bold}\u25B6${ANSI.reset} listening on ${ANSI.bold}${ANSI.green}http://localhost:${port}${ANSI.reset}`,
      `  ${ANSI.dim}Dashboard SPA served on the same port.${ANSI.reset}`,
      `  ${ANSI.dim}Ctrl+C to stop. Logs forwarded to ${process.stdout.isTTY ? 'terminal' : 'stdout'}.${ANSI.reset}`,
    ],
  });
}

/** Convenience: crawler banner. */
export function printCrawlBanner(target: string, mode: string): void {
  printRoleBanner({
    role: 'crawler',
    stack: `mode ${mode}`,
    lines: [
      `  ${ANSI.dim}target${ANSI.reset}  ${ANSI.bold}${target}${ANSI.reset}`,
      `  ${ANSI.dim}Ctrl+C to interrupt. Results stream to the workspace database.${ANSI.reset}`,
    ],
  });
}

// ---------------------------------------------------------------------------
// Status helpers — used everywhere a server / cli action prints a result.
// ---------------------------------------------------------------------------

/** Green check: `OK    label`. */
export function printOk(label: string, detail?: string): void {
  const tag = `${ANSI.green}${ANSI.bold}\u2713${ANSI.reset}`;
  const tail = detail ? `  ${ANSI.dim}${detail}${ANSI.reset}` : '';
  process.stdout.write(`  ${tag}  ${label}${tail}\n`);
}

/** Yellow warning: `WARN  label`. */
export function printWarn(label: string, detail?: string): void {
  const tag = `${ANSI.yellow}${ANSI.bold}!${ANSI.reset}`;
  const tail = detail ? `  ${ANSI.dim}${detail}${ANSI.reset}` : '';
  process.stdout.write(`  ${tag}  ${label}${tail}\n`);
}

/** Red error: `ERR   label`. */
export function printError(label: string, detail?: string): void {
  const tag = `${ANSI.red}${ANSI.bold}\u2717${ANSI.reset}`;
  const tail = detail ? `  ${ANSI.dim}${detail}${ANSI.reset}` : '';
  process.stdout.write(`  ${tag}  ${label}${tail}\n`);
}

/** Bullet: `   - label  detail`. */
export function printBullet(label: string, detail?: string): void {
  const tail = detail ? `  ${ANSI.dim}${detail}${ANSI.reset}` : '';
  process.stdout.write(`    ${ANSI.dim}\u2022${ANSI.reset}  ${label}${tail}\n`);
}

export { renderBanner };
