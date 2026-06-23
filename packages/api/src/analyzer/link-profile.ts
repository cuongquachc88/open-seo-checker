import { getAllLinks } from '../storage/database.js';
import { getDomain } from '../utils/url.js';

export interface LinkProfile {
  internal: number;
  external: number;
  nofollow: number;
  referringDomains: string[];
  referringPages: { url: string; domain: string; target: string; anchorText?: string }[];
  outgoingDomains: Record<string, number>;
}

export function analyzeLinkProfile(runId: number, startUrl: string): LinkProfile {
  const links = getAllLinks(runId);
  const startDomain = getDomain(startUrl);

  const referringPages: LinkProfile['referringPages'] = [];
  const outgoingDomains: Record<string, number> = {};
  let internal = 0;
  let external = 0;
  let nofollow = 0;

  for (const link of links) {
    if (link.nofollow) nofollow++;
    if (link.isInternal) {
      internal++;
    } else {
      external++;
      const targetDomain = getDomain(link.targetUrl);
      if (targetDomain) {
        outgoingDomains[targetDomain] = (outgoingDomains[targetDomain] || 0) + 1;
      }
    }

    // A "referring page" (within the crawl scope) is any page that links back to
    // the start domain. This is not a full backlink profile, but it shows which
    // crawled pages (internal or external) point to the target site.
    if (startDomain && link.targetUrl.toLowerCase().includes(startDomain.toLowerCase())) {
      const sourceDomain = getDomain(link.sourceUrl);
      if (sourceDomain) {
        referringPages.push({
          url: link.sourceUrl,
          domain: sourceDomain,
          target: link.targetUrl,
          anchorText: link.anchorText,
        });
      }
    }
  }

  const referringDomains = Array.from(new Set(referringPages.map((p) => p.domain))).sort();

  return {
    internal,
    external,
    nofollow,
    referringDomains,
    referringPages: referringPages.slice(0, 200),
    outgoingDomains,
  };
}
