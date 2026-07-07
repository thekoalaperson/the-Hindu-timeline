#!/usr/bin/env node
// Headless film render for a story: frames → H.264+AAC MP4.
//   node render.mjs --story <slug> [--fps 24] [--crf 22]
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { storyDir, loadStory, loadTimeline, arg, CHROMIUM } from './lib.mjs';

const story = storyDir(process.argv);
const cfg = loadStory(story);
const TL = loadTimeline(story);
const FPS = +arg(process.argv, '--fps', cfg.video?.fps || 24);
const CRF = arg(process.argv, '--crf', String(cfg.video?.crf ?? 22));
const FRAMES = Math.ceil(TL.total * FPS);
const outDir = process.env.FRAME_DIR || `/tmp/frames-${cfg.slug}`;
mkdirSync(outDir, { recursive: true });
mkdirSync(join(story, 'dist'), { recursive: true });

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: ['--no-sandbox', '--force-color-profile=srgb', '--disable-lcd-text'],
});
const page = await browser.newPage({ viewport: { width: 1980, height: 1200 } });
page.on('pageerror', e => { console.error('PAGE ERROR:', e.message); process.exitCode = 1; });
await page.goto(`file://${join(story, 'dev.html')}?render=1`);
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

const mp4 = join(story, 'dist', `${cfg.slug}.mp4`);
const srt = join(story, 'dist', 'captions.srt');
const args = ['-y', '-v', 'error',
  '-framerate', String(FPS), '-i', join(outDir, 'f%05d.jpg'),
  '-i', join(story, 'audio', 'mix.wav')];
const haveSrt = existsSync(srt);
if (haveSrt) args.push('-i', srt);
args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '160k');
if (haveSrt) args.push('-c:s', 'mov_text', '-metadata:s:s:0', 'language=eng');
// cap at the timeline total explicitly: -shortest would truncate at the END
// OF THE LAST SUBTITLE CUE (captions end when narration ends, before the
// final contemplative hold), silently chopping the end folio + closing bell.
args.push('-movflags', '+faststart', '-t', String(TL.total), mp4);
execFileSync('ffmpeg', args, { stdio: 'inherit' });
console.log('encoded', mp4, haveSrt ? '(with captions track)' : '');
