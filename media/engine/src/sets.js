// ── sets.js ── the SETS registry (Agent B): complete parallax environments.
//
//   SETS.<name>(ctx, cam, t, opts)
//     cam  : {x,y,z} design-space camera (z=1 full frame) — see core.js camLayer
//     t    : seconds (deterministic)
//     opts : { timeOfDay:'dawn'|'day'|'dusk'|'night', palette?, actors(ctx),
//              fg?:bool, rays?:number, particles?:bool, ...set-specific }
//
// Every set: full 1920×1080 coverage at cam z=1, layered camLayer parallax
// (f 0.06 sky → 1.0 subject → 1.3 foreground), a timeOfDay-driven sky + grade
// + light colour, an `actors(ctx)` hook drawn at f=1.0, and subtle ambient
// particles. Static layers are cached() with keys namespaced per set+timeOfDay.
//
// Names: palaceHall, courtyardNight, hutDusk, mandap, forest, village,
//        riverBank, interior, mountain.
//
// Depends on core.js, paint.js, props.js (this repo) and the frozen figure
// globals drawFigure / drawSeated (people.js / world.js). Requires cast.js
// (CAST, kingStyle, brahminStyle) only for palaceHall's built-in dais crowd;
// guarded so the set still renders if they are absent.
'use strict';

// ── time-of-day palette + grade table ──
const _TOD = {
  dawn: {
    sky: [[0, '#38395f'], [0.42, '#7a5e82'], [0.72, '#d98a5c'], [1, '#f0c184']],
    sun: '#ffe6c2', sunA: 0.5, sunPos: [330, 200], light: '#ffdca6',
    wash: '#e8a878', washA: 0.06, vig: 0.34, warm: true, star: 0.16, grade: 'soft-light',
  },
  day: {
    sky: [[0, '#5f8cc4'], [0.5, '#a2c0dc'], [1, '#e0d4ac']],
    sun: '#fff4d2', sunA: 0.5, sunPos: [430, 150], light: '#fff2d0',
    wash: '#ffe4ae', washA: 0.05, vig: 0.26, warm: false, star: 0, grade: 'soft-light',
  },
  dusk: {
    sky: [[0, '#2c1a4a'], [0.4, '#6e3a5a'], [0.72, '#c56a3c'], [1, '#e0995a']],
    sun: '#ff9a4c', sunA: 0.5, sunPos: [1480, 240], light: '#ffb060',
    wash: '#c26a9a', washA: 0.06, vig: 0.4, warm: true, star: 0.32, grade: 'soft-light',
  },
  night: {
    sky: [[0, '#080c22'], [0.55, '#141a34'], [1, '#241f30']],
    sun: '#cdd8ff', sunA: 0.3, sunPos: [1650, 160], light: '#9ab0e0',
    wash: '#26386e', washA: 0.08, vig: 0.5, warm: false, star: 1, grade: 'soft-light',
  },
};
function _tod(opts) { return _TOD[(opts && opts.timeOfDay)] || _TOD.day; }

// ── sky helpers ──
function _stars(ctx, t, alpha, n) {
  n = n || 90;
  for (let i = 0; i < n; i++) {
    const sx = hash1(i * 3.1) * W, sy = hash1(i * 7.7) * H * 0.62;
    const tw = 0.3 + 0.7 * noise1(t * 1.2 + i * 5, 3);
    ctx.fillStyle = `rgba(255,240,220,${alpha * tw})`;
    const r = 1.1 + hash1(i) * 1.4;
    ctx.fillRect(sx, sy, r, r);
  }
}
function _crescent(ctx, x, y, r, rot, back) {
  ctx.save(); ctx.translate(x, y);
  glowAdd(ctx, 0, 0, r * 3.2, 'rgba(240,235,210,0.16)', 0.8);
  ctx.rotate(rot === undefined ? -0.35 : rot);
  ctx.fillStyle = '#f2e3bc'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.fillStyle = back || '#141530'; ctx.beginPath(); ctx.arc(-r * 0.42, -r * 0.18, r * 0.92, 0, TAU); ctx.fill();
  ctx.restore();
}
function _sunDisc(ctx, T, r) {
  const [x, y] = T.sunPos;
  glowAdd(ctx, x, y, (r || 54) * 5, rgba(T.sun, 0.5), T.sunA);
  ctx.fillStyle = T.sun; ctx.beginPath(); ctx.arc(x, y, r || 54, 0, TAU); ctx.fill();
}
function _grade(ctx, opts) {
  const T = _tod(opts), p = (opts && opts.palette) || {};
  wash(ctx, p.wash || T.wash, p.washA != null ? p.washA : T.washA, T.grade);
  vignette(ctx, p.vig != null ? p.vig : T.vig, T.warm);
}
function _actors(ctx, cam, opts) {
  if (opts && opts.actors) camLayer(ctx, cam, 1.0, c => opts.actors(c));
}
// drifting cloud — overlapping circles merged into one soft puffy silhouette.
// `col` is a solid colour; `a` sets translucency.
function _cloud(ctx, x, y, w, h, col, a) {
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col;
  ctx.beginPath();
  const lobes = 8;
  for (let i = 0; i < lobes; i++) {
    const u = i / (lobes - 1);
    const env = Math.sin(u * Math.PI);                       // 0 ends → 1 middle
    const cx = x + (u - 0.5) * w;
    const cy = y - env * h * 0.55;
    const r = h * (0.5 + env * 0.85);
    ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, TAU);
  }
  for (let i = 0; i < 4; i++) {                              // soft under-lobes (no hard base)
    const u = (i + 0.5) / 4;
    const cx = x + (u - 0.5) * w * 0.82;
    ctx.moveTo(cx + h * 0.62, y + h * 0.16); ctx.arc(cx, y + h * 0.16, h * 0.62, 0, TAU);
  }
  ctx.fill();
  ctx.globalAlpha = a * 0.34; ctx.fillStyle = '#ffffff';     // top light
  ctx.beginPath(); ctx.ellipse(x, y - h * 0.28, w * 0.26, h * 0.42, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
// simple conifer silhouette (deodar / distant tree)
function _conifer(ctx, x, base, h, w, col) {
  ctx.fillStyle = col;
  ctx.fillRect(x - w * 0.05, base - h * 0.16, w * 0.1, h * 0.16);
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const u = i / (tiers - 1);
    const ty = base - h * 0.14 - u * h * 0.82;
    const tw = w * (1 - u * 0.78);
    ctx.beginPath();
    ctx.moveTo(x - tw * 0.5, ty);
    ctx.lineTo(x, ty - h * 0.2);
    ctx.lineTo(x + tw * 0.5, ty);
    ctx.closePath(); ctx.fill();
  }
}
// mountain ridge silhouette via fbm
function _ridgeY(x, baseY, amp, seed) {
  return baseY - fbm1(x * 0.0016 + seed, seed, 4) * amp - Math.abs(snoise1(x * 0.006, seed + 5)) * amp * 0.32;
}
function _ridge(ctx, baseY, amp, floorY, col, seed) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-80, floorY);
  ctx.lineTo(-80, baseY);
  for (let x = -80; x <= W + 80; x += 30) ctx.lineTo(x, _ridgeY(x, baseY, amp, seed));
  ctx.lineTo(W + 80, floorY);
  ctx.closePath(); ctx.fill();
}
// snow: a white band hugging the ridge crest, deeper on high peaks, pinching to
// nothing where the ridge dips below snowY (so caps sit on peaks, not a sawtooth)
function _snowCap(ctx, baseY, amp, snowY, seed) {
  const step = 20, top = [], bot = [];
  for (let x = -80; x <= W + 80; x += step) {
    const h = _ridgeY(x, baseY, amp, seed);
    top.push([x, h]);
    bot.push([x, h + clamp((snowY - h) / 90, 0, 1) * 92]);
  }
  ctx.beginPath();
  ctx.moveTo(top[0][0], top[0][1]);
  for (let i = 1; i < top.length; i++) ctx.lineTo(top[i][0], top[i][1]);
  for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, baseY - amp, 0, snowY + 40);
  g.addColorStop(0, 'rgba(250,252,255,0.96)'); g.addColorStop(1, 'rgba(226,235,250,0.12)');
  ctx.fillStyle = g; ctx.fill();
}
// fireflies over a region (dusk/night)
function _fireflies(ctx, t, region, n, seed) {
  const [x, y, w, h] = region;
  for (let i = 0; i < n; i++) {
    const fx = x + hash1(i * 5 + seed) * w + sfbm1(t * 0.4 + i, seed + 1) * 60;
    const fy = y + hash1(i * 11 + seed) * h + sfbm1(t * 0.5 + i * 2, seed + 2) * 40;
    const tw = Math.max(0, Math.sin(t * (1.2 + hash1(i + seed)) + i * 5));
    glowAdd(ctx, fx, fy, 9, `rgba(220,255,140,${0.55 * tw})`, tw);
  }
}
// seed-placed god-ray shafts — origin/angle/count vary per set instance so
// the light feels placed, not stamped. spec: {n,x0,x1,y0,y1,ang,angJit,spread,len}
function _placedRays(ctx, seed, color, alpha, t, spec) {
  if (alpha <= 0.01) return;
  const rnd = mulberry((seed >>> 0) + 101);
  const n = spec.n || (2 + Math.floor(rnd() * 2));
  for (let i = 0; i < n; i++) {
    const ox = spec.x0 + rnd() * (spec.x1 - spec.x0);
    const oy = spec.y0 + rnd() * (spec.y1 - spec.y0);
    const ang = spec.ang + (rnd() - 0.5) * spec.angJit;
    const len = spec.len * (0.82 + rnd() * 0.32);
    const spread = spec.spread * (0.8 + rnd() * 0.5);
    godRays(ctx, ox, oy, ang, spread, len, color, alpha * (0.7 + rnd() * 0.5), t, seed * 7 + i * 13);
  }
}
// tiered/raked ground: 3 depth bands (y baseline + suggested scale) an actors
// hook can query. bandY(0)=nearest/largest … bandY(2)=far/smallest. Also
// published on SETS.current for callers outside the hook. opts.horizon raises
// the far bands (Pahari vertical stacking); opts.groundBands overrides.
function _makeBands(nearY, dh, opts) {
  const raise = (opts && opts.horizon) ? 1.45 : 1;
  const bands = [];
  for (let i = 0; i < 3; i++) bands.push({ y: nearY - i * dh * raise, s: +(1 - i * 0.17).toFixed(3) });
  if (opts && opts.groundBands) for (let i = 0; i < Math.min(3, opts.groundBands.length); i++) Object.assign(bands[i], opts.groundBands[i]);
  const info = { bands: bands, bandY: (i) => bands[clamp(i | 0, 0, 2)].y, bandS: (i) => bands[clamp(i | 0, 0, 2)].s };
  SETS.current = info;
  return info;
}

