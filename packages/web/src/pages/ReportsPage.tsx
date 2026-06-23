import * as React from 'react';
import { Link } from 'react-router-dom';
import { ChartLine, FileSpreadsheet, FileText, FileJson, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi, useDocumentTitle } from '@/hooks/useApi';
import { toast } from 'sonner';
import { formatNumber, safeHostname } from '@/lib/utils';

export function ReportsPage(): React.ReactElement {
  useDocumentTitle('Reports');
  const runs = useApi(() => api.getRuns(), []);
  const [busy, setBusy] = React.useState<number | null>(null);

  const exportRun = async (
    id: number,
    format: 'csv' | 'json' | 'xlsx',
  ): Promise<void> => {
    try {
      setBusy(id);
      const data = await api.export(id, format);
      if (data.path) {
        toast.success(`${format.toUpperCase()} export saved`, { description: data.path });
      }
    } catch (err) {
      toast.error('Export failed', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase font-semibold tracking-widest text-primary">Tools</p>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Bulk-export any crawl in CSV, JSON or Excel format. Files are saved into the{' '}
          <code>exports/</code> folder of the project.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ChartLine className="h-4 w-4 text-primary" /> Export queue
          </CardTitle>
          <CardDescription>Select a run and a format. Excel files are stored alongside JSON / CSV.</CardDescription>
        </CardHeader>
        <CardContent>
          {runs.loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (runs.data?.runs ?? []).length === 0 ? (
            <Empty
              icon={<FileSpreadsheet className="h-5 w-5" />}
              title="No reports yet"
              description="Crawl something first, then come back here to export."
              action={
                <Button asChild variant="brand">
                  <Link to="/crawl">Start a crawl</Link>
                </Button>
              }
            />
          ) : (
            <div className="divide-y -mx-6">
              {(runs.data?.runs ?? []).map((run) => (
                <div
                  key={run.id}
                  className="px-6 py-4 flex items-center gap-4 flex-wrap"
                >
                  <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <Link
                      to={`/crawl/${run.id}`}
                      className="font-medium hover:text-primary truncate block"
                    >
                      {safeHostname(run.startUrl)}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(run.urlsCrawled)} URLs · {run.errors} errors ·{' '}
                      {run.startedAt.split('T')[0]}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportRun(run.id!, 'csv')}
                      disabled={busy === run.id}
                    >
                      <FileText className="h-3.5 w-3.5" /> CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportRun(run.id!, 'json')}
                      disabled={busy === run.id}
                    >
                      <FileJson className="h-3.5 w-3.5" /> JSON
                    </Button>
                    <Button
                      variant="brand"
                      size="sm"
                      onClick={() => exportRun(run.id!, 'xlsx')}
                      disabled={busy === run.id}
                    >
                      <Download className="h-3.5 w-3.5" /> Excel
                    </Button>
                    <Badge variant="info">Run #{run.id}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
