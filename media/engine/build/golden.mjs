#!/usr/bin/env node
// Golden-frame regression harness. The renderer is deterministic, so frame
// hashes are stable: any diff = a real visual change.
//   node golden.mjs --story <slug> [--update]
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { storyDir, loadTimeline, CHROMIUM } from './lib.mjs';

const story = storyDir(process.argv);
const TL = loadTimeline(story);
const update = process.argv.includes('--update');
const goldenPath = join(story, 'golden.json');

// sample scene starts + midpoints
const times = [];
for (const s of TL.scenes) {
  times.push(+(s.start + 0.5).toFixed(2), +(s.start + s.dur / 2).toFixed(2));
}

const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1980, height: 1200 } });
let pageError = null;
page.on('pageerror', e => { pageError = e.message; });
await page.goto(`file://${join(story, 'dev.html')}?render=1`);
await page.waitForFunction(() => window.__renderFrame);

const hashes = {};
for (const t of times) {
  const dataUrl = await page.evaluate(([t]) => {
    const cv = document.getElementById('cv');
    __film.draw(cv.getContext('2d'), t, {});
    return cv.toDataURL('image/png');
  }, [t]);
  hashes[t] = createHash('sha256').update(dataUrl).digest('hex').slice(0, 16);
}
await browser.close();
if (pageError) { console.error('PAGE ERROR:', pageError); process.exit(1); }

if (update || !existsSync(goldenPath)) {
  writeFileSync(goldenPath, JSON.stringify(hashes, null, 2));
  console.log(`golden.json ${update ? 'updated' : 'created'}: ${times.length} frames`);
} else {
  const golden = JSON.parse(readFileSync(goldenPath, 'utf8'));
  let fails = 0;
  for (const [t, h] of Object.entries(hashes)) {
    if (golden[t] && golden[t] !== h) { console.error(`DIFF at t=${t}: ${golden[t]} → ${h}`); fails++; }
  }
  if (fails) { console.error(`${fails}/${times.length} golden frames changed (run --update if intentional)`); process.exit(1); }
  console.log(`golden: ${times.length} frames unchanged ✓`);
}
