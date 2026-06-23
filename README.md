# Open SEO Checker

A free, open-source, cross-platform website crawler and SEO auditing tool that
replicates the core features of **Screaming Frog SEO Spider** and adds many
capabilities that Screaming Frog does not have.

- **CLI + Web UI**: One command launches a local web server and opens your browser.
- **No crawl limits**: Completely free, no paid tiers, no URL restrictions.
- **MIT licensed**: Use it personally or commercially.
- **Monorepo**: backend and frontend ship as separate pnpm packages that talk
  over HTTP and JS-rendering uses Playwright Chromium that we install at
  first-run time.

> Documentation lives in two places:
>   - This README — quickstart, features, project layout, API surface.
>   - `wiki/` — HTML guides for users (running the tool) and developers
>     (extending it). Open `wiki/index.html` directly in your browser.

## Quick Start

```bash
git clone <this-repo>
cd open-seo-checker

# Install everything (deps + Playwright Chromium browser)
pnpm install

# One of:

# Single-port production run (build, then serve API + dashboard on :7437):
pnpm build && pnpm server

# Or the dev orchestrator with live reload + bright banner:
pnpm start:sh          # alias: pnpm dev:sh

# Or just the one-click launcher that auto-builds + opens Chrome:
./open-seo-checker.sh        # macOS / Linux
open-seo-checker.bat         # Windows
```

The dashboard is served at `http://localhost:7437`. The dev orchestrator also
boots Vite on `http://localhost:5173` with `/api` proxied to the backend so
HMR works in the browser (`pnpm start:sh`). Each role prints its own
solid-colour ASCII banner: blue for the backend, magenta for the frontend:

| Origin                | Role                                            |
|-----------------------|-------------------------------------------------|
| `http://localhost:7437` | Hono API + dashboard SPA built to `/public/` |
| `http://localhost:5173` | Vite dev server (only when `pnpm start:sh`)  |

## CLI Commands

All commands are exposed via the api package's `bin` shortcut `oseo`:

| Command                                 | Description                                         |
|-----------------------------------------|-----------------------------------------------------|
| `oseo serve [--port N] [--no-open]`     | Boot the Hono API + SPA server (default port 7437)  |
| `oseo crawl <url> [--render] [--render] [--db-name] [--output]`  | One-off crawl against a single URL    |
| `oseo sitemap <url> [--output sitemap.xml]`                       | Crawl + emit a sitemap.xml stub file     |
| `oseo compare <db1> <db2>`             | Diff two crawl databases                             |
| `oseo logs <logfile> [--bot googlebot]` | Analyze a server log file for bot traffic            |
| `oseo health <db-file> [--run-id N]`   | Compute the health score for a stored run            |

Or through `pnpm` proxy scripts:

```bash
pnpm server       # equivalent to `oseo serve`
pnpm crawl        # equivalent to `oseo crawl`
```

## Monorepo Layout

```
open-seo-checker/                        ← @oseo/workspace  (orchestrator only)
├── pnpm-workspace.yaml                  ← declares packages/api, packages/web
├── tsconfig.base.json                   ← shared TS options
├── playwright.config.ts                 ← e2e tests (chrome only)
├── package.json                         ← scripts + shared devDeps

├── packages/
│   ├── api/                             ← @oseo/api  (Hono + SQLite, bin "oseo")
│   │   ├── src/
│   │   │   ├── analyzer/                ← titles, meta, headings, links, security...
│   │   │   ├── ai/                      ← OpenAI, Anthropic, Gemini, Kimi, ...
│   │   │   ├── cli/                     ← commander + banner + commands
│   │   │   ├── compare/, config/,       ←
│   │   │   ├── crawler/                 ← engine, fetcher, parser, links, robots
│   │   │   ├── ecommerce/, keywords/,
│   │   │   ├── local-seo/, llms/, scoring/, backlinks/
│   │   │   ├── exporters/               ← csv/json/xlsx/xml-exporters
│   │   │   ├── integrations/            ← GA4, GSC, PSI, Ahrefs, Majestic, Moz
│   │   │   ├── renderer/                ← playwright-based JS rendering
│   │   │   ├── scheduler/               ← cron-like recurring crawls
│   │   │   ├── server/                  ← Hono app + REST routes
│   │   │   ├── storage/                 ← SQLite schema, migrations, queries
│   │   │   ├── types/                   ← CrawlUrl, CrawlIssue, ...
│   │   │   └── utils/                   ← workspace resolver, pixel-width, ...
│   │   ├── src/__tests__/               ← vitest unit suites
│   │   ├── vitest.config.ts             ← vitest config scoped to the api
│   │   └── tsconfig.json                ← extends base
│   └── web/                             ← @oseo/web  (React 18 + Vite 6)
│       ├── src/
│       │   ├── components/              ← layout/, dashboard/, issues/, ...
│       │   ├── pages/                   ← top-level route components
│       │   ├── hooks/                   ← useApi, useDocumentTitle, ...
│       │   └── lib/                     ← api.ts, ai-settings.ts, utils.ts
│       ├── public/                      ← favicon (built asset)
│       ├── vite.config.ts               ← outDir = ../../public at workspace root
│       └── tsconfig.json                ← extends base

├── public/                              ← SPA build output (gitignored)
├── crawls/  exports/                    ← runtime artefacts (gitignored)
├── wiki/                                ← HTML doc (user + dev guide)
├── scripts/
│   ├── start.sh                         ← single-command BE+FE orchestrator
│   ├── monitor.sh                       ← second-screen tailer for start.sh logs
│   └── postinstall.mjs                  ← installs Playwright Chromium
├── open-seo-checker.sh  /  .bat         ← one-click launcher
└── README.md, PLAN.md
```

