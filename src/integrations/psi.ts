import type { PageSpeedData } from '../types/index.js';

export async function fetchPageSpeedData(
  url: string,
  apiKey: string,
  strategy: 'mobile' | 'desktop' = 'mobile'
): Promise<PageSpeedData> {
  const baseUrl = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
  const params = new URLSearchParams({
    url,
    key: apiKey,
    strategy,
    category: 'PERFORMANCE',
  });

  const requestUrl = `${baseUrl}?${params.toString()}`;

  try {
    const response = await fetch(requestUrl);

    if (!response.ok) {
      const text = await response.text();
      return {
        url,
        strategy,
        opportunities: [],
        diagnostics: [],
        error: `PageSpeed API error: ${response.status} ${text}`,
      };
    }

    const data = (await response.json()) as {
      lighthouseResult?: {
        categories?: {
          performance?: { score?: number };
        };
        audits?: Record<
          string,
          {
            numericValue?: number;
            displayValue?: string;
            details?: {
              type?: string;
              overallSavingsMs?: number;
            };
          }
        >;
      };
      loadingExperience?: {
        metrics?: {
          LARGEST_CONTENTFUL_PAINT_MS?: { percentile?: number };
          INTERACTION_TO_NEXT_PAINT_MS?: { percentile?: number };
          CUMULATIVE_LAYOUT_SHIFT_SCORE?: { percentile?: number };
        };
        originLoadingExperience?: {
          metrics?: {
            LARGEST_CONTENTFUL_PAINT_MS?: { percentile?: number };
            INTERACTION_TO_NEXT_PAINT_MS?: { percentile?: number };
            CUMULATIVE_LAYOUT_SHIFT_SCORE?: { percentile?: number };
          };
        };
      };
    };

    const lighthouse = data.lighthouseResult;
    const audits = lighthouse?.audits ?? {};
    const loadingExperience = data.loadingExperience;
    const originExperience = loadingExperience?.originLoadingExperience;

    const getMetric = (name: string): number | undefined => {
      const value = audits[name]?.numericValue;
      return typeof value === 'number' ? value : undefined;
    };

    const getCruxMetric = (
      metric: 'LARGEST_CONTENTFUL_PAINT_MS' | 'INTERACTION_TO_NEXT_PAINT_MS' | 'CUMULATIVE_LAYOUT_SHIFT_SCORE'
    ): number | undefined => {
      const value = loadingExperience?.metrics?.[metric]?.percentile;
      return typeof value === 'number' ? value : undefined;
    };

    const getOriginCruxMetric = (
      metric: 'LARGEST_CONTENTFUL_PAINT_MS' | 'INTERACTION_TO_NEXT_PAINT_MS' | 'CUMULATIVE_LAYOUT_SHIFT_SCORE'
    ): number | undefined => {
      const value = originExperience?.metrics?.[metric]?.percentile;
      return typeof value === 'number' ? value : undefined;
    };

    const performanceScore = lighthouse?.categories?.performance?.score;

    const opportunities: string[] = [];
    const diagnostics: string[] = [];

    for (const [key, audit] of Object.entries(audits)) {
      if (audit.details?.overallSavingsMs && audit.details.overallSavingsMs > 0) {
        opportunities.push(`${key}: save ${audit.details.overallSavingsMs.toFixed(0)}ms`);
      } else if (audit.displayValue && key !== 'first-contentful-paint' && key !== 'largest-contentful-paint') {
        diagnostics.push(`${key}: ${audit.displayValue}`);
      }
    }

    return {
      url,
      strategy,
      performanceScore: typeof performanceScore === 'number' ? performanceScore * 100 : undefined,
      firstContentfulPaint: getMetric('first-contentful-paint'),
      largestContentfulPaint: getMetric('largest-contentful-paint'),
      timeToInteractive: getMetric('interactive'),
      totalBlockingTime: getMetric('total-blocking-time'),
      cumulativeLayoutShift: getMetric('cumulative-layout-shift'),
      speedIndex: getMetric('speed-index'),
      cruxLcp: getCruxMetric('LARGEST_CONTENTFUL_PAINT_MS'),
      cruxInp: getCruxMetric('INTERACTION_TO_NEXT_PAINT_MS'),
      cruxCls: getCruxMetric('CUMULATIVE_LAYOUT_SHIFT_SCORE'),
      cruxOriginLcp: getOriginCruxMetric('LARGEST_CONTENTFUL_PAINT_MS'),
      cruxOriginInp: getOriginCruxMetric('INTERACTION_TO_NEXT_PAINT_MS'),
      cruxOriginCls: getOriginCruxMetric('CUMULATIVE_LAYOUT_SHIFT_SCORE'),
      opportunities,
      diagnostics,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      url,
      strategy,
      opportunities: [],
      diagnostics: [],
      error: `Failed to fetch PageSpeed data: ${message}`,
    };
  }
}
