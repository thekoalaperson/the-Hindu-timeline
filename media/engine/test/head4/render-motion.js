#!/usr/bin/env node
// Deterministic 10s motion-test renderer for a head4 candidate module.
// Usage: node render-motion.js <candidateAbsPath> <outMp4>
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('/home/user/the-Hindu-timeline/media/node_modules/playwright-core');

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const FPS = 24;
const FRAMES = 240; // 10 seconds

(async () => {
  const [candArg, outArg] = process.argv.slice(2);
  if (!candArg || !outArg) {
    console.error('usage: node render-motion.js <candidateAbsPath> <outMp4>');
    process.exit(1);
  }
  const cand = path.resolve(candArg);
  const out = path.resolve(outArg);
  if (!fs.existsSync(cand)) {
    console.error('candidate not found: ' + cand);
    process.exit(1);
  }
  const htmlPath = path.join(__dirname, 'motion.html');
  if (!fs.existsSync(htmlPath)) {
    console.error('motion.html not found next to render-motion.js: ' + htmlPath);
    process.exit(1);
  }

  const frameDir = fs.mkdtempSync(path.join(__dirname, 'frames-'));
  console.log('frames -> ' + frameDir);

  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--allow-file-access-from-files']
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    page.on('pageerror', e => console.error('[pageerror]', e.message));
    page.on('console', m => { if (m.type() === 'error') console.error('[console.error]', m.text()); });

    const url = 'file://' + htmlPath + '?cand=' + encodeURIComponent(cand);
    await page.goto(url);
    await page.waitForFunction('window.__scriptsLoaded === true', { timeout: 20000 });

    const info = await page.evaluate('window.__loadInfo');
    console.log('scripts loaded: v7ref.js=' + info.ref + ' candidate=' + info.cand);
    if (!info.cand) {
      throw new Error('candidate script failed to load: ' + cand);
    }
    const hasDraw = await page.evaluate('typeof window.drawHead4 === "function"');
    if (!hasDraw) {
      throw new Error('drawHead4 is not defined after loading v7ref.js + candidate');
    }

    for (let i = 0; i < FRAMES; i++) {
      const dataUrl = await page.evaluate(
        (a) => window.__renderFrame(a.i, a.fps),
        { i, fps: FPS }
      );
      const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
      fs.writeFileSync(
        path.join(frameDir, 'frame_' + String(i).padStart(4, '0') + '.jpg'),
        Buffer.from(b64, 'base64')
      );
      if (i % 48 === 0 || i === FRAMES - 1) {
        console.log('frame ' + i + '/' + FRAMES + '  t=' + (i / FPS).toFixed(2) + 's');
      }
    }
  } finally {
    await browser.close();
  }

  execFileSync('ffmpeg', [
    '-y',
    '-framerate', String(FPS),
    '-i', path.join(frameDir, 'frame_%04d.jpg'),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-t', '10',
    out
  ], { stdio: ['ignore', 'inherit', 'inherit'] });

  fs.rmSync(frameDir, { recursive: true, force: true });
  console.log('wrote ' + out);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
