# Releasing

Open SEO Checker ships as source on `main` and as a tagged GitHub
release that bundles the compiled artifacts. This document captures
the local checklist, the tag convention, and what `.github/workflows/
release.yml` does automatically.

## Versioning

We follow [Semantic Versioning](https://semver.org/).

- `vMAJOR.MINOR.PATCH` (e.g. `v0.1.0`)
- Backwards-incompatible: `MAJOR` bump.
- New feature backward-compatible: `MINOR` bump.
- Bug-fix only: `PATCH` bump.

The version is also written into `packages/api/package.json`. The
release workflow stamps it into the build manifest automatically.

## Tag conventions

The release workflow accepts two tag shapes. Both produce the same
artefacts; the `release-` prefix is stripped from the GitHub Release
title so the published release is still named `v0.X.Y`.

- `v0.X.Y` — plain semver tag (e.g. `v0.1.0`).
- `release-v0.X.Y` — explicit release tag (e.g. `release-v0.1.0`).
  Use this when you want the tag itself to say "release" while the
  published release keeps the clean version name.

## Local release checklist

Before tagging, run the full test gate locally:

```bash
pnpm install
pnpm lint
pnpm test:unit         # vitest suite (api package)
pnpm build             # tsc + vite builds both packages
PW_BOOT=1 pnpm test:e2e   # playwright suite (auto-spawns dev orchestrator)
```

If everything is green, commit any pending changes in atomic,
feature-grouped commits (the repo convention). Then push either tag
shape:

```bash
# Option A: plain semver tag
git tag v0.X.Y
git push origin main --tags

# Option B: explicit release tag (release- prefix is stripped from the
#           GitHub Release title, so the release is still named v0.X.Y)
git tag release-v0.X.Y
git push origin main --tags
```

Pushing the tag triggers `.github/workflows/release.yml`. It builds
the project, packages a tarball + zip, and creates a GitHub Release
with auto-generated notes from the commits since the previous tag.

## What the release workflow ships

For each tag, the workflow produces a GitHub Release published on
the **Releases** page of the repo. The body is auto-generated from
the commits since the previous tag, plus a fixed header pointing at
the install and run instructions.

It also attaches three runnable artefacts to every release:

1. **`source.zip`** / **`source.tar.gz`** — full repo snapshot at
   the tag (auto-attached by GitHub).
2. **`open-seo-checker.zip`** — Windows-friendly archive with
   `install.bat` at root + the prebuilt `public/` SPA + the compiled
   `packages/api/dist/`. Unzip then double-click `install.bat`.
3. **`open-seo-checker.tar.gz`** — macOS / Linux-friendly archive
   with `install.sh` at root + the prebuilt `public/` SPA + the
   compiled `packages/api/dist/`. Extract then run `./install.sh`.

Both archives are _self-contained bundles_: the recipient does **not
need a script-clone-and-build** cycle to use them. They run when
their platform's installer is invoked.

## Releasing a hotfix

If you must ship a fix without bumping the minor version:

```bash
git checkout main
git pull
# cherry-pick or commit the fix in an atomic commit
git tag v0.X.Y+1
git push origin main --tags
```

## Inspecting a release locally

To smoke-test a release without publishing:

```bash
# build artefacts identical to what the workflow ships
pnpm build
mkdir -p output
cp -R public                       output/
cp -R packages/api/dist            output/dist
cp    install.sh install.bat open-seo-checker.sh open-seo-checker.bat start.sh   output/
tar czf output/open-seo-checker.tar.gz -C output dist public install.sh install.bat open-seo-checker.sh open-seo-checker.bat start.sh
(cd output && zip -qr ../output/open-seo-checker.zip dist public install.sh install.bat open-seo-checker.sh open-seo-checker.bat start.sh)
```

Then drop the tarball to a clean container and run `./install.sh`
to verify the closed-loop install path. The release.yml workflow
performs the same packaging under `./output/` (with a CI-side check
that nothing escaped to the workspace root).
