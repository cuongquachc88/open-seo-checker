import { describe, expect, it } from 'vitest';
import { analyzeImages } from '../analyzer/images.js';
import { getDatabase, makeRun, makeUrl, query } from './setup.js';

function insertImage(
  runId: number,
  sourceUrlId: number,
  overrides: Partial<{
    url: string;
    alt: string | null;
    width: number | null;
    height: number | null;
    size: number | null;
    statusCode: number | null;
  }>,
): void {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO images (
       crawl_run_id, source_url_id, url, alt, width, height, size, status_code
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    runId,
    sourceUrlId,
    overrides.url ?? 'https://example.com/image.png',
    overrides.alt ?? null,
    overrides.width ?? null,
    overrides.height ?? null,
    overrides.size ?? null,
    overrides.statusCode ?? null,
  );
}

describe('analyzeImages', () => {
  it('flags images without alt text', () => {
    const run = makeRun('img-no-alt');
    const urlId = makeUrl(run.id!, { address: 'https://example.com/a' });
    insertImage(run.id!, urlId, { url: 'https://example.com/a.png', alt: null });

    analyzeImages(run.id!);

    const types = query<{ type: string }>(
      'SELECT type FROM issues WHERE crawl_run_id = ?',
      [run.id],
    ).map(i => i.type);
    expect(types).toContain('missing_alt_text');
  });

  it('flags oversized images (>100kb)', () => {
    const run = makeRun('img-big');
    const urlId = makeUrl(run.id!, { address: 'https://example.com/a' });
    insertImage(run.id!, urlId, {
      url: 'https://example.com/big.png',
      alt: 'big image',
      size: 200 * 1024,
    });

    analyzeImages(run.id!);

    const types = query<{ type: string }>(
      'SELECT type FROM issues WHERE crawl_run_id = ?',
      [run.id],
    ).map(i => i.type);
    expect(types).toContain('oversized_image');
  });

  it('flags images without explicit dimensions', () => {
    const run = makeRun('img-no-dim');
    const urlId = makeUrl(run.id!, { address: 'https://example.com/a' });
    insertImage(run.id!, urlId, {
      url: 'https://example.com/undimmed.png',
      alt: 'no dim',
      width: null,
      height: null,
    });

    analyzeImages(run.id!);

    const types = query<{ type: string }>(
      'SELECT type FROM issues WHERE crawl_run_id = ?',
      [run.id],
    ).map(i => i.type);
    expect(types).toContain('missing_image_dimensions');
  });

  it('flags broken images (4xx / 5xx)', () => {
    const run = makeRun('img-broken');
    const urlId = makeUrl(run.id!, { address: 'https://example.com/a' });
    insertImage(run.id!, urlId, {
      url: 'https://example.com/missing.png',
      alt: 'broken',
      width: 100,
      height: 100,
      statusCode: 404,
    });

    analyzeImages(run.id!);

    const types = query<{ type: string }>(
      'SELECT type FROM issues WHERE crawl_run_id = ?',
      [run.id],
    ).map(i => i.type);
    expect(types).toContain('broken_image');
  });

  it('flags missing alt even when other dimensions are fine', () => {
    const run = makeRun('img-multi');
    const urlId = makeUrl(run.id!, { address: 'https://example.com/a' });
    insertImage(run.id!, urlId, {
      url: 'https://example.com/no-alt.png',
      alt: '',
      width: 100,
      height: 100,
    });

    analyzeImages(run.id!);

    const types = query<{ type: string }>(
      'SELECT type FROM issues WHERE crawl_run_id = ?',
      [run.id],
    ).map(i => i.type);
    expect(types).toEqual(['missing_alt_text']);
  });

  it('does nothing for runs with no images', () => {
    const run = makeRun('img-empty');
    makeUrl(run.id!, { address: 'https://example.com/no-images' });

    analyzeImages(run.id!);

    expect(
      query('SELECT COUNT(*) as count FROM issues WHERE crawl_run_id = ?', [run.id])[0].count,
    ).toBe(0);
  });
});
