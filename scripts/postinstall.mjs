#!/usr/bin/env node
import { execSync } from 'child_process';

// Install Playwright browsers for Chromium.
// This runs automatically after `pnpm install` at the workspace root.
// Playwright is a runtime dep of @oseo/api, so we install via that package.
try {
  console.log('Installing Playwright Chromium browser...');
  execSync('pnpm --filter @oseo/api exec playwright install chromium', {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
} catch (err) {
  console.error('Failed to install Playwright browsers. Run manually:');
  console.error('  pnpm --filter @oseo/api exec playwright install chromium');
  // Don't fail install; browsers can be installed later.
  process.exit(0);
}
