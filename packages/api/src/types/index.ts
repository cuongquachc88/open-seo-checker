export interface CrawlConfig {
  startUrl: string;
  mode: 'spider' | 'list';
  listUrls?: string[];
  maxUrls: number;
  maxDepth: number;
  threads: number;
  userAgent: string;
  customHeaders: Record<string, string>;
  respectRobotsTxt: boolean;
  customRobotsTxt?: string;
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
  auth?: {
    type: 'form';
    loginUrl: string;
    username: string;
    password: string;
    usernameField: string;
    passwordField: string;
    submitSelector: string;
  };
  proxy?: string;
  sitemapUrls?: string[];
  useSitemaps: boolean;
  followCanonical: boolean;
  followHreflang: boolean;
  checkSpelling: boolean;
  checkGrammar: boolean;
  language?: string;
  nearDuplicateThreshold: number;
  enableNearDuplicates: boolean;
  enableSemanticSimilarity: boolean;
  customExtraction?: CustomExtractionRule[];
  customSearch?: CustomSearchRule[];
  customJavaScript?: string[];
  aiPrompts?: AIPrompt[];
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
    majestic?: string;
    ahrefs?: string;
    moz?: string;
  };
}

export interface CustomExtractionRule {
  name: string;
  selector: string;
  selectorType: 'xpath' | 'css' | 'regex';
  source: 'raw' | 'rendered';
  multiple: boolean;
  attribute?: string;
}

export interface CustomSearchRule {
  name: string;
  pattern: string;
  regex: boolean;
  source: 'raw' | 'rendered';
}

export interface AIPrompt {
  name: string;
  prompt: string;
  model: string;
  provider: 'openai' | 'anthropic' | 'gemini' | 'kimi' | 'minimax' | 'ollama';
  applyTo: 'all' | 'issue' | 'url';
  targetIssueType?: string;
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
  title1PixelWidth?: number;
  title2?: string;
  title2Length?: number;
  metaDescription1?: string;
  metaDescription1Length?: number;
  metaDescription1PixelWidth?: number;
  metaDescription2?: string;
  metaDescription2Length?: number;
  metaKeywords1?: string;
  metaKeywords1Length?: number;
  metaKeywords2?: string;
  metaKeywords2Length?: number;
  h1?: string;
  h1Length?: number;
  h2?: string;
  h2Length?: number;
  h1Count?: number;
  h2Count?: number;
  metaRobots?: string;
  xRobotsTag?: string;
  canonical?: string;
  canonicalHeader?: string;
  relNext?: string;
  relPrev?: string;
  httpRelNext?: string;
  httpRelPrev?: string;
  contentLength?: number;
  transferredSize?: number;
  totalTransferredSize?: number;
  wordCount?: number;
  textRatio?: number;
  crawlDepth: number;
  folderDepth: number;
  linkScore?: number;
  inlinks?: number;
  uniqueInlinks?: number;
  uniqueJsInlinks?: number;
  percentOfTotal?: number;
  outlinks?: number;
  uniqueOutlinks?: number;
  uniqueJsOutlinks?: number;
  externalOutlinks?: number;
  uniqueExternalOutlinks?: number;
  uniqueExternalJsOutlinks?: number;
  responseTime?: number;
  lastModified?: string;
  redirectUrl?: string;
  redirectType?: 'http' | 'hsts' | 'javascript' | 'meta' | 'http-refresh';
  httpVersion?: string;
  urlEncodedAddress?: string;
  hash?: string;
  urlLength?: number;
  isInternal: boolean;
  isExternal: boolean;
  hasMixedContent?: boolean;
  isSecure?: boolean;
  spellingErrors?: number;
  grammarErrors?: number;
  language?: string;
  closestSimilarityMatch?: number;
  nearDuplicateCount?: number;
  extractedCustom?: Record<string, string | string[]>;
  aiResults?: Record<string, string>;
  // Timestamps
  crawledAt?: string;
  createdAt?: string;
  updatedAt?: string;
  // Raw data
  rawHtml?: string;
  renderedHtml?: string;
  headers?: Record<string, string>;
  cookies?: string;
  redirectChain?: string[];
  resourceUrls?: string[];
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
  isScript: boolean;
  isStylesheet: boolean;
  anchorText?: string;
  altText?: string;
  linkType: 'a' | 'img' | 'link' | 'script' | 'iframe' | 'form' | 'css' | 'meta' | 'other';
  rel?: string;
  target?: string;
  nofollow: boolean;
  noreferrer: boolean;
  noopener: boolean;
  sponsored: boolean;
  ugc: boolean;
  location: 'html' | 'js' | 'rendered';
  position?: number;
  createdAt?: string;
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
  config: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  urlsCrawled: number;
  urlsFound: number;
  errors: number;
  redirects: number;
  blocked: number;
  dbPath: string;
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

export interface FetchResult {
  url: string;
  normalizedUrl: string;
  statusCode: number;
  status: string;
  statusCategory: CrawlUrl['statusCategory'];
  headers: Record<string, string>;
  contentType?: string;
  contentLength?: number;
  transferredSize: number;
  body: string;
  responseTime: number;
  lastModified?: string;
  httpVersion: string;
  urlEncodedAddress: string;
  redirectUrl?: string;
  redirectType?: CrawlUrl['redirectType'];
  redirectChain?: string[];
  cookies?: string;
  error?: string;
  errorType?: 'dns' | 'timeout' | 'refused' | 'error' | 'malformed';
}

export interface ExtractedLinks {
  links: Omit<CrawlLink, 'id' | 'sourceUrlId'>[];
  resourceUrls: string[];
}

export interface RobotsInfo {
  url: string;
  content: string;
  isAllowed: boolean;
  crawlDelay?: number;
  sitemaps: string[];
}

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

export interface SitemapIndex {
  loc: string;
  lastmod?: string;
}

export interface Sitemap {
  urls: SitemapUrl[];
  sitemaps: SitemapIndex[];
}

export interface SitemapConfig {
  lastmod?: string;
  changefreq?: string;
  priority?: string;
  includeImages?: boolean;
  imageUrls?: Record<string, string[]>;
}

export interface ReportTab {
  id: string;
  name: string;
  description: string;
  columns: ReportColumn[];
  filters?: ReportFilter[];
}

export interface ReportColumn {
  key: string;
  label: string;
  width?: number;
  type?: 'text' | 'number' | 'url' | 'boolean' | 'date';
}

export interface ReportFilter {
  id: string;
  name: string;
  issueType?: string;
  condition?: string;
}

export interface IssueDefinition {
  type: string;
  category: string;
  priority: CrawlIssue['priority'];
  title: string;
  description: string;
  howToFix?: string;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  tab?: string;
  filter?: string;
  includeColumns?: string[];
  filePath?: string;
}

export interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
  images?: string[];
}

