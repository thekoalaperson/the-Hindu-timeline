#!/usr/bin/env node
// Generate narration with SVOX Pico (classic diphone TTS — no generative AI),
// post-process for warmth, measure durations, and emit the master timeline.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const audioDir = join(root, 'audio');
mkdirSync(audioDir, { recursive: true });

const script = JSON.parse(readFileSync(join(here, 'script.json'), 'utf8'));

function dur(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries',
    'format=duration', '-of', 'csv=p=0', file]).toString().trim();
  return parseFloat(out);
}

let cursor = 0;
const timeline = [];
for (const scene of script.scenes) {
  const raw = join(audioDir, `raw-${scene.id}.wav`);
  const out = join(audioDir, `narr-${scene.id}.wav`);
  execFileSync('pico2wave', ['-l', 'en-GB', '-w', raw, scene.tts]);
  // Pitch down ~5% for a warmer storyteller register, gentle EQ, a whisper of room.
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-af',
    'asetrate=16000*0.95,aresample=44100,atempo=1.12,' +
    'highpass=f=75,lowpass=f=7600,equalizer=f=220:t=q:w=1.2:g=2,treble=g=-1.5,' +
    'aecho=0.55:0.42:26|44:0.13|0.08,' +
    'loudnorm=I=-17:TP=-2:LRA=9,aresample=44100',
    '-ac', '1', out]);
  const d = dur(out);
  const start = cursor;
  const narrAt = start + scene.pad_before;
  const total = scene.pad_before + d + scene.pad_after;
  timeline.push({
    id: scene.id, name: scene.name, display: scene.display,
    start: +start.toFixed(3), narrAt: +narrAt.toFixed(3),
    narrDur: +d.toFixed(3), dur: +total.toFixed(3),
    end: +(start + total).toFixed(3),
  });
  cursor += total;
}

writeFileSync(join(here, 'timeline.json'), JSON.stringify({
  title: script.title, subtitle: script.subtitle,
  total: +cursor.toFixed(3), scenes: timeline,
}, null, 2));

for (const s of timeline)
  console.log(`${s.id.padEnd(8)} start=${s.start.toFixed(1).padStart(6)}  narr=${s.narrDur.toFixed(1).padStart(5)}s  scene=${s.dur.toFixed(1).padStart(5)}s`);
console.log(`TOTAL ${cursor.toFixed(1)}s`);
