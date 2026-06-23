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

/** Render the bordered ASCII banner around the wordmark + tagline.
 *
 *  When a `tagRow` is supplied it is rendered as a second-to-last row
 *  inside the box — that's the place where we paint the role identity
 *  (`●  BACKEND  ·  Hono + SQLite`) so the same wordmark reads as the
 *  BACKEND vs FRONTEND service at a glance. */
function renderBanner(color: string = ANSI.cyan, tagRow?: string): string {
  const visLen = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '').length;
  const wordmarkWidths = WORDMARK_BLOCK.map(l => l.length);
  const safeTagRow = tagRow ?? '';
  const innerWidth = Math.max(
    ...wordmarkWidths,
    TAGLINE.length,
    visLen(safeTagRow),
  );
  const frame = `${ANSI.bold}${color}`;
  const fill = (s: string, w: number) =>
    `${s}${' '.repeat(Math.max(0, w - visLen(s)))}`;
  const horiz = `${frame}+${'='.repeat(innerWidth + 2)}+${ANSI.reset}`;
  const inner = WORDMARK_BLOCK.map(
    l => `${frame}|${ANSI.reset} ${ANSI.bold}${color}${fill(l, innerWidth)}${ANSI.reset} ${frame}|${ANSI.reset}`,
  );
  const taglineLine = `${frame}|${ANSI.reset} ${ANSI.dim}${color}${fill(TAGLINE, innerWidth)}${ANSI.reset} ${frame}|${ANSI.reset}`;
  if (!safeTagRow) {
    return [horiz, ...inner, taglineLine, horiz].join('\n');
  }
  const tagLine = `${frame}|${ANSI.reset} ${ANSI.bold}${fill(safeTagRow, innerWidth)}${ANSI.reset} ${frame}|${ANSI.reset}`;
  return [horiz, ...inner, taglineLine, tagLine, horiz].join('\n');
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
  // The same wordmark gets a coloured identity strip baked into the box,
  // so reading the banner already tells you "this is the BACKEND" or
  // "this is the FRONTEND" without needing the extra row below.
  const identityTag =
    `\u25CF  ${role.toUpperCase()}  \u00B7  ${stack}`;
  const out: string[] = [];
  if (newlineBefore) out.push('');
  if (boxedRender) {
    out.push(renderBanner(roleColor, `${ANSI.bold}${roleColor}${identityTag}${ANSI.reset}`));
  } else {
    out.push(
      `  ${ANSI.bold}${roleColor}\u25CF${ANSI.reset}  ${ANSI.bold}${roleColor}${role.toUpperCase()}${ANSI.reset}  ${ANSI.bold}${ANSI.dim}\u00B7${ANSI.reset}  ${ANSI.bold}${stack}${ANSI.reset}`,
    );
  }
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

/** Convenience: frontend banner (magenta-themed, distinct from server). */
export function printFrontendBanner(port: number, version?: string): void {
  printRoleBanner({
    role: 'frontend',
    stack: 'Vite + React 19',
    lines: [
      `  ${ANSI.dim}v${version ?? '0.1.0'}${ANSI.reset}    ${ANSI.bold}\u25B6${ANSI.reset} dev server on ${ANSI.bold}${ANSI.green}http://localhost:${port}${ANSI.reset}`,
      `  ${ANSI.dim}/api proxied to the backend at :7437 (HMR + SPA).${ANSI.reset}`,
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
