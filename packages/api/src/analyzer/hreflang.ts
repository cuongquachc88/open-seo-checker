import type { CrawlIssue } from '../types/index.js';
import { getDatabase, insertIssues } from '../storage/database.js';

interface AlternateLink {
  source_url_id: number;
  source_url: string;
  target_url: string;
  target_normalized_url: string;
  hreflang: string | null;
}

interface UrlStatus {
  address: string;
  normalized_address: string;
  status_code: number | null;
}

export function analyzeHreflang(runId: number): void {
  const db = getDatabase();
  const alternateLinks = db.prepare(
    `SELECT source_url_id, source_url, target_url, target_normalized_url, hreflang
     FROM links
     WHERE crawl_run_id = ? AND link_type = 'link' AND rel = 'alternate'`
  ).all(runId) as AlternateLink[];

  if (alternateLinks.length === 0) return;

  const urlStatusRows = db.prepare(
    `SELECT address, normalized_address, status_code FROM urls WHERE crawl_run_id = ?`
  ).all(runId) as UrlStatus[];
  const urlStatusMap = new Map(urlStatusRows.map(r => [r.address, r.status_code]));
  const normalizedStatusMap = new Map(urlStatusRows.map(r => [r.normalized_address, r.status_code]));
  const crawledUrls = new Set(urlStatusRows.map(r => r.normalized_address));

  // Build a set of source->target pairs so we can verify reciprocal return tags.
  const linkPairs = new Set<string>();
  for (const link of alternateLinks) {
    linkPairs.add(`${link.source_url}|${link.target_normalized_url}`);
  }

  const alternatesBySource = new Map<number, Map<string, AlternateLink[]>>();

  for (const link of alternateLinks) {
    const lang = (link.hreflang || '').toLowerCase();
    const byLang = alternatesBySource.get(link.source_url_id) || new Map<string, AlternateLink[]>();
    const list = byLang.get(lang) || [];
    list.push(link);
    byLang.set(lang, list);
    alternatesBySource.set(link.source_url_id, byLang);
  }

  const issues: CrawlIssue[] = [];

  for (const link of alternateLinks) {
    const lang = (link.hreflang || '').toLowerCase();

    if (!lang) {
      issues.push({
        urlId: link.source_url_id,
        url: link.source_url,
        type: 'missing_hreflang',
        category: 'hreflang',
        priority: 'high',
        title: 'Missing Hreflang Attribute',
        description: `Alternate link to ${link.target_url} is missing the hreflang attribute.`,
        howToFix: 'Add an hreflang attribute to every alternate link (e.g., hreflang="en-AU").',
      });
      continue;
    }

    if (!isValidHreflang(lang)) {
      issues.push({
        urlId: link.source_url_id,
        url: link.source_url,
        type: 'invalid_hreflang',
        category: 'hreflang',
        priority: 'high',
        title: 'Invalid Hreflang Code',
        description: `Hreflang value "${link.hreflang}" does not use a valid ISO 639-1 language or ISO 3166-1 alpha-2 region code.`,
        howToFix: 'Use valid hreflang values such as "en", "en-US", or "fr" and ensure they match the page content.',
      });
    }

    // Only check status for targets that were actually crawled.
    const status = urlStatusMap.get(link.target_url) ?? normalizedStatusMap.get(link.target_normalized_url);
    if (crawledUrls.has(link.target_normalized_url) && status !== null && status !== undefined && status !== 200) {
      issues.push({
        urlId: link.source_url_id,
        url: link.source_url,
        type: 'hreflang_to_non_200',
        category: 'hreflang',
        priority: 'high',
        title: 'Hreflang Points to Non-200 URL',
        description: `Hreflang target ${link.target_url} returns a ${status} status code.`,
        howToFix: 'Ensure all hreflang alternate URLs return a 200 OK response.',
      });
    }

    // Only verify return tags for targets that were crawled. External alternates
    // (e.g. dulux.co.nz) can't be checked from a dulux.com.au crawl.
    if (crawledUrls.has(link.target_normalized_url)) {
      const hasReturn = linkPairs.has(`${link.target_normalized_url}|${link.source_url}`);
      if (!hasReturn) {
        issues.push({
          urlId: link.source_url_id,
          url: link.source_url,
          type: 'missing_hreflang_return_tag',
          category: 'hreflang',
          priority: 'medium',
          title: 'Missing Hreflang Return Tag',
          description: `The page ${link.target_url} does not link back to ${link.source_url} with an alternate hreflang tag.`,
          howToFix: 'Add a reciprocal hreflang link on the alternate page pointing back to this page.',
        });
      }
    }
  }

  for (const [sourceId, byLang] of alternatesBySource) {
    for (const [lang, links] of byLang) {
      if (lang === '') continue;
      if (links.length > 1) {
        const targets = links.map(l => l.target_url).join(', ');
        issues.push({
          urlId: sourceId,
          url: links[0].source_url,
          type: 'inconsistent_hreflang',
          category: 'hreflang',
          priority: 'medium',
          title: 'Inconsistent Hreflang',
          description: `Multiple alternate URLs are declared for hreflang "${lang}": ${targets}.`,
          howToFix: 'Each language/region should have exactly one alternate URL. Remove or consolidate duplicate declarations.',
        });
      }
    }
  }

  insertIssues(runId, issues);
}

