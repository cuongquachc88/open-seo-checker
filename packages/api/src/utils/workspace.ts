/**
 * Resolve the Open SEO Checker workspace root directory at runtime.
 *
 * Several paths (public/, crawls/, exports/, tokens.json) are stored at
 * the workspace root regardless of whether the api runs from
 * `packages/api/dist/index.js` (production) or via `tsx watch src/index.ts`
 * (development). Process cwd varies depending on how the api is launched:
 *
 *   node packages/api/dist/index.js            -> cwd = workspace root
 *   pnpm --filter @oseo/api serve              -> cwd = workspace root
 *   pnpm --filter @oseo/api exec oseo serve    -> cwd = workspace root
 *   tsx src/index.ts                           -> cwd = workspace root
 *   ./start.sh wrapper                        -> cwd = workspace root
 *
 * To stay robust across these variants (and survive future changes to
 * pnpm's cwd handling), resolve the workspace root by walking upward from
 * process.cwd() until a `pnpm-workspace.yaml` is found. Falls back to cwd
 * when the marker is missing.
 */
import path from 'path';
import fs from 'fs';

export function workspaceRoot(start: string = process.cwd()): string {
  let dir = start;
  // walk up to fs root looking for pnpm-workspace.yaml
  for (let depth = 0; depth < 12 && dir !== path.dirname(dir); depth += 1) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return start;
}

export function publicDir(): string {
  return path.join(workspaceRoot(), 'public');
}

export function crawlsDir(): string {
  const dir = path.join(workspaceRoot(), 'crawls');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function exportsDir(): string {
  return path.join(workspaceRoot(), 'exports');
}

export function tokensPath(): string {
  return path.join(workspaceRoot(), 'tokens.json');
}
