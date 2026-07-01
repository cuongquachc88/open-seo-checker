#!/usr/bin/env bash
# =============================================================================
#  scripts/install-from-release.sh
#
#  One-line installer. Downloads the latest Open SEO Checker bundle from
#  GitHub Releases, extracts it into a tmpdir, runs install.sh, cleans up.
#
#  Override any of these via environment variables before piping to bash:
#    OSE_OWNER    GitHub owner / org (default: cuongquachc88)
#    OSE_REPO     GitHub repo  name       (default: open-seo-checker)
#    OSE_VERSION  release tag             (default: latest)
#    OSE_ASSET    asset filename override (default: auto by platform)
#
#  Examples:
#    # The default one-liner — works with zero env vars:
#    curl -fsSL https://raw.githubusercontent.com/cuongquachc88/open-seo-checker/main/scripts/install-from-release.sh | bash
#
#    # Pin to a tag:
#    OSE_VERSION=v0.1.0 bash <(curl -fsSL ...)
#
#    # Install from a fork:
#    OSE_OWNER=my-fork OSE_REPO=my-fork bash <(curl -fsSL ...)
# =============================================================================

set -euo pipefail

OSE_OWNER="${OSE_OWNER:-cuongquachc88}"
OSE_REPO="${OSE_REPO:-open-seo-checker}"
OSE_VERSION="${OSE_VERSION:-latest}"

# Pick the asset that matches this platform. macOS / Linux use .tar.gz.
case "$(uname -s 2>/dev/null || echo unknown)" in
  Darwin|Linux) OSE_ASSET="${OSE_ASSET:-open-seo-checker.tar.gz}" ;;
  *)            OSE_ASSET="${OSE_ASSET:-open-seo-checker.zip}"    ;;
esac

# The GitHub URL: latest-tag redirect (302) or pinned version.
if [ "$OSE_VERSION" = "latest" ]; then
  DOWNLOAD_URL="https://github.com/${OSE_OWNER}/${OSE_REPO}/releases/latest/download/${OSE_ASSET}"
else
  DOWNLOAD_URL="https://github.com/${OSE_OWNER}/${OSE_REPO}/releases/download/${OSE_VERSION}/${OSE_ASSET}"
fi

# Top-level folder inside the archive (matches the release.yml staging dir).
TARBALL_ROOT="open-seo-checker"

# --- Banner ----------------------------------------------------------------
printf '\n'
printf "${CYAN:-}  Open SEO Checker  ·  one-line installer${RESET:-}\n"
printf "    owner   = %s\n" "$OSE_OWNER"
printf "    repo    = %s\n" "$OSE_REPO"
printf "    version = %s\n" "$OSE_VERSION"
printf "    asset   = %s\n" "$OSE_ASSET"
printf '\n'

# If the user was brave enough to invoke us without OSE_OWNER and the
# default points at an account that does not exist, fail loudly here
# rather than letting GitHub return an HTML 404 page that downstream
# tools would happily try to extract.
if [ "$OSE_OWNER" = "cuongquachc88" ]; then
  printf "${DIM:-}    (defaults used; set OSE_OWNER to install from a fork)${RESET:-}\n"
fi
printf '\n'

# --- Temp workdir + cleanup via trap ---------------------------------------
TARGET="$(mktemp -d -t oseo-install.XXXXXX)"
cleanup() { rm -rf "$TARGET" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

# --- Download --------------------------------------------------------------
printf "  →  Downloading %s\n" "$DOWNLOAD_URL"
if ! curl --fail-with-body -fsSL --retry 3 --connect-timeout 15 \
       -o "$TARGET/bundle" "$DOWNLOAD_URL"; then
  printf "\n  ${RED:-}download failed${RESET:-}\n" >&2
  printf "  Check that %s/%s has a release asset named %s.\n" \
         "$OSE_OWNER" "$OSE_REPO" "$OSE_ASSET" >&2
  exit 1
fi

# --- Extract ---------------------------------------------------------------
case "$OSE_ASSET" in
  *.tar.gz|*.tgz)
    (cd "$TARGET" && tar xzf bundle) ;;
  *.zip)
    (cd "$TARGET" && unzip -q bundle) ;;
  *)
    printf "\n  ${RED:-}unknown asset extension${RESET:-}: %s\n" "$OSE_ASSET" >&2
    exit 1 ;;
esac

ROOT="$TARGET/$TARBALL_ROOT"
if [ ! -d "$ROOT" ] || [ ! -f "$ROOT/install.sh" ]; then
  printf "\n  ${RED:-}unexpected archive layout${RESET:-}\n" >&2
  printf "  expected %s/install.sh, got top-level dirs:\n" "$TARBALL_ROOT" >&2
  ls -1 "$TARGET" >&2
  exit 1
fi

printf "  →  Running %s/install.sh\n" "$TARBALL_ROOT"
chmod +x "$ROOT/install.sh"
exec bash "$ROOT/install.sh"
