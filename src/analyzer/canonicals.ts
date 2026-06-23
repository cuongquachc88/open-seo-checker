import type { CrawlIssue, CrawlUrl } from '../types/index.js';
import { getUrls, insertIssues } from '../storage/database.js';
import { getDomain, isHttp, isHttps, normalizeUrl } from '../utils/url.js';

export function analyzeCanonicals(runId: number): void {
  const urls = getUrls(runId, { isInternal: true });
  if (urls.length === 0) return;

  const canonicalTargetMap = new Map(urls.map(u => [u.normalizedAddress, { id: u.id, statusCode: u.statusCode }]));

  const issues: CrawlIssue[] = [];

  for (const url of urls) {
    const linkCanonical = url.canonical?.trim();
    const headerCanonical = url.canonicalHeader?.trim();

    if (!linkCanonical && !headerCanonical) {
      issues.push(createIssue(
        url,
        'missing_canonical',
        'medium',
        'Missing Canonical Tag',
        'The page does not have a canonical link or HTTP header.',
        'Add a self-referencing canonical URL to consolidate signals and prevent duplicate content issues.'
      ));
      continue;
    }

    if (linkCanonical && headerCanonical && linkCanonical !== headerCanonical) {
      issues.push(createIssue(
        url,
        'multiple_canonicals',
        'high',
        'Multiple Conflicting Canonicals',
        'The page has both a canonical link tag and a canonical HTTP header with different values.',
        'Use a single canonical URL. Remove one of the canonical declarations or ensure both match.'
      ));
    }

    for (const canonical of new Set([linkCanonical, headerCanonical].filter(Boolean))) {
      const resolved = normalizeUrl(canonical!, url.address);

      if (resolved) {
        const target = canonicalTargetMap.get(resolved);

        if (target && target.statusCode !== undefined && target.statusCode !== 200) {
          issues.push(createIssue(
            url,
            'canonical_to_non_200',
            'high',
            'Canonical Points to Non-200 URL',
            `Canonical URL ${canonical} returns a ${target.statusCode} status code.`,
            'Update the canonical URL to point to a page that returns a 200 OK status.'
          ));
        }

        if (resolved !== url.normalizedAddress) {
          issues.push(createIssue(
            url,
            'canonical_to_different_url',
            'medium',
            'Canonical Points to Different URL',
            `Canonical URL (${canonical}) does not match the current URL (${url.address}).`,
            'If this page should be canonical, use a self-referencing canonical URL that matches the current page.'
          ));
        }

        if (isHttps(url.address) && isHttp(resolved)) {
          issues.push(createIssue(
            url,
            'canonical_to_http',
            'high',
            'Canonical Points to HTTP from HTTPS',
            'The canonical URL uses HTTP while the page is served over HTTPS.',
            'Update the canonical URL to use HTTPS to avoid duplicate content and security warnings.'
          ));
        }

        if (getDomain(resolved) !== getDomain(url.address)) {
          issues.push(createIssue(
            url,
            'canonical_to_different_domain',
            'high',
            'Canonical Points to Different Domain',
            'The canonical URL points to a different domain than the current page.',
            'Ensure the canonical URL is on the same domain unless you intentionally want to consolidate authority elsewhere.'
          ));
        }
      }

      if (url.redirectUrl && canonical && url.redirectUrl === canonical) {
        issues.push(createIssue(
          url,
          'canonical_chain_loop',
          'critical',
          'Canonical Chain or Loop',
          'The canonical URL matches the page redirect URL, which can create a loop or chain.',
          'Fix the redirect or canonical declaration so the canonical points directly to the final URL.'
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
    category: 'canonicals',
    priority,
    title,
    description,
    howToFix,
  };
}
