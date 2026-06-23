import crypto from 'crypto';

export function normalizeUrl(url: string, baseUrl?: string): string {
  if (!url || url.trim() === '') return '';

  let resolved: URL;
  try {
    resolved = new URL(url, baseUrl);
  } catch {
    return '';
  }

  // Remove fragment
  resolved.hash = '';

  // Decode and re-encode path to avoid double encoding
  try {
    resolved.pathname = decodeURIComponent(resolved.pathname);
  } catch {
    // Keep as is if decoding fails
  }

  // Lowercase hostname
  resolved.hostname = resolved.hostname.toLowerCase();

  // Remove default ports
  if ((resolved.protocol === 'http:' && resolved.port === '80') ||
      (resolved.protocol === 'https:' && resolved.port === '443')) {
    resolved.port = '';
  }

  return resolved.href;
}

export function encodeUrlAddress(url: string): string {
  try {
    const parsed = new URL(url);
    // Encode non-ASCII characters in path
    parsed.pathname = parsed.pathname
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/');
    // Search params already encoded by URL
    return parsed.href;
  } catch {
    return url;
  }
}

export function isSameDomain(url1: string, url2: string): boolean {
  try {
    const a = new URL(url1);
    const b = new URL(url2);
    return a.hostname.toLowerCase() === b.hostname.toLowerCase();
  } catch {
    return false;
  }
}

export function isSameSubdomain(url1: string, url2: string): boolean {
  try {
    const a = new URL(url1);
    const b = new URL(url2);
    return a.hostname.toLowerCase() === b.hostname.toLowerCase();
  } catch {
    return false;
  }
}

export function isInternalUrl(url: string, startUrl: string, allowSubdomains: boolean): boolean {
  try {
    const start = new URL(startUrl);
    const target = new URL(url);

    const startHost = start.hostname.toLowerCase();
    const targetHost = target.hostname.toLowerCase();

    if (startHost === targetHost) return true;

    if (allowSubdomains) {
      return targetHost === startHost ||
             targetHost.endsWith('.' + startHost);
    }

    return false;
  } catch {
    return false;
  }
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function getUrlPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}

export function getUrlExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
    return match ? match[1].toLowerCase() : '';
  } catch {
    return '';
  }
}

export function getContentTypeFromExtension(url: string): string {
  const ext = getUrlExtension(url);
  const map: Record<string, string> = {
    html: 'text/html',
    htm: 'text/html',
    js: 'application/javascript',
    mjs: 'application/javascript',
    css: 'text/css',
    json: 'application/json',
    xml: 'application/xml',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    ico: 'image/x-icon',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    otf: 'font/otf',
  };
  return map[ext] || 'unknown';
}

export function getUrlDepth(url: string, startUrl: string): number {
  // Number of clicks from start URL (simplified)
  return 0;
}

export function getFolderDepth(url: string): number {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split('/').filter(Boolean);
    return segments.length;
  } catch {
    return 0;
  }
}

export function removeQueryString(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    return parsed.href;
  } catch {
    return url;
  }
}

export function getQueryParams(url: string): Record<string, string> {
  try {
    const params: Record<string, string> = {};
    const searchParams = new URL(url).searchParams;
    for (const [key, value] of searchParams) {
      params[key] = value;
    }
    return params;
  } catch {
    return {};
  }
}

export function hasUrlParameter(url: string): boolean {
  try {
    return new URL(url).search.length > 0;
  } catch {
    return false;
  }
}

export function hasInternalSearchParameter(url: string): boolean {
  const searchParams = ['s', 'search', 'q', 'query', 'keyword', 'terms', 'find'];
  try {
    const params = new URL(url).searchParams;
    for (const key of params.keys()) {
      if (searchParams.includes(key.toLowerCase())) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function hasGaTrackingParams(url: string): boolean {
  try {
    const params = new URL(url).searchParams;
    for (const key of params.keys()) {
      if (key.startsWith('utm_') || key === '_ga' || key === '_gl') return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function hasNonAsciiCharacters(url: string): boolean {
  return /[^\x00-\x7F]/.test(url);
}

export function hasUnderscore(url: string): boolean {
  try {
    return new URL(url).pathname.includes('_');
  } catch {
    return false;
  }
}

export function hasUppercase(url: string): boolean {
  try {
    return /[A-Z]/.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

export function hasMultipleSlashes(url: string): boolean {
  try {
    return /\/\/+/.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

export function hasRepetitivePath(url: string): boolean {
  try {
    const segments = new URL(url).pathname.split('/').filter(Boolean);
    const seen = new Set<string>();
    for (const segment of segments) {
      if (seen.has(segment)) return true;
      seen.add(segment);
    }
    return false;
  } catch {
    return false;
  }
}

export function hasSpace(url: string): boolean {
  try {
    return new URL(url).pathname.includes(' ') || new URL(url).pathname.includes('%20');
  } catch {
    return false;
  }
}

export function isOverLength(url: string, max = 115): boolean {
  return url.length > max;
}

export function getCanonicalUrl(url: string, canonical: string | undefined): string | undefined {
  if (!canonical) return undefined;
  try {
    return normalizeUrl(canonical, url);
  } catch {
    return canonical;
  }
}

export function resolveRelativeUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

export function md5Hash(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex');
}

export function stripProtocol(url: string): string {
  try {
    return new URL(url).hostname + new URL(url).pathname + new URL(url).search;
  } catch {
    return url;
  }
}

export function isProtocolRelative(url: string): boolean {
  return url.startsWith('//');
}

export function isMailtoOrTel(url: string): boolean {
  return /^mailto:|^tel:|^javascript:|^data:|^#/.test(url);
}

export function isHttp(url: string): boolean {
  try {
    return new URL(url).protocol === 'http:';
  } catch {
    return false;
  }
}

export function isHttps(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function extractProtocol(url: string): string {
  try {
    return new URL(url).protocol.replace(':', '');
  } catch {
    return '';
  }
}

export function matchRegexPatterns(url: string, patterns: string[]): boolean {
  if (!patterns.length) return false;
  return patterns.some(pattern => {
    try {
      return new RegExp(pattern).test(url);
    } catch {
      return url.includes(pattern);
    }
  });
}

export function shouldCrawlFile(url: string, includeImages: boolean, includeCss: boolean, includeJs: boolean, includePdfs: boolean): boolean {
  const contentType = getContentTypeFromExtension(url);
  if (contentType === 'text/html') return true;
  if (contentType.startsWith('image/') && includeImages) return true;
  if (contentType === 'text/css' && includeCss) return true;
  if (contentType === 'application/javascript' && includeJs) return true;
  if (contentType === 'application/pdf' && includePdfs) return true;
  return contentType === 'unknown';
}

export function isHtmlUrl(url: string): boolean {
  const ext = getUrlExtension(url);
  return ext === '' || ext === 'html' || ext === 'htm' || ext === 'php' || ext === 'aspx' || ext === 'jsp';
}

export function isImageUrl(url: string): boolean {
  const ext = getUrlExtension(url);
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'avif'].includes(ext);
}
