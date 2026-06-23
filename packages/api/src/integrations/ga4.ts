import type { GoogleTokenResponse } from './oauth.js';

export interface Ga4Metrics {
  sessions: number;
  users: number;
  pageviews: number;
  bounceRate?: number;
  conversions?: number;
}

export interface Ga4FetchOptions {
  startDate?: string;
  endDate?: string;
  metrics?: string[];
}

function getDefaultDateRange(): { startDate: string; endDate: string } {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

export async function fetchGa4Data(
  propertyId: string,
  accessToken: string,
  options: Ga4FetchOptions = {}
): Promise<Record<string, Ga4Metrics>> {
  const { startDate, endDate } = getDefaultDateRange();
  const metrics = options.metrics ?? ['sessions', 'users', 'screenPageViews', 'bounceRate', 'keyEvents'];

  const body = {
    dateRanges: [
      {
        startDate: options.startDate ?? startDate,
        endDate: options.endDate ?? endDate,
      },
    ],
    dimensions: [{ name: 'pagePath' }],
    metrics: metrics.map(name => ({ name })),
  };

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`;

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
      throw new Error(`GA4 API error: ${response.status} ${text}`);
    }

    const data = (await response.json()) as {
      dimensionHeaders?: { name: string }[];
      metricHeaders?: { name: string }[];
      rows?: {
        dimensionValues?: { value: string }[];
        metricValues?: { value: string }[];
      }[];
    };

    const result: Record<string, Ga4Metrics> = {};

    if (!data.rows || data.rows.length === 0) {
      return result;
    }

    const metricNames = data.metricHeaders?.map(h => h.name) ?? metrics;

    for (const row of data.rows) {
      const pagePath = row.dimensionValues?.[0]?.value ?? '/';
      const values = row.metricValues?.map(v => parseFloat(v.value)) ?? [];

      const metricsMap: Record<string, number> = {};
      for (let i = 0; i < metricNames.length; i++) {
        metricsMap[metricNames[i]] = values[i] ?? 0;
      }

      result[pagePath] = {
        sessions: metricsMap['sessions'] ?? 0,
        users: metricsMap['users'] ?? 0,
        pageviews: metricsMap['screenPageViews'] ?? metricsMap['pageviews'] ?? 0,
        bounceRate: metricsMap['bounceRate'] ?? undefined,
        conversions: metricsMap['keyEvents'] ?? metricsMap['conversions'] ?? undefined,
      };
    }

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch GA4 data: ${message}`);
  }
}

export function exchangeGa4CodeForTokens(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  code: string
): Promise<GoogleTokenResponse> {
  return import('./oauth.js').then(({ exchangeCodeForTokens }) =>
    exchangeCodeForTokens(clientId, clientSecret, redirectUri, code)
  );
}
