import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Save,
  Trash2,
  Cog,
  Github,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AI_PROVIDERS,
  AI_SETTINGS_KEY,
  defaultModelFor,
  loadAiSettings,
  loadApiKeys,
  saveAiSettings,
  saveApiKeys,
  type AIProviderId,
  type AISettings,
  type ApiKeyMap,
} from '@/lib/ai-settings';
import { useDocumentTitle } from '@/hooks/useApi';

type AIKey = 'openai' | 'anthropic' | 'gemini' | 'kimi' | 'minimax' | 'ollama';
type DataKey = 'ga4' | 'gsc' | 'psi';

const KEY_LABELS: Record<AIKey | DataKey, { name: string; group: 'ai' | 'data' | 'speed'; providerId?: AIProviderId }> = {
  openai: { name: 'OpenAI', group: 'ai', providerId: 'openai' },
  anthropic: { name: 'Anthropic Claude', group: 'ai', providerId: 'anthropic' },
  gemini: { name: 'Google Gemini', group: 'ai', providerId: 'gemini' },
  kimi: { name: 'Kimi (Moonshot)', group: 'ai', providerId: 'kimi' },
  minimax: { name: 'MiniMax', group: 'ai', providerId: 'minimax' },
  ollama: { name: 'Ollama (local)', group: 'ai', providerId: 'ollama' },
  ga4: { name: 'Google Analytics 4', group: 'data' },
  gsc: { name: 'Google Search Console', group: 'data' },
  psi: { name: 'Google PageSpeed Insights', group: 'speed' },
};

const KEY_ORDER: Array<AIKey | DataKey> = [
  'openai', 'anthropic', 'gemini', 'kimi', 'minimax', 'ollama',
  'ga4', 'gsc', 'psi',
];

const AI_KEYS: Array<AIKey> = ['openai', 'anthropic', 'gemini', 'kimi', 'minimax', 'ollama'];
const DATA_KEYS: Array<DataKey> = ['ga4', 'gsc', 'psi'];

