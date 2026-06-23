import type { CrawlIssue, CrawlLink, CrawlUrl } from '../types/index.js';
import {
  getLinksForAnalysis,
  getOutlinks,
  getUrls,
  insertIssues,
  updateLinkCounts,
} from '../storage/database.js';

export function analyzeLinks(runId: number): void {
  const urls = getUrls(runId, { isInternal: true });
  if (urls.length === 0) return;

  const issues: CrawlIssue[] = [];
  const nonDescriptiveAnchors = new Set<string>();
  const nofollowInternalAnchors = new Set<string>();
  const unsafeLinks = new Set<string>();

  for (const url of urls) {
    const outlinks = getOutlinks(runId, url.id!);

    for (const link of outlinks) {
      // Only analyze anchor links for descriptive text and unsafe links
      if (link.linkType === 'a') {
        if (isNonDescriptiveAnchor(link)) {
          nonDescriptiveAnchors.add(link.anchorText?.toLowerCase() || '');
          issues.push(createLinkIssue(url, link, 'non_descriptive_anchor', 'medium', 'Non-Descriptive Anchor Text', `Anchor text "${link.anchorText || 'empty'}" is not descriptive.`, 'Use descriptive anchor text that describes the linked page.'));
        }

        if (link.isInternal && link.nofollow) {
          nofollowInternalAnchors.add(link.targetUrl);
          issues.push(createLinkIssue(url, link, 'nofollow_internal_link', 'low', 'Nofollow Internal Link', 'Internal link uses rel="nofollow".', 'Remove nofollow from internal links unless there is a specific reason.'));
        }

        if (isUnsafeCrossOriginLink(link)) {
          unsafeLinks.add(link.targetUrl);
          issues.push(createLinkIssue(url, link, 'unsafe_cross_origin_link', 'high', 'Unsafe Cross-Origin Link', 'External link opens in a new tab without rel="noopener" or uses rel="opener".', 'Add rel="noopener noreferrer" to external links with target="_blank".'));
        }
      }
    }
  }

  insertIssues(runId, issues);
}

export function calculateLinkCounts(runId: number): void {
  const urls = getUrls(runId, { isInternal: true });
  if (urls.length === 0) return;

  const links = getLinksForAnalysis(runId);

  // Aggregate inbound counts per target URL
  const inlinkCounts = new Map<string, number>();
  const uniqueInlinkSources = new Map<string, Set<number>>();

  for (const link of links) {
    const target = link.target_normalized_url;
    inlinkCounts.set(target, (inlinkCounts.get(target) || 0) + 1);
    const sources = uniqueInlinkSources.get(target) || new Set<number>();
    sources.add(link.source_url_id);
    uniqueInlinkSources.set(target, sources);
  }

  // Aggregate outbound counts per source URL
  const outlinkCounts = new Map<number, { total: number; unique: Set<string>; external: number; uniqueExternal: Set<string> }>();

  for (const link of links) {
    const sourceId = link.source_url_id;
    const current = outlinkCounts.get(sourceId) || { total: 0, unique: new Set<string>(), external: 0, uniqueExternal: new Set<string>() };

    current.total += 1;
    current.unique.add(link.target_normalized_url);

    if (!link.is_internal) {
      current.external += 1;
      current.uniqueExternal.add(link.target_normalized_url);
    }

    outlinkCounts.set(sourceId, current);
  }

  for (const url of urls) {
    const inlinks = inlinkCounts.get(url.normalizedAddress) || 0;
    const uniqueInlinks = uniqueInlinkSources.get(url.normalizedAddress)?.size || 0;

    const outlinkData = outlinkCounts.get(url.id!) || { total: 0, unique: new Set<string>(), external: 0, uniqueExternal: new Set<string>() };

    updateLinkCounts(url.id!, {
      inlinks,
      uniqueInlinks,
      outlinks: outlinkData.total,
      uniqueOutlinks: outlinkData.unique.size,
      externalOutlinks: outlinkData.external,
      uniqueExternalOutlinks: outlinkData.uniqueExternal.size,
    });
  }
}

function isNonDescriptiveAnchor(link: CrawlLink): boolean {
  if (!link.anchorText || link.anchorText.trim().length === 0) return true;
  const text = link.anchorText.trim().toLowerCase();
  const nonDescriptive = ['click', 'click here', 'here', 'read more', 'more', 'link', 'this', 'that', 'page', 'website', 'site'];
  return nonDescriptive.includes(text);
}

function isUnsafeCrossOriginLink(link: CrawlLink): boolean {
  if (link.isInternal) return false;
  if (link.linkType !== 'a') return false;
  if (!link.target || link.target.toLowerCase() !== '_blank') return false;
  // Safe if noopener and noreferrer are present
  if (link.noopener && link.noreferrer) return false;
  return true;
}

function createLinkIssue(
  url: CrawlUrl,
  link: CrawlLink,
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
    category: 'links',
    priority,
    title,
    description,
    howToFix,
  };
}
