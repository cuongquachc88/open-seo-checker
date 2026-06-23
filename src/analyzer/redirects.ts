import type { CrawlIssue, CrawlUrl } from '../types/index.js';
import { getUrls, insertIssues } from '../storage/database.js';

export function analyzeRedirects(runId: number): void {
  const urls = getUrls(runId);
  if (urls.length === 0) return;

  const issues: CrawlIssue[] = [];

  for (const url of urls) {
    const chain = url.redirectChain || [];

    // Redirect chains
    if (chain.length > 1) {
      issues.push(createIssue(
        url,
        'redirect_chain',
        'medium',
        'Redirect Chain',
        `URL goes through a chain of ${chain.length} redirects before reaching the final destination.`,
        'Update links to point directly to the final destination URL to avoid redirect chains.'
      ));
    }

    // Redirect loops
    if (hasDuplicate(chain)) {
      issues.push(createIssue(
        url,
        'redirect_loop',
        'critical',
        'Redirect Loop',
        'The redirect chain contains a loop.',
        'Fix the redirect configuration to avoid infinite loops.'
      ));
    }

    // Temporary redirects for internal links
    if (url.isInternal && url.statusCode && [302, 307].includes(url.statusCode)) {
      issues.push(createIssue(
        url,
        'temporary_redirect',
        'medium',
        'Temporary Redirect for Internal URL',
        `URL returns a ${url.statusCode} temporary redirect.`,
        'Use a 301 permanent redirect for permanent moves, or 302/307 only for truly temporary changes.'
      ));
    }
  }

  insertIssues(runId, issues);
}

function hasDuplicate(chain: string[]): boolean {
  const seen = new Set<string>();
  for (const url of chain) {
    if (seen.has(url)) return true;
    seen.add(url);
  }
  return false;
}

function createIssue(
  url: CrawlUrl,
  type: string,
  priority: CrawlIssue['priority'],
  title: string,
  description: string,
  howToFix?: string
): CrawlIssue {
  return {
    urlId: url.id!,
    url: url.address,
    type,
    category: 'redirects',
    priority,
    title,
    description,
    howToFix,
  };
}
