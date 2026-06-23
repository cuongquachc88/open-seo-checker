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
# Readiness probes: poll each service until it answers HTTP, then emit a
# colour-coded status row that clearly distinguishes BACKEND (blue) from
# FRONTEND (magenta). Fail fast if either process exits early.
# -----------------------------------------------------------------------------
probe_ready() {
  local label="$1"
  local pid="$2"
  local url="$3"
  local log="$4"
  local tag_color="$5"
  local stack_label="$6"

  for _ in $(seq 1 50); do
    if ! kill -0 "$pid" 2>/dev/null; then
      printf "\n${RED}%s exited before opening %s.${RESET}\n" "$label" "$url"
      printf "${DIM}last lines of %s:${RESET}\n" "$log"
      tail -n 30 "$log" | sed 's/^/    /'
      shutdown "early-exit"
    fi
    if curl -sf -o /dev/null --max-time 1 "$url" 2>/dev/null; then
      printf "${GREEN}\xE2\x9C\x93${RESET}  ${tag_color}\xE2\x97\x8F${RESET}  ${BOLD}%-9s${RESET}  ${DIM}stack${RESET} ${tag_color}${stack_label}${RESET}  ${BOLD}\xE2\x86\x92${RESET} ${BOLD}%s${RESET}\n" \
        "$label" "$url"
      return 0
    fi
    sleep 0.4
  done
  printf "${YELLOW}!${RESET}   ${tag_color}\xE2\x97\x8F${RESET}  ${BOLD}%-9s${RESET}  ${YELLOW}did not respond within 20s; check %s${RESET}\n" \
    "$label" "$log"
  return 1
}

probe_ready "backend"  "$BE_PID" "http://localhost:7437/api/runs" "$BE_LOG"  "$BLUE"    "Hono + SQLite"
probe_ready "frontend" "$FE_PID" "http://localhost:5173/"           "$FE_LOG"  "$MAGENTA" "Vite + React"

printf "\n${DIM}role layout:${RESET}\n"
printf "  ${BLUE}\xE2\x97\x8F${RESET}  ${BOLD}%-9s${RESET}  ${BOLD}%-32s${RESET} ${DIM}API + SPA on the same port${RESET}\n" \
  "backend"  "http://localhost:7437"
printf "  ${MAGENTA}\xE2\x97\x8F${RESET}  ${BOLD}%-9s${RESET}  ${BOLD}%-32s${RESET} ${DIM}/api proxied to the backend${RESET}\n" \
  "frontend" "http://localhost:5173"
printf "\n${DIM}(tip: tail logs in another terminal with \xE2\x80\x9Cpnpm monitor\xE2\x80\x9D)${RESET}\n\n"

# Block until either child exits.
wait "${PIDS[0]}" "${PIDS[1]}" 2>/dev/null || true
shutdown "wait-finished"
