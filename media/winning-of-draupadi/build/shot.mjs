#!/usr/bin/env node
// Screenshot a page (art review tool). usage: node shot.mjs <html> <out.png> [query]
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';

const [, , html, out, query] = process.argv;
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--force-color-profile=srgb'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => { console.error('PAGE ERROR:', e.message); });
page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE:', m.text()); });
await page.goto(`file://${resolve(html)}${query ? '?' + query : ''}`);
await page.waitForTimeout(400);
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
await browser.close();
console.log('wrote', out);
