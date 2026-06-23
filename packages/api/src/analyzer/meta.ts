import type { CrawlIssue, CrawlUrl } from '../types/index.js';
import { getUrls, insertIssues } from '../storage/database.js';
import { calculatePixelWidth } from '../utils/pixel-width.js';

export function analyzeMeta(runId: number): void {
  const urls = getUrls(runId, { isInternal: true });
  if (urls.length === 0) return;

  const issues: CrawlIssue[] = [];
  const descriptionMap = new Map<string, CrawlUrl[]>();

  for (const url of urls) {
    const desc = url.metaDescription1;

    if (!desc) {
      issues.push(createIssue(url, 'missing_meta_description', 'high', 'Missing Meta Description', 'The page does not have a meta description.', 'Add a unique, compelling meta description to the page.'));
      continue;
    }

    // Length checks
    if (desc.length > 155) {
      issues.push(createIssue(url, 'meta_description_too_long', 'medium', 'Meta Description Too Long', `Meta description is ${desc.length} characters (max recommended 155).`, 'Shorten the meta description to 155 characters or fewer.'));
    }
    if (desc.length < 70) {
      issues.push(createIssue(url, 'meta_description_too_short', 'medium', 'Meta Description Too Short', `Meta description is only ${desc.length} characters (min recommended 70).`, 'Expand the meta description to better summarize the page.'));
    }

    // Pixel width
    const pixelWidth = calculatePixelWidth(desc, 'description');
    if (pixelWidth > 985) {
      issues.push(createIssue(url, 'meta_description_truncated', 'medium', 'Meta Description May Be Truncated', `Meta description pixel width is ${pixelWidth}px (max ~985px).`, 'Shorten the meta description so it is not truncated in search results.'));
    }

    // Multiple meta descriptions
    if (url.metaDescription2) {
      issues.push(createIssue(url, 'multiple_meta_descriptions', 'high', 'Multiple Meta Descriptions', 'The page contains more than one meta description tag.', 'Remove the duplicate meta description tag so only one remains.'));
    }

    // Duplicate tracking
    const normalizedDesc = desc.trim().toLowerCase();
    const existing = descriptionMap.get(normalizedDesc) || [];
    existing.push(url);
    descriptionMap.set(normalizedDesc, existing);
  }

  // Duplicate meta descriptions
  for (const [desc, matchingUrls] of descriptionMap) {
    if (matchingUrls.length > 1) {
      for (const url of matchingUrls) {
        issues.push(createIssue(url, 'duplicate_meta_description', 'medium', 'Duplicate Meta Description', `Meta description "${desc}" is used on ${matchingUrls.length} pages.`, 'Write unique meta descriptions for each page.'));
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
    category: 'meta-description',
    priority,
    title,
    description,
    howToFix,
  };
}
