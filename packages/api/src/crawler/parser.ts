import * as cheerio from 'cheerio';
import type { CrawlUrl, FetchResult } from '../types/index.js';
import { calculatePixelWidth } from '../utils/pixel-width.js';
import {
  extractProtocol,
  getFolderDepth,
  hasGaTrackingParams,
  hasInternalSearchParameter,
  hasMultipleSlashes,
  hasNonAsciiCharacters,
  hasRepetitivePath,
  hasSpace,
  hasUnderscore,
  hasUppercase,
  isHttps,
  isInternalUrl,
  isOverLength,
  md5Hash,
  normalizeUrl,
} from '../utils/url.js';

export interface ParseResult {
  url: CrawlUrl;
  canonical?: string;
  robotsMeta?: string;
  xRobotsTag?: string;
}

export function parseHtml(url: string, fetchResult: FetchResult, baseUrl: string, config: {
  allowSubdomains: boolean;
  followCanonical: boolean;
}): ParseResult {
  const normalizedUrl = normalizeUrl(url, baseUrl);
  const isInternal = isInternalUrl(normalizedUrl, baseUrl, config.allowSubdomains);
  const isExternal = !isInternal;

  const urlObj: CrawlUrl = {
    address: normalizedUrl,
    normalizedAddress: normalizedUrl,
    contentType: fetchResult.contentType || 'text/html',
    statusCode: fetchResult.statusCode,
    status: fetchResult.status,
    statusCategory: fetchResult.statusCategory,
    indexability: 'indexable',
    indexabilityStatus: undefined,
    crawlDepth: 0,
    folderDepth: getFolderDepth(normalizedUrl),
    urlLength: getUrlLength(normalizedUrl),
    isInternal,
    isExternal,
    isSecure: isHttps(normalizedUrl),
    hasMixedContent: false,
    responseTime: fetchResult.responseTime,
    lastModified: fetchResult.lastModified,
    httpVersion: fetchResult.httpVersion || 'HTTP/1.1',
    urlEncodedAddress: fetchResult.urlEncodedAddress,
    headers: fetchResult.headers,
    rawHtml: fetchResult.body,
    crawledAt: new Date().toISOString(),
    redirectUrl: fetchResult.redirectUrl,
    redirectType: fetchResult.redirectType,
    redirectChain: fetchResult.redirectChain,
  };

  if (!fetchResult.body || fetchResult.statusCode !== 200) {
    return { url: urlObj };
  }

  const $ = cheerio.load(fetchResult.body);
  const head = $('head');
  const body = $('body');

  // Page titles
  const titles = head.find('title').toArray();
  const title1 = titles[0] ? $(titles[0]).text().trim() : undefined;
  const title2 = titles[1] ? $(titles[1]).text().trim() : undefined;

  urlObj.title1 = cleanText(title1);
  urlObj.title1Length = urlObj.title1 ? urlObj.title1.length : 0;
  urlObj.title1PixelWidth = urlObj.title1 ? calculatePixelWidth(urlObj.title1, 'title') : 0;
  urlObj.title2 = cleanText(title2);
  urlObj.title2Length = urlObj.title2 ? urlObj.title2.length : 0;

  // Meta descriptions
  const metaDescriptions = head.find('meta[name="description"]').toArray();
  const desc1 = metaDescriptions[0] ? $(metaDescriptions[0]).attr('content') : undefined;
  const desc2 = metaDescriptions[1] ? $(metaDescriptions[1]).attr('content') : undefined;

  urlObj.metaDescription1 = cleanText(desc1);
  urlObj.metaDescription1Length = urlObj.metaDescription1 ? urlObj.metaDescription1.length : 0;
  urlObj.metaDescription1PixelWidth = urlObj.metaDescription1 ? calculatePixelWidth(urlObj.metaDescription1, 'description') : 0;
  urlObj.metaDescription2 = cleanText(desc2);
  urlObj.metaDescription2Length = urlObj.metaDescription2 ? urlObj.metaDescription2.length : 0;

  // Meta keywords
  const metaKeywords = head.find('meta[name="keywords"]').toArray();
  const keywords1 = metaKeywords[0] ? $(metaKeywords[0]).attr('content') : undefined;
  const keywords2 = metaKeywords[1] ? $(metaKeywords[1]).attr('content') : undefined;

  urlObj.metaKeywords1 = cleanText(keywords1);
  urlObj.metaKeywords1Length = urlObj.metaKeywords1 ? urlObj.metaKeywords1.length : 0;
  urlObj.metaKeywords2 = cleanText(keywords2);
  urlObj.metaKeywords2Length = urlObj.metaKeywords2 ? urlObj.metaKeywords2.length : 0;

  // Headings
  const h1s = body.find('h1').toArray();
  const h2s = body.find('h2').toArray();

  urlObj.h1 = h1s[0] ? cleanText($(h1s[0]).text()) : undefined;
  urlObj.h1Length = urlObj.h1 ? urlObj.h1.length : 0;
  urlObj.h1Count = h1s.length;
  urlObj.h2 = h2s[0] ? cleanText($(h2s[0]).text()) : undefined;
  urlObj.h2Length = urlObj.h2 ? urlObj.h2.length : 0;
  urlObj.h2Count = h2s.length;

  // Meta robots
  const metaRobots = head.find('meta[name="robots"], meta[name="googlebot"], meta[name="bingbot"]').first().attr('content');
  urlObj.metaRobots = metaRobots;

  // X-Robots-Tag from header
  urlObj.xRobotsTag = fetchResult.headers['x-robots-tag'];

  // Canonical
  const canonical = head.find('link[rel="canonical"]').first().attr('href');
  urlObj.canonical = canonical ? normalizeUrl(canonical, normalizedUrl) : undefined;
  urlObj.canonicalHeader = extractHeaderLink(fetchResult.headers, 'canonical');

  // Pagination
  urlObj.relNext = head.find('link[rel="next"]').first().attr('href') ? normalizeUrl(head.find('link[rel="next"]').first().attr('href')!, normalizedUrl) : undefined;
  urlObj.relPrev = head.find('link[rel="prev"]').first().attr('href') ? normalizeUrl(head.find('link[rel="prev"]').first().attr('href')!, normalizedUrl) : undefined;

  urlObj.httpRelNext = extractHeaderLink(fetchResult.headers, 'next');
  urlObj.httpRelPrev = extractHeaderLink(fetchResult.headers, 'prev');

  // Content metrics
  const bodyText = body.text() || '';
  const rawText = fetchResult.body;
  const cleanBodyText = bodyText.replace(/\s+/g, ' ').trim();
  const wordCount = cleanBodyText.split(/\s+/).filter(w => w.length > 0).length;
  const textRatio = rawText.length > 0 ? (cleanBodyText.length / rawText.length) * 100 : 0;

  urlObj.wordCount = wordCount;
  urlObj.textRatio = Math.round(textRatio * 100) / 100;

  // Hash for exact duplicate detection
  urlObj.hash = md5Hash(fetchResult.body);

  // Content length
  urlObj.contentLength = fetchResult.contentLength || Buffer.byteLength(fetchResult.body);

  // URL structure issues for internal URLs
  if (isInternal) {
    urlObj.urlLength = normalizedUrl.length;
  }

  // Mixed content detection (HTTPS page with HTTP resources)
  if (isHttps(normalizedUrl)) {
    const httpResources = $('script[src^="http:"], link[href^="http:"], img[src^="http:"], source[src^="http:"]').toArray();
    urlObj.hasMixedContent = httpResources.length > 0;
  }

  return { url: urlObj };
}

