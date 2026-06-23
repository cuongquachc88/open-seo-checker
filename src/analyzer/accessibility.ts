import type { CrawlIssue } from '../types/index.js';
import { getDatabase, getUrls, insertIssues } from '../storage/database.js';
import * as cheerio from 'cheerio';

interface ImageLink {
  source_url_id: number;
  source_url: string;
  target_url: string;
  alt_text: string | null;
}

export function analyzeAccessibility(runId: number): void {
  const urls = getUrls(runId, { isInternal: true });
  if (urls.length === 0) return;

  const issues: CrawlIssue[] = [];
  const db = getDatabase();
  const imageRows = db.prepare(
    `SELECT source_url_id, source_url, target_url, alt_text
     FROM links
     WHERE crawl_run_id = ? AND is_image = 1 AND (alt_text IS NULL OR alt_text = '')`
  ).all(runId) as ImageLink[];

  for (const image of imageRows) {
    issues.push({
      urlId: image.source_url_id,
      url: image.source_url,
      type: 'missing_alt_text',
      category: 'accessibility',
      priority: 'high',
      title: 'Missing Image Alt Text',
      description: `Image ${image.target_url} is missing alt text.`,
      howToFix: 'Add descriptive alt text to the image for screen readers and search engines.',
    });
  }

  for (const url of urls) {
    if (!url.rawHtml) continue;

    const $ = cheerio.load(url.rawHtml);

    const htmlLang = $('html').attr('lang');
    if (!htmlLang || htmlLang.trim().length === 0) {
      issues.push({
        urlId: url.id!,
        url: url.address,
        type: 'missing_lang_attribute',
        category: 'accessibility',
        priority: 'medium',
        title: 'Missing HTML lang Attribute',
        description: 'The <html> tag does not have a lang attribute.',
        howToFix: 'Add a lang attribute to the <html> tag (e.g., <html lang="en">).',
      });
    }

    const formControls = $('input:not([type="hidden"]), textarea, select');
    formControls.each((_, el) => {
      const $el = $(el);
      const id = $el.attr('id');
      const ariaLabel = $el.attr('aria-label');
      const ariaLabelledBy = $el.attr('aria-labelledby');
      const title = $el.attr('title');
      const placeholder = $el.attr('placeholder');

      if (ariaLabel || ariaLabelledBy || title || placeholder) return;

      if (id && $(`label[for="${id}"]`).length > 0) return;

      const name = $el.attr('name') || $el.attr('type') || 'form control';
      issues.push({
        urlId: url.id!,
        url: url.address,
        type: 'missing_form_label',
        category: 'accessibility',
        priority: 'medium',
        title: 'Missing Form Label',
        description: `A form control (${name}) is missing an associated label.`,
        howToFix: 'Add a <label> element associated with the form control via the for attribute, or use aria-label/aria-labelledby.',
      });
    });
  }

  insertIssues(runId, issues);
}
