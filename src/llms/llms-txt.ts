import type { CrawlUrl } from '../types/index.js';

export function generateLlmsTxt(urls: CrawlUrl[]): string {
  const indexableUrls = urls.filter(
    url => url.isInternal && url.indexability === 'indexable' && url.statusCode === 200
  );

  const lines: string[] = [];
  lines.push('# LLMs.txt - AI Search Visibility');
  lines.push(`# Generated ${new Date().toISOString()}`);
  lines.push(`# Total pages: ${indexableUrls.length}`);
  lines.push('');

  for (const url of indexableUrls) {
    const title = (url.title1 || '').trim();
    const description = (url.metaDescription1 || '').trim();

    lines.push(`- URL: ${url.address}`);
    if (title) {
      lines.push(`  Title: ${title}`);
    }
    if (description) {
      lines.push(`  Description: ${description}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim() + '\n';
}

export function validateLlmsTxt(content: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!content || content.trim().length === 0) {
    errors.push('Content is empty.');
    return { valid: false, errors };
  }

  const lines = content.split(/\r?\n/);
  let hasHeader = false;
  let urlCount = 0;
  let inEntry = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      inEntry = false;
      continue;
    }

    if (trimmed.startsWith('#')) {
      hasHeader = true;
      continue;
    }

    if (trimmed.startsWith('- URL:')) {
      inEntry = true;
      urlCount++;
      const urlValue = trimmed.replace('- URL:', '').trim();
      if (!isValidUrl(urlValue)) {
        errors.push(`Line ${i + 1}: invalid URL "${urlValue}".`);
      }
      continue;
    }

    if (inEntry) {
      if (!trimmed.startsWith('Title:') && !trimmed.startsWith('Description:')) {
        errors.push(`Line ${i + 1}: unexpected entry line "${trimmed}".`);
      }
    }
  }

  if (!hasHeader) {
    errors.push('Missing header comment (e.g., # LLMs.txt).');
  }

  if (urlCount === 0) {
    errors.push('No URLs found in the llms.txt content.');
  }

  return { valid: errors.length === 0, errors };
}

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
