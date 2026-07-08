#!/usr/bin/env node
// Render the story's poster frame (its "one image") with title typography.
//   node poster.mjs --story <slug> [--t <seconds>]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { storyDir, loadStory, loadTimeline, arg, CHROMIUM } from './lib.mjs';

const story = storyDir(process.argv);
const cfg = loadStory(story);
const TL = loadTimeline(story);
const t = +arg(process.argv, '--t', cfg.poster?.t ?? +(TL.total * 0.42).toFixed(2));
mkdirSync(join(story, 'dist'), { recursive: true });

const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1980, height: 1200 } });
page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
await page.goto(`file://${join(story, 'dev.html')}?render=1`);
await page.waitForFunction(() => window.__renderFrame);
await page.evaluate(([t, meta]) => {
  const cv = document.getElementById('cv');
  const c = cv.getContext('2d');
  __film.draw(c, t, { subs: false });
  if (typeof drawPosterTitle === 'function') drawPosterTitle(c, meta);
}, [t, { title: cfg.title, subtitle: cfg.subtitle }]);
const el = await page.$('#cv');
await el.screenshot({ path: join(story, 'dist', 'poster.png') });
await browser.close();
console.log(`poster.png at t=${t}`);