## npm Scripts

Root scripts (`package.json`):

| Command                  | Meaning                                                     |
|--------------------------|-------------------------------------------------------------|
| `pnpm build`             | `pnpm -r --filter './packages/*' build`                     |
| `pnpm build:api` / `:web` | Build only that package                                    |
| `pnpm dev`               | `concurrently` running both `dev:api` and `dev:web`        |
| `pnpm dev:api`           | tsx watch backend (Hono) only, with auto-restart          |
| `pnpm dev:web`           | Vite dev server with HMR, proxies /api to the backend    |
| `pnpm dev:sh` / `start:sh` | `bash ./start.sh` — shared wordmark + colour-tagged BE+FE logs + readiness probes + role layout + Node/pnpm auto-install (each role prints its own banner) |
| `pnpm monitor`           | `bash scripts/monitor.sh` — second-screen tailer          |
| `pnpm server`            | `pnpm --filter @oseo/api start` — run compiled API         |
| `pnpm crawl`             | `pnpm --filter @oseo/api crawl`  — run a single-shot crawl|
| `pnpm test:unit`         | vitest unit suite in `packages/api`                       |
| `pnpm test:e2e`          | Playwright e2e suite (needs a running server; set `PW_BOOT=1` to spin up `pnpm start:sh` itself) |
| `pnpm lint`              | `pnpm -r --filter './packages/*' lint`                   |

Inside each package the same scripts work via `pnpm --filter @oseo/api ...` /
`pnpm --filter @oseo/web ...`.

## Frontend Architecture

The dashboard is a single-page React app. Build pipeline:

```
packages/web  --pnpm build--->  /public/  (HTML + hashed assets)
                                  ↑
                       served by Hono on :7437
                                          (and /api/*)

packages/api  --tsc-->         /packages/api/dist/ (CLI + server JS)
                  └── exposes "oseo" binary
```

Top-level features:

- **App shell** with persistent sidebar nav, breadcrumbs, command-style
  global search and dark mode.
- **Dashboard overview** with hero health gauge, stat tiles, recent runs
  list and severity distribution chart.
- **New Crawl** wizard with full configuration (modes, depth, threads,
  behaviour, JS rendering, API keys).
- **Crawl detail** with 6 tabs: Overview, Issues, URLs, Sitemap, Compare
  and AI Insights.
- **Reports, Runs, Sitemap Studio, Compare Runs, AI Insights** as
  standalone tools.
- **Settings** for storing API keys locally (browser-only, never sent to
  the backend except the respective provider).

## Features

### Screaming Frog parity

- **Crawl Engine**: Spider + list mode, robots.txt compliance, custom
  user-agent, crawl depth, concurrency, redirects (now followed
  transparently via recursive fetcher with cycle detection), sitemaps.
- **On-Page SEO**: Page titles, meta descriptions, headings (H1/H2),
  canonicals, hreflang, pagination, images, URL structure.
- **Technical SEO**: Broken links, redirect chains/loops, internal
  linking, anchor text, security headers, mixed content, robots
  directives.
- **Rendering**: JavaScript rendering flag (Playwright), structured data
  extraction, AMP validation structure, accessibility checks.
- **Content**: Duplicate content, near-duplicate detection, word count,
  text ratio, spelling/grammar hooks, custom extraction
  (XPath / CSS / regex).
- **Integrations**: Google Analytics 4, Google Search Console,
  PageSpeed Insights, Majestic, Ahrefs, Moz.
- **AI**: OpenAI, Anthropic Claude, Google Gemini, Kimi (Moonshot),
  MiniMax, Ollama (local) support.
