#!/usr/bin/env node
// Procedural score — pure synthesis, no samples, no AI.
// Tanpura drone (Karplus-Strong), bansuri (additive w/ vibrato+breath),
// tabla-ish percussion, temple bells, climax boom.
//
//   node music.mjs --story <slug> [--legacy]
//
// Two composers share the synthesis primitives below (pluck/flute/bell/ge/
// na/boom, the WAV writer, the envelope machinery, the deterministic rng):
//
//   composeLegacy(TL)     the exact hand-composed "Winning of Draupadi" score.
//                         Selected by --legacy, or story.json `music.mode ===
//                         'legacy'`. Byte-identical to the original score —
//                         do not reorder/reword anything in this function;
//                         the rng is a single shared stream and its output
//                         depends on the exact sequence of primitive calls.
//
//   composeMood(TL, cfg)  default. Reads each timeline.json scene's `mood`
//                         (mystic|festive|tense|tender|triumphant|somber|
//                         suspense — unknown/missing mood warns and falls
//                         back to 'tender') and algorithmically composes:
//                           - percussion: pattern/tempo/gain per mood, or
//                             none at all
//                           - melody: register (a note-pool subset of the
//                             existing NOTE table), phrase pacing (notes/sec
//                             + sustain), composed as 2-5 note phrases that
//                             mostly step +-1 in the pool with occasional
//                             leaps, cadence toward D4/D5, seeded per scene
//                             by hash(scene.id) (stable regardless of scene
//                             timing/order/re-narration)
//                           - drone intensity: per-mood gain multiplier on
//                             the continuous tanpura cycle
//                           - stereo width: per-mood mid/side post-process
//                             (primitives' internal pans stay untouched —
//                             they're part of the verbatim synthesis layer)
//                           - master intensity envelope: derived from the
//                             mood timeline with smooth 1.5s ramps at scene
//                             boundaries, plus the usual fade tail
//                         Also applies optional per-scene `events` from
//                         story.json's `music.events` map:
//                           "music": { "events": { "<sceneId>": [
//                             {"at": 12.0, "type": "bell", "freq": 880, "gain": 0.3},
//                             {"at": 4.0,  "type": "boom", "gain": 0.8},
//                             {"at": 6.0,  "type": "swell"},
//                             {"at": 9.5,  "type": "silence", "dur": 2.0}
//                           ] } }
//                         `at` is seconds from scene start. silence ducks
//                         melody+percussion for the window (and dips the
//                         master envelope so already-ringing tails don't mask
//                         it); swell bumps the master envelope briefly.
//
// See engine/CONTRACTS.md "Music moods" for the contract this implements.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { storyDir, loadStory, loadTimeline } from './lib.mjs';

const story = storyDir(process.argv);
const cfg = loadStory(story);
const TL = loadTimeline(story);
const FS = 44100;
const DUR = Math.ceil(TL.total + 1.0);
const N = FS * DUR;
const L = new Float64Array(N), R = new Float64Array(N);

// deterministic rng — shared stream consumed (in order) by the noise-driven
// primitives below (pluck's excitation burst, flute's breath noise, na/boom's
// hit noise). composeLegacy's byte-parity depends on this stream's sequence,
// so never insert extra rnd() consumers ahead of/inside it.
let _s = 1234567;
const rnd = () => { _s = (_s * 1103515245 + 12345) & 0x7fffffff; return _s / 0x7fffffff; };

const NOTE = { A2: 110, D2: 73.42, D3: 146.83, A3: 220, B3: 246.94, D4: 293.66, E4: 329.63, Fs4: 369.99, G4: 392, A4: 440, B4: 493.88, D5: 587.33 };

function addStereo(i, v, pan) { // pan -1..1
  const g = 0.5 * (1 - pan), h = 0.5 * (1 + pan);
  L[i] += v * (0.5 + g); R[i] += v * (0.5 + h);
}

// ── Karplus-Strong pluck ──
function pluck(t0, freq, gain, decayS, pan) {
  const start = Math.floor(t0 * FS);
  const period = Math.max(2, Math.round(FS / freq));
  const buf = new Float64Array(period);
  for (let i = 0; i < period; i++) buf[i] = rnd() * 2 - 1;
  const total = Math.min(N - start, Math.floor(decayS * FS));
  const damp = 0.996;
  let idx = 0;
  for (let i = 0; i < total; i++) {
    const j = idx % period, k = (idx + 1) % period;
    const v = buf[j];
    buf[j] = (buf[j] + buf[k]) * 0.5 * damp;
    idx++;
    const env = 1 - i / total;
    addStereo(start + i, v * gain * env * env, pan);
  }
}

