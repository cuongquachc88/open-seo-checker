import type { CrawlUrl } from '../types/index.js';
import { getUrls } from '../storage/database.js';

export interface KeywordResult {
  keyword: string;
  count: number;
  urls: number;
}

export interface UrlKeywordResult {
  url: string;
  keywords: { keyword: string; count: number }[];
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'as', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'her', 'our', 'their', 'what', 'which', 'who', 'when', 'where', 'why',
  'how', 'all', 'any', 'both', 'each', 'more', 'most', 'some', 'such', 'no', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 'can', 'just', 'now', 'get', 'like', 'also',
  'use', 'using', 'used', 'one', 'two', 'new', 'way', 'make', 'made', 'out', 'up', 'about',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));
}

function extractNgrams(tokens: string[], maxN = 2): string[] {
  const result: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    result.push(tokens[i]);
    if (maxN >= 2 && i < tokens.length - 1) {
      result.push(`${tokens[i]} ${tokens[i + 1]}`);
    }
  }
  return result;
}

function extractTextSources(url: CrawlUrl): string[] {
  const sources: string[] = [];
  if (url.title1) sources.push(url.title1);
  if (url.metaDescription1) sources.push(url.metaDescription1);
  if (url.h1) sources.push(url.h1);
  if (url.h2) sources.push(url.h2);
  // Also include a small snippet of raw HTML body if available, without HTML tags.
  if (url.rawHtml) {
    sources.push(url.rawHtml.replace(/<[^>]+>/g, ' '));
  }
  return sources;
}

function countKeywords(url: CrawlUrl): Map<string, number> {
  const counts = new Map<string, number>();
  const textSources = extractTextSources(url);
  for (const source of textSources) {
    const tokens = tokenize(source);
    const ngrams = extractNgrams(tokens, 2);
    for (const keyword of ngrams) {
      counts.set(keyword, (counts.get(keyword) || 0) + 1);
    }
  }
  return counts;
}

export function analyzeKeywords(runId: number): {
  topKeywords: KeywordResult[];
  urlKeywords: UrlKeywordResult[];
} {
  const urls = getUrls(runId, { isInternal: true });
  const globalCounts = new Map<string, number>();
  const urlKeywordSet = new Map<string, Set<string>>();
  const urlResults: UrlKeywordResult[] = [];

  for (const url of urls) {
    const counts = countKeywords(url);
    const urlKeywords: UrlKeywordResult['keywords'] = [];
    for (const [keyword, count] of counts.entries()) {
      globalCounts.set(keyword, (globalCounts.get(keyword) || 0) + count);
      let urlSet = urlKeywordSet.get(keyword);
      if (!urlSet) {
        urlSet = new Set<string>();
        urlKeywordSet.set(keyword, urlSet);
      }
      urlSet.add(url.address);
      urlKeywords.push({ keyword, count });
    }
    urlKeywords.sort((a, b) => b.count - a.count);
    urlResults.push({ url: url.address, keywords: urlKeywords.slice(0, 10) });
  }

  const topKeywords: KeywordResult[] = [];
  for (const [keyword, count] of globalCounts.entries()) {
    const urls = urlKeywordSet.get(keyword)?.size || 0;
    topKeywords.push({ keyword, count, urls });
  }

  topKeywords.sort((a, b) => b.count - a.count || b.urls - a.urls);

  return {
    topKeywords: topKeywords.slice(0, 50),
    urlKeywords: urlResults,
  };
}
