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

export function auditLocalSEO(runId: number): CrawlIssue[] {
  const urls = getUrls(runId, { isInternal: true });
  if (urls.length === 0) return [];

  const issues: CrawlIssue[] = [];
  const homePage = urls.find(url => getUrlPath(url.address) === '/') || urls[0];

  // 1. Check for LocalBusiness schema presence
  const structuredData = getStructuredDataForRun(runId);
  const localBusinessPages = new Set<string>();
  const hasLocalBusinessSchema = structuredData.some(row => {
    const type = detectSchemaType(row.data);
    if (type === 'LocalBusiness' || type === 'Store' || type === 'Restaurant' || type === 'ProfessionalService') {
      localBusinessPages.add(row.url);
      return true;
    }
    return false;
  });

  if (!hasLocalBusinessSchema) {
    issues.push(createIssue(
      homePage,
      'missing_local_business_schema',
      'high',
      'Missing Local Business Schema',
      'No LocalBusiness (or subtype) structured data was found on the site.',
      'Add JSON-LD LocalBusiness schema with name, address, telephone, and opening hours.'
    ));
  }

  // 2. NAP consistency across pages
  const napSnapshots = collectNapSnapshots(urls);
  if (napSnapshots.length > 1) {
    const phoneVariations = new Set(napSnapshots.map(s => s.phone));
    const addressVariations = new Set(napSnapshots.map(s => s.address));
    if (phoneVariations.size > 1) {
      issues.push(createIssue(
        homePage,
        'inconsistent_nap_phone',
        'high',
        'Inconsistent NAP Phone Number',
        `Found ${phoneVariations.size} different phone numbers across pages: ${Array.from(phoneVariations).slice(0, 3).join(', ')}.`,
        'Use a single, consistent phone number everywhere (schema, footer, contact page).'
      ));
    }
    if (addressVariations.size > 1) {
      issues.push(createIssue(
        homePage,
        'inconsistent_nap_address',
        'high',
        'Inconsistent NAP Address',
        `Found ${addressVariations.size} different address formats across pages.`,
        'Standardize the business address in schema, footer, and contact page.'
      ));
    }
  }

  if (napSnapshots.length === 0) {
    issues.push(createIssue(
      homePage,
      'missing_nap',
      'high',
      'Missing NAP Information',
      'No name, address, or phone number was detected on the crawled pages.',
      'Add consistent Name, Address, and Phone (NAP) details to the footer and contact page.'
    ));
  }

  // 3. Contact page presence
  const contactPage = urls.find(url => /\/contact(?:-us|page)?\/?$/i.test(getUrlPath(url.address)));
  if (!contactPage) {
    issues.push(createIssue(
      homePage,
      'missing_contact_page',
      'medium',
      'Missing Contact Page',
      'No dedicated contact page was found.',
      'Create a /contact page with complete NAP information and a map.'
    ));
  } else {
    const contactHtml = contactPage.rawHtml || contactPage.renderedHtml || '';
    if (!hasPhoneNumber(contactHtml)) {
      issues.push(createIssue(
        contactPage,
        'contact_page_missing_phone',
        'medium',
        'Contact Page Missing Phone Number',
        'The contact page does not contain a phone number.',
        'Add a clickable phone number to the contact page.'
      ));
    }
    if (!hasAddress(contactHtml)) {
      issues.push(createIssue(
        contactPage,
        'contact_page_missing_address',
        'medium',
        'Contact Page Missing Address',
        'The contact page does not contain a physical address.',
        'Add the business address to the contact page.'
      ));
    }
  }

  // 4. Google Business Profile signals
  const gbpSignals = detectGoogleBusinessProfileSignals(urls);
  if (!gbpSignals.hasMapEmbed) {
    issues.push(createIssue(
      homePage,
      'missing_google_map_embed',
      'low',
      'Missing Google Maps Embed',
      'No Google Maps embed was found on the site.',
      'Embed a Google Map on the contact or location page to strengthen local signals.'
    ));
  }
  if (!gbpSignals.hasGbpLink) {
    issues.push(createIssue(
      homePage,
      'missing_gbp_link',
      'low',
      'Missing Google Business Profile Link',
      'No link to a Google Business Profile was found.',
      'Add a link to your Google Business Profile from the footer or contact page.'
    ));
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

interface NapSnapshot {
  url: string;
  phone: string;
  address: string;
}

function collectNapSnapshots(urls: CrawlUrl[]): NapSnapshot[] {
  const snapshots: NapSnapshot[] = [];
  for (const url of urls) {
    const html = url.rawHtml || url.renderedHtml || '';
    const phone = extractPhoneNumber(html);
    const address = extractAddress(html);
    if (phone || address) {
      snapshots.push({ url: url.address, phone: phone || '', address: address || '' });
    }
  }
  return snapshots;
}

function hasPhoneNumber(text: string): boolean {
  return extractPhoneNumber(text).length > 0;
}

function extractPhoneNumber(text: string): string {
  const patterns = [
    /\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    /\+?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,4}/g,
  ];
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      return matches[0].replace(/[^+\d]/g, '');
    }
  }
  return '';
}

function hasAddress(text: string): boolean {
  return extractAddress(text).length > 0;
}

function extractAddress(text: string): string {
  // Look for US-style zip code as a proxy for address presence
  const zipMatch = text.match(/\b\d{5}(-\d{4})?\b/);
  if (zipMatch) return zipMatch[0];
  return '';
}

function detectGoogleBusinessProfileSignals(urls: CrawlUrl[]) {
  const result = { hasMapEmbed: false, hasGbpLink: false };
  for (const url of urls) {
    const html = url.rawHtml || url.renderedHtml || '';
    if (!html) continue;
    if (html.includes('google.com/maps') || html.includes('maps.google.com') || html.includes('maps.googleapis.com')) {
      result.hasMapEmbed = true;
    }
    if (html.includes('google.com/business') || html.includes('g.page') || html.includes('business.google.com')) {
      result.hasGbpLink = true;
    }
    if (result.hasMapEmbed && result.hasGbpLink) break;
  }
  return result;
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
    category: 'local-seo',
    priority,
    title,
    description,
    howToFix,
  };
}
