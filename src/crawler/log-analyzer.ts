import fs from 'fs';
import readline from 'readline';
import type { LogAnalysisSummary, LogEntry } from '../types/index.js';

const KNOWN_BOTS = [
  { name: 'Googlebot', pattern: /Googlebot\//i },
  { name: 'Googlebot-Image', pattern: /Googlebot-Image/i },
  { name: 'Googlebot-News', pattern: /Googlebot-News/i },
  { name: 'Bingbot', pattern: /bingbot\//i },
  { name: 'GPTBot', pattern: /GPTBot/i },
  { name: 'ClaudeBot', pattern: /ClaudeBot/i },
  { name: 'PerplexityBot', pattern: /PerplexityBot/i },
  { name: 'ChatGPT-User', pattern: /ChatGPT-User/i },
  { name: 'Applebot', pattern: /Applebot/i },
  { name: 'Anthropic', pattern: /Anthropic/i },
];

const APACHE_NGINX_LOG_REGEX =
  /^(\S+)\s+(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+"([^"]+)"\s+(\d{3})\s+(\S+)\s+"([^"]*)"\s+"([^"]*)"$/;

const CDN_LOG_REGEX =
  /^(?<timestamp>[^\s,]+).*?(?<ip>\d+\.\d+\.\d+\.\d+).*?(?<method>GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH).*?(?<url>\S+).*?(?<status>\d{3}).*?(?<bytes>\d+|-).*?"(?<userAgent>[^"]*)"/i;

