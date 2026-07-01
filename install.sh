#!/usr/bin/env bash
# =============================================================================
#  Open SEO Checker · one-command installer (macOS / Linux)
# -----------------------------------------------------------------------------
#   1. Ensure Node.js >= 18 and pnpm are available (installs what is missing).
#   2. Install workspace dependencies (this also installs Playwright Chromium).
#   3. Build the API and the dashboard SPA so they can run without any dev
#      step.
#   4. Drop a real "Open SEO Checker" desktop shortcut (a .app bundle on
#      macOS, an XDG .desktop file on Linux) that, when double-clicked,
#      starts the server and opens the dashboard in the default browser.
#
#  Re-run this script any time you want to refresh the shortcut or rebuild
#  the project. It is safe to run repeatedly.
# =============================================================================
set -u

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# ----- ANSI helpers (degrade gracefully when piped) ---------------------------
if [ -t 1 ]; then
  RESET="\033[0m"; BOLD="\033[1m"; DIM="\033[2m"
  CYAN="\033[36m"; BLUE="\033[34m"; MAGENTA="\033[35m"
  GREEN="\033[32m"; YELLOW="\033[33m"; RED="\033[31m"
else
  RESET=""; BOLD=""; DIM=""
  CYAN=""; BLUE=""; MAGENTA=""
  GREEN=""; YELLOW=""; RED=""
fi

# ----- Banner -----------------------------------------------------------------
printf "${CYAN}\n"
printf "  ╔══════════════════════════════════════════════════════════════════╗\n"
printf "  ║                  Open SEO Checker · installer                  ║\n"
printf "  ╚══════════════════════════════════════════════════════════════════╝\n"
printf "${RESET}\n"

OS="$(uname -s 2>/dev/null || echo unknown)"
case "$OS" in
  Darwin) PLATFORM="macOS"  ;;
  Linux)  PLATFORM="Linux"  ;;
  *)      PLATFORM="$OS"    ;;
esac
printf "${BLUE}\xE2\x9A\x99${RESET}  Detected platform: ${BOLD}%s${RESET}\n\n" "$PLATFORM"

# ----- Step 1: prerequisite checks -------------------------------------------
ensure_node() {
  if ! command -v node >/dev/null 2>&1; then
    printf "${RED}\xE2\x9C\x97 node missing${RESET}\n"
    printf "  Install one of:\n"
    printf "    ${MAGENTA}macOS${RESET}    brew install node@20\n"
    printf "    ${MAGENTA}Linux${RESET}    sudo apt-get install -y nodejs npm   (Debian/Ubuntu)\n"
    printf "                sudo dnf install -y nodejs npm        (Fedora)\n"
    printf "    ${MAGENTA}nvm${RESET}      curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash\n"
    printf "                  && nvm install 20 && nvm use 20\n"
    return 1
  fi
  local major
  major="$(node --version 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/')"
  if [ -z "$major" ] || [ "$major" -lt 18 ]; then
    printf "${YELLOW}\xE2\x9C\x97 node too old${RESET}  (%s)\n" "$(node --version 2>/dev/null || echo unknown)"
    printf "  Open SEO Checker needs ${BOLD}Node >= 18${RESET}. Upgrade via the install hints above.\n"
    return 1
  fi
  printf "${GREEN}\xE2\x9C\x93${RESET}  ${BOLD}node${RESET}    %s\n" "$(node --version)"
}

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    printf "${GREEN}\xE2\x9C\x93${RESET}  ${BOLD}pnpm${RESET}    %s\n" "$(pnpm --version)"
    return 0
  fi
  if command -v corepack >/dev/null 2>&1; then
    printf "${YELLOW}\xE2\x9C\x97 pnpm missing${RESET}  enabling via corepack\xE2\x80\xA6\n"
    if corepack enable >/dev/null 2>&1 \
      && corepack prepare pnpm@latest --activate >/dev/null 2>&1 \
      && command -v pnpm >/dev/null 2>&1; then
      printf "${GREEN}\xE2\x9C\x93${RESET}  ${BOLD}pnpm${RESET}    %s (via corepack)\n" "$(pnpm --version)"
      return 0
    fi
  fi
  if command -v npm >/dev/null 2>&1; then
    printf "${YELLOW}\xE2\x9C\x97 pnpm missing${RESET}  installing via npm\xE2\x80\xA6\n"
    if npm i -g pnpm >/dev/null 2>&1 && command -v pnpm >/dev/null 2>&1; then
      printf "${GREEN}\xE2\x9C\x93${RESET}  ${BOLD}pnpm${RESET}    %s (via npm)\n" "$(pnpm --version)"
      return 0
    fi
  fi
  printf "${RED}\xE2\x9C\x97 pnpm missing${RESET}  install manually:  npm i -g pnpm\n"
  return 1
}

printf "${BLUE}\xE2\x86\x92 Step 1/4  Checking prerequisites${RESET}\n"
node_ok=1; pnpm_ok=1
ensure_node  || node_ok=0
ensure_pnpm || pnpm_ok=0
if [ "$node_ok" -ne 1 ] || [ "$pnpm_ok" -ne 1 ]; then
  printf "\n${RED}Installation cannot continue until the missing prerequisites are installed.${RESET}\n"
  exit 1
fi

# Release bundles ship with prebuilt public/ and packages/api/dist/ artefacts
# plus the workspace package files, but no node_modules and no source code.
# We install only production dependencies (native modules are built for the
# target platform) and skip the build step because the bundle is already
# compiled.
IS_BUNDLE=0
if [ -f package.json ] && [ -f pnpm-workspace.yaml ] && [ -f public/index.html ] && [ -f packages/api/dist/index.js ] && [ ! -d packages/api/src ]; then
  IS_BUNDLE=1
fi

