import { Agent, interceptors, request, setGlobalDispatcher } from 'undici';
import { Readable } from 'stream';
import { encodeUrlAddress, normalizeUrl } from '../utils/url.js';
import type { CrawlConfig, FetchResult } from '../types/index.js';

// Configure undici agent with reasonable defaults
const agent = new Agent({
  connect: {
    rejectUnauthorized: true,
  },
  bodyTimeout: 60000,
  headersTimeout: 60000,
}).compose(interceptors.redirect({ maxRedirections: 0 }));
setGlobalDispatcher(agent);

type FollowRedirects = CrawlConfig['followRedirects'];

export async function fetchUrl(
  url: string,
  config: CrawlConfig,
  redirectChain: string[] = []
): Promise<FetchResult> {
  const normalizedUrl = normalizeUrl(url);
  const urlEncodedAddress = encodeUrlAddress(normalizedUrl);
  const startTime = Date.now();

  if (redirectChain.length > 10) {
    return createErrorResult(normalizedUrl, urlEncodedAddress, 'redirect loop', 'error');
  }

  return await fetchSingleHop(normalizedUrl, urlEncodedAddress, config, redirectChain, startTime);
}

async function fetchSingleHop(
  currentUrl: string,
  urlEncodedAddress: string,
  config: CrawlConfig,
  redirectChain: string[],
  startTime: number,
): Promise<FetchResult> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': config.userAgent || 'OpenSEOCrawler/1.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };

    if (config.customHeaders) {
      for (const [key, value] of Object.entries(config.customHeaders)) {
        headers[key] = value;
      }
    }

    const response = await request(encodeUrlAddress(currentUrl), {
      method: 'GET',
      headers,
    });

    const responseTime = (Date.now() - startTime) / 1000;
    const statusCode = response.statusCode;
    const statusText = getStatusText(statusCode);
    const responseHeaders = Object.fromEntries(
      Object.entries(response.headers).map(([key, value]) => [key, String(Array.isArray(value) ? value[0] : value)])
    );

    const contentType = responseHeaders['content-type']?.split(';')[0].trim() || undefined;
    const contentLength = responseHeaders['content-length'] ? parseInt(responseHeaders['content-length'], 10) : undefined;
    const lastModified = responseHeaders['last-modified'];
    const httpVersion = responseHeaders['http-version'] || 'HTTP/1.1';

    // Handle redirects manually
    if (statusCode >= 300 && statusCode < 400 && responseHeaders['location']) {
      const redirectUrl = normalizeUrl(responseHeaders['location'], currentUrl);
      const expandedChain = [...redirectChain, currentUrl];

      if (redirectChain.includes(redirectUrl) || expandedChain.includes(redirectUrl)) {
        return createErrorResult(currentUrl, urlEncodedAddress, 'redirect loop', 'error', expandedChain, responseTime);
      }

      if (!config.followRedirects) {
        // Surface the 3xx verbatim so the engine can record it without chasing.
        return {
          url: currentUrl,
          normalizedUrl: currentUrl,
          statusCode,
          status: statusText,
          statusCategory: 'redirect',
          headers: responseHeaders,
          contentType,
          contentLength: 0,
          transferredSize: 0,
          body: '',
          responseTime,
          lastModified,
          httpVersion,
          urlEncodedAddress,
          redirectUrl,
          redirectType: 'http',
          redirectChain: expandedChain,
        };
      }

      // Follow the redirect transparently. After the chain unwinds we attach
      // the originating chain onto the FINAL hop so the final CrawlUrl record
      // carries the full redirect history.
      const next = await fetchSingleHop(redirectUrl, urlEncodedAddress, config, expandedChain, startTime);
      if (!next.redirectChain || next.redirectChain.length === 0) {
        next.redirectChain = expandedChain;
      }
      // The body, status, headers and content of `next` describe the final URL.
      // Keep the final normalized URL but mark the original URL via the
      // redirectChain so the engine can store metadata if needed.
      next.urlEncodedAddress = urlEncodedAddress;
      return next;
    }

    const body = await readBody(response.body);
    const transferredSize = Buffer.byteLength(body);
    const statusCategory = getStatusCategory(statusCode);

    return {
      url: currentUrl,
      normalizedUrl: currentUrl,
      statusCode,
      status: statusText,
      statusCategory,
      headers: responseHeaders,
      contentType,
      contentLength,
      transferredSize,
      body,
      responseTime,
      lastModified,
      httpVersion,
      urlEncodedAddress,
    };
  } catch (err) {
    const responseTime = (Date.now() - startTime) / 1000;
    const error = err instanceof Error ? err.message : String(err);
    let errorType: FetchResult['errorType'] = 'error';

    if (error.includes('timeout')) {
      errorType = 'timeout';
    } else if (error.includes('ECONNREFUSED') || error.includes('Connection refused')) {
      errorType = 'refused';
    } else if (error.includes('ENOTFOUND') || error.includes('DNS')) {
      errorType = 'dns';
    } else if (error.includes('EINVAL') || error.includes('Invalid URL')) {
      errorType = 'malformed';
    }

    return createErrorResult(currentUrl, urlEncodedAddress, error, errorType, redirectChain, responseTime);
  }
}

async function readBody(body: Readable | null | unknown): Promise<string> {
  if (!body) return '';

  const chunks: Buffer[] = [];
  for await (const chunk of body as Readable) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf-8');
}

function createErrorResult(
  url: string,
  urlEncodedAddress: string,
  error: string,
  errorType: FetchResult['errorType'],
  redirectChain: string[] = [],
  responseTime = 0
): FetchResult {
  const statusCategory = errorType === 'timeout' ? 'no-response' : 'client-error';
  return {
    url,
    normalizedUrl: url,
    statusCode: errorType === 'timeout' ? 0 : 0,
    status: errorType === 'timeout' ? 'No Response' : 'Error',
    statusCategory,
    headers: {},
    contentLength: 0,
    transferredSize: 0,
    body: '',
    responseTime,
    httpVersion: 'HTTP/1.1',
    urlEncodedAddress,
    error,
    errorType,
    redirectChain,
  };
}

function getStatusText(code: number): string {
  const texts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    303: 'See Other',
    304: 'Not Modified',
    307: 'Temporary Redirect',
    308: 'Permanent Redirect',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    410: 'Gone',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };
  return texts[code] || 'Unknown';
}

function getStatusCategory(code: number): FetchResult['statusCategory'] {
  if (code >= 200 && code < 300) return 'success';
  if (code >= 300 && code < 400) return 'redirect';
  if (code >= 400 && code < 500) return 'client-error';
  if (code >= 500 && code < 600) return 'server-error';
  return 'no-response';
}

export function buildUrlFromRedirect(url: string, redirectChain: string[], followRedirects: boolean): { finalUrl: string; chain: string[] } | null {
  if (!followRedirects) return null;

  const last = redirectChain[redirectChain.length - 1];
  if (!last) return null;

  return {
    finalUrl: last,
    chain: redirectChain,
  };
}
