import { getUrls } from '../storage/database.js';
import type { CrawlUrl } from '../types/index.js';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'and', 'or', 'in', 'on', 'at', 'by', 'for', 'with', 'from',
  'as', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
  'she', 'we', 'they', 'them', 'their', 'what', 'which', 'who', 'when',
  'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 'can', 'will', 'just', 'should', 'now', 'about', 'up', 'out',
  'down', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
  'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each',
  'page', 'home', 'website', 'site', 'online', 'web', 'click', 'read',
]);

export function extractKeywordsFromCrawl(runId: number): { keyword: string; count: number; tfidf: number }[] {
  const urls = getUrls(runId, { isInternal: true });
  if (urls.length === 0) return [];

  const documents = urls.map(url => extractDocumentText(url));
  const totalDocuments = documents.length;

  const globalCounts = new Map<string, number>();
  const documentFrequencies = new Map<string, number>();

  for (const doc of documents) {
    const words = tokenize(doc);
    const uniqueWords = new Set(words);

    for (const word of words) {
      globalCounts.set(word, (globalCounts.get(word) || 0) + 1);
    }

    for (const word of uniqueWords) {
      documentFrequencies.set(word, (documentFrequencies.get(word) || 0) + 1);
    }
  }

  const totalWords = Array.from(globalCounts.values()).reduce((sum, count) => sum + count, 0);

  const keywords: { keyword: string; count: number; tfidf: number }[] = [];
  for (const [keyword, count] of globalCounts.entries()) {
    const tf = count / totalWords;
    const df = documentFrequencies.get(keyword) ?? 1;
    const idf = Math.log(totalDocuments / df) + 1;
    const tfidf = Number((tf * idf * 1000).toFixed(4));

    keywords.push({ keyword, count, tfidf });
  }

  return keywords
    .filter(k => k.count >= 2)
    .sort((a, b) => b.count - a.count || b.tfidf - a.tfidf)
    .slice(0, 100);
}

function extractDocumentText(url: CrawlUrl): string {
  const parts: string[] = [];
  if (url.title1) parts.push(url.title1);
  if (url.h1) parts.push(url.h1);
  if (url.h2) parts.push(url.h2);
  if (url.metaDescription1) parts.push(url.metaDescription1);
  return parts.join(' ');
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3 && !STOP_WORDS.has(word) && !/^\d+$/.test(word));
}