// ── bansuri note (with glide from prev freq) ──
let lastFlute = null;
function flute(t0, name, dur, gain) {
  const f1 = NOTE[name];
  const f0 = lastFlute || f1;
  lastFlute = f1;
  const start = Math.floor(t0 * FS);
  const total = Math.min(N - start, Math.floor((dur + 0.4) * FS));
  let ph = 0, lpNoise = 0;
  for (let i = 0; i < total; i++) {
    const t = i / FS;
    const env = Math.min(t / 0.18, 1) * Math.min((dur + 0.4 - t) / 0.45, 1);
    if (env <= 0) continue;
    const glide = Math.min(t / 0.22, 1);
    const vib = 1 + Math.sin(2 * Math.PI * 5.2 * t) * 0.004 * Math.min(Math.max(t - 0.35, 0), 1);
    const f = (f0 + (f1 - f0) * glide) * vib;
    ph += 2 * Math.PI * f / FS;
    const tone = Math.sin(ph) + 0.32 * Math.sin(2 * ph) + 0.1 * Math.sin(3 * ph);
    const nz = (rnd() * 2 - 1);
    lpNoise += 0.12 * (nz - lpNoise);
    const v = (tone * 0.9 + lpNoise * 0.5) * env * env * gain;
    addStereo(start + i, v, 0.22);
  }
}

// ── bell ──
function bell(t0, base, gain) {
  const start = Math.floor(t0 * FS);
  const parts = [[1, 1], [2.74, 0.55], [5.4, 0.24]];
  const total = Math.min(N - start, Math.floor(2.8 * FS));
  for (let i = 0; i < total; i++) {
    const t = i / FS;
    let v = 0;
    for (const [m, a] of parts) v += a * Math.sin(2 * Math.PI * base * m * t) * Math.exp(-t * (2.2 + m));
    addStereo(start + i, v * gain, 0.4);
  }
}

// ── tabla ──
function ge(t0, gain) { // low bayan with pitch drop
  const start = Math.floor(t0 * FS);
  const total = Math.min(N - start, Math.floor(0.32 * FS));
  let ph = 0;
  for (let i = 0; i < total; i++) {
    const t = i / FS;
    const f = 82 - 30 * Math.min(t / 0.16, 1);
    ph += 2 * Math.PI * f / FS;
    addStereo(start + i, Math.sin(ph) * Math.exp(-t * 12) * gain, -0.08);
  }
}
function na(t0, gain) { // bright tap
  const start = Math.floor(t0 * FS);
  const total = Math.min(N - start, Math.floor(0.09 * FS));
  for (let i = 0; i < total; i++) {
    const t = i / FS;
    const v = (rnd() * 2 - 1) * Math.sin(2 * Math.PI * 1650 * t) * Math.exp(-t * 60);
    addStereo(start + i, v * gain, 0.05);
  }
}
function boom(t0, gain) { // climax drum + rumble
  const start = Math.floor(t0 * FS);
  const total = Math.min(N - start, Math.floor(1.6 * FS));
  let ph = 0, lp = 0;
  for (let i = 0; i < total; i++) {
    const t = i / FS;
    const f = 58 - 18 * Math.min(t / 0.4, 1);
    ph += 2 * Math.PI * f / FS;
    const nz = (rnd() * 2 - 1); lp += 0.04 * (nz - lp);
    addStereo(start + i, (Math.sin(ph) * 0.9 + lp * 1.2) * Math.exp(-t * 3.4) * gain, 0);
  }
}

// ── master intensity envelope machinery (shared; data supplied per composer) ──
let envPts = [[0, 0], [DUR, 0]];
function envAt(t) {
  for (let i = 1; i < envPts.length; i++) {
    if (t <= envPts[i][0]) {
      const [t0, v0] = envPts[i - 1], [t1, v1] = envPts[i];
      return v0 + (v1 - v0) * ((t - t0) / Math.max(t1 - t0, 1e-6));
    }
  }
  return 0;
}