function cleanText(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function extractHeaderLink(headers: Record<string, string>, rel: string): string | undefined {
  const linkHeader = headers['link'] || headers['Link'];
  if (!linkHeader) return undefined;

  const parts = linkHeader.split(',');
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match && match[2] === rel) {
      return match[1];
    }
  }
  return undefined;
}

function getUrlLength(url: string): number {
  return url.length;
}

export function isNoindex(robots: string | undefined): boolean {
  if (!robots) return false;
  const directives = robots.toLowerCase().split(',').map(s => s.trim());
  return directives.includes('noindex') || directives.includes('none');
}

export function isNofollow(robots: string | undefined): boolean {
  if (!robots) return false;
  const directives = robots.toLowerCase().split(',').map(s => s.trim());
  return directives.includes('nofollow') || directives.includes('none');
}

export function getIndexabilityStatus(
  url: CrawlUrl,
  robotsTxt: string | undefined,
  userAgent: string
): string | undefined {
  const statusCode = url.statusCode;
  if (statusCode === undefined) return 'No Response';

  if (statusCode !== 200) {
    if (statusCode === 404) return '404 Page Not Found';
    if (statusCode === 410) return '410 Gone';
    if (statusCode === 403) return '403 Forbidden';
    if (statusCode === 500) return '500 Server Error';
    if (statusCode === 503) return '503 Service Unavailable';
    if (statusCode === 429) return '429 Too Many Requests';
    if (statusCode === 0) return 'No Response';
    if (statusCode >= 400) return 'Client Error';
    if (statusCode >= 500) return 'Server Error';
    if (statusCode >= 300) return 'Redirected';
    return 'Non-200 Status';
  }

  if (url.metaRobots && isNoindex(url.metaRobots)) return 'Blocked by Meta Robots';
  if (url.xRobotsTag && isNoindex(url.xRobotsTag)) return 'Blocked by X-Robots-Tag';

  if (url.canonical && url.canonical !== url.normalizedAddress && url.canonical !== url.address) {
    return 'Canonicalised to ' + url.canonical;
  }

  if (url.canonicalHeader && url.canonicalHeader !== url.normalizedAddress && url.canonicalHeader !== url.address) {
    return 'Canonicalised (HTTP Header) to ' + url.canonicalHeader;
  }

  return undefined;
}