const SETS = {};
SETS.current = null;

// ═══════════════════════════════════════════════════════════════════
//  palaceHall — ported from the legacy hallSet, config-driven + tod.
//  opts: {timeOfDay, dais:bool, yantra:bool, crowd:bool, brahmins:bool,
//         bow:bool, yantraOpts, bowState, rays, actors, drupadaSmile,
//         draupadiFace}
// ═══════════════════════════════════════════════════════════════════
SETS.palaceHall = function (ctx, cam, t, o) {
  o = o || {};
  const tod = o.timeOfDay || 'day';
  const T = _tod(o);
  const FLOOR = 920, YANTRA_X = 1210, BOW_X = 870;
  const dim = tod === 'night' ? 0.5 : tod === 'dusk' ? 0.72 : tod === 'dawn' ? 0.86 : 1;

  // ambient ground wash
  vgrad(ctx, 0, 0, W, H, [[0, '#3a2410'], [0.45, '#6e4520'], [1, '#2e1a0a']]);

  // L0: far wall (cached per tod)
  camLayer(ctx, cam, 0.15, (c) => {
    const wall = cached('palaceHall-wall-' + tod, W, H, (g) => {
      vgrad(g, 0, 0, W, H, [[0, _hx('#8a5c30', (dim - 1) * 0.5)], [0.5, _hx('#a87c46', (dim - 1) * 0.5)], [1, _hx('#7c5228', (dim - 1) * 0.5)]]);
      for (let i = 0; i < 6; i++) {
        const wx = 210 + i * 300;
        g.fillStyle = tod === 'night' ? '#3a4a7a' : '#f7d98c';
        g.beginPath(); archPath(g, wx, 60, 110, 150); g.fill();
        g.fillStyle = 'rgba(140,90,40,0.55)';
        g.fillRect(wx - 55, 130, 110, 6);
        g.fillRect(wx - 3, 74, 6, 136);
      }
      for (let i = 0; i < 8; i++) {
        const ax = 120 + i * 240;
        g.fillStyle = 'rgba(58,32,10,0.85)';
        g.beginPath(); archPath(g, ax, 330, 170, 300); g.fill();
        g.fillStyle = 'rgba(255,220,150,0.10)';
        g.beginPath(); archPath(g, ax, 336, 158, 288); g.fill();
        g.strokeStyle = rgba('#e8b64c', 0.5); g.lineWidth = 3;
        g.beginPath(); archPath(g, ax, 330, 170, 300); g.stroke();
      }
      g.fillStyle = 'rgba(90,50,16,0.9)'; g.fillRect(0, 640, W, 26);
      for (let x = 20; x < W; x += 46) {
        g.fillStyle = '#e8b64c';
        g.beginPath(); g.arc(x, 653, 6, 0, TAU); g.fill();
      }
      vgrad(g, 0, 660, W, 200, [[0, 'rgba(40,20,6,0.35)'], [1, 'rgba(40,20,6,0)']]);
    });
    c.drawImage(wall, 0, 0);
  });

  // god rays from upper windows
  const raysA = o.rays === undefined ? (0.12 * dim) : o.rays;
  const rseed = (o.seed == null ? 4 : o.seed);
  camLayer(ctx, cam, 0.3, (c) => {
    _placedRays(c, rseed, T.light, raysA, t, { n: 2 + (rseed % 2), x0: 160, x1: 1080, y0: 20, y1: 90, ang: 0.98, angJit: 0.55, spread: 0.32, len: 1500 });
    motes(c, 200, 200, 1100, 640, t, 11, 26, '#ffe9b0');
  });

  // L1: banners + torana
  camLayer(ctx, cam, 0.38, (c) => {
    const cols = ['#8c1f28', '#1f4d8c', '#8c6a1f', '#3f6e2e', '#5c2e6e'];
    for (let i = 0; i < 5; i++) drawBanner(c, 260 + i * 360, 96, 96, 210, cols[i % cols.length], t, i * 3);
    drawTorana(c, -40, W + 40, 250, t, 5);
  });

  // L2: dais, canopy, Drupada, far crowd tier
  camLayer(ctx, cam, 0.62, (c) => {
    const dx = 1560, dw = 560, dtop = 806;
    c.fillStyle = '#7c3a14'; c.fillRect(dx - dw / 2, dtop, dw, 130);
    vgrad(c, dx - dw / 2, dtop, dw, 130, [[0, 'rgba(255,220,150,0.22)'], [0.2, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.4)']]);
    c.fillStyle = '#6e3210'; c.fillRect(dx - dw / 2 - 70, dtop + 60, 90, 70);
    c.fillStyle = '#82401a'; c.fillRect(dx - dw / 2 - 40, dtop + 30, 60, 100);
    c.fillStyle = '#a11e2c'; c.fillRect(dx - dw / 2 + 20, dtop + 2, dw - 40, 16);
    goldLine(c, dx - dw / 2 + 20, dtop + 18, dx + dw / 2 - 20, dtop + 18, 3);
    c.fillStyle = '#8c1f28';
    c.beginPath();
    c.moveTo(dx - dw / 2 - 30, 330);
    c.quadraticCurveTo(dx, 260, dx + dw / 2 + 30, 330);
    c.lineTo(dx + dw / 2 + 10, 384); c.quadraticCurveTo(dx, 320, dx - dw / 2 - 10, 384);
    c.closePath(); c.fill();
    goldLine(c, dx - dw / 2 - 24, 344, dx + dw / 2 + 24, 344, 4);
    c.strokeStyle = '#e8b64c'; c.lineWidth = 3;
    for (let i = 0; i < 18; i++) {
      const fx = dx - dw / 2 + 10 + i * (dw - 20) / 17;
      c.beginPath(); c.moveTo(fx, 352 + Math.sin(i) * 2); c.lineTo(fx, 380 + sfbm1(t + i, 3) * 5); c.stroke();
    }
    c.fillStyle = '#5c3a1a';
    c.fillRect(dx - dw / 2 - 16, 340, 12, dtop - 330);
    c.fillRect(dx + dw / 2 + 4, 340, 12, dtop - 330);
    const hasCast = typeof CAST !== 'undefined';
    if (o.dais !== false && hasCast) {
      c.fillStyle = '#4a2410';
      c.beginPath(); c.moveTo(dx + 150, dtop - 240); c.quadraticCurveTo(dx + 190, dtop - 300, dx + 235, dtop - 238);
      c.lineTo(dx + 240, dtop + 4); c.lineTo(dx + 148, dtop + 4); c.closePath(); c.fill();
      goldLine(c, dx + 150, dtop - 236, dx + 232, dtop - 236, 3);
      drawSeated(c, {
        x: dx + 192, y: dtop + 2, s: 0.62, facing: -1, style: CAST.drupada, t, seed: 41,
        face: { turn: 0.35, smile: o.drupadaSmile || 0, gaze: { x: 0.4, y: 0.15 } },
      });
      drawFigure(c, {
        x: dx - 130, y: dtop + 4, s: 0.60, facing: -1, style: CAST.draupadi,
        pose: {
          headTurn: 0.3, armF: { sh: 0.55, el: 1.35, hand: 'hold' }, armB: { sh: 0.42, el: 1.5, hand: 'hold' },
          face: Object.assign({ smile: 0.05, lowered: 0.4 }, o.draupadiFace),
        }, t, seed: 8,
      });
      garlandStrand(c, dx - 130 - 48, dtop - 148, dx - 130 - 6, dtop - 156, 40, t, 77, 0.6);
      drawFigure(c, {
        x: dx + 40, y: dtop + 4, s: 0.62, facing: -1, style: CAST.dhrishtadyumna,
        pose: { headTurn: 0.3, armF: { sh: 0.2, el: 0.4 }, face: { smile: 0 } }, t, seed: 9,
      });
    }
    if (o.crowd !== false && hasCast) {
      const far = crowdStrip('palaceHall-crowd-far', 7, kingStyle, 0.5);
      c.drawImage(far, 30, 700 - far.height);
      c.fillStyle = '#5c3014'; c.fillRect(0, 696, 900, 18);
      goldLine(c, 0, 700, 900, 700, 2);
    }
  });

  // L3: near crowd + brahmin row
  camLayer(ctx, cam, 0.85, (c) => {
    const hasCast = typeof CAST !== 'undefined';
    if (o.crowd !== false && hasCast) {
      const near = crowdStrip('palaceHall-crowd-near', 6, i => kingStyle(i + 7), 0.72);
      c.drawImage(near, -30, 866 - near.height);
      c.fillStyle = '#3f2008'; c.fillRect(-40, 860, 880, 26);
      goldLine(c, -40, 864, 840, 864, 2.4);
    }
    if (o.brahmins && hasCast) {
      const br = crowdStrip('palaceHall-crowd-brahmin', 5, brahminStyle, 0.62);
      c.drawImage(br, -20, 1074 - br.height);
    }
  });

  // L4: subject plane — floor + furniture + actors
  camLayer(ctx, cam, 1.0, (c) => {
    const cg = c.createLinearGradient(0, FLOOR - 40, 0, H);
    cg.addColorStop(0, '#8f2230'); cg.addColorStop(1, '#5c1420');
    c.fillStyle = cg;
    c.beginPath();
    c.moveTo(560, FLOOR - 30); c.lineTo(1520, FLOOR - 30);
    c.lineTo(1780, H + 40); c.lineTo(300, H + 40);
    c.closePath(); c.fill();
    c.strokeStyle = '#e8b64c'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(560, FLOOR - 30); c.lineTo(300, H + 40); c.stroke();
    c.beginPath(); c.moveTo(1520, FLOOR - 30); c.lineTo(1780, H + 40); c.stroke();
    drawLampStand(c, 430, FLOOR + 60, 1.0, t, 3);
    drawLampStand(c, 1680, FLOOR + 40, 0.95, t, 8);
    if (o.yantra !== false) {
      drawYantra(c, YANTRA_X, FLOOR - 130, 1.06, t, o.yantraOpts);
      drawBasin(c, YANTRA_X, FLOOR + 6, 0.9, t, o.reflFn);
    }
    if (o.bow !== false) {
      c.fillStyle = '#6e3a12'; c.fillRect(BOW_X - 120, FLOOR - 64, 240, 26);
      c.fillStyle = '#82461a'; c.fillRect(BOW_X - 100, FLOOR - 40, 200, 44);
      goldLine(c, BOW_X - 120, FLOOR - 62, BOW_X + 120, FLOOR - 62, 3);
      const bs = o.bowState || {};
      if (!bs.held) {
        c.save();
        c.translate(BOW_X, FLOOR - 92); c.rotate(-1.42);
        drawGreatBow(c, 0, 0, 0.86, bs.flex || 0, !!bs.strung, null);
        c.restore();
        glowAdd(c, BOW_X, FLOOR - 110, 130, 'rgba(255,190,90,0.16)', 0.5 + 0.2 * Math.sin(t * 1.2));
      }
    }
    const bi = _makeBands(FLOOR + 70, 96, o);
    if (o.actors) o.actors(c, bi);
  });

  // L5: foreground pillars + garland
  camLayer(ctx, cam, 1.3, (c) => {
    drawPillar(c, 110, H + 80, 120, 1300, '#7c4a22');
    drawPillar(c, 1810, H + 80, 120, 1300, '#7c4a22');
    garlandStrand(c, 60, 130, 420, 96, 70, t, 21, 1.35);
    garlandStrand(c, 1500, 96, 1860, 130, 70, t, 22, 1.35);
  });

  _grade(ctx, o);
};

// ═══════════════════════════════════════════════════════════════════
//  courtyardNight — from the fire-scene night courtyard.
//  Defaults to night; tod swaps sky/stars/moon.
// ═══════════════════════════════════════════════════════════════════
SETS.courtyardNight = function (ctx, cam, t, o) {
  o = o || {};
  const tod = o.timeOfDay || 'night';
  const T = _TOD[tod] || _TOD.night;
  vgrad(ctx, 0, 0, W, H, tod === 'night' ? [[0, '#0a0f26'], [0.55, '#1c1430'], [1, '#3a1c14']] : T.sky);

  camLayer(ctx, cam, 0.06, (c) => {
    if (T.star > 0.02) _stars(c, t, T.star * 0.7, 90);
    if (tod === 'night' || tod === 'dusk') _crescent(c, 1650, 150, 44, -0.35, '#141530');
    else _sunDisc(c, T);
  });
  camLayer(ctx, cam, 0.18, (c) => {
    drawSkyline(c, 640, '#171028', 42);
    drawSkyline(c, 700, '#241636', 87);
  });
  // walls / gate flanking the courtyard
  camLayer(ctx, cam, 0.4, (c) => {
    c.fillStyle = '#2a1a14';
    c.fillRect(-40, 560, 360, 260);
    c.fillRect(W - 320, 560, 360, 260);
    drawPillar(c, 150, 900, 90, 360, '#3a2418');
    drawPillar(c, W - 150, 900, 90, 360, '#3a2418');
    // torches on the gate posts
    for (const gx of [150, W - 150]) {
      flame(c, gx, 560, 26, t, gx, 0.9);
      glowAdd(c, gx, 556, 90, 'rgba(255,150,50,0.4)', 0.8);
    }
  });
  camLayer(ctx, cam, 0.7, (c) => {
    vgrad(c, -100, 700, W + 200, H - 600, [[0, '#3f2412'], [1, '#1c0e06']]);
    // flagstone hint
    c.strokeStyle = 'rgba(20,10,4,0.4)'; c.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const yy = 760 + i * 60; c.beginPath(); c.moveTo(0, yy); c.lineTo(W, yy + snoise1(i, 2) * 6); c.stroke(); }
  });
  camLayer(ctx, cam, 1.0, (c) => {
    const bi = _makeBands(1012, 92, o);
    if (o.actors) o.actors(c, bi);
  });
  camLayer(ctx, cam, 1.3, (c) => {
    if (o.fg !== false) { drawPillar(c, 60, H + 40, 130, 1200, '#241610'); drawPillar(c, W - 60, H + 40, 130, 1200, '#241610'); }
  });
  if (o.particles !== false) camLayer(ctx, cam, 1.1, c => embers(c, W / 2, 900, 500, t, 71, 14, '#ffca6a'));
  _grade(ctx, o);
};

// ═══════════════════════════════════════════════════════════════════
//  hutDusk — from the Kuntī scene: dusk sky, treeline, path, potter's hut.
// ═══════════════════════════════════════════════════════════════════
SETS.hutDusk = function (ctx, cam, t, o) {
  o = o || {};
  const tod = o.timeOfDay || 'dusk';
  const T = _tod({ timeOfDay: tod });
  vgrad(ctx, 0, 0, W, H, tod === 'dusk'
    ? [[0, '#2c1a4a'], [0.4, '#6e3a5a'], [0.72, '#c56a3c'], [1, '#3a1c10']]
    : T.sky);

  camLayer(ctx, cam, 0.08, (c) => {
    if (T.star > 0.02) _stars(c, t, T.star * 0.7, 34);
    // evening star
    glowAdd(c, 1500, 170, 10, 'rgba(255,255,240,0.9)', 0.9);
    c.fillStyle = '#fffbe8'; c.beginPath(); c.arc(1500, 170, 2.6, 0, TAU); c.fill();
    if (tod === 'day' || tod === 'dawn') _sunDisc(c, T);
  });
  camLayer(ctx, cam, 0.25, (c) => {
    drawSkyline(c, 730, '#241226', 55);
    c.fillStyle = '#1c0e1c';
    for (let i = 0; i < 12; i++) {
      const tx = i * 180 + snoise1(i * 3, 8) * 40;
      const th = 90 + hash1(i * 7) * 70;
      c.beginPath(); c.ellipse(tx, 730 - th * 0.4, 60 + hash1(i) * 30, th * 0.5, 0, 0, TAU); c.fill();
      c.fillRect(tx - 6, 730 - th * 0.15, 12, th * 0.3);
    }
  });
  camLayer(ctx, cam, 0.5, (c) => {
    // mid trees framing
    treeAshoka(c, { x: 210, y: 900, s: 0.7, t, seed: 3, tod });
    treeBanyan(c, { x: 1640, y: 930, s: 0.62, t, seed: 7, tod });
  });
  camLayer(ctx, cam, 0.8, (c) => {
    vgrad(c, -100, 720, W + 200, H - 620, [[0, '#4a2a16'], [1, '#200f06']]);
    c.fillStyle = 'rgba(200,150,90,0.20)';
    c.beginPath();
    c.moveTo(300, 1120); c.quadraticCurveTo(800, 900, 1350, 850);
    c.lineTo(1500, 870); c.quadraticCurveTo(900, 980, 520, 1140);
    c.closePath(); c.fill();
  });
  camLayer(ctx, cam, 1.0, (c) => {
    drawHut(c, { x: 1430, y: 900, s: 1.0, t, seed: 71, lamp: true, smoke: true });
    // stacked pots by the hut
    potStack(c, { x: 1560, y: 902, s: 0.9, seed: 5 });
    const bi = _makeBands(958, 88, o);
    if (o.actors) o.actors(c, bi);
  });
  if (o.particles !== false) camLayer(ctx, cam, 1.1, c => _fireflies(c, t, [200, 760, 1400, 260], 14, 61));
  camLayer(ctx, cam, 1.3, (c) => { if (o.fg !== false) treePalm(c, { x: 120, y: H + 40, s: 1.05, t, seed: 11, tod }); });
  _grade(ctx, { timeOfDay: tod, palette: Object.assign({ wash: '#c26a9a', washA: 0.05 }, o.palette) });
};

// ═══════════════════════════════════════════════════════════════════
//  mandap — from the wedding scene: canopy, torana, fire, rangoli.
// ═══════════════════════════════════════════════════════════════════
SETS.mandap = function (ctx, cam, t, o) {
  o = o || {};
  const tod = o.timeOfDay || 'dusk';
  vgrad(ctx, 0, 0, W, H, tod === 'night'
    ? [[0, '#161028'], [0.5, '#2c1810'], [1, '#1c0e06']]
    : [[0, '#2c1430'], [0.5, '#5c2818'], [1, '#2a1206']]);

  camLayer(ctx, cam, 0.15, (c) => {
    glowAdd(c, 960, 260, 700, 'rgba(255,150,60,0.14)', 1);
    drawSkyline(c, 560, '#200f22', 77);
    if (tod === 'night') _stars(c, t, 0.5, 40);
  });
  camLayer(ctx, cam, 0.5, (c) => {
    c.fillStyle = '#6e3a14';
    for (const px of [330, 1590]) c.fillRect(px - 14, 300, 28, 660);
    for (const px of [560, 1360]) c.fillRect(px - 11, 240, 22, 500);
    const cg = c.createLinearGradient(0, 180, 0, 330);
    cg.addColorStop(0, '#a11e2c'); cg.addColorStop(1, '#7c1220');
    c.fillStyle = cg;
    c.beginPath();
    c.moveTo(240, 320); c.quadraticCurveTo(960, 170, 1680, 320);
    c.lineTo(1680, 260); c.quadraticCurveTo(960, 120, 240, 260);
    c.closePath(); c.fill();
    goldLine(c, 250, 316, 1670, 316, 5);
    drawTorana(c, 260, 1660, 330, t, 61);
    for (let i = 0; i < 8; i++) {
      const lx = 380 + i * 170;
      glowAdd(c, lx, 356, 26, 'rgba(255,190,80,0.55)', 0.8 + 0.2 * Math.sin(t * 2 + i));
      c.fillStyle = '#e8a825'; c.beginPath(); c.arc(lx, 356, 5, 0, TAU); c.fill();
    }
  });
  camLayer(ctx, cam, 1.0, (c) => {
    vgrad(c, -100, 880, W + 200, 320, [[0, '#4a2410'], [1, '#241004']]);
    c.strokeStyle = rgba('#e8b64c', 0.5); c.lineWidth = 3;
    c.beginPath(); c.ellipse(960, 966, 300, 74, 0, 0, TAU); c.stroke();
    c.strokeStyle = rgba('#d94f2b', 0.5);
    c.beginPath(); c.ellipse(960, 966, 262, 62, 0, 0, TAU); c.stroke();
    const fireS = 66 + Math.sin(t * 2.2) * 4;
    c.fillStyle = '#5c2c10';
    c.beginPath(); c.moveTo(884, 966); c.lineTo(902, 928); c.lineTo(1018, 928); c.lineTo(1036, 966);
    c.lineTo(1010, 984); c.lineTo(910, 984); c.closePath(); c.fill();
    flame(c, 960, 936, fireS, t, 171, 1);
    embers(c, 960, 900, 90, t, 173, 16);
    glowAdd(c, 960, 900, 300, 'rgba(255,170,70,0.30)', 1);
    const bi = _makeBands(1044, 84, o);
    if (o.actors) o.actors(c, bi);
  });
  if (o.particles !== false) petalRain(ctx, t, 17, [-100, -80, W + 200, H + 100], 30, ['#f2a41f', '#e8801a', '#f6e7bf'], 0.6);
  _grade(ctx, { timeOfDay: tod, palette: Object.assign({ wash: '#ff9a4c', washA: 0.08, vig: 0.42 }, o.palette) });
};

// ═══════════════════════════════════════════════════════════════════
//  forest — 5+ parallax layers, canopy gaps + god rays, banyan/ashoka/palm,
//  undergrowth, fireflies (dusk/night), mist bands (dawn).
// ═══════════════════════════════════════════════════════════════════
SETS.forest = function (ctx, cam, t, o) {
  o = o || {};
  const tod = o.timeOfDay || 'day';
  const T = _tod(o);
  const dim = tod === 'night' ? 0.42 : tod === 'dusk' ? 0.66 : tod === 'dawn' ? 0.82 : 1;

  // sky glimpsed through the canopy
  vgrad(ctx, 0, 0, W, H, T.sky);
  camLayer(ctx, cam, 0.06, (c) => { if (T.star > 0.02) _stars(c, t, T.star * 0.6, 50); });

  // L1 far misty tree wall
  camLayer(ctx, cam, 0.14, (c) => {
    const wall = cached('forest-far-' + tod, W, H, (g) => {
      const pal = _foliage(tod);
      g.fillStyle = mixC(pal.dark, T.sky[0][1], 0.16);     // far tree wall, hazed toward sky
      g.fillRect(-100, 690, W + 200, 420);                 // solid base — no sky gaps
      g.fillStyle = mixC(pal.mid, T.sky[0][1], 0.2);
      for (let i = 0; i < 26; i++) {
        const x = i * 80 + snoise1(i * 3, 4) * 30;
        const h = 380 + hash1(i * 7) * 260;
        g.beginPath(); g.ellipse(x, 760 - h * 0.4, 70, h * 0.5, 0, 0, TAU); g.fill();  // lumpy canopy top
      }
    });
    c.drawImage(wall, 0, 0);
  });

  // L2 canopy gap god rays
  const raysA = o.rays === undefined ? 0.2 * dim : o.rays;
  camLayer(ctx, cam, 0.28, (c) => {
    treeAshoka(c, { x: 360, y: 980, s: 0.85, t, seed: 21, tod });
    treeAshoka(c, { x: 1520, y: 1000, s: 0.95, t, seed: 22, tod });
    treePalm(c, { x: 980, y: 940, s: 0.8, t, seed: 23, tod });
    if (raysA > 0.02) _placedRays(c, (o.seed == null ? 7 : o.seed), T.light, raysA, t, { n: 2 + ((o.seed || 7) % 2), x0: 380, x1: 1420, y0: -90, y1: 30, ang: 1.1, angJit: 0.4, spread: 0.24, len: 1520 });
    motes(c, 300, 200, 1300, 700, t, 12, 28, '#e8f0c0');
  });

  // L3 mist bands (dawn) behind the mid trees
  if (tod === 'dawn') camLayer(ctx, cam, 0.4, (c) => {
    for (let i = 0; i < 4; i++) {
      const my = 560 + i * 110 + sfbm1(t * 0.2 + i, 9) * 20;
      _cloud(c, W / 2 + sfbm1(t * 0.15 + i, 3) * 200, my, 1600, 60, 'rgba(220,210,225,0.5)', 0.5 - i * 0.08);
    }
  });

  // L4 hero banyan + mid trees
  camLayer(ctx, cam, 0.52, (c) => {
    treeBanyan(c, { x: 700, y: 1030, s: 1.05, t, seed: 31, tod });
    treeAshoka(c, { x: 1300, y: 1040, s: 1.1, t, seed: 33, tod });
  });

  // L5 undergrowth + floor
  camLayer(ctx, cam, 0.82, (c) => {
    vgrad(c, -100, 860, W + 200, H - 760, [[0, _hx('#3a4a22', (dim - 1) * 0.3)], [1, '#1c1206']]);
    // dappled light on floor
    if (raysA > 0.02) { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 10; i++) { const lx = hash1(i * 5) * W; softDisc(c, lx, 980 + hash1(i * 3) * 80, 90, rgba(T.light, 0.05 * dim), 'rgba(0,0,0,0)'); } c.restore(); }
    // ferns / bushes
    for (let i = 0; i < 14; i++) {
      const bx = 60 + i * 140 + snoise1(i * 4, 6) * 40;
      _fern(c, bx, 980 + (i % 3) * 20, 60 + hash1(i) * 40, i % 2 ? '#274a1c' : '#356b26', t, i);
    }
  });

  camLayer(ctx, cam, 1.0, (c) => {
    for (let i = 0; i < 10; i++) { const bx = 30 + i * 200; _fern(c, bx, 1070, 90 + hash1(i + 3) * 40, '#22401a', t, i + 20); }
    const bi = _makeBands(1058, 100, o);
    if (o.actors) o.actors(c, bi);
  });

  if (o.particles !== false && (tod === 'dusk' || tod === 'night')) camLayer(ctx, cam, 1.1, c => _fireflies(c, t, [150, 640, 1600, 380], 18, 41));

  // L6 foreground trunk + fronds
  camLayer(ctx, cam, 1.3, (c) => {
    if (o.fg !== false) {
      c.fillStyle = '#2e1e10';
      c.beginPath(); c.moveTo(-20, 0); c.quadraticCurveTo(120, 400, 60, H); c.lineTo(-40, H); c.closePath(); c.fill();
      treePalm(c, { x: 1860, y: H + 60, s: 1.2, t, seed: 44, tod });
    }
  });
  _grade(ctx, o);
};
function _fern(ctx, x, base, h, col, t, seed) {
  ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round';
  const sway = sfbm1(t * 0.7 + seed, seed) * 0.14;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.32 + sway;
    const ex = x + Math.cos(a) * h, ey = base + Math.sin(a) * h;
    ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + Math.cos(a) * h * 0.5 - 6, base + Math.sin(a) * h * 0.5, ex, ey); ctx.stroke();
  }
}

