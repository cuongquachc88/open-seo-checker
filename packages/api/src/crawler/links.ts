import * as cheerio from 'cheerio';
import type { CrawlConfig, CrawlLink } from '../types/index.js';
import { isInternalUrl, isMailtoOrTel, isProtocolRelative, normalizeUrl, resolveRelativeUrl } from '../utils/url.js';

export function extractLinksFromHtml(
  sourceUrl: string,
  sourceUrlId: number,
  html: string,
  baseUrl: string,
  config: CrawlConfig,
  location: 'html' | 'js' | 'rendered' = 'html'
): CrawlLink[] {
  const $ = cheerio.load(html);
  const links: CrawlLink[] = [];
  let position = 0;

  // Base tag
  const baseHref = $('base').attr('href');
  const effectiveBase = baseHref ? resolveRelativeUrl(baseHref, baseUrl) : baseUrl;

  // Anchor links
  $('a[href]').each((_, el) => {
    const rawHref = $(el).attr('href') || '';
    const resolvedUrl = resolveLink(rawHref, effectiveBase);
    if (!resolvedUrl) return;

    const anchorText = $(el).text().replace(/\s+/g, ' ').trim() || undefined;
    const rel = $(el).attr('rel') || '';
    const target = $(el).attr('target') || '';

    const isInternal = isInternalUrl(resolvedUrl, baseUrl, config.allowSubdomains);
    const isExternal = !isInternal;

    links.push({
      sourceUrlId,
      sourceUrl,
      targetUrl: resolvedUrl,
      targetNormalizedUrl: resolvedUrl,
      isInternal,
      isExternal,
      isImage: false,
      isScript: false,
      isStylesheet: false,
      anchorText,
      linkType: 'a',
      rel,
      target,
      nofollow: rel.toLowerCase().includes('nofollow'),
      noreferrer: rel.toLowerCase().includes('noreferrer'),
      noopener: rel.toLowerCase().includes('noopener'),
      sponsored: rel.toLowerCase().includes('sponsored'),
      ugc: rel.toLowerCase().includes('ugc'),
      location,
      position: ++position,
    });
  });

  // Image links
  $('img[src]').each((_, el) => {
    const rawSrc = $(el).attr('src') || '';
    const resolvedUrl = resolveLink(rawSrc, effectiveBase);
    if (!resolvedUrl) return;

    const altText = $(el).attr('alt') || '';
    const isInternal = isInternalUrl(resolvedUrl, baseUrl, config.allowSubdomains);

    links.push({
      sourceUrlId,
      sourceUrl,
      targetUrl: resolvedUrl,
      targetNormalizedUrl: resolvedUrl,
      isInternal,
      isExternal: !isInternal,
      isImage: true,
      isScript: false,
      isStylesheet: false,
      altText,
      linkType: 'img',
      nofollow: false,
      noreferrer: false,
      noopener: false,
      sponsored: false,
      ugc: false,
      location,
      position: ++position,
    });
  });

  // Script links
  if (config.includeJs) {
    $('script[src]').each((_, el) => {
      const rawSrc = $(el).attr('src') || '';
      const resolvedUrl = resolveLink(rawSrc, effectiveBase);
      if (!resolvedUrl) return;

      const isInternal = isInternalUrl(resolvedUrl, baseUrl, config.allowSubdomains);

      links.push({
        sourceUrlId,
        sourceUrl,
        targetUrl: resolvedUrl,
        targetNormalizedUrl: resolvedUrl,
        isInternal,
        isExternal: !isInternal,
        isImage: false,
        isScript: true,
        isStylesheet: false,
        linkType: 'script',
        nofollow: false,
        noreferrer: false,
        noopener: false,
        sponsored: false,
        ugc: false,
        location,
        position: ++position,
      });
    });
  }

  // Stylesheet links
  if (config.includeCss) {
    $('link[rel="stylesheet"]').each((_, el) => {
      const rawHref = $(el).attr('href') || '';
      const resolvedUrl = resolveLink(rawHref, effectiveBase);
      if (!resolvedUrl) return;

      const isInternal = isInternalUrl(resolvedUrl, baseUrl, config.allowSubdomains);

      links.push({
        sourceUrlId,
        sourceUrl,
        targetUrl: resolvedUrl,
        targetNormalizedUrl: resolvedUrl,
        isInternal,
        isExternal: !isInternal,
        isImage: false,
        isScript: false,
        isStylesheet: true,
        linkType: 'link',
        rel: 'stylesheet',
        nofollow: false,
        noreferrer: false,
        noopener: false,
        sponsored: false,
        ugc: false,
        location,
        position: ++position,
      });
    });
  }

  // Iframe links
  $('iframe[src]').each((_, el) => {
    const rawSrc = $(el).attr('src') || '';
    const resolvedUrl = resolveLink(rawSrc, effectiveBase);
    if (!resolvedUrl) return;

    const isInternal = isInternalUrl(resolvedUrl, baseUrl, config.allowSubdomains);

    links.push({
      sourceUrlId,
      sourceUrl,
      targetUrl: resolvedUrl,
      targetNormalizedUrl: resolvedUrl,
      isInternal,
      isExternal: !isInternal,
      isImage: false,
      isScript: false,
      isStylesheet: false,
      linkType: 'iframe',
      nofollow: false,
      noreferrer: false,
      noopener: false,
      sponsored: false,
      ugc: false,
      location,
      position: ++position,
    });
  });

  // Form actions
  $('form[action]').each((_, el) => {
    const rawAction = $(el).attr('action') || '';
    const resolvedUrl = resolveLink(rawAction, effectiveBase);
    if (!resolvedUrl) return;

    const isInternal = isInternalUrl(resolvedUrl, baseUrl, config.allowSubdomains);

    links.push({
      sourceUrlId,
      sourceUrl,
      targetUrl: resolvedUrl,
      targetNormalizedUrl: resolvedUrl,
      isInternal,
      isExternal: !isInternal,
      isImage: false,
      isScript: false,
      isStylesheet: false,
      linkType: 'form',
      nofollow: false,
      noreferrer: false,
      noopener: false,
      sponsored: false,
      ugc: false,
      location,
      position: ++position,
    });
  });

  // CSS url() references (inline styles)
  $('[style]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const matches = style.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g);
    for (const match of matches) {
      const resolvedUrl = resolveLink(match[1], effectiveBase);
      if (!resolvedUrl) continue;
      const isInternal = isInternalUrl(resolvedUrl, baseUrl, config.allowSubdomains);

      links.push({
        sourceUrlId,
        sourceUrl,
        targetUrl: resolvedUrl,
        targetNormalizedUrl: resolvedUrl,
        isInternal,
        isExternal: !isInternal,
        isImage: false,
        isScript: false,
        isStylesheet: true,
        linkType: 'css',
        nofollow: false,
        noreferrer: false,
        noopener: false,
        sponsored: false,
        ugc: false,
        location,
        position: ++position,
      });
    }
  });

  // Link rel alternate / hreflang
  $('link[rel="alternate"]').each((_, el) => {
    const rawHref = $(el).attr('href') || '';
    const resolvedUrl = resolveLink(rawHref, effectiveBase);
    if (!resolvedUrl) return;
    const hreflang = $(el).attr('hreflang') || undefined;
    const isInternal = isInternalUrl(resolvedUrl, baseUrl, config.allowSubdomains);

    links.push({
      sourceUrlId,
      sourceUrl,
      targetUrl: resolvedUrl,
      targetNormalizedUrl: resolvedUrl,
      isInternal,
      isExternal: !isInternal,
      isImage: false,
      isScript: false,
      isStylesheet: false,
      linkType: 'link',
      rel: 'alternate',
      hreflang,
      nofollow: false,
      noreferrer: false,
      noopener: false,
      sponsored: false,
      ugc: false,
      location,
      position: ++position,
    });
  });

  return links;
}

function resolveLink(rawUrl: string, baseUrl: string): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (trimmed === '') return null;
  if (trimmed.startsWith('#')) return null;
  if (isMailtoOrTel(trimmed)) return null;
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) return null;

  try {
    if (isProtocolRelative(trimmed)) {
      return new URL(trimmed, baseUrl).href;
    }
    return normalizeUrl(trimmed, baseUrl);
  } catch {
    return null;
  }
}

export function deduplicateLinks(links: CrawlLink[]): CrawlLink[] {
  const seen = new Set<string>();
  return links.filter(link => {
    const key = `${link.sourceUrlId}|${link.targetNormalizedUrl}|${link.linkType}|${link.anchorText || ''}|${link.rel || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function filterCrawlableUrls(links: CrawlLink[]): CrawlLink[] {
  return links.filter(link => {
    if (link.linkType === 'a' && link.isInternal) return true;
    if (link.linkType === 'img' && link.isInternal) return true;
    if (link.linkType === 'link' && link.isInternal) return true;
    if (link.linkType === 'script' && link.isInternal) return true;
    if (link.linkType === 'iframe' && link.isInternal) return true;
    if (link.linkType === 'form' && link.isInternal) return true;
    return false;
  });
}