# ----- Step 2: pnpm install ---------------------------------------------------
printf "\n${BLUE}\xE2\x86\x92 Step 2/4  Installing workspace dependencies${RESET}\n"
if [ "$IS_BUNDLE" -eq 1 ]; then
  printf "${DIM}    Release bundle detected — installing production dependencies.${RESET}\n"
  pnpm install --prod
else
  printf "${DIM}    (also installs Playwright Chromium for JS rendering)${RESET}\n"
  pnpm install
fi
echo

# ----- Step 3: build ----------------------------------------------------------
printf "${BLUE}\xE2\x86\x92 Step 3/4  Building API + dashboard${RESET}\n"
if [ "$IS_BUNDLE" -eq 1 ]; then
  printf "${DIM}    Release bundle detected — skipping build.${RESET}\n"
else
  pnpm build
fi
echo

# ----- Step 4: shortcut -------------------------------------------------------
printf "${BLUE}\xE2\x86\x92 Step 4/4  Creating desktop shortcut${RESET}\n"

create_macos_shortcut() {
  # Real .app bundle so Finder shows it like any other app and a normal
  # double-click launches Terminal.app with the runner script. The
  # launcher resolves the repo path from its own location ($0) so the
  # bundle stays portable if the repo is moved on disk.
  local desktop="$HOME/Desktop"
  if [ ! -d "$desktop" ]; then
    mkdir -p "$desktop" 2>/dev/null || desktop="$HOME"
  fi
  local app_dir="$desktop/Open SEO Checker.app"
  local macos_dir="$app_dir/Contents/MacOS"
  local resources_dir="$app_dir/Contents/Resources"
  rm -rf "$app_dir" 2>/dev/null || true
  mkdir -p "$macos_dir" "$resources_dir"

  cat > "$app_dir/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>              <string>Open SEO Checker</string>
  <key>CFBundleDisplayName</key>       <string>Open SEO Checker</string>
  <key>CFBundleIdentifier</key>        <string>ai.open-seo-checker.app</string>
  <key>CFBundleVersion</key>           <string>1.0</string>
  <key>CFBundleShortVersionString</key> <string>1.0</string>
  <key>CFBundleExecutable</key>        <string>Open SEO Checker</string>
  <key>CFBundlePackageType</key>       <string>APPL</string>
  <key>LSMinimumSystemVersion</key>    <string>11.0</string>
  <key>LSUIElement</key>               <true/>
  <key>NSHighResolutionCapable</key>   <true/>
</dict>
</plist>
PLIST

  # Launch script  -  self-locates the repo so moving the bundle still works.
  cat > "$macos_dir/Open SEO Checker" <<'LAUNCH'
#!/usr/bin/env bash
# Auto-generated by ./install.sh  -  do not edit by hand.
set -u

# $0 points at this launcher file inside Contents/MacOS/. The repo lives
# three directories above (Contents/MacOS/<file> -> .../Open SEO Checker.app/).
self_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$self_dir/../../.." && pwd)"

# Use Terminal.app so the user sees live server logs after double-clicking.
runner="$repo_dir/open-seo-checker.sh"
if [ ! -f "$runner" ]; then
  osascript -e 'display alert "Open SEO Checker" message "Could not find open-seo-checker.sh in '"$repo_dir"'. Re-run ./install.sh in the repo." as critical buttons {"OK"}'
  exit 1
fi

osascript <<APPLESCRIPT
tell application "Terminal"
  activate
  do script "clear && cd '$repo_dir' && exec bash '$runner'"
end tell
APPLESCRIPT
LAUNCH
  chmod +x "$macos_dir/Open SEO Checker"

  # Backup pointer so the bundle can be opened even if Finder decides to
  # invoke Contents/Resources/run.sh directly (e.g., "Open With").
  cat > "$resources_dir/run.sh" <<EOF
#!/usr/bin/env bash
exec "$DIR/open-seo-checker.sh"
EOF
  chmod +x "$resources_dir/run.sh"

  printf "${GREEN}\xE2\x9C\x93${RESET}  Shortcut: %s\n" "$app_dir"
  printf "${DIM}    Double-click it from Finder to start the server.${RESET}\n"
}

create_linux_shortcut() {
  local desktop="${XDG_DESKTOP_DIR:-$HOME/Desktop}"
  mkdir -p "$desktop"
  local shortcut="$desktop/Open SEO Checker.desktop"
  cat > "$shortcut" <<EOF
[Desktop Entry]
Type=Application
Name=Open SEO Checker
Comment=Start the server and open the dashboard
Exec=bash "$DIR/open-seo-checker.sh"
Terminal=true
Icon=utilities-terminal
Categories=Network;Development;
StartupNotify=false
EOF
  chmod +x "$shortcut"
  printf "${GREEN}\xE2\x9C\x93${RESET}  Shortcut: %s\n" "$shortcut"
  printf "${DIM}    Double-click it from your desktop to start the server.${RESET}\n"
}

case "$OS" in
  Darwin) create_macos_shortcut ;;
  Linux)  create_linux_shortcut  ;;
  *)      printf "${YELLOW}!${RESET}  No shortcut recipe for platform '%s'.\n" "$OS" ;;
esac

# ----- Done -------------------------------------------------------------------
printf "\n${GREEN}\xE2\x9C\x94 Ready.${RESET}\n"
printf "  Quick commands (from this directory):\n"
printf "    ${BLUE}pnpm server${RESET}        run API + SPA on http://localhost:7437\n"
printf "    ${BLUE}pnpm start:sh${RESET}     dev mode with live reload\n"
printf "    ${BLUE}pnpm crawl <url>${RESET}  one-off crawl without the dashboard\n"
printf "  Re-run ${BOLD}./install.sh${RESET} any time to refresh the shortcut or rebuild.\n\n"
