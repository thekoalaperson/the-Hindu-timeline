#!/usr/bin/env node
// Generate dist/captions.srt from the story timeline (same chunking as the
// on-canvas subtitles). render.mjs muxes it into the MP4 when present.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { storyDir, loadTimeline } from './lib.mjs';

const story = storyDir(process.argv);
const TL = loadTimeline(story);

function subChunks(text) {
  const parts = text.match(/[^.!?—]+[.!?…]*(\s*—\s*)?/g) || [text];
  const chunks = [];
  let cur = '';
  for (const p of parts) {
    if ((cur + p).length > 88 && cur) { chunks.push(cur.trim()); cur = p; }
    else cur += p;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}
const stamp = (t) => {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60, r = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(r).padStart(3, '0')}`;
};

let n = 0;
const out = [];
for (const sc of TL.scenes) {
  const chunks = subChunks(sc.display);
  const total = chunks.reduce((a, c) => a + c.length, 0);
  let at = sc.narrAt;
  for (const c of chunks) {
    const d = sc.narrDur * (c.length / total);
    out.push(`${++n}\n${stamp(at)} --> ${stamp(at + d)}\n${c}\n`);
    at += d;
  }
}
mkdirSync(join(story, 'dist'), { recursive: true });
writeFileSync(join(story, 'dist', 'captions.srt'), out.join('\n'));
console.log(`captions.srt: ${n} cues, ${TL.total}s`);
