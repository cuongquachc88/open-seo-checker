import type { GoogleTokenResponse } from './oauth.js';

export interface GscMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscFetchOptions {
  startDate?: string;
  endDate?: string;
  rowLimit?: number;
}

function getDefaultDateRange(): { startDate: string; endDate: string } {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

export async function fetchGscData(
  siteUrl: string,
  accessToken: string,
  options: GscFetchOptions = {}
): Promise<Record<string, GscMetrics>> {
  const { startDate, endDate } = getDefaultDateRange();

  const body = {
    startDate: options.startDate ?? startDate,
    endDate: options.endDate ?? endDate,
    dimensions: ['page'],
    rowLimit: options.rowLimit ?? 25000,
  };

  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GSC API error: ${response.status} ${text}`);
    }

    const data = (await response.json()) as {
      rows?: {
        keys?: string[];
        clicks?: number;
        impressions?: number;
        ctr?: number;
        position?: number;
      }[];
    };

    const result: Record<string, GscMetrics> = {};

    if (!data.rows || data.rows.length === 0) {
      return result;
    }

    for (const row of data.rows) {
      const pageUrl = row.keys?.[0] ?? '';
      if (!pageUrl) continue;

      result[pageUrl] = {
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        position: row.position ?? 0,
      };
    }

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch GSC data: ${message}`);
  }
}

export function exchangeGscCodeForTokens(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  code: string
): Promise<GoogleTokenResponse> {
  return import('./oauth.js').then(({ exchangeCodeForTokens }) =>
    exchangeCodeForTokens(clientId, clientSecret, redirectUri, code)
  );
}
