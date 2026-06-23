import * as React from 'react';
import { Link } from 'react-router-dom';
import { Bug, Filter, ChevronDown, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { CenteredLoader } from '@/components/ui/spinner';
import { cn, truncate } from '@/lib/utils';
import { useApi, useDocumentTitle } from '@/hooks/useApi';
import type { CrawlIssue } from '@/types/domain';

const PRIORITY_ORDER: CrawlIssue['priority'][] = [
  'critical',
  'high',
  'medium',
  'low',
  'opportunity',
];

const PRIORITY_VARIANT: Record<
  CrawlIssue['priority'],
  'destructive' | 'danger' | 'warning' | 'info' | 'success'
> = {
  critical: 'destructive',
  high: 'danger',
  medium: 'warning',
  low: 'info',
  opportunity: 'success',
};

export function IssuesTab({ runId }: { runId: number }): React.ReactElement {
  useDocumentTitle(`Issues · Run #${runId}`);
  const [priority, setPriority] = React.useState<string>('all');
  const [search, setSearch] = React.useState('');

  const issues = useApi(
    () => api.getIssues(runId, undefined, priority === 'all' ? undefined : priority),
    [runId, priority],
  );

  const filtered = React.useMemo(() => {
    const all = issues.data?.issues ?? [];
    if (!search.trim()) return all;
    const term = search.toLowerCase();
    return all.filter((it) =>
      [it.title, it.type, it.category, it.url, it.description]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(term)),
    );
  }, [issues.data, search]);

  const grouped = React.useMemo(() => {
    const m = new Map<string, CrawlIssue[]>();
    filtered.forEach((it) => {
      const key = `${it.category}::${it.type}`;
      const arr = m.get(key) ?? [];
      arr.push(it);
      m.set(key, arr);
    });
    return Array.from(m.entries()).sort((a, b) => {
      const ap = PRIORITY_ORDER.indexOf(a[1][0]?.priority ?? 'low');
      const bp = PRIORITY_ORDER.indexOf(b[1][0]?.priority ?? 'low');
      return ap - bp;
    });
  }, [filtered]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search issues, URLs, descriptions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {PRIORITY_ORDER.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" disabled>
              <ChevronDown className="h-3 w-3" /> Bulk actions
            </Button>
          </div>
        </CardContent>
      </Card>

      {issues.loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : issues.error ? (
        <Empty
          icon={<Bug className="h-5 w-5" />}
          title="Failed to load issues"
          description={issues.error.message}
          action={<Button onClick={issues.refetch}>Retry</Button>}
        />
      ) : grouped.length === 0 ? (
        <Empty
          icon={<Bug className="h-5 w-5" />}
          title="No issues match your filter"
          description="Either the crawl is clean or your filter removed everything. Try clearing the search or priority filter."
        />
      ) : (
        <div className="space-y-4">
          {grouped.map(([key, list]) => (
            <IssueGroup key={key} group={list} />
          ))}
        </div>
      )}
    </div>
  );
}

function IssueGroup({ group }: { group: CrawlIssue[] }): React.ReactElement {
  const first = group[0];
  const variant = PRIORITY_VARIANT[first.priority];

  const [open, setOpen] = React.useState(true);
  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full text-left"
        >
          <div className="flex items-start gap-3">
            <Badge variant={variant} className="uppercase">
              {first.priority}
            </Badge>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">{first.title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {first.category} · type <code>{first.type}</code> · affects {group.length} URL
                {group.length === 1 ? '' : 's'}
              </p>
            </div>
            <ChevronDown
              className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')}
            />
          </div>
        </button>
      </CardHeader>
      {open ? (
        <CardContent className="pt-0 space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">{first.description}</p>
          {first.howToFix ? (
            <div className="text-sm rounded-md bg-info/10 text-info px-3 py-2 border border-info/30">
              <strong className="font-semibold">How to fix:</strong> {first.howToFix}
            </div>
          ) : null}
          <div className="rounded-md border divide-y">
            {group.slice(0, 50).map((it, i) => (
              <div key={`${it.url}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2">
                <Link
                  to={`#`}
                  onClick={(e) => e.preventDefault()}
                  className="text-sm font-mono truncate hover:text-primary flex items-center gap-1.5"
                  title={it.url}
                >
                  {truncate(it.url, 90)}
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </Link>
                {it.detail ? (
                  <span className="text-xs text-muted-foreground truncate max-w-md">
                    {truncate(it.detail, 80)}
                  </span>
                ) : null}
              </div>
            ))}
            {group.length > 50 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                + {group.length - 50} more
              </div>
            ) : null}
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

export { CenteredLoader };
