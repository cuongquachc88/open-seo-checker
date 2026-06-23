#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
node dist/index.js serve --port 7437 &
SERVER_PID=$!
sleep 2
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:7437
elif command -v open &> /dev/null; then
    open http://localhost:7437
fi
wait $SERVER_PID
