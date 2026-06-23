import * as React from 'react';
import { Key, Search, ExternalLink, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi, useDocumentTitle } from '@/hooks/useApi';
import { truncate } from '@/lib/utils';

interface KeywordResult {
  keyword: string;
  count: number;
  urls: number;
}

interface UrlKeywordResult {
  url: string;
  keywords: { keyword: string; count: number }[];
}

export function KeywordsTab({ runId }: { runId: number }): React.ReactElement {
  useDocumentTitle(`Keywords · Run #${runId}`);
  const [search, setSearch] = React.useState('');
  const keywords = useApi(() => api.getKeywords(runId), [runId]);

  const filteredTop = React.useMemo(() => {
    const list = keywords.data?.topKeywords ?? [];
    if (!search.trim()) return list;
    const term = search.toLowerCase();
    return list.filter((k) => k.keyword.toLowerCase().includes(term));
  }, [keywords.data, search]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search extracted keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-96"
            />
          </div>
        </CardContent>
      </Card>

      {keywords.loading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : keywords.error ? (
        <Empty
          icon={<Key className="h-5 w-5" />}
          title="Failed to load keywords"
          description={keywords.error.message}
          action={<button onClick={keywords.refetch}>Retry</button>}
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Trending in this crawl
              </CardTitle>
              <CardDescription>
                Keywords that appear on the most pages. Real Google Trends data requires an
                external API key (not yet configured).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(keywords.data?.topKeywords ?? [])
                  .slice(0, 15)
                  .map((k) => (
                    <Badge key={k.keyword} variant="outline" className="font-normal">
                      {k.keyword} <span className="text-muted-foreground ml-1">({k.urls})</span>
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="h-4 w-4 text-primary" /> Top keywords
                </CardTitle>
              <CardDescription>
                Most frequent 1-2 word phrases across titles, meta descriptions, headings and content.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredTop.length === 0 ? (
                <p className="text-sm text-muted-foreground">No keywords match your search.</p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {filteredTop.map((k) => (
                    <div
                      key={k.keyword}
                      className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50"
                    >
                      <span className="truncate font-medium">{k.keyword}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary">{k.count}</Badge>
                        <span className="text-xs text-muted-foreground">{k.urls} url{k.urls === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Keywords by URL</CardTitle>
              <CardDescription>
                Top keywords extracted from each individual page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(keywords.data?.urlKeywords ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No URLs with keyword data available.</p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {(keywords.data?.urlKeywords ?? []).map((u) => (
                    <div key={u.url} className="border rounded-md p-3">
                      <a
                        href={u.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-mono text-primary hover:underline flex items-center gap-1"
                      >
                        {truncate(u.url, 80)}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {u.keywords.map((k) => (
                          <Badge key={k.keyword} variant="outline" className="font-normal">
                            {k.keyword} <span className="text-muted-foreground ml-1">({k.count})</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )}
  </div>
);
}
