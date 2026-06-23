import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PlayCircle,
  Cpu,
  Globe,
  ShieldCheck,
  Sparkles,
  PlusCircle,
  X,
  CheckCircle2,
  Binary,
  FileSearch,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useDocumentTitle } from '@/hooks/useApi';
import { cn, safeHostname } from '@/lib/utils';
import type { CrawlConfig } from '@/types/domain';

type Mode = 'spider' | 'list';

interface FormState {
  startUrl: string;
  mode: Mode;
  listUrls: string[];
  maxUrls: number;
  maxDepth: number;
  threads: number;
  userAgent: string;
  respectRobotsTxt: boolean;
  followRedirects: boolean;
  allowSubdomains: boolean;
  crawlExternal: boolean;
  renderJs: boolean;
  renderTimeout: number;
  includeImages: boolean;
  includeCss: boolean;
  includeJs: boolean;
  includePdfs: boolean;
  useSitemaps: boolean;
  followCanonical: boolean;
  followHreflang: boolean;
  nearDuplicateThreshold: number;
  enableNearDuplicates: boolean;
  enableSemanticSimilarity: boolean;
  excludePatterns: string[];
  customUserAgent: boolean;
  apiKeyOpenAI: string;
  apiKeyAnthropic: string;
  apiKeyGemini: string;
  apiKeyKimi: string;
  apiKeyMinimax: string;
}

const DEFAULTS: FormState = {
  startUrl: '',
  mode: 'spider',
  listUrls: [],
  maxUrls: 500,
  maxDepth: 5,
  threads: 8,
  userAgent: 'OpenSEOCrawler/1.0 (+https://github.com/open-seo-checker)',
  respectRobotsTxt: true,
  followRedirects: true,
  allowSubdomains: false,
  crawlExternal: true,
  renderJs: false,
  renderTimeout: 30000,
  includeImages: true,
  includeCss: false,
  includeJs: false,
  includePdfs: false,
  useSitemaps: false,
  followCanonical: true,
  followHreflang: true,
  nearDuplicateThreshold: 90,
  enableNearDuplicates: false,
  enableSemanticSimilarity: false,
  excludePatterns: [],
  customUserAgent: false,
  apiKeyOpenAI: '',
  apiKeyAnthropic: '',
  apiKeyGemini: '',
  apiKeyKimi: '',
  apiKeyMinimax: '',
};

const API_KEY_LABELS: Record<keyof Pick<FormState, 'apiKeyOpenAI' | 'apiKeyAnthropic' | 'apiKeyGemini' | 'apiKeyKimi' | 'apiKeyMinimax'>, string> = {
  apiKeyOpenAI: 'OpenAI',
  apiKeyAnthropic: 'Anthropic Claude',
  apiKeyGemini: 'Google Gemini',
  apiKeyKimi: 'Kimi (Moonshot)',
  apiKeyMinimax: 'MiniMax',
};

