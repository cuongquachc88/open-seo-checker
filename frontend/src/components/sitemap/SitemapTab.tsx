import * as React from 'react';
import { Copy, Download, Code, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty } from '@/components/ui/empty';
import { useApi, useDocumentTitle } from '@/hooks/useApi';

export function SitemapTab({ runId }: { runId: number }): React.ReactElement {
  useDocumentTitle(`Sitemap · Run #${runId}`);
  const [xml, setXml] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    api
      .getSitemap(runId)
      .then((res) => {
        setXml(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      });
  }, [runId]);

  const onCopy = async () => {
    if (!xml) return;
    await navigator.clipboard.writeText(xml);
    toast.success('Sitemap copied to clipboard');
  };

  const onDownload = () => {
    if (!xml) return;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sitemap-${runId}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const urlCount = xml ? (xml.match(/<loc>/g) ?? []).length : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-primary" /> Generated XML sitemap
            </CardTitle>
            <CardDescription>
              {urlCount > 0 ? `${urlCount} URLs included` : 'Ready to export and submit to search engines.'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={!xml} onClick={onCopy}>
              <Copy className="h-3 w-3" /> Copy
            </Button>
            <Button variant="brand" size="sm" disabled={!xml} onClick={onDownload}>
              <Download className="h-3 w-3" /> Download XML
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : error ? (
            <Empty
              icon={<Code className="h-5 w-5" />}
              title="Cannot generate sitemap"
              description={error}
            />
          ) : (
            <pre className="text-xs leading-relaxed bg-sidebar text-sidebar-foreground rounded-md p-4 overflow-auto max-h-[600px] font-mono">
              {xml}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">How to use this sitemap</CardTitle>
          <CardDescription>Best practices to maximize SEO returns.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
            <li>
              Submit the generated <code>sitemap.xml</code> to Google Search Console and Bing
              Webmaster Tools.
            </li>
            <li>
              Reference it from your <code>robots.txt</code>:{' '}
              <code className="bg-muted px-1 py-0.5 rounded">Sitemap: https://yourdomain.com/sitemap.xml</code>
            </li>
            <li>
              Re-generate after every meaningful content change so crawl frequency stays accurate.
            </li>
            <li>
              Split large sites into multiple sitemaps (e.g. one per content section) using a sitemap
              index file.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

export { useApi };
