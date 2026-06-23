import * as React from 'react';
import { Sparkles, Send, Bot, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty } from '@/components/ui/empty';
import { useDocumentTitle } from '@/hooks/useApi';

type Provider = 'openai' | 'anthropic' | 'gemini' | 'kimi' | 'minimax' | 'ollama';

const PROVIDERS: { id: Provider; label: string; models: string[]; authless?: boolean }[] = [
  { id: 'openai', label: 'OpenAI', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-3.5-turbo'] },
  { id: 'anthropic', label: 'Anthropic Claude', models: ['claude-3-5-sonnet', 'claude-3-haiku'] },
  { id: 'gemini', label: 'Google Gemini', models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'] },
  { id: 'kimi', label: 'Kimi (Moonshot)', models: ['moonshot-v1-32k', 'moonshot-v1-128k'] },
  { id: 'minimax', label: 'MiniMax', models: ['MiniMax-Text-01'] },
  { id: 'ollama', label: 'Ollama (local)', models: ['llama3.2', 'qwen2.5'], authless: true },
];

const PROMPT_TEMPLATES: { id: string; label: string; prompt: string }[] = [
  {
    id: 'top-issues',
    label: 'Top prioritised fixes',
    prompt:
      'Analyse the run summary and the top 10 issues. List the most impactful fixes in priority order, with one concrete action per fix.',
  },
  {
    id: 'llms-txt',
    label: 'llms.txt synopsis',
    prompt:
      'Generate a concise llms.txt-style overview of the website. Include a one-line description, key sections, and recommended next-step actions for AI agents.',
  },
  {
    id: 'eeat',
    label: 'E-E-A-T assessment',
    prompt:
      'Based on the crawl data, evaluate the website against Experience, Expertise, Authoritativeness and Trustworthiness signals and suggest improvements.',
  },
  {
    id: 'meta-rewrite',
    label: 'Meta description improvements',
    prompt:
      'Suggest improved meta descriptions for the top 5 highest-traffic pages. Keep each description under 160 characters and reflect the page content.',
  },
];

export function InsightsTab({ runId }: { runId: number }): React.ReactElement {
  useDocumentTitle(`AI Insights · Run #${runId}`);
  const [provider, setProvider] = React.useState<Provider>('openai');
  const [model, setModel] = React.useState('gpt-4o-mini');
  const [apiKey, setApiKey] = React.useState('');
  const [prompt, setPrompt] = React.useState(PROMPT_TEMPLATES[0].prompt);
  const [output, setOutput] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const available = PROVIDERS.find((p) => p.id === provider)!;

  const onProviderChange = (next: Provider) => {
    setProvider(next);
    const first = PROVIDERS.find((p) => p.id === next);
    setModel(first?.models[0] ?? '');
  };

  const submit = async () => {
    if (!prompt.trim()) {
      toast.error('Enter a prompt');
      return;
    }
    if (!available.authless && !apiKey) {
      toast.error('API key required for this provider');
      return;
    }
    setBusy(true);
    setOutput(null);
    try {
      const result = await api.callAi({
        provider,
        model,
        prompt,
        apiKey,
      });
      setOutput(result.content);
      toast.success('Insight generated');
    } catch (err) {
      toast.error('AI call failed', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> AI insights
          </CardTitle>
          <CardDescription>
            Generate strategic guidance using any of the supported models. Run summary is included
            automatically when the prompt needs context.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={(v) => onProviderChange(v as Provider)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {available.models.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>
              API key{' '}
              {available.authless ? <Badge variant="muted">local - not required</Badge> : null}
            </Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={available.authless ? 'n/a for local models' : 'sk-...'}
              autoComplete="off"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" /> Prompt templates
          </CardTitle>
          <CardDescription>Quick-start prompts tuned for SEO work.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            {PROMPT_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPrompt(t.prompt)}
                className="text-xs rounded-full border px-3 py-1.5 hover:bg-muted"
              >
                {t.label}
              </button>
            ))}
          </div>
          <Textarea
            rows={6}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What do you want the AI to do?"
          />
          <div className="mt-3 flex justify-end">
            <Button variant="brand" onClick={submit} disabled={busy}>
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Generating…
                </span>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Run prompt
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" /> Output
          </CardTitle>
        </CardHeader>
        <CardContent>
          {busy ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : output ? (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
              {output}
            </div>
          ) : (
            <Empty
              icon={<Bot className="h-5 w-5" />}
              title="No insights yet"
              description="Pick a provider, model and prompt to generate AI-powered guidance for this crawl."
            />
          )}
        </CardContent>
      </Card>

      <div className="text-[11px] text-muted-foreground">
        Run id: {runId}
      </div>
    </div>
  );
}
