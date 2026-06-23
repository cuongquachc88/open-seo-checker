import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { Link2, FileText, AlertTriangle, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty } from '@/components/ui/empty';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatBytes, formatDuration, truncate } from '@/lib/utils';
import { useApi, useDocumentTitle } from '@/hooks/useApi';
import type { CrawlLink, CrawlUrl } from '@/types/domain';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'destructive' | 'info' | 'muted'> = {
  success: 'success',
  redirect: 'info',
  'client-error': 'warning',
  'server-error': 'destructive',
  'no-response': 'destructive',
};

export function UrlsTab({ runId }: { runId: number }): React.ReactElement {
  useDocumentTitle(`URLs · Run #${runId}`);
  const [filter, setFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [internalFilter, setInternalFilter] = React.useState('all');
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [activeId, setActiveId] = React.useState<number | null>(null);

  const urls = useApi(
    () =>
      api.getUrls(runId, {
        limit: 5000,
        ...(internalFilter === 'internal'
          ? { isInternal: true }
          : internalFilter === 'external'
          ? { isInternal: false }
          : {}),
        ...(statusFilter !== 'all' && statusFilter !== 'external'
          ? { statusCategory: statusFilter }
          : {}),
      }),
    [runId, statusFilter, internalFilter],
  );

  const data = React.useMemo(() => urls.data?.urls ?? [], [urls.data]);

  const filtered = React.useMemo(() => {
    if (!filter.trim()) return data;
    const term = filter.toLowerCase();
    return data.filter((u) =>
      [u.address, u.title1, u.h1, u.metaDescription1, u.canonical]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(term)),
    );
  }, [data, filter]);

  const columns = React.useMemo<ColumnDef<CrawlUrl>[]>(
    () => [
      {
        id: 'status',
        header: 'Status',
        accessorFn: (row) => row.statusCode ?? 0,
        cell: ({ row }) => {
          const l = row.original;
          const tone = STATUS_TONE[l.statusCategory ?? 'success'];
          return (
            <div className="flex items-center gap-2">
              <Badge variant={tone}>{l.statusCode ?? '-'}</Badge>
              {l.statusCategory === 'redirect' && l.redirectUrl ? (
                <Link2 className="h-3 w-3 text-info" />
              ) : null}
            </div>
          );
        },
        size: 90,
      },
      {
        id: 'address',
        header: 'URL',
        accessorFn: (row) => row.address,
        cell: ({ row }) => {
          const url = row.original;
          return (
            <button
              type="button"
              onClick={() => setActiveId(row.original.id ?? null)}
              className="text-left text-sm font-mono text-foreground hover:text-primary truncate max-w-[440px] block"
              title={url.address}
            >
              {truncate(url.address, 110)}
            </button>
          );
        },
        size: 480,
      },
      {
        id: 'title',
        accessorFn: (row) => row.title1 ?? '',
        header: 'Title',
        cell: ({ getValue }) => (
          <span className="text-sm text-foreground line-clamp-2 max-w-[280px]">
            {truncate(String(getValue() || ''), 80) || <span className="text-muted-foreground italic">missing</span>}
          </span>
        ),
      },
      {
        id: 'wordCount',
        accessorFn: (row) => row.wordCount ?? 0,
        header: 'Words',
        cell: ({ getValue }) => <span className="tabular-nums text-sm">{getValue() as number}</span>,
        size: 80,
      },
      {
        id: 'h1',
        accessorFn: (row) => row.h1 ?? '',
        header: 'H1',
        cell: ({ getValue, row }) => {
          const v = String(getValue() || '');
          const h1Count = row.original.h1Count ?? 0;
          return (
            <span className="text-sm flex items-center gap-2">
              <span className="truncate max-w-[180px]">
                {v || <span className="text-muted-foreground italic">missing</span>}
              </span>
              {h1Count > 1 ? (
                <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
              ) : null}
            </span>
          );
        },
      },
      {
        id: 'indexability',
        accessorFn: (row) => row.indexability,
        header: 'Index',
        cell: ({ getValue }) => {
          const v = String(getValue());
          return (
            <Badge variant={v === 'indexable' ? 'success' : 'muted'}>
              {v === 'indexable' ? 'OK' : 'Blocked'}
            </Badge>
          );
        },
        size: 100,
      },
      {
        id: 'inlinks',
        accessorFn: (row) => row.inlinks ?? 0,
        header: 'In',
        cell: ({ getValue }) => <span className="tabular-nums text-sm">{getValue() as number}</span>,
        size: 80,
      },
      {
        id: 'outlinks',
        accessorFn: (row) => row.outlinks ?? 0,
        header: 'Out',
        cell: ({ getValue }) => <span className="tabular-nums text-sm">{getValue() as number}</span>,
        size: 80,
      },
      {
        id: 'depth',
        accessorFn: (row) => row.crawlDepth ?? 0,
        header: 'Depth',
        cell: ({ getValue }) => <span className="tabular-nums text-sm">{getValue() as number}</span>,
        size: 80,
      },
      {
        id: 'transferredSize',
        accessorFn: (row) => row.transferredSize ?? 0,
        header: 'Size',
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">{formatBytes(getValue() as number)}</span>
        ),
        size: 90,
      },
      {
        id: 'responseTime',
        accessorFn: (row) => row.responseTime ?? 0,
        header: 'TTFB',
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">{formatDuration(getValue() as number)}</span>
        ),
        size: 90,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search URLs, titles, H1…"
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">2xx Success</SelectItem>
              <SelectItem value="redirect">3xx Redirect</SelectItem>
              <SelectItem value="client-error">4xx Client error</SelectItem>
              <SelectItem value="server-error">5xx Server error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={internalFilter} onValueChange={setInternalFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All URLs</SelectItem>
              <SelectItem value="internal">Internal only</SelectItem>
              <SelectItem value="external">External only</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {urls.loading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8">
              <Empty
                icon={<FileText className="h-5 w-5" />}
                title="No URLs match"
                description="Try clearing filters or running a deeper crawl."
              />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => {
                      const sort = header.column.getIsSorted();
                      return (
                        <th
                          key={header.id}
                          className={cn(
                            'text-left font-medium px-3 py-2.5 select-none whitespace-nowrap',
                            header.column.getCanSort() && 'cursor-pointer hover:text-foreground',
                          )}
                          style={{ width: header.getSize() }}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <span className="inline-flex items-center gap-1">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sort === 'asc' ? <ArrowUp className="h-3 w-3" /> : null}
                            {sort === 'desc' ? <ArrowDown className="h-3 w-3" /> : null}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2 align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {filtered.length > 25 ? (
          <div className="flex items-center justify-between p-3 border-t text-xs text-muted-foreground">
            <span>
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–{Math.min(
                filtered.length,
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              )} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Sheet open={activeId != null} onOpenChange={(open) => !open && setActiveId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          {activeId != null ? <UrlDetailPanel runId={runId} urlId={activeId} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function UrlDetailPanel({
  runId,
  urlId,
}: {
  runId: number;
  urlId: number;
}): React.ReactElement {
  const detail = useApi(() => api.getUrlDetail(runId, urlId), [runId, urlId]);
  if (detail.loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (detail.error || !detail.data) {
    return (
      <div className="p-6">
        <Empty
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Unable to load URL details"
          description={detail.error?.message ?? 'Unknown error'}
        />
      </div>
    );
  }
  const { url, inlinks, outlinks } = detail.data;
  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-mono text-sm break-all">{url.address}</SheetTitle>
        <SheetDescription className="flex items-center gap-3 flex-wrap text-xs">
          <Badge variant={STATUS_TONE[url.statusCategory ?? 'success']}>{url.statusCode ?? '-'}</Badge>
          {url.indexability === 'indexable' ? (
            <Badge variant="success">Indexable</Badge>
          ) : (
            <Badge variant="muted">Non-indexable</Badge>
          )}
          <span>depth {url.crawlDepth}</span>
          {url.wordCount != null ? <span>{url.wordCount} words</span> : null}
        </SheetDescription>
      </SheetHeader>

      <div className="mt-6 space-y-6 overflow-y-auto pr-2 pb-8">
        <Section title="On-page">
          <Field label="Title">{url.title1 ?? <span className="text-muted-foreground italic">—</span>}</Field>
          <Field label="Meta description">{url.metaDescription1 ?? <span className="text-muted-foreground italic">—</span>}</Field>
          <Field label="H1">{url.h1 ?? <span className="text-muted-foreground italic">—</span>}</Field>
          <Field label="Canonical">{url.canonical ?? <span className="text-muted-foreground italic">—</span>}</Field>
        </Section>

        <Section title="Response">
          <Field label="Status code">{url.statusCode}</Field>
          <Field label="Content type">{url.contentType ?? '-'}</Field>
          <Field label="Size">{formatBytes(url.transferredSize ?? url.contentLength)}</Field>
          <Field label="TTFB">{formatDuration(url.responseTime ?? null)}</Field>
          <Field label="Last modified">{url.lastModified ?? '-'}</Field>
          <Field label="Language">{url.language ?? '-'}</Field>
        </Section>

        <Section title="Links">
          <Field label="Inlinks">{url.inlinks ?? inlinks.length}</Field>
          <Field label="Outlinks">{url.outlinks ?? outlinks.length}</Field>
        </Section>

        <Section title={`Inlinks (${inlinks.length})`}>
          <LinkList links={inlinks} />
        </Section>

        <Section title={`Outlinks (${outlinks.length})`}>
          <LinkList links={outlinks} />
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-2 rounded-md border bg-card p-3">
        {children}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm border-b last:border-0 pb-2 last:pb-0">
      <span className="text-muted-foreground text-xs uppercase tracking-wider">{label}</span>
      <span className="col-span-2 break-words">{children}</span>
    </div>
  );
}

function LinkList({ links }: { links: CrawlLink[] }) {
  if (links.length === 0) {
    return <p className="text-xs text-muted-foreground italic">None.</p>;
  }
  return (
    <ul className="max-h-64 overflow-y-auto divide-y -mx-1">
      {links.slice(0, 100).map((l, i) => (
        <li key={i} className="px-1 py-1.5 text-xs flex items-center justify-between gap-3">
          <span className="font-mono truncate">{l.targetUrl}</span>
          <span className="flex items-center gap-1 shrink-0">
            {l.nofollow ? <Badge variant="muted">nofollow</Badge> : null}
            <Badge variant="outline">{l.linkType}</Badge>
            {l.anchorText ? (
              <span className="text-muted-foreground italic">"{truncate(l.anchorText, 30)}"</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