// ═══════════════════════════════════════════════════════════════════
//  village — hut row, well, cart, hanging cloth, chimney smoke, fields.
// ═══════════════════════════════════════════════════════════════════
SETS.village = function (ctx, cam, t, o) {
  o = o || {};
  const tod = o.timeOfDay || 'day';
  const T = _tod(o);
  vgrad(ctx, 0, 0, W, H, T.sky);

  camLayer(ctx, cam, 0.06, (c) => {
    if (T.star > 0.02) _stars(c, t, T.star * 0.7, 50);
    if (tod === 'day' || tod === 'dawn' || tod === 'dusk') _sunDisc(c, T);
    else _crescent(c, 1650, 160, 40);
    // drifting clouds
    if (tod !== 'night') for (let i = 0; i < 3; i++) _cloud(c, ((t * 6 + i * 700) % (W + 900)) - 400, 140 + (i % 2) * 60, 480, 48, '#fff6ea', tod === 'day' ? 0.62 : 0.4);
  });
  // distant fields + treeline
  camLayer(ctx, cam, 0.2, (c) => {
    vgrad(c, -100, 700, W + 200, 200, [[0, _hx('#7c8a3a', (T === _TOD.night ? -0.4 : 0))], [1, '#5c6e28']]);
    c.strokeStyle = 'rgba(40,50,10,0.3)'; c.lineWidth = 2;
    for (let i = 0; i < 20; i++) { const yy = 720 + i * 9; c.beginPath(); c.moveTo(0, yy); c.lineTo(W, yy - 20 + snoise1(i, 3) * 4); c.stroke(); }
    c.fillStyle = '#3a4a1e';
    for (let i = 0; i < 10; i++) { const tx = i * 210 + snoise1(i * 3, 5) * 40; c.beginPath(); c.ellipse(tx, 700, 60, 40, 0, 0, TAU); c.fill(); }
  });
  // far hut row
  camLayer(ctx, cam, 0.4, (c) => {
    for (let i = 0; i < 4; i++) drawHut(c, { x: 220 + i * 460, y: 812, s: 0.42, t, seed: 10 + i, lamp: tod === 'night' || tod === 'dusk', smoke: i % 2 === 0 });
  });
  // mid: main hut + well + smoke
  camLayer(ctx, cam, 0.66, (c) => {
    drawHut(c, { x: 470, y: 936, s: 0.82, t, seed: 51, lamp: tod !== 'day', smoke: true });
    drawWell(c, { x: 1150, y: 940, s: 0.72, t, seed: 3 });
    treeBanyan(c, { x: 1640, y: 980, s: 0.7, t, seed: 9, tod });
  });
  // near: cart + potstack
  camLayer(ctx, cam, 0.9, (c) => {
    vgrad(c, -100, 900, W + 200, H - 800, [[0, '#7a5a34'], [1, '#3a2612']]);
    drawCart(c, { x: 760, y: 1030, s: 0.9, t, seed: 2, load: 'hay', facing: 1 });
    potStack(c, { x: 1360, y: 1020, s: 0.85, seed: 6 });
  });
  camLayer(ctx, cam, 1.0, (c) => {
    // dirt path
    c.fillStyle = 'rgba(180,140,90,0.25)';
    c.beginPath(); c.moveTo(500, H); c.quadraticCurveTo(900, 980, 1180, 966); c.lineTo(1320, 984); c.quadraticCurveTo(1000, 1030, 760, H); c.closePath(); c.fill();
    const bi = _makeBands(1035, 90, o);
    if (o.actors) o.actors(c, bi);
  });
  // foreground: hanging cloth line
  camLayer(ctx, cam, 1.3, (c) => {
    if (o.fg !== false) {
      c.strokeStyle = '#5a4028'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(-20, 120); c.quadraticCurveTo(W / 2, 190, W + 20, 120); c.stroke();
      const cc = ['#c0392b', '#2e6da8', '#e0a020', '#3f7a52', '#8c3f6e'];
      for (let i = 0; i < 6; i++) {
        const px = 120 + i * 300;
        const sag = Math.sin((px / W) * Math.PI) * 60 + 130;
        const sway = sfbm1(t * 0.6 + i, i) * 8;
        c.fillStyle = cc[i % cc.length];
        c.beginPath();
        c.moveTo(px - 60, sag);
        c.lineTo(px + 60, sag + 4);
        c.quadraticCurveTo(px + 66 + sway, sag + 150, px + 40 + sway, sag + 240);
        c.lineTo(px - 40 + sway, sag + 236);
        c.quadraticCurveTo(px - 60, sag + 150, px - 60, sag);
        c.closePath(); c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = 2; c.stroke();
      }
    }
  });
  _grade(ctx, o);
};