// ════════════════════════ legacy composer ════════════════════════
// The original hand-composed arrangement, unchanged in every particular:
// same envelope points, same tanpura cycle, same percussion spans, same
// heartbeat/boom/bell cues, same bansuri phrases, in the same order (so the
// shared rnd() stream lines up and the output stays byte-identical).
function composeLegacy(TL) {
  const S = Object.fromEntries(TL.scenes.map(s => [s.id, s]));

  // master intensity envelope (piecewise, sampled later)
  envPts = [
    [0, 0.0], [1.5, 0.4], [8, 0.55], [12.5, 0.8], [18, 0.6],       // fire
    [S.hall.start + 1, 0.75], [S.kings.start, 0.65],
    [S.rises.start, 0.6], [S.rises.start + 8, 0.7],
    [S.shot.start, 0.55], [S.shot.start + 6, 0.4], [S.shot.start + 11.9, 0.35],
    [S.shot.start + 12.3, 0.95], [S.garland.start, 0.8],
    [S.kunti.start, 0.5], [S.kunti.start + 14, 0.6],
    [S.wedding.start, 0.55], [S.wedding.start + 8, 0.8],
    [TL.total - 2.5, 0.7], [TL.total - 0.2, 0.05], [DUR, 0],
  ];

  // tanpura: pa-SA-SA-sa cycle, continuous
  {
    const cycle = [NOTE.A2, NOTE.D3, NOTE.D3, NOTE.D2];
    let t = 0.2, k = 0;
    while (t < TL.total - 1.5) {
      pluck(t, cycle[k % 4], 0.16, 3.6, -0.25);
      t += 0.78; k++;
    }
  }

  // percussion patterns per span: [start, end, tempo(bps), gain, sparse]
  const percSpans = [
    [S.hall.start + 1.5, S.hall.end - 0.5, 1.28, 0.5, false],
    [S.kings.start + 0.5, S.kings.end - 0.5, 1.28, 0.38, true],
    [S.rises.start + 2, S.rises.end - 0.5, 1.28, 0.42, true],
    [S.shot.start, S.shot.start + 5.8, 1.28, 0.4, true],
    [S.shot.start + 12.6, S.garland.end - 1, 1.7, 0.55, false],
    [S.wedding.start + 8, TL.total - 4, 1.5, 0.5, false],
  ];
  for (const [a, b, bps, g, sparse] of percSpans) {
    let beat = 0;
    for (let t = a; t < b; t += 1 / bps, beat++) {
      const m = beat % 8;
      if (m === 0 || m === 3 || m === 6) ge(t, g);
      else if (!sparse || m === 4) na(t, g * 0.8);
      if (!sparse && (m === 2 || m === 5)) na(t + 0.5 / bps, g * 0.45);
    }
  }

  // heartbeat during the aim (tension)
  for (let k = 0; k < 6; k++) {
    const t = S.shot.start + 6.4 + k * 1.05;
    ge(t, 0.5); ge(t + 0.24, 0.34);
  }

  // the release & hit
  boom(S.shot.start + 11.35, 0.7);    // string release thump
  boom(S.shot.start + 12.15, 1.0);    // the fish struck
  bell(S.shot.start + 12.3, 1174.7, 0.4);
  bell(S.shot.start + 13.1, 880, 0.3);

  // fire-scene reveal bell
  bell(11.0, 880, 0.28);
  bell(13.2, 1174.7, 0.3);

  // wedding bells
  for (const off of [8.5, 12.2, 15.8, 19.2]) bell(S.wedding.start + off, 1174.7, 0.26);
  bell(TL.total - 2.2, 880, 0.34);

  // ── bansuri melody (hand-composed) ──
  const PH = [];
  const M = (t, n, d, g) => PH.push([t, n, d, g || 0.30]);
  // fire: slow awakening, rising at the reveal
  M(4.2, 'D4', 2.8); M(7.4, 'E4', 1.6); M(9.2, 'Fs4', 3.2); M(12.7, 'A4', 2.2); M(15.0, 'D5', 2.6, 0.34);
  // hall: festive
  M(S.hall.start + 1.8, 'A4', 1.1); M(S.hall.start + 3.0, 'B4', 1.1); M(S.hall.start + 4.2, 'D5', 2.2);
  M(S.hall.start + 8.0, 'Fs4', 1.0); M(S.hall.start + 9.1, 'A4', 1.0); M(S.hall.start + 10.2, 'B4', 2.4);
  M(S.hall.start + 13.6, 'D5', 1.0); M(S.hall.start + 14.7, 'B4', 1.0); M(S.hall.start + 15.8, 'A4', 1.9);
  // kings: sombre pair
  M(S.kings.start + 7.6, 'E4', 1.8, 0.26); M(S.kings.start + 9.6, 'Fs4', 1.2, 0.26); M(S.kings.start + 11.0, 'E4', 1.9, 0.24);
  // rises: warm ascent, then Kṛṣṇa's phrase
  M(S.rises.start + 1.0, 'D4', 1.4); M(S.rises.start + 2.5, 'E4', 1.4); M(S.rises.start + 4.0, 'Fs4', 1.8); M(S.rises.start + 6.0, 'A4', 2.6);
  M(S.rises.start + 9.6, 'B4', 1.8); M(S.rises.start + 11.6, 'D5', 2.6, 0.34);
  // shot: low suspense, then triumph
  M(S.shot.start + 0.6, 'A3', 1.8, 0.24); M(S.shot.start + 2.6, 'D4', 2.4, 0.24);
  M(S.shot.start + 12.9, 'D5', 0.8, 0.36); M(S.shot.start + 13.7, 'B4', 0.8, 0.34); M(S.shot.start + 14.5, 'A4', 1.8, 0.32);
  // garland: lyrical
  M(S.garland.start + 1.2, 'Fs4', 1.8); M(S.garland.start + 3.2, 'A4', 1.8); M(S.garland.start + 5.2, 'B4', 2.2);
  M(S.garland.start + 7.8, 'D5', 3.0, 0.34); M(S.garland.start + 11.0, 'B4', 1.6); M(S.garland.start + 12.6, 'A4', 1.6);
  // kunti: tender, low register
  M(S.kunti.start + 1.2, 'B3', 2.2, 0.26); M(S.kunti.start + 3.6, 'D4', 2.2, 0.26); M(S.kunti.start + 6.0, 'E4', 2.8, 0.27);
  M(S.kunti.start + 9.4, 'D4', 2.2, 0.25); M(S.kunti.start + 12.0, 'B3', 2.6, 0.24); M(S.kunti.start + 15.0, 'D4', 2.6, 0.26);
  // wedding: mystical, then festive, then home
  M(S.wedding.start + 1.0, 'E4', 2.2, 0.26); M(S.wedding.start + 3.4, 'Fs4', 2.2, 0.27); M(S.wedding.start + 5.8, 'A4', 2.6, 0.28);
  M(S.wedding.start + 9.0, 'D5', 1.0, 0.32); M(S.wedding.start + 10.1, 'B4', 1.0); M(S.wedding.start + 11.2, 'A4', 1.4);
  M(S.wedding.start + 13.0, 'B4', 1.2); M(S.wedding.start + 14.3, 'D5', 2.6, 0.34);
  M(S.wedding.start + 17.6, 'A4', 1.6); M(S.wedding.start + 19.3, 'D4', 3.4, 0.3);
  for (const [t, n, d, g] of PH) flute(t, n, d, g);
}

