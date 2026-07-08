#!/usr/bin/env node
// Procedural score — pure synthesis, no samples, no AI.
// Tanpura drone (Karplus-Strong), bansuri (additive w/ vibrato+breath),
// tabla-ish percussion, temple bells, climax boom.
//
//   node music.mjs --story <slug> [--legacy] [--raga <name>]
//
// Composition resolves through a hierarchy, most-specific wins (see
// engine/CONTRACTS.md "Music hierarchy" / "Music moods"):
//
//   BASE   tanpura drone (pa-SA-SA-sa cycle) + the tala accent grid
//          (the legacy m%8 ge/na pattern, re-parameterized per mood).
//   RAGA   pitch material only: note pools by register (low/mid/high),
//          characteristic cadence, phrase bias (step/leap odds, ascent
//          share, sustain multiplier, optional resting tone). Table:
//            yamanish   bright, Yaman-flavored (leading tone Cs5, ascent
//                       skips, rests on B)   — affinity: festive, triumphant
//            bhairavish grave, komal color (Eb/F/Bb), slow descending
//                       cadences to D        — affinity: somber, mystic,
//                                              suspense, tense*
//            deshish    lyrical Desh flavor (natural C), gentle B->A->D
//                       cadence              — affinity: tender
//          *tense is assigned bhairavish (judgment call, delegated: komal
//          darkness reads more tense than Desh lyricism).
//   MOOD   texture: percussion pattern/tempo/gain (or none), melody
//          register + pacing (notes/sec, sustain), drone intensity,
//          stereo width, master-envelope target. Moods: mystic, festive,
//          tense, tender, triumphant, somber, suspense (unknown/missing
//          warns and falls back to 'tender'). Guard: if a raga lacks the
//          mood's register, the melody falls back to the raga's full pool.
//   SCENE  events from story.json music.events["<sceneId>"]:
//            {"at": s-from-scene-start, "type": "bell"|"boom"|"swell"|"silence",
//             "freq"?, "gain"?, "dur"?}
//          silence ducks melody+perc scheduling for the window and dips the
//          master envelope; swell bumps the envelope briefly.
//   STORY  raga overrides, most-specific wins:
//            script.json scene.raga  >  --raga CLI  >  story.json
//            music.raga  >  mood affinity.
//
// Modes:
//   composeLegacy(TL)   the exact hand-composed "Winning of Draupadi"
//                       score. Selected by --legacy, or story.json
//                       music.mode === 'legacy'. Byte-identical to the
//                       original — do not reorder/reword anything in that
//                       function; the rng is a single shared stream and
//                       its output depends on the exact sequence of
//                       primitive calls.
//   composeMood(TL,cfg) default: the hierarchy above. Melody phrases
//                       (2-5 notes, mostly +-1 steps in the pool,
//                       occasional leaps, raga cadence at scene end,
//                       30-50% silence so narration breathes, nothing
//                       before scene.start+0.8) seeded per scene by
//                       hash(scene.id) — stable per story.
//
// Import surface (used by music-demos.mjs; `node music.mjs` behaviour is
// unaffected — the CLI flow only executes when this file is argv[1]):
//   NOTE, RAGAS, MOOD, DEFAULT_MOOD          tables
//   pluck/flute/bell/ge/na/boom              synthesis primitives (verbatim)
//   initBuffers(seconds), resetRng(), setEnv(pts), writeWav(path)
//   composeMood(TL, cfg, opts)
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';
import { storyDir, loadStory, loadTimeline, arg } from './lib.mjs';

const IS_MAIN = !!process.argv[1] &&
  import.meta.url === pathToFileURL(resolvePath(process.argv[1])).href;

const FS = 44100;
let DUR = 0, N = 0, L = new Float64Array(0), R = new Float64Array(0);

