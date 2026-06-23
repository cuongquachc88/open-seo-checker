import * as React from 'react';
import { Link, useNavigate, useParams, Outlet } from 'react-router-dom';
import {
  Activity,
  ChevronRight,
  Globe,
  Bug,
  Layers,
  ListChecks,
  Sparkles,
  GitCompareArrows,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { CenteredLoader, Spinner } from '@/components/ui/spinner';
import { Empty } from '@/components/ui/empty';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn, formatNumber, safeHostname } from '@/lib/utils';
import { useApi, useInterval, useDocumentTitle } from '@/hooks/useApi';
import type { CrawlRun, CrawlProgressEvent } from '@/types/domain';
import { OverviewTab } from '@/components/dashboard/OverviewTab';
import { IssuesTab } from '@/components/issues/IssuesTab';
import { UrlsTab } from '@/components/urls/UrlsTab';
import { SitemapTab } from '@/components/sitemap/SitemapTab';
import { CompareTab } from '@/components/compare/CompareTab';
import { InsightsTab } from '@/components/ai/InsightsTab';

interface HealthResponse {
  score: number;
  issues: number;
  breakdown: Record<string, number>;
}

function formatBytes(bytes?: number) {
  if (bytes == null) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso?: string): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

export function CrawlDetailPage(): React.ReactElement {
  const params = useParams();
  const id = Number(params.id);
  const isValid = Number.isFinite(id) && id > 0;
  const navigate = useNavigate();

  if (!isValid) {
    return (
      <Empty
        icon={<Info className="h-5 w-5" />}
        title="Invalid run id"
        description="The URL must reference a valid crawl run, like /crawl/1"
        action={
          <Button asChild variant="brand">
            <Link to="/runs">Browse runs</Link>
          </Button>
        }
      />
    );
  }

  return <CrawlDetailContent id={id} navigate={navigate} />;
}

function CrawlDetailContent({
  id,
  navigate,
}: {
  id: number;
  navigate: ReturnType<typeof useNavigate>;
}): React.ReactElement {
  useDocumentTitle(`Run #${id}`);
  const [tab, setTab] = React.useState<string>(() => {
    const path = window.location.pathname.split('/').pop();
    return path && ['overview', 'issues', 'urls', 'sitemap', 'compare', 'insights'].includes(path)
      ? path
      : 'overview';
  });

  const status = useApi(() => api.getStatus(id), [id]);
  const run = status.data ? { ...status.data, ...(status.data.progress ?? {}) } : null;
  const isRunning = run?.status === 'running';
  useInterval(() => {
    if (run?.status === 'running') status.refetch();
  }, isRunning ? 1500 : null);

  const health = useApi(() => api.getHealth(id), [id]);
  const counts = useApi(() => api.getIssueCounts(id), [id]);

  const onExport = async (format: 'csv' | 'json' | 'xlsx') => {
    try {
      const data = await api.export(id, format);
      if (data.path) {
        toast.success('Export ready', { description: data.path });
        return;
      }
      if (data.content) {
        const blob = new Blob([data.content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `crawl-${id}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Export downloaded');
      }
    } catch (err) {
      toast.error('Export failed', {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const onRefreshIntegrations = async () => {
    try {
      await api.triggerIntegrations(id);
      toast.success('Integration enrichment queued');
    } catch (err) {
      toast.error('Enrichment failed', {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  if (status.loading && !run) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <CenteredLoader />
      </div>
    );
  }
  if (status.error) {
    return (
      <Empty
        icon={<AlertTriangle className="h-5 w-5" />}
        title="Unable to load run"
        description={status.error.message}
        action={
          <Button variant="brand" onClick={status.refetch}>
            Try again
          </Button>
        }
      />
    );
  }
  if (!run) {
    return <CenteredLoader />;
  }

  const progress = (run as CrawlRun & { progress?: CrawlProgressEvent | null }).progress;
  const target = tab === 'overview' ? `/crawl/${id}` : `/crawl/${id}/${tab}`;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1.5">
          <Link
            to="/runs"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ChevronRight className="h-3 w-3 rotate-180" /> All runs
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
            <Globe className="h-5 w-5 text-primary" />
            {run.name || safeHostname(run.startUrl)}
            <Badge variant={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'destructive' : 'info'}>
              {run.status}
            </Badge>
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="font-mono">{run.startUrl}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> Started {formatDate(run.startedAt)}
            </span>
            {run.completedAt ? (
              <>
                <span>•</span>
                <span>Finished {formatDate(run.completedAt)}</span>
              </>
            ) : null}
            <span>•</span>
            <span>
              DB: <code className="text-[10px]">{run.dbPath.split('/').pop()}</code>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={status.refetch}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={onRefreshIntegrations}>
            <Sparkles className="h-3.5 w-3.5" /> Enrich with integrations
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="brand" size="sm">
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onExport('csv')}>CSV</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onExport('json')}>JSON</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onExport('xlsx')}>Excel (.xlsx)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {isRunning && progress ? (
        <Card className="overflow-hidden border-primary/40">
          <CardContent className="p-5 flex items-center gap-4">
            <Spinner size={28} className="text-primary" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">
                  Crawling… {formatNumber(progress.urlsCrawled)} / {formatNumber(progress.urlsFound)}
                </p>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {progress.urlsQueued} queued · {progress.errors} errors
                </span>
              </div>
              <ProgressBar
                value={progress.urlsFound ? (progress.urlsCrawled / progress.urlsFound) * 100 : 0}
              />
              {progress.currentUrl ? (
                <p className="mt-2 text-xs text-muted-foreground truncate font-mono">
                  {progress.currentUrl}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs value={tab} onValueChange={(value) => {
        setTab(value);
        navigate(value === 'overview' ? `/crawl/${id}` : `/crawl/${id}/${value}`);
      }}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">
            <Activity className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="issues">
            <Bug className="h-4 w-4" /> Issues
            {health.data?.issues != null && health.data.issues > 0 ? (
              <Badge variant="destructive">{health.data.issues}</Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="urls">
            <ListChecks className="h-4 w-4" /> URLs
          </TabsTrigger>
          <TabsTrigger value="sitemap">
            <Layers className="h-4 w-4" /> Sitemap
          </TabsTrigger>
          <TabsTrigger value="compare">
            <GitCompareArrows className="h-4 w-4" /> Compare
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Sparkles className="h-4 w-4" /> AI Insights
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          {tab === 'overview' ? (
            <OverviewTab
              run={run}
              health={health.data ?? null}
              counts={counts.data?.counts ?? null}
            />
          ) : null}
          {tab === 'issues' ? <IssuesTab runId={id} /> : null}
          {tab === 'urls' ? <UrlsTab runId={id} /> : null}
          {tab === 'sitemap' ? <SitemapTab runId={id} /> : null}
          {tab === 'compare' ? <CompareTab currentRunId={id} /> : null}
          {tab === 'insights' ? <InsightsTab runId={id} /> : null}
        </div>
      </Tabs>

      <div className="sr-only">{target}</div>
      <Outlet />
      {void formatBytes}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn('absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-info transition-all')}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
