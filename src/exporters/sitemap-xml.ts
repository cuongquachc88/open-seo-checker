import { getDatabase, getUrls } from '../storage/database.js';

export interface SitemapXmlConfig {
  includeImages?: boolean;
  changefreq?: string;
  priority?: string;
  lastmod?: string;
}

export function generateXmlSitemap(runId: number, config: SitemapXmlConfig = {}): string {
  const urls = getUrls(runId, {})
    .filter(url => url.isInternal && url.indexability === 'indexable' && url.statusCode === 200);

  let imageMap: Map<number, string[]> = new Map();
  if (config.includeImages) {
    imageMap = queryImagesByUrlId(runId);
  }

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">');

  for (const url of urls) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(url.address)}</loc>`);

    const lastmod = url.lastModified || url.crawledAt || config.lastmod || new Date().toISOString().split('T')[0];
    lines.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);

    if (config.changefreq) {
      lines.push(`    <changefreq>${escapeXml(config.changefreq)}</changefreq>`);
    }
    if (config.priority) {
      lines.push(`    <priority>${escapeXml(config.priority)}</priority>`);
    }

    if (config.includeImages) {
      const images = imageMap.get(url.id ?? -1) || [];
      for (const imageUrl of images) {
        lines.push('    <image:image>');
        lines.push(`      <image:loc>${escapeXml(imageUrl)}</image:loc>`);
        lines.push('    </image:image>');
      }
    }

    lines.push('  </url>');
  }

  lines.push('</urlset>');
  return lines.join('\n');
}

function queryImagesByUrlId(runId: number): Map<number, string[]> {
  const db = getDatabase();
  const rows = db.prepare(
    'SELECT source_url_id as url_id, url FROM images WHERE crawl_run_id = ?'
  ).all(runId) as { url_id: number; url: string }[];

  const map = new Map<number, string[]>();
  for (const row of rows) {
    const list = map.get(row.url_id) || [];
    list.push(row.url);
    map.set(row.url_id, list);
  }
  return map;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
