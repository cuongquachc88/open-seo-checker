import fs from 'fs';
import path from 'path';
import os from 'os';

export interface GoogleTokenSet {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: number;
  scope?: string;
}

export interface TokenStore {
  ga4?: GoogleTokenSet;
  gsc?: GoogleTokenSet;
  psi?: GoogleTokenSet;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

const TOKEN_DIR = path.join(os.homedir(), '.open-seo-checker');
const TOKEN_PATH = path.join(TOKEN_DIR, 'tokens.json');
const FALLBACK_TOKEN_PATH = path.join(process.cwd(), 'tokens.json');

export function getTokenStorePath(): string {
  try {
    if (!fs.existsSync(TOKEN_DIR)) {
      fs.mkdirSync(TOKEN_DIR, { recursive: true });
    }
    return TOKEN_PATH;
  } catch {
    return FALLBACK_TOKEN_PATH;
  }
}

export function loadTokens(): TokenStore {
  const tokenPath = getTokenStorePath();
  try {
    if (!fs.existsSync(tokenPath)) {
      return {};
    }
    const raw = fs.readFileSync(tokenPath, 'utf-8');
    return JSON.parse(raw) as TokenStore;
  } catch {
    return {};
  }
}

export function saveTokens(tokens: TokenStore): void {
  const tokenPath = getTokenStorePath();
  try {
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  } catch (err) {
    console.warn('Failed to save OAuth tokens:', err instanceof Error ? err.message : String(err));
  }
}

export function getApiScopes(apiName: 'ga4' | 'gsc' | 'psi'): string[] {
  switch (apiName) {
    case 'ga4':
      return ['https://www.googleapis.com/auth/analytics.readonly'];
    case 'gsc':
      return ['https://www.googleapis.com/auth/webmasters.readonly'];
    case 'psi':
      return ['https://www.googleapis.com/auth/pagespeedonline'];
    default:
      return [];
  }
}

export function buildGoogleConsentUrl(
  clientId: string,
  redirectUri: string,
  scopes: string[],
  state?: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  });
  if (state) {
    params.set('state', state);
  }
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  code: string
): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code,
    }).toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${text}`);
  }

  return (await response.json()) as GoogleTokenResponse;
}

export function storeTokenResponse(
  apiName: 'ga4' | 'gsc' | 'psi',
  tokenResponse: GoogleTokenResponse
): GoogleTokenSet {
  const tokens = loadTokens();
  const expiresAt = tokenResponse.expires_in
    ? Date.now() + tokenResponse.expires_in * 1000
    : undefined;

  const tokenSet: GoogleTokenSet = {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    tokenType: tokenResponse.token_type,
    expiresAt,
    scope: tokenResponse.scope,
  };

  tokens[apiName] = tokenSet;
  saveTokens(tokens);
  return tokenSet;
}

export async function getValidAccessToken(
  apiName: 'ga4' | 'gsc' | 'psi',
  clientId?: string,
  clientSecret?: string
): Promise<string | undefined> {
  const tokens = loadTokens();
  const tokenSet = tokens[apiName];

  if (!tokenSet) {
    return undefined;
  }

  if (tokenSet.expiresAt && Date.now() < tokenSet.expiresAt - 60000) {
    return tokenSet.accessToken;
  }

  if (tokenSet.refreshToken && clientId && clientSecret) {
    try {
      const refreshed = await refreshAccessToken(clientId, clientSecret, tokenSet.refreshToken);
      const updated = storeTokenResponse(apiName, refreshed);
      return updated.accessToken;
    } catch (err) {
      console.warn(`Failed to refresh ${apiName} token:`, err instanceof Error ? err.message : String(err));
      return undefined;
    }
  }

  return tokenSet.accessToken;
}
