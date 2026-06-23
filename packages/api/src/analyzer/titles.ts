import type { CrawlIssue, CrawlUrl } from '../types/index.js';
import { getUrls, insertIssues } from '../storage/database.js';
import { calculatePixelWidth } from '../utils/pixel-width.js';

export function analyzeTitles(runId: number): void {
  const urls = getUrls(runId, { isInternal: true });
  if (urls.length === 0) return;

  const issues: CrawlIssue[] = [];
  const titleMap = new Map<string, CrawlUrl[]>();

  for (const url of urls) {
    const title = url.title1;

    if (!title) {
      issues.push(createIssue(url, 'missing_title', 'high', 'Missing Page Title', 'The page does not have a <title> tag.', 'Add a unique, descriptive title tag to the page head.'));
      continue;
    }

    // Length checks
    if (title.length > 60) {
      issues.push(createIssue(url, 'title_too_long', 'medium', 'Title Too Long', `Title is ${title.length} characters (max recommended 60).`, 'Shorten the title to 60 characters or fewer.'));
    }
    if (title.length < 30) {
      issues.push(createIssue(url, 'title_too_short', 'medium', 'Title Too Short', `Title is only ${title.length} characters (min recommended 30).`, 'Expand the title to be more descriptive and at least 30 characters.'));
    }

    // Pixel width
    const pixelWidth = calculatePixelWidth(title, 'title');
    if (pixelWidth > 561) {
      issues.push(createIssue(url, 'title_truncated', 'medium', 'Title May Be Truncated', `Title pixel width is ${pixelWidth}px (max ~561px).`, 'Shorten the title so it is not truncated in search results.'));
    }

    // Multiple title tags
    if (url.title2) {
      issues.push(createIssue(url, 'multiple_titles', 'high', 'Multiple Title Tags', 'The page contains more than one <title> tag.', 'Remove the duplicate title tag so only one remains.'));
    }

    // Same as h1
    if (url.h1 && title.trim().toLowerCase() === url.h1.trim().toLowerCase()) {
      issues.push(createIssue(url, 'title_same_as_h1', 'low', 'Title Same as H1', 'The page title is identical to the H1 heading.', 'Consider making the title and H1 distinct for better SEO.'));
    }

    // Duplicate tracking
    const normalizedTitle = title.trim().toLowerCase();
    const existing = titleMap.get(normalizedTitle) || [];
    existing.push(url);
    titleMap.set(normalizedTitle, existing);
  }

  // Duplicate titles
  for (const [title, matchingUrls] of titleMap) {
    if (matchingUrls.length > 1) {
      for (const url of matchingUrls) {
        issues.push(createIssue(url, 'duplicate_title', 'medium', 'Duplicate Title', `Title "${title}" is used on ${matchingUrls.length} pages.`, 'Write unique title tags for each page.'));
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
    category: 'page-titles',
    priority,
    title,
    description,
    howToFix,
  };
}
