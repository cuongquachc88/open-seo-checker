import type { CrawlIssue, CrawlUrl } from '../types/index.js';
import { getUrls, insertIssues } from '../storage/database.js';
import {
  hasInternalSearchParameter,
  hasMultipleSlashes,
  hasNonAsciiCharacters,
  hasRepetitivePath,
  hasSpace,
  hasUnderscore,
  hasUppercase,
  hasUrlParameter,
  isOverLength,
} from '../utils/url.js';

export function analyzeUrls(runId: number): void {
  const urls = getUrls(runId, { isInternal: true });
  if (urls.length === 0) return;

  const issues: CrawlIssue[] = [];

  for (const url of urls) {
    const address = url.address;

    if (hasNonAsciiCharacters(address)) {
      issues.push(createIssue(url, 'non_ascii_url', 'medium', 'Non-ASCII URL', 'The URL contains non-ASCII characters.', 'Use ASCII characters in URLs or properly encode them.'));
    }

    if (hasUnderscore(address)) {
      issues.push(createIssue(url, 'url_contains_underscore', 'low', 'URL Contains Underscore', 'The URL path contains underscores.', 'Use hyphens instead of underscores in URLs for better SEO.'));
    }

    if (hasUppercase(address)) {
      issues.push(createIssue(url, 'url_contains_uppercase', 'low', 'URL Contains Uppercase', 'The URL path contains uppercase characters.', 'Use lowercase characters in URLs.'));
    }

    if (hasMultipleSlashes(address)) {
      issues.push(createIssue(url, 'url_multiple_slashes', 'medium', 'URL Contains Multiple Slashes', 'The URL path contains consecutive slashes.', 'Remove duplicate slashes from the URL path.'));
    }

    if (hasRepetitivePath(address)) {
      issues.push(createIssue(url, 'url_repetitive_path', 'low', 'URL Has Repetitive Path', 'The URL path repeats the same segment.', 'Remove repetitive path segments from the URL.'));
    }

    if (hasSpace(address)) {
      issues.push(createIssue(url, 'url_contains_space', 'medium', 'URL Contains Spaces', 'The URL path contains spaces.', 'Replace spaces with hyphens or encode them properly.'));
    }

    if (hasInternalSearchParameter(address)) {
      issues.push(createIssue(url, 'internal_search_url', 'medium', 'Internal Search URL', 'The URL appears to be an internal search result page.', 'Consider blocking search result pages from crawling with robots.txt or noindex.'));
    }

    if (hasUrlParameter(address)) {
      issues.push(createIssue(url, 'url_has_parameters', 'low', 'URL Contains Parameters', 'The URL contains query parameters.', 'Review whether parameters are necessary and consider canonical tags if content is duplicated.'));
    }

    if (isOverLength(address, 115)) {
      issues.push(createIssue(url, 'url_too_long', 'medium', 'URL Too Long', `URL is ${address.length} characters (max recommended 115).`, 'Shorten the URL to improve usability and SEO.'));
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
    category: 'url',
    priority,
    title,
    description,
    howToFix,
  };
}

export function analyzeUrl(runId: number): void {
  analyzeUrls(runId);
}
