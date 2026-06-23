import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Globe, Clock, BarChart3, Trash2, PlusCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/dashboard/StatCard';
import { useApi, useDocumentTitle } from '@/hooks/useApi';
import { formatNumber, safeHostname } from '@/lib/utils';
import type { CrawlRun } from '@/types/domain';

function statusTone(status: CrawlRun['status']) {
  switch (status) {
    case 'completed':
      return 'success' as const;
    case 'running':
      return 'info' as const;
    case 'failed':
      return 'destructive' as const;
    default:
      return 'muted' as const;
  }
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RunsPage(): React.ReactElement {
  useDocumentTitle('Crawl Runs');
  const navigate = useNavigate();
  const runs = useApi(() => api.getRuns(), []);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase font-semibold tracking-widest text-primary">History</p>
          <h1 className="text-2xl font-bold tracking-tight">Crawl Runs</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Browse, open and audit every crawl stored on this machine.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="brand">
            <Link to="/crawl">
              <PlusCircle className="h-4 w-4" /> New crawl
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Runs Stored"
          value={(runs.data?.runs ?? []).length}
          icon={Globe}
          accent="primary"
          loading={runs.loading && !runs.data}
        />
        <StatCard
          label="URLs Crawled"
          value={(runs.data?.runs ?? []).reduce((acc, r) => acc + r.urlsCrawled, 0)}
          icon={BarChart3}
          accent="info"
          loading={runs.loading && !runs.data}
        />
        <StatCard
          label="Errors"
          value={(runs.data?.runs ?? []).reduce((acc, r) => acc + r.errors, 0)}
          icon={Clock}
          accent="warning"
          loading={runs.loading && !runs.data}
        />
        <StatCard
          label="Last Run"
          value={runs.data?.runs?.[0] ? formatDate(runs.data.runs[0].startedAt) : '-'}
          icon={Clock}
          accent="muted"
          loading={runs.loading && !runs.data}
        />
      </section>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All runs</CardTitle>
          <CardDescription>Click any run to drill down.</CardDescription>
        </CardHeader>
        <CardContent>
          {runs.loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-md" />
              ))}
            </div>
          ) : runs.error ? (
            <Empty
              icon={<Globe className="h-5 w-5" />}
              title="Failed to load runs"
              description={runs.error.message}
              action={<Button onClick={runs.refetch}>Retry</Button>}
            />
          ) : (runs.data?.runs ?? []).length === 0 ? (
            <Empty
              icon={<Globe className="h-5 w-5" />}
              title="No runs yet"
              description="Crawl history will appear here once you run an audit."
              action={
                <Button asChild variant="brand">
                  <Link to="/crawl">
                    <PlusCircle className="h-4 w-4" /> Start a crawl
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="rounded-md border divide-y">
              {(runs.data?.runs ?? []).map((run) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => run.id != null && navigate(`/crawl/${run.id}`)}
                  className="w-full text-left px-4 py-3 flex items-center gap-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{safeHostname(run.startUrl)}</div>
                    <div className="text-xs text-muted-foreground truncate font-mono">
                      {run.startUrl}
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-5 text-xs text-muted-foreground tabular-nums">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(run.startedAt)}
                    </span>
                    <span>{formatNumber(run.urlsCrawled)} URLs</span>
                    <span>{run.errors} err</span>
                    <span>{run.redirects} redir</span>
                  </div>
                  <Badge variant={statusTone(run.status)}>{run.status}</Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        Tip: drop your log files into{' '}
        <code>crawls/</code> or use the CLI commands (compare, logs, health) for deeper analysis.
      </div>
      {/* Admin actions */}
      {false ? (
        <Button variant="destructive" size="icon">
          <Trash2 />
        </Button>
      ) : null}
    </div>
  );
}
