import type { CrawlUrl, ContentScoreResult } from '../types/index.js';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'and', 'or', 'in', 'on', 'at', 'by', 'for', 'with', 'from',
  'as', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
  'she', 'we', 'they', 'them', 'their', 'what', 'which', 'who', 'when',
  'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 'can', 'will', 'just', 'should', 'now', 'about', 'up', 'out',
  'down', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
]);

export function scoreContent(url: CrawlUrl, targetKeyword?: string): ContentScoreResult {
  const wordCount = url.wordCount ?? extractWordCount(url);
  const text = extractText(url);
  const words = tokenize(text);

  const wordCountScore = scoreWordCount(wordCount);
  const keywordDensity = targetKeyword ? calculateKeywordDensity(words, targetKeyword) : 0;
  const keywordDensityScore = targetKeyword ? scoreKeywordDensity(keywordDensity) : 0;
  const headingsOptimizationScore = scoreHeadings(url);
  const readabilityScore = calculateReadability(text, words);

  const score = Math.round(
    (wordCountScore * 0.35) +
    (keywordDensityScore * 0.25) +
    (headingsOptimizationScore * 0.25) +
    (readabilityScore * 0.15)
  );

  const suggestions = buildSuggestions(url, wordCount, targetKeyword, keywordDensity, headingsOptimizationScore, readabilityScore);

  return {
    url: url.address,
    targetKeyword,
    score,
    wordCount,
    keywordDensity,
    headingsOptimization: headingsOptimizationScore,
    readabilityScore,
    suggestions,
  };
}

function extractWordCount(url: CrawlUrl): number {
  if (url.wordCount !== undefined) return url.wordCount;
  return tokenize(extractText(url)).length;
}

function extractText(url: CrawlUrl): string {
  const html = url.renderedHtml || url.rawHtml || '';
  if (!html) {
    return [url.title1, url.metaDescription1, url.h1, url.h2].filter(Boolean).join(' ');
  }

  // Strip HTML tags and decode common entities
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !STOP_WORDS.has(word));
}

function scoreWordCount(wordCount: number): number {
  if (wordCount >= 1200) return 100;
  if (wordCount >= 900) return 90;
  if (wordCount >= 600) return 80;
  if (wordCount >= 300) return 65;
  if (wordCount >= 150) return 40;
  if (wordCount > 0) return 20;
  return 0;
}

function calculateKeywordDensity(words: string[], targetKeyword: string): number {
  if (words.length === 0) return 0;
  const normalized = targetKeyword.toLowerCase().trim();
  if (!normalized) return 0;
  const matches = words.filter(word => word === normalized || word.includes(normalized)).length;
  return Number(((matches / words.length) * 100).toFixed(2));
}

function scoreKeywordDensity(density: number): number {
  if (density >= 1 && density <= 2.5) return 100;
  if (density > 2.5 && density <= 4) return 70;
  if (density > 4) return 40;
  if (density > 0) return 50;
  return 30;
}

function scoreHeadings(url: CrawlUrl): number {
  let score = 0;
  if (url.h1Count && url.h1Count > 0) score += 35;
  if (url.h1Count === 1) score += 15;
  if (url.h2Count && url.h2Count >= 2) score += 30;
  if (url.h2Count && url.h2Count >= 1) score += 10;
  if (url.h1 && url.title1 && url.h1.toLowerCase().includes(url.title1.toLowerCase().slice(0, 20))) {
    score += 10;
  }
  return Math.min(100, score);
}

function calculateReadability(text: string, words: string[]): number {
  if (words.length === 0) return 0;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1;
  const avgWordsPerSentence = words.length / sentences;
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;

  // Simplified score: shorter sentences and shorter words are more readable
  let score = 100 - (avgWordsPerSentence - 10) * 3 - (avgWordLength - 4.5) * 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildSuggestions(
  url: CrawlUrl,
  wordCount: number,
  targetKeyword: string | undefined,
  keywordDensity: number,
  headingsScore: number,
  readabilityScore: number
): string[] {
  const suggestions: string[] = [];

  if (wordCount < 300) {
    suggestions.push(`Add more content; current word count (${wordCount}) is below the recommended 300 minimum.`);
  } else if (wordCount < 600) {
    suggestions.push('Consider expanding the content to 600+ words for better topical coverage.');
  }

  if (targetKeyword) {
    if (keywordDensity < 0.5) {
      suggestions.push(`Increase usage of "${targetKeyword}" to improve topical relevance (density ${keywordDensity}%).`);
    } else if (keywordDensity > 4) {
      suggestions.push(`Reduce keyword density for "${targetKeyword}" (${keywordDensity}%) to avoid over-optimization.`);
    }
  }

  if (!url.h1Count || url.h1Count === 0) {
    suggestions.push('Add an H1 heading that includes the primary topic or target keyword.');
  } else if (url.h1Count > 1) {
    suggestions.push('Use only one H1 heading per page.');
  }

  if (!url.h2Count || url.h2Count === 0) {
    suggestions.push('Add H2 subheadings to structure the content and improve scannability.');
  }

  if (headingsScore < 60) {
    suggestions.push('Improve heading structure: use one H1 and multiple H2s that reflect page topics.');
  }

  if (readabilityScore < 50) {
    suggestions.push('Simplify language and shorten sentences to improve readability.');
  }

  if (!url.metaDescription1) {
    suggestions.push('Add a meta description to improve click-through rate from search results.');
  }

  return suggestions;
}