export function analyzeLogFile(
  filePath: string,
  options: { bot?: string; startDate?: string; endDate?: string } = {}
): LogAnalysisSummary {
  if (!fs.existsSync(filePath)) {
    return emptySummary();
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(line => line.trim().length > 0);

  const entries: LogEntry[] = [];
  for (const line of lines) {
    const entry = parseLogLine(line);
    if (entry) {
      entries.push(entry);
    }
  }

  return summarize(entries, options);
}

export function parseLogLine(line: string): LogEntry | null {
  // Try Apache/Nginx combined format first
  let match = line.match(APACHE_NGINX_LOG_REGEX);
  if (match) {
    const [, ip, ident, authuser, timestamp, request, statusCodeStr, bytesStr, referrer, userAgent] = match;
    const { method, url, protocol } = parseRequest(request);
    return buildEntry(ip, timestamp, method, url, protocol, Number(statusCodeStr), bytesStr, referrer, userAgent);
  }

  // Try generic CDN/CSV-like format
  match = line.match(CDN_LOG_REGEX);
  if (match && match.groups) {
    const groups = match.groups;
    const timestamp = normalizeTimestamp(groups.timestamp ?? '');
    return buildEntry(
      groups.ip ?? '-',
      timestamp,
      (groups.method ?? 'GET').toUpperCase(),
      groups.url ?? '',
      'HTTP/1.1',
      Number(groups.status ?? 0),
      groups.bytes ?? '0',
      '-',
      groups.userAgent ?? ''
    );
  }

  return null;
}

function parseRequest(request: string): { method: string; url: string; protocol: string } {
  const parts = request.split(' ');
  if (parts.length >= 3) {
    return { method: parts[0], url: parts[1], protocol: parts[2] };
  }
  if (parts.length === 2) {
    return { method: parts[0], url: parts[1], protocol: '' };
  }
  return { method: 'GET', url: request, protocol: '' };
}

function buildEntry(
  ip: string,
  timestamp: string,
  method: string,
  url: string,
  protocol: string,
  statusCode: number,
  bytesStr: string,
  referrer: string,
  userAgent: string
): LogEntry {
  const botName = detectBot(userAgent);
  const isBot = botName !== null;
  const bytes = bytesStr === '-' ? 0 : Number(bytesStr) || 0;

  return {
    ip,
    timestamp: normalizeTimestamp(timestamp),
    method: method.toUpperCase(),
    url: normalizeUrlPath(url),
    statusCode,
    bytes,
    referrer: referrer === '-' ? undefined : referrer,
    userAgent,
    isBot,
    botName: botName ?? undefined,
  };
}

function detectBot(userAgent: string): string | null {
  for (const bot of KNOWN_BOTS) {
    if (bot.pattern.test(userAgent)) {
      return bot.name;
    }
  }
  return null;
}

function normalizeUrlPath(url: string): string {
  if (!url || url === '-') return '/';
  // Remove query strings and fragments for cleaner URL grouping
  try {
    const parsed = new URL(url, 'http://example.com');
    return parsed.pathname + parsed.search;
  } catch {
    return url.split('?')[0].split('#')[0];
  }
}

function normalizeTimestamp(timestamp: string): string {
  if (!timestamp) return new Date().toISOString();
  // Try ISO format first
  if (/^\d{4}-\d{2}-\d{2}T/.test(timestamp)) return timestamp;
  // Try Apache/Nginx format: 10/Oct/2000:13:55:36 -0700
  const apacheMatch = timestamp.match(/^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s+([+-]\d{4})$/);
  if (apacheMatch) {
    const [, day, monthStr, year, hour, minute, second, offset] = apacheMatch;
    const month = new Date(`${monthStr} 1, 2000`).getMonth() + 1;
    const iso = `${year}-${String(month).padStart(2, '0')}-${day}T${hour}:${minute}:${second}${offset}`;
    return new Date(iso).toISOString();
  }
  return timestamp;
}

function summarize(entries: LogEntry[], options: { bot?: string; startDate?: string; endDate?: string }): LogAnalysisSummary {
  const start = options.startDate ? new Date(options.startDate) : null;
  const end = options.endDate ? new Date(options.endDate) : null;
  const botFilter = options.bot?.toLowerCase();

  const filtered = entries.filter(entry => {
    const ts = new Date(entry.timestamp);
    if (start && ts < start) return false;
    if (end && ts > end) return false;
    if (botFilter) {
      return entry.isBot && entry.botName?.toLowerCase() === botFilter;
    }
    return true;
  });

  const totalRequests = filtered.length;
  const botRequests = filtered.filter(e => e.isBot).length;
  const uniqueUrls = new Set(filtered.map(e => e.url)).size;

  const statusDistribution: Record<string, number> = {};
  const botDistribution: Record<string, number> = {};
  const urlCounts = new Map<string, number>();
  const botUrlCounts = new Map<string, number>();
  const non200BotHits = new Map<string, { count: number; statusCode: number }>();

  for (const entry of filtered) {
    const statusKey = String(entry.statusCode);
    statusDistribution[statusKey] = (statusDistribution[statusKey] || 0) + 1;

    if (entry.isBot && entry.botName) {
      botDistribution[entry.botName] = (botDistribution[entry.botName] || 0) + 1;
    }

    urlCounts.set(entry.url, (urlCounts.get(entry.url) || 0) + 1);

    if (entry.isBot) {
      botUrlCounts.set(entry.url, (botUrlCounts.get(entry.url) || 0) + 1);
      if (entry.statusCode < 200 || entry.statusCode >= 300) {
        const existing = non200BotHits.get(entry.url);
        if (existing) {
          existing.count += 1;
        } else {
          non200BotHits.set(entry.url, { count: 1, statusCode: entry.statusCode });
        }
      }
    }
  }

  const topUrls = Array.from(urlCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([url, count]) => ({ url, count }));

  // Orphan URLs = URLs that bots hit but that returned non-200 status (likely not in site crawl)
  const orphanUrls = Array.from(non200BotHits.entries())
    .filter(([, data]) => data.count >= 3)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([url]) => url);

  const crawlBudgetWaste = Array.from(non200BotHits.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([url, data]) => ({ url, count: data.count, statusCode: data.statusCode }));

  return {
    totalRequests,
    botRequests,
    uniqueUrls,
    statusDistribution,
    botDistribution,
    topUrls,
    orphanUrls,
    crawlBudgetWaste,
  };
}

function emptySummary(): LogAnalysisSummary {
  return {
    totalRequests: 0,
    botRequests: 0,
    uniqueUrls: 0,
    statusDistribution: {},
    botDistribution: {},
    topUrls: [],
    orphanUrls: [],
    crawlBudgetWaste: [],
  };
}

export async function analyzeLogFileStream(
  filePath: string,
  options: { bot?: string; startDate?: string; endDate?: string } = {}
): Promise<LogAnalysisSummary> {
  if (!fs.existsSync(filePath)) {
    return emptySummary();
  }

  const entries: LogEntry[] = [];
  const stream = readline.createInterface({ input: fs.createReadStream(filePath, 'utf8') });

  for await (const line of stream) {
    const entry = parseLogLine(line);
    if (entry) {
      entries.push(entry);
    }
  }

  return summarize(entries, options);
}