const ISO_639_1 = new Set([
  'aa', 'ab', 'ae', 'af', 'ak', 'am', 'an', 'ar', 'as', 'av', 'ay', 'az',
  'ba', 'be', 'bg', 'bh', 'bi', 'bm', 'bn', 'bo', 'br', 'bs', 'ca', 'ce',
  'ch', 'co', 'cr', 'cs', 'cu', 'cv', 'cy', 'da', 'de', 'dv', 'dz', 'ee',
  'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'ff', 'fi', 'fj', 'fo', 'fr',
  'fy', 'ga', 'gd', 'gl', 'gn', 'gu', 'gv', 'ha', 'he', 'hi', 'ho', 'hr',
  'ht', 'hu', 'hy', 'hz', 'ia', 'id', 'ie', 'ig', 'ii', 'ik', 'io', 'is',
  'it', 'iu', 'ja', 'jv', 'ka', 'kg', 'ki', 'kj', 'kk', 'kl', 'km', 'kn',
  'ko', 'kr', 'ks', 'ku', 'kv', 'kw', 'ky', 'la', 'lb', 'lg', 'li', 'ln',
  'lo', 'lt', 'lu', 'lv', 'mg', 'mh', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms',
  'mt', 'my', 'na', 'nb', 'nd', 'ne', 'ng', 'nl', 'nn', 'no', 'nr', 'nv',
  'ny', 'oc', 'oj', 'om', 'or', 'os', 'pa', 'pi', 'pl', 'ps', 'pt', 'qu',
  'rm', 'rn', 'ro', 'ru', 'rw', 'sa', 'sc', 'sd', 'se', 'sg', 'si', 'sk',
  'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'ss', 'st', 'su', 'sv', 'sw', 'ta',
  'te', 'tg', 'th', 'ti', 'tk', 'tl', 'tn', 'to', 'tr', 'ts', 'tt', 'tw',
  'ty', 'ug', 'uk', 'ur', 'uz', 've', 'vi', 'vo', 'wa', 'wo', 'xh', 'yi',
  'yo', 'za', 'zh', 'zu',
]);

const ISO_3166_1_ALPHA_2 = new Set([
  'ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'ao', 'aq', 'ar', 'as', 'at', 'au', 'aw', 'ax', 'az',
  'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bl', 'bm', 'bn', 'bo', 'bq', 'br', 'bs',
  'bt', 'bv', 'bw', 'by', 'bz', 'ca', 'cc', 'cd', 'cf', 'cg', 'ch', 'ci', 'ck', 'cl', 'cm', 'cn',
  'co', 'cr', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz', 'de', 'dj', 'dk', 'dm', 'do', 'dz', 'ec', 'ee',
  'eg', 'eh', 'er', 'es', 'et', 'fi', 'fj', 'fk', 'fm', 'fo', 'fr', 'ga', 'gb', 'gd', 'ge', 'gf',
  'gg', 'gh', 'gi', 'gl', 'gm', 'gn', 'gp', 'gq', 'gr', 'gs', 'gt', 'gu', 'gw', 'gy', 'hk', 'hm',
  'hn', 'hr', 'ht', 'hu', 'id', 'ie', 'il', 'im', 'in', 'io', 'iq', 'ir', 'is', 'it', 'je', 'jm',
  'jo', 'jp', 'ke', 'kg', 'kh', 'ki', 'km', 'kn', 'kp', 'kr', 'kw', 'ky', 'kz', 'la', 'lb', 'lc',
  'li', 'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly', 'ma', 'mc', 'md', 'me', 'mf', 'mg', 'mh', 'mk',
  'ml', 'mm', 'mn', 'mo', 'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'mv', 'mw', 'mx', 'my', 'mz', 'na',
  'nc', 'ne', 'nf', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu', 'nz', 'om', 'pa', 'pe', 'pf', 'pg',
  'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'ps', 'pt', 'pw', 'py', 'qa', 're', 'ro', 'rs', 'ru', 'rw',
  'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'sh', 'si', 'sj', 'sk', 'sl', 'sm', 'sn', 'so', 'sr', 'ss',
  'st', 'sv', 'sx', 'sy', 'sz', 'tc', 'td', 'tf', 'tg', 'th', 'tj', 'tk', 'tl', 'tm', 'tn', 'to',
  'tr', 'tt', 'tv', 'tw', 'tz', 'ua', 'ug', 'um', 'us', 'uy', 'uz', 'va', 'vc', 've', 'vg', 'vi',
  'vn', 'vu', 'wf', 'ws', 'ye', 'yt', 'za', 'zm', 'zw',
]);

function isValidHreflang(value: string): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase().trim();
  // x-default is the special fallback value for hreflang.
  if (normalized === 'x-default') return true;
  const parts = normalized.split(/[-_]/);
  if (parts.length === 0 || parts.length > 2) return false;
  const [lang, region] = parts;
  if (!ISO_639_1.has(lang)) return false;
  if (region && !ISO_3166_1_ALPHA_2.has(region)) return false;
  return true;
}
