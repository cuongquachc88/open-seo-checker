export interface MajesticMetrics {
  trustFlow?: number;
  citationFlow?: number;
  refDomains?: number;
  backlinks?: number;
}

export async function fetchMajesticMetrics(url: string, apiKey: string): Promise<MajesticMetrics> {
  if (!apiKey) {
    return {};
  }

  const placeholderUrl = `https://api.majestic.com/api/json?app_api_key=${encodeURIComponent(apiKey)}&cmd=GetBackLinkData&item=${encodeURIComponent(url)}`;

  try {
    const response = await fetch(placeholderUrl);
    if (!response.ok) {
      return {
        trustFlow: 0,
        citationFlow: 0,
        refDomains: 0,
        backlinks: 0,
      };
    }
    return {
      trustFlow: 0,
      citationFlow: 0,
      refDomains: 0,
      backlinks: 0,
    };
  } catch {
    return {
      trustFlow: 0,
      citationFlow: 0,
      refDomains: 0,
      backlinks: 0,
    };
  }
}
