import type { CrawlIssue } from '../types/index.js';
import { getDatabase, insertIssues } from '../storage/database.js';

interface StructuredDataRow {
  id: number;
  url_id: number;
  url: string;
  type: string;
  format: string;
  errors: string | null;
  warnings: string | null;
  rich_result_eligible: number;
}

export function analyzeStructuredData(runId: number): void {
  const db = getDatabase();
  const rows = db.prepare(
    `SELECT id, url_id, url, type, format, errors, warnings, rich_result_eligible
     FROM structured_data
     WHERE crawl_run_id = ?`
  ).all(runId) as StructuredDataRow[];

  if (rows.length === 0) return;

  const issues: CrawlIssue[] = [];

  for (const row of rows) {
    const errors = parseTextList(row.errors);
    const warnings = parseTextList(row.warnings);

    if (errors.length > 0) {
      issues.push({
        urlId: row.url_id,
        url: row.url,
        type: 'structured_data_error',
        category: 'structured-data',
        priority: 'high',
        title: 'Structured Data Error',
        description: `${row.type} (${row.format}) has ${errors.length} error(s): ${errors.join('; ').slice(0, 200)}.`,
        howToFix: 'Validate the structured data using Google’s Rich Results Test and fix the reported errors.',
      });
    }

    if (warnings.length > 0) {
      issues.push({
        urlId: row.url_id,
        url: row.url,
        type: 'structured_data_warning',
        category: 'structured-data',
        priority: 'medium',
        title: 'Structured Data Warning',
        description: `${row.type} (${row.format}) has ${warnings.length} warning(s): ${warnings.join('; ').slice(0, 200)}.`,
        howToFix: 'Review the structured data warnings and provide recommended properties where applicable.',
      });
    }

    if (!row.rich_result_eligible && errors.length === 0 && warnings.length === 0) {
      issues.push({
        urlId: row.url_id,
        url: row.url,
        type: 'not_rich_result_eligible',
        category: 'structured-data',
        priority: 'low',
        title: 'Not Eligible for Rich Results',
        description: `${row.type} (${row.format}) is not marked as eligible for rich results.`,
        howToFix: 'Ensure the structured data meets Google’s rich result requirements and includes all required properties.',
      });
    }
  }

  insertIssues(runId, issues);
}

function parseTextList(value: string | null): string[] {
  if (!value || value.trim().length === 0) return [];
  const trimmed = value.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string');
    } catch {
      // fall through to split
    }
  }
  return trimmed.split(/\n|;/).map(s => s.trim()).filter(Boolean);
}
