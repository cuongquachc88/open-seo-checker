import type { CrawlConfig } from '../types/index.js';

export const defaultConfig: CrawlConfig = {
  startUrl: '',
  mode: 'spider',
  maxUrls: 1000,
  maxDepth: 10,
  threads: 10,
  userAgent: 'OpenSEOCrawler/1.0',
  customHeaders: {},
  respectRobotsTxt: true,
  followRedirects: true,
  allowSubdomains: false,
  crawlExternal: true,
  renderJs: false,
  renderTimeout: 30000,
  includeImages: true,
  includeCss: true,
  includeJs: true,
  includePdfs: false,
  excludePatterns: [],
  includePatterns: [],
  queryStringHandling: 'keep',
  useSitemaps: false,
  followCanonical: true,
  followHreflang: true,
  checkSpelling: false,
  checkGrammar: false,
  nearDuplicateThreshold: 90,
  enableNearDuplicates: false,
  enableSemanticSimilarity: false,
  apiKeys: {},
};

export function parseCrawlConfig(input: Partial<CrawlConfig>): CrawlConfig {
  return {
    ...defaultConfig,
    ...input,
    customHeaders: input.customHeaders ?? defaultConfig.customHeaders,
    excludePatterns: input.excludePatterns ?? defaultConfig.excludePatterns,
    includePatterns: input.includePatterns ?? defaultConfig.includePatterns,
    apiKeys: input.apiKeys ?? defaultConfig.apiKeys,
  };
}

export function mergeWithDefault(config: Partial<CrawlConfig>): CrawlConfig {
  return parseCrawlConfig(config);
}