export interface AICallOptions {
  provider: AIPrompt['provider'];
  model: string;
  prompt: string;
  systemPrompt?: string;
  messages?: { role: 'system' | 'user' | 'assistant'; content: string }[];
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
  baseUrl?: string;
}

export interface AICallResult {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface PageSpeedData {
  url: string;
  strategy: 'mobile' | 'desktop';
  performanceScore?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  timeToInteractive?: number;
  totalBlockingTime?: number;
  cumulativeLayoutShift?: number;
  speedIndex?: number;
  cruxLcp?: number;
  cruxInp?: number;
  cruxCls?: number;
  cruxOriginLcp?: number;
  cruxOriginInp?: number;
  cruxOriginCls?: number;
  opportunities: string[];
  diagnostics: string[];
  error?: string;
}

export interface LogEntry {
  ip: string;
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  bytes: number;
  referrer?: string;
  userAgent: string;
  isBot: boolean;
  botName?: string;
}

export interface LogAnalysisSummary {
  totalRequests: number;
  botRequests: number;
  uniqueUrls: number;
  statusDistribution: Record<string, number>;
  botDistribution: Record<string, number>;
  topUrls: { url: string; count: number }[];
  orphanUrls: string[];
  crawlBudgetWaste: { url: string; count: number; statusCode: number }[];
}

export interface RankTrackingResult {
  keyword: string;
  url: string;
  position?: number;
  page?: number;
  title?: string;
  snippet?: string;
  serpFeatures: string[];
  error?: string;
}

export interface KeywordData {
  keyword: string;
  searchVolume?: number;
  keywordDifficulty?: number;
  cpc?: number;
  competition?: number;
  trend?: number[];
}

export interface BacklinkData {
  sourceUrl: string;
  targetUrl: string;
  anchorText?: string;
  dofollow: boolean;
  firstSeen?: string;
  lastSeen?: string;
  authority?: number;
  isToxic?: boolean;
}

export interface ContentScoreResult {
  url: string;
  targetKeyword?: string;
  score: number;
  wordCount: number;
  keywordDensity: number;
  headingsOptimization: number;
  readabilityScore: number;
  suggestions: string[];
}

export interface SchemaMarkupTemplate {
  name: string;
  type: string;
  template: Record<string, unknown>;
  fields: { key: string; label: string; required: boolean; type: string }[];
}

export interface SecurityHeaderResult {
  url: string;
  https: boolean;
  mixedContent: boolean;
  hsts: boolean;
  csp: boolean;
  xContentTypeOptions: boolean;
  xFrameOptions: boolean;
  referrerPolicy: boolean;
  unsafeCrossOriginLinks: boolean;
  protocolRelativeLinks: boolean;
  insecureForms: boolean;
  badContentType: boolean;
}

export interface AccessibilityResult {
  url: string;
  ruleId: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  help: string;
  helpUrl: string;
  target: string[];
  html?: string;
  wcagTags: string[];
}

export interface StructuredDataResult {
  url: string;
  type: 'json-ld' | 'microdata' | 'rdfa';
  format: string;
  data: unknown;
  errors: string[];
  warnings: string[];
  richResultEligible?: boolean;
}

export interface ImageData {
  url: string;
  sourceUrl: string;
  alt?: string;
  width?: number;
  height?: number;
  size?: number;
  format?: string;
  isBackground: boolean;
  missingAlt: boolean;
  oversized: boolean;
  missingDimensions: boolean;
  statusCode?: number;
}

export interface HeadingData {
  level: number;
  text: string;
  length: number;
  hasAltText: boolean;
  isSequential: boolean;
}

export interface LinkAnalysisResult {
  totalLinks: number;
  internalLinks: number;
  externalLinks: number;
  nofollowLinks: number;
  uniqueInternalLinks: number;
  uniqueExternalLinks: number;
  nonDescriptiveAnchors: number;
  linksWithoutHref: number;
  unsafeLinks: number;
}

export interface RedirectChainResult {
  source: string;
  target: string;
  chain: string[];
  isLoop: boolean;
  hopCount: number;
}
