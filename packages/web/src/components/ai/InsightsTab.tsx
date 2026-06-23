import * as React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Send, Bot, Wand2, AlertTriangle, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty } from '@/components/ui/empty';
import { useDocumentTitle } from '@/hooks/useApi';
import {
  AI_PROVIDERS,
  loadAiSettings,
  loadApiKeys,
  resolveActiveAi,
  saveAiSettings,
  type AIProviderId,
  type AISettings,
} from '@/lib/ai-settings';

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

  // Read latest settings each time the tab mounts so changes done in the
  // Settings page show up here immediately.
  const [settings, setSettings] = React.useState<AISettings>(() => loadAiSettings());
  const [keys, setKeys] = React.useState(() => loadApiKeys());
  const [prompt, setPrompt] = React.useState(PROMPT_TEMPLATES[0].prompt);
  const [output, setOutput] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const active = React.useMemo(() => resolveActiveAi(settings, keys), [settings, keys]);

  const submit = async () => {
    if (!active || !active.ready) return;
    if (!prompt.trim()) {
      toast.error('Enter a prompt');
      return;
    }
    setBusy(true);
    setOutput(null);
    try {
      const result = await api.callAi({
        provider: active.provider.id,
        model: active.model,
        prompt,
        apiKey: active.apiKey,
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

  if (!settings.provider) {
    return (
      <NotConfiguredCard
        title="AI provider not configured"
        description="Pick an AI provider in Settings to unlock the AI Insights tab."
        ctaLabel="Open Settings"
        reason="No provider has been set yet"
      />
    );
  }

  if (!active || !active.ready) {
    return (
      <NotConfiguredCard
        title="Missing API key"
        description={`Add the ${active?.provider.label ?? ''} API key in Settings to enable AI insights.`}
        ctaLabel="Open Settings"
        reason={active?.reason ?? 'No key set for this provider'}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> AI insights
          </CardTitle>
          <CardDescription className="flex items-center gap-2 flex-wrap">
            <span>
              Using <strong>{active.provider.label}</strong> · <code>{active.model}</code>.
            </span>
            <Button variant="link" size="sm" className="h-auto p-0" asChild>
              <Link to="/settings">
                <SettingsIcon className="h-3 w-3" /> Change provider
              </Link>
            </Button>
          </CardDescription>
        </CardHeader>
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
              description="Compose a prompt above and press Run prompt to generate AI-powered guidance for this crawl."
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

function NotConfiguredCard({
  title,
  description,
  ctaLabel,
  reason,
}: {
  title: string;
  description: string;
  ctaLabel: string;
  reason: string;
}) {
  return (
    <Card>
      <CardContent className="p-10 text-center space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
          <p className="text-xs text-muted-foreground/80">{reason}</p>
        </div>
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="brand" asChild>
            <Link to="/settings">
              <SettingsIcon className="h-4 w-4" /> {ctaLabel}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/crawl/${typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : ''}`}>
              Back to run
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Re-export for callers that still want the prompt templates.
export { PROMPT_TEMPLATES };
