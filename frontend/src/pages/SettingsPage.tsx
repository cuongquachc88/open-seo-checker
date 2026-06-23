import * as React from 'react';
import { Save, Trash2, Cog, Github, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useDocumentTitle } from '@/hooks/useApi';

interface ApiKeys {
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

const KEY_LABELS: Record<keyof ApiKeys, { name: string; group: 'ai' | 'data' | 'speed' }> = {
  openai: { name: 'OpenAI', group: 'ai' },
  anthropic: { name: 'Anthropic Claude', group: 'ai' },
  gemini: { name: 'Google Gemini', group: 'ai' },
  kimi: { name: 'Kimi (Moonshot)', group: 'ai' },
  minimax: { name: 'MiniMax', group: 'ai' },
  ollama: { name: 'Ollama (local)', group: 'ai' },
  ga4: { name: 'Google Analytics 4', group: 'data' },
  gsc: { name: 'Google Search Console', group: 'data' },
  psi: { name: 'Google PageSpeed Insights', group: 'speed' },
};

const KEY_ORDER: Array<keyof ApiKeys> = [
  'openai',
  'anthropic',
  'gemini',
  'kimi',
  'minimax',
  'ollama',
  'ga4',
  'gsc',
  'psi',
];

const STORAGE_KEY = 'oseo.apiKeys';

function load(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function save(values: Record<string, string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
}

export function SettingsPage(): React.ReactElement {
  useDocumentTitle('Settings');
  const [keys, setKeys] = React.useState<Record<string, string>>(() => load());

  const update = (k: keyof ApiKeys, v: string) =>
    setKeys((prev) => ({ ...prev, [k]: v }));

  const persist = () => {
    save(keys);
    toast.success('Settings saved', {
      description: 'API keys are stored locally in your browser only.',
    });
  };

  const clear = () => {
    setKeys({});
    save({});
    toast.success('Cleared all saved keys');
  };

  const grouped = React.useMemo(() => {
    const m: Record<string, Array<keyof ApiKeys>> = { ai: [], data: [], speed: [] };
    KEY_ORDER.forEach((k) => m[KEY_LABELS[k].group].push(k));
    return m;
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
            API keys are stored only in this browser via <code>localStorage</code>. They are sent
            directly to the respective provider when you trigger a crawl or call an AI prompt.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={clear}>
            <Trash2 className="h-4 w-4" /> Clear
          </Button>
          <Button variant="brand" onClick={persist}>
            <Save className="h-4 w-4" /> Save changes
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">AI providers</CardTitle>
          <CardDescription>Keys for reasoning, summarisation and text generation.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {grouped.ai.map((k) => (
              <KeyField
                key={k}
                id={k}
                label={KEY_LABELS[k].name}
                value={keys[k] ?? ''}
                onChange={(v) => update(k, v)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Search & analytics</CardTitle>
          <CardDescription>Pull live metrics for your crawled URLs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {grouped.data.map((k) => (
              <KeyField
                key={k}
                id={k}
                label={KEY_LABELS[k].name}
                value={keys[k] ?? ''}
                onChange={(v) => update(k, v)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Performance</CardTitle>
          <CardDescription>Use Google's PageSpeed API to attach Core Web Vitals to crawl results.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {grouped.speed.map((k) => (
              <KeyField
                key={k}
                id={k}
                label={KEY_LABELS[k].name}
                value={keys[k] ?? ''}
                onChange={(v) => update(k, v)}
              />
            ))}
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
            <li>• API keys never leave your browser except when used.</li>
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

function KeyField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs flex items-center justify-between">
        <span>{label}</span>
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
    </div>
  );
}
