import * as React from 'react';
import { Link } from 'react-router-dom';
import { GitCompareArrows, PlusCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { useApi, useDocumentTitle } from '@/hooks/useApi';
import { safeHostname } from '@/lib/utils';

export function ComparePage(): React.ReactElement {
  useDocumentTitle('Compare Runs');
  const runs = useApi(() => api.getRuns(), []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase font-semibold tracking-widest text-primary">Tools</p>
        <h1 className="text-2xl font-bold tracking-tight">Compare Runs</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Diff any pair of crawls to surface what changed. Open a run, switch to the Compare tab,
          and pick the baseline.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pick a run</CardTitle>
          <CardDescription>Each drill-down page lets you choose a second run to compare.</CardDescription>
        </CardHeader>
        <CardContent>
          {runs.loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (runs.data?.runs ?? []).length < 2 ? (
            <Empty
              icon={<GitCompareArrows className="h-5 w-5" />}
              title="Need at least 2 runs"
              description="Run another crawl to enable comparison."
              action={
                <Button asChild variant="brand">
                  <Link to="/crawl">
                    <PlusCircle className="h-4 w-4" /> Start another crawl
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y -mx-6">
              {(runs.data?.runs ?? []).map((run) => (
                <li key={run.id}>
                  <Link
                    to={`/crawl/${run.id}/compare`}
                    className="flex items-center gap-4 px-6 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                      <GitCompareArrows className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {safeHostname(run.startUrl)}
                      </div>
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
