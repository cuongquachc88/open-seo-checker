import * as React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, PlusCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { useApi, useDocumentTitle } from '@/hooks/useApi';
import { safeHostname } from '@/lib/utils';

export function InsightsPage(): React.ReactElement {
  useDocumentTitle('AI Insights');
  const runs = useApi(() => api.getRuns(), []);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase font-semibold tracking-widest text-primary">Tools</p>
        <h1 className="text-2xl font-bold tracking-tight">AI Insights</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Generate strategic guidance for any run using Kimi, MiniMax, OpenAI, Anthropic, Gemini or local Ollama.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pick a run</CardTitle>
          <CardDescription>
            Inside a run, the "AI Insights" tab auto-injects context like top issues and score.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {runs.loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (runs.data?.runs ?? []).length === 0 ? (
            <Empty
              icon={<Sparkles className="h-5 w-5" />}
              title="No runs to analyse yet"
              description="Crawl a site first, then return here to generate insights."
              action={
                <Button asChild variant="brand">
                  <Link to="/crawl">
                    <PlusCircle className="h-4 w-4" /> Start a crawl
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y -mx-6">
              {(runs.data?.runs ?? []).map((run) => (
                <li key={run.id}>
                  <Link
                    to={`/crawl/${run.id}/insights`}
                    className="flex items-center gap-4 px-6 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{safeHostname(run.startUrl)}</div>
                      <div className="text-xs text-muted-foreground truncate font-mono">
                        {run.startUrl}
                      </div>
                    </div>
                    <Badge variant="info">Run #{run.id}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
