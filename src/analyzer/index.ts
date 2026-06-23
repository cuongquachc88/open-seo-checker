import type { CrawlConfig } from '../types/index.js';
import { calculateLinkCounts, analyzeLinks } from './links.js';
import { analyzeTitles } from './titles.js';
import { analyzeMeta } from './meta.js';
import { analyzeHeadings } from './headings.js';
import { analyzeUrls } from './urls.js';
import { analyzeRedirects } from './redirects.js';
import { analyzeCanonicals } from './canonicals.js';
import { analyzeHreflang } from './hreflang.js';
import { analyzePagination } from './pagination.js';
import { analyzeImages } from './images.js';
import { analyzeSecurity } from './security.js';
import { analyzeContent } from './content.js';
import { analyzeDuplicates } from './duplicates.js';
import { analyzeStructuredData } from './structured-data.js';
import { analyzeAccessibility } from './accessibility.js';
import { generateIssues } from './issues.js';

export function runPostCrawlAnalysis(runId: number, config: CrawlConfig): void {
  calculateLinkCounts(runId);
  analyzeTitles(runId);
  analyzeMeta(runId);
  analyzeHeadings(runId);
  analyzeUrls(runId);
  analyzeLinks(runId);
  analyzeRedirects(runId);
  analyzeCanonicals(runId);
  analyzeHreflang(runId);
  analyzePagination(runId);
  analyzeImages(runId);
  analyzeSecurity(runId);
  analyzeContent(runId);
  analyzeDuplicates(runId);
  analyzeStructuredData(runId);
  analyzeAccessibility(runId);
  generateIssues(runId, config);
}
