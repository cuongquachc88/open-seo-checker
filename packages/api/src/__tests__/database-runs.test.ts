/**
 * Regression tests for the crawl run storage layer.
 */
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDatabase, createCrawlRun, openDatabase } from '../storage/database.js';
import { makeConfig } from './setup.js';

let tmpDir: string;

describe('crawl run storage', () => {
  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'oseo-run-test-'));
  });

  afterAll(() => {
    closeDatabase();
    if (tmpDir) {
      try {
        rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* best effort */
      }
    }
  });

  it('generates globally unique IDs across separate database files', () => {
    openDatabase(join(tmpDir, 'first.db'));
    const first = createCrawlRun('first', 'https://first.example.com/', makeConfig());

    openDatabase(join(tmpDir, 'second.db'));
    const second = createCrawlRun('second', 'https://second.example.com/', makeConfig());

    expect(first.id).toBeGreaterThan(0);
    expect(second.id).toBeGreaterThan(0);
    expect(second.id).not.toBe(first.id);
  });
});
