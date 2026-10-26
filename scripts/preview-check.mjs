import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 500));
});
await page.goto('http://127.0.0.1:8081', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(10000);
await mkdir('docs/evidence', { recursive: true });
await page.screenshot({ path: 'docs/evidence/preview.png', fullPage: true });
console.log((await page.locator('body').innerText()).slice(0, 7000));
console.log('PAGE ERRORS', errors);
await writeFile('docs/evidence/browser-errors.json', JSON.stringify(errors, null, 2));
await browser.close();
