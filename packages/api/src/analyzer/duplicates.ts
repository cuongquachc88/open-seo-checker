import type { CrawlIssue, CrawlUrl } from '../types/index.js';
import { getUrls, insertIssues } from '../storage/database.js';

export function analyzeDuplicates(runId: number): void {
  const urls = getUrls(runId, { isInternal: true });
  if (urls.length === 0) return;

  const issues: CrawlIssue[] = [];
  const hashGroups = new Map<string, CrawlUrl[]>();

  for (const url of urls) {
    if (url.hash) {
      const group = hashGroups.get(url.hash) || [];
      group.push(url);
      hashGroups.set(url.hash, group);
    }

    if (url.closestSimilarityMatch !== undefined && url.closestSimilarityMatch > 90) {
      issues.push(createIssue(
        url,
        'near_duplicate_content',
        'medium',
        'Near-Duplicate Content',
        `Page content is ${url.closestSimilarityMatch.toFixed(1)}% similar to another page.`,
        'Consolidate near-duplicate pages or add unique, valuable content to differentiate them.'
      ));
    }
  }

  for (const [hash, group] of hashGroups) {
    if (group.length > 1) {
      for (const url of group) {
        issues.push(createIssue(
          url,
          'exact_duplicate_content',
          'high',
          'Exact Duplicate Content',
          `This page has identical content to ${group.length - 1} other page(s) (hash ${hash.slice(0, 8)}...).`,
          'Use canonical tags or consolidate the duplicate pages to avoid search engine confusion.'
        ));
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
    category: 'content',
    priority,
    title,
    description,
    howToFix,
  };
}
