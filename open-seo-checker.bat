@echo off
cd /d "%~dp0"

REM Build the React frontend (builds into public\) and the Hono backend
REM (builds into packages\api\dist\) if needed.
if not exist public\index.html (
  if exist pnpm-lock.yaml (
    call pnpm install --silent && call pnpm build
  ) else (
    call npm install && call npm run build
  )
)

REM Start the server (it serves both the API on /api/* and the React SPA from public/).
REM Running from packages\api\dist\ lets Node resolve dependencies from the
REM package's own node_modules (works for both release bundles and workspaces).
start "Open SEO Checker" /b cmd /c "node packages\api\dist\index.js serve --port 7437"

timeout /t 2 /nobreak >nul
start "" http://localhost:7437
echo Open SEO Checker is running at http://localhost:7437