// ════════════════════════ mood composer ════════════════════════
const DEFAULT_MOOD = 'tender';
// Each mood is a preset over: percussion (pattern/tempo/gain, or off),
// melody register (a subset of NOTE, ascending, indexed for +-1 stepping),
// phrase pacing (nps = notes/sec, sustainMul = note-length multiplier),
// drone intensity (tanpura gain multiplier) and stereo width (mid/side
// scale, 1 = untouched). `env` is this mood's target on the master
// intensity envelope (0..1) — this is what makes e.g. festive read louder
// than tense after the shared peak-normalize pass.
const MOOD = {
  mystic:     { perc: { on: false },                                       notes: ['A3', 'B3', 'D4', 'E4', 'Fs4'],       nps: 0.42, sustainMul: 1.9, drone: 0.95, width: 0.65, env: 0.50 },
  festive:    { perc: { on: true, bps: 1.7, gain: 0.55, sparse: false },   notes: ['D4', 'Fs4', 'G4', 'A4', 'B4', 'D5'], nps: 1.25, sustainMul: 0.8, drone: 0.85, width: 1.20, env: 0.85 },
  tense:      { perc: { on: true, bps: 1.9, gain: 0.38, sparse: true },    notes: ['A3', 'B3', 'D4'],                     nps: 0.5,  sustainMul: 0.55, drone: 0.50, width: 0.55, env: 0.38 },
  tender:     { perc: { on: false },                                       notes: ['B3', 'D4', 'E4', 'Fs4', 'A4'],       nps: 0.5,  sustainMul: 1.6, drone: 0.70, width: 0.85, env: 0.55 },
  triumphant: { perc: { on: true, bps: 1.75, gain: 0.72, sparse: false },  notes: ['D4', 'Fs4', 'A4', 'B4', 'D5'],        nps: 1.15, sustainMul: 1.0, drone: 1.00, width: 1.25, env: 0.95 },
  somber:     { perc: { on: false },                                       notes: ['A3', 'B3', 'D4', 'E4'],              nps: 0.38, sustainMul: 2.0, drone: 0.60, width: 0.55, env: 0.36 },
  suspense:   { perc: { on: true, bps: 1.1, gain: 0.32, sparse: true },    notes: ['A3', 'B3', 'D4', 'Fs4'],              nps: 0.42, sustainMul: 0.6, drone: 0.42, width: 0.50, env: 0.30 },
};

