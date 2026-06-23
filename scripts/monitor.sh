#!/usr/bin/env bash
# =============================================================================
#  Open SEO Checker · monitor mode
# -----------------------------------------------------------------------------
#  Tails the orchestrator's log files from another terminal. Useful when the
#  dev.sh process is running in tmux / separate TTY and you want a dedicated
#  monitor screen.
# =============================================================================
set -u

DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$DIR/.logs/dev"
BE_LOG="$LOG_DIR/backend.log"
FE_LOG="$LOG_DIR/frontend.log"

if [ ! -f "$BE_LOG" ] || [ ! -f "$FE_LOG" ]; then
  printf "\033[33mNo logs found at %s. Run scripts/dev.sh first.\033[0m\n" "$LOG_DIR" >&2
  exit 1
fi

if [ -t 1 ]; then
  RESET="\033[0m"; BOLD="\033[1m"; DIM="\033[2m"
  BLUE="\033[34m"; MAGENTA="\033[35m"; CYAN="\033[36m"
  GREEN="\033[32m"; YELLOW="\033[33m"
else
  RESET=""; BOLD=""; DIM=""
  BLUE=""; MAGENTA=""; CYAN=""; GREEN=""; YELLOW=""
fi

printf "${BOLD}${CYAN}"
cat <<'BLOCK'
 +==========================================================+
 |        O P E N   S E O   C H E C K E R                 |
 |        monitor  ·  tailing live logs                    |
 +==========================================================+
BLOCK
printf "${RESET}\n"
printf "  ${BLUE}\xE2\x97\x8F${RESET} backend  \xE2\x86\x90 %s\n" "$BE_LOG"
printf "  ${MAGENTA}\xE2\x97\x8F${RESET} frontend \xE2\x86\x90 %s\n" "$FE_LOG"
printf "  ${DIM}Ctrl+C to leave${RESET}\n\n"

PIDS=()
shutdown() {
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  exit 0
}
trap 'shutdown' INT TERM

tail -n +1 -f "$BE_LOG" 2>/dev/null | sed -u "s/^/${BLUE}[backend]${RESET}  /" &
PIDS+=($!)
tail -n +1 -f "$FE_LOG" 2>/dev/null | sed -u "s/^/${MAGENTA}[frontend]${RESET} /" &
PIDS+=($!)

wait
