import type { CrawlIssue } from '../types/index.js';
import { getDatabase, insertIssues } from '../storage/database.js';

interface ImageRow {
  id: number;
  source_url_id: number;
  source_address: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  status_code: number | null;
}

export function analyzeImages(runId: number): void {
  const db = getDatabase();
  const images = db.prepare(
    `SELECT i.id, i.source_url_id, u.address as source_address, i.url, i.alt, i.width, i.height, i.size, i.status_code
     FROM images i
     JOIN urls u ON u.id = i.source_url_id
     WHERE i.crawl_run_id = ?`
  ).all(runId) as ImageRow[];

  if (images.length === 0) return;

  const issues: CrawlIssue[] = [];

  for (const image of images) {
    if (!image.alt || image.alt.trim().length === 0) {
      issues.push(createIssue(
        image,
        'missing_alt_text',
        'high',
        'Missing Image Alt Text',
        `Image ${image.url} does not have alt text.`,
        'Add descriptive alt text to the image for accessibility and SEO.'
      ));
    }

    if (image.size !== null && image.size > 100 * 1024) {
      issues.push(createIssue(
        image,
        'oversized_image',
        'medium',
        'Oversized Image',
        `Image ${image.url} is ${(image.size / 1024).toFixed(1)}KB (max recommended 100KB).`,
        'Compress or optimize the image to reduce file size and improve page speed.'
      ));
    }

    if (image.width === null || image.height === null) {
      issues.push(createIssue(
        image,
        'missing_image_dimensions',
        'low',
        'Missing Image Dimensions',
        `Image ${image.url} does not have explicit width and height attributes.`,
        'Add width and height attributes to the image to reduce layout shift and improve Core Web Vitals.'
      ));
    }

    if (image.status_code !== null && image.status_code >= 400) {
      issues.push(createIssue(
        image,
        'broken_image',
        'high',
        'Broken Image',
        `Image ${image.url} returns a ${image.status_code} status code.`,
        'Fix or remove the broken image reference.'
      ));
    }
  }

  insertIssues(runId, issues);
}

function createIssue(
  image: ImageRow,
  type: string,
  priority: CrawlIssue['priority'],
  title: string,
  description: string,
  howToFix?: string
): CrawlIssue {
  return {
    urlId: image.source_url_id,
    url: image.source_address,
    type,
    category: 'images',
    priority,
    title,
    description,
    howToFix,
  };
}