function resolveMood(sc) {
  const m = sc.mood;
  if (m && MOOD[m]) return m;
  console.warn(`[music] scene "${sc.id}": unknown/missing mood (${JSON.stringify(m ?? null)}) — defaulting to "${DEFAULT_MOOD}"`);
  return DEFAULT_MOOD;
}

// FNV-1a-ish string hash -> stable per-scene seed (independent of scene
// timing/order, so re-narrating or reordering scenes doesn't reshuffle a
// given scene's melodic content).
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}
function makeRng(seed) {
  let s = seed % 0x7fffffff || 1;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

function sceneAt(t, scenes) {
  for (const sc of scenes) if (t >= sc.start && t < sc.end) return sc;
  return scenes[scenes.length - 1];
}

function pushPt(pts, t, v) { pts.push([t, v]); }
// sort + nudge into strict monotonic time so envAt's forward scan behaves
function finalizePts(pts) {
  pts.sort((a, b) => a[0] - b[0]);
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    let [t, v] = pts[i];
    if (t <= out[out.length - 1][0]) t = out[out.length - 1][0] + 0.001;
    out.push([t, v]);
  }
  return out;
}

// continuous tanpura, gain modulated per-scene by mood.drone
function composeMoodDrone(TL, scenes, inDuck) {
  const cycle = [NOTE.A2, NOTE.D3, NOTE.D3, NOTE.D2];
  let t = 0.2, k = 0;
  while (t < TL.total - 1.0) {
    if (!inDuck(t)) {
      const sc = sceneAt(t, scenes);
      pluck(t, cycle[k % 4], 0.16 * sc.mood.drone, 3.6, -0.25);
    }
    t += 0.78; k++;
  }
}

// legacy's own beat-accent grammar (m%8 pattern), reused per-scene/per-mood
function scheduleScenePercussion(sc, inDuck) {
  const p = sc.mood.perc;
  if (!p.on) return;
  const a = sc.start + 0.3, b = sc.end - 0.2;
  let beat = 0;
  for (let t = a; t < b; t += 1 / p.bps, beat++) {
    if (inDuck(t)) continue;
    const m = beat % 8;
    if (m === 0 || m === 3 || m === 6) ge(t, p.gain);
    else if (!p.sparse || m === 4) na(t, p.gain * 0.8);
    if (!p.sparse && (m === 2 || m === 5)) na(t + 0.5 / p.bps, p.gain * 0.45);
  }
}

