import type { CrawlConfig, CrawlRun } from '../types/index.js';

interface ScheduledJob {
  name: string;
  config: CrawlConfig;
  cronExpression: string;
  interval: NodeJS.Timeout;
  lastRunMinute?: string;
  nextRun?: Date;
  onRun?: (run: CrawlRun) => void;
}

const scheduledJobs = new Map<string, ScheduledJob>();
const CHECK_INTERVAL_MS = 30_000; // check every 30 seconds

export function scheduleCrawl(
  crawlConfig: CrawlConfig,
  cronExpression: string,
  onRun?: (run: CrawlRun) => void
): void {
  const name = crawlConfig.startUrl || `crawl-${Date.now()}`;

  // Cancel any existing schedule for the same start URL
  cancelSchedule(name);

  const normalizedCron = normalizeCronExpression(cronExpression);

  const job: ScheduledJob = {
    name,
    config: crawlConfig,
    cronExpression: normalizedCron,
    interval: setInterval(() => tick(job), CHECK_INTERVAL_MS),
    onRun,
  };

  scheduledJobs.set(name, job);

  // Run immediately if the expression matches the current time
  tick(job);
}

export function cancelSchedule(name: string): void {
  const job = scheduledJobs.get(name);
  if (!job) return;
  clearInterval(job.interval);
  scheduledJobs.delete(name);
}

export function getScheduledNames(): string[] {
  return Array.from(scheduledJobs.keys());
}

export function cancelAllSchedules(): void {
  for (const job of scheduledJobs.values()) {
    clearInterval(job.interval);
  }
  scheduledJobs.clear();
}

function tick(job: ScheduledJob): void {
  const now = new Date();
  const minuteKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;

  if (job.lastRunMinute === minuteKey) {
    return; // already ran this minute
  }

  if (!matchesCron(now, job.cronExpression)) {
    return;
  }

  job.lastRunMinute = minuteKey;
  job.nextRun = computeNextRun(now, job.cronExpression);

  const run = createRun(job.config);
  job.onRun?.(run);
}

function createRun(config: CrawlConfig): CrawlRun {
  const now = new Date().toISOString();
  return {
    id: Date.now(),
    name: config.startUrl,
    startUrl: config.startUrl,
    config: JSON.stringify(config),
    status: 'running',
    startedAt: now,
    urlsCrawled: 0,
    urlsFound: 0,
    errors: 0,
    redirects: 0,
    blocked: 0,
    dbPath: '',
  };
}

function normalizeCronExpression(expression: string): string {
  const trimmed = expression.trim().toLowerCase();
  const aliases: Record<string, string> = {
    '@yearly': '0 0 1 1 *',
    '@annually': '0 0 1 1 *',
    '@monthly': '0 0 1 * *',
    '@weekly': '0 0 * * 0',
    '@daily': '0 0 * * *',
    '@midnight': '0 0 * * *',
    '@hourly': '0 * * * *',
    daily: '0 0 * * *',
    weekly: '0 0 * * 0',
    monthly: '0 0 1 * *',
    hourly: '0 * * * *',
    'every minute': '* * * * *',
  };

  if (aliases[trimmed]) {
    return aliases[trimmed];
  }

  // Support simple "every N minutes" expressions
  const minuteMatch = trimmed.match(/^every\s+(\d+)\s+minutes?$/);
  if (minuteMatch) {
    const step = Number(minuteMatch[1]);
    return `*/${step} * * * *`;
  }

  return expression.trim();
}

function matchesCron(date: Date, expression: string): boolean {
  const parts = expression.split(/\s+/);
  if (parts.length !== 5) return false;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  return (
    fieldMatches(date.getMinutes(), minute) &&
    fieldMatches(date.getHours(), hour) &&
    fieldMatches(date.getDate(), dayOfMonth) &&
    fieldMatches(date.getMonth() + 1, month) &&
    fieldMatches(date.getDay(), dayOfWeek)
  );
}

function fieldMatches(value: number, pattern: string): boolean {
  if (pattern === '*') return true;

  if (pattern.includes(',')) {
    return pattern.split(',').some(p => fieldMatches(value, p.trim()));
  }

  if (pattern.includes('/')) {
    const [base, step] = pattern.split('/');
    const start = base === '*' ? 0 : Number(base);
    const s = Number(step);
    if (Number.isNaN(start) || Number.isNaN(s) || s === 0) return false;
    return value >= start && (value - start) % s === 0;
  }

  if (pattern.includes('-')) {
    const [start, end] = pattern.split('-').map(Number);
    return !Number.isNaN(start) && !Number.isNaN(end) && value >= start && value <= end;
  }

  return value === Number(pattern);
}

function computeNextRun(from: Date, expression: string): Date {
  const next = new Date(from.getTime() + 60_000); // start at next minute
  // Safety guard: stop searching after one year
  const max = new Date(next.getTime() + 365 * 24 * 60 * 60_000);
  while (next < max) {
    if (matchesCron(next, expression)) {
      return new Date(next);
    }
    next.setMinutes(next.getMinutes() + 1);
  }
  return max;
}