export function NewCrawlPage(): React.ReactElement {
  useDocumentTitle('New Crawl');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = React.useState<FormState>(DEFAULTS);
  const [submitting, setSubmitting] = React.useState(false);
  const [listUrlDraft, setListUrlDraft] = React.useState('');

  React.useEffect(() => {
    if (params.get('seed')) {
      const seed = sessionStorage.getItem('oseo.seedCrawl');
      if (seed) {
        try {
          const parsed = JSON.parse(seed) as { startUrl?: string };
          setForm((prev) => ({ ...prev, startUrl: parsed.startUrl ?? '' }));
          sessionStorage.removeItem('oseo.seedCrawl');
        } catch {
          /* noop */
        }
      }
    }
  }, [params]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onAddListUrl = () => {
    if (!listUrlDraft.trim()) return;
    setForm((prev) => ({ ...prev, listUrls: [...prev.listUrls, listUrlDraft.trim()] }));
    setListUrlDraft('');
  };

  const removeListUrl = (idx: number) =>
    setForm((prev) => ({
      ...prev,
      listUrls: prev.listUrls.filter((_, i) => i !== idx),
    }));

  const submit = async () => {
    if (!form.startUrl.trim()) {
      toast.error('Please enter a starting URL');
      return;
    }
    setSubmitting(true);
    try {
      const config: Partial<CrawlConfig> = {
        startUrl: form.startUrl.trim(),
        mode: form.mode,
        listUrls: form.mode === 'list' ? form.listUrls : undefined,
        maxUrls: form.maxUrls,
        maxDepth: form.maxDepth,
        threads: form.threads,
        userAgent: form.userAgent.trim() || 'OpenSEOCrawler/1.0',
        respectRobotsTxt: form.respectRobotsTxt,
        followRedirects: form.followRedirects,
        allowSubdomains: form.allowSubdomains,
        crawlExternal: form.crawlExternal,
        renderJs: form.renderJs,
        renderTimeout: form.renderTimeout,
        includeImages: form.includeImages,
        includeCss: form.includeCss,
        includeJs: form.includeJs,
        includePdfs: form.includePdfs,
        useSitemaps: form.useSitemaps,
        followCanonical: form.followCanonical,
        followHreflang: form.followHreflang,
        nearDuplicateThreshold: form.nearDuplicateThreshold,
        enableNearDuplicates: form.enableNearDuplicates,
        enableSemanticSimilarity: form.enableSemanticSimilarity,
        excludePatterns: form.excludePatterns,
        queryStringHandling: 'keep',
        apiKeys: buildApiKeys(form),
      };
      const { runId } = await api.startCrawl(config);
      toast.success(`Crawl started`, {
        description: `Run #${runId} created. Tracking progress…`,
      });
      navigate(`/crawl/${runId}`);
    } catch (err) {
      toast.error('Failed to start crawl', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const validSimple = /^https?:\/\/.+\..+/.test(form.startUrl.trim());

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Start a new crawl</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Configure crawl scope, behavior, optional JavaScript rendering and enrichments. The
            dashboard will follow the crawl in real time once it starts.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-success" />
          <span>Local. No data leaves your machine unless integrations are added.</span>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Starting point
          </CardTitle>
          <CardDescription>
            Paste a URL or switch to list mode to provide a custom set of starting pages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={form.mode}
            onValueChange={(v) => update('mode', v as Mode)}
            className="space-y-4"
          >
            <TabsList>
              <TabsTrigger value="spider">
                <PlayCircle className="h-4 w-4" /> Spider mode
              </TabsTrigger>
              <TabsTrigger value="list">
                <FileSearch className="h-4 w-4" /> List mode
              </TabsTrigger>
            </TabsList>
            <TabsContent value="spider" className="space-y-3">
              <Label htmlFor="startUrl">Seed URL</Label>
              <Input
                id="startUrl"
                value={form.startUrl}
                onChange={(e) => update('startUrl', e.target.value)}
                placeholder="https://example.com"
                autoFocus
              />
              {form.startUrl && !validSimple ? (
                <p className="text-xs text-destructive">
                  URL must start with http(s) and contain a hostname.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  We'll discover pages by following links from this URL
                  {form.allowSubdomains ? ' and subdomains.' : '.'}
                </p>
              )}
            </TabsContent>
            <TabsContent value="list" className="space-y-3">
              <div>
                <Label>List of URLs</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Provide a fixed list of URLs to crawl (no link discovery).
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  value={listUrlDraft}
                  onChange={(e) => setListUrlDraft(e.target.value)}
                  placeholder="https://example.com/page"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onAddListUrl();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={onAddListUrl}>
                  <PlusCircle className="h-4 w-4" /> Add
                </Button>
              </div>
              {form.listUrls.length > 0 ? (
                <ul className="space-y-1.5 max-h-48 overflow-auto rounded-md border p-3 bg-muted/30">
                  {form.listUrls.map((u, i) => (
                    <li
                      key={`${u}-${i}`}
                      className="flex items-center justify-between gap-2 text-sm rounded-md px-2 py-1.5 bg-background"
                    >
                      <span className="truncate">{u}</span>
                      <button
                        type="button"
                        aria-label="remove"
                        onClick={() => removeListUrl(i)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div>
                <Label htmlFor="listStartUrl" className="text-xs">
                  Listing aggregation URL (used for grouping, optional)
                </Label>
                <Input
                  id="listStartUrl"
                  value={form.startUrl}
                  onChange={(e) => update('startUrl', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" /> Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RangeInput
              label="Max URLs"
              min={1}
              max={100000}
              value={form.maxUrls}
              onChange={(v) => update('maxUrls', v)}
            />
            <RangeInput
              label="Max depth"
              min={1}
              max={20}
              value={form.maxDepth}
              onChange={(v) => update('maxDepth', v)}
            />
            <RangeInput
              label="Threads"
              min={1}
              max={32}
              value={form.threads}
              onChange={(v) => update('threads', v)}
            />
            <RangeInput
              label="Near-duplicate threshold"
              min={50}
              max={100}
              value={form.nearDuplicateThreshold}
              onChange={(v) => update('nearDuplicateThreshold', v)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> Behavior
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Toggle
              label="Respect robots.txt"
              description="Don't crawl disallowed paths"
              checked={form.respectRobotsTxt}
              onChange={(v) => update('respectRobotsTxt', v)}
            />
            <Toggle
              label="Follow redirects"
              description="Track 301/302 chains"
              checked={form.followRedirects}
              onChange={(v) => update('followRedirects', v)}
            />
            <Toggle
              label="Crawl subdomains"
              description="Treat subdomains as internal"
              checked={form.allowSubdomains}
              onChange={(v) => update('allowSubdomains', v)}
            />
            <Toggle
              label="Record external outlinks"
              description="Capture links to other domains"
              checked={form.crawlExternal}
              onChange={(v) => update('crawlExternal', v)}
            />
            <Toggle
              label="Discover via XML sitemaps"
              description="Fetch and parse sitemap.xml"
              checked={form.useSitemaps}
              onChange={(v) => update('useSitemaps', v)}
            />
            <Toggle
              label="Follow canonicals"
              description="Crawl canonical URLs"
              checked={form.followCanonical}
              onChange={(v) => update('followCanonical', v)}
            />
            <Toggle
              label="Follow hreflang"
              description="Crawl alternate language URLs"
              checked={form.followHreflang}
              onChange={(v) => update('followHreflang', v)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" /> Rendering & content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Toggle
              label="Render JavaScript"
              description="Use headless Chromium for SPAs"
              checked={form.renderJs}
              onChange={(v) => update('renderJs', v)}
            />
            {form.renderJs ? (
              <RangeInput
                label="Render timeout (ms)"
                min={5000}
                max={120000}
                step={1000}
                value={form.renderTimeout}
                onChange={(v) => update('renderTimeout', v)}
              />
            ) : null}
            <Toggle
              label="Include images"
              description="Audit alt text, size & dimensions"
              checked={form.includeImages}
              onChange={(v) => update('includeImages', v)}
            />
            <Toggle
              label="Include CSS"
              description="Discover CSS links"
              checked={form.includeCss}
              onChange={(v) => update('includeCss', v)}
            />
            <Toggle
              label="Include JS"
              description="Discover JS resources"
              checked={form.includeJs}
              onChange={(v) => update('includeJs', v)}
            />
            <Toggle
              label="Include PDFs"
              description="Audit PDF file SEO"
              checked={form.includePdfs}
              onChange={(v) => update('includePdfs', v)}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI & Integrations
          </CardTitle>
          <CardDescription>
            Optional. Provide API keys to enable AI-powered recommendations or link metrics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(
              Object.keys(API_KEY_LABELS) as Array<keyof typeof API_KEY_LABELS>
            ).map((key) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key} className="text-xs flex items-center justify-between">
                  <span>{API_KEY_LABELS[key]}</span>
                  {form[key] ? <Badge variant="success">set</Badge> : null}
                </Label>
                <Input
                  id={key}
                  type="password"
                  value={form[key]}
                  onChange={(e) => update(key, e.target.value)}
                  placeholder="sk-..."
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Keys are sent only to their respective providers. Stored in memory for this crawl,
            never persisted to disk.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Binary className="h-4 w-4 text-primary" /> Advanced
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="userAgent">User agent</Label>
            <Input
              id="userAgent"
              value={form.userAgent}
              onChange={(e) => update('userAgent', e.target.value)}
              placeholder="OpenSEOCrawler/1.0"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Used for fetch + robots.txt. Default identifies the tool.
            </p>
          </div>
          <div>
            <Label>Exclude URL patterns (regex, one per line)</Label>
            <Textarea
              rows={4}
              placeholder={`^/private/\\n\\.json$`}
              defaultValue={form.excludePatterns.join('\n')}
              onBlur={(e) =>
                update(
                  'excludePatterns',
                  e.target.value
                    .split('\n')
                    .map((p) => p.trim())
                    .filter(Boolean),
                )
              }
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Toggle
              label="Detect near-duplicates"
              description={`Use shingle hashing at ${form.nearDuplicateThreshold}% similarity`}
              checked={form.enableNearDuplicates}
              onChange={(v) => update('enableNearDuplicates', v)}
            />
            <Toggle
              label="Semantic similarity"
              description="Optional AI embeddings (requires key)"
              checked={form.enableSemanticSimilarity}
              onChange={(v) => update('enableSemanticSimilarity', v)}
            />
          </div>
        </CardContent>
      </Card>

      <div
        className={cn(
          'sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl glass border border-border p-4 shadow-2xl',
        )}
      >
        <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
          {form.startUrl ? (
            <span className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> {safeHostname(form.startUrl)}
            </span>
          ) : null}
          <span>• {form.maxUrls.toLocaleString()} URL limit</span>
          <span>• depth {form.maxDepth}</span>
          <span>• {form.threads} threads</span>
          {form.renderJs ? <Badge variant="info">JS rendering</Badge> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/')} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} variant="brand" disabled={submitting || !validSimple}>
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 animate-spin" />
                Starting…
              </span>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" /> Start crawl
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RangeInput({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs font-mono tabular-nums text-muted-foreground">{value}</span>
      </div>
      <Input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
      />
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-md px-1 py-1.5 cursor-pointer">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function buildApiKeys(form: FormState) {
  const apiKeys: Record<string, string> = {};
  if (form.apiKeyOpenAI) apiKeys.openai = form.apiKeyOpenAI;
  if (form.apiKeyAnthropic) apiKeys.anthropic = form.apiKeyAnthropic;
  if (form.apiKeyGemini) apiKeys.gemini = form.apiKeyGemini;
  if (form.apiKeyKimi) apiKeys.kimi = form.apiKeyKimi;
  if (form.apiKeyMinimax) apiKeys.minimax = form.apiKeyMinimax;
  return Object.keys(apiKeys).length ? apiKeys : undefined;
}
