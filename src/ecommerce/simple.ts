import { getDatabase, getUrls, insertIssues } from '../storage/database.js';
import type { CrawlIssue, CrawlUrl } from '../types/index.js';
import { getUrlPath } from '../utils/url.js';

interface StructuredDataRow {
  url_id: number;
  url: string;
  type: string;
  format: string;
  data: string;
}

export function auditEcommerce(runId: number): CrawlIssue[] {
  const urls = getUrls(runId, { isInternal: true });
  if (urls.length === 0) return [];

  const issues: CrawlIssue[] = [];
  const structuredData = getStructuredDataForRun(runId);
  const schemaTypesByUrl = mapSchemaTypesByUrl(structuredData);

  const productPages = urls.filter(isProductPage);

  if (productPages.length === 0) {
    return [];
  }

  for (const url of productPages) {
    const types = schemaTypesByUrl.get(url.address) || new Set<string>();

    // 1. Product schema
    if (!types.has('Product')) {
      issues.push(createIssue(
        url,
        'missing_product_schema',
        'high',
        'Missing Product Schema',
        'Product page does not include Product structured data.',
        'Add JSON-LD Product schema with name, image, description, SKU, offers, and aggregateRating.'
      ));
    }

    // 2. BreadcrumbList schema
    if (!types.has('BreadcrumbList')) {
      issues.push(createIssue(
        url,
        'missing_breadcrumb_schema',
        'medium',
        'Missing Breadcrumb Schema',
        'Product page does not include BreadcrumbList structured data.',
        'Add JSON-LD BreadcrumbList schema to help search engines understand site hierarchy.'
      ));
    }

    // 3. Price/offer signals in raw HTML (simple check)
    const html = url.rawHtml || url.renderedHtml || '';
    if (!html.includes('price') && !html.includes('Price') && !html.includes('offers')) {
      issues.push(createIssue(
        url,
        'product_missing_price',
        'high',
        'Product Page Missing Price Information',
        'No price or offer information was detected on the product page.',
        'Include visible price and Offer/AggregateOffer structured data on product pages.'
      ));
    }

    // 4. Review/rating signals
    if (!html.includes('review') && !html.includes('rating') && !html.includes('aggregateRating')) {
      issues.push(createIssue(
        url,
        'product_missing_reviews',
        'low',
        'Product Page Missing Review/Rating Signals',
        'No review or rating signals were detected on the product page.',
        'Add product reviews and aggregateRating structured data to enable rich results.'
      ));
    }
  }

  // 5. Pagination and faceted navigation
  for (const url of urls) {
    const path = getUrlPath(url.address);

    // Faceted navigation (common e-commerce filters)
    if (hasFacetedParameters(url.address)) {
      if (url.indexability === 'indexable' && !isCanonicalized(url)) {
        issues.push(createIssue(
          url,
          'faceted_nav_indexable',
          'medium',
          'Faceted Navigation Page Is Indexable',
          `URL contains filter parameters and may waste crawl budget: ${path}.`,
          'Use canonical tags, noindex, or robots.txt to manage faceted navigation URLs.'
        ));
      }
    }

    // Pagination
    if (/\?page=\d+|&page=\d+|\/page\/[2-9]\d*/i.test(url.address)) {
      if (!hasRelPagination(url)) {
        issues.push(createIssue(
          url,
          'pagination_missing_rel',
          'low',
          'Pagination Missing rel=next/prev',
          `Paginated URL does not use rel=next/prev signals: ${path}.`,
          'Add rel="next" and/or rel="prev" links to paginated series, or use a canonical self-reference.'
        ));
      }
    }
  }

  // 6. Cart and checkout indexability
  for (const url of urls) {
    const path = getUrlPath(url.address).toLowerCase();
    if (isCartOrCheckoutPath(path)) {
      if (url.indexability === 'indexable') {
        issues.push(createIssue(
          url,
          'cart_checkout_indexable',
          'high',
          'Cart or Checkout Page Is Indexable',
          `The ${path} page should not be indexed by search engines.`,
          'Add a noindex robots meta tag or disallow the cart/checkout path in robots.txt.'
        ));
      }
    }
  }

  insertIssues(runId, issues);
  return issues;
}

function getStructuredDataForRun(runId: number): StructuredDataRow[] {
  const db = getDatabase();
  return db.prepare(
    `SELECT url_id, url, type, format, data FROM structured_data WHERE crawl_run_id = ?`
  ).all(runId) as StructuredDataRow[];
}

function mapSchemaTypesByUrl(rows: StructuredDataRow[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    const type = detectSchemaType(row.data);
    if (!type) continue;
    const set = map.get(row.url) || new Set<string>();
    set.add(type);
    map.set(row.url, set);
  }
  return map;
}

function detectSchemaType(dataJson: string): string {
  try {
    const data = JSON.parse(dataJson) as Record<string, unknown>;
    if (typeof data['@type'] === 'string') return data['@type'];
    if (Array.isArray(data['@type'])) return (data['@type'] as string[])[0] || '';
  } catch {
    // fall back to text search
  }
  const match = dataJson.match(/"@type"\s*:\s*"([^"]+)"/);
  return match ? match[1] : '';
}

function isProductPage(url: CrawlUrl): boolean {
  const path = getUrlPath(url.address).toLowerCase();
  const productPatterns = [
    /\/product\//,
    /\/products\//,
    /\/p\//,
    /\/item\//,
    /\/shop\//,
    /\/buy\//,
    /-product\//,
    /\/(?:prod)-/,
  ];
  return productPatterns.some(pattern => pattern.test(path));
}

function isCartOrCheckoutPath(path: string): boolean {
  const cartPatterns = [
    /\/cart\/?$/,
    /\/basket\/?$/,
    /\/checkout\/?$/,
    /\/bag\/?$/,
    /\/minicart/,
    /\/cart\.php/,
    /\/checkout\.php/,
  ];
  return cartPatterns.some(pattern => pattern.test(path));
}

function hasFacetedParameters(url: string): boolean {
  const facetedParams = ['filter', 'sort', 'color', 'size', 'brand', 'price', 'min', 'max', 'material', 'style', 'category', 'tag', 'vendor'];
  try {
    const params = new URL(url).searchParams;
    for (const key of params.keys()) {
      const lower = key.toLowerCase();
      if (facetedParams.some(p => lower.includes(p))) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function isCanonicalized(url: CrawlUrl): boolean {
  return Boolean(url.canonical || url.canonicalHeader);
}

function hasRelPagination(url: CrawlUrl): boolean {
  return Boolean(url.relNext || url.relPrev || url.httpRelNext || url.httpRelPrev);
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
    category: 'ecommerce',
    priority,
    title,
    description,
    howToFix,
  };
}
