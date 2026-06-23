import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Bell,
  Moon,
  Sun,
  Search,
  Github,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { cn, safeHostname } from '@/lib/utils';

interface Crumb {
  label: string;
  to?: string;
}

function useBreadcrumbs(): Crumb[] {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);
  const crumbs: Crumb[] = [{ label: 'Dashboard', to: '/' }];
  if (parts.length === 0) return crumbs;
  const labels: Record<string, string> = {
    crawl: 'New Crawl',
    runs: 'Crawl Runs',
    sitemap: 'Sitemap Studio',
    compare: 'Compare Runs',
    insights: 'AI Insights',
    settings: 'Settings',
    reports: 'Reports',
  };
  let path = '';
  parts.forEach((segment, index) => {
    path += `/${segment}`;
    const isLast = index === parts.length - 1;
    const label = labels[segment] ?? (isLast && /^\d+$/.test(segment) ? `Run #${segment}` : segment);
    crumbs.push({ label, to: isLast ? undefined : path });
  });
  return crumbs;
}

const KEY = 'oseo.theme';

export function TopBar() {
  const crumbs = useBreadcrumbs();
  const navigate = useNavigate();
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return (localStorage.getItem(KEY) as 'light' | 'dark') ?? 'light';
  });

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(KEY, theme);
  }, [theme]);

  const [query, setQuery] = React.useState('');
  const [searchError, setSearchError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      setSearchError(null);
      await api.health();
      if (/^https?:\/\//.test(query)) {
        const host = safeHostname(query);
        const config = {
          startUrl: query,
          maxUrls: 200,
          maxDepth: 3,
        };
        void host;
        sessionStorage.setItem('oseo.seedCrawl', JSON.stringify(config));
        navigate('/crawl?seed=1');
      } else {
        navigate(`/runs?q=${encodeURIComponent(query.trim())}`);
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Server unreachable');
    }
  };

  return (
    <header className="sticky top-0 z-30 glass border-b border-border">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        <nav aria-label="Breadcrumb" className="hidden md:flex items-center text-sm font-medium">
          {crumbs.map((crumb, idx) => {
            const isLast = idx === crumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 ? (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mx-2" />
                ) : null}
                {crumb.to ? (
                  <Link
                    to={crumb.to}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={cn(isLast ? 'text-foreground' : 'text-muted-foreground')}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        <form
          onSubmit={onSubmit}
          className="ml-auto flex-1 max-w-md hidden sm:block"
        >
          <label className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search runs, or paste a URL to start a crawl…"
              className="pl-9 pr-12"
            />
            {query ? (
              <kbd className="absolute right-2 hidden md:inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                Enter
              </kbd>
            ) : null}
          </label>
          {searchError ? (
            <p className="mt-1 text-[11px] text-destructive">{searchError}</p>
          ) : null}
        </form>

        <div className="ml-auto sm:ml-0 flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors p-2 hidden sm:inline-flex"
            aria-label="GitHub repository"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
