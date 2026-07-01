# Install

Two ways to get Open SEO Checker running on your machine:

1. **One-command installer** — drops a desktop shortcut that starts
   the server and opens the dashboard with a single double-click.
2. **Manual install** — useful on headless servers, CI, or any
   environment where you want fine control.

## One-command installer

The installer handles prerequisites (Node.js ≥ 18 and pnpm),
installs workspace dependencies (including the Playwright Chromium
used for JS rendering), builds the API and the dashboard, and
creates a real desktop shortcut on your platform.

| Platform | Command | Result |
|----------|---------|--------|
| macOS    | `./install.sh`       | `~/Desktop/Open SEO Checker.app` (Finder opens it like any app → Terminal.app starts the server and opens the dashboard) |
| Linux    | `./install.sh`       | `~/Desktop/Open SEO Checker.desktop` (XDG entry) |
| Windows  | `install.bat`        | `%USERPROFILE%\Desktop\Open SEO Checker.lnk` (real .lnk with custom icon) |

If the prerequisites are missing, the installer prints install hints
per OS and exits non-zero:

- macOS:  `brew install node@20`
- Linux:  `sudo apt-get install -y nodejs npm`  (Debian / Ubuntu)
          `sudo dnf install -y nodejs npm`     (Fedora)
          `curl -fsSL https://...nvm-sh/nvm/install.sh | bash && nvm install 20`
- Windows: `winget install OpenJS.NodeJS.LTS`  or  `choco install nodejs-lts`
- All:     `npm i -g pnpm`  (run after Node is on `PATH`)

The installer is idempotent. Re-run any time to refresh the shortcut
or rebuild the project — `pnpm install` and `pnpm build` are smart
about incremental work.

## Manual install

```bash
git clone <this-repo>
cd open-seo-checker
pnpm install          # also installs Playwright Chromium
pnpm build            # compiles api (tsc) and web (vite)
pnpm server           # boots the API + SPA on http://localhost:7437
```

The dashboard auto-opens in your default browser. Once it's up, the
two run modes are interchangeable from the CLI:

| Mode | Command | Use case |
|------|---------|----------|
| Production | `pnpm server` | Single-port serving (`7437`), no live reload. Best for one-time audits. |
| Dev orchestrator | `pnpm start:sh` | BE+FE colour-coded logs, readiness probes, Ctrl+C graceful shutdown. Best while iterating. |
| One-click launcher | `./open-seo-checker.sh`  or  `open-seo-checker.bat` | Same as production with auto-open + auto-build. |
| One-off crawl | `pnpm crawl https://example.com` | No dashboard, exports CSV/JSON/XLSX. |

## Verify the install

After `pnpm server` (or via the desktop shortcut), `curl` the health
endpoint:

```bash
curl http://localhost:7437/api/health
#  → {"status":"ok","version":"0.1.0"}
```

Then browse to `http://localhost:7437` and confirm the sidebar
lists: Dashboard, New Crawl, Crawl Runs, Sitemap Studio, Compare
Runs, AI Insights, Reports, Settings. Clicking **New Crawl** →
**Start a crawl** exercises the analyzer stack end-to-end.

## Updating

```bash
git pull                                # get the latest code
./install.sh                            # re-pull deps + rebuild + refresh shortcut
# or, if you cloned manually:
pnpm install && pnpm build
```

## Uninstall

The shortcut lives in the user-level slot — no system-wide files are
installed. To remove:

1. Delete the desktop entry:
   - macOS:  drag `~/Desktop/Open SEO Checker.app` to the Trash
   - Linux:  `rm ~/Desktop/Open SEO Checker.desktop`
   - Windows: right-click `Open SEO Checker.lnk` → Delete
2. Delete the cloned repo (and its `crawls/`, `exports/`, `node_modules/`).
3. Optionally: `rm -rf ~/.cache/open-seo-checker`  (Playwright Chromium cache).

## Troubleshooting

**The shortcut does nothing when double-clicked.**
- macOS: the first double-click may take a few seconds while Gatekeeper
  validates the bundle. If it says it can't be opened, right-click
  → **Open** → confirm the warning once.
- Windows: the `.lnk` target — `open-seo-checker.bat` — must remain
  inside the repo folder. If you ever moved the repo, re-run
  `install.bat` to refresh.

**Port `7437` (or `5173`) is already in use.**
Kill the lingering process:
```bash
lsof -ti:7437 | xargs kill -9     # macOS / Linux
# Windows:  netstat -ano | find ":7437"
```

**`pnpm install` fails on the Playwright postinstall.**
Playwright's browser CDN may be blocked. Run `npx playwright install
chromium` manually — the installer stops on its own failure and
prints the exact command.

**The dashboard loads but every panel is empty.**
The `crawls/` folder may have been cleared. Start a crawl to
repopulate, or restore a backup from `crawls/`.

**AI Settings shows "Not configured".**
AI keys are stored in browser local storage. Open **Settings**,
pick a provider under **Default AI provider** (OpenAI, Anthropic,
Gemini, Kimi, MiniMax, or local Ollama), enter the API key, and
save. The Insights tab auto-unlocks once a provider is set.
