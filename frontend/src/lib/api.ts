import type {
  CrawlConfig,
  CrawlIssue,
  CrawlLink,
  CrawlProgressEvent,
  CrawlRun,
  CrawlUrl,
  IssueDefinition,
} from '@/types/domain';

type Json = Record<string, unknown>;

const BASE = '';

async function http<T>(
  path: string,
  init: RequestInit = {},
  parse: 'json' | 'text' = 'json',
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let message = res.statusText || 'Request failed';
    try {
      const data = parse === 'json' ? await res.json() : { error: await res.text() };
      const candidate = (data as Json)?.error;
      if (typeof candidate === 'string' && candidate.length > 0) message = candidate;
    } catch {
      /* fall through with status text */
    }
    throw new Error(message);
  }
  return parse === 'json' ? ((await res.json()) as T) : ((await res.text()) as T);
}

export const api = {
  health: () => http<{ status: string; version: string }>('/api/health'),

  startCrawl: (config: Partial<CrawlConfig>) =>
    http<{ runId: number; status: CrawlRun['status'] }>('/api/crawl', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  getStatus: (id: number) =>
    http<CrawlRun & { progress?: CrawlProgressEvent | null }>(`/api/crawl/${id}/status`),

  getUrls: (
    id: number,
    options: { isInternal?: boolean; statusCategory?: string; limit?: number; offset?: number } = {},
  ) => {
    const query = new URLSearchParams();
    if (options.isInternal != null) query.set('isInternal', String(options.isInternal));
    if (options.statusCategory) query.set('statusCategory', options.statusCategory);
    if (options.limit != null) query.set('limit', String(options.limit));
    if (options.offset != null) query.set('offset', String(options.offset));
    const qs = query.toString();
    return http<{ urls: CrawlUrl[]; count: number }>(`/api/crawl/${id}/urls${qs ? `?${qs}` : ''}`);
  },

  getUrlDetail: (id: number, urlId: number) =>
    http<{ url: CrawlUrl; inlinks: CrawlLink[]; outlinks: CrawlLink[] }>(
      `/api/crawl/${id}/url/${urlId}`,
    ),

  getIssues: (id: number, type?: string, priority?: string) => {
    const query = new URLSearchParams();
    if (type) query.set('type', type);
    if (priority) query.set('priority', priority);
    const qs = query.toString();
    return http<{ issues: CrawlIssue[]; count: number }>(
      `/api/crawl/${id}/issues${qs ? `?${qs}` : ''}`,
    );
  },

  getIssueCounts: (id: number) =>
    http<{ counts: Record<string, number> }>(`/api/crawl/${id}/issues/counts`),

  getSitemap: (id: number) =>
    http<string>(`/api/crawl/${id}/sitemap`, {}, 'text'),

  getHealth: (id: number) =>
    http<{
      score: number;
      breakdown: Record<string, number>;
      issues: number;
    }>(`/api/crawl/${id}/health`),

  export: (id: number, format: 'csv' | 'json' | 'xlsx', filePath?: string) =>
    http<{ content?: string; path?: string }>(`/api/crawl/${id}/export`, {
      method: 'POST',
      body: JSON.stringify({ format, filePath }),
    }),

  triggerIntegrations: (id: number) =>
    http<{ status: string; message: string }>(`/api/crawl/${id}/integrations`, { method: 'POST' }),

  callAi: (payload: { provider: string; model: string; prompt: string; apiKey: string }) =>
    http<{ content: string; model: string; usage?: Json }>('/api/ai', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getRuns: () => http<{ runs: CrawlRun[] }>('/api/runs'),
};

export type { CrawlUrl, CrawlIssue, CrawlLink, CrawlRun, IssueDefinition };
