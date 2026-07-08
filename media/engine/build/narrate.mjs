#!/usr/bin/env node
// Narration → per-scene WAVs + the master timeline (timeline.json / timeline.js).
// Providers (story.json narration.provider or --provider):
//   pico       SVOX Pico diphone TTS (default; rule-based, offline, no AI)
//   espeak     espeak-ng formant synthesis (offline)
//   dir        pre-recorded human narration: reads <story>/voice/<sceneId>.wav
//              (record your own takes, drop them in, timing adapts automatically)
//   elevenlabs stub — wire your API key + fetch call here when you want it
//
// Sentence-breathing (pico/espeak/elevenlabs only — 'dir' human takes are
// used verbatim): each scene's tts is split on sentence enders ('. ', '; ',
// '! ', '? ') and every sentence is synthesized on its own, then concatenated
// with a fixed silence gap between sentences (a generated silence WAV + the
// ffmpeg concat demuxer — deterministic, no re-encoding surprises) before the
// storyteller post-chain runs over the whole assembled scene. That's what
// keeps the film from reading every sentence back to back with no room to
// land.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { storyDir, loadStory, arg } from './lib.mjs';

const story = storyDir(process.argv);
const cfg = loadStory(story);
const script = JSON.parse(readFileSync(join(story, 'script.json'), 'utf8'));
const provider = arg(process.argv, '--provider', cfg.narration?.provider || 'pico');
const audioDir = join(story, 'audio');
mkdirSync(audioDir, { recursive: true });

// silence between sentence chunks within a scene, so the narration breathes
const SENTENCE_GAP_S = 0.55;

const dur = f => parseFloat(execFileSync('ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

function probeAudio(f) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0',
    '-show_entries', 'stream=sample_rate,channels', '-of', 'csv=p=0', f]).toString().trim();
  const [rate, channels] = out.split(',').map(Number);
  return { rate, channels };
}

// split scene text into sentences on '. ' / '; ' / '! ' / '? ' (the ending
// punctuation stays with the sentence it closes; the whitespace after it
// becomes the concat boundary — replaced by SENTENCE_GAP_S of real silence).
function splitSentences(text) {
  return text.split(/(?<=[.;!?])\s+/).map(s => s.trim()).filter(Boolean);
}

function synthText(text, out) {
  if (provider === 'espeak') {
    execFileSync('espeak-ng', ['-v', cfg.narration?.voice || 'en-gb', '-s', '150', '-w', out, text]);
  } else {
    execFileSync('pico2wave', ['-l', cfg.narration?.voice || 'en-GB', '-w', out, text]);
  }
}

function synthesize(scene, out) {
  const raw = join(audioDir, `raw-${scene.id}.wav`);
  if (provider === 'dir') {
    const take = join(story, 'voice', `${scene.id}.wav`);
    if (!existsSync(take)) throw new Error(`missing human take: ${take}`);
    copyFileSync(take, raw);
  } else if (provider === 'elevenlabs') {
    throw new Error('elevenlabs provider is a stub: add your API call in narrate.mjs (needs ELEVENLABS_API_KEY)');
  } else {
    // pico/espeak: sentence-breathing — synthesize each sentence on its own,
    // then concatenate with a fixed silence gap (deterministic: same
    // generated silence file, same concat demuxer, every time).
    const chunks = splitSentences(scene.tts);
    if (chunks.length <= 1) {
      synthText(scene.tts, raw);
    } else {
      const chunkPaths = chunks.map((c, i) => {
        const p = join(audioDir, `raw-${scene.id}-${i}.wav`);
        synthText(c, p);
        return p;
      });
      const { rate, channels } = probeAudio(chunkPaths[0]);
      const silence = join(audioDir, `silence-${scene.id}.wav`);
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi',
        '-i', `anullsrc=r=${rate}:cl=${channels === 1 ? 'mono' : 'stereo'}`,
        '-t', String(SENTENCE_GAP_S), '-c:a', 'pcm_s16le', silence]);
      const listFile = join(audioDir, `raw-${scene.id}.concat.txt`);
      const lines = [];
      chunkPaths.forEach((p, i) => {
        lines.push(`file '${p}'`);
        if (i < chunkPaths.length - 1) lines.push(`file '${silence}'`);
      });
      writeFileSync(listFile, lines.join('\n') + '\n');
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', listFile,
        '-ar', String(rate), '-ac', String(channels), '-c:a', 'pcm_s16le', raw]);
      for (const p of chunkPaths) rmSync(p, { force: true });
      rmSync(silence, { force: true });
      rmSync(listFile, { force: true });
    }
  }
  // storyteller register: slight pitch-down, EQ, breath of room, loudness match.
  const pitch = cfg.narration?.pitch ?? 0.95;
  const tempo = cfg.narration?.tempo ?? 1.0;
  const af = provider === 'dir'
    ? 'highpass=f=60,loudnorm=I=-17:TP=-2:LRA=9,aresample=44100' // human takes: keep natural
    : `asetrate=16000*${pitch},aresample=44100,atempo=${tempo},` +
      'highpass=f=75,lowpass=f=7600,equalizer=f=220:t=q:w=1.2:g=2,treble=g=-1.5,' +
      'aecho=0.55:0.42:26|44:0.13|0.08,loudnorm=I=-17:TP=-2:LRA=9,aresample=44100';
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-af', af, '-ac', '1', out]);
}

let cursor = 0;
const timeline = [];
for (const scene of script.scenes) {
  const out = join(audioDir, `narr-${scene.id}.wav`);
  synthesize(scene, out);
  const d = dur(out);
  const start = cursor;
  const total = scene.pad_before + d + scene.pad_after;
  timeline.push({
    id: scene.id, name: scene.name, display: scene.display,
    mood: scene.mood, start: +start.toFixed(3),
    narrAt: +(start + scene.pad_before).toFixed(3),
    narrDur: +d.toFixed(3), dur: +total.toFixed(3),
    end: +(start + total).toFixed(3),
  });
  cursor += total;
}

const tl = { title: script.title || cfg.title, subtitle: script.subtitle || cfg.subtitle, total: +cursor.toFixed(3), scenes: timeline };
writeFileSync(join(story, 'timeline.json'), JSON.stringify(tl, null, 2));
writeFileSync(join(story, 'timeline.js'),
  '// generated by narrate.mjs — do not edit\nconst TIMELINE = ' + JSON.stringify(tl, null, 1) + ';\n');
for (const s of timeline)
  console.log(`${s.id.padEnd(10)} start=${s.start.toFixed(1).padStart(6)}  narr=${s.narrDur.toFixed(1).padStart(5)}s  scene=${s.dur.toFixed(1).padStart(5)}s`);
console.log(`TOTAL ${cursor.toFixed(1)}s  (provider: ${provider})`);
