#!/usr/bin/env bash
# =============================================================================
#  Open SEO Checker · dev orchestrator
# -----------------------------------------------------------------------------
#  Starts the backend (Hono + SQLite) and the frontend (Vite + React) in the
#  same terminal, with a big banner up top and live, prefixed logs below.
#  Press Ctrl+C to stop both.
# =============================================================================
set -u

DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

# -----------------------------------------------------------------------------
# Dependencies
# -----------------------------------------------------------------------------
if ! command -v pnpm >/dev/null 2>&1; then
  printf '\033[31mERROR\033[0m: pnpm is required. Install with: \033[36m npm i -g pnpm \033[0m\n' >&2
  exit 1
fi

# Make sure both runtimes have their node_modules.
if [ ! -d node_modules ] || [ ! -d frontend/node_modules ]; then
  printf '\033[33mInstalling dependencies…\033[0m\n'
  pnpm install
fi

# -----------------------------------------------------------------------------
# ANSI helpers (degrade to no color when piped)
# -----------------------------------------------------------------------------
if [ -t 1 ]; then
  RESET="\033[0m"; BOLD="\033[1m"; DIM="\033[2m"
  BLUE="\033[34m"; CYAN="\033[36m"; MAGENTA="\033[35m"
  GREEN="\033[32m"; YELLOW="\033[33m"; RED="\033[31m"
else
  RESET=""; BOLD=""; DIM=""
  BLUE=""; CYAN=""; MAGENTA=""
  GREEN=""; YELLOW=""; RED=""
fi

# -----------------------------------------------------------------------------
# Big banner
# -----------------------------------------------------------------------------
print_banner() {
  printf "${BOLD}${CYAN}"
  cat <<'BLOCK'
 +========================================================================+
 |                                                                      |
 |   ____                  _____ ____ ___   _____                       |
 |  / __ \                / ___|  __/ __ \ / ____|                      |
 | | |  | |_ __   ___ _ _| (___ |__ \ ___ | (___                       |
 | | |  | | '_ \ / _ \ '_ \___ \| |/ / |__/_ \___ \                      |
 | | |__| | |_) |  __/ | | __/ / |__| | __| __/ /                      |
 |  \___\_| .__/ \___|_| |_____/|_|  |_____|\____|                      |
 |        |_|                                                           |
 |                                                                      |
 |        O P E N   S E O   C H E C K E R                               |
 |                                                                      |
 +========================================================================+
BLOCK
  printf "${RESET}"
  printf "  ${DIM}A free, open-source technical-SEO auditor.${RESET}\n"
  printf "  ${DIM}Runs both the Hono backend and the Vite frontend from one place.${RESET}\n\n"
  printf "  ${BLUE}\xE2\x97\x8F${RESET} backend  ${BOLD}Hono + SQLite${RESET}      ${DIM}http://localhost:7437${RESET}\n"
  printf "  ${MAGENTA}\xE2\x97\x8F${RESET} frontend ${BOLD}Vite + React${RESET}      ${DIM}http://localhost:5173${RESET}\n"
  printf "  ${DIM}logs below stream live  \xC2\xB7  Ctrl+C to stop both${RESET}\n\n"
}

# -----------------------------------------------------------------------------
# Free-port probe (warn only, do not kill anything)
# -----------------------------------------------------------------------------
check_port() {
  local port="$1"
  local label="$2"
  if lsof -ti:"$port" >/dev/null 2>&1; then
    printf "${YELLOW}!${RESET} port %s is already in use by %s.\n" "$port" "$label"
    printf "  ${DIM}Trying anyway \xE2\x80\x94 the orchestrator will fail fast if the bind dies.${RESET}\n"
  fi
}

# -----------------------------------------------------------------------------
# Per-process log file (so an external monitor can tail it).
# -----------------------------------------------------------------------------
LOG_DIR="$DIR/.logs/dev"
mkdir -p "$LOG_DIR"
BE_LOG="$LOG_DIR/backend.log"
FE_LOG="$LOG_DIR/frontend.log"
: > "$BE_LOG"
: > "$FE_LOG"

# -----------------------------------------------------------------------------
# Trap signals so children get SIGINT/SIGTERM on shutdown.
# -----------------------------------------------------------------------------
PIDS=()
shutdown() {
  local sig="$1"
  printf "\n${YELLOW}received %s \xE2\x80\x94 stopping backend + frontend\xE2\x80\xA6${RESET}\n" "$sig"
  for pid in "${PIDS[@]:-}"; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill -INT "$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
  printf "${DIM}logs preserved at %s and %s${RESET}\n" "$BE_LOG" "$FE_LOG"
  exit 0
}
trap 'shutdown INT'  INT
trap 'shutdown TERM' TERM

# -----------------------------------------------------------------------------
# Launch backend and frontend with colour-tagged live output.
# -----------------------------------------------------------------------------
print_banner
check_port 7437 "backend"
check_port 5173 "frontend"

printf "${GREEN}\xE2\x9C\x93 starting services\xE2\x80\xA6${RESET}\n\n"

# Backend: Hono + SQLite. Colour tag = blue.
(
  pnpm --filter @oseo/api dev 2>&1 \
  | tee -a "$BE_LOG" \
  | sed -u "s/^/$(printf "${BLUE}[backend]${RESET}  ")/"
) &
BE_PID=$!
PIDS+=("$BE_PID")

# Frontend: Vite dev server. Colour tag = magenta.
(
  pnpm --filter @oseo/web dev 2>&1 \
  | tee -a "$FE_LOG" \
  | sed -u "s/^/$(printf "${MAGENTA}[frontend]${RESET} ")/"
) &
FE_PID=$!
PIDS+=("$FE_PID")

# -----------------------------------------------------------------------------
# Readiness probe: wait until the backend's HTTP socket answers, then
# announce. Fail fast if the backend process exits early.
# -----------------------------------------------------------------------------
printf "${DIM}waiting for backend on :7437\xE2\x80\xA6${RESET}\n"
ready=0
for _ in $(seq 1 50); do
  if ! kill -0 "$BE_PID" 2>/dev/null; then
    printf "\n${RED}backend exited before opening :7437.${RESET}\n"
    printf "${DIM}last lines of $BE_LOG:${RESET}\n"
    tail -n 30 "$BE_LOG" | sed 's/^/    /'
    shutdown "early-exit"
  fi
  if curl -sf -o /dev/null --max-time 1 http://localhost:7437/api/runs 2>/dev/null \
  || curl -sf -o /dev/null --max-time 1 http://localhost:7437/          2>/dev/null; then
    ready=1
    break
  fi
  sleep 0.4
done

if [ "$ready" -eq 1 ]; then
  printf "\n${GREEN}\xE2\x9C\x93 backend ready${RESET}    \xE2\x86\x92 http://localhost:7437\n"
  printf "${GREEN}\xE2\x9C\x93 frontend booting${RESET}  \xE2\x86\x92 http://localhost:5173\n\n"
else
  printf "\n${YELLOW}! backend never answered on :7437 within 20s. check $BE_LOG${RESET}\n\n"
fi

# Block until either child exits.
wait "${PIDS[0]}" "${PIDS[1]}" 2>/dev/null || true
shutdown "wait-finished"