// (re)allocate the render buffers for a score `seconds` long (rounded up).
// Also resets per-render state (envelope, flute glide memory).
export function initBuffers(seconds) {
  DUR = Math.ceil(seconds);
  N = FS * DUR;
  L = new Float64Array(N);
  R = new Float64Array(N);
  envPts = [[0, 0], [DUR, 0]];
  lastFlute = null;
}

// deterministic rng — shared stream consumed (in order) by the noise-driven
// primitives below (pluck's excitation burst, flute's breath noise, na/boom's
// hit noise). composeLegacy's byte-parity depends on this stream's sequence,
// so never insert extra rnd() consumers ahead of/inside it.
let _s = 1234567;
const rnd = () => { _s = (_s * 1103515245 + 12345) & 0x7fffffff; return _s / 0x7fffffff; };
export function resetRng() { _s = 1234567; }

export const NOTE = { A2: 110, D2: 73.42, D3: 146.83, A3: 220, B3: 246.94, D4: 293.66, E4: 329.63, Fs4: 369.99, G4: 392, A4: 440, B4: 493.88, D5: 587.33,
  // raga-layer additions (equal temperament, A4=440) — additive only; the
  // legacy arrangement never references these keys.
  Bb3: 233.08, C4: 261.63, Cs4: 277.18, Eb4: 311.13, F4: 349.23, Bb4: 466.16, C5: 523.25, Cs5: 554.37 };

function addStereo(i, v, pan) { // pan -1..1
  const g = 0.5 * (1 - pan), h = 0.5 * (1 + pan);
  L[i] += v * (0.5 + g); R[i] += v * (0.5 + h);
}

