# Open SEO Checker - Master Plan

A comprehensive, open-source, cross-platform website crawler and SEO auditing tool that replicates **all features of Screaming Frog SEO Spider (v24)** and adds powerful capabilities that Screaming Frog lacks.

**Architecture:** CLI tool that starts a local web server and auto-opens the browser for UI. One command (`./open-seo-checker.sh` or `open-seo-checker.bat`) launches everything.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Project Structure](#project-structure)
5. [Phase 1: Core Crawl Engine](#phase-1-core-crawl-engine-screaming-frog-parity)
6. [Phase 2: On-Page SEO Auditing](#phase-2-on-page-seo-auditing-screaming-frog-parity)
7. [Phase 3: Technical SEO & Site Structure](#phase-3-technical-seo--site-structure-screaming-frog-parity)
8. [Phase 4: Rendering & JavaScript](#phase-4-rendering--javascript-screaming-frog-parity)
9. [Phase 5: Integrations & API Connections](#phase-5-integrations--api-connections-screaming-frog-parity)
10. [Phase 6: Content Analysis & AI](#phase-6-content-analysis--ai-screaming-frog-parity)
11. [Phase 7: Data, Export & Reporting](#phase-7-data-export--reporting-screaming-frog-parity)
12. [Phase 8: Features BEYOND Screaming Frog](#phase-8-features-beyond-screaming-frog-new-tools)
13. [Development Roadmap](#development-roadmap)
14. [Feature Comparison Matrix](#feature-comparison-matrix)

---

## 1. Project Overview

**Goal:** Build a free, open-source, cross-platform (Windows, macOS, Linux) CLI + Web UI SEO auditing tool that matches Screaming Frog's full feature set and goes beyond it with backlink analysis, keyword research, rank tracking, AI-powered recommendations, log file analysis, content scoring, local SEO auditing, and more.

**How it works:**
1. User runs `./open-seo-checker.sh` (macOS/Linux) or `open-seo-checker.bat` (Windows)
2. The script starts a local Node.js web server on `http://localhost:7437`
3. The script auto-opens the default browser to that URL
4. User interacts with the full SEO checker UI in the browser
5. CLI mode also available: `npx open-seo-checker crawl https://example.com --output report.csv`

**License:** MIT (fully open source, no crawl limits, no paywalls)

---

## 2. Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Core language | **TypeScript (Node.js)** | Single language for CLI, backend, crawler, and frontend tooling. Excellent async/concurrency for crawling. Rich ecosystem. |
| Web server | **Hono** | Ultra-lightweight, fast, TypeScript-native, simple routing. Alternative: Fastify. |
| HTTP client (crawler) | `undici` (Node.js built-in) | High-performance HTTP/1.1 + HTTP/2 client, native to Node.js |
| HTML parsing | `cheerio` + `linkedom` | cheerio for jQuery-like CSS selectors, linkedom for DOM-compliant parsing |
| JavaScript rendering | **Playwright** (Chromium) | Best headless browser automation, native TypeScript, screenshot + rendering + custom JS execution |
| Storage engine | **SQLite** via `better-sqlite3` | Embedded, fast, handles millions of rows, no external DB needed |
| Frontend | **Vanilla HTML + Tailwind CSS** | Simplest possible frontend, no build step complexity, fast load, easy to maintain |
| Frontend interactivity | Vanilla TypeScript (ES modules) + minimal Alpine.js | Lightweight reactivity without a framework |
| Charts/visualizations | D3.js + vis.js (via CDN) | Interactive crawl maps, tree graphs, force-directed diagrams |
| CLI framework | `commander` | Full-featured CLI with subcommands, flags, help text |
| AI integration | OpenAI / Anthropic / Gemini / Ollama SDKs | Custom AI prompts during crawl |
| Export | CSV (csv-stringify), JSON, XLSX (exceljs), XML | Multiple export formats |
| Process launcher | Shell script (.sh) + Batch script (.bat) | One-command launch: start server + open browser |
| Testing | Vitest (unit) + Playwright (E2E) | Fast TypeScript-native testing |
| Launcher | Shell script (.sh) + Batch script (.bat) | One-command: start server + open browser |
| Package manager | pnpm | Fast, disk-efficient, workspace support |

### Why Node.js + TypeScript over Rust?

| Factor | Node.js/TS | Rust |
|--------|-----------|------|
| Development speed | Fast (dynamic, rich ecosystem) | Slower (compile times, stricter) |
| JS rendering | Playwright (native TS bindings) | CDP bindings (more manual work) |
| HTML parsing | cheerio (mature, easy) | scraper (good but less ergonomic) |
| Web server | Trivial (Hono/Express) | Good (Axum) but more boilerplate |
| Concurrency | Event loop + worker threads | Tokio async (excellent) |
| Memory for 1M+ URLs | Needs careful management | Naturally efficient |
| Ecosystem for SEO | npm: cheerio, playwright, robots-parser, etc. | crates.io: fewer SEO-specific libs |
| Learning curve | Lower | Higher |
| Frontend sharing | TypeScript shared types | Need separate TS frontend anyway |

**Decision:** Node.js/TypeScript for faster development and simpler architecture. Performance is sufficient for most crawl sizes. For extreme scale (10M+ URLs), worker threads + SQLite disk spill handle memory. If needed later, the crawl engine can be rewritten in Rust as a native addon.

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    User's Machine                             │
│                                                               │
│  ./open-seo-checker.sh (or .bat)                              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  1. Start Node.js server (localhost:7437)              │  │
│  │  2. Auto-open browser to http://localhost:7437         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────┐     ┌──────────────────────────────────┐  │
│  │   Browser       │     │     Node.js Server (TS)         │  │
│  │  (any browser)  │◄───►│                                  │  │
│  │                 │HTTP │  ┌──────────┐ ┌──────────────┐  │  │
│  │  Vanilla HTML   │/WS  │  │  Hono    │ │  CLI         │  │  │
│  │  + Tailwind     │     │  │  Router  │ │  (commander) │  │  │
│  │  + D3.js        │     │  └────┬─────┘ └──────┬───────┘  │  │
│  │  + Alpine.js    │     │       │              │           │  │
│  └────────────────┘     │  ┌────┴──────────────┴────────┐  │  │
│                         │  │      Core Engine (TS)       │  │  │
│                         │  │  ┌─────────┐ ┌───────────┐  │  │  │
│                         │  │  │ Crawler │ │ Analyzer  │  │  │  │
│                         │  │  │ Engine  │ │ Engine    │  │  │  │
│                         │  │  └────┬────┘ └─────┬─────┘  │  │  │
│                         │  │  ┌────┴───────────┴──────┐  │  │  │
│                         │  │  │   Playwright (Chromium)│  │  │  │
│                         │  │  │   for JS Rendering     │  │  │  │
│                         │  │  └────────────────────────┘  │  │  │
│                         │  │  ┌────────────────────────┐  │  │  │
│                         │  │  │  SQLite (better-sqlite3)│  │  │  │
│                         │  │  │  + disk spill for large │  │  │  │
│                         │  │  └────────────────────────┘  │  │  │
│                         │  └──────────────────────────────┘  │  │
│                         └──────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### How It Works

```
User runs:  ./open-seo-checker.sh

  │
  ├─► Node.js starts Hono web server on port 7437
  │    ├─► Serves static frontend (HTML + Tailwind + JS) from /public
  │    ├─► REST API endpoints (/api/crawl, /api/data, /api/export, etc.)
  │    └─► WebSocket for real-time crawl progress updates
  │
  ├─► Script opens default browser to http://localhost:7437
  │
  └─► User sees Web UI in browser:
       ├─► Enter URL, configure crawl settings
       ├─► Click "Start Crawl" → POST /api/crawl
       ├─► WebSocket streams progress (URLs crawled, errors found)
       ├─► View results in tabs (Internal, External, Titles, etc.)
       ├─→ Filter, sort, search data tables
       ├─→ Click URL for detail view (source, headers, rendered, screenshots)
       ├─→ Export to CSV/JSON/XLSX
       └─→ Generate XML sitemaps
```

### CLI Mode (headless, no UI)

```bash
# Crawl and export
npx open-seo-checker crawl https://example.com --output report.csv

# Crawl with rendering
npx open-seo-checker crawl https://example.com --render --output report.json

# Crawl with specific settings
npx open-seo-checker crawl https://example.com \
  --max-urls 10000 \
  --threads 20 \
  --user-agent "Googlebot" \
  --follow-sitemaps \
  --export-format csv,xlsx,json \
  --output-dir ./reports/

# Compare two crawls
npx open-seo-checker compare crawl-1.db crawl-2.db --output diff.csv

# Generate sitemap
npx open-seo-checker sitemap https://example.com --output sitemap.xml

# Start web UI server only (no auto-browser)
npx open-seo-checker serve --port 7437

# Analyze log files
npx open-seo-checker logs /var/log/nginx/access.log --bot googlebot
```

### Key Modules

- **Crawler Engine:** Async breadth-first crawler using `undici` HTTP client, configurable concurrency via worker pool, robots.txt parser, URL frontier/queue, deduplication, crawl depth control
- **Analyzer Engine:** Post-crawl analysis pass (duplicates, similarity, link score, spelling/grammar, structured data validation, accessibility)
- **Renderer Module:** Playwright (Chromium) integration for JS rendering, screenshot capture, custom JS execution
- **Integration Module:** GA4, GSC, PSI, Majestic, Ahrefs, Moz API connectors
- **AI Engine:** LLM-powered prompts for content analysis, meta tag generation, issue recommendations
- **Export Engine:** CSV, XLSX, JSON, XML sitemap, PDF report generation
- **Scheduler:** Cron-like scheduling for recurring audits
- **Comparison Engine:** Diff two crawls, staging vs production URL mapping

---

## Project Structure

```
open-seo-checker/
├── open-seo-checker.sh              # Linux/macOS launcher (start server + open browser)
├── open-seo-checker.bat             # Windows launcher
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── README.md
│
├── src/                             # TypeScript backend source
│   ├── index.ts                     # Entry point: CLI parse + start server or run headless
│   ├── cli/                         # CLI commands (commander)
│   │   ├── commands/
│   │   │   ├── crawl.ts             # `crawl <url>` - headless crawl + export
│   │   │   ├── serve.ts             # `serve` - start web server
│   │   │   ├── compare.ts           # `compare <db1> <db2>` - diff crawls
│   │   │   ├── sitemap.ts           # `sitemap <url>` - generate sitemap
│   │   │   └── logs.ts              # `logs <file>` - log file analysis
│   │   └── index.ts
│   │
│   ├── server/                      # Web server (Hono)
│   │   ├── app.ts                   # Hono app setup, routes, middleware
│   │   ├── routes/
│   │   │   ├── crawl.ts             # POST /api/crawl - start crawl
│   │   │   ├── data.ts              # GET /api/data/:tab - get tab data
│   │   │   ├── url.ts               # GET /api/url/:id - URL details
│   │   │   ├── export.ts            # POST /api/export - export data
│   │   │   ├── sitemap.ts           # POST /api/sitemap - generate sitemap
│   │   │   ├── config.ts            # GET/POST /api/config - crawl config
│   │   │   ├── compare.ts           # POST /api/compare - compare crawls
│   │   │   └── issues.ts            # GET /api/issues - issues summary
│   │   ├── websocket.ts             # WebSocket for real-time crawl progress
│   │   └── static.ts                # Serve frontend static files
│   │
│   ├── crawler/                     # Crawl engine
│   │   ├── engine.ts                # Main crawl orchestrator
│   │   ├── frontier.ts              # URL queue/frontier management
│   │   ├── fetcher.ts               # HTTP fetcher (undici)
│   │   ├── parser.ts                # HTML parser (cheerio/linkedom)
│   │   ├── links.ts                 # Link extraction (a, img, link, script, etc.)
│   │   ├── robots.ts                # robots.txt parser and checker
│   │   ├── sitemap-parser.ts        # XML sitemap parser
│   │   ├── auth.ts                  # Forms-based authentication
│   │   ├── proxy.ts                 # Proxy management
│   │   └── worker-pool.ts           # Concurrent worker management
│   │
│   ├── renderer/                    # JavaScript rendering
│   │   ├── playwright.ts            # Playwright/Chromium integration
│   │   ├── screenshot.ts            # Screenshot capture
│   │   ├── custom-js.ts             # Custom JS execution
│   │   └── resource-tracker.ts      # Track loaded resources, blocked resources
│   │
│   ├── analyzer/                    # SEO analysis engine
│   │   ├── titles.ts                # Page title analysis
│   │   ├── meta.ts                  # Meta description analysis
│   │   ├── headings.ts              # H1/H2 analysis
│   │   ├── urls.ts                  # URL structure analysis
│   │   ├── canonicals.ts            # Canonical analysis
│   │   ├── hreflang.ts              # hreflang analysis
│   │   ├── pagination.ts            # rel next/prev analysis
│   │   ├── directives.ts            # Meta robots / X-Robots-Tag
│   │   ├── images.ts                # Image analysis
│   │   ├── redirects.ts             # Redirect chain/loop detection
│   │   ├── broken-links.ts          # Broken link detection
│   │   ├── internal-links.ts        # Internal linking + Link Score (PageRank)
│   │   ├── anchor-text.ts           # Anchor text analysis
│   │   ├── security.ts              # Security headers analysis
│   │   ├── duplicates.ts            # Duplicate content (MD5 + near-duplicate)
│   │   ├── content.ts               # Word count, readability, text ratio
│   │   ├── structured-data.ts       # Schema.org extraction + validation
│   │   ├── amp.ts                   # AMP validation
│   │   ├── accessibility.ts         # AXE accessibility audit
│   │   ├── spelling-grammar.ts      # Spelling & grammar checks
│   │   ├── custom-extraction.ts     # XPath/CSS/regex extraction
│   │   ├── custom-search.ts         # Source code search
│   │   ├── ngrams.ts                # N-gram analysis
│   │   ├── indexability.ts          # Indexability calculation
│   │   └── issues.ts                # 300+ issue definitions + detection
│   │
│   ├── integrations/                # External API integrations
│   │   ├── ga4.ts                   # Google Analytics 4 API
│   │   ├── gsc.ts                   # Google Search Console API
│   │   ├── psi.ts                   # PageSpeed Insights API
│   │   ├── majestic.ts              # Majestic API
│   │   ├── ahrefs.ts                # Ahrefs API
│   │   ├── moz.ts                   # Moz API
│   │   └── oauth.ts                 # OAuth2 flow for Google APIs
│   │
│   ├── ai/                          # AI integration
│   │   ├── openai.ts                # OpenAI API
│   │   ├── anthropic.ts             # Anthropic Claude API
│   │   ├── gemini.ts                # Google Gemini API
│   │   ├── ollama.ts                # Ollama (local LLM)
│   │   ├── prompts.ts               # Prompt templates
│   │   └── recommendations.ts       # AI issue recommendations
│   │
│   ├── exporters/                   # Data export
│   │   ├── csv.ts                   # CSV exporter
│   │   ├── xlsx.ts                  # Excel exporter
│   │   ├── json.ts                  # JSON exporter
│   │   ├── sitemap-xml.ts           # XML sitemap generator
│   │   └── pdf.ts                   # PDF report generator
│   │
│   ├── storage/                     # Data persistence
│   │   ├── database.ts              # SQLite connection + migrations
│   │   ├── schema.ts                # Table schemas
│   │   ├── repositories/
│   │   │   ├── urls.ts              # URL CRUD
│   │   │   ├── links.ts             # Link CRUD
│   │   │   ├── issues.ts            # Issue CRUD
│   │   │   └── crawl-config.ts      # Crawl config CRUD
│   │   └── spill.ts                 # Disk spill for large crawls
│   │
│   ├── scheduler/                   # Crawl scheduling
│   │   └── cron.ts                  # Cron-like scheduler
│   │
│   ├── compare/                     # Crawl comparison
│   │   ├── diff.ts                  # Diff two crawl databases
│   │   └── url-mapping.ts           # URL mapping (staging vs prod)
│   │
│   └── utils/                       # Shared utilities
│       ├── url.ts                   # URL normalization, encoding
│       ├── pixel-width.ts           # Pixel width calculation for titles/descriptions
│       ├── hash.ts                  # MD5 hashing
│       ├── similarity.ts            # Similarity algorithms (SimHash, cosine)
│       └── logger.ts                # Logging utility
│
├── public/                          # Frontend (served as static files)
│   ├── index.html                   # Main page (single-page app)
│   ├── tailwind.css                 # Compiled Tailwind CSS
│   ├── js/                          # Vanilla TypeScript (compiled to JS)
│   │   ├── app.ts                   # Main app initialization
│   │   ├── api.ts                   # API client (fetch wrapper)
│   │   ├── websocket.ts             # WebSocket client for live progress
│   │   ├── components/              # UI components (vanilla TS + Alpine.js)
│   │   │   ├── tabs.ts              # Tab navigation
│   │   │   ├── data-table.ts        # Sortable, filterable data table
│   │   │   ├── crawl-form.ts        # Crawl configuration form
│   │   │   ├── url-detail.ts        # URL detail panel
│   │   │   ├── issues-dashboard.ts  # Issues overview dashboard
│   │   │   ├── serp-preview.ts      # SERP snippet preview
│   │   │   ├── visualizations.ts    # D3.js crawl maps, tree graphs
│   │   │   ├── export-dialog.ts     # Export dialog
│   │   │   └── progress-bar.ts      # Live crawl progress
│   │   └── pages/                   # Page views
│   │       ├── overview.ts          # Overview / Issues page
│   │       ├── internal.ts          # Internal URLs tab
│   │       ├── external.ts          # External URLs tab
│   │       ├── response-codes.ts    # Response codes tab
│   │       ├── titles.ts            # Page titles tab
│   │       ├── meta.ts              # Meta descriptions tab
│   │       ├── headings.ts          # H1/H2 tab
│   │       ├── urls.ts              # URL issues tab
│   │       ├── content.ts           # Content tab
│   │       ├── images.ts            # Images tab
│   │       ├── canonicals.ts        # Canonicals tab
│   │       ├── hreflang.ts          # hreflang tab
│   │       ├── directives.ts        # Directives tab
│   │       ├── links.ts             # Links tab
│   │       ├── security.ts          # Security tab
│   │       ├── sitemaps.ts          # Sitemaps tab
│   │       ├── structured-data.ts   # Structured data tab
│   │       ├── pagespeed.ts         # PageSpeed tab
│   │       ├── accessibility.ts     # Accessibility tab
│   │       └── ...                  # More tabs as needed
│   └── vendor/                      # Third-party libs (CDN fallbacks)
│       ├── d3.min.js
│       ├── vis-network.min.js
│       └── alpine.min.js
│
├── scripts/                         # Build/utility scripts
│   ├── build.sh                     # Build TS + compile Tailwind
│   ├── build.bat                    # Windows build
│   └── postinstall.ts               # Install Playwright browsers
│
├── tests/                           # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── crawls/                          # Default crawl data storage (SQLite DBs)
    └── .gitkeep
```

### Launcher Scripts

**`open-seo-checker.sh` (macOS/Linux):**
```bash
#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
node dist/index.js serve --port 7437 &
SERVER_PID=$!
sleep 1
# Open default browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:7437
elif command -v open &> /dev/null; then
    open http://localhost:7437
fi
wait $SERVER_PID
```

**`open-seo-checker.bat` (Windows):**
```batch
@echo off
cd /d "%~dp0"
start /b node dist\index.js serve --port 7437
timeout /t 2 /nobreak >nul
start http://localhost:7437
```

---

## Phase 1: Core Crawl Engine (Screaming Frog Parity)

### 1.1 Spider Mode (Site Crawl)
- [ ] Breadth-first crawl from a starting URL
- [ ] Configurable crawl depth limit
- [ ] Configurable max URLs limit (default: unlimited)
- [ ] Multi-threaded async crawling with configurable workers
- [ ] URL deduplication (normalized URL matching)
- [ ] Subdomain handling (crawl same subdomain / crawl all subdomains / crawl all subdomains + root domain)
- [ ] CDN detection and mapping (treat CDN URLs as internal)
- [ ] robots.txt parsing, compliance, and custom robots.txt override
- [ ] Crawl-delay support from robots.txt
- [ ] URL frontier queue with priority handling
- [ ] Retry logic for 429 (rate limit), 500, 503 errors with exponential backoff
- [ ] Connection timeout, response timeout configuration
- [ ] HTTP/1.1 and HTTP/2 support
- [ ] Custom User-Agent (presets: Googlebot, Bingbot, AI crawlers like GPTBot/ClaudeBot, custom)
- [ ] Custom HTTP headers (Accept-Language, Cookie, Authorization, etc.)
- [ ] Forms-based authentication (login form submission before crawl)
- [ ] Cookie management and persistence
- [ ] Proxy support (HTTP, HTTPS, SOCKS5)
- [ ] Query string / parameter handling (strip, strip-but-keep-first, etc.)
- [ ] Regex URL include/exclude filters
- [ ] Crawl file types configuration (HTML, JS, CSS, images, PDF, Flash, other)

### 1.2 List Mode (URL List Crawl)
- [ ] Upload a list of URLs to crawl (CSV, TXT, pasted)
- [ ] Crawl uploaded list without spidering/following links
- [ ] URL mapping for staging vs production comparison

### 1.3 Response Handling
- [ ] HTTP status code capture (2XX, 3XX, 4XX, 5XX)
- [ ] Response time measurement (TTFB, total download time)
- [ ] Content-Type detection and validation
- [ ] Content-Length / transferred bytes tracking
- [ ] HTTP headers capture (full headers stored)
- [ ] Last-Modified header capture
- [ ] HTTP version detection (HTTP/1.1, HTTP/2)
- [ ] Redirect following and chain detection
- [ ] HSTS policy detection and local redirect simulation
- [ ] GZIP/Brotli compression detection (transferred vs uncompressed size)

### 1.4 Link Discovery
- [ ] `<a href>` links (internal and external)
- [ ] `<img src>` links
- [ ] `<link>` elements (stylesheet, canonical, next, prev, alternate/hreflang)
- [ ] `<script src>` links
- [ ] `<iframe src>` links
- [ ] `<form action>` URLs
- [ ] `<meta http-equiv="refresh">` redirect targets
- [ ] `<object>`, `<embed>` resource URLs
- [ ] CSS `url()` references (background images, fonts)
- [ ] Source maps
- [ ] `<video>` and `<audio>` source URLs
- [ ] Data URI detection
- [ ] Mailto / tel / other protocol handling

---

## Phase 2: On-Page SEO Auditing (Screaming Frog Parity)

### 2.1 Page Titles
- [ ] Extract title tag(s) (up to 2)
- [ ] Character length measurement
- [ ] Pixel width calculation (approximate SERP truncation)
- [ ] Detect: missing, duplicate, over 60 chars, below 30 chars, over X pixels, below X pixels, multiple titles, same as H1, outside `<head>`
- [ ] Title 2 (second title element) extraction

### 2.2 Meta Descriptions
- [ ] Extract meta description(s) (up to 2)
- [ ] Character length measurement
- [ ] Pixel width calculation
- [ ] Detect: missing, duplicate, over 155 chars, below 70 chars, over X pixels, below X pixels, multiple, outside `<head>`

### 2.3 Meta Keywords
- [ ] Extract meta keywords (up to 2)
- [ ] Detect: missing, duplicate, multiple

### 2.4 Headings (H1, H2)
- [ ] Extract H1(s) (up to 2) and H2(s) (up to 2), with total occurrence count
- [ ] Character length for each
- [ ] H1 issues: missing, duplicate, over 70 chars, multiple, alt text in H1, non-sequential (H1 not first heading)
- [ ] H2 issues: missing, duplicate, over 70 chars, multiple, non-sequential
- [ ] Heading hierarchy validation (H1 -> H2 -> H3 logical order)

### 2.5 URL Analysis
- [ ] URL length measurement
- [ ] Non-ASCII characters detection
- [ ] Underscores in URL
- [ ] Uppercase characters in URL
- [ ] Multiple slashes in path
- [ ] Repetitive path segments
- [ ] Spaces in URL
- [ ] Internal search URL detection
- [ ] URL parameters detection (`?`, `&`)
- [ ] Broken bookmarks (fragment `#id` without matching element ID)
- [ ] GA tracking parameters (`utm_`, `_ga`, `_gl`)
- [ ] URLs over 115 characters
- [ ] URL-encoded address display

### 2.6 Canonicals
- [ ] Extract canonical link element (`<link rel="canonical">`)
- [ ] Extract HTTP header canonical (`Link: <url>; rel="canonical"`)
- [ ] Detect: missing canonical, self-referencing canonical, canonical to different URL, multiple canonicals, canonical to non-200 URL, canonical chain, canonical to HTTP from HTTPS, canonical to different domain
- [ ] Canonical vs hreflang consistency

### 2.7 Pagination
- [ ] Extract `rel="next"` and `rel="prev"` (HTML link elements)
- [ ] Extract HTTP `rel="next"` and `rel="prev"` (Link headers)
- [ ] Detect: missing next/prev, broken pagination chains, rel next/prev to non-200, paginated URL canonical issues

### 2.8 Directives (Meta Robots & X-Robots-Tag)
- [ ] Extract meta robots directives (noindex, nofollow, none, nosnippet, noarchive, noimageindex, unavailable_after, max-snippet, max-image-preview, max-video-preview)
- [ ] Extract X-Robots-Tag HTTP header directives
- [ ] Extract meta refresh
- [ ] Indexability calculation (indexable vs non-indexable with reason: blocked by robots.txt, noindex, canonicalised, redirect, 4XX/5XX, paginated, etc.)

### 2.9 hreflang Attributes
- [ ] Extract hreflang link elements and HTTP headers
- [ ] Detect: missing return tags, inconsistent language codes, incorrect language/region codes, non-200 hreflang targets, missing hreflang on canonical, hreflang to non-indexable URLs, missing x-default
- [ ] Validate ISO 639-1 language and ISO 3166-1 alpha-2 region codes
- [ ] hreflang coverage report

### 2.10 Images
- [ ] Discover all images (HTML `<img>`, CSS background, `<picture>`, `<source>`)
- [ ] Extract alt text
- [ ] Detect: missing alt text, oversized images (file size and dimensions), missing width/height attributes, background images, images over X KB
- [ ] Image format detection (JPEG, PNG, GIF, WebP, AVIF, SVG)
- [ ] Image dimensions extraction
- [ ] Broken image detection

---

## Phase 3: Technical SEO & Site Structure (Screaming Frog Parity)

### 3.1 Broken Links & Errors
- [ ] 404 and 4XX client error detection with source URLs
- [ ] 5XX server error detection
- [ ] No response (DNS failure, connection timeout, connection refused, connection error)
- [ ] Broken links report with inlink source pages
- [ ] Bulk export of errors with source URLs

### 3.2 Redirects
- [ ] 301 (permanent) and 302 (temporary) redirect detection
- [ ] JavaScript redirect detection (rendering mode)
- [ ] Meta refresh redirect detection
- [ ] HTTP refresh redirect detection
- [ ] HSTS policy redirect detection
- [ ] Redirect chain detection (all hops)
- [ ] Redirect loop detection
- [ ] Redirect chain/loop export report
- [ ] Redirect mapping (upload list of old -> new URLs)

### 3.3 Blocked URLs & Resources
- [ ] URLs blocked by robots.txt
- [ ] Resources blocked by robots.txt (JS, CSS, images)
- [ ] Blocked resource detection (rendering mode)
- [ ] robots.txt tester (test any URL against rules)
- [ ] Custom robots.txt editor and tester

### 3.4 Internal Linking Analysis
- [ ] Inlinks count per URL (total and unique)
- [ ] Outlinks count per URL (total and unique)
- [ ] Internal Link Score (PageRank-like algorithm, 0-100 scale)
- [ ] Crawl depth per URL (clicks from start page)
- [ ] Folder depth per URL
- [ ] % of total inlinks
- [ ] JS-only inlinks/outlinks (links only visible after rendering)
- [ ] Orphan pages (not linked from anywhere in crawl)
- [ ] Click depth distribution chart
- [ ] Most/least linked pages report

### 3.5 Anchor Text
- [ ] Aggregated anchor text per target URL
- [ ] Granular anchor text (per link)
- [ ] Non-descriptive anchor text detection ("click here", "read more", "here")
- [ ] Image alt text as anchor text
- [ ] Anchor text duplication

### 3.6 External Links
- [ ] All external outlinks with status codes
- [ ] External link source pages
- [ ] External inlink count per external URL
- [ ] Broken external links detection

### 3.7 Site Structure & Segmentation
- [ ] Directory-level site structure analysis
- [ ] URL segmentation by directory, file type, status code, content type
- [ ] Custom segments (regex-based grouping)
- [ ] Site architecture visualization (crawl map, directory tree, force-directed graph)
- [ ] Crawl depth visualization (tree graph)

### 3.8 Security Analysis
- [ ] HTTP URLs (insecure) detection
- [ ] HTTPS URL confirmation
- [ ] Mixed content (HTTPS page loading HTTP resources)
- [ ] Insecure form action URLs
- [ ] Forms on HTTP pages
- [ ] Unsafe cross-origin links (target="_blank" without rel="noopener")
- [ ] Protocol-relative resource links (`//`)
- [ ] Missing HSTS header
- [ ] Missing Content-Security-Policy header
- [ ] Missing X-Content-Type-Options: nosniff header
- [ ] Missing X-Frame-Options header
- [ ] Missing secure Referrer-Policy header
- [ ] Bad content type (MIME mismatch between header and actual content)
- [ ] Insecure content report (HTTP links, canonicals, pagination on HTTPS pages)

### 3.9 XML Sitemaps
- [ ] XML sitemap generation (with configurable: include URLs, last modified, priority, change frequency)
- [ ] Image XML sitemap generation
- [ ] News sitemap generation
- [ ] Video sitemap generation
- [ ] Sitemap index file generation
- [ ] XML sitemap crawling and analysis (independent or as part of crawl)
- [ ] Detect: sitemap URLs missing from crawl, crawl URLs missing from sitemap (orphan pages), non-indexable URLs in sitemap, non-200 URLs in sitemap, broken sitemap references

### 3.10 Structured Data (Schema.org)
- [ ] Extract JSON-LD, Microdata, RDFa structured data
- [ ] Validate against Schema.org specifications
- [ ] Validate against Google rich result feature requirements
- [ ] Report: missing structured data, invalid structured data, warnings, deprecated properties
- [ ] Support all Schema.org types (Article, Product, BreadcrumbList, FAQPage, HowTo, LocalBusiness, Organization, Event, Recipe, Review, VideoObject, etc.)
- [ ] Rich result eligibility check

### 3.11 AMP Validation
- [ ] Crawl AMP URLs
- [ ] Validate AMP HTML against official AMP validator
- [ ] Report AMP validation errors and warnings

### 3.12 Response Times
- [ ] Per-URL response time (seconds)
- [ ] Response time distribution chart
- [ ] Slow pages report (over configurable threshold)
- [ ] TTFB (Time to First Byte) measurement

### 3.13 PageSpeed Insights Integration
- [ ] Lighthouse metrics (FCP, LCP, TBT, CLS, Speed Index, TTI)
- [ ] Performance score per URL
- [ ] Speed opportunities and diagnostics
- [ ] Chrome User Experience Report (CrUX) field data
- [ ] Core Web Vitals (LCP, INP, CLS) from CrUX
- [ ] Bulk PSI API queries with rate limiting

### 3.14 Mobile Usability
- [ ] Lighthouse mobile usability audit
- [ ] Viewport configuration check
- [ ] Tap target sizing
- [ ] Font size readability on mobile
- [ ] Content width issues

---

## Phase 4: Rendering & JavaScript (Screaming Frog Parity)

### 4.1 JavaScript Rendering
- [ ] Headless Chromium integration (Chrome DevTools Protocol)
- [ ] Render pages after JS execution
- [ ] Crawl JavaScript frameworks (Angular, React, Vue, Svelte, etc.)
- [ ] Configurable render timeout
- [ ] Render mode: raw HTML only vs rendered HTML
- [ ] Detect content/links/titles/descriptions/headings that rely on JavaScript
- [ ] Compare raw HTML vs rendered HTML diff
- [ ] Store and view both raw HTML and rendered HTML

### 4.2 Screenshots
- [ ] Rendered page screenshots (full page or viewport)
- [ ] Screenshot storage and viewing
- [ ] Desktop and mobile viewport screenshots

### 4.3 Custom JavaScript Execution
- [ ] Run custom JS snippets during crawl
- [ ] Extract data via custom JS (return values captured as columns)
- [ ] Trigger mouseover events, scroll, click, etc.
- [ ] JS console for testing snippets before crawl

### 4.4 Blocked Resources (Rendering)
- [ ] Detect JS/CSS/images blocked from rendering
- [ ] Blocked by robots.txt in rendering mode
- [ ] Failed resource loads

---

## Phase 5: Integrations & API Connections (Screaming Frog Parity)

### 5.1 Google Analytics (GA4)
- [ ] GA4 Data API integration
- [ ] Pull sessions, users, pageviews, bounce rate, conversions per URL
- [ ] Configurable date range and metrics
- [ ] OAuth2 authentication

### 5.2 Google Search Console
- [ ] Search Analytics API integration
- [ ] Pull impressions, clicks, CTR, average position per URL
- [ ] URL Inspection API integration (index status, coverage, mobile usability)
- [ ] Keyword/query data per URL
- [ ] OAuth2 authentication

### 5.3 PageSpeed Insights API
- [ ] Lighthouse lab data
- [ ] CrUX field data
- [ ] Configurable strategy (mobile/desktop)
- [ ] API key management and rate limiting

### 5.4 External Link Metrics
- [ ] Majestic API integration (trust flow, citation flow, ref domains)
- [ ] Ahrefs API integration (DR, UR, backlinks, referring domains)
- [ ] Moz API integration (DA, PA, spam score, backlinks)
- [ ] API key management for each provider

### 5.5 Looker Studio / Data Studio
- [ ] Export crawl data in Looker Studio compatible format
- [ ] Data Studio report template
- [ ] Google Sheets export with auto-push

---

## Phase 6: Content Analysis & AI (Screaming Frog Parity)

### 6.1 Content Analysis
- [ ] Word count per page (configurable content area: include/exclude HTML elements, classes, IDs; default exclude nav/footer)
- [ ] Text-to-HTML ratio
- [ ] Average words per sentence
- [ ] Flesch Reading Ease score + readability classification
- [ ] Low content / thin content pages detection
- [ ] Content relevance analysis (deviation from site average topic)

### 6.2 Duplicate Content
- [ ] Exact duplicate detection (MD5 hash of full HTML content)
- [ ] Near duplicate detection (similarity threshold, default 90%, configurable)
- [ ] Semantic similarity detection (vector embeddings via LLM)
- [ ] Closest similarity match percentage per URL
- [ ] Number of near duplicates per URL

### 6.3 Spelling & Grammar
- [ ] Spell check in 25+ languages
- [ ] Grammar check in 25+ languages
- [ ] Language auto-detection from HTML lang attribute
- [ ] Spelling errors count per URL
- [ ] Grammar errors count per URL
- [ ] Detailed error listing with suggestions

### 6.4 Custom Source Code Search
- [ ] Search raw HTML source code for any string/regex
- [ ] Search rendered HTML source code
- [ ] Multiple custom search patterns
- [ ] Results with URL, match context, match count

### 6.5 Custom Extraction
- [ ] XPath extraction (single and multiple values)
- [ ] CSS Path selector extraction
- [ ] Regex extraction
- [ ] Extraction from raw HTML vs rendered HTML
- [ ] Custom column naming
- [ ] Multiple extraction rules per crawl

### 6.6 AI Integration
- [ ] OpenAI API integration (GPT-4, GPT-4o, etc.)
- [ ] Anthropic Claude API integration
- [ ] Google Gemini API integration
- [ ] Ollama (local LLM) integration
- [ ] Custom AI prompt configuration (per-URL prompts)
- [ ] AI-generated meta title suggestions
- [ ] AI-generated meta description suggestions
- [ ] AI content quality analysis
- [ ] AI-powered issue recommendations and fixes
- [ ] AI semantic content clustering
- [ ] Configurable AI model, temperature, max tokens

### 6.7 N-grams Analysis
- [ ] Extract word/phrase N-grams across crawled content
- [ ] Configurable N-gram size (1-gram, 2-gram, 3-gram)
- [ ] Frequency analysis with visualization
- [ ] Content topic modeling

### 6.8 Semantic Search
- [ ] Search crawled URLs by semantic meaning (not just keyword match)
- [ ] Vector embedding-based search
- [ ] Find semantically similar pages
- [ ] Configurable embedding models

---

## Phase 7: Data, Export & Reporting (Screaming Frog Parity)

### 7.1 Data Tabs / Views (UI)
- [ ] Internal tab (comprehensive per-URL data: all columns combined)
- [ ] External tab (external URL data)
- [ ] Security tab
- [ ] Response Codes tab (with filters: blocked, no response, 2XX, 3XX, JS redirect, meta refresh, redirect chain, redirect loop, 4XX, 5XX)
- [ ] URL tab (with all URL issue filters)
- [ ] Page Titles tab
- [ ] Meta Description tab
- [ ] Meta Keywords tab
- [ ] H1 tab
- [ ] H2 tab
- [ ] Content tab (word count, readability, duplicates, spelling/grammar)
- [ ] Images tab
- [ ] Canonicals tab
- [ ] Pagination tab
- [ ] Directives tab
- [ ] hreflang tab
- [ ] JavaScript tab
- [ ] Links tab (inlinks/outlinks detail)
- [ ] AMP tab
- [ ] Structured Data tab
- [ ] Sitemaps tab
- [ ] PageSpeed tab
- [ ] Mobile tab
- [ ] Accessibility tab
- [ ] Custom Search tab
- [ ] Custom Extraction tab
- [ ] Custom JavaScript tab
- [ ] Analytics tab
- [ ] Search Console tab
- [ ] Validation tab
- [ ] Link Metrics tab
- [ ] AI tab
- [ ] Change Detection tab
- [ ] Overview / Issues tab (summary dashboard with 300+ issue types)

### 7.2 URL Detail Views
- [ ] SERP Snippet preview (title + description pixel width simulation)
- [ ] Rendered Page view (screenshot)
- [ ] View Source (raw HTML)
- [ ] View Rendered Source (post-JS HTML)
- [ ] HTTP Headers view
- [ ] Cookies view
- [ ] Structured Data Details view
- [ ] Lighthouse Details view
- [ ] Accessibility Details view
- [ ] Spelling & Grammar Details view
- [ ] Inlinks detail view
- [ ] Outlinks detail view
- [ ] Image details view
- [ ] Duplicate details view
- [ ] Resources view (all loaded resources)

### 7.3 Issues / Reports
- [ ] 300+ predefined SEO issues with type, priority, and description
- [ ] In-app explanation for each issue
- [ ] Estimated priority (critical, high, medium, low) based on impact
- [ ] Issue count summary on overview dashboard
- [ ] Reports menu:
  - [ ] Redirects > Redirect Chains, Redirect Loops
  - [ ] Insecure Content
  - [ ] Broken Links
  - [ ] Duplicate Content
  - [ ] Missing/Problematic metadata
  - [ ] Orphan Pages
  - [ ] Sitemap issues
  - [ ] Structured data issues
  - [ ] Core Web Vitals issues
  - [ ] Accessibility issues

### 7.4 Export
- [ ] Export any tab to CSV
- [ ] Export to Excel (XLSX)
- [ ] Export to JSON
- [ ] Bulk export (all tabs/reports at once)
- [ ] Export filtered results only
- [ ] Export with custom column selection
- [ ] XML sitemap export
- [ ] Image sitemap export

### 7.5 Crawl Management
- [ ] Save crawl to file ( reopen later)
- [ ] Open saved crawl
- [ ] Crawl comparison (diff two crawls: site structure changes, key element changes, new/removed URLs)
- [ ] URL mapping for staging vs production comparison
- [ ] Crawl scheduling (daily, weekly, monthly intervals)
- [ ] Auto-export on schedule to local file or Google Sheets
- [ ] Command-line automation (headless crawl + export)
- [ ] Crawl configuration save/load (config profiles)
- [ ] Change detection (visual diff of page elements between crawls)

### 7.6 Site Visualizations
- [ ] Crawl map (force-directed diagram of internal linking)
- [ ] Directory tree (force-directed diagram of URL structure)
- [ ] Tree graph (hierarchical site structure)
- [ ] Interactive zoom/pan/drag on visualizations
- [ ] Color-coded nodes (by status code, content type, indexability)
- [ ] Node size by inlinks or link score
- [ ] Export visualizations as image (PNG/SVG)

### 7.7 Accessibility Auditing
- [ ] AXE accessibility engine integration (90+ rules)
- [ ] WCAG 2.0, 2.1, 2.2 conformance levels (A, AA, AAA)
- [ ] Section 508 compliance checks
- [ ] Issue categorization (critical, serious, moderate, minor)
- [ ] Affected element details per issue
- [ ] Accessibility issues export
- [ ] Per-URL accessibility report

---

## Phase 8: Features BEYOND Screaming Frog (NEW Tools)

These are features that Screaming Frog does NOT have, sourced from alternatives like Ahrefs, Semrush, Sitebulb, DeepCrawl, Surfer SEO, Search Atlas, and modern SEO needs.

### 8.1 Backlink Analysis (NEW - from Ahrefs/Moz/Semrush)
- [ ] Native backlink profile analysis (not just API metrics)
- [ ] Referring domains report
- [ ] Anchor text distribution
- [ ] Lost/new backlinks tracking
- [ ] Backlink authority metrics (internal calculation or API-fed)
- [ ] Toxic/spammy backlink identification
- [ ] Internal vs external link ratio
- [ ] Link building opportunity finder (broken backlinks, unlinked mentions)

### 8.2 Keyword Research & Rank Tracking (NEW - from Semrush/Ahrefs)
- [ ] Keyword research with search volume, difficulty, CPC
- [ ] Keyword suggestion engine (related, questions, long-tail)
- [ ] SERP analysis for any keyword
- [ ] Rank tracking (monitor keyword positions over time)
- [ ] Keyword cannibalization detection (multiple pages ranking for same keyword)
- [ ] Keyword-to-URL mapping
- [ ] Search intent classification (informational, navigational, commercial, transactional)
- [ ] Featured snippet opportunity detection
- [ ] People Also Ask (PAA) extraction

### 8.3 Competitor Analysis (NEW - from Semrush/Ahrefs)
- [ ] Competitor organic keyword overlap
- [ ] Content gap analysis (keywords competitors rank for that you don't)
- [ ] Competitor backlink gap analysis
- [ ] Competitor site structure comparison
- [ ] Competitor top pages report
- [ ] SERP feature share comparison

### 8.4 Content Optimization & Scoring (NEW - from Surfer SEO/Clearscope)
- [ ] Per-page content score against target keyword
- [ ] Content length benchmark vs top-ranking pages
- [ ] Keyword density and term frequency analysis
- [ ] LSI / NLP keyword suggestions
- [ ] Heading structure optimization suggestions
- [ ] Content brief generator (outline + keywords to include)
- [ ] Content freshness/staleness detection (last modified date analysis)
- [ ] Thin content identification with improvement suggestions
- [ ] Readability scoring with target audience recommendations

### 8.5 AI-Powered Recommendations & Auto-Fix (NEW - from Search Atlas/OTTO)
- [ ] AI-generated fix recommendations for every detected issue
- [ ] AI-generated meta title and description for every page
- [ ] AI-generated schema markup suggestions
- [ ] AI internal linking suggestions (which pages should link to which)
- [ ] AI content rewrite suggestions for thin/duplicate content
- [ ] AI-generated redirect map for site migrations
- [ ] AI-powered priority scoring (beyond static priority rules)
- [ ] Auto-apply fixes via CMS integration (WordPress, Shopify, etc.)
- [ ] AI-generated FAQ schema from page content
- [ ] AI SEO content brief generation

### 8.6 Log File Analysis (NEW - integrated, not separate tool)
- [ ] Parse server log files (Apache, Nginx, IIS, CDN logs)
- [ ] Bot detection (Googlebot, Bingbot, AI crawlers, others)
- [ ] Crawl budget analysis (how search engines spend their crawl budget)
- [ ] Orphan pages from logs (URLs hit by bots but not in site crawl)
- [ ] Crawl frequency analysis per URL
- [ ] Status code analysis from bot perspective
- [ ] Log + crawl data correlation (what bots see vs what exists)
- [ ] Crawl budget waste identification (low-value URLs crawled frequently)
- [ ] Bot crawl pattern visualization
- [ ] Log file comparison over time

### 8.7 Local SEO Auditing (NEW - from Semrush/BrightLocal)
- [ ] Google Business Profile audit
- [ ] NAP (Name, Address, Phone) consistency check across pages
- [ ] Local business schema validation
- [ ] Local keyword ranking (city/region level)
- [ ] Local competitor comparison
- [ ] Citation consistency check
- [ ] Map listing optimization suggestions
- [ ] Local review schema and markup check
- [ ] Store locator page audit (multi-location)

### 8.8 E-Commerce SEO Audit (NEW)
- [ ] Product page audit (product schema, pricing, availability, reviews)
- [ ] Category page audit (pagination, filtering, canonicalization)
- [ ] Product image optimization (zoom images, alt text, file size)
- [ ] Faceted navigation analysis (parameter handling, canonical strategy)
- [ ] Product variant URL handling
- [ ] Cart/checkout page indexability check
- [ ] Product feed / structured data for Google Shopping
- [ ] Stock status and pricing schema validation
- [ ] BreadcrumbList schema on product/category pages
- [ ] E-commerce specific redirect audit (product discontinuation)

### 8.9 International & Multi-Market SEO (NEW)
- [ ] Multi-market crawl comparison (same site across regions)
- [ ] International URL structure audit (ccTLD, subdomain, subdirectory strategies)
- [ ] hreflang coverage matrix (language/region coverage grid)
- [ ] Currency and language consistency check
- [ ] Cross-domain canonical audit
- [ ] International redirect audit
- [ ] Local search engine compatibility (Yandex, Baidu, Naver)
- [ ] Auto-detect market from URL pattern or content

### 8.10 AI Search Visibility (NEW - 2026 era)
- [ ] llms.txt file generation and validation
- [ ] AI crawler detection and blocking analysis (GPTBot, ClaudeBot, PerplexityBot, etc.)
- [ ] AI citation tracking (check if site is cited in ChatGPT/Perplexity/Gemini responses)
- [ ] E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) signal analysis
- [ ] Author schema and bio page audit
- [ ] Trust signal audit (contact info, about page, privacy policy, SSL)
- [ ] Content originality and fact-checking signals
- [ ] AI-optimized content structure check (clear answers, structured sections)
- [ ] Generative Engine Optimization (GEO) recommendations

### 8.11 Video & Rich Media SEO (NEW)
- [ ] Video schema validation (VideoObject)
- [ ] Video sitemap generation and validation
- [ ] YouTube/Vimeo embed audit
- [ ] Video thumbnail accessibility
- [ ] Video lazy-load performance check
- [ ] Podcast schema validation
- [ ] Audio schema validation

### 8.12 Core Web Vitals Deep Analysis (NEW - beyond PSI)
- [ ] Real-time Core Web Vitals measurement via headless browser
- [ ] INP (Interaction to Next Paint) measurement
- [ ] LCP element identification per page
- [ ] CLS contributing elements
- [ ] Resource waterfall analysis
- [ ] Performance budget monitoring (JS bundle size, image weight, font count)
- [ ] Third-party script impact analysis
- [ ] Render-blocking resource identification
- [ ] Cumulative resource weight per page
- [ ] Performance trend tracking across crawls

### 8.13 Server & Infrastructure Audit (NEW)
- [ ] Server response time distribution
- [ ] HTTP/2 and HTTP/3 support detection
- [ ] Compression negotiation (Gzip, Brotli, Zstd)
- [ ] Cache header analysis (Cache-Control, ETag, Expires)
- [ ] CDN detection and configuration audit
- [ ] DNS configuration check
- [ ] TLS/SSL certificate validation (expiry, chain, cipher strength)
- [ ] Server location and latency correlation
- [ ] Image CDN / lazy loading audit
- [ ] Service worker / PWA detection

### 8.14 Content Inventory & Audit (NEW)
- [ ] Full content inventory export (all pages with metadata, word count, topics)
- [ ] Content categorization and tagging
- [ ] Content performance correlation (with GA/GSC data)
- [ ] Content decay tracking (traffic decline over time)
- [ ] Content consolidation recommendations (merge thin/duplicate pages)
- [ ] Content pruning recommendations (delete/redirect low-value pages)
- [ ] Topic cluster mapping
- [ ] Content gap detection (topics competitors cover that you don't)
- [ ] Content calendar integration suggestions

### 8.15 White-Label Reporting & Dashboards (NEW - from Sitebulb/DeepCrawl)
- [ ] Branded PDF report generation (custom logo, colors, fonts)
- [ ] Executive summary auto-generation
- [ ] Issue priority matrix visualization
- [ ] Trend charts across historical crawls
- [ ] Client-facing dashboard (web-based, shareable link)
- [ ] Scheduled email report delivery
- [ ] White-label domain support
- [ ] Custom report templates
- [ ] Multi-site portfolio dashboard

### 8.16 Multi-Site / Project Management (NEW)
- [ ] Manage multiple website projects in one interface
- [ ] Cross-site comparison dashboard
- [ ] Batch crawl multiple sites
- [ ] Portfolio-level issue summary
- [ ] Site grouping (by client, industry, team)
- [ ] Historical crawl archive per site
- [ ] Team collaboration (shared projects, comments, assignments)
- [ ] Issue assignment and tracking (assign issues to team members)
- [ ] Issue status tracking (open, in progress, resolved)

### 8.17 API & Integrations (NEW)
- [ ] REST API for programmatic access to crawl data
- [ ] Webhook notifications (crawl complete, new critical issues)
- [ ] Slack integration (alerts for new critical issues)
- [ ] Email alerts for critical issues
- [ ] Microsoft Teams integration
- [ ] Jira integration (create tickets for SEO issues)
- [ ] GitHub/GitLab integration (create issues from SEO findings)
- [ ] WordPress integration (push fixes to CMS)
- [ ] Webhook for CI/CD pipelines (block deploy on SEO regressions)

### 8.18 Schema Markup Generator (NEW - not just validator)
- [ ] Generate Schema.org JSON-LD for any page type
- [ ] Templates: Article, Product, LocalBusiness, FAQPage, HowTo, Recipe, Event, Course, JobPosting, Organization, BreadcrumbList, VideoObject, Review, AggregateRating
- [ ] Auto-generate from page content (AI-assisted)
- [ ] Validate generated schema before deployment
- [ ] Copy-paste ready JSON-LD output

### 8.19 Redirect & .htaccess Generator (NEW)
- [ ] Generate .htaccess redirect rules from crawl data
- [ ] Generate nginx redirect rules
- [ ] Generate Cloudflare Workers redirect rules
- [ ] Bulk redirect map generator (old URL -> new URL)
- [ ] Redirect map from crawl comparison (staging vs production)
- [ ] Regex redirect generator
- [ ] Import/export redirect maps

### 8.20 Robots.txt Generator (NEW - not just tester)
- [ ] Generate robots.txt from crawl configuration
- [ ] Visual robots.txt builder
- [ ] AI-powered robots.txt recommendations
- [ ] Block/unblock URL patterns with live testing
- [ ] Crawl-delay recommendations
- [ ] Sitemap reference injection
- [ ] AI crawler management (GPTBot, ClaudeBot, etc. block/allow rules)

### 8.21 Crawl Budget Estimation (NEW)
- [ ] Estimate crawl budget from log file analysis
- [ ] Identify crawl budget waste (low-value URLs consuming budget)
- [ ] Faceted navigation crawl budget impact
- [ ] Parameter URL bloat detection
- [ ] Redirect chain crawl budget waste
- [ ] Crawl depth vs bot reach analysis
- [ ] Recommendations to optimize crawl budget

### 8.22 Faceted Navigation Analysis (NEW)
- [ ] Detect faceted navigation patterns
- [ ] Parameter combination explosion detection
- [ ] Canonical strategy audit for facets
- [ ] robots.txt meta directive recommendations for facets
- [ ] Faceted URL indexability report
- [ ] Faceted navigation crawl budget impact

### 8.23 Cookie Consent & Privacy Compliance (NEW)
- [ ] Cookie consent banner detection
- [ ] GDPR compliance signals (cookie policy page, privacy policy)
- [ ] Cookie categorization (essential, analytics, marketing)
- [ ] Pre-consent script loading audit (scripts loading before consent)
- [ ] CCPA/CPRA compliance signals
- [ ] Consent Mode v2 detection (Google Consent Mode)

### 8.24 Ad/Monetization Audit (NEW)
- [ ] ads.txt file validation
- [ ] sellers.json file validation
- [ ] AdSense / ad script detection
- [ ] Ad placement SEO impact analysis
- [ ] Affiliate link detection and `rel="sponsored"` / `rel="nofollow"` audit
- [ ] Monetization script performance impact

### 8.25 Internal PageRank Visualization (NEW - enhanced)
- [ ] Interactive PageRank flow diagram
- [ ] Link equity distribution heatmap
- [ ] Orphan page visualization (zero equity)
- [ ] Link equity waste (links to non-indexable, redirected, broken URLs)
- [ ] Internal linking optimization simulator (add/remove links and see equity redistribution)
- [ ] PageRank sculpting recommendations

### 8.26 SERP Feature Tracking (NEW)
- [ ] Track SERP features for target keywords (featured snippets, PAA, image pack, video carousel, local pack, etc.)
- [ ] SERP feature opportunity identification
- [ ] Featured snippet optimization recommendations
- [ ] SERP volatility tracking
- [ ] SERP feature gap analysis vs competitors

### 8.27 Voice Search Optimization (NEW)
- [ ] Conversational query optimization check
- [ ] FAQ schema for voice search readiness
- [ ] Answer block detection (short, clear answers for voice queries)
- [ ] Local voice search readiness (business info completeness)
- [ ] Page speed for voice search (Google prioritizes fast pages)

### 8.28 Infinite Scroll & Lazy Load Detection (NEW)
- [ ] Detect infinite scroll implementations
- [ ] Verify crawlable fallback for infinite scroll
- [ ] Lazy-loaded image SEO impact (are images in source or loaded via JS?)
- [ ] Lazy-loaded content SEO impact
- [ ] Intersection Observer pattern detection
- [ ] Pagination vs infinite scroll strategy recommendations

### 8.29 JavaScript SEO Deep Audit (NEW - beyond rendering)
- [ ] Client-side vs server-side rendering detection
- [ ] Hydration mismatch detection (SSR/SSG frameworks like Next.js, Nuxt)
- [ ] JS bundle size analysis per page
- [ ] Critical rendering path analysis
- [ ] Dynamic rendering detection
- [ ] Framework detection (Next.js, Nuxt, Gatsby, Astro, etc.)
- [ ] Meta tag injection timing (are title/description in initial HTML or JS-injected?)
- [ ] Core Web Vitals impact of JS framework

### 8.30 Cloud-Based Crawling Option (NEW - from DeepCrawl)
- [ ] Cloud crawl mode (server-side, not desktop-limited)
- [ ] Distributed crawling across multiple workers
- [ ] Crawl 10M+ URLs with cloud resources
- [ ] Cloud crawl scheduling and storage
- [ ] API-triggered cloud crawls
- [ ] Crawl result streaming (real-time results as crawl progresses)

### 8.31 Diff/Change Tracking with Trend Charts (NEW)
- [ ] Historical crawl comparison with visual diff
- [ ] Issue count trend charts over time (per issue type)
- [ ] URL count / indexability trend
- [ ] Core Web Vitals trend tracking
- [ ] New/lost/changed URLs between crawls
- [ ] Automated regression detection (new issues introduced since last crawl)
- [ ] SEO health score trend over time

### 8.32 SEO Health Score (NEW)
- [ ] Overall site SEO health score (0-100)
- [ ] Sub-scores by category (technical, on-page, content, links, performance, accessibility, security)
- [ ] Weighted scoring based on issue priority and frequency
- [ ] Benchmark against industry averages
- [ ] Score breakdown and contribution analysis
- [ ] Score goal setting and progress tracking

---

## Development Roadmap

### Milestone 1: Foundation (Weeks 1-4)
- Project scaffolding (Node.js + TypeScript + Hono + Tailwind + commander CLI)
- SQLite storage layer (better-sqlite3) + schema migrations
- Crawl engine: spider mode, undici HTTP client, URL queue/frontier, robots.txt parser
- Basic HTML parsing (cheerio) and link extraction
- CLI: `npx open-seo-checker crawl https://example.com --output report.csv`
- Web server: Hono app serving static files + basic API routes
- Launcher scripts (.sh / .bat): start server + auto-open browser
- Basic Web UI: crawl form, progress bar, simple results table

### Milestone 2: Core SEO Audits (Weeks 5-10)
- Page titles, meta descriptions, headings, URL analysis
- Response codes, redirects, broken links
- Internal/external links, anchor text
- Canonicals, directives, hreflang, pagination
- Images analysis
- CSV/JSON/XLSX export
- Web UI: tab-based interface, data tables with sorting/filtering/search

### Milestone 3: Web UI - Full Tabs & Details (Weeks 11-16)
- All data tabs (Internal, External, Response Codes, URL, Titles, Meta, H1, H2, Content, Images, Canonicals, Pagination, Directives, hreflang, Links, Security, Sitemaps)
- URL detail views (view source, HTTP headers, rendered page, SERP snippet preview)
- Issues dashboard (overview with 300+ issue counts and priority)
- WebSocket real-time crawl progress
- D3.js site visualizations (crawl map, directory tree, force-directed graph)

### Milestone 4: Rendering & Advanced (Weeks 17-22)
- Playwright (Chromium) integration for JS rendering
- JavaScript rendering mode (raw vs rendered HTML comparison)
- Custom JavaScript execution
- Screenshots (desktop + mobile viewport)
- Structured data extraction and validation (Schema.org)
- AMP validation
- Spelling & grammar checks (25+ languages)
- Custom extraction (XPath, CSS, regex)
- Custom source code search
- Blocked resources detection (rendering mode)

### Milestone 5: Content & Duplicate Analysis (Weeks 23-26)
- Duplicate content (MD5, near duplicate, semantic)
- Content analysis (word count, readability, text ratio)
- N-grams analysis
- Accessibility auditing (AXE engine)
- Site visualizations (crawl map, directory tree, force-directed)

### Milestone 6: Integrations (Weeks 27-32)
- Google Analytics 4 API
- Google Search Console API
- PageSpeed Insights API
- External link metrics (Majestic, Ahrefs, Moz)
- AI integration (OpenAI, Anthropic, Gemini, Ollama)

### Milestone 7: Crawl Management (Weeks 33-36)
- Save/open crawls
- Crawl comparison (diff, staging vs production)
- Crawl scheduling
- Change detection
- Command-line automation
- Config profiles

### Milestone 8: NEW Features - Phase 1 (Weeks 37-44)
- Log file analysis
- Backlink analysis (native + API)
- Keyword research & rank tracking
- Competitor analysis
- Content optimization & scoring
- AI-powered recommendations

### Milestone 9: NEW Features - Phase 2 (Weeks 45-52)
- Local SEO auditing
- E-commerce SEO audit
- International/multi-market SEO
- AI search visibility (llms.txt, AI crawler analysis, E-E-A-T)
- Video & rich media SEO
- Core Web Vitals deep analysis
- Server & infrastructure audit

### Milestone 10: NEW Features - Phase 3 (Weeks 53-60)
- Schema markup generator
- Redirect & .htaccess generator
- Robots.txt generator
- Crawl budget estimation
- Faceted navigation analysis
- Cookie consent & privacy compliance
- Ad/monetization audit
- White-label reporting & dashboards
- Multi-site/project management
- API & integrations (Slack, Jira, webhooks, CI/CD)
- Cloud-based crawling option
- SEO health score
- SERP feature tracking

---

## Feature Comparison Matrix

| Feature Category | Screaming Frog | Open SEO Checker |
|-----------------|:-:|:-:|
| **Crawl Engine** | | |
| Spider mode crawl | Yes | Yes |
| List mode crawl | Yes | Yes |
| JavaScript rendering | Yes | Yes |
| robots.txt parsing/testing | Yes | Yes + generator |
| Custom user-agent | Yes | Yes |
| Proxy support | Yes | Yes |
| Forms-based auth | Yes | Yes |
| Unlimited crawl (free) | No (500 URL limit) | **Yes** |
| Cloud-based crawling | No | **Yes** |
| Distributed crawling | No | **Yes** |
| **On-Page SEO** | | |
| Page titles audit | Yes | Yes |
| Meta description audit | Yes | Yes |
| Headings (H1/H2) audit | Yes | Yes |
| URL structure audit | Yes | Yes |
| Canonicals audit | Yes | Yes |
| hreflang audit | Yes | Yes |
| Pagination audit | Yes | Yes |
| Meta robots/X-Robots-Tag | Yes | Yes |
| Images audit | Yes | Yes |
| **Technical SEO** | | |
| Broken links detection | Yes | Yes |
| Redirect audit (chains/loops) | Yes | Yes |
| Internal linking analysis | Yes | Yes + simulator |
| Link score (PageRank) | Yes | Yes + visualization |
| Anchor text analysis | Yes | Yes |
| Site structure visualization | Yes | Yes |
| Security headers audit | Yes | Yes |
| XML sitemap generation | Yes | Yes + news/video |
| XML sitemap analysis | Yes | Yes |
| Structured data validation | Yes | Yes + generator |
| AMP validation | Yes | Yes |
| **Rendering** | | |
| JS rendering (Chromium) | Yes | Yes |
| Screenshots | Yes | Yes |
| Custom JavaScript | Yes | Yes |
| Blocked resources detection | Yes | Yes |
| **Integrations** | | |
| Google Analytics | Yes | Yes |
| Google Search Console | Yes | Yes |
| PageSpeed Insights | Yes | Yes |
| Majestic/Ahrefs/Moz APIs | Yes | Yes |
| AI integration (LLM) | Yes | Yes |
| **Content** | | |
| Duplicate content (MD5) | Yes | Yes |
| Near duplicate content | Yes | Yes |
| Semantic similarity | Yes | Yes |
| Spelling & grammar | Yes (25+ langs) | Yes (25+ langs) |
| Custom extraction | Yes | Yes |
| Custom source search | Yes | Yes |
| N-grams | Yes | Yes |
| Semantic search | Yes | Yes |
| Readability analysis | Yes | Yes |
| **Data & Reporting** | | |
| All data tabs | Yes | Yes |
| 300+ issue types | Yes | Yes + more |
| SERP snippet preview | Yes | Yes |
| CSV/Excel/JSON export | Yes | Yes |
| Save/open crawls | Yes | Yes |
| Crawl comparison | Yes | Yes |
| Crawl scheduling | Yes | Yes |
| CLI automation | Yes | Yes |
| Accessibility (AXE) | Yes | Yes |
| Change detection | Yes | Yes |
| **NEW: Backlink Analysis** | No | **Yes** |
| **NEW: Keyword Research** | No | **Yes** |
| **NEW: Rank Tracking** | No | **Yes** |
| **NEW: Competitor Analysis** | No | **Yes** |
| **NEW: Content Scoring** | No | **Yes** |
| **NEW: AI Auto-Fix** | No | **Yes** |
| **NEW: Log File Analysis** | Separate tool | **Integrated** |
| **NEW: Local SEO Audit** | No | **Yes** |
| **NEW: E-Commerce SEO** | No | **Yes** |
| **NEW: International SEO** | Limited | **Full** |
| **NEW: AI Search Visibility** | No | **Yes** |
| **NEW: llms.txt Support** | No | **Yes** |
| **NEW: E-E-A-T Analysis** | No | **Yes** |
| **NEW: Video SEO** | No | **Yes** |
| **NEW: CWV Deep Analysis** | Via PSI API | **Native** |
| **NEW: Server/Infra Audit** | No | **Yes** |
| **NEW: Content Inventory** | No | **Yes** |
| **NEW: White-Label Reports** | Limited (Looker) | **Full** |
| **NEW: Multi-Site Management** | No | **Yes** |
| **NEW: REST API** | No | **Yes** |
| **NEW: Webhooks/Alerts** | No | **Yes** |
| **NEW: Slack/Jira Integration** | No | **Yes** |
| **NEW: CI/CD Integration** | No | **Yes** |
| **NEW: Schema Generator** | No | **Yes** |
| **NEW: Redirect Generator** | No | **Yes** |
| **NEW: Robots.txt Generator** | No | **Yes** |
| **NEW: Crawl Budget Estimation** | No | **Yes** |
| **NEW: Faceted Nav Analysis** | No | **Yes** |
| **NEW: Cookie/Privacy Audit** | No | **Yes** |
| **NEW: Ad/Monetization Audit** | No | **Yes** |
| **NEW: PageRank Simulator** | No | **Yes** |
| **NEW: SERP Feature Tracking** | No | **Yes** |
| **NEW: Voice Search SEO** | No | **Yes** |
| **NEW: Infinite Scroll Detection** | No | **Yes** |
| **NEW: JS SEO Deep Audit** | No | **Yes** |
| **NEW: SEO Health Score** | No | **Yes** |
| **NEW: Trend Charts/Diff** | Limited | **Full** |
| **Pricing** | £199/year | **Free (MIT)** |
| **Open Source** | No | **Yes** |
| **Crawl Limit** | 500 (free) | **Unlimited** |
| **Architecture** | Desktop app (Java) | **CLI + Web UI (Node.js/TS)** |
| **UI** | Native desktop | **Web browser (any OS)** |
| **Launcher** | Desktop app | **.sh / .bat (one command)** |
| **Tech Stack** | Java + Swing | **TypeScript + Hono + Tailwind + Playwright + SQLite** |
