import { describe, expect, it } from 'vitest';
import { analyzeMeta } from '../analyzer/meta.js';
import { makeRun, makeUrl, query } from './setup.js';

describe('analyzeMeta', () => {
  it('flags missing meta descriptions', () => {
    const run = makeRun('meta-missing');
    makeUrl(run.id!, { address: 'https://example.com/no-desc' });

    analyzeMeta(run.id!);

    const types = query<{ type: string }>(
      "SELECT type FROM issues WHERE crawl_run_id = ? AND type LIKE 'missing_meta%'",
      [run.id],
    ).map(i => i.type);
    expect(types).toContain('missing_meta_description');
  });

  it('flags meta descriptions longer than 155 characters', () => {
    const run = makeRun('meta-long');
    const long = 'a'.repeat(180);
    makeUrl(run.id!, {
      address: 'https://example.com/long',
      metaDescription1: long,
      metaDescription1Length: long.length,
    });

    analyzeMeta(run.id!);

    const types = query<{ type: string }>(
      'SELECT type FROM issues WHERE crawl_run_id = ?',
      [run.id],
    ).map(i => i.type);
    expect(types).toContain('meta_description_too_long');
  });

  it('flags meta descriptions shorter than 70 characters', () => {
    const run = makeRun('meta-short');
    const short = 'a'.repeat(40);
    makeUrl(run.id!, {
      address: 'https://example.com/short',
      metaDescription1: short,
      metaDescription1Length: short.length,
    });

    analyzeMeta(run.id!);

    const types = query<{ type: string }>(
      'SELECT type FROM issues WHERE crawl_run_id = ?',
      [run.id],
    ).map(i => i.type);
    expect(types).toContain('meta_description_too_short');
  });

  it('flags duplicate meta descriptions across pages', () => {
    const run = makeRun('meta-dup');
    const desc = 'a'.repeat(100);
    makeUrl(run.id!, {
      address: 'https://example.com/dup-1',
      metaDescription1: desc,
      metaDescription1Length: desc.length,
    });
    makeUrl(run.id!, {
      address: 'https://example.com/dup-2',
      metaDescription1: desc,
      metaDescription1Length: desc.length,
    });

    analyzeMeta(run.id!);

    const dups = query<{ type: string; url: string }>(
      "SELECT type, url FROM issues WHERE crawl_run_id = ? AND type = 'duplicate_meta_description'",
      [run.id],
    );
    expect(dups.length).toBeGreaterThanOrEqual(2);
  });

  it('flags multiple meta descriptions', () => {
    const run = makeRun('meta-multi');
    makeUrl(run.id!, {
      address: 'https://example.com/multi',
      metaDescription1: 'a'.repeat(100),
      metaDescription1Length: 100,
      metaDescription2: 'b'.repeat(100),
      metaDescription2Length: 100,
    });

    analyzeMeta(run.id!);

    const types = query<{ type: string }>(
      'SELECT type FROM issues WHERE crawl_run_id = ?',
      [run.id],
    ).map(i => i.type);
    expect(types).toContain('multiple_meta_descriptions');
  });

  it('leaves a well-balanced description alone', () => {
    const run = makeRun('meta-ok');
    const ok = 'a'.repeat(120);
    makeUrl(run.id!, {
      address: 'https://example.com/ok',
      metaDescription1: ok,
      metaDescription1Length: ok.length,
    });

    analyzeMeta(run.id!);

    const count = query<{ count: number }>(
      'SELECT COUNT(*) as count FROM issues WHERE crawl_run_id = ?',
      [run.id],
    )[0].count;
    expect(count).toBe(0);
  });
});
