import { describe, expect, it } from 'vitest';
import { analyzeHeadings } from '../analyzer/headings.js';
import { makeRun, makeUrl, query } from './setup.js';

describe('analyzeHeadings', () => {
  it('flags pages missing an h1', () => {
    const run = makeRun('h1-missing');
    makeUrl(run.id!, { address: 'https://example.com/no-h1', h1Count: 0, h2Count: 0 });

    analyzeHeadings(run.id!);

    const types = query<{ type: string }>(
      'SELECT type FROM issues WHERE crawl_run_id = ?',
      [run.id],
    ).map(i => i.type);
    expect(types).toContain('missing_h1');
  });

  it('flags pages with multiple h1s', () => {
    const run = makeRun('h1-multi');
    makeUrl(run.id!, { address: 'https://example.com/multi', h1: 'First', h1Count: 2 });

    analyzeHeadings(run.id!);

    const types = query<{ type: string }>(
      'SELECT type FROM issues WHERE crawl_run_id = ?',
      [run.id],
    ).map(i => i.type);
    expect(types).toContain('multiple_h1');
  });

  it('flags duplicate h1s across pages', () => {
    const run = makeRun('h1-dup');
    makeUrl(run.id!, { address: 'https://example.com/dup-1', h1: 'Welcome', h1Count: 1 });
    makeUrl(run.id!, { address: 'https://example.com/dup-2', h1: 'Welcome', h1Count: 1 });

    analyzeHeadings(run.id!);

    const dups = query<{ type: string }>(
      "SELECT type FROM issues WHERE crawl_run_id = ? AND type = 'duplicate_h1'",
      [run.id],
    );
    expect(dups.length).toBeGreaterThanOrEqual(2);
  });

  it('flags h2-without-h1 (non-sequential)', () => {
    const run = makeRun('h2-no-h1');
    makeUrl(run.id!, { address: 'https://example.com/bad-order', h1Count: 0, h2Count: 3 });

    analyzeHeadings(run.id!);

    const types = query<{ type: string }>(
      'SELECT type FROM issues WHERE crawl_run_id = ?',
      [run.id],
    ).map(i => i.type);
    expect(types).toContain('missing_h1');
    expect(types).toContain('non_sequential_headings');
  });

  it('flags h1 same as title', () => {
    const run = makeRun('h1-title-same');
    const t = 'Same as H1';
    makeUrl(run.id!, {
      address: 'https://example.com/same',
      title1: t,
      title1Length: t.length,
      h1: t,
      h1Count: 1,
    });

    analyzeHeadings(run.id!);

    const types = query<{ type: string }>(
      'SELECT type FROM issues WHERE crawl_run_id = ?',
      [run.id],
    ).map(i => i.type);
    expect(types).toContain('h1_same_as_title');
  });

  it('flags a deeply long h1', () => {
    const run = makeRun('h1-long');
    const long = 'a'.repeat(80);
    makeUrl(run.id!, { address: 'https://example.com/long', h1: long, h1Length: long.length, h1Count: 1 });

    analyzeHeadings(run.id!);

    const types = query<{ type: string }>(
      'SELECT type FROM issues WHERE crawl_run_id = ?',
      [run.id],
    ).map(i => i.type);
    expect(types).toContain('h1_too_long');
  });
});
