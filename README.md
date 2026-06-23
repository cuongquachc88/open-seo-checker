# Open SEO Checker

A free, open-source, cross-platform website crawler and SEO auditing tool that replicates the core features of **Screaming Frog SEO Spider** and adds many capabilities that Screaming Frog does not have.

- **CLI + Web UI**: One command launches a local web server and opens your browser.
- **No crawl limits**: Completely free, no paid tiers, no URL restrictions.
- **MIT licensed**: Use it personally or commercially.

## Quick Start

```bash
# Install dependencies
pnpm install

# Build the project
npm run build

# Launch the web UI (auto-opens browser)
./open-seo-checker.sh          # macOS / Linux
open-seo-checker.bat          # Windows

# Or run the CLI directly
node dist/index.js crawl https://example.com --output report.csv
```

The web UI runs at `http://localhost:7437` by default.

## CLI Commands

```bash
node dist/index.js crawl <url> [options]
node dist/index.js serve [--port 7437]
node dist/index.js sitemap <url> [options]
node dist/index.js compare <db1> <db2> [--mapping file.json]
node dist/index.js logs <logfile> [--bot googlebot]
node dist/index.js health <db-file> [--run-id 1]
```

## Technology Stack

- **Runtime**: Node.js + TypeScript
- **Web Server**: Hono
- **HTTP Client**: undici
- **HTML Parsing**: cheerio
- **JavaScript Rendering**: Playwright (Chromium) - flag available
- **Database**: SQLite (better-sqlite3)
- **Frontend**: Vanilla HTML + Tailwind CSS (CDN)
- **Export**: CSV, JSON, XLSX, XML sitemaps

## Features

### Screaming Frog Parity

- **Crawl Engine**: Spider + list mode, robots.txt compliance, custom user-agent, crawl depth, concurrency, redirects, sitemaps.
- **On-Page SEO**: Page titles, meta descriptions, headings (H1/H2), canonicals, hreflang, pagination, images, URL structure.
- **Technical SEO**: Broken links, redirect chains/loops, internal linking, anchor text, security headers, mixed content, robots directives.
- **Rendering**: JavaScript rendering flag (Playwright), structured data extraction, AMP validation structure, accessibility checks.
- **Content**: Duplicate content, near-duplicate detection, word count, text ratio, spelling/grammar hooks, custom extraction (XPath/CSS/regex).
- **Integrations**: Google Analytics 4, Google Search Console, PageSpeed Insights, Majestic, Ahrefs, Moz.
- **AI**: OpenAI, Anthropic Claude, Google Gemini, Kimi (Moonshot), MiniMax, Ollama (local) support.
- **Export**: CSV, JSON, XLSX, XML sitemaps, crawl comparison, scheduling.

### Beyond Screaming Frog

- **Log File Analysis**: Parse server logs to find bot crawl behavior, orphan URLs, and crawl budget waste.
- **Backlink Analysis**: Analyze external links pointing to your domain from the crawl data.
- **Keyword Extraction**: Extract top keywords from titles, headings, and meta descriptions.
- **Content Scoring**: Score pages for content quality, keyword density, and readability.
- **Local SEO**: NAP consistency, LocalBusiness schema, contact page signals.
- **E-commerce SEO**: Product/BreadcrumbList schema, faceted navigation, cart/checkout indexability.
- **AI Search Visibility**: llms.txt generation, E-E-A-T signal checks.
- **SEO Health Score**: Overall 0-100 score with category breakdowns.
- **Crawl Comparison**: Compare two crawl databases to see added/removed/changed URLs.
- **Scheduling**: Built-in cron-like scheduler for recurring audits.

## Project Structure

```
open-seo-checker/
├── src/
│   ├── analyzer/          # SEO analysis modules
│   ├── ai/                # LLM provider integrations
│   ├── cli/               # CLI commands
│   ├── compare/           # Crawl comparison
│   ├── config/            # Default crawl configuration
│   ├── crawler/           # Crawl engine, fetcher, parser
│   ├── ecommerce/         # E-commerce SEO audits
│   ├── exporters/         # CSV, JSON, XLSX, sitemap generators
│   ├── health-score.ts    # Overall health score calculation
│   ├── integrations/      # Google APIs, Majestic, Ahrefs, Moz
│   ├── keywords/          # Keyword extraction
│   ├── local-seo/         # Local SEO audits
│   ├── llms/              # llms.txt support
│   ├── backlinks/         # Backlink analysis
│   ├── scoring/           # Content scoring
│   ├── scheduler/         # Cron-like scheduler
│   ├── server/            # Hono web server + API routes
│   ├── storage/           # SQLite database layer
│   ├── types/             # TypeScript types
│   └── utils/             # URL, pixel-width, hash utilities
├── public/                # Web UI static files
├── crawls/                # SQLite crawl databases
├── scripts/               # Build/postinstall scripts
├── open-seo-checker.sh    # macOS/Linux launcher
├── open-seo-checker.bat   # Windows launcher
└── package.json
```

## Development

```bash
# Run in development mode with auto-reload (tsx)
npm run dev

# Type-check
npx tsc --noEmit

# Build for production
npm run build

# Run tests (when tests are added)
npm test
```

## API Endpoints

The web server exposes these REST endpoints:

- `GET /api/health` - Server health check
- `POST /api/crawl` - Start a crawl
- `GET /api/crawl/:id/status` - Crawl status + progress
- `GET /api/crawl/:id/urls` - Crawled URLs
- `GET /api/crawl/:id/issues` - SEO issues
- `GET /api/crawl/:id/issues/counts` - Issue counts
- `GET /api/crawl/:id/url/:urlId` - URL details with inlinks/outlinks
- `GET /api/crawl/:id/sitemap` - XML sitemap
- `GET /api/crawl/:id/health` - Health score
- `POST /api/crawl/:id/export` - Export data (csv/json/xlsx)
- `POST /api/crawl/:id/integrations` - Trigger API integrations
- `POST /api/ai` - Call an LLM provider
- `GET /api/runs` - List all crawl runs

## Configuration

Crawl configuration is passed as JSON to `/api/crawl` or via CLI flags. Key options:

- `startUrl`: Starting URL
- `maxUrls`: Maximum URLs to crawl
- `maxDepth`: Maximum crawl depth
- `threads`: Concurrent workers
- `userAgent`: Custom user agent
- `renderJs`: Enable JavaScript rendering
- `respectRobotsTxt`: Honor robots.txt
- `allowSubdomains`: Treat subdomains as internal
- `crawlExternal`: Follow and record external links
- `apiKeys`: API keys for integrations and AI
- `aiPrompts`: Custom AI prompts to run during crawl

## License

MIT
