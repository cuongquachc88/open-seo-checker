// Mirror of backend types trimmed down for UI consumption.

export type CrawlMode = 'spider' | 'list';

export interface CrawlConfig {
  startUrl: string;
  mode: CrawlMode;
  listUrls?: string[];
  maxUrls: number;
  maxDepth: number;
  threads: number;
  userAgent: string;
  customHeaders?: Record<string, string>;
  respectRobotsTxt: boolean;
  followRedirects: boolean;
  allowSubdomains: boolean;
  crawlExternal: boolean;
  renderJs: boolean;
  renderTimeout: number;
  includeImages: boolean;
  includeCss: boolean;
  includeJs: boolean;
  includePdfs: boolean;
  excludePatterns: string[];
  includePatterns: string[];
  queryStringHandling: 'keep' | 'remove' | 'remove-except-first';
  useSitemaps: boolean;
  followCanonical: boolean;
  followHreflang: boolean;
  nearDuplicateThreshold: number;
  enableNearDuplicates: boolean;
  enableSemanticSimilarity: boolean;
  apiKeys?: {
    openai?: string;
    anthropic?: string;
    gemini?: string;
    kimi?: string;
    minimax?: string;
    ollama?: string;
    ga4?: string;
    gsc?: string;
    psi?: string;
  };
}

export interface CrawlUrl {
  id?: number;
  address: string;
  normalizedAddress: string;
  contentType?: string;
  statusCode?: number;
  status?: string;
  statusCategory?: 'success' | 'redirect' | 'client-error' | 'server-error' | 'no-response';
  indexability: 'indexable' | 'non-indexable';
  indexabilityStatus?: string;
  title1?: string;
  title1Length?: number;
  metaDescription1?: string;
  h1?: string;
  h1Count?: number;
  h2Count?: number;
  metaRobots?: string;
  canonical?: string;
  hreflang?: string;
  relNext?: string;
  relPrev?: string;
  contentLength?: number;
  transferredSize?: number;
  wordCount?: number;
  textRatio?: number;
  crawlDepth: number;
  folderDepth: number;
  inlinks?: number;
  uniqueInlinks?: number;
  outlinks?: number;
  uniqueOutlinks?: number;
  externalOutlinks?: number;
  responseTime?: number;
  lastModified?: string;
  redirectUrl?: string;
  urlLength?: number;
  isInternal: boolean;
  isExternal: boolean;
  hasMixedContent?: boolean;
  crawledAt?: string;
  language?: string;
}

export interface CrawlLink {
  id?: number;
  sourceUrlId: number;
  sourceUrl: string;
  targetUrl: string;
  targetNormalizedUrl: string;
  isInternal: boolean;
  isExternal: boolean;
  isImage: boolean;
  anchorText?: string;
  altText?: string;
  linkType: string;
  rel?: string;
  nofollow: boolean;
  location: 'html' | 'js' | 'rendered';
}

export interface CrawlIssue {
  id?: number;
  urlId: number;
  url: string;
  type: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'opportunity';
  title: string;
  description: string;
  detail?: string;
  howToFix?: string;
  createdAt?: string;
}

export interface CrawlRun {
  id?: number;
  name: string;
  startUrl: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  urlsCrawled: number;
  urlsFound: number;
  errors: number;
  redirects: number;
  dbPath: string;
  sitemapUrls?: string[];
  robotsTxt?: Record<string, string>;
}

export interface CrawlProgressEvent {
  type: 'started' | 'progress' | 'completed' | 'error' | 'cancelled';
  runId: number;
  urlsCrawled: number;
  urlsFound: number;
  urlsQueued: number;
  errors: number;
  redirects: number;
  currentUrl?: string;
  message?: string;
  timestamp: string;
}

export interface IssueDefinition {
  type: string;
  category: string;
  priority: CrawlIssue['priority'];
  title: string;
  description: string;
  howToFix?: string;
}
