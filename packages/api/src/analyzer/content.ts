import type { CrawlIssue, CrawlUrl } from '../types/index.js';
import { getUrls, insertIssues } from '../storage/database.js';

export function analyzeContent(runId: number): void {
  const urls = getUrls(runId, { isInternal: true });
  if (urls.length === 0) return;

  const issues: CrawlIssue[] = [];

  for (const url of urls) {
    if (url.wordCount !== undefined && url.wordCount < 300) {
      issues.push(createIssue(
        url,
        'thin_content',
        'medium',
        'Thin Content',
        `Page has only ${url.wordCount} words (minimum recommended 300).`,
        'Add more comprehensive, valuable content to the page to improve topical relevance and rankings.'
      ));
    }

    if (url.textRatio !== undefined && url.textRatio < 5) {
      issues.push(createIssue(
        url,
        'low_text_ratio',
        'low',
        'Low Text Ratio',
        `Text-to-HTML ratio is ${url.textRatio}%, which is below the recommended 5%.`,
        'Reduce unnecessary HTML, scripts, and styles while increasing meaningful textual content.'
      ));
    }

    if (url.h1Count === 0) {
      issues.push(createIssue(
        url,
        'missing_h1_content',
        'high',
        'Missing H1 Heading',
        'The page does not have an H1 heading.',
        'Add a single, descriptive H1 heading to the page.'
      ));
    }

    if (url.h2Count === 0) {
      issues.push(createIssue(
        url,
        'missing_h2',
        'low',
        'Missing H2 Headings',
        'The page does not have any H2 headings.',
        'Add H2 subheadings to structure the content and improve readability.'
      ));
    }
  }

  insertIssues(runId, issues);
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
    category: 'content',
    priority,
    title,
    description,
    howToFix,
  };
}
