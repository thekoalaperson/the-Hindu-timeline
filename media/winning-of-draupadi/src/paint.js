// ── paint.js ── painterly primitives: soft light, flame, smoke, cloth,
// gold ornament, particles, atmosphere. Style: Indian miniature painting —
// warm grounds, kohl outlines, gold leaf accents, flat-but-modelled forms.
'use strict';

const INK = '#2a1608';           // universal warm outline ink
const GOLD = '#e8b64c', GOLD_D = '#a5741f', GOLD_L = '#ffe9a8';

function softDisc(ctx, x, y, r, inner, outer) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
function glowAdd(ctx, x, y, r, color, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  softDisc(ctx, x, y, r, color, 'rgba(0,0,0,0)');
  ctx.restore();
}
// vertical linear gradient fill over rect
function vgrad(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [p, c] of stops) g.addColorStop(p, c);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}

// ── god rays: additive light shafts from a point/edge ──
function godRays(ctx, x, y, angle, spread, len, color, alpha, t, seed) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y); ctx.rotate(angle);
  const n = 5;
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1) - 0.5) * spread;
    const wob = sfbm1(t * 0.11 + i * 3.7, seed + i) * 0.02;
    const w0 = len * (0.028 + 0.03 * hash1(seed * 7 + i));
    ctx.save(); ctx.rotate(a + wob);
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, rgba(color, alpha * (0.55 + 0.45 * noise1(t * 0.23 + i * 9, seed))));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -w0 * 0.25); ctx.lineTo(len, -w0 * 2.2);
    ctx.lineTo(len, w0 * 2.2); ctx.lineTo(0, w0 * 0.25);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ── fire ── layered tongues; s = height scale, t drives motion
