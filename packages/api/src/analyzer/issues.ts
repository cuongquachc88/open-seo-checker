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

    // Mixed content on HTTPS pages
    if (url.hasMixedContent) {
      issues.push(createIssue(
        url,
        'mixed_content',
        'high',
        'Mixed Content',
        'HTTPS page loads HTTP resources (scripts, stylesheets, images, etc.).',
        'Update all resource references to use HTTPS.'
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

    // Low text ratio
    if (url.textRatio !== undefined && url.textRatio < 5) {
      issues.push(createIssue(
        url,
        'low_text_ratio',
        'low',
        'Low Text Ratio',
        `Text ratio is ${url.textRatio}%, which is very low.`,
        'Reduce boilerplate code and increase meaningful content on the page.'
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