// ═══════════════════════════════════════════════════════════════════
//  riverBank — layered flowing water, reeds, ghat steps option, reflections.
// ═══════════════════════════════════════════════════════════════════
SETS.riverBank = function (ctx, cam, t, o) {
  o = o || {};
  const tod = o.timeOfDay || 'day';
  const T = _tod(o);
  const waterY = 640;                       // horizon / far waterline
  vgrad(ctx, 0, 0, W, waterY, T.sky.map(s => s));

  camLayer(ctx, cam, 0.06, (c) => {
    if (T.star > 0.02) _stars(c, t, T.star * 0.7, 40);
    if (tod === 'day' || tod === 'dawn' || tod === 'dusk') _sunDisc(c, T);
    else _crescent(c, 1600, 150, 40);
  });
  // far bank + treeline across the river
  camLayer(ctx, cam, 0.18, (c) => {
    drawSkyline(c, waterY - 10, tod === 'night' ? '#1a1428' : '#6a5a3a', 33);
    c.fillStyle = tod === 'night' ? '#141a12' : '#3a4a24';
    for (let i = 0; i < 14; i++) { const tx = i * 150 + snoise1(i * 3, 7) * 40; c.beginPath(); c.ellipse(tx, waterY - 30, 60, 44, 0, 0, TAU); c.fill(); }
    c.fillStyle = tod === 'night' ? '#0c1020' : '#5a4a30';
    c.fillRect(-100, waterY - 8, W + 200, 20);
  });

  // WATER — the river fills from waterY to bottom. Base gradient reflecting sky.
  camLayer(ctx, cam, 0.5, (c) => {
    const wg = c.createLinearGradient(0, waterY, 0, H);
    if (tod === 'night') { wg.addColorStop(0, '#12203a'); wg.addColorStop(1, '#0a1220'); }
    else if (tod === 'dusk') { wg.addColorStop(0, '#8a5a5c'); wg.addColorStop(0.4, '#5a4258'); wg.addColorStop(1, '#2a2038'); }
    else if (tod === 'dawn') { wg.addColorStop(0, '#9a8299'); wg.addColorStop(1, '#4a4a68'); }
    else { wg.addColorStop(0, '#7fa8c0'); wg.addColorStop(0.5, '#4d7a94'); wg.addColorStop(1, '#2c4a60'); }
    c.fillStyle = wg; c.fillRect(-100, waterY, W + 200, H - waterY + 40);
    // sun/moon glitter column reflection
    const gx = tod === 'night' ? 1600 : T.sunPos[0];
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) {
      const yy = waterY + 8 + i * (H - waterY) / 40;
      const spread = 20 + (yy - waterY) * 0.5;
      const wob = sfbm1(t * 1.4 + i * 0.7, 5) * spread;
      const a = (0.10 + 0.10 * noise1(t * 2 + i, 3)) * (1 - i / 46);
      c.fillStyle = rgba(tod === 'night' ? '#a8c0ff' : T.sun, a);
      c.fillRect(gx + wob - spread * 0.3, yy, spread * 0.6, 3.2);
    }
    c.restore();
  });

  // flowing highlight ripple streaks (animated noise-driven), nearer band
  camLayer(ctx, cam, 0.78, (c) => {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) {
      const baseY = waterY + 40 + hash1(i * 5) * (H - waterY);
      const yy = baseY;
      const drift = (t * (18 + hash1(i) * 20) + hash1(i * 7) * W) % (W + 300) - 150;
      const len = 60 + hash1(i * 3) * 140;
      const a = (0.05 + 0.08 * noise1(t * 1.5 + i, 2)) * (0.4 + 0.6 * (yy - waterY) / (H - waterY));
      const wob = sfbm1(t * 1.2 + i, 9) * 8;
      c.strokeStyle = rgba(tod === 'night' ? '#5a80c0' : '#dff0ff', a);
      c.lineWidth = 2.2 + (yy - waterY) / (H - waterY) * 3;
      c.beginPath();
      c.moveTo(drift, yy + wob);
      c.quadraticCurveTo(drift + len * 0.5, yy - 6 + wob, drift + len, yy + wob);
      c.stroke();
    }
    c.restore();
    // reflections of reeds as wobbling dark streaks
    c.save(); c.globalAlpha = 0.3;
    for (let i = 0; i < 8; i++) { const rx = 120 + i * 230; c.strokeStyle = 'rgba(20,40,20,0.5)'; c.lineWidth = 6; c.beginPath(); c.moveTo(rx, waterY + 60); c.lineTo(rx + sfbm1(t * 1.6 + i, 4) * 20, waterY + 200); c.stroke(); }
    c.restore();
  });

  // near bank (bottom-left wedge) + optional ghat steps + reeds
  camLayer(ctx, cam, 1.0, (c) => {
    // muddy near bank
    c.fillStyle = '#5a4226';
    c.beginPath(); c.moveTo(-100, H + 40); c.lineTo(-100, 940); c.quadraticCurveTo(500, 900, 980, 1010); c.lineTo(980, H + 40); c.closePath(); c.fill();
    c.fillStyle = 'rgba(30,18,8,0.4)';
    c.beginPath(); c.moveTo(-100, H + 40); c.lineTo(-100, 980); c.quadraticCurveTo(400, 950, 900, 1030); c.lineTo(900, H + 40); c.closePath(); c.fill();
    if (o.ghat) {
      for (let i = 0; i < 5; i++) {
        const sy = 940 + i * 40, sw = 620 - i * 40;
        c.fillStyle = _hx('#a89a7a', -i * 0.05);
        c.fillRect(-100, sy, sw, 22);
        c.strokeStyle = 'rgba(30,20,8,0.4)'; c.lineWidth = 2; c.strokeRect(-100, sy, sw, 22);
      }
    }
    // reeds on the near bank
    for (let i = 0; i < 12; i++) { const rx = 120 + i * 70 + snoise1(i * 3, 2) * 20; _reed(c, rx, 1000 + (i % 3) * 18, 160 + hash1(i) * 90, t, i); }
    const bi = _makeBands(1045, 90, o);
    if (o.actors) o.actors(c, bi);
  });
  // foreground reeds
  camLayer(ctx, cam, 1.3, (c) => { if (o.fg !== false) for (let i = 0; i < 7; i++) { const rx = 40 + i * 150; _reed(c, rx, H + 20, 300 + hash1(i + 4) * 120, t, i + 30); } });
  _grade(ctx, o);
};
function _reed(ctx, x, base, h, t, seed) {
  const sway = sfbm1(t * 0.8 + seed, seed) * 0.2;
  ctx.strokeStyle = '#2e5a24'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    const a = -Math.PI / 2 + i * 0.14 + sway;
    ctx.beginPath(); ctx.moveTo(x + i * 6, base); ctx.quadraticCurveTo(x + i * 12 + Math.cos(a) * h * 0.5, base - h * 0.5, x + i * 10 + Math.cos(a) * h, base - h); ctx.stroke();
  }
  // cattail head
  ctx.fillStyle = '#6e4422'; ctx.beginPath(); ctx.ellipse(x + Math.cos(-Math.PI / 2 + sway) * h, base - h, 6, 20, -sway, 0, TAU); ctx.fill();
}

