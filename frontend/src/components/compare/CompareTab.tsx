import * as React from 'react';
import { Link } from 'react-router-dom';
import { GitCompareArrows, Plus, Minus, Equal } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty } from '@/components/ui/empty';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApi, useDocumentTitle } from '@/hooks/useApi';
import type { CrawlRun } from '@/types/domain';

interface DiffRow {
  added: string[];
  removed: string[];
  changed: { url: string; before: string; after: string }[];
}

function statusTone(status: CrawlRun['status']): 'success' | 'warning' | 'info' | 'destructive' {
  return status === 'completed' ? 'success' : status === 'running' ? 'info' : 'warning';
}

export function CompareTab({ currentRunId }: { currentRunId: number }): React.ReactElement {
  useDocumentTitle(`Compare · Run #${currentRunId}`);
  const runs = useApi(() => api.getRuns(), []);
  const others = React.useMemo(
    () => (runs.data?.runs ?? []).filter((r) => r.id !== currentRunId),
    [runs.data, currentRunId],
  );

  const [against, setAgainst] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!against && others.length > 0 && others[0].id != null) {
      setAgainst(others[0].id);
    }
  }, [others, against]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4 text-primary" /> Crawl comparison
          </CardTitle>
          <CardDescription>
            Diff this run against an earlier crawl to see what was added, removed or changed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {runs.loading ? (
            <Skeleton className="h-9 w-full" />
          ) : others.length === 0 ? (
            <Empty
              icon={<GitCompareArrows className="h-5 w-5" />}
              title="No other runs to compare against"
              description="Run another crawl to compare current state with prior data."
              action={
                <Button asChild variant="brand">
                  <Link to="/crawl">Start another crawl</Link>
                </Button>
              }
            />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[280px]">
                <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground mb-1">
                  Base run
                </p>
                <Badge variant="info">Run #{currentRunId}</Badge>
              </div>
              <div className="text-muted-foreground">vs</div>
              <div className="flex-1 min-w-[280px]">
                <p className="text-xs uppercase font-semibold tracking-wider text-muted-foreground mb-1">
                  Compare against
                </p>
                <Select
                  value={against != null ? String(against) : undefined}
                  onValueChange={(v) => setAgainst(parseInt(v, 10))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a run" />
                  </SelectTrigger>
                  <SelectContent>
                    {others.map((r) => (
                      <SelectItem key={r.id ?? 'unknown'} value={String(r.id)}>
                        Run #{r.id} · {r.startedAt.split('T')[0]} · {r.startUrl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {against ? (
        <CompareView currentRunId={currentRunId} baselineRunId={against} />
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Select a baseline run to view the diff.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CompareView({
  currentRunId,
  baselineRunId,
}: {
  currentRunId: number;
  baselineRunId: number;
}): React.ReactElement {
  const current = useApi(() => api.getUrls(currentRunId, { limit: 5000 }), [currentRunId]);
  const baseline = useApi(() => api.getUrls(baselineRunId, { limit: 5000 }), [baselineRunId]);

  if (current.loading || baseline.loading) {
    return <Skeleton className="h-72 w-full" />;
  }
  if (current.error || baseline.error) {
    return (
      <Empty
        icon={<GitCompareArrows className="h-5 w-5" />}
        title="Unable to compute diff"
        description={current.error?.message ?? baseline.error?.message ?? 'Unknown error'}
      />
    );
  }
  const a = new Map((current.data?.urls ?? []).map((u) => [u.normalizedAddress, u]));
  const b = new Map((baseline.data?.urls ?? []).map((u) => [u.normalizedAddress, u]));

  const added: string[] = [];
  const removed: string[] = [];
  const changed: { url: string; before: string; after: string }[] = [];

  a.forEach((u, k) => {
    if (!b.has(k)) {
      added.push(u.address);
    } else {
      const prev = b.get(k)!;
      if (prev.statusCode !== u.statusCode || prev.title1 !== u.title1) {
        const before = `[${prev.statusCode}] ${prev.title1 ?? ''}`;
        const after = `[${u.statusCode}] ${u.title1 ?? ''}`;
        changed.push({ url: u.address, before, after });
      }
    }
  });
  b.forEach((u, k) => {
    if (!a.has(k)) removed.push(u.address);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <DiffCard title="Added" icon={<Plus className="h-4 w-4" />} count={added.length} variant="success" urls={added} />
      <DiffCard title="Removed" icon={<Minus className="h-4 w-4" />} count={removed.length} variant="destructive" urls={removed} />
      <DiffCard title="Changed" icon={<Equal className="h-4 w-4" />} count={changed.length} variant="warning" urls={changed.map((c) => c.url)} beforeAfter={changed} />
    </div>
  );
}

function DiffCard({
  title,
  icon,
  count,
  variant,
  urls,
  beforeAfter,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  variant: 'success' | 'destructive' | 'warning';
  urls: string[];
  beforeAfter?: { url: string; before: string; after: string }[];
}) {
  const tone =
    variant === 'success' ? 'border-success/40 bg-success/5' :
    variant === 'destructive' ? 'border-destructive/40 bg-destructive/5' :
    'border-warning/40 bg-warning/5';
  return (
    <Card className={tone}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
          <Badge
            variant={
              variant === 'success' ? 'success' : variant === 'destructive' ? 'destructive' : 'warning'
            }
          >
            {count}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {urls.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No changes.</p>
        ) : (
          <ul className="space-y-1 text-sm max-h-72 overflow-auto">
            {urls.slice(0, 200).map((u, i) => (
              <li key={i} className="font-mono text-xs">
                {u}
                {beforeAfter && beforeAfter[i] ? (
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    <span className="text-destructive">{beforeAfter[i].before}</span>
                    {' → '}
                    <span className="text-success">{beforeAfter[i].after}</span>
                  </div>
                ) : null}
              </li>
            ))}
            {urls.length > 200 ? (
              <li className="text-xs text-muted-foreground italic">+ {urls.length - 200} more…</li>
            ) : null}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export { statusTone };