export interface ExtractedImage {
  sourceUrlId: number;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  format?: string;
  missingAlt: boolean;
  missingDimensions: boolean;
  isBackground: boolean;
}

export interface ExtractedStructuredData {
  urlId: number;
  url: string;
  type: 'json-ld' | 'microdata' | 'rdfa';
  format: string;
  data: unknown;
  errors: string[];
  warnings: string[];
  richResultEligible: boolean;
}

export function extractImagesFromHtml(
  html: string,
  sourceUrlId: number,
  baseUrl: string
): ExtractedImage[] {
  const $ = cheerio.load(html);
  const images: ExtractedImage[] = [];
  const seen = new Set<string>();

  // Regular images
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src') || '';
    const resolvedUrl = resolveUrl(src, baseUrl);
    if (!resolvedUrl || seen.has(resolvedUrl)) return;
    seen.add(resolvedUrl);

    const alt = $(el).attr('alt') || '';
    const width = parseInt($(el).attr('width') || '', 10) || undefined;
    const height = parseInt($(el).attr('height') || '', 10) || undefined;

    images.push({
      sourceUrlId,
      url: resolvedUrl,
      alt: alt || undefined,
      width,
      height,
      format: getImageExtension(resolvedUrl),
      missingAlt: !alt.trim(),
      missingDimensions: !width || !height,
      isBackground: false,
    });
  });

  // Picture/source elements
  $('picture source[srcset], source[srcset]').each((_, el) => {
    const srcset = $(el).attr('srcset') || '';
    const firstSrc = srcset.split(',')[0]?.split(' ')[0];
    if (!firstSrc) return;
    const resolvedUrl = resolveUrl(firstSrc, baseUrl);
    if (!resolvedUrl || seen.has(resolvedUrl)) return;
    seen.add(resolvedUrl);

    images.push({
      sourceUrlId,
      url: resolvedUrl,
      format: getImageExtension(resolvedUrl),
      missingAlt: false,
      missingDimensions: true,
      isBackground: false,
    });
  });

  // Background images from inline styles
  $('[style*="background"]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const match = style.match(/url\(['"]?([^'"\)]+)['"]?\)/);
    if (!match) return;
    const resolvedUrl = resolveUrl(match[1], baseUrl);
    if (!resolvedUrl || seen.has(resolvedUrl)) return;
    seen.add(resolvedUrl);

    images.push({
      sourceUrlId,
      url: resolvedUrl,
      format: getImageExtension(resolvedUrl),
      missingAlt: true,
      missingDimensions: true,
      isBackground: true,
    });
  });

  return images;
}

export function extractStructuredDataFromHtml(
  html: string,
  urlId: number,
  url: string
): ExtractedStructuredData[] {
  const $ = cheerio.load(html);
  const records: ExtractedStructuredData[] = [];

  // JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html() || '';
    try {
      const data = JSON.parse(raw);
      const format = Array.isArray(data)
        ? data.map(item => item?.['@type'] || 'Unknown').join(', ')
        : data?.['@type'] || 'Unknown';

      records.push({
        urlId,
        url,
        type: 'json-ld',
        format,
        data,
        errors: [],
        warnings: [],
        richResultEligible: false,
      });
    } catch (err) {
      records.push({
        urlId,
        url,
        type: 'json-ld',
        format: 'Invalid JSON',
        data: raw,
        errors: ['Invalid JSON-LD syntax'],
        warnings: [],
        richResultEligible: false,
      });
    }
  });

  // Microdata (simplified: check for itemscope + itemtype)
  $('[itemscope]').each((_, el) => {
    const itemtype = $(el).attr('itemtype') || 'Unknown';
    records.push({
      urlId,
      url,
      type: 'microdata',
      format: itemtype,
      data: {},
      errors: [],
      warnings: ['Microdata extraction is simplified'],
      richResultEligible: false,
    });
  });

  return records;
}

function resolveUrl(url: string, baseUrl: string): string | null {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return null;
  }
}

function getImageExtension(url: string): string | undefined {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
    return match ? match[1].toLowerCase() : undefined;
  } catch {
    return undefined;
  }
}
