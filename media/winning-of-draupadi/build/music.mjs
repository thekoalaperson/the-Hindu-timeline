#!/usr/bin/env node
// Procedural score — pure synthesis, no samples, no AI.
// Tanpura drone (Karplus-Strong), bansuri (additive w/ vibrato+breath),
// tabla-ish percussion, temple bells, climax boom. Hand-composed phrases.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const TL = JSON.parse(readFileSync(join(here, 'timeline.json'), 'utf8'));
const FS = 44100;
const DUR = Math.ceil(TL.total + 1.0);
const N = FS * DUR;
const L = new Float64Array(N), R = new Float64Array(N);

// deterministic rng
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

// ════ arrangement ════
const S = Object.fromEntries(TL.scenes.map(s => [s.id, s]));

// master intensity envelope (piecewise, sampled later)
const envPts = [
  [0, 0.0], [1.5, 0.4], [8, 0.55], [12.5, 0.8], [18, 0.6],       // fire
  [S.hall.start + 1, 0.75], [S.kings.start, 0.65],
  [S.rises.start, 0.6], [S.rises.start + 8, 0.7],
  [S.shot.start, 0.55], [S.shot.start + 6, 0.4], [S.shot.start + 11.9, 0.35],
  [S.shot.start + 12.3, 0.95], [S.garland.start, 0.8],
  [S.kunti.start, 0.5], [S.kunti.start + 14, 0.6],
  [S.wedding.start, 0.55], [S.wedding.start + 8, 0.8],
  [TL.total - 2.5, 0.7], [TL.total - 0.2, 0.05], [DUR, 0],
];
function envAt(t) {
  for (let i = 1; i < envPts.length; i++) {
    if (t <= envPts[i][0]) {
      const [t0, v0] = envPts[i - 1], [t1, v1] = envPts[i];
      return v0 + (v1 - v0) * ((t - t0) / Math.max(t1 - t0, 1e-6));
    }
  }
  return 0;
}

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

// ── apply master envelope + gentle stereo widen + write ──
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
writeFileSync(join(here, '..', 'audio', 'music.wav'), out);
console.log(`music.wav: ${DUR}s, peak ${peak.toFixed(3)}, norm ${norm.toFixed(3)}`);
