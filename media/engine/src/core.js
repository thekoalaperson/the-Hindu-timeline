// ── core.js ── deterministic math, easing, noise, color, canvas utilities.
// Everything is a pure function of time so offline frame rendering is exact.
'use strict';
const TAU = Math.PI * 2;
const W = 1920, H = 1080; // design space

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const norm = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const smooth = t => t * t * (3 - 2 * t);
const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);

// easing
const easeIn = t => t * t * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const easeOutElast = t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1;
// ramp between a..b of time t with easing fn
const ramp = (t, a, b, fn) => (fn || easeIO)(norm(t, a, b));
// pulse: up then down
const pulse = (t, a, b, c, d) => ramp(t, a, b) * (1 - ramp(t, c, d));

// keyframe track: [[time, value], ...] -> eased value at t
function track(keys, t, fn) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
      return lerp(v0, v1, (fn || easeIO)(norm(t, t0, t1)));
    }
  }
  return keys[keys.length - 1][1];
}

// ── deterministic noise ──
function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const hash1 = (n) => { let x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// 1D value noise, periodic-free
function noise1(x, seed) {
  seed = seed || 0;
  const i = Math.floor(x), f = x - i;
  return lerp(hash1(i + seed * 57.31), hash1(i + 1 + seed * 57.31), smooth(f));
}
function fbm1(x, seed, oct) {
  let v = 0, amp = .5;
  for (let o = 0; o < (oct || 3); o++) { v += amp * noise1(x, seed + o * 13); x *= 2.03; amp *= .5; }
  return v;
}
// signed versions in [-1,1]
const snoise1 = (x, s) => noise1(x, s) * 2 - 1;
const sfbm1 = (x, s, o) => fbm1(x, s, o) * 2 - 1;

// ── color ──
function hexRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixC(h1, h2, t) {
  const a = hexRGB(h1), b = hexRGB(h2);
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
}
function rgba(hex, a) {
  const c = hexRGB(hex);
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}
function shade(hex, amt) { // amt<0 darken, >0 lighten
  const c = hexRGB(hex);
  const f = amt < 0 ? 0 : 255, t = Math.abs(amt);
  return `rgb(${Math.round(lerp(c[0], f, t))},${Math.round(lerp(c[1], f, t))},${Math.round(lerp(c[2], f, t))})`;
}

// ── canvas path helpers ──
// polyline through points with quadratic smoothing
function smoothPath(ctx, pts, close) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const xc = (pts[i][0] + pts[i + 1][0]) / 2, yc = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], xc, yc);
  }
  const n = pts.length - 1;
  ctx.quadraticCurveTo(pts[n][0], pts[n][1], pts[n][0], pts[n][1]);
  if (close) ctx.closePath();
}
// bezier ribbon: spine points + width function -> closed path
function ribbon(ctx, spine, wfn) {
  const L = [], R = [];
  for (let i = 0; i < spine.length; i++) {
    const p = spine[i];
    const q = spine[Math.min(i + 1, spine.length - 1)];
    const r = spine[Math.max(i - 1, 0)];
    let dx = q[0] - r[0], dy = q[1] - r[1];
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    const w = wfn(i / (spine.length - 1));
    L.push([p[0] - dy * w, p[1] + dx * w]);
    R.push([p[0] + dy * w, p[1] - dx * w]);
  }
  ctx.beginPath();
  smoothPath(ctx, L);
  for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
}

// ── offscreen layer cache ──
const _caches = {};
function cached(key, w, h, draw) {
  let c = _caches[key];
  if (!c) {
    c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    _caches[key] = c;
  }
  return c;
}
function dropCache(prefix) {
  for (const k of Object.keys(_caches)) if (k.startsWith(prefix)) delete _caches[k];
}

// ── camera ──
// cam: {x, y, z} in design coords; z is zoom (1 = full frame).
// depth f: 0 = far background, 1 = subject plane, >1 = foreground.
function camLayer(ctx, cam, f, fn) {
  ctx.save();
  const z = 1 + (cam.z - 1) * lerp(0.72, 1.22, Math.min(f, 1.3) / 1.3);
  ctx.translate(W / 2, H / 2);
  ctx.scale(z, z);
  ctx.translate(-W / 2 - (cam.x) * f, -H / 2 - (cam.y) * f);
  fn(ctx);
  ctx.restore();
}
// gentle organic handheld drift
function drift(t, amp, seed) {
  return {
    x: sfbm1(t * 0.13, seed) * amp,
    y: sfbm1(t * 0.11, seed + 5) * amp * 0.6,
    z: 1 + sfbm1(t * 0.07, seed + 9) * 0.004,
  };
}
