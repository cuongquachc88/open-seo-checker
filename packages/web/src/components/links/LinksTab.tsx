import * as React from 'react';
import { Link2, Globe, AlertTriangle, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi, useDocumentTitle } from '@/hooks/useApi';
import { truncate } from '@/lib/utils';

export function LinksTab({ runId }: { runId: number }): React.ReactElement {
  useDocumentTitle(`Links · Run #${runId}`);
  const links = useApi(() => api.getLinks(runId), [runId]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" /> Link profile
          </CardTitle>
          <CardDescription>
            Internal/external links, nofollow usage, and referring pages discovered within the
            crawl scope. A full backlink profile requires third-party data (e.g. Ahrefs, Moz,
            Search Console).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {links.loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : links.error ? (
            <Empty
              icon={<Link2 className="h-5 w-5" />}
              title="Failed to load links"
              description={links.error.message}
              action={<button onClick={links.refetch}>Retry</button>}
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border rounded-md p-3">
                <div className="text-xs text-muted-foreground">Internal links</div>
                <div className="text-2xl font-bold">{links.data?.internal ?? 0}</div>
              </div>
              <div className="border rounded-md p-3">
                <div className="text-xs text-muted-foreground">External links</div>
                <div className="text-2xl font-bold">{links.data?.external ?? 0}</div>
              </div>
              <div className="border rounded-md p-3">
                <div className="text-xs text-muted-foreground">Nofollow</div>
                <div className="text-2xl font-bold">{links.data?.nofollow ?? 0}</div>
              </div>
              <div className="border rounded-md p-3">
                <div className="text-xs text-muted-foreground">Referring domains</div>
                <div className="text-2xl font-bold">{links.data?.referringDomains.length ?? 0}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> Outgoing domains
            </CardTitle>
            <CardDescription>External domains this site links to.</CardDescription>
          </CardHeader>
          <CardContent>
            {links.data && Object.keys(links.data.outgoingDomains).length === 0 ? (
              <p className="text-sm text-muted-foreground">No external links found.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {Object.entries(links.data?.outgoingDomains ?? {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([domain, count]) => (
                    <div key={domain} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50">
                      <span className="truncate">{domain}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" /> Referring pages
            </CardTitle>
            <CardDescription>
              Pages discovered during the crawl that link back to the target site. This is limited
              to the crawl scope.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {links.data && links.data.referringPages.length === 0 ? (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  No referring pages found within the crawl. To get a real backlink profile, connect
                  an external backlink API.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {(links.data?.referringPages ?? []).map((p, i) => (
                  <div key={`${p.url}-${i}`} className="border rounded-md p-3">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      {truncate(p.url, 70)}
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                    <p className="text-xs text-muted-foreground mt-0.5">Domain: {p.domain}</p>
                    {p.anchorText ? (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Anchor: <em>{p.anchorText}</em>
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
