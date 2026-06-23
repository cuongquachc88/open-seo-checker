import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Globe,
  Bug,
  Activity,
  Sparkles,
  Plus,
  ArrowUpRight,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { StatCard } from '@/components/dashboard/StatCard';
import { HealthGauge } from '@/components/dashboard/HealthGauge';
import { IssueBreakdownChart } from '@/components/dashboard/IssueBreakdownChart';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty } from '@/components/ui/empty';
import { CenteredLoader } from '@/components/ui/spinner';
import { useApi, useDocumentTitle } from '@/hooks/useApi';
import { formatNumber } from '@/lib/utils';
import { BrandMark } from '@/components/brand/BrandMark';
import type { CrawlRun } from '@/types/domain';

interface HealthResponse {
  score: number;
  issues: number;
  breakdown: Record<string, number>;
}

interface IssueCountsResponse {
  counts: Record<string, number>;
  categories: Record<string, number>;
}

function statusTone(status: CrawlRun['status']): 'success' | 'warning' | 'destructive' | 'info' | 'muted' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'running':
      return 'info';
    case 'failed':
      return 'destructive';
    default:
      return 'muted';
  }
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function DashboardPage(): React.ReactElement {
  useDocumentTitle('Dashboard');
  const navigate = useNavigate();
  const [seed] = React.useState<string | null>(() => sessionStorage.getItem('oseo.quickCrawl'));

  const runs = useApi(() => api.getRuns(), []);
  const latestRun = runs.data?.runs?.[0];

  const detail = useApi(
    async (): Promise<[HealthResponse | null, IssueCountsResponse | null]> => {
      if (!latestRun?.id) return [null, null];
      const [h, c] = await Promise.all([
        api.getHealth(latestRun.id),
        api.getIssueCounts(latestRun.id),
      ]);
      return [h, c];
    },
    [latestRun?.id],
  );

  const health: HealthResponse | null = detail.data?.[0] ?? null;
  const issueCounts = detail.data?.[1] ?? null;

  if (runs.loading && !runs.data) {
    return <DashboardSkeleton />;
  }
  if (runs.error) {
    return (
      <Empty
        icon={<Bug className="h-5 w-5" />}
        title="Backend unreachable"
        description={`${runs.error.message}. Make sure the Open SEO Checker server is running on port 7437.`}
        action={
          <Button onClick={runs.refetch} variant="brand">
            Retry
          </Button>
        }
      />
    );
  }

  const totalUrls = (runs.data?.runs ?? []).reduce((acc, r) => acc + (r.urlsCrawled ?? 0), 0);
  const totalIssues = health?.issues ?? 0;
  const avgHealth = health?.score ?? 0;

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <header className="rounded-2xl bg-gradient-to-br from-sidebar to-sidebar/80 text-sidebar-foreground p-6 md:p-8 shadow-glow overflow-hidden relative">
        <div className="absolute -right-16 -top-12 h-56 w-56 rounded-full ring-grad opacity-50 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-1 max-w-2xl">
            <BrandMark size="xl" role="fe" showTag subtitle="Professional Edition" className="mb-4" />
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-balance text-primary-foreground">
              Crawl, audit and act on your website's SEO performance.
            </h1>
            <p className="mt-3 text-sm md:text-base text-sidebar-foreground/70 max-w-xl">
              One-click crawls, real-time issue tracking, AI-guided insights, and shareable
              reports. Built on your machine, free forever.
            </p>
            <div className="mt-5 flex gap-2 flex-wrap">
              <Button asChild variant="brand" size="lg">
                <Link to="/crawl">
                  <Plus className="h-4 w-4" /> New Crawl
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="text-sidebar-foreground hover:bg-sidebar-accent">
                <Link to="/runs">
                  View all runs
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 bg-sidebar-accent/60 px-6 py-5 rounded-xl ring-1 ring-sidebar-foreground/10">
            <HealthGauge
              value={typeof health?.score === 'number' ? health.score : 0}
              size={140}
              label="Latest Health"
            />
            {latestRun ? (
              <Link
                to={`/crawl/${latestRun.id}`}
                className="text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground flex items-center gap-1"
              >
                {safeHostname(latestRun.startUrl)} · {formatDate(latestRun.startedAt)}
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            ) : (
              <span className="text-xs text-sidebar-foreground/60">No crawl yet</span>
            )}
          </div>
        </div>
      </header>

      {/* Stat Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="URLs Crawled"
          value={totalUrls}
          icon={Globe}
          accent="primary"
          hint="Across all stored runs"
        />
        <StatCard
          label="Active Issues"
          value={totalIssues}
          icon={Bug}
          accent={totalIssues > 0 ? 'warning' : 'success'}
          hint={latestRun ? `From latest run #${latestRun.id}` : 'No runs yet'}
        />
        <StatCard
          label="Crawl Runs"
          value={(runs.data?.runs ?? []).length}
          icon={Activity}
          accent="info"
          hint="Total audits stored"
        />
        <StatCard
          label="Health Score"
          value={avgHealth}
          icon={Sparkles}
          accent={avgHealth >= 75 ? 'success' : avgHealth >= 50 ? 'warning' : 'destructive'}
          hint="0-100 scale"
          delta={health?.score != null ? `${health.issues} issues` : undefined}
        />
      </section>

      {/* Two-column layout */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle>Recent crawl runs</CardTitle>
              <CardDescription>Open a run to drill down into URLs, issues and sitemaps.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/runs">
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {(runs.data?.runs ?? []).length === 0 ? (
              <Empty
                icon={<Globe className="h-5 w-5" />}
                title="No crawl runs yet"
                description="Start a crawl to see results, issues and a downloadable sitemap."
                action={
                  <Button asChild variant="brand">
                    <Link to="/crawl">
                      <Plus className="h-4 w-4" /> Start your first crawl
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-border -mx-6">
                {(runs.data?.runs ?? []).slice(0, 6).map((run) => (
                  <button
                    key={run.id}
                    onClick={() => run.id && navigate(`/crawl/${run.id}`)}
                    className="flex items-center gap-4 w-full text-left px-6 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{run.name || safeHostname(run.startUrl)}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {run.startUrl}
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-5 text-xs text-muted-foreground tabular-nums">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {formatDate(run.startedAt)}
                      </span>
                      <span>{formatNumber(run.urlsCrawled)} urls</span>
                      <span>{run.errors} errors</span>
                    </div>
                    <Badge variant={statusTone(run.status)}>{run.status}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Issue distribution</CardTitle>
            <CardDescription>Severity and category breakdown of detected issues.</CardDescription>
          </CardHeader>
          <CardContent>
            {detail.loading && !issueCounts ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ) : (
              <IssueBreakdownChart
                counts={issueCounts?.counts ?? {}}
                categoryCounts={issueCounts?.categories ?? {}}
              />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Feature highlight cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureTile
          icon={<Activity className="h-5 w-5" />}
          title="Real-time crawl progress"
          description="Live progress, queued URLs, ETA, and per-worker throughput."
          href="/crawl"
        />
        <FeatureTile
          icon={<Bug className="h-5 w-5" />}
          title="Actionable issue tracker"
          description="Prioritised issues with fixes, affected URLs and severity filters."
          href={latestRun?.id ? `/crawl/${latestRun.id}/issues` : '/runs'}
        />
        <FeatureTile
          icon={<Sparkles className="h-5 w-5" />}
          title="AI search visibility"
          description="Generate AI overviews, llms.txt and E-E-A-T guidance from your data."
          href="/insights"
        />
      </section>

      {seed ? <div className="sr-only">{seed}</div> : null}
    </div>
  );
}

function FeatureTile({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="group block rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow hover:border-primary/30"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 text-primary p-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <CenteredLoader />
    </div>
  );
}
