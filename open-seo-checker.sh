#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Build the React frontend (builds into public/) and the Hono backend
# (builds into packages/api/dist/) if needed.
if [ ! -f public/index.html ] || [ ! -f packages/api/dist/index.js ]; then
  echo "Preparing build artifacts..."
  if command -v pnpm >/dev/null 2>&1; then
    pnpm install --silent
    pnpm build
  else
    npm install
    npm run build
  fi
fi

# Start the server (it serves both the API on /api/* and the React SPA from public/).
# Running from packages/api/dist/ lets Node resolve dependencies from the
# package's own node_modules (works for both release bundles and workspaces).
node packages/api/dist/index.js serve --port 7437 &
SERVER_PID=$!

sleep 2

# Try to open the dashboard in a browser.
URL="http://localhost:7437"
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "$URL" >/dev/null 2>&1 || true
fi

echo "Open SEO Checker is running at $URL"
echo "Press Ctrl+C to stop."
wait $SERVER_PID
