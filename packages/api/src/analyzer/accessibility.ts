import type { CrawlIssue } from '../types/index.js';
import { getDatabase, getUrls, insertIssues } from '../storage/database.js';
import * as cheerio from 'cheerio';

export function analyzeAccessibility(runId: number): void {
  const urls = getUrls(runId, { isInternal: true });
  if (urls.length === 0) return;

  const issues: CrawlIssue[] = [];
  const db = getDatabase();

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