// algorithmic melody: 2-5 note phrases stepping mostly +-1 in the mood's
// note pool, occasional leaps, cadence toward D4/D5, 30-50% silence gaps,
// never before scene.start+0.8. Seeded per-scene so it's stable per story.
function scheduleSceneMelody(sc, inDuck) {
  const mood = sc.mood, pool = mood.notes;
  const rng = makeRng(hashSeed(sc.id));
  const windowStart = sc.start + 0.8;
  const windowEnd = sc.end - 0.3;
  if (windowEnd - windowStart < 1.2) return; // too short for even one phrase

  const totalAvail = windowEnd - windowStart;
  const gapFraction = 0.3 + rng() * 0.2; // 30-50% left silent for narration
  const activeBudget = totalAvail * (1 - gapFraction);
  const baseGain = 0.22 + mood.env * 0.14; // festive/triumphant sing out a bit more

  let idx = Math.floor(rng() * pool.length);
  let t = windowStart, active = 0, guard = 0;
  const notesOut = []; // [time, noteName, dur, gain]
  while (t < windowEnd - 0.4 && active < activeBudget && guard < 60) {
    guard++;
    const phraseLen = 2 + Math.floor(rng() * 4); // 2..5
    const phraseIdx = [];
    for (let k = 0; k < phraseLen; k++) {
      if (k > 0) {
        const r = rng();
        let step;
        if (r < 0.55) step = 1;
        else if (r < 0.78) step = -1;
        else if (r < 0.90) step = 0; // repeat
        else step = (rng() < 0.5 ? -1 : 1) * (2 + Math.floor(rng() * 2)); // leap
        idx = Math.max(0, Math.min(pool.length - 1, idx + step));
      }
      phraseIdx.push(idx);
    }
    const onsetGap = (1 / mood.nps) * (0.85 + rng() * 0.3);
    const noteDur = Math.max(0.35, onsetGap * mood.sustainMul);
    const phraseSpan = onsetGap * (phraseLen - 1) + noteDur + 0.4;
    if (t + phraseSpan > windowEnd) {
      if (notesOut.length === 0 && phraseLen > 2) continue; // try a shorter phrase before giving up
      break;
    }
    for (let k = 0; k < phraseLen; k++) {
      const nt = t + k * onsetGap;
      if (!inDuck(nt)) notesOut.push([nt, pool[phraseIdx[k]], noteDur, baseGain * (0.9 + rng() * 0.2)]);
    }
    active += phraseSpan;
    t += phraseSpan + Math.max(0.6, (totalAvail * gapFraction) / 4 * (0.6 + rng() * 0.8));
  }
  if (notesOut.length) {
    const cadence = pool.includes('D5') && mood.env > 0.6 ? 'D5' : 'D4';
    const last = notesOut[notesOut.length - 1];
    last[1] = cadence;
    last[3] = Math.max(last[3], baseGain * 1.05);
  }
  for (const [nt, nm, nd, ng] of notesOut) flute(nt, nm, nd, ng);
}

// master envelope: per-scene mood.env target, smooth 1.5s ramps straddling
// each scene boundary, plus swell bumps / silence dips from events, plus
// the same fade-tail shape as the legacy score.
function buildMoodEnvelope(TL, scenes, swells, ducks) {
  const pts = [];
  const half = 0.75;
  const first = scenes[0];
  pts.push([first.start, 0]);
  pts.push([first.start + 1.5, first.mood.env]);
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    const isLast = i === scenes.length - 1;
    const lvl = sc.mood.env;
    const holdEnd = isLast
      ? Math.max(TL.total - 2.5, pts[pts.length - 1][0] + 0.01)
      : Math.max(sc.end - half, pts[pts.length - 1][0] + 0.01);
    pts.push([holdEnd, lvl]);
    if (!isLast) {
      const next = scenes[i + 1];
      const rampTo = Math.min(next.start + half, next.end - 0.1);
      pts.push([Math.max(rampTo, holdEnd + 0.01), next.mood.env]);
    }
  }
  pts.push([Math.max(TL.total - 0.2, pts[pts.length - 1][0] + 0.01), 0.05]);
  pts.push([Math.max(DUR, pts[pts.length - 1][0] + 0.01), 0]);

  for (const sw of swells) {
    pushPt(pts, sw.at - 0.35, sw.level);
    pushPt(pts, sw.at, Math.min(1.05, sw.level + 0.28));
    pushPt(pts, sw.at + 1.0, sw.level);
  }
  for (const d of ducks) {
    pushPt(pts, d.start - 0.05, d.level);
    pushPt(pts, d.start + 0.05, d.level * 0.2);
    pushPt(pts, d.end - 0.05, d.level * 0.2);
    pushPt(pts, d.end + 0.3, d.level);
  }
  return finalizePts(pts);
}

