export interface MozMetrics {
  da?: number;
  pa?: number;
  spamScore?: number;
  backlinks?: number;
}

export async function fetchMozMetrics(url: string, apiKey: string): Promise<MozMetrics> {
  if (!apiKey) {
    return {};
  }

  const placeholderUrl = `https://lsapi.seomoz.com/v2/url_metrics?target=${encodeURIComponent(url)}`;

  try {
    const response = await fetch(placeholderUrl, {
      headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}` },
    });
    if (!response.ok) {
      return {
        da: 0,
        pa: 0,
        spamScore: 0,
        backlinks: 0,
      };
    }
    return {
      da: 0,
      pa: 0,
      spamScore: 0,
      backlinks: 0,
    };
  } catch {
    return {
      da: 0,
      pa: 0,
      spamScore: 0,
      backlinks: 0,
    };
  }
}