- **Export**: CSV, JSON, XLSX, XML sitemaps, crawl comparison,
  scheduling.

### Beyond Screaming Frog

- **Log File Analysis**: Parse server logs to find bot crawl behavior,
  orphan URLs, and crawl budget waste.
- **Backlink Analysis**: Analyze external links pointing to your domain
  from the crawl data.
- **Keyword Extraction**: Extract top keywords from titles, headings,
  and meta descriptions.
- **Content Scoring**: Score pages for content quality, keyword density,
  readability.
- **Local SEO**: NAP consistency, LocalBusiness schema, contact page
  signals.
- **E-commerce SEO**: Product / BreadcrumbList schema, faceted navigation,
  cart / checkout indexability.
- **AI Search Visibility**: `llms.txt` generation, E-E-A-T signal
  checks.
- **SEO Health Score**: Overall 0-100 score with category breakdowns.
- **Crawl Comparison**: Compare two crawl databases to see added /
  removed / changed URLs.
- **Scheduling**: Built-in cron-like scheduler for recurring audits.

## Tests

Two test layers:

```bash
pnpm test:unit        # 26 vitest specs in packages/api/src/__tests__
pnpm test:e2e         # 23 Playwright specs under tests/e2e/

# Self-bootstrapping — also spins up `pnpm start:sh`:
PW_BOOT=1 pnpm test:e2e
```

Coverage of `pnpm test:unit`:
- `analyzer-titles.test.ts` (8) – missing / too-long / too-short /
  duplicate / multi-title / title==h1.
- `analyzer-meta.test.ts`   (6) – missing / length bounds / duplicates / multi / balanced.
- `analyzer-headings.test.ts` (6) – missing-h1 / multi-h1 / dup /
  non-sequential / h1==title / long-h1.
- `analyzer-images.test.ts`  (6) – missing alt / oversized /
  missing dimensions / broken / empty alt only / no-op.

Coverage of `pnpm test:e2e`:
- **API smoke** — `/api/runs`, `/api/runs/:id`,
  `/api/runs/:id/issues`, `/api/runs/:id/urls`, `/`.
- **Dashboard SPA** — root renders with brand mark, sidebar lists
  the eight routes, click-through navigation reaches /crawl, /runs,
  /settings without errors.
- **SPA routes** — parametrised smoke for every deep route, plus
  the 404 fallback.
- **Settings / AI** — settings card and the Insights empty state.

## API Endpoints

| Method | Path                              | Purpose                            |
|--------|-----------------------------------|------------------------------------|
| GET    | `/api/health`                     | Server health check                |
| POST   | `/api/crawl`                      | Start a crawl                      |
| GET    | `/api/crawl/:id/status`           | Crawl status + progress            |
| GET    | `/api/crawl/:id/urls`             | Crawled URLs                       |
| GET    | `/api/crawl/:id/issues`           | SEO issues                         |
| GET    | `/api/crawl/:id/issues/counts`    | Issue counts                       |
| GET    | `/api/crawl/:id/url/:urlId`       | URL details with inlinks / outlinks|
| GET    | `/api/crawl/:id/sitemap`          | XML sitemap                        |
| GET    | `/api/crawl/:id/health`           | Health score                       |
| POST   | `/api/crawl/:id/export`           | Export data (csv / json / xlsx)    |
| POST   | `/api/crawl/:id/integrations`     | Trigger API integrations           |
| POST   | `/api/ai`                         | Call an LLM provider               |
| GET    | `/api/runs`                       | List all crawl runs                |

## Configuration

Crawl configuration is passed as JSON to `/api/crawl` or via CLI flags. Key
options:

- `startUrl`: Starting URL.
- `maxUrls`: Maximum URLs to crawl.
- `maxDepth`: Maximum crawl depth.
- `threads`: Concurrent workers.
- `userAgent`: Custom user agent.
- `renderJs`: Enable JavaScript rendering.
- `respectRobotsTxt`: Honor robots.txt.
- `allowSubdomains`: Treat subdomains as internal.
- `crawlExternal`: Follow and record external links.
- `followRedirects`: HTTP redirect chain handling.
- `apiKeys`: API keys for integrations and AI.
- `aiPrompts`: Custom AI prompts to run during crawl.

## Wiki

HTML documentation ships in `wiki/`:

- `wiki/index.html` — hub linking user and dev guides.
- `wiki/user-guide.html` — how a user runs and operates the dashboard.
- `wiki/dev-guide.html` — extension points, conventions, tests.
- `wiki/architecture.html` — system layout, data flow, decision log.

Open `wiki/index.html` in your browser; both guides are hosted as static
HTML so they can be served from any web server (or even double-clicked
locally without one).

## License

MIT