export function SettingsPage(): React.ReactElement {
  useDocumentTitle('Settings');

  const [keys, setKeys] = React.useState<Partial<ApiKeyMap>>(() => loadApiKeys());
  const [settings, setSettings] = React.useState<AISettings>(() => loadAiSettings());
  const [dirtyKeys, setDirtyKeys] = React.useState<Partial<ApiKeyMap>>({});
  const [savedHelper, setSavedHelper] = React.useState<{ when: number; type: 'keys' | 'ai' } | null>(null);

  const updateKey = (k: AIKey | DataKey, v: string) => {
    setKeys((prev) => ({ ...prev, [k]: v }));
    setDirtyKeys((prev) => ({ ...prev, [k]: v } as Partial<ApiKeyMap>));
  };

  const updateProvider = (provider: AIProviderId) => {
    const id = provider;
    setSettings((prev) => ({
      ...prev,
      provider: id,
      model: defaultModelFor(id),
    }));
  };

  const updateModel = (model: string) => {
    setSettings((prev) => ({ ...prev, model }));
  };

  const saveKeys = () => {
    saveApiKeys(keys);
    setDirtyKeys({});
    setSavedHelper({ when: Date.now(), type: 'keys' });
    toast.success('API keys saved', {
      description: 'Stored locally in your browser. They never leave this device.',
    });
  };

  const saveAi = () => {
    saveAiSettings(settings);
    setSavedHelper({ when: Date.now(), type: 'ai' });
    toast.success('AI provider saved', {
      description: 'The Insights tab and any AI call will use this provider by default.',
    });
  };

  const clearAll = () => {
    setKeys({});
    setSettings({ provider: null, model: null });
    setDirtyKeys({});
    saveApiKeys({});
    saveAiSettings({ provider: null, model: null });
    toast.success('Cleared all saved keys and AI provider');
  };

  const savedProvider = settings.provider
    ? AI_PROVIDERS.find((p) => p.id === settings.provider)
    : null;
  const providerKey = savedProvider && !savedProvider.authless ? keys[savedProvider.apiKeyField] : '';

  const grouped = React.useMemo(() => {
    const map: Record<string, Array<AIKey | DataKey>> = { ai: [], data: [], speed: [] };
    KEY_ORDER.forEach((k) => map[KEY_LABELS[k].group].push(k));
    return map;
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase font-semibold tracking-widest text-primary">Configuration</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Cog className="h-5 w-5" /> Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            API keys and your default AI provider are stored only in this browser via{' '}
            <code>localStorage</code>. Nothing is uploaded and keys never touch our backend.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={clearAll}>
            <Trash2 className="h-4 w-4" /> Clear all
          </Button>
        </div>
      </header>

      {/* AI provider card — used by every page that talks to an LLM. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> Default AI provider
          </CardTitle>
          <CardDescription>
            Choose which model powers the AI Insights tab and any other AI calls.
            Set the matching API key below if your provider requires one.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select
                value={settings.provider ?? ''}
                onValueChange={(v) => updateProvider(v as AIProviderId)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an AI provider" />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        {p.label}
                        {p.authless ? <Badge variant="muted">local</Badge> : null}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Model</Label>
              <Select
                value={settings.model ?? ''}
                onValueChange={updateModel}
                disabled={!settings.provider}
              >
                <SelectTrigger>
                  <SelectValue placeholder={settings.provider ? 'Pick a model' : 'Pick a provider first'} />
                </SelectTrigger>
                <SelectContent>
                  {savedProvider?.models.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <AIStatusPill provider={savedProvider} apiKey={providerKey ?? ''} />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="link" asChild>
              <Link to="/insights">
                Open AI Insights <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
            <Button
              variant="brand"
              onClick={saveAi}
              disabled={!settings.provider}
            >
              <Save className="h-4 w-4" /> Save AI provider
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI provider keys */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" /> AI provider keys
          </CardTitle>
          <CardDescription>
            One key per AI provider. Set the one matching your default provider above.
            Ollama runs locally and does not require a key.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AI_KEYS.map((k) => {
              const providerId = KEY_LABELS[k].providerId;
              const provider = AI_PROVIDERS.find((p) => p.id === providerId);
              const isActive = settings.provider === providerId;
              return (
                <KeyField
                  key={k}
                  id={k}
                  label={KEY_LABELS[k].name}
                  value={keys[k] ?? ''}
                  onChange={(v) => updateKey(k, v)}
                  hint={
                    provider?.authless
                      ? 'Runs locally — no key needed.'
                      : isActive
                      ? 'Configured as the active provider.'
                      : undefined
                  }
                  active={isActive}
                />
              );
            })}
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="brand" onClick={saveKeys}>
              <Save className="h-4 w-4" /> Save API keys
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" /> Search & analytics keys
          </CardTitle>
          <CardDescription>
            Pull live metrics for the URLs in your crawls.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DATA_KEYS.map((k) => (
              <KeyField
                key={k}
                id={k}
                label={KEY_LABELS[k].name}
                value={keys[k] ?? ''}
                onChange={(v) => updateKey(k, v)}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="outline" onClick={saveKeys}>
              <Save className="h-4 w-4" /> Save data keys
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-success" /> Privacy & storage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li>• API keys never leave your browser except when sent to their provider.</li>
            <li>• Crawl data is stored in local SQLite databases under <code>crawls/</code>.</li>
            <li>• Exports are placed in <code>exports/</code> on disk.</li>
          </ul>
          <Separator className="my-4" />
          <div className="flex items-center justify-between">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2"
            >
              <Github className="h-4 w-4" />
              Source & license (MIT)
            </a>
            <Badge variant="success">Open source</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AIStatusPill({
  provider,
  apiKey,
}: {
  provider: (typeof AI_PROVIDERS)[number] | null | undefined;
  apiKey: string;
}) {
  if (!provider) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-md border bg-muted/30 px-3 py-2">
        <AlertTriangle className="h-3.5 w-3.5" />
        No AI provider selected. The AI Insights tab will show a “not configured” message until you pick one.
      </div>
    );
  }
  if (provider.authless) {
    return (
      <div className="flex items-center gap-2 text-xs text-success rounded-md border bg-success/10 px-3 py-2">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>{provider.label} is selected. No API key required — runs locally.</span>
      </div>
    );
  }
  if (!apiKey) {
    return (
      <div className="flex items-center gap-2 text-xs text-warning rounded-md border bg-warning/10 px-3 py-2">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>{provider.label} is selected but no API key is set yet. Add one below.</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-xs text-success rounded-md border bg-success/10 px-3 py-2">
      <CheckCircle2 className="h-3.5 w-3.5" />
      <span>{provider.label} is ready. The Insights tab will use this provider.</span>
    </div>
  );
}

function KeyField({
  id,
  label,
  value,
  onChange,
  hint,
  active,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  active?: boolean;
}) {
  return (
    <div
      className={
        'rounded-lg border bg-card p-3 space-y-1.5 transition-colors ' +
        (active ? 'border-primary/40 bg-primary/5' : '')
      }
    >
      <Label htmlFor={id} className="text-xs flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          {label}
          {active ? (
            <Badge variant="info" className="ml-1">
              Active
            </Badge>
          ) : null}
        </span>
        {value ? <Badge variant="success">set</Badge> : null}
      </Label>
      <Input
        id={id}
        type="password"
        value={value}
        placeholder="paste key…"
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
