#!/usr/bin/env node
// Capture review stills at several timeline moments: node frames.mjs out-dir t1 t2 ...
import { chromium } from 'playwright-core';
import { resolve, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const [, , outDir, ...times] = process.argv;
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--force-color-profile=srgb'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1200 } });
page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
await page.goto(`file://${resolve('src/index-dev.html')}`);
await page.waitForTimeout(500);
for (const ts of times) {
  await page.evaluate((v) => {
    const s = document.getElementById('seek');
    s.value = v;
    s.dispatchEvent(new Event('input'));
  }, ts);
  await page.waitForTimeout(160);
  const el = await page.$('#cv');
  await el.screenshot({ path: join(outDir, `t${String(ts).replace('.', '_')}.png`) });
  console.log('t =', ts);
}
await browser.close();
