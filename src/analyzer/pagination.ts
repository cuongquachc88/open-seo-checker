import type { CrawlIssue, CrawlUrl } from '../types/index.js';
import { getUrls, insertIssues } from '../storage/database.js';
import { normalizeUrl } from '../utils/url.js';

export function analyzePagination(runId: number): void {
  const urls = getUrls(runId, { isInternal: true });
  if (urls.length === 0) return;

  const urlMap = new Map(urls.map(u => [u.normalizedAddress, u]));
  const issues: CrawlIssue[] = [];

  for (const url of urls) {
    const nextUrl = url.relNext ? normalizeUrl(url.relNext, url.address) : undefined;
    const prevUrl = url.relPrev ? normalizeUrl(url.relPrev, url.address) : undefined;

    if (nextUrl) {
      const nextPage = urlMap.get(nextUrl);
      if (!nextPage) {
        issues.push(createIssue(
          url,
          'last_page_with_next',
          'medium',
          'Last Page Has rel="next"',
          `The rel="next" link points to ${url.relNext}, which was not found in the crawl.`,
          'Remove the rel="next" link from the final pagination page or ensure the next page exists and is crawlable.'
        ));
      } else if (nextPage.statusCode !== 200) {
        issues.push(createIssue(
          url,
          'broken_pagination_next',
          'high',
          'Broken Pagination Next Link',
          `The rel="next" link points to ${url.relNext} which returns a ${nextPage.statusCode} status code.`,
          'Fix or remove the broken next pagination link.'
        ));
      } else {
        const nextPrev = nextPage.relPrev ? normalizeUrl(nextPage.relPrev, nextPage.address) : undefined;
        if (nextPrev !== url.normalizedAddress) {
          issues.push(createIssue(
            url,
            'missing_reciprocal_prev',
            'medium',
            'Missing Reciprocal prev Pagination Link',
            `The next page ${nextPage.address} does not link back to this page with rel="prev".`,
            'Add a reciprocal rel="prev" link on the next page pointing back to this page.'
          ));
        }
      }
    }

    if (prevUrl) {
      const prevPage = urlMap.get(prevUrl);
      if (!prevPage || prevPage.statusCode !== 200) {
        issues.push(createIssue(
          url,
          'broken_pagination_prev',
          'high',
          'Broken Pagination Previous Link',
          `The rel="prev" link points to ${url.relPrev} which does not return a 200 OK response.`,
          'Fix or remove the broken previous pagination link.'
        ));
      } else {
        const prevNext = prevPage.relNext ? normalizeUrl(prevPage.relNext, prevPage.address) : undefined;
        if (prevNext !== url.normalizedAddress) {
          issues.push(createIssue(
            url,
            'missing_reciprocal_next',
            'medium',
            'Missing Reciprocal next Pagination Link',
            `The previous page ${prevPage.address} does not link back to this page with rel="next".`,
            'Add a reciprocal rel="next" link on the previous page pointing back to this page.'
          ));
        }
      }

      if (isFirstPage(url.normalizedAddress)) {
        issues.push(createIssue(
          url,
          'first_page_with_prev',
          'medium',
          'First Page Has rel="prev"',
          'The first page in the pagination has a rel="prev" link.',
          'Remove the rel="prev" link from the first pagination page.'
        ));
      }
    }
  }

  insertIssues(runId, issues);
}

function isFirstPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pageParam = parsed.searchParams.get('page') || parsed.searchParams.get('p');
    if (pageParam === '1' || pageParam === '0') return true;
    const path = parsed.pathname;
    if (/\/(page|p)\/1\//i.test(path) || /\/(page|p)-1\//i.test(path)) return true;
    return !/(\/(page|p)\/\d+\/?|\/(page|p)-\d+\/?|page=\d+|p=\d+)/i.test(url);
  } catch {
    return false;
  }
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
    category: 'pagination',
    priority,
    title,
    description,
    howToFix,
  };
}
