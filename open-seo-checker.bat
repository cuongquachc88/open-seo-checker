@echo off
cd /d "%~dp0"

if not exist public\index.html (
  if exist pnpm-lock.yaml (
    call pnpm install --silent && call pnpm build
  ) else (
    call npm install && call npm run build
  )
)

start "Open SEO Checker" /b node dist\index.js serve --port 7437
timeout /t 2 /nobreak >nul
start "" http://localhost:7437
echo Open SEO Checker is running at http://localhost:7437
