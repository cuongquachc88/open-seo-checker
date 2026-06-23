import { chromium } from 'playwright';

export interface RenderPageResult {
  html: string;
  screenshot?: Buffer;
  resources: string[];
}

export async function renderPage(
  url: string,
  timeout = 30000
): Promise<RenderPageResult> {
  let browser;

  try {
    browser = await chromium.launch();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Playwright failed to launch Chromium: ${message}`);
  }

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const resources: string[] = [];

    await page.route('**/*', (route) => {
      try {
        resources.push(route.request().url());
      } catch {
        // Ignore route inspection failures.
      }
      route.continue().catch(() => {
        // Ignore continue failures for aborted requests.
      });
    });

    await page.goto(url, { waitUntil: 'networkidle', timeout });
    const html = await page.content();

    return { html, resources };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Playwright failed to render ${url}: ${message}`);
  } finally {
    await browser.close().catch(() => {
      // Ignore close errors so we never leak a hanging browser.
    });
  }
}