// ═══════════════════════════════════════════════════════════════════
//  interior — a chamber: pillars, arched window with light, low seat,
//  oil lamps, drapes.
// ═══════════════════════════════════════════════════════════════════
SETS.interior = function (ctx, cam, t, o) {
  o = o || {};
  const tod = o.timeOfDay || 'day';
  const T = _tod(o);
  const lampMode = tod === 'night' || tod === 'dusk';

  // back wall base
  vgrad(ctx, 0, 0, W, H, [[0, '#4a3320'], [0.55, '#5c4026'], [1, '#2e1f10']]);

  // L0 back wall with niche + window (cached per tod)
  camLayer(ctx, cam, 0.15, (c) => {
    const wall = cached('interior-wall-' + tod, W, H, (g) => {
      vgrad(g, 0, 0, W, H, [[0, '#6e4e2e'], [0.5, '#7c5836'], [1, '#4a3018']]);
      // wall panels
      g.strokeStyle = 'rgba(40,24,8,0.5)'; g.lineWidth = 3;
      for (let i = 0; i < 5; i++) { const px = 180 + i * 380; g.strokeRect(px, 180, 240, 520); }
      // decorative niches with pots
      for (let i = 0; i < 4; i++) {
        const nx = 300 + i * 440;
        g.fillStyle = '#3a2410'; g.beginPath(); archPath(g, nx, 300, 90, 150); g.fill();
      }
      // frieze
      g.fillStyle = 'rgba(90,50,16,0.9)'; g.fillRect(0, 150, W, 22);
      for (let x = 20; x < W; x += 50) { g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(x, 161, 5, 0, TAU); g.fill(); }
    });
    c.drawImage(wall, 0, 0);
    // arched window (right) showing sky/light
    const wx = 1480, wtop = 250, ww = 240, wh = 360;
    c.fillStyle = lampMode ? (tod === 'night' ? '#101830' : '#7a4a4a') : '#bcd6e8';
    c.beginPath(); archPath(c, wx, wtop, ww, wh); c.fill();
    if (tod === 'night') _stars(c, t, 0.8, 12);
    // window mullions
    c.strokeStyle = '#3a2410'; c.lineWidth = 8;
    c.beginPath(); archPath(c, wx, wtop, ww, wh); c.stroke();
    c.beginPath(); c.moveTo(wx, wtop + 40); c.lineTo(wx, wtop + wh); c.stroke();
    c.beginPath(); c.moveTo(wx - ww / 2, wtop + wh * 0.55); c.lineTo(wx + ww / 2, wtop + wh * 0.55); c.stroke();
  });

  // L1 light beam from the window into the room
  camLayer(ctx, cam, 0.32, (c) => {
    const beamA = lampMode ? 0.06 : 0.18;
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(1480, 300, 900, 1050);
    g.addColorStop(0, rgba(T.light, beamA)); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(1360, 300); c.lineTo(1600, 300); c.lineTo(1180, 1080); c.lineTo(720, 1080); c.closePath(); c.fill();
    c.restore();
    motes(c, 800, 350, 700, 700, t, 14, 22, '#ffe9b0');
  });

  // L2 hanging drapes + shelf lamp
  camLayer(ctx, cam, 0.5, (c) => {
    // left drape
    _drape(c, 120, 120, 260, 720, '#7c1f2c', t, 1);
    _drape(c, W - 260, 120, 240, 640, '#3a2a6a', t, 2);
  });

  // L3 pillars
  camLayer(ctx, cam, 0.82, (c) => {
    drawPillar(c, 260, H - 40, 110, 1040, '#7c4a22');
    drawPillar(c, 1300, H - 40, 110, 1040, '#7c4a22');
  });

  // L4 subject: floor + low seat + lamps + actors
  camLayer(ctx, cam, 1.0, (c) => {
    // floor
    vgrad(c, -100, 880, W + 200, 320, [[0, '#6e4a28'], [1, '#3a2410']]);
    // floor rug
    c.fillStyle = '#7c1f2c';
    c.beginPath(); c.moveTo(560, 940); c.lineTo(1360, 940); c.lineTo(1560, H); c.lineTo(360, H); c.closePath(); c.fill();
    c.strokeStyle = rgba('#e8b64c', 0.6); c.lineWidth = 4;
    c.beginPath(); c.moveTo(600, 960); c.lineTo(1320, 960); c.lineTo(1500, H - 20); c.lineTo(420, H - 20); c.closePath(); c.stroke();
    // low cushioned seat (takht)
    _lowSeat(c, 960, 980, 1.0);
    // oil lamps flanking
    drawLampStand(c, 470, 1000, 0.8, t, 3);
    drawLampStand(c, 1460, 990, 0.78, t, 8);
    const bi = _makeBands(1010, 80, o);
    if (o.actors) o.actors(c, bi);
  });

  camLayer(ctx, cam, 1.3, (c) => { if (o.fg !== false) drawPillar(c, 70, H + 30, 150, 1220, '#5c3418'); });
  _grade(ctx, { timeOfDay: tod, palette: Object.assign({ vig: lampMode ? 0.46 : 0.3 }, o.palette) });
};
function _drape(ctx, x, y, w, h, col, t, seed) {
  const folds = 5;
  for (let i = 0; i < folds; i++) {
    const fx = x + i * (w / folds);
    const sway = sfbm1(t * 0.4 + i, seed) * 6;
    const g = ctx.createLinearGradient(fx, 0, fx + w / folds, 0);
    g.addColorStop(0, _hx(col, -0.3)); g.addColorStop(0.5, col); g.addColorStop(1, _hx(col, -0.3));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(fx, y); ctx.lineTo(fx + w / folds, y);
    ctx.quadraticCurveTo(fx + w / folds + sway, y + h * 0.6, fx + w / folds * 0.5 + sway, y + h);
    ctx.quadraticCurveTo(fx - 4 + sway, y + h * 0.6, fx, y); ctx.closePath(); ctx.fill();
  }
  goldLine(ctx, x, y + 2, x + w, y + 2, 4);
}
function _lowSeat(ctx, cx, cy, s) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  // wooden platform
  ctx.fillStyle = '#5c3316'; ctx.fillRect(-200, -20, 400, 60);
  ctx.fillStyle = '#4a2810'; ctx.fillRect(-220, 30, 440, 20);
  goldLine(ctx, -200, -18, 200, -18, 3);
  // legs
  ctx.fillStyle = '#4a2810';
  for (const lx of [-180, 180]) ctx.fillRect(lx - 8, 40, 16, 30);
  // bolster cushions
  ctx.fillStyle = '#8c1f28';
  ctx.beginPath(); ctx.ellipse(-120, -30, 70, 26, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c9a24a';
  ctx.beginPath(); ctx.ellipse(-120, -30, 12, 26, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#3a2a6a';
  ctx.beginPath(); ctx.moveTo(-40, -30); ctx.quadraticCurveTo(60, -60, 160, -30); ctx.quadraticCurveTo(60, -20, -40, -22); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════
//  mountain — Himalayan vista: fading ridge layers, snow caps, deodars,
//  drifting clouds.
// ═══════════════════════════════════════════════════════════════════
SETS.mountain = function (ctx, cam, t, o) {
  o = o || {};
  const tod = o.timeOfDay || 'day';
  const T = _tod(o);
  vgrad(ctx, 0, 0, W, H, tod === 'day'
    ? [[0, '#4a78b0'], [0.5, '#84a8c8'], [1, '#cfd8d0']]
    : T.sky);

  camLayer(ctx, cam, 0.06, (c) => {
    if (T.star > 0.02) _stars(c, t, T.star * 0.8, 60);
    if (tod === 'night') _crescent(c, 1560, 150, 42);
    else _sunDisc(c, T, 46);
  });
  // drifting clouds high up
  camLayer(ctx, cam, 0.1, (c) => {
    for (let i = 0; i < 3; i++) {
      const cx = ((t * 6 + i * 780) % (W + 1200)) - 560;
      _cloud(c, cx, 170 + (i % 2) * 90, 720, 68, tod === 'night' ? '#8a92b4' : '#ffffff', tod === 'night' ? 0.4 : 0.62);
    }
  });
  // farthest ridge — palest (atmospheric fade)
  camLayer(ctx, cam, 0.12, (c) => {
    _ridge(c, 560, 260, 760, mixC(tod === 'night' ? '#2a3358' : '#9fb0cc', T.sky[0][1], 0.3), 11);
    _snowCap(c, 560, 260, 470, 11);
  });
  camLayer(ctx, cam, 0.2, (c) => {
    _ridge(c, 640, 300, 820, tod === 'night' ? '#26305a' : '#8296b6', 23);
    _snowCap(c, 640, 300, 540, 23);
  });
  // mid ridge (darker) with deodars along the crest
  camLayer(ctx, cam, 0.34, (c) => {
    _ridge(c, 760, 300, 900, tod === 'night' ? '#1f2848' : '#5f748f', 31);
    _snowCap(c, 760, 300, 640, 31);
    for (let i = 0; i < 9; i++) { const x = 120 + i * 220 + snoise1(i * 3, 4) * 40; _conifer(c, x, 770, 120, 50, tod === 'night' ? '#141a30' : '#2e4630'); }
  });
  // near ridge with slope + deodar cluster
  camLayer(ctx, cam, 0.6, (c) => {
    _ridge(c, 940, 220, 1120, tod === 'night' ? '#182038' : '#3f5236', 44);
    for (let i = 0; i < 12; i++) { const x = 60 + i * 170 + snoise1(i * 5, 6) * 40; _conifer(c, x, 960, 160 + hash1(i) * 60, 66, tod === 'night' ? '#101828' : '#243a26'); }
  });
  // foreground ledge
  camLayer(ctx, cam, 0.9, (c) => {
    vgrad(c, -100, 980, W + 200, H - 880, [[0, tod === 'night' ? '#20283a' : '#4a5540'], [1, '#181c14']]);
    // snow patches
    c.fillStyle = 'rgba(240,246,255,0.7)';
    for (let i = 0; i < 8; i++) { const sx = hash1(i * 5) * W; c.beginPath(); c.ellipse(sx, 1000 + hash1(i * 3) * 50, 90, 20, 0, 0, TAU); c.fill(); }
    drawRock(c, { x: 300, y: 1050, s: 0.9, seed: 3, tone: '#6a6e72' });
    drawRock(c, { x: 1600, y: 1060, s: 1.0, seed: 7, tone: '#5e646a' });
  });
  camLayer(ctx, cam, 1.0, (c) => { const bi = _makeBands(1046, 90, o); if (o.actors) o.actors(c, bi); });
  camLayer(ctx, cam, 1.3, (c) => { if (o.fg !== false) _conifer(c, 1840, H + 40, 640, 200, tod === 'night' ? '#0c1220' : '#1a2c1a'); });
  if (o.particles !== false && (tod === 'night' || tod === 'dawn')) camLayer(ctx, cam, 1.1, c => { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 40; i++) { const sx = (hash1(i * 3) * W + t * 12) % W; const sy = (hash1(i * 7) * H + t * 20) % H; c.fillStyle = 'rgba(240,246,255,0.5)'; c.fillRect(sx, sy, 2, 2); } c.restore(); });
  _grade(ctx, o);
};