// ── Karplus-Strong pluck ──
export function pluck(t0, freq, gain, decayS, pan) {
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
export function flute(t0, name, dur, gain) {
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
export function bell(t0, base, gain) {
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
export function ge(t0, gain) { // low bayan with pitch drop
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
export function na(t0, gain) { // bright tap
  const start = Math.floor(t0 * FS);
  const total = Math.min(N - start, Math.floor(0.09 * FS));
  for (let i = 0; i < total; i++) {
    const t = i / FS;
    const v = (rnd() * 2 - 1) * Math.sin(2 * Math.PI * 1650 * t) * Math.exp(-t * 60);
    addStereo(start + i, v * gain, 0.05);
  }
}
export function boom(t0, gain) { // climax drum + rumble
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
let envPts = [[0, 0], [1, 0]];
export function setEnv(pts) { envPts = pts; }
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
// The original hand-composed arrangement — same events, same order (so the
// shared rnd() stream lines up) — but every hand-placed cue is retimed
// through at(): the score was tuned against the original narration
// (pad_before 1.2s, narration lengths in LEGACY_TUNED_NARR); at() pins each
// cue to the same fraction through its scene's narration window, so the
// release-boom still lands on "he loosed five arrows" no matter how the
// narration is re-paced or re-recorded (narrAt/narrDur are the live values).
const LEGACY_TUNED_NARR = {
  fire: 15.19, hall: 14.845, kings: 10.886, rises: 12.58,
  shot: 11.999, garland: 11.774, kunti: 15.322, wedding: 18.221,
};
function composeLegacy(TL) {
  const S = Object.fromEntries(TL.scenes.map(s => [s.id, s]));
  const at = (id, off) =>
    S[id].narrAt + (off - 1.2) * (S[id].narrDur / LEGACY_TUNED_NARR[id]);

  // master intensity envelope (piecewise, sampled later)
  envPts = [
    [0, 0.0], [at('fire', 1.5), 0.4], [at('fire', 8), 0.55], [at('fire', 12.5), 0.8], [at('fire', 18), 0.6],
    [S.hall.start + 1, 0.75], [S.kings.start, 0.65],
    [S.rises.start, 0.6], [at('rises', 8), 0.7],
    [S.shot.start, 0.55], [at('shot', 6), 0.4], [at('shot', 11.9), 0.35],
    [at('shot', 12.3), 0.95], [S.garland.start, 0.8],
    [S.kunti.start, 0.5], [at('kunti', 14), 0.6],
    [S.wedding.start, 0.55], [at('wedding', 8), 0.8],
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
    [S.shot.start, at('shot', 5.8), 1.28, 0.4, true],
    [at('shot', 12.6), S.garland.end - 1, 1.7, 0.55, false],
    [at('wedding', 8), TL.total - 4, 1.5, 0.5, false],
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

  // heartbeat during the aim (tension) — beat period stays a heartbeat,
  // only the onset tracks the narration
  for (let k = 0; k < 6; k++) {
    const t = at('shot', 6.4) + k * 1.05;
    ge(t, 0.5); ge(t + 0.24, 0.34);
  }

  // the release & hit
  boom(at('shot', 11.35), 0.7);    // string release thump
  boom(at('shot', 12.15), 1.0);    // the fish struck
  bell(at('shot', 12.3), 1174.7, 0.4);
  bell(at('shot', 13.1), 880, 0.3);

  // fire-scene reveal bell
  bell(at('fire', 11.0), 880, 0.28);
  bell(at('fire', 13.2), 1174.7, 0.3);

  // wedding bells
  for (const off of [8.5, 12.2, 15.8, 19.2]) bell(at('wedding', off), 1174.7, 0.26);
  bell(TL.total - 2.2, 880, 0.34);

  // ── bansuri melody (hand-composed) ──
  const PH = [];
  const M = (t, n, d, g) => PH.push([t, n, d, g || 0.30]);
  // fire: slow awakening, rising at the reveal
  M(at('fire', 4.2), 'D4', 2.8); M(at('fire', 7.4), 'E4', 1.6); M(at('fire', 9.2), 'Fs4', 3.2); M(at('fire', 12.7), 'A4', 2.2); M(at('fire', 15.0), 'D5', 2.6, 0.34);
  // hall: festive
  M(at('hall', 1.8), 'A4', 1.1); M(at('hall', 3.0), 'B4', 1.1); M(at('hall', 4.2), 'D5', 2.2);
  M(at('hall', 8.0), 'Fs4', 1.0); M(at('hall', 9.1), 'A4', 1.0); M(at('hall', 10.2), 'B4', 2.4);
  M(at('hall', 13.6), 'D5', 1.0); M(at('hall', 14.7), 'B4', 1.0); M(at('hall', 15.8), 'A4', 1.9);
  // kings: sombre pair
  M(at('kings', 7.6), 'E4', 1.8, 0.26); M(at('kings', 9.6), 'Fs4', 1.2, 0.26); M(at('kings', 11.0), 'E4', 1.9, 0.24);
  // rises: warm ascent, then Kṛṣṇa's phrase
  M(at('rises', 1.0), 'D4', 1.4); M(at('rises', 2.5), 'E4', 1.4); M(at('rises', 4.0), 'Fs4', 1.8); M(at('rises', 6.0), 'A4', 2.6);
  M(at('rises', 9.6), 'B4', 1.8); M(at('rises', 11.6), 'D5', 2.6, 0.34);
  // shot: low suspense, then triumph
  M(at('shot', 0.6), 'A3', 1.8, 0.24); M(at('shot', 2.6), 'D4', 2.4, 0.24);
  M(at('shot', 12.9), 'D5', 0.8, 0.36); M(at('shot', 13.7), 'B4', 0.8, 0.34); M(at('shot', 14.5), 'A4', 1.8, 0.32);
  // garland: lyrical
  M(at('garland', 1.2), 'Fs4', 1.8); M(at('garland', 3.2), 'A4', 1.8); M(at('garland', 5.2), 'B4', 2.2);
  M(at('garland', 7.8), 'D5', 3.0, 0.34); M(at('garland', 11.0), 'B4', 1.6); M(at('garland', 12.6), 'A4', 1.6);
  // kunti: tender, low register
  M(at('kunti', 1.2), 'B3', 2.2, 0.26); M(at('kunti', 3.6), 'D4', 2.2, 0.26); M(at('kunti', 6.0), 'E4', 2.8, 0.27);
  M(at('kunti', 9.4), 'D4', 2.2, 0.25); M(at('kunti', 12.0), 'B3', 2.6, 0.24); M(at('kunti', 15.0), 'D4', 2.6, 0.26);
  // wedding: mystical, then festive, then home
  M(at('wedding', 1.0), 'E4', 2.2, 0.26); M(at('wedding', 3.4), 'Fs4', 2.2, 0.27); M(at('wedding', 5.8), 'A4', 2.6, 0.28);
  M(at('wedding', 9.0), 'D5', 1.0, 0.32); M(at('wedding', 10.1), 'B4', 1.0); M(at('wedding', 11.2), 'A4', 1.4);
  M(at('wedding', 13.0), 'B4', 1.2); M(at('wedding', 14.3), 'D5', 2.6, 0.34);
  M(at('wedding', 17.6), 'A4', 1.6); M(at('wedding', 19.3), 'D4', 3.4, 0.3);
  for (const [t, n, d, g] of PH) flute(t, n, d, g);
}

// ════════════════════════ raga layer ════════════════════════
// Pitch material only — texture (percussion/pace/dynamics) stays with MOOD.
//   pools       note-name pools by register; MOOD picks the register.
//   cadence     characteristic closing figure (low/high variants; every
//               variant ends on D4 or D5, keeping the scene-end sa).
//   phraseBias  ascendShare (P(step up)), leapP (P(leap)), sustainMul
//               (multiplies the mood's note length), restPC (optional
//               pitch-class the melody rests on, lengthened when landed on).
export const RAGAS = {
  yamanish: {   // bright, Yaman-flavored: leading tone Cs, ascent skips, rests on B
    pools: {
      low: ['A3', 'B3', 'Cs4', 'D4', 'E4'],
      mid: ['D4', 'E4', 'Fs4', 'A4', 'B4'],
      high: ['Fs4', 'A4', 'B4', 'Cs5', 'D5'],
    },
    cadence: { low: ['B3', 'Cs4', 'D4'], high: ['B4', 'Cs5', 'D5'] },
    phraseBias: { ascendShare: 0.62, leapP: 0.16, sustainMul: 1.0, restPC: 'B' },
    moodAffinity: ['festive', 'triumphant'],
  },
  bhairavish: { // grave, komal color (Eb F Bb), slow descending cadences to D
    pools: {
      low: ['A3', 'Bb3', 'D4', 'Eb4'],
      mid: ['D4', 'Eb4', 'F4', 'A4'],
      high: ['F4', 'A4', 'Bb4', 'D5'],
    },
    cadence: { low: ['F4', 'Eb4', 'D4'], high: ['F4', 'Eb4', 'D4'] }, // always settles low: grave
    phraseBias: { ascendShare: 0.38, leapP: 0.06, sustainMul: 1.35, restPC: null },
    moodAffinity: ['somber', 'mystic', 'suspense', 'tense'],
  },
  deshish: {    // lyrical Desh flavor (D E Fs G A B C), gentle B->A->D cadence
    pools: {
      low: ['A3', 'B3', 'C4', 'D4', 'E4'],
      mid: ['D4', 'E4', 'Fs4', 'G4', 'A4'],
      high: ['G4', 'A4', 'B4', 'C5', 'D5'],
    },
    cadence: { low: ['B3', 'A3', 'D4'], high: ['B4', 'A4', 'D5'] },
    phraseBias: { ascendShare: 0.52, leapP: 0.10, sustainMul: 1.1, restPC: null },
    moodAffinity: ['tender'],
  },
};
const RAGA_FOR_MOOD = {};
for (const [rn, r] of Object.entries(RAGAS)) for (const m of r.moodAffinity) RAGA_FOR_MOOD[m] = rn;
const pitchClass = n => n.replace(/\d+$/, '');
const ragaFullPool = raga =>
  [...new Set([...(raga.pools.low || []), ...(raga.pools.mid || []), ...(raga.pools.high || [])])];

// ════════════════════════ mood composer ════════════════════════
export const DEFAULT_MOOD = 'tender';
// Each mood is a preset over: percussion (pattern/tempo/gain, or off),
// melody register (which raga pool the melody draws from), phrase pacing
// (nps = notes/sec, sustainMul = note-length multiplier), drone intensity
// (tanpura gain multiplier) and stereo width (mid/side scale, 1 =
// untouched). `env` is this mood's target on the master intensity
// envelope (0..1) — this is what makes e.g. festive read louder than
// tense after the shared peak-normalize pass.
// bps reduced ~15% and sustainMul increased ~20% across the board (v1.3,
// pacing pass) so the mood texture breathes with the slower narration —
// nps/drone/width/env/gain/register/sparse are unchanged.
export const MOOD = {
  mystic:     { perc: { on: false },                                       register: 'low',  nps: 0.42, sustainMul: 2.28, drone: 0.95, width: 0.65, env: 0.50 },
  festive:    { perc: { on: true, bps: 1.45, gain: 0.55, sparse: false },  register: 'high', nps: 1.25, sustainMul: 0.96, drone: 0.85, width: 1.20, env: 0.85 },
  tense:      { perc: { on: true, bps: 1.62, gain: 0.38, sparse: true },   register: 'low',  nps: 0.5,  sustainMul: 0.66, drone: 0.50, width: 0.55, env: 0.38 },
  tender:     { perc: { on: false },                                       register: 'mid',  nps: 0.5,  sustainMul: 1.92, drone: 0.70, width: 0.85, env: 0.55 },
  triumphant: { perc: { on: true, bps: 1.49, gain: 0.72, sparse: false },  register: 'high', nps: 1.15, sustainMul: 1.2,  drone: 1.00, width: 1.25, env: 0.95 },
  somber:     { perc: { on: false },                                       register: 'low',  nps: 0.38, sustainMul: 2.4,  drone: 0.60, width: 0.55, env: 0.36 },
  suspense:   { perc: { on: true, bps: 0.94, gain: 0.32, sparse: true },   register: 'low',  nps: 0.42, sustainMul: 0.72, drone: 0.42, width: 0.50, env: 0.30 },
};

function resolveMood(sc) {
  const m = sc.mood;
  if (m && MOOD[m]) return m;
  console.warn(`[music] scene "${sc.id}": unknown/missing mood (${JSON.stringify(m ?? null)}) — defaulting to "${DEFAULT_MOOD}"`);
  return DEFAULT_MOOD;
}

function resolveRaga(sc, moodName, sceneRagas, filmRaga) {
  const perScene = sceneRagas?.[sc.id];
  if (perScene) {
    if (RAGAS[perScene]) return perScene;
    console.warn(`[music] scene "${sc.id}": unknown raga "${perScene}" in script.json — ignoring`);
  }
  if (filmRaga) return filmRaga; // validated once upstream
  return RAGA_FOR_MOOD[moodName] || 'deshish';
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

// algorithmic melody: 2-5 note phrases stepping mostly +-1 in the raga
// pool for the mood's register, leaps/direction per the raga's phraseBias,
// the raga's characteristic cadence closing the scene, 30-50% silence gaps,
// never before scene.start+0.8. Seeded per-scene so it's stable per story.
function scheduleSceneMelody(sc, inDuck) {
  const mood = sc.mood, raga = sc.raga, bias = raga.phraseBias;
  let pool = raga.pools[mood.register];
  if (!pool || !pool.length) { // guard: register missing from this raga
    pool = ragaFullPool(raga);
    console.warn(`[music] scene "${sc.id}": raga "${sc.ragaName}" has no "${mood.register}" register — using full pool`);
  }
  const rng = makeRng(hashSeed(sc.id));
  const windowStart = sc.start + 0.8;
  const windowEnd = sc.end - 0.3;

  // reserve room at the end for the characteristic cadence (capped + scaled
  // so slow moods — somber/mystic under a high-sustain raga — can't eat the
  // whole window and leave a scene melodyless)
  const cad = raga.cadence[(mood.register === 'high' || mood.env > 0.6) ? 'high' : 'low'];
  let cadGap = Math.max(0.55, (1 / mood.nps) * 0.7);
  let cadDur = Math.min(3.0, Math.max(0.5, cadGap * mood.sustainMul * bias.sustainMul));
  let cadSpan = cadGap * (cad.length - 1) + cadDur + 0.3;
  const maxCadSpan = (windowEnd - windowStart) * 0.45;
  if (cadSpan > maxCadSpan) {
    const k = maxCadSpan / cadSpan;
    cadGap = Math.max(0.45, cadGap * k);
    cadDur = Math.max(0.5, cadDur * k);
    cadSpan = cadGap * (cad.length - 1) + cadDur + 0.3;
  }
  if (windowEnd - windowStart < cadSpan + 1.2) return; // too short for melody
  const melodyEnd = windowEnd - cadSpan;

  const totalAvail = windowEnd - windowStart;
  const gapFraction = 0.3 + rng() * 0.2; // 30-50% left silent for narration
  const activeBudget = totalAvail * (1 - gapFraction);
  const baseGain = 0.22 + mood.env * 0.14; // festive/triumphant sing out a bit more

  let idx = Math.floor(rng() * pool.length);
  let t = windowStart, active = 0, guard = 0;
  const notesOut = []; // [time, noteName, dur, gain]
  while (t < melodyEnd - 0.4 && active < activeBudget && guard < 60) {
    guard++;
    const phraseLen = 2 + Math.floor(rng() * 4); // 2..5
    const phraseIdx = [];
    for (let k = 0; k < phraseLen; k++) {
      if (k > 0) {
        const r = rng();
        let step;
        if (r < bias.leapP) step = (rng() < bias.ascendShare ? 1 : -1) * (2 + Math.floor(rng() * 2)); // leap
        else if (r < bias.leapP + 0.12) step = 0; // repeat
        else step = rng() < bias.ascendShare ? 1 : -1;
        idx = Math.max(0, Math.min(pool.length - 1, idx + step));
      }
      phraseIdx.push(idx);
    }
    // raga resting tone (e.g. yamanish rests on B): pull some phrase endings
    // there and let them ring
    let restBoost = 1;
    if (bias.restPC) {
      const restIdx = pool.findIndex(n => pitchClass(n) === bias.restPC);
      if (restIdx >= 0 && rng() < 0.35) phraseIdx[phraseIdx.length - 1] = restIdx;
      if (pitchClass(pool[phraseIdx[phraseIdx.length - 1]]) === bias.restPC) restBoost = 1.35;
    }
    const onsetGap = (1 / mood.nps) * (0.85 + rng() * 0.3);
    const noteDur = Math.min(3.5, Math.max(0.35, onsetGap * mood.sustainMul * bias.sustainMul));
    const phraseSpan = onsetGap * (phraseLen - 1) + noteDur * restBoost + 0.4;
    if (t + phraseSpan > melodyEnd) {
      if (notesOut.length === 0 && phraseLen > 2) continue; // try a shorter phrase before giving up
      break;
    }
    for (let k = 0; k < phraseLen; k++) {
      const nt = t + k * onsetGap;
      const nd = k === phraseLen - 1 ? noteDur * restBoost : noteDur;
      if (!inDuck(nt)) notesOut.push([nt, pool[phraseIdx[k]], nd, baseGain * (0.9 + rng() * 0.2)]);
    }
    active += phraseSpan;
    t += phraseSpan + Math.max(0.6, (totalAvail * gapFraction) / 4 * (0.6 + rng() * 0.8));
  }
  // guarantee: even when no phrase fit (very slow mood in a short scene),
  // hold one quiet mid-pool tone so the scene isn't melodyless before the cadence
  if (!notesOut.length) {
    const nd = Math.min(3.5, Math.max(1.2, melodyEnd - windowStart - 0.2));
    if (!inDuck(windowStart)) notesOut.push([windowStart, pool[Math.floor(pool.length / 2)], nd, baseGain * 0.9]);
  }
  // characteristic cadence closing the scene (always ends on D, at windowEnd)
  for (let k = 0; k < cad.length; k++) {
    const nt = melodyEnd + 0.3 + k * cadGap;
    const isLast = k === cad.length - 1;
    if (!inDuck(nt)) notesOut.push([nt, cad[k], isLast ? cadDur : cadDur * 0.85, baseGain * (isLast ? 1.1 : 0.95)]);
  }
  notesOut.sort((a, b) => a[0] - b[0]); // keep flute glide memory in time order
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

// opts: { cliRaga?: string|null, sceneRagas?: {sceneId: ragaName}, quiet?: bool }
export function composeMood(TL, cfg, opts = {}) {
  const eventsCfg = cfg.music?.events || {};
  let filmRaga = opts.cliRaga || cfg.music?.raga || null;
  if (filmRaga && !RAGAS[filmRaga]) {
    console.warn(`[music] unknown raga "${filmRaga}" (know: ${Object.keys(RAGAS).join(', ')}) — falling back to mood affinity`);
    filmRaga = null;
  }
  const scenes = TL.scenes.map(sc => {
    const moodName = resolveMood(sc);
    const ragaName = resolveRaga(sc, moodName, opts.sceneRagas, filmRaga);
    return { id: sc.id, start: sc.start, end: sc.end, moodName, mood: MOOD[moodName], ragaName, raga: RAGAS[ragaName] };
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

  if (!opts.quiet) {
    for (const sc of scenes) {
      const p = sc.mood.perc;
      console.log(`  ${sc.id.padEnd(12)} mood=${sc.moodName.padEnd(11)} raga=${sc.ragaName.padEnd(11)} env=${sc.mood.env.toFixed(2)} drone=${sc.mood.drone.toFixed(2)} width=${sc.mood.width.toFixed(2)} perc=${p.on ? p.bps.toFixed(2) + 'bps/' + p.gain.toFixed(2) : 'none'}`);
    }
  }
}

// ── apply master envelope + write (verbatim machinery) ──
export function writeWav(path) {
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
  writeFileSync(path, out);
  return { dur: DUR, peak, norm };
}

// ════════════════════════ CLI ════════════════════════
if (IS_MAIN) {
  const story = storyDir(process.argv);
  const cfg = loadStory(story);
  const TL = loadTimeline(story);
  initBuffers(TL.total + 1.0);

  const legacyFlag = process.argv.includes('--legacy');
  const legacyMode = legacyFlag || cfg.music?.mode === 'legacy';
  if (legacyMode) {
    composeLegacy(TL);
  } else {
    // per-scene raga overrides live in script.json (narrate.mjs doesn't copy
    // them into timeline.json, so read them from the source)
    const sceneRagas = {};
    try {
      const sj = JSON.parse(readFileSync(join(story, 'script.json'), 'utf8'));
      for (const s of sj.scenes || []) if (s.raga) sceneRagas[s.id] = s.raga;
    } catch { /* script.json optional for music */ }
    composeMood(TL, cfg, { cliRaga: arg(process.argv, '--raga', null), sceneRagas });
  }

  const { dur, peak, norm } = writeWav(join(story, 'audio', 'music.wav'));
  console.log(`music.wav: ${dur}s, peak ${peak.toFixed(3)}, norm ${norm.toFixed(3)}  [${legacyMode ? 'legacy' : 'mood'}]`);
}
