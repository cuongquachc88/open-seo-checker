import type { CrawlConfig, CrawlIssue, CrawlUrl } from '../types/index.js';
import { getUrls, insertIssues } from '../storage/database.js';

export function generateIssues(runId: number, config: CrawlConfig): void {
  const urls = getUrls(runId, { isInternal: true });
  if (urls.length === 0) return;

  const issues: CrawlIssue[] = [];

  for (const url of urls) {
    // Non-200 status codes for internal pages
    if (url.statusCode && url.statusCode >= 400) {
      const priority = url.statusCode >= 500 ? 'critical' : 'high';
      issues.push(createIssue(
        url,
        'broken_internal_page',
        priority,
        'Broken Internal Page',
        `Internal page returned a ${url.statusCode} ${url.status || 'error'} status.`,
        'Investigate and fix the broken page or remove links to it.'
      ));
    }

    // No response pages
    if (url.statusCategory === 'no-response' && url.statusCode === 0) {
      issues.push(createIssue(
        url,
        'no_response',
        'critical',
        'No Response',
        'The page did not return a response.',
        'Check the server configuration and DNS settings for this URL.'
      ));
    }

    // Indexability issues
    if (url.indexability === 'non-indexable' && url.indexabilityStatus) {
      issues.push(createIssue(
        url,
        'non_indexable',
        'medium',
        'Non-Indexable Page',
        `Page is not indexable: ${url.indexabilityStatus}.`,
        'Review whether this page should be indexable and update robots meta, canonical, or server configuration accordingly.'
      ));
    }

  }

  insertIssues(runId, issues);
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
    category: 'response-codes',
    priority,
    title,
    description,
    howToFix,
  };
}
