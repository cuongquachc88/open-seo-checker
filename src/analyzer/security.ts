import type { CrawlIssue, CrawlUrl } from '../types/index.js';
import { getDatabase, getUrls, insertIssues } from '../storage/database.js';
import { isHttp, isHttps } from '../utils/url.js';

const HEADER_NAMES: { key: string; type: string; title: string }[] = [
  { key: 'strict-transport-security', type: 'missing_hsts', title: 'Missing HSTS Header' },
  { key: 'content-security-policy', type: 'missing_csp', title: 'Missing CSP Header' },
  { key: 'x-content-type-options', type: 'missing_x_content_type_options', title: 'Missing X-Content-Type-Options Header' },
  { key: 'x-frame-options', type: 'missing_x_frame_options', title: 'Missing X-Frame-Options Header' },
  { key: 'referrer-policy', type: 'missing_referrer_policy', title: 'Missing Referrer-Policy Header' },
];

export function analyzeSecurity(runId: number): void {
  const urls = getUrls(runId, { isInternal: true });
  if (urls.length === 0) return;

  const issues: CrawlIssue[] = [];
  const db = getDatabase();
  const unsafeLinkRows = db.prepare(
    `SELECT source_url_id, source_url, target_url
     FROM links
     WHERE crawl_run_id = ? AND is_internal = 0 AND link_type = 'a' AND target = '_blank'
       AND (noopener = 0 OR noreferrer = 0)`
  ).all(runId) as { source_url_id: number; source_url: string; target_url: string }[];

  const formRows = db.prepare(
    `SELECT source_url_id, source_url, target_url
     FROM links
     WHERE crawl_run_id = ? AND link_type = 'form'`
  ).all(runId) as { source_url_id: number; source_url: string; target_url: string }[];

  for (const url of urls) {
    if (isHttp(url.address)) {
      issues.push(createIssue(
        url,
        'insecure_http',
        'high',
        'Insecure HTTP URL',
        'Internal URL is served over HTTP instead of HTTPS.',
        'Migrate the site to HTTPS and redirect HTTP requests to HTTPS.'
      ));
    }

    if (url.hasMixedContent) {
      issues.push(createIssue(
        url,
        'mixed_content',
        'high',
        'Mixed Content',
        'HTTPS page loads resources over HTTP.',
        'Update all resource references to use HTTPS.'
      ));
    }

    const headers = url.headers || {};
    for (const { key, type, title } of HEADER_NAMES) {
      if (!hasHeader(headers, key)) {
        issues.push(createIssue(
          url,
          type,
          'medium',
          title,
          `The ${key.toUpperCase()} security header is missing.`,
          `Add the ${key.toUpperCase()} header to the response to improve security.`
        ));
      }
    }

    if (url.contentType === undefined || url.contentType === null) {
      if (isHtmlPath(url.address)) {
        issues.push(createIssue(
          url,
          'missing_content_type',
          'medium',
          'Missing Content-Type Header',
          'The page response does not include a Content-Type header.',
          'Set an appropriate Content-Type header (e.g., text/html; charset=utf-8) for the response.'
        ));
      }
    } else if (!url.contentType.toLowerCase().includes('text/html') && isHtmlPath(url.address)) {
      issues.push(createIssue(
        url,
        'bad_content_type',
        'medium',
        'Unexpected Content-Type',
        `The page returned Content-Type "${url.contentType}" instead of text/html.`,
        'Ensure HTML pages return a text/html Content-Type header.'
      ));
    }
  }

  for (const link of unsafeLinkRows) {
    issues.push({
      urlId: link.source_url_id,
      url: link.source_url,
      type: 'unsafe_cross_origin_link',
      category: 'security',
      priority: 'high',
      title: 'Unsafe Cross-Origin Link',
      description: `External link ${link.target_url} opens in a new tab without proper noopener/noreferrer rel attributes.`,
      howToFix: 'Add rel="noopener noreferrer" to external links that use target="_blank".',
    });
  }

  for (const form of formRows) {
    try {
      const isPageHttps = isHttps(form.source_url);
      const isFormHttp = isHttp(form.target_url);
      if (isPageHttps && isFormHttp) {
        issues.push({
          urlId: form.source_url_id,
          url: form.source_url,
          type: 'insecure_form',
          category: 'security',
          priority: 'high',
          title: 'Insecure Form Action',
          description: `Form action ${form.target_url} is submitted over HTTP on an HTTPS page.`,
          howToFix: 'Update the form action to use HTTPS to protect user data.',
        });
      }
    } catch {
      // ignore malformed URLs
    }
  }

  insertIssues(runId, issues);
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  const lower = name.toLowerCase();
  return Object.keys(headers).some(key => key.toLowerCase() === lower);
}

function isHtmlPath(url: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase();
    return ext === undefined || ext === '' || ext === 'html' || ext === 'htm' || ext === 'php' || ext === 'aspx' || ext === 'jsp';
  } catch {
    return true;
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
    category: 'security',
    priority,
    title,
    description,
    howToFix,
  };
}
