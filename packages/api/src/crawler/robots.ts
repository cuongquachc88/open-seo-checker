import { getDomain, normalizeUrl } from '../utils/url.js';
import type { RobotsInfo } from '../types/index.js';

const robotsCache = new Map<string, RobotsInfo>();

export async function fetchRobotsTxt(domain: string): Promise<RobotsInfo> {
  if (robotsCache.has(domain)) {
    return robotsCache.get(domain)!;
  }

  const robotsUrl = normalizeUrl('/robots.txt', `${domain.startsWith('http') ? '' : 'https://'}${domain}`);
  const normalizedDomain = getDomain(robotsUrl) || domain;

  let content = '';
  let isAllowed = true;
  let crawlDelay: number | undefined;
  const sitemaps: string[] = [];

  try {
    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': 'OpenSEOCrawler/1.0' },
    });

    if (response.ok) {
      content = await response.text();

      // Parse sitemaps
      const sitemapMatches = content.matchAll(/^Sitemap:\s*(.+)$/gim);
      for (const match of sitemapMatches) {
        sitemaps.push(normalizeUrl(match[1].trim()));
      }

      // Parse user-agent sections for OpenSEOCrawler/1.0 or *
      const lines = content.split('\n');
      let currentUserAgent = '';
      let matching = false;
      let globalMatched = false;
      let globalDelay: number | undefined;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#')) continue;

        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const directive = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();

        if (directive === 'user-agent') {
          currentUserAgent = value.toLowerCase();
          matching = currentUserAgent === '*' || currentUserAgent.includes('open') || currentUserAgent.includes('seo');
          if (currentUserAgent === '*') globalMatched = true;
        } else if (directive === 'crawl-delay' && (matching || currentUserAgent === '*')) {
          const delay = parseFloat(value);
          if (!isNaN(delay)) {
            if (currentUserAgent === '*') {
              globalDelay = delay;
            } else {
              crawlDelay = delay;
            }
          }
        }
      }

      if (globalDelay && !crawlDelay) {
        crawlDelay = globalDelay;
      }
    }
  } catch (err) {
    // robots.txt not found or unreachable, treat as allow all
    content = '';
  }

  const info: RobotsInfo = {
    url: robotsUrl,
    content,
    isAllowed,
    crawlDelay,
    sitemaps,
  };

  robotsCache.set(normalizedDomain, info);
  return info;
}

export function isAllowedByRobots(url: string, robotsTxt: string, userAgent: string): boolean {
  if (!robotsTxt) return true;

  // Simple robots.txt parser
  const lines = robotsTxt.split('\n');
  let currentUserAgent = '';
  let applies = false;
  let allowed = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const directive = line.substring(0, colonIndex).trim().toLowerCase();
    const value = line.substring(colonIndex + 1).trim();

    if (directive === 'user-agent') {
      currentUserAgent = value.toLowerCase();
      applies = currentUserAgent === '*' || userAgent.toLowerCase().includes(currentUserAgent);
    } else if (applies) {
      try {
        const urlPath = new URL(url).pathname + new URL(url).search;
        if (directive === 'disallow') {
          if (urlPath.startsWith(value)) allowed = false;
        } else if (directive === 'allow') {
          if (urlPath.startsWith(value)) allowed = true;
        }
      } catch {
        // ignore invalid URL
      }
    }
  }

  return allowed;
}

export function getRobotsCache(domain: string): RobotsInfo | undefined {
  return robotsCache.get(domain);
}

export function clearRobotsCache(): void {
  robotsCache.clear();
}
