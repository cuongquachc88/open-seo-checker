import fs from 'fs';
import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';
import type { CrawlUrl, ExportOptions } from '../types/index.js';
import { getUrls } from '../storage/database.js';

export async function exportCrawlData(runId: number, options: ExportOptions): Promise<string> {
  const urls = getUrls(runId, {});

  switch (options.format) {
    case 'csv':
      return exportCsv(urls, options);
    case 'json':
      return exportJson(urls, options);
    case 'xlsx':
      return exportXlsx(urls, options);
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
}

function exportCsv(urls: CrawlUrl[], options: ExportOptions): string {
  const columns = determineColumns(urls, options.includeColumns);
  const rows = urls.map(url => columns.map(col => String(getUrlValue(url, col) ?? '')));
  const content = stringify([columns, ...rows]);

  if (options.filePath) {
    fs.writeFileSync(options.filePath, content, 'utf8');
    return options.filePath;
  }
  return content;
}

function exportJson(urls: CrawlUrl[], options: ExportOptions): string {
  const content = JSON.stringify(urls, null, 2);

  if (options.filePath) {
    fs.writeFileSync(options.filePath, content, 'utf8');
    return options.filePath;
  }
  return content;
}

async function exportXlsx(urls: CrawlUrl[], options: ExportOptions): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Crawl URLs');
  const columns = determineColumns(urls, options.includeColumns);

  worksheet.columns = columns.map(col => ({ header: col, key: col, width: 24 }));
  for (const url of urls) {
    const row: Record<string, unknown> = {};
    for (const col of columns) {
      row[col] = getUrlValue(url, col) ?? '';
    }
    worksheet.addRow(row);
  }

  if (!options.filePath) {
    throw new Error('XLSX export requires a filePath');
  }

  await workbook.xlsx.writeFile(options.filePath);
  return options.filePath;
}

function determineColumns(urls: CrawlUrl[], includeColumns?: string[]): string[] {
  if (includeColumns && includeColumns.length > 0) {
    return includeColumns;
  }

  if (urls.length === 0) {
    return ['address', 'statusCode', 'status', 'indexability', 'title1', 'metaDescription1'];
  }

  const keys = new Set<string>();
  for (const url of urls) {
    for (const key of Object.keys(url)) {
      keys.add(key);
    }
  }
  return Array.from(keys).sort();
}

function getUrlValue(url: CrawlUrl, key: string): unknown {
  const record = url as unknown as Record<string, unknown>;
  const value = record[key];
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
}