function flame(ctx, x, y, s, t, seed, intensity) {
  const I = intensity === undefined ? 1 : intensity;
  if (I <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  glowAdd(ctx, 0, -0.45, 2.1, `rgba(255,140,30,${0.32 * I})`, 1);
  const layers = [
    ['#872b07', 1.00, 0.9], ['#d8590d', 0.82, 1.0],
    ['#f59e16', 0.62, 1.08], ['#ffd968', 0.40, 1.15], ['#fff6cf', 0.22, 1.2],
  ];
  ctx.globalCompositeOperation = 'lighter';
  for (let L = 0; L < layers.length; L++) {
    const [col, wS, hS] = layers[L];
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.85 * I;
    ctx.beginPath();
    const tongues = 3;
    ctx.moveTo(-0.5 * wS, 0);
    for (let k = 0; k <= tongues * 8; k++) {
      const u = k / (tongues * 8);           // 0..1 across base
      const xx = (u - 0.5) * wS;
      const flick = fbm1(u * 5 + t * (2.1 + L * 0.35) + seed * 31 + L * 7, seed, 3);
      const env = Math.sin(u * Math.PI);     // arch envelope
      const hh = env * (0.85 + flick * 0.9) * hS * (0.85 + 0.3 * noise1(t * 1.7 + L, seed + 3));
      const sway = sfbm1(t * 0.9 + u * 2 + L, seed + 8) * 0.18 * hh;
      ctx.lineTo(xx + sway, -hh);
    }
    ctx.lineTo(0.5 * wS, 0);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// embers rising from (x,y) within radius r
function embers(ctx, x, y, r, t, seed, n, color) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const life = 4 + hash1(seed + i) * 3;
    const ph = (t / life + hash1(seed * 3 + i)) % 1;
    const px = x + sfbm1(t * 0.5 + i * 7.7, seed + i) * r * (0.4 + ph);
    const py = y - ph * r * 2.4;
    const a = (1 - ph) * (0.5 + 0.5 * noise1(t * 6 + i * 3, seed));
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = color || '#ffca6a';
    const sz = 2.2 * (1 - ph * 0.6) * (0.6 + hash1(i * 13 + seed) * 0.8);
    ctx.beginPath(); ctx.arc(px, py, sz, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// drifting smoke column
function smoke(ctx, x, y, s, t, seed, alpha) {
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const ph = ((t * 0.12 + i * 0.25 + hash1(seed + i)) % 1);
    const yy = y - ph * s * 3.2;
    const xx = x + sfbm1(ph * 3 + i * 5, seed + i) * s * (0.3 + ph * 0.9);
    const r = s * (0.28 + ph * 0.85);
    ctx.globalAlpha = alpha * (1 - ph) * 0.5 * (0.4 + 0.6 * noise1(i * 9 + t * 0.3, seed));
    softDisc(ctx, xx, yy, r, 'rgba(120,110,120,0.5)', 'rgba(120,110,120,0)');
  }
  ctx.restore();
}

// floating dust motes inside a rect (for god-ray sparkle)
function motes(ctx, x, y, w, h, t, seed, n, color) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const sx = x + hash1(seed + i * 3) * w + sfbm1(t * 0.2 + i, seed + i) * 26;
    const sy = y + ((hash1(seed + i * 7) + t * (0.006 + 0.006 * hash1(i + seed))) % 1) * h;
    const tw = 0.25 + 0.75 * noise1(t * 1.4 + i * 11, seed);
    ctx.globalAlpha = 0.35 * tw;
    ctx.fillStyle = color || '#ffe9b0';
    ctx.beginPath(); ctx.arc(sx, sy, 1.3 + hash1(i * 31) * 1.5, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// falling flower petals over a region
function petalRain(ctx, t, seed, region, n, colors, density) {
  const [x, y, w, h] = region;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const speed = 0.05 + hash1(seed + i) * 0.05;
    const ph = (hash1(seed * 7 + i) + t * speed) % 1.15;
    const px = x + hash1(seed + i * 13) * w + sfbm1(t * 0.4 + i, seed + i) * 60;
    const py = y + ph * h * 1.12 - h * 0.06;
    const rot = t * (1 + hash1(i + seed)) * 2 + i;
    const a = (density || 1) * clamp(1.1 - ph, 0, 1);
    ctx.save();
    ctx.translate(px, py); ctx.rotate(rot);
    ctx.scale(1, 0.45 + 0.4 * Math.sin(t * 3 + i));
    ctx.globalAlpha = 0.9 * a;
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath(); ctx.ellipse(0, 0, 7 + hash1(i * 3) * 4, 4.5, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.35 * a; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(1.5, -1, 2.5, 1.4, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ── ornament ──
function goldLine(ctx, x0, y0, x1, y1, w) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, GOLD_D); g.addColorStop(0.5, GOLD_L); g.addColorStop(1, GOLD_D);
  ctx.strokeStyle = g; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
}
function beadArc(ctx, cx, cy, r, a0, a1, n, size, color) {
  ctx.fillStyle = color || GOLD;
  for (let i = 0; i <= n; i++) {
    const a = lerp(a0, a1, i / n);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, size, 0, TAU);
    ctx.fill();
  }
}
// marigold garland strand between two points, sag amount g
function garlandStrand(ctx, x0, y0, x1, y1, g, t, seed, sc) {
  const S = sc || 1;
  const n = Math.max(6, Math.round(Math.hypot(x1 - x0, y1 - y0) / (26 * S)));
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const sway = sfbm1(t * 0.5 + u * 3, seed) * 4 * S;
    const px = lerp(x0, x1, u) + sway;
    const py = lerp(y0, y1, u) + Math.sin(u * Math.PI) * g + sway * 0.3;
    const col = i % 5 === 0 ? '#d94f2b' : (i % 2 ? '#f2a41f' : '#e8801a');
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(px, py, (i % 5 === 0 ? 6.5 : 5) * S, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,235,170,0.5)';
    ctx.beginPath(); ctx.arc(px - 1.5 * S, py - 1.5 * S, 2 * S, 0, TAU); ctx.fill();
  }
}

// ── atmosphere & grade ──
function vignette(ctx, strength, warm) {
  const g = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.44, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, warm ? `rgba(26,10,4,${strength})` : `rgba(6,6,18,${strength})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
let _grainTile = null;
function grain(ctx, alpha, t) {
  if (!_grainTile) {
    _grainTile = document.createElement('canvas');
    _grainTile.width = 256; _grainTile.height = 256;
    const g = _grainTile.getContext('2d');
    const im = g.createImageData(256, 256);
    const rnd = mulberry(7311);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = 118 + rnd() * 20 | 0;
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  const ox = (Math.floor(t * 24) * 97) % 256, oy = (Math.floor(t * 24) * 61) % 256;
  for (let x = -ox; x < W; x += 256)
    for (let y = -oy; y < H; y += 256)
      ctx.drawImage(_grainTile, x, y);
  ctx.restore();
}
// warm/cool color wash over whole frame
function wash(ctx, color, alpha, mode) {
  ctx.save();
  ctx.globalCompositeOperation = mode || 'soft-light';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
// ground contact shadow
function contactShadow(ctx, x, y, rx, alpha) {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(20,8,2,${alpha})`); g.addColorStop(1, 'rgba(20,8,2,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.26, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
