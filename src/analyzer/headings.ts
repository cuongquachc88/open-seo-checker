import type { CrawlIssue, CrawlUrl } from '../types/index.js';
import { getUrls, insertIssues } from '../storage/database.js';

export function analyzeHeadings(runId: number): void {
  const urls = getUrls(runId, { isInternal: true });
  if (urls.length === 0) return;

  const issues: CrawlIssue[] = [];
  const h1Map = new Map<string, CrawlUrl[]>();

  for (const url of urls) {
    const h1 = url.h1;
    const h1Count = url.h1Count ?? 0;
    const h2Count = url.h2Count ?? 0;

    // Missing h1
    if (h1Count === 0) {
      issues.push(createIssue(url, 'missing_h1', 'high', 'Missing H1', 'The page does not have an H1 heading.', 'Add a single, descriptive H1 heading to the page.'));
    }

    // Multiple h1s
    if (h1Count > 1) {
      issues.push(createIssue(url, 'multiple_h1', 'medium', 'Multiple H1 Tags', `The page contains ${h1Count} H1 headings.`, 'Use only one H1 per page, and use H2-H6 for subsections.'));
    }

    // Duplicate h1 tracking
    if (h1) {
      const normalizedH1 = h1.trim().toLowerCase();
      const existing = h1Map.get(normalizedH1) || [];
      existing.push(url);
      h1Map.set(normalizedH1, existing);
    }

    // H1 too long
    if (h1 && (url.h1Length ?? h1.length) > 70) {
      issues.push(createIssue(url, 'h1_too_long', 'medium', 'H1 Too Long', `H1 is ${url.h1Length} characters (max recommended 70).`, 'Shorten the H1 to be concise and under 70 characters.'));
    }

    // H1 same as title
    if (h1 && url.title1 && h1.trim().toLowerCase() === url.title1.trim().toLowerCase()) {
      issues.push(createIssue(url, 'h1_same_as_title', 'low', 'H1 Same as Title', 'The H1 heading is identical to the page title.', 'Consider making the H1 and title distinct for better SEO.'));
    }

    // Non-sequential headings: h2 exists without h1
    if (h1Count === 0 && h2Count > 0) {
      issues.push(createIssue(url, 'non_sequential_headings', 'medium', 'Non-Sequential Headings', 'The page contains H2 headings but no H1 heading.', 'Add an H1 heading before using H2 headings to maintain proper heading hierarchy.'));
    }
  }

  // Duplicate h1s
  for (const [h1, matchingUrls] of h1Map) {
    if (matchingUrls.length > 1) {
      for (const url of matchingUrls) {
        issues.push(createIssue(url, 'duplicate_h1', 'medium', 'Duplicate H1', `H1 "${h1}" is used on ${matchingUrls.length} pages.`, 'Write unique H1 headings for each page.'));
      }
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
    category: 'headings',
    priority,
    title,
    description,
    howToFix,
  };
}
