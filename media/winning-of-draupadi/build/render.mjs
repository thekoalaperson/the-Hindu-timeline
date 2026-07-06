#!/usr/bin/env node
// Headless film render: deterministic frames → JPEG sequence → MP4 (H.264 + AAC).
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const FPS = 24;
const TL = JSON.parse(readFileSync(join(here, 'timeline.json'), 'utf8'));
const FRAMES = Math.ceil(TL.total * FPS);
const outDir = process.env.FRAME_DIR || '/tmp/wod-frames';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--force-color-profile=srgb', '--disable-lcd-text'],
});
const page = await browser.newPage({ viewport: { width: 1980, height: 1200 } });
page.on('pageerror', e => { console.error('PAGE ERROR:', e.message); process.exitCode = 1; });
await page.goto(`file://${resolve(root, 'src/index-dev.html')}?render=1`);
await page.waitForFunction(() => window.__renderFrame);

const t0 = Date.now();
for (let i = 0; i < FRAMES; i++) {
  const dataUrl = await page.evaluate(([i, fps]) => window.__renderFrame(i, fps), [i, FPS]);
  writeFileSync(join(outDir, `f${String(i).padStart(5, '0')}.jpg`),
    Buffer.from(dataUrl.slice(23), 'base64'));
  if (i % 240 === 0) {
    const rate = (i + 1) / ((Date.now() - t0) / 1000);
    console.log(`frame ${i}/${FRAMES}  (${rate.toFixed(1)} fps, eta ${((FRAMES - i) / rate / 60).toFixed(1)} min)`);
  }
}
await browser.close();
console.log(`rendered ${FRAMES} frames in ${((Date.now() - t0) / 60000).toFixed(1)} min`);

execFileSync('ffmpeg', ['-y', '-v', 'error',
  '-framerate', String(FPS), '-i', join(outDir, 'f%05d.jpg'),
  '-i', join(root, 'audio', 'mix.wav'),
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k',
  '-movflags', '+faststart', '-shortest',
  join(root, 'dist', 'winning-of-draupadi.mp4'),
], { stdio: 'inherit' });
console.log('encoded dist/winning-of-draupadi.mp4');
