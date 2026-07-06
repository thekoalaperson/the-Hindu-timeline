#!/usr/bin/env node
// Review stills for a story or any test page — THE quality loop.
//   node shots.mjs --story <slug> --out <dir> --times "3,12,17.5"
//   node shots.mjs --page engine/test/lineup.html --out <dir> [--query t=2]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { storyDir, arg, CHROMIUM, mediaDir } from './lib.mjs';

const out = arg(process.argv, '--out', '/tmp/shots');
mkdirSync(out, { recursive: true });
const pageArg = arg(process.argv, '--page', null);

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: ['--no-sandbox', '--force-color-profile=srgb'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1200 } });
page.on('pageerror', e => { console.error('PAGE ERROR:', e.message); process.exitCode = 1; });
page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE:', m.text()); });

if (pageArg) {
  const q = arg(process.argv, '--query', '');
  const p = resolve(mediaDir, pageArg);
  await page.goto(`file://${p}${q ? '?' + q : ''}`);
  await page.waitForTimeout(450);
  await page.screenshot({ path: join(out, 'page.png'), clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  console.log('wrote', join(out, 'page.png'));
} else {
  const story = storyDir(process.argv);
  const times = (arg(process.argv, '--times', '1')).split(',').map(Number);
  await page.goto(`file://${join(story, 'dev.html')}?render=1`);
  await page.waitForFunction(() => window.__renderFrame);
  for (const t of times) {
    await page.evaluate(([t]) => { __film.draw(document.getElementById('cv').getContext('2d'), t, {}); }, [t]);
    await page.waitForTimeout(60);
    const el = await page.$('#cv');
    const f = join(out, `t${String(t).replace('.', '_')}.png`);
    await el.screenshot({ path: f });
    console.log('wrote', f);
  }
}
await browser.close();
