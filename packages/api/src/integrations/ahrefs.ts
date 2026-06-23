export interface AhrefsMetrics {
  dr?: number;
  ur?: number;
  refDomains?: number;
  backlinks?: number;
}

export async function fetchAhrefsMetrics(url: string, apiKey: string): Promise<AhrefsMetrics> {
  if (!apiKey) {
    return {};
  }

  const placeholderUrl = `https://api.ahrefs.com/v3/site-explorer/overview?target=${encodeURIComponent(url)}`;

  try {
    const response = await fetch(placeholderUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
      return {
        dr: 0,
        ur: 0,
        refDomains: 0,
        backlinks: 0,
      };
    }
    return {
      dr: 0,
      ur: 0,
      refDomains: 0,
      backlinks: 0,
    };
  } catch {
    return {
      dr: 0,
      ur: 0,
      refDomains: 0,
      backlinks: 0,
    };
  }
}
