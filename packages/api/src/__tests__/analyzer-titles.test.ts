import { describe, expect, it } from 'vitest';
import { analyzeTitles } from '../analyzer/titles.js';
import { makeRun, makeUrl, query } from './setup.js';

describe('analyzeTitles', () => {
  it('flags missing titles', () => {
    const run = makeRun('missing-title');
    makeUrl(run.id!, { address: 'https://example.com/no-title' });

    analyzeTitles(run.id!);

    const issues = query<{ type: string; priority: string }>(
      'SELECT type, priority FROM issues WHERE crawl_run_id = ?',
      [run.id],
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('missing_title');
    expect(issues[0].priority).toBe('high');
  });

  it('flags titles longer than 60 characters', () => {
    const run = makeRun('title-long');
    const long = 'a'.repeat(80);
    makeUrl(run.id!, { address: 'https://example.com/long', title1: long, title1Length: long.length });

    analyzeTitles(run.id!);

    const issues = query<{ type: string }>(
      "SELECT type FROM issues WHERE crawl_run_id = ? AND type LIKE 'title_%'",
      [run.id],
    );
    expect(issues.map(i => i.type)).toContain('title_too_long');
  });

  it('flags titles shorter than 30 characters', () => {
    const run = makeRun('title-short');
    const short = 'short';
    makeUrl(run.id!, { address: 'https://example.com/short', title1: short, title1Length: short.length });

    analyzeTitles(run.id!);

    const types = query<{ type: string }>(
      'SELECT type FROM issues WHERE crawl_run_id = ?',
      [run.id],
    ).map(i => i.type);
    expect(types).toContain('title_too_short');
  });

  it('flags duplicate titles across pages', () => {
    const run = makeRun('title-dup');
    const title = 'Same Title Repeated Across Pages';
    makeUrl(run.id!, { address: 'https://example.com/dup-1', title1: title, title1Length: title.length });
    makeUrl(run.id!, { address: 'https://example.com/dup-2', title1: title, title1Length: title.length });

    analyzeTitles(run.id!);

    const dups = query<{ type: string; url: string }>(
      "SELECT type, url FROM issues WHERE crawl_run_id = ? AND type = 'duplicate_title'",
      [run.id],
    );
    expect(dups.length).toBeGreaterThanOrEqual(2);
    expect(dups.map(d => d.url).sort()).toEqual([
      'https://example.com/dup-1',
      'https://example.com/dup-2',
    ]);
  });

  it('flags both too-long AND too-short at the same time for impossible inputs', () => {
    const run = makeRun('title-mid');
    const mid = 'a'.repeat(45);
    makeUrl(run.id!, { address: 'https://example.com/mid', title1: mid, title1Length: mid.length });

    analyzeTitles(run.id!);

    const types = query<{ type: string }>(
      'SELECT type FROM issues WHERE crawl_run_id = ?',
      [run.id],
    ).map(i => i.type);
    expect(types).not.toContain('title_too_short');
    expect(types).not.toContain('title_too_long');
  });

  it('flags multiple title tags', () => {
    const run = makeRun('title-multi');
    makeUrl(run.id!, {
      address: 'https://example.com/multi',
      title1: 'First',
      title1Length: 5,
      title2: 'Second',
      title2Length: 6,
    });

    analyzeTitles(run.id!);

    const types = query<{ type: string }>(
      'SELECT type FROM issues WHERE crawl_run_id = ?',
      [run.id],
    ).map(i => i.type);
    expect(types).toContain('multiple_titles');
  });

  it('does nothing on runs with no internal urls', () => {
    const run = makeRun('title-empty');

    analyzeTitles(run.id!);

    expect(
      query('SELECT COUNT(*) as count FROM issues WHERE crawl_run_id = ?', [run.id])[0].count,
    ).toBe(0);
  });
});
