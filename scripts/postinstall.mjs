#!/usr/bin/env node
import { execSync } from 'child_process';

// Install Playwright browsers for Chromium
// This runs automatically after pnpm install
try {
  console.log('Installing Playwright Chromium browser...');
  execSync('npx playwright install chromium', { stdio: 'inherit' });
} catch (err) {
  console.error('Failed to install Playwright browsers. Run manually: npx playwright install chromium');
  // Don't fail install, browsers can be installed later
  process.exit(0);
}