// post-process stereo width per scene (mid/side scale). Left as a separate
// pass rather than a primitive param so pluck/flute/bell/ge/na/boom's own
// pan behaviour stays verbatim.
function applyStereoWidth(scenes) {
  for (const sc of scenes) {
    const w = sc.mood.width;
    if (Math.abs(w - 1) < 1e-6) continue;
    const i0 = Math.max(0, Math.floor(sc.start * FS));
    const i1 = Math.min(N, Math.ceil(sc.end * FS));
    for (let i = i0; i < i1; i++) {
      const mid = (L[i] + R[i]) * 0.5, side = (L[i] - R[i]) * 0.5;
      L[i] = mid + side * w;
      R[i] = mid - side * w;
    }
  }
}

function composeMood(TL, cfg) {
  const eventsCfg = cfg.music?.events || {};
  const scenes = TL.scenes.map(sc => {
    const moodName = resolveMood(sc);
    return { id: sc.id, start: sc.start, end: sc.end, moodName, mood: MOOD[moodName] };
  });

  const ducks = [], swells = [];
  for (const sc of scenes) {
    for (const e of (eventsCfg[sc.id] || [])) {
      const atAbs = sc.start + (e.at ?? 0);
      if (atAbs < sc.start || atAbs > sc.end) {
        console.warn(`[music] scene "${sc.id}": event at=${e.at} is outside the scene — skipping`);
        continue;
      }
      if (e.type === 'bell') bell(atAbs, e.freq ?? 1174.7, e.gain ?? 0.3);
      else if (e.type === 'boom') boom(atAbs, e.gain ?? 0.8);
      else if (e.type === 'swell') swells.push({ at: atAbs, level: sc.mood.env });
      else if (e.type === 'silence') ducks.push({ start: atAbs, end: atAbs + (e.dur ?? 2.0), level: sc.mood.env });
      else console.warn(`[music] scene "${sc.id}": unknown event type "${e.type}" — skipping`);
    }
  }
  const inDuck = t => ducks.some(d => t >= d.start && t < d.end);

  composeMoodDrone(TL, scenes, inDuck);
  for (const sc of scenes) {
    scheduleScenePercussion(sc, inDuck);
    scheduleSceneMelody(sc, inDuck);
  }
  envPts = buildMoodEnvelope(TL, scenes, swells, ducks);
  applyStereoWidth(scenes);

  for (const sc of scenes) {
    const p = sc.mood.perc;
    console.log(`  ${sc.id.padEnd(12)} mood=${sc.moodName.padEnd(11)} env=${sc.mood.env.toFixed(2)} drone=${sc.mood.drone.toFixed(2)} width=${sc.mood.width.toFixed(2)} perc=${p.on ? p.bps.toFixed(2) + 'bps/' + p.gain.toFixed(2) : 'none'}`);
  }
}

// ════════════════════════ dispatch ════════════════════════
const legacyFlag = process.argv.includes('--legacy');
const legacyMode = legacyFlag || cfg.music?.mode === 'legacy';
if (legacyMode) composeLegacy(TL);
else composeMood(TL, cfg);

// ── apply master envelope + write (verbatim machinery) ──
const out = Buffer.alloc(44 + N * 4);
// header
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 4, 4); out.write('WAVE', 8);
out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
out.writeUInt32LE(FS, 24); out.writeUInt32LE(FS * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
out.write('data', 36); out.writeUInt32LE(N * 4, 40);
let peak = 0;
for (let i = 0; i < N; i++) {
  const e = envAt(i / FS);
  const l = L[i] * e, r = R[i] * e;
  peak = Math.max(peak, Math.abs(l), Math.abs(r));
}
const norm = peak > 0 ? 0.86 / peak : 1;
for (let i = 0; i < N; i++) {
  const e = envAt(i / FS) * norm;
  const l = Math.max(-1, Math.min(1, L[i] * e));
  const r = Math.max(-1, Math.min(1, R[i] * e));
  out.writeInt16LE((l * 32767) | 0, 44 + i * 4);
  out.writeInt16LE((r * 32767) | 0, 46 + i * 4);
}
writeFileSync(join(story, 'audio', 'music.wav'), out);
console.log(`music.wav: ${DUR}s, peak ${peak.toFixed(3)}, norm ${norm.toFixed(3)}  [${legacyMode ? 'legacy' : 'mood'}]`);
