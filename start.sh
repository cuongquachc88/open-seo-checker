#!/usr/bin/env bash
# =============================================================================
#  Open SEO Checker · dev orchestrator
# -----------------------------------------------------------------------------
#  Starts the backend (Hono + SQLite) and the frontend (Vite + React) in the
#  same terminal, with a short startup message and live, prefixed logs below.
#  Press Ctrl+C to stop both.
#
#  Lives at the workspace root (`./start.sh`) so it can be launched directly
#  from a clone: `bash ./start.sh` or via `pnpm start:sh`.
# =============================================================================
set -u

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# -----------------------------------------------------------------------------
# Prerequisite auto-install
# -----------------------------------------------------------------------------
#  Be a good first-run experience: if Node.js (>= 18) or pnpm is missing,
#  install it instead of just bailing. The Node install is a per-OS hint
#  because we never want the script to silently `sudo` anything; pnpm is a
#  single npm / corepack command that always works once Node is on PATH.
ensure_node() {
  if ! command -v node >/dev/null 2>&1; then
    printf '\033[31m[missing]\033[0m  Node.js was not found on PATH.\n'
    printf '             Install one of these:\n'
    printf '               \033[36mmacOS\033[0m   brew install node@20\n'
    printf '               \033[36mLinux\033[0m   sudo apt-get install -y nodejs npm   (Debian/Ubuntu)\n'
    printf '                                sudo dnf install -y nodejs npm        (Fedora)\n'
    printf '               \033[36mnvm\033[0m     curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash\n'
    printf '                        && nvm install 20 && nvm use 20\n'
    printf '               \033[36mWindows\033[0m winget install OpenJS.NodeJS.LTS\n'
    printf '             Then re-run \033[36m./start.sh\033[0m.\n'
    return 1
  fi

  # Major version guard. We require Node >= 18.
  local major
  major="$(node --version 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/')"
  if [ -z "$major" ] || [ "$major" -lt 18 ]; then
    printf '\033[33m[too old]\033[0m  Node.js %s detected; this project requires \033[1m>= 18\033[0m.\n' "$(node --version 2>/dev/null || echo unknown)"
    printf '               Upgrade via the OS-specific instructions above, or use `nvm install 20`.\n'
    return 1
  fi
  return 0
}

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    return 0
  fi

  if ! command -v npm >/dev/null 2>&1 && ! command -v corepack >/dev/null 2>&1; then
    printf '\033[31m[missing]\033[0m  Neither npm nor corepack found. Install Node.js first.\n'
    return 1
  fi

  # 1) corepack (built into Node 16.13+) is the recommended way.
  if command -v corepack >/dev/null 2>&1; then
    printf '\033[36m[install]\033[0m   enabling corepack + activating pnpm\xE2\x80\xA6\n'
    if corepack enable >/dev/null 2>&1 \
      && corepack prepare pnpm@latest --activate >/dev/null 2>&1 \
      && command -v pnpm >/dev/null 2>&1; then
      printf '\033[32m[ok]\033[0m        pnpm ready via corepack.\n'
      return 0
    fi
    printf '\033[33m[fallback]\033[0m  corepack did not yield a pnpm binary; trying npm.\n'
  fi

  # 2) npm fallback.
  if command -v npm >/dev/null 2>&1; then
    printf '\033[36m[install]\033[0m   installing pnpm globally via npm\xE2\x80\xA6\n'
    if npm i -g pnpm >/dev/null 2>&1 && command -v pnpm >/dev/null 2>&1; then
      printf '\033[32m[ok]\033[0m        pnpm installed via npm.\n'
      return 0
    fi
  fi

  printf '\033[31m[failed]\033[0m   could not install pnpm automatically.\n'
  printf '             Run manually: \033[36mnpm i -g pnpm\033[0m  (after ensuring Node is on PATH)\n'
  return 1
}

if ! ensure_node; then
  exit 1
fi
if ! ensure_pnpm; then
  exit 1
fi

# Make sure both runtimes have their node_modules.
if [ ! -d node_modules ] || [ ! -d packages/api/node_modules ] || [ ! -d packages/web/node_modules ]; then
  printf '\033[36m[install]\033[0m   fetching workspace dependencies with pnpm\xE2\x80\xA6\n'
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
# Startup message
# -----------------------------------------------------------------------------
print_startup() {
  printf "${CYAN}Starting Open SEO Checker dev environment${RESET}\n"
  printf "  ${DIM}backend  :7437${RESET}  ${BLUE}Hono + SQLite${RESET}\n"
  printf "  ${DIM}frontend :5173${RESET}  ${MAGENTA}Vite + React${RESET}\n"
  printf "  ${DIM}Each role prints its own banner below. Ctrl+C stops both.${RESET}\n\n"
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
print_startup
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
