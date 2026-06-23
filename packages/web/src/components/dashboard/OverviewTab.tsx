import * as React from 'react';
import {
  Globe,
  Bug,
  CheckCircle2,
  Link2,
  Activity,
  Map,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/StatCard';
import { HealthGauge } from '@/components/dashboard/HealthGauge';
import { IssueBreakdownChart } from '@/components/dashboard/IssueBreakdownChart';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/utils';
import type { CrawlRun } from '@/types/domain';

interface OverviewTabProps {
  run: (CrawlRun & { config?: string; progress?: { urlsCrawled: number; urlsFound: number; errors: number; redirects: number; urlsQueued: number } | null });
  health: { score: number; issues: number; breakdown: Record<string, number> } | null;
  counts: { counts: Record<string, number>; categories: Record<string, number> } | null;
}

export function OverviewTab({ run, health, counts }: OverviewTabProps): React.ReactElement {
  const breakdownEntries = health?.breakdown
    ? Object.entries(health.breakdown).filter(([, v]) => v > 0).sort((a, b) => a[1] - b[1])
    : [];

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Health score
            </CardTitle>
            <CardDescription>
              Composite of all categories. Each sub-score is a 0-100 grade weighted into the total.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {health ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="flex flex-col items-center justify-center py-2">
                  <HealthGauge value={health.score} size={180} />
                  <p className="mt-3 text-xs text-muted-foreground">
                    {health.issues} active issues remain across {formatNumber(run.urlsCrawled)} URLs.
                  </p>
                </div>
                <div className="lg:col-span-2 space-y-2 max-h-72 overflow-y-auto pr-2">
                  {breakdownEntries.map(([key, value]) => (
                    <BreakdownRow key={key} label={key} value={value} />
                  ))}
                  {breakdownEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No categories failed.</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <Skeleton className="h-40 w-full" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bug className="h-4 w-4 text-primary" /> Issue severity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <IssueBreakdownChart
              counts={counts?.counts ?? {}}
              categoryCounts={counts?.categories ?? {}}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Issues"
          value={health?.issues ?? 0}
          icon={Bug}
          accent={health && health.issues > 0 ? 'destructive' : 'success'}
          hint={health && health.issues > 0 ? 'See Issues tab' : 'No issues detected'}
        />
        <StatCard
          label="URLs Crawled"
          value={run.urlsCrawled}
          icon={Globe}
          accent="primary"
        />
        <StatCard
          label="URLs Found"
          value={run.urlsFound}
          icon={Link2}
          accent="info"
          hint={run.urlsFound > run.urlsCrawled ? `${run.urlsFound - run.urlsCrawled} queued` : 'All discovered URLs crawled'}
        />
        <StatCard
          label="Crawl Errors"
          value={run.errors}
          icon={Activity}
          accent={run.errors > 0 ? 'destructive' : 'success'}
          delta={run.errors === 0 ? 'clean' : undefined}
        />
        <StatCard
          label="Redirects"
          value={run.redirects}
          icon={CheckCircle2}
          accent={run.redirects > 0 ? 'warning' : 'muted'}
          hint={run.redirects > 0 ? 'Review chains' : 'No chains yet'}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Map className="h-4 w-4 text-primary" /> Sitemaps
            </CardTitle>
            <CardDescription>
              Sitemap URLs discovered and parsed during the crawl.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(run.sitemapUrls?.length ?? 0) > 0 ? (
              <ul className="space-y-2">
                {run.sitemapUrls!.map((url) => (
                  <li key={url} className="flex items-center gap-2 text-sm">
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline truncate flex-1"
                    >
                      {url}
                    </a>
                    <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No sitemap discovered. Enable <em>Discover via XML sitemaps</em> in the crawl settings
                or ensure <code>/sitemap.xml</code> is available.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> robots.txt
            </CardTitle>
            <CardDescription>
              Domains for which a robots.txt was fetched and respected.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {run.robotsTxt && Object.keys(run.robotsTxt).length > 0 ? (
              <ul className="space-y-2">
                {Object.entries(run.robotsTxt).map(([domain, content]) => (
                  <li key={domain} className="space-y-1">
                    <div className="text-sm font-medium">{domain}</div>
                    <pre className="text-[10px] leading-relaxed bg-muted p-2 rounded-md overflow-auto max-h-24 font-mono">
                      {content || '(empty file)'}
                    </pre>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No robots.txt was fetched. If the crawl was blocked, check that the server returns
                a valid robots.txt file.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Crawl configuration snapshot</CardTitle>
            <CardDescription>Settings used for this run.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs leading-relaxed bg-muted p-3 rounded-md overflow-auto max-h-72 font-mono">
{JSON.stringify(parseRunConfig(run), null, 2)}
            </pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick wins</CardTitle>
            <CardDescription>
              High impact issues ranked by potential SEO uplift.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {[
                'Add a unique meta description to every indexable page.',
                'Resolve all 4xx response codes discovered during the crawl.',
                'Ensure each page has a single H1 that includes the target keyword.',
                'Validate structured data against Schema.org specs.',
                'Enable compression and minify CSS/JS resources.',
              ].map((tip, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  const color =
    value >= 90
      ? 'bg-success'
      : value >= 75
      ? 'bg-info'
      : value >= 60
      ? 'bg-warning'
      : value >= 40
      ? 'bg-orange-500'
      : 'bg-destructive';
  const fixedLabel = label
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{fixedLabel}</span>
        <span className="font-mono tabular-nums text-muted-foreground">{value}/100</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

function parseRunConfig(run: CrawlRun & { config?: string }): Record<string, unknown> {
  if (!run.config) return {};
  try {
    return JSON.parse(run.config);
  } catch {
    return {};
  }
}
