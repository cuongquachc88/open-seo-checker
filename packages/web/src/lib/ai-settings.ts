// Shared AI provider configuration for the dashboard. The active provider +
// model + API key reference is persisted in localStorage so any page
// (the Settings page and the AI Insights tab) reads from the same source
// of truth.

export type AIProviderId =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'kimi'
  | 'minimax'
  | 'ollama';

export interface AIProvider {
  id: AIProviderId;
  label: string;
  models: string[];
  authless?: boolean;
  apiKeyField: keyof ApiKeyMap;
}

// All keys (AI + data + speed) live under one localStorage bucket.
export interface ApiKeyMap {
  openai: string;
  anthropic: string;
  gemini: string;
  kimi: string;
  minimax: string;
  ollama: string;
  ga4: string;
  gsc: string;
  psi: string;
}

export const AI_PROVIDERS: AIProvider[] = [
  { id: 'openai', label: 'OpenAI',       apiKeyField: 'openai',   models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-3.5-turbo'] },
  { id: 'anthropic', label: 'Anthropic Claude', apiKeyField: 'anthropic', models: ['claude-3-5-sonnet', 'claude-3-haiku'] },
  { id: 'gemini', label: 'Google Gemini',       apiKeyField: 'gemini',    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'] },
  { id: 'kimi', label: 'Kimi (Moonshot)',      apiKeyField: 'kimi',      models: ['moonshot-v1-32k', 'moonshot-v1-128k'] },
  { id: 'minimax', label: 'MiniMax',            apiKeyField: 'minimax',   models: ['MiniMax-Text-01'] },
  { id: 'ollama', label: 'Ollama (local)',      apiKeyField: 'ollama',    models: ['llama3.2', 'qwen2.5'], authless: true },
];

export const AI_SETTINGS_KEY = 'oseo.aiSettings';
export const AI_KEYS_KEY = 'oseo.apiKeys';

export interface AISettings {
  provider: AIProviderId | null;
  model: string | null;
}

const DEFAULT_SETTINGS: AISettings = { provider: null, model: null };

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadAiSettings(): AISettings {
  return { ...DEFAULT_SETTINGS, ...readJson<AISettings>(AI_SETTINGS_KEY, DEFAULT_SETTINGS) };
}

export function saveAiSettings(next: AISettings): void {
  writeJson(AI_SETTINGS_KEY, next);
}

export function loadApiKeys(): Partial<ApiKeyMap> {
  return readJson<Partial<ApiKeyMap>>(AI_KEYS_KEY, {});
}

export function saveApiKeys(next: Partial<ApiKeyMap>): void {
  writeJson(AI_KEYS_KEY, next);
}

export interface ActiveAI {
  provider: AIProvider;
  model: string;
  apiKey: string;
  ready: boolean;
  reason?: string;
}

/**
 * Resolves the currently active AI provider / model / key from settings +
 * saved keys. Returns `ready: true` only when everything required is
 * available. For authless providers (Ollama), `apiKey` will be empty.
 */
export function resolveActiveAi(settings: AISettings, keys: Partial<ApiKeyMap>): ActiveAI | null {
  if (!settings.provider) return null;
  const provider = AI_PROVIDERS.find((p) => p.id === settings.provider);
  if (!provider) return null;

  const model = settings.model && provider.models.includes(settings.model)
    ? settings.model
    : provider.models[0];

  if (provider.authless) {
    return { provider, model, apiKey: '', ready: true };
  }

  const apiKey = keys[provider.apiKeyField] ?? '';
  if (!apiKey) {
    return {
      provider,
      model,
      apiKey: '',
      ready: false,
      reason: `No API key set for ${provider.label}. Add it in Settings.`,
    };
  }
  return { provider, model, apiKey, ready: true };
}

export function defaultModelFor(providerId: AIProviderId): string {
  const p = AI_PROVIDERS.find((x) => x.id === providerId);
  return p?.models[0] ?? '';
}
