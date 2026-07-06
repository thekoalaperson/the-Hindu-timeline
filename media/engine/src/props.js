// ── props.js ── the environment prop & fauna library (Agent B).
// Self-sufficient replacement for the prop half of the legacy world.js:
// every prop is reproduced here so a story can load props.js instead of
// world.js. Pose/acting helpers (walkPose, posemix) and the frozen figure
// API (drawFigure, drawSeated) are NOT defined here — they belong to
// people.js / acting.js (Agent A). crowdStrip calls the global `drawSeated`
// at runtime; sets.js calls global `drawFigure`/`drawSeated`.
//
// Depends on globals from core.js (W,H,TAU,lerp,clamp,rgba,shade,hexRGB,
// hash1,noise1,fbm1,snoise1,sfbm1,mulberry,smoothPath,cached) and paint.js
// (GOLD*,goldLine,softDisc,glowAdd,vgrad,flame,embers,smoke,garlandStrand,
// beadArc,contactShadow) and people.js (limb,jointPatch,drawHand).
//
// PUBLIC API
//   Ported props (exact names/signatures from world.js):
//     drawGreatBow, drawArrow, drawYantra, drawGoldFish, drawBasin,
//     drawLampStand, drawTorana, drawBanner, archPath, drawPillar,
//     drawSkyline, crowdStrip
//   New props (opts-object signature (ctx, {x,y,s,t,seed,...})):
//     drawCart, drawWell, drawThrone, treeBanyan, treePalm, treeAshoka,
//     drawRock, potStack, shrine, drawHut
//   Fauna (ctx, {x,y,s,facing,t,seed,gait:'idle'|'walk'|'run', ornament?}):
//     drawHorse, drawElephant, drawDeer, drawBird, drawCow
'use strict';

// ═══════════════════════════════════════════════════════════════════
//  PORTED PROPS  (verbatim from world.js — parity guaranteed)
// ═══════════════════════════════════════════════════════════════════

// the great bow, unstrung/strung; draws centred at grip, vertical, tips curving +x
function drawGreatBow(ctx, x, y, s, flex, strung, stringPullY) {
  // flex 0..1 (0 relaxed), stringPullY: nock point offset (for aiming draw)
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  const bend = 34 + flex * 26;
  const g = ctx.createLinearGradient(-8, -150, 8, 150);
  g.addColorStop(0, '#5c1f14'); g.addColorStop(0.5, '#a04a1e'); g.addColorStop(1, '#5c1f14');
  ctx.strokeStyle = g;
  ctx.lineWidth = 13; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-2, -150);
  ctx.quadraticCurveTo(bend, -70, bend * 0.8, 0);
  ctx.quadraticCurveTo(bend, 70, -2, 150);
  ctx.stroke();
  // gold wraps
  ctx.strokeStyle = GOLD; ctx.lineWidth = 4;
  for (const yy of [-104, 0, 104]) {
    const bx = yy === 0 ? bend * 0.8 : bend * 0.62;
    ctx.beginPath(); ctx.moveTo(bx - 8 + (yy === 0 ? 2 : 0), yy - 5); ctx.lineTo(bx + 8, yy + 5); ctx.stroke();
  }
  // recurve tips
  ctx.strokeStyle = '#3f150c'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(-2, -150); ctx.quadraticCurveTo(-14, -160, -10, -172); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-2, 150); ctx.quadraticCurveTo(-14, 160, -10, 172); ctx.stroke();
  if (strung) {
    ctx.strokeStyle = 'rgba(240,230,205,0.95)'; ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-8, -166);
    if (stringPullY) ctx.lineTo(stringPullY[0], stringPullY[1]);
    else ctx.lineTo(-8, 0);
    ctx.lineTo(-8, 166);
    ctx.stroke();
  }
  ctx.restore();
}

function drawArrow(ctx, x, y, ang, s, inFlight) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  if (inFlight) { // motion streak
    const g = ctx.createLinearGradient(-90, 0, 0, 0);
    g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(1, 'rgba(255,240,200,0.55)');
    ctx.strokeStyle = g; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(-90, 0); ctx.lineTo(-6, 0); ctx.stroke();
  }
  ctx.strokeStyle = '#e8d9b0'; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(52, 0); ctx.stroke();
  // head
  ctx.fillStyle = '#d9dee4';
  ctx.beginPath(); ctx.moveTo(66, 0); ctx.lineTo(50, -4.5); ctx.lineTo(50, 4.5); ctx.closePath(); ctx.fill();
  // fletching
  ctx.fillStyle = '#b3452c';
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-60, 0); ctx.lineTo(-74, 6 * k); ctx.lineTo(-52, 2.5 * k); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// matsya-yantra: pole + spinning wheel + golden fish above; th = wheel angle
function drawYantra(ctx, x, groundY, s, t, opts) {
  const o = opts || {};
  const H = 560;                 // pole height in local units
  const th = t * (o.speed === undefined ? 1.9 : o.speed);
  ctx.save();
  ctx.translate(x, groundY); ctx.scale(s, s);
  // pole
  const pg = ctx.createLinearGradient(-5, 0, 7, 0);
  pg.addColorStop(0, '#4a2410'); pg.addColorStop(0.5, '#8a5a2c'); pg.addColorStop(1, '#4a2410');
  ctx.fillStyle = pg;
  ctx.fillRect(-5, -H, 11, H);
  goldLine(ctx, -6, -H * 0.55, 7, -H * 0.55, 4);
  goldLine(ctx, -6, -H * 0.18, 7, -H * 0.18, 4);
  // wheel: horizontal disc in perspective (ellipse), spokes rotating
  const wy = -H + 26;
  ctx.save();
  ctx.translate(0.5, wy);
  ctx.fillStyle = 'rgba(60,30,10,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 0, 86, 21, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#7c4a1e'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.ellipse(0, 0, 84, 20, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.ellipse(0, 0, 84, 20, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(150,90,40,0.95)'; ctx.lineWidth = 4;
  for (let i = 0; i < 8; i++) {
    const a = th + i * TAU / 8;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 84, Math.sin(a) * 20);
    ctx.stroke();
  }
  ctx.restore();
  // fish: circles the axle above the wheel
  const fa = th * 0.7;                       // fish orbit angle
  const fz = Math.sin(fa);                   // fz: toward viewer
  if (!o.noFish) {
    const fx = Math.cos(fa) * 58;
    const fy = wy - 44 + fz * 4;
    const fscale = 1 + fz * 0.10;
    const flip = Math.cos(fa) >= 0 ? 1 : -1;   // face travel direction
    ctx.save();
    ctx.translate(fx, fy);
    ctx.scale(fscale, fscale);
    ctx.rotate(o.pierced ? 0.9 : Math.sin(fa) * -0.12);
    drawGoldFish(ctx, 0, 0, 1.15, flip, t, o.pierced);
    ctx.restore();
  }
  // axle
  ctx.fillStyle = '#3a1c0a'; ctx.fillRect(-3.4, wy - 48, 8, 48);
  ctx.restore();
  return { fishWorld: [x + (Math.cos(fa) * 58) * s, groundY + (wy - 44 + fz * 4) * s], wheelY: groundY + wy * s };
}

function drawGoldFish(ctx, x, y, s, flip, t, pierced) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s * (flip || 1), s);
  const g = ctx.createLinearGradient(0, -14, 0, 16);
  g.addColorStop(0, '#ffe08a'); g.addColorStop(0.5, '#e8a825'); g.addColorStop(1, '#9a6410');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#5c3a08'; ctx.lineWidth = 1.6;
  // body
  ctx.beginPath();
  ctx.moveTo(-34, 0);
  ctx.quadraticCurveTo(-12, -15, 12, -10);
  ctx.quadraticCurveTo(30, -5, 34, 0);
  ctx.quadraticCurveTo(30, 6, 12, 11);
  ctx.quadraticCurveTo(-12, 16, -34, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // tail (swings)
  const tw = Math.sin((t || 0) * 6) * 4;
  ctx.beginPath();
  ctx.moveTo(-32, -1);
  ctx.quadraticCurveTo(-46, -12 + tw, -52, -8 + tw);
  ctx.quadraticCurveTo(-44, 0, -52, 9 + tw * 0.6);
  ctx.quadraticCurveTo(-45, 12 + tw * 0.4, -32, 2);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // fins
  ctx.beginPath(); ctx.moveTo(2, -10); ctx.quadraticCurveTo(8, -20, 16, -16); ctx.quadraticCurveTo(10, -10, 8, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
  // scales
  ctx.strokeStyle = 'rgba(122,75,18,0.55)'; ctx.lineWidth = 1.1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.arc(-8 + i * 9, 1, 7, -1.1, 1.1); ctx.stroke();
  }
  // eye — THE eye
  ctx.fillStyle = '#fff8e8'; ctx.beginPath(); ctx.arc(24, -2, 4.4, 0, TAU); ctx.fill();
  ctx.fillStyle = '#221005'; ctx.beginPath(); ctx.arc(25, -2, 2.6, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#5c3a08'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(24, -2, 4.4, 0, TAU); ctx.stroke();
  if (pierced) { // arrow through the eye
    drawArrow(ctx, 25, -2, -1.25, 0.8, false);
  }
  ctx.restore();
}

// water/oil basin with the trembling reflection
function drawBasin(ctx, x, y, s, t, reflFn) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  // rim
  ctx.fillStyle = '#6e4a22';
  ctx.beginPath(); ctx.ellipse(0, 0, 130, 34, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = GOLD_D; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(0, 0, 130, 34, 0, 0, TAU); ctx.stroke();
  // water
  const g = ctx.createRadialGradient(0, 2, 8, 0, 2, 118);
  g.addColorStop(0, '#2c3f52'); g.addColorStop(0.7, '#1c2b3a'); g.addColorStop(1, '#14202c');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 2, 116, 27, 0, 0, TAU); ctx.fill();
  // reflection content (clipped, wobbled)
  if (reflFn) {
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, 2, 116, 27, 0, 0, TAU); ctx.clip();
    ctx.translate(sfbm1(t * 1.7, 91) * 3, 2 + sfbm1(t * 2.1, 17) * 1.6);
    ctx.scale(1, 0.42);
    ctx.globalAlpha = 0.55;
    reflFn(ctx);
    ctx.restore();
  }
  // ripple rings
  ctx.strokeStyle = 'rgba(220,235,255,0.20)';
  for (let i = 0; i < 3; i++) {
    const ph = ((t * 0.24 + i * 0.33) % 1);
    ctx.lineWidth = 1.6 * (1 - ph);
    ctx.beginPath(); ctx.ellipse(0, 2, 20 + ph * 92, (20 + ph * 92) * 0.23, 0, 0, TAU); ctx.stroke();
  }
  // glint
  ctx.fillStyle = 'rgba(255,244,214,0.12)';
  ctx.beginPath(); ctx.ellipse(-30, -2, 34, 7, -0.2, 0, TAU); ctx.fill();
  ctx.restore();
}

// standing oil-lamp (diya on a pillar stand)
function drawLampStand(ctx, x, y, s, t, seed) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  const g = ctx.createLinearGradient(-6, -180, 8, 0);
  g.addColorStop(0, '#7c5a1e'); g.addColorStop(1, '#4a3208');
  ctx.fillStyle = g;
  ctx.fillRect(-5, -170, 10, 170);
  ctx.beginPath(); ctx.ellipse(0, 0, 26, 8, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -170, 24, 8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#8a6428';
  ctx.beginPath(); ctx.ellipse(0, -176, 16, 6, 0, 0, TAU); ctx.fill();
  flame(ctx, 0, -178, 15, t, seed, 0.9);
  glowAdd(ctx, 0, -184, 70, 'rgba(255,170,60,0.5)', 0.55);
  ctx.restore();
}

// hanging torana garland across (x0..x1)
function drawTorana(ctx, x0, x1, y, t, seed) {
  const n = Math.max(3, Math.round((x1 - x0) / 300));
  for (let i = 0; i < n; i++) {
    const ax = lerp(x0, x1, i / n), bx = lerp(x0, x1, (i + 1) / n);
    garlandStrand(ctx, ax, y, bx, y, 52, t, seed + i, 1.0);
  }
  // mango-leaf clusters at knots
  ctx.fillStyle = '#3f6e2e';
  for (let i = 0; i <= n; i++) {
    const ax = lerp(x0, x1, i / n);
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.ellipse(ax + k * 7, y + 12 + Math.abs(k) * 4, 5, 12, k * 0.5, 0, TAU);
      ctx.fill();
    }
  }
}

// banner hanging from a point
function drawBanner(ctx, x, y, w, h, color, t, seed) {
  const fl = sfbm1(t * 0.7, seed);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x + w / 2, y);
  ctx.quadraticCurveTo(x + w / 2 + fl * 8, y + h * 0.6, x + w / 2 - w * 0.18 + fl * 12, y + h);
  ctx.lineTo(x, y + h * 0.82 + fl * 6);
  ctx.lineTo(x - w / 2 + w * 0.18 + fl * 10, y + h);
  ctx.quadraticCurveTo(x - w / 2 + fl * 6, y + h * 0.6, x - w / 2, y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba('#241005', 0.35); ctx.lineWidth = 2; ctx.stroke();
  goldLine(ctx, x - w / 2, y + 2, x + w / 2, y + 2, 4);
}

// scalloped arch between pillars (drawn as negative space frame)
function archPath(ctx, cx, topY, w, h) {
  const n = 7; // cusps
  ctx.moveTo(cx - w / 2, topY + h);
  ctx.lineTo(cx - w / 2, topY + h * 0.42);
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI - i * Math.PI / n;
    const a1 = Math.PI - (i + 1) * Math.PI / n;
    const mx = cx + Math.cos((a0 + a1) / 2) * w / 2 * 1.06;
    const my = topY + h * 0.42 - Math.sin((a0 + a1) / 2) * h * 0.5;
    ctx.quadraticCurveTo(mx, my, cx + Math.cos(a1) * w / 2, topY + h * 0.42 - Math.sin(a1) * h * 0.42);
  }
  ctx.lineTo(cx + w / 2, topY + h);
  ctx.closePath();
}

// ornate pillar
function drawPillar(ctx, x, groundY, w, h, hue) {
  const c = hue || '#8a5a30';
  ctx.save();
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, shade(c, -0.35)); g.addColorStop(0.4, shade(c, 0.12)); g.addColorStop(1, shade(c, -0.25));
  ctx.fillStyle = g;
  ctx.fillRect(x - w / 2, groundY - h, w, h);
  // capital & base
  ctx.fillStyle = shade(c, -0.15);
  ctx.fillRect(x - w * 0.72, groundY - h, w * 1.44, h * 0.06);
  ctx.fillRect(x - w * 0.72, groundY - h * 0.05, w * 1.44, h * 0.05);
  ctx.fillStyle = shade(c, 0.05);
  ctx.fillRect(x - w * 0.6, groundY - h * 0.985, w * 1.2, h * 0.025);
  // carved bands
  ctx.strokeStyle = rgba('#3a2008', 0.5); ctx.lineWidth = 2;
  for (const u of [0.3, 0.32, 0.62, 0.64]) {
    ctx.beginPath(); ctx.moveTo(x - w / 2, groundY - h * u); ctx.lineTo(x + w / 2, groundY - h * u); ctx.stroke();
  }
  goldLine(ctx, x - w / 2, groundY - h * 0.31, x + w / 2, groundY - h * 0.31, 3);
  ctx.restore();
}

// distant city skyline (shikhara towers) silhouette
function drawSkyline(ctx, y, color, seed) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-100, y);
  let x = -100;
  const rnd = mulberry(seed);
  while (x < W + 100) {
    const bw = 90 + rnd() * 160;
    const bh = 40 + rnd() * 130;
    ctx.lineTo(x, y - bh * 0.55);
    // dome or shikhara
    if (rnd() < 0.45) {
      ctx.quadraticCurveTo(x + bw * 0.5, y - bh * 1.5, x + bw, y - bh * 0.55);
    } else {
      ctx.lineTo(x + bw * 0.38, y - bh * 0.55);
      ctx.lineTo(x + bw * 0.5, y - bh * 1.35);
      ctx.lineTo(x + bw * 0.62, y - bh * 0.55);
      ctx.lineTo(x + bw, y - bh * 0.55);
    }
    x += bw;
  }
  ctx.lineTo(W + 100, y); ctx.closePath(); ctx.fill();
}

// crowd of seated nobles/brahmins — cached to an offscreen strip.
// Calls the GLOBAL drawSeated (frozen API from people.js/world.js).
// Anti-twinning: per-figure sampling of height (±8%), build, skin tone,
// garment/headgear (de-twinned so no two neighbours share both), seated
// lean + head-turn/gaze micro-variation, and uneven spacing (±18px).
function crowdStrip(key, n, kindFn, scale) {
  const cw = Math.round(n * 132 * scale + 60), ch = Math.round(346 * scale);
  return cached(key, cw, ch, (g, w, h) => {
    // 1) sample styles, then de-twin adjacent garment+headgear
    const styles = [];
    for (let i = 0; i < n; i++) styles.push(Object.assign({}, kindFn(i)));
    for (let i = 1; i < n; i++) {
      const a = styles[i - 1], b = styles[i];
      if (a.clothMain === b.clothMain && (a.crown || '') === (b.crown || '')) {
        b.clothMain = _hx(b.clothMain, hash1(i * 3) > 0.5 ? 0.17 : -0.17);
        b.crown = b.crown === 'mukut' ? 'turban' : 'mukut';
        if (b.turbanColor) b.turbanColor = _hx(b.turbanColor, -0.12);
      }
    }
    // 2) place with per-figure jitter
    let cx = 30 * scale;
    for (let i = 0; i < n; i++) {
      const st = styles[i];
      st.build = (st.build || 1) * (0.93 + hash1(i * 13) * 0.13);            // build var
      const sj = (hash1(i * 29) - 0.5) * 0.1;
      st.skin = _hx(st.skin, sj);                                            // skin micro-shift
      if (st.skinShade) st.skinShade = _hx(st.skinShade, sj);
      const s = scale * (0.92 + hash1(i * 7) * 0.16);                        // height ±8%
      const gap = (108 + hash1(i * 17) * 40) * scale;                        // uneven spacing
      cx += gap * 0.5;
      const px = cx + snoise1(i * 7.7, 3) * 18 * scale;                      // ±18px jitter
      const py = h - 6 * scale - hash1(i * 11) * 12 * scale;
      const lean = (hash1(i * 5) - 0.5) * 0.1;                               // slight body lean
      g.save();
      g.translate(px, py); g.rotate(lean);
      drawSeated(g, {
        x: 0, y: 0, s, facing: 1, style: st, t: hash1(i) * 9, seed: i * 17 + 2,
        face: {
          turn: 0.16 + hash1(i * 3) * 0.34, smile: hash1(i * 9) * 0.16,
          gaze: { x: -0.45 + hash1(i * 2) * 0.35, y: 0.02 + hash1(i * 4) * 0.16 },
        },
      });
      g.restore();
      cx += gap * 0.5;
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
//  SHARED HELPERS for new props & fauna
// ═══════════════════════════════════════════════════════════════════

const _INK = 'rgba(36,16,5,0.55)';      // kohl outline for props/fauna
const _INKS = 'rgba(36,16,5,0.4)';      // softer outline

// hex darken(<0)/lighten(>0) -> hex (limb()'s `dark` arg must be hex).
function _hx(hex, amt) {
  const c = hexRGB(hex), f = amt < 0 ? 0 : 255, k = Math.abs(amt);
  const to = v => { const n = clamp(Math.round(lerp(v, f, k)), 0, 255); return n.toString(16).padStart(2, '0'); };
  return '#' + to(c[0]) + to(c[1]) + to(c[2]);
}

// ── FOLIAGE ── flat scalloped lobes in low-saturation, tod-graded greens.
// The canopy reads as overlapping leaf-clumps with a thin ink line per lobe
// and sparse leaf-tick strokes — never glossy bubbles. Colour respects the
// scene's time-of-day so night reads near-silhouette, dusk warm-olive, etc.
function _foliage(tod) {
  switch (tod) {
    case 'night': return { dark: '#101d24', mid: '#182b2f', lite: '#22383a', ink: 'rgba(8,16,18,0.6)', tick: 'rgba(90,120,120,0.26)' };
    case 'dusk':  return { dark: '#2a3220', mid: '#3f4227', lite: '#565231', ink: 'rgba(22,18,8,0.55)', tick: 'rgba(150,138,78,0.28)' };
    case 'dawn':  return { dark: '#3d483a', mid: '#525d4c', lite: '#697263', ink: 'rgba(30,36,30,0.42)', tick: 'rgba(158,170,155,0.28)' };
    default:      return { dark: '#31432a', mid: '#465a34', lite: '#5a6f42', ink: 'rgba(22,28,15,0.5)', tick: 'rgba(120,145,88,0.30)' }; // day — calm, muted
  }
}
// one flat foliage lobe: a scalloped closed blob (vertices bulge out, chord
// midpoints tuck in) filled flat, with a thin ink outline.
function _foliageLobe(ctx, cx, cy, rx, ry, seed, col, ink) {
  const N = clamp(Math.round((rx + ry) / 34), 7, 14);
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = i / N * TAU;
    const jt = 1 + snoise1(i * 1.7 + seed, seed) * 0.12;      // per-scallop wobble
    pts.push([cx + Math.cos(a) * rx * jt, cy + Math.sin(a) * ry * jt]);
  }
  const mid = i => [(pts[i][0] + pts[(i + 1) % N][0]) / 2, (pts[i][1] + pts[(i + 1) % N][1]) / 2];
  const bulge = 1.16;
  ctx.beginPath();
  let m = mid(N - 1); ctx.moveTo(m[0], m[1]);
  for (let i = 0; i < N; i++) {
    const cxp = cx + (pts[i][0] - cx) * bulge, cyp = cy + (pts[i][1] - cy) * bulge;
    m = mid(i); ctx.quadraticCurveTo(cxp, cyp, m[0], m[1]);
  }
  ctx.closePath();
  ctx.fillStyle = col; ctx.fill();
  if (ink) { ctx.strokeStyle = ink; ctx.lineWidth = 1.8; ctx.stroke(); }
}
// sparse short leaf-tick strokes over a canopy region (replaces glossy stipple)
function _leafTicks(ctx, cx, cy, rx, ry, n, seed, col, t) {
  ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = hash1(seed + i) * TAU, rr = 0.3 + hash1(seed * 3 + i) * 0.66;
    const lx = cx + Math.cos(a) * rx * rr, ly = cy + Math.sin(a) * ry * rr;
    const wob = sfbm1(t * 0.5 + i, seed) * 3;
    const ang = -1.15 + hash1(seed * 5 + i) * 0.7;            // mostly upward ticks
    ctx.beginPath(); ctx.moveTo(lx + wob, ly); ctx.lineTo(lx + wob + Math.cos(ang) * 5.5, ly + Math.sin(ang) * 5.5); ctx.stroke();
  }
}

// ═══════════════════════════════════════════════════════════════════
//  NEW STATIC PROPS
// ═══════════════════════════════════════════════════════════════════

// wooden bullock cart, wheels + bed + shafts, optional load (pots/hay/none)
// o: {x, y(ground), s, t, seed, load:'hay'|'pots'|null, facing}
function drawCart(ctx, o) {
  const x = o.x, y = o.y, s = o.s === undefined ? 1 : o.s, t = o.t || 0, seed = o.seed || 1;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s * (o.facing || 1), s);
  const wood = '#7c4a1e', woodD = _hx(wood, -0.4), woodL = _hx(wood, 0.18);
  const bedY = -120, bedW = 320;
  // rear shaft to ground (yoke pole out the front +x)
  ctx.strokeStyle = wood; ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(150, bedY + 30); ctx.lineTo(360, bedY - 8); ctx.stroke();
  ctx.strokeStyle = woodD; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(150, bedY + 34); ctx.lineTo(360, bedY - 4); ctx.stroke();
  // yoke bar
  ctx.strokeStyle = wood; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(360, bedY - 30); ctx.lineTo(360, bedY + 18); ctx.stroke();
  // cart bed (plank box)
  const bg = ctx.createLinearGradient(0, bedY - 40, 0, bedY + 40);
  bg.addColorStop(0, woodL); bg.addColorStop(1, woodD);
  ctx.fillStyle = bg;
  ctx.fillRect(-bedW / 2, bedY - 26, bedW, 52);
  ctx.strokeStyle = _INK; ctx.lineWidth = 3; ctx.strokeRect(-bedW / 2, bedY - 26, bedW, 52);
  // plank lines
  ctx.strokeStyle = woodD; ctx.lineWidth = 2;
  for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-bedW / 2 + i * bedW / 6, bedY - 26); ctx.lineTo(-bedW / 2 + i * bedW / 6, bedY + 26); ctx.stroke(); }
  // side rail
  ctx.strokeStyle = wood; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(-bedW / 2 + 10, bedY - 26); ctx.lineTo(-bedW / 2 + 10, bedY - 66);
  ctx.lineTo(bedW / 2 - 40, bedY - 66); ctx.stroke();
  // load
  if (o.load === 'hay') {
    const hg = ctx.createLinearGradient(0, bedY - 150, 0, bedY - 20);
    hg.addColorStop(0, '#d8b24a'); hg.addColorStop(1, '#9a6e22');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(-bedW / 2 + 4, bedY - 24);
    ctx.quadraticCurveTo(-bedW / 2 - 10, bedY - 120, 0, bedY - 150);
    ctx.quadraticCurveTo(bedW / 2 + 6, bedY - 120, bedW / 2 - 30, bedY - 24);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(90,60,14,0.5)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 24; i++) {
      const hx = -bedW / 2 + hash1(seed + i) * bedW * 0.9;
      const hh = bedY - 30 - hash1(seed * 3 + i) * 110;
      ctx.beginPath(); ctx.moveTo(hx, hh); ctx.lineTo(hx + snoise1(i, seed) * 8, hh + 14); ctx.stroke();
    }
  } else if (o.load === 'pots') {
    for (let i = 0; i < 4; i++) {
      const px = -bedW / 2 + 46 + i * 66, ph = 46 - (i % 2) * 6;
      ctx.fillStyle = _hx('#a4552a', -(i % 2) * 0.08);
      ctx.beginPath(); ctx.ellipse(px, bedY - 26 - ph / 2, 26, ph / 2, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = _INKS; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#6e3a1a';
      ctx.beginPath(); ctx.ellipse(px, bedY - 26 - ph, 11, 4, 0, 0, TAU); ctx.fill();
    }
  }
  // two wheels (near darker, far lighter for depth); slow roll if moving
  const spin = t * 0.6;
  _cartWheel(ctx, -96, -6, 96, wood, woodD, spin, 0.85);
  _cartWheel(ctx, 96, -6, 96, wood, woodD, spin, 1.0);
  ctx.restore();
}
function _cartWheel(ctx, cx, cy, r, wood, woodD, spin, shadeK) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = 'rgba(20,8,2,0.22)';
  ctx.beginPath(); ctx.ellipse(0, r * 0.02, r * 0.98, r * 0.98, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = _hx(wood, (shadeK - 1) * 0.4); ctx.lineWidth = 13;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  ctx.strokeStyle = woodD; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  // spokes
  ctx.strokeStyle = _hx(wood, 0.05 + (shadeK - 1) * 0.3); ctx.lineWidth = 7;
  for (let i = 0; i < 8; i++) {
    const a = spin + i * TAU / 8;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * (r - 8), Math.sin(a) * (r - 8)); ctx.stroke();
  }
  // hub
  ctx.fillStyle = _hx(wood, -0.2); ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

// village stone well with wooden post + pulley + hanging rope/bucket
// o: {x, y(ground), s, t, seed}
function drawWell(ctx, o) {
  const x = o.x, y = o.y, s = o.s === undefined ? 1 : o.s, t = o.t || 0;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  const stone = '#9a8a6e';
  const rimW = 150, rimH = 200;
  // well drum (stone cylinder)
  const bg = ctx.createLinearGradient(-rimW, 0, rimW, 0);
  bg.addColorStop(0, _hx(stone, -0.35)); bg.addColorStop(0.45, stone); bg.addColorStop(1, _hx(stone, -0.22));
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(-rimW, -rimH); ctx.lineTo(-rimW, 0);
  ctx.ellipse(0, 0, rimW, 34, 0, Math.PI, 0, true);
  ctx.lineTo(rimW, -rimH);
  ctx.ellipse(0, -rimH, rimW, 30, 0, 0, Math.PI, false);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 3; ctx.stroke();
  // stone courses
  ctx.strokeStyle = 'rgba(40,26,10,0.4)'; ctx.lineWidth = 2;
  for (let r = 0; r < 4; r++) {
    const yy = -rimH + 40 + r * 42;
    ctx.beginPath(); ctx.ellipse(0, yy, rimW, 30 - r, 0, 0.05, Math.PI - 0.05); ctx.stroke();
    for (let b = 0; b < 7; b++) {
      const a = lerp(0.2, Math.PI - 0.2, b / 6);
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * rimW, yy + Math.sin(a) * 30); ctx.lineTo(Math.cos(a) * rimW, yy - 42 + Math.sin(a) * 30); ctx.stroke();
    }
  }
  // top rim (mouth) with dark water
  ctx.fillStyle = '#15202a';
  ctx.beginPath(); ctx.ellipse(0, -rimH, rimW - 16, 24, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = _hx(stone, 0.1); ctx.lineWidth = 6;
  ctx.beginPath(); ctx.ellipse(0, -rimH, rimW - 8, 28, 0, 0, TAU); ctx.stroke();
  glowAdd(ctx, 40, -rimH, 40, 'rgba(120,160,190,0.3)', 0.5);
  // wooden A-frame + pulley
  const wood = '#6e451e';
  ctx.strokeStyle = wood; ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-rimW + 30, -rimH - 4); ctx.lineTo(-30, -rimH - 250); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rimW - 30, -rimH - 4); ctx.lineTo(30, -rimH - 250); ctx.stroke();
  ctx.strokeStyle = wood; ctx.lineWidth = 14;
  ctx.beginPath(); ctx.moveTo(-46, -rimH - 246); ctx.lineTo(46, -rimH - 246); ctx.stroke();
  // pulley wheel
  ctx.fillStyle = _hx(wood, 0.1); ctx.beginPath(); ctx.arc(0, -rimH - 232, 20, 0, TAU); ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = _hx(wood, -0.3); ctx.beginPath(); ctx.arc(0, -rimH - 232, 5, 0, TAU); ctx.fill();
  // rope + bucket (gentle sway)
  const sway = sfbm1(t * 0.6, 5) * 6;
  ctx.strokeStyle = '#caa66a'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(-16, -rimH - 232); ctx.lineTo(-16, -rimH - 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(18, -rimH - 232); ctx.lineTo(18 + sway, -rimH - 80); ctx.stroke();
  // hanging bucket
  ctx.save(); ctx.translate(18 + sway, -rimH - 72);
  ctx.fillStyle = '#5a3a18';
  ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.lineTo(12, 30); ctx.lineTo(-12, 30); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = '#caa66a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 16, Math.PI, TAU); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// standalone ornate throne (empty) — gilded back + cushion + platform
// o: {x, y(ground), s, seed, cloth}
function drawThrone(ctx, o) {
  const x = o.x, y = o.y, s = o.s === undefined ? 1 : o.s;
  const cloth = o.cloth || '#7c1220';
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  // platform
  ctx.fillStyle = '#5c3316';
  ctx.fillRect(-150, -40, 300, 44);
  ctx.fillStyle = '#4a2810'; ctx.fillRect(-170, -12, 340, 20);
  goldLine(ctx, -150, -38, 150, -38, 4);
  // seat block
  const sg = ctx.createLinearGradient(0, -150, 0, -40);
  sg.addColorStop(0, '#8a5a2a'); sg.addColorStop(1, '#5c3316');
  ctx.fillStyle = sg; ctx.fillRect(-110, -150, 220, 110);
  ctx.strokeStyle = _INK; ctx.lineWidth = 3; ctx.strokeRect(-110, -150, 220, 110);
  // cushion
  ctx.fillStyle = cloth;
  ctx.beginPath(); ctx.moveTo(-104, -150);
  ctx.quadraticCurveTo(0, -168, 104, -150);
  ctx.quadraticCurveTo(110, -138, 104, -128);
  ctx.quadraticCurveTo(0, -144, -104, -128);
  ctx.quadraticCurveTo(-110, -138, -104, -150); ctx.closePath(); ctx.fill();
  goldLine(ctx, -100, -132, 100, -132, 3);
  // tall gilded back
  const back = ctx.createLinearGradient(-90, -420, 90, -150);
  back.addColorStop(0, GOLD_D); back.addColorStop(0.5, GOLD_L); back.addColorStop(1, GOLD_D);
  ctx.fillStyle = back;
  ctx.beginPath();
  ctx.moveTo(-90, -150);
  ctx.lineTo(-90, -360);
  ctx.quadraticCurveTo(-96, -430, 0, -452);      // left shoulder up to finial
  ctx.quadraticCurveTo(96, -430, 90, -360);
  ctx.lineTo(90, -150);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = _hx('#5c3a08', 0.0); ctx.lineWidth = 3; ctx.stroke();
  // inner panel
  ctx.fillStyle = cloth;
  ctx.beginPath();
  ctx.moveTo(-64, -160); ctx.lineTo(-64, -352);
  ctx.quadraticCurveTo(0, -410, 64, -352); ctx.lineTo(64, -160); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.stroke();
  // sun medallion
  const mg = ctx.createRadialGradient(0, -300, 2, 0, -300, 34);
  mg.addColorStop(0, GOLD_L); mg.addColorStop(1, GOLD_D);
  ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(0, -300, 26, 0, TAU); ctx.fill();
  ctx.strokeStyle = GOLD_D; ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 28, -300 + Math.sin(a) * 28); ctx.lineTo(Math.cos(a) * 38, -300 + Math.sin(a) * 38); ctx.stroke(); }
  // armrests as makara heads
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = GOLD_D;
    ctx.beginPath();
    ctx.moveTo(sgn * 90, -168); ctx.quadraticCurveTo(sgn * 150, -176, sgn * 150, -128);
    ctx.lineTo(sgn * 150, -40); ctx.lineTo(sgn * 118, -40); ctx.lineTo(sgn * 118, -150); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = _INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(sgn * 138, -166, 9, 0, TAU); ctx.fill();
  }
  // finial gem
  ctx.fillStyle = '#b41f2e'; ctx.beginPath(); ctx.arc(0, -452, 9, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-2, -455, 3, 0, TAU); ctx.fill();
  ctx.restore();
}

// ── TREES ── layered canopies with per-blob noise sway.
// treeBanyan: broad, many aerial-root trunks, dense rounded canopy.
// o: {x, y(ground), s, t, seed}
function treeBanyan(ctx, o) {
  const x = o.x, y = o.y, s = o.s === undefined ? 1 : o.s, t = o.t || 0, seed = o.seed || 1;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  const bark = '#5a3d22', barkD = _hx(bark, -0.4);
  const sway = sfbm1(t * 0.3, seed) * 0.02;
  // main trunk + buttress roots
  ctx.fillStyle = bark;
  ctx.beginPath();
  ctx.moveTo(-70, 0);
  ctx.quadraticCurveTo(-36, -140, -30, -260);
  ctx.lineTo(34, -260);
  ctx.quadraticCurveTo(40, -150, 78, 0);
  ctx.quadraticCurveTo(40, -18, 0, -12);
  ctx.quadraticCurveTo(-40, -18, -70, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.strokeStyle = 'rgba(30,18,6,0.5)'; ctx.lineWidth = 3;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 14, -30); ctx.quadraticCurveTo(i * 20, -150, i * 12, -256); ctx.stroke(); }
  // aerial prop roots (hanging strands to ground)
  ctx.strokeStyle = _hx(bark, -0.1); ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const rx = -230 + i * 78 + snoise1(i * 3, seed) * 20;
    const top = -430 - hash1(i * 5 + seed) * 60;
    ctx.beginPath(); ctx.moveTo(rx, top); ctx.quadraticCurveTo(rx + snoise1(i, seed) * 20, top / 2, rx + snoise1(i * 7, seed) * 26, -20 - hash1(i) * 60); ctx.stroke();
  }
  // canopy: overlapping flat foliage lobes (dark clumps low/back → muted-light
  // clumps up top), thin ink outline per lobe, sparse leaf-ticks. tod-graded.
  const cy = -430;
  const pal = _foliage(o.tod || 'day');
  // [cx, cyOffset from cy, rx, ry, toneIdx] — 0 dark(back/low) 1 mid 2 lite(top)
  const lobes = [
    [0, 46, 330, 148, 0], [-206, 54, 176, 118, 0], [208, 44, 186, 118, 0],   // lower/back
    [-118, -26, 208, 138, 1], [128, -18, 206, 138, 1], [4, 12, 244, 150, 1],  // mid mass
    [-66, -108, 148, 108, 2], [104, -96, 146, 108, 2], [-190, -22, 118, 94, 2], // upper lit
  ];
  const tones = [pal.dark, pal.mid, pal.lite];
  for (let i = 0; i < lobes.length; i++) {
    const [cx, dcy, rx, ry, tone] = lobes[i];
    const ccy = cy + dcy;
    const wob = sfbm1(t * 0.5 + i * 2, seed + i) * 7 + sway * ccy;
    _foliageLobe(ctx, cx + wob, ccy, rx, ry, seed + i * 4, tones[tone], pal.ink);
  }
  _leafTicks(ctx, sway * (cy - 40), cy - 40, 320, 155, 26, seed, pal.tick, t);
  ctx.restore();
}

// treePalm: tall bare trunk + arching fronds.
function treePalm(ctx, o) {
  const x = o.x, y = o.y, s = o.s === undefined ? 1 : o.s, t = o.t || 0, seed = o.seed || 1;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  const bark = '#7c5a34';
  const lean = snoise1(seed, 3) * 0.12;
  const topY = -520, topX = lean * 400;
  // curved trunk
  const tg = ctx.createLinearGradient(-24, 0, 24, 0);
  tg.addColorStop(0, _hx(bark, -0.35)); tg.addColorStop(0.5, bark); tg.addColorStop(1, _hx(bark, -0.2));
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(-24, 0);
  ctx.quadraticCurveTo(-14 + topX * 0.5, topY * 0.5, topX - 13, topY);
  ctx.lineTo(topX + 13, topY);
  ctx.quadraticCurveTo(14 + topX * 0.5, topY * 0.5, 24, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 2.5; ctx.stroke();
  // trunk rings
  ctx.strokeStyle = 'rgba(40,26,10,0.4)'; ctx.lineWidth = 2;
  for (let i = 1; i < 12; i++) {
    const u = i / 12, ry = topY * u, rxc = lerp(0, topX, u * u);
    ctx.beginPath(); ctx.moveTo(rxc - lerp(24, 13, u), ry); ctx.lineTo(rxc + lerp(24, 13, u), ry); ctx.stroke();
  }
  // crown base
  ctx.fillStyle = '#4a3a1e';
  ctx.beginPath(); ctx.ellipse(topX, topY, 20, 14, 0, 0, TAU); ctx.fill();
  // fronds radiating & arching, with wind sway (muted, tod-graded)
  const _pf = _foliage(o.tod || 'day'), dark = _pf.dark, mid = _pf.mid;
  for (let i = 0; i < 9; i++) {
    const base = -2.5 + i * (5.0 / 8);
    const wind = sfbm1(t * 0.7 + i * 1.3, seed + i) * 0.18;
    const a = base + wind - Math.PI / 2;
    const len = 180 + hash1(seed + i) * 70;
    const ex = topX + Math.cos(a) * len, ey = topY + Math.sin(a) * len + (a > -0.4 ? 60 : 0);
    const midx = topX + Math.cos(a) * len * 0.5, midy = topY + Math.sin(a) * len * 0.5 - 20;
    ctx.strokeStyle = i % 2 ? mid : dark; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(topX, topY); ctx.quadraticCurveTo(midx, midy, ex, ey); ctx.stroke();
    // leaflets
    ctx.strokeStyle = i % 2 ? _hx(mid, 0.08) : _hx(dark, 0.08); ctx.lineWidth = 2.2;
    for (let k = 3; k <= 9; k++) {
      const u = k / 10;
      const px = lerp(topX, ex, u) + (midx - lerp(topX, ex, u)) * 0.5;
      const py = lerp(topY, ey, u) + (midy - lerp(topY, ey, u)) * 0.5;
      const pa = a + Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(pa) * 22, py + Math.sin(pa) * 22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.cos(pa) * 22, py - Math.sin(pa) * 22); ctx.stroke();
    }
  }
  // coconuts
  ctx.fillStyle = '#5a3a1a';
  for (let i = 0; i < 4; i++) { const a = i * 1.3; ctx.beginPath(); ctx.arc(topX + Math.cos(a) * 16, topY + 6 + Math.abs(Math.sin(a)) * 10, 9, 0, TAU); ctx.fill(); }
  ctx.restore();
}

// treeAshoka: slender conical evergreen (Ashoka / deodar-like column).
function treeAshoka(ctx, o) {
  const x = o.x, y = o.y, s = o.s === undefined ? 1 : o.s, t = o.t || 0, seed = o.seed || 1;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  // short trunk
  ctx.fillStyle = '#5a3d22';
  ctx.fillRect(-12, -70, 24, 70);
  ctx.strokeStyle = _INK; ctx.lineWidth = 2; ctx.strokeRect(-12, -70, 24, 70);
  const top = -560, pal = _foliage(o.tod || 'day'), tones = [pal.dark, pal.mid];
  const sway = sfbm1(t * 0.4, seed) * 12;
  // stacked conical foliage tiers with scalloped leaf-edge undersides + ink line
  const tiers = 6;
  for (let i = 0; i < tiers; i++) {
    const u = i / (tiers - 1);
    const cyc = lerp(-60, top, u);
    const halfW = lerp(120, 26, u);
    const wob = sway * u;
    ctx.beginPath();
    ctx.moveTo(-halfW + wob, cyc + 70);
    ctx.quadraticCurveTo(wob, cyc - 46, halfW + wob, cyc + 70);   // peaked top
    const bumps = Math.max(3, Math.round(halfW / 24));
    for (let b = 0; b < bumps; b++) {                              // scalloped bottom (right→left)
      const x1 = lerp(halfW, -halfW, (b + 1) / bumps) + wob;
      const mxb = lerp(halfW, -halfW, (b + 0.5) / bumps) + wob;
      ctx.quadraticCurveTo(mxb, cyc + 88, x1, cyc + 70);
    }
    ctx.closePath();
    ctx.fillStyle = tones[i % 2]; ctx.fill();
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.6; ctx.stroke();
  }
  // sparse leaf ticks (no glossy stipple)
  _leafTicks(ctx, sway * 0.5, lerp(-70, top, 0.5), 96, (top + 70) * -0.5, 22, seed, pal.tick, t);
  ctx.restore();
}

// drawRock: clustered boulders with facet shading.
// o: {x, y(ground), s, seed, tone}
function drawRock(ctx, o) {
  const x = o.x, y = o.y, s = o.s === undefined ? 1 : o.s, seed = o.seed || 1;
  const tone = o.tone || '#8a8272';
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  const rnd = mulberry(seed >>> 0);
  const n = 2 + Math.floor(rnd() * 2);
  contactShadow(ctx, 0, 4, 150, 0.3);
  for (let i = 0; i < n; i++) {
    const bx = (i - (n - 1) / 2) * 100 + (rnd() - 0.5) * 30;
    const bw = 80 + rnd() * 70, bh = 70 + rnd() * 70;
    const base = _hx(tone, (rnd() - 0.5) * 0.2);
    // faceted boulder
    const pts = [];
    const facets = 7;
    for (let k = 0; k <= facets; k++) {
      const a = Math.PI + k / facets * Math.PI;
      const rr = 0.72 + rnd() * 0.4;
      pts.push([bx + Math.cos(a) * bw * rr, Math.min(0, -bh * 0.2 + Math.sin(a) * bh * rr)]);
    }
    pts.push([bx + bw, 0]); pts.push([bx - bw, 0]);
    ctx.fillStyle = base;
    ctx.beginPath(); smoothPath(ctx, pts, true); ctx.fill();
    ctx.strokeStyle = _INK; ctx.lineWidth = 2.5; ctx.stroke();
    // light facet
    ctx.fillStyle = _hx(base, 0.16);
    ctx.beginPath();
    ctx.moveTo(bx - bw * 0.4, -bh * 0.5); ctx.lineTo(bx + bw * 0.2, -bh * 0.8);
    ctx.lineTo(bx + bw * 0.3, -bh * 0.3); ctx.lineTo(bx - bw * 0.2, -bh * 0.2); ctx.closePath(); ctx.fill();
    // shadow facet
    ctx.fillStyle = 'rgba(20,14,6,0.28)';
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.3, -bh * 0.3); ctx.lineTo(bx + bw * 0.9, -bh * 0.2);
    ctx.lineTo(bx + bw * 0.7, 0); ctx.lineTo(bx + bw * 0.2, 0); ctx.closePath(); ctx.fill();
    // cracks
    ctx.strokeStyle = 'rgba(30,20,8,0.4)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(bx - bw * 0.1, -bh * 0.6); ctx.lineTo(bx + bw * 0.1, -bh * 0.2); ctx.lineTo(bx - bw * 0.05, 0); ctx.stroke();
  }
  ctx.restore();
}

// potStack: stacked clay pots (village prop).
// o: {x, y(ground), s, seed}
function potStack(ctx, o) {
  const x = o.x, y = o.y, s = o.s === undefined ? 1 : o.s, seed = o.seed || 1;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  contactShadow(ctx, 0, 2, 70, 0.28);
  const clay = '#a4552a';
  const stack = 3;
  let yy = 0;
  for (let i = 0; i < stack; i++) {
    const pw = 54 - i * 9, ph = 60 - i * 8;
    const cx = snoise1(i * 4 + seed, 2) * 6;
    const g = ctx.createLinearGradient(cx - pw, 0, cx + pw, 0);
    g.addColorStop(0, _hx(clay, -0.32)); g.addColorStop(0.45, _hx(clay, i * 0.04)); g.addColorStop(1, _hx(clay, -0.2));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - pw * 0.5, yy);
    ctx.quadraticCurveTo(cx - pw, yy - ph * 0.5, cx - pw * 0.6, yy - ph);
    ctx.lineTo(cx + pw * 0.6, yy - ph);
    ctx.quadraticCurveTo(cx + pw, yy - ph * 0.5, cx + pw * 0.5, yy);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = _INK; ctx.lineWidth = 2; ctx.stroke();
    // rim
    ctx.fillStyle = '#6e3a1a';
    ctx.beginPath(); ctx.ellipse(cx, yy - ph, pw * 0.62, 7, 0, 0, TAU); ctx.fill();
    // painted band
    ctx.strokeStyle = 'rgba(240,230,200,0.5)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx - pw * 0.7, yy - ph * 0.55); ctx.quadraticCurveTo(cx, yy - ph * 0.42, cx + pw * 0.7, yy - ph * 0.55); ctx.stroke();
    yy -= ph - 6;
  }
  ctx.restore();
}

// shrine: small roadside deity alcove with lit diya.
// o: {x, y(ground), s, t, seed}
function shrine(ctx, o) {
  const x = o.x, y = o.y, s = o.s === undefined ? 1 : o.s, t = o.t || 0, seed = o.seed || 1;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  const stone = '#b0906a';
  // base plinth
  ctx.fillStyle = _hx(stone, -0.2);
  ctx.fillRect(-90, -60, 180, 60);
  ctx.fillStyle = _hx(stone, -0.35); ctx.fillRect(-104, -18, 208, 20);
  // body
  const bg = ctx.createLinearGradient(-70, 0, 70, 0);
  bg.addColorStop(0, _hx(stone, -0.25)); bg.addColorStop(0.5, stone); bg.addColorStop(1, _hx(stone, -0.15));
  ctx.fillStyle = bg;
  ctx.fillRect(-72, -230, 144, 172);
  ctx.strokeStyle = _INK; ctx.lineWidth = 2.5; ctx.strokeRect(-72, -230, 144, 172);
  // shikhara top (tiered spire)
  ctx.fillStyle = _hx(stone, -0.1);
  ctx.beginPath();
  ctx.moveTo(-84, -230); ctx.lineTo(84, -230);
  ctx.lineTo(52, -300); ctx.lineTo(40, -300); ctx.lineTo(24, -360); ctx.lineTo(-24, -360);
  ctx.lineTo(-40, -300); ctx.lineTo(-52, -300); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 2; ctx.stroke();
  // kalasha finial
  ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(0, -368, 9, 0, TAU); ctx.fill();
  // dark alcove niche
  ctx.fillStyle = '#1c120a';
  ctx.beginPath(); archPath(ctx, 0, -210, 92, 150); ctx.fill();
  // deity silhouette + glow
  glowAdd(ctx, 0, -150, 80, 'rgba(255,180,80,0.4)', 0.9);
  ctx.fillStyle = 'rgba(60,40,20,0.9)';
  ctx.beginPath(); ctx.ellipse(0, -150, 26, 42, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = GOLD_D; ctx.beginPath(); ctx.arc(0, -186, 15, 0, TAU); ctx.fill();  // head halo hint
  // marigold garland across niche
  garlandStrand(ctx, -70, -228, 70, -228, 24, t, seed, 0.7);
  // lit diya on the step
  ctx.fillStyle = '#6e3a1a';
  ctx.beginPath(); ctx.ellipse(0, -58, 22, 8, 0, 0, TAU); ctx.fill();
  flame(ctx, 0, -62, 12, t, seed + 3, 0.9);
  glowAdd(ctx, 0, -70, 46, 'rgba(255,170,60,0.5)', 0.7);
  ctx.restore();
}

// drawHut: mud-wall + thatch potter's/village hut with warm doorway.
// o: {x, y(ground line at wall base), s, t, seed, lamp:bool, smoke:bool}
function drawHut(ctx, o) {
  const x = o.x, y = o.y, s = o.s === undefined ? 1 : o.s, t = o.t || 0, seed = o.seed || 1;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  // mud walls
  const wg = ctx.createLinearGradient(-330, 0, 290, 0);
  wg.addColorStop(0, '#8a5a34'); wg.addColorStop(0.5, '#a8744a'); wg.addColorStop(1, '#6e4424');
  ctx.fillStyle = wg;
  ctx.fillRect(-330, -330, 620, 330);
  ctx.strokeStyle = _INKS; ctx.lineWidth = 2; ctx.strokeRect(-330, -330, 620, 330);
  // thatch roof
  ctx.fillStyle = '#7c5a28';
  ctx.beginPath();
  ctx.moveTo(-400, -320);
  ctx.quadraticCurveTo(-60, -470, 340, -320);
  ctx.lineTo(310, -282); ctx.quadraticCurveTo(-60, -420, -370, -282);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(40,22,6,0.5)'; ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const u = i / 13;
    ctx.beginPath();
    ctx.moveTo(lerp(-380, 320, u), -300 - Math.sin(u * Math.PI) * 118);
    ctx.lineTo(lerp(-366, 306, u), -286 - Math.sin(u * Math.PI) * 96);
    ctx.stroke();
  }
  // ridge line
  ctx.strokeStyle = '#5a4018'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(-58, -452); ctx.lineTo(-62, -452); ctx.stroke();
  // doorway with warm interior
  const doorX = -130, doorW = 150;
  const dg = ctx.createLinearGradient(doorX, -268, doorX, 0);
  dg.addColorStop(0, '#ffd98a'); dg.addColorStop(1, '#c26a1e');
  ctx.fillStyle = dg;
  ctx.beginPath(); archPath(ctx, doorX, -268, doorW, 250); ctx.fill();
  ctx.strokeStyle = '#4a2410'; ctx.lineWidth = 7;
  ctx.beginPath(); archPath(ctx, doorX, -268, doorW, 250); ctx.stroke();
  glowAdd(ctx, doorX, -100, 220, 'rgba(255,180,80,0.35)', 0.85);
  // small window with lamp
  if (o.lamp !== false) {
    ctx.fillStyle = '#3a1c0a'; ctx.fillRect(60, -240, 70, 60);
    ctx.fillStyle = '#ffca6a'; ctx.fillRect(68, -232, 54, 44);
    flame(ctx, 95, -196, 12, t, seed + 1, 0.9);
  }
  // chimney smoke
  if (o.smoke) smoke(ctx, 150, -360, 90, t, seed + 7, 0.5);
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════
//  FAUNA  — articulated, miniature-styled animals.
//  Local space: origin at ground between the hooves, +x = facing,
//  body rises to negative y (matches people.js figure convention).
//  Signature: (ctx, {x,y,s,facing,t,seed,gait,ornament?,howdah?})
// ═══════════════════════════════════════════════════════════════════

// gait presets. ph = phase offsets [nearFore, nearHind, farFore, farHind].
// walk = 4-beat lateral sequence (LH,LF,RH,RF) so legs never all split at once.
function _gaitCfg(gait) {
  if (gait === 'run') return { rate: 2.1, amp: 1.15, bob: 16, pitch: 0.05, ph: [0.10, 0.60, 0.0, 0.50], gallop: true };
  if (gait === 'walk') return { rate: 1.05, amp: 1.0, bob: 5, pitch: 0.012, ph: [0.25, 0.0, 0.75, 0.5], gallop: false };
  return { rate: 0.0, amp: 0.04, bob: 1.2, pitch: 0.0, ph: [0.2, 0.0, 0.7, 0.5], gallop: false }; // idle
}
// one leg's hip/knee angles for a cycle position (0..1).
function _legAng(cyc, amp) {
  const a = (cyc % 1) * TAU;
  return {
    hip: Math.cos(a) * 0.26 * amp,                      // fwd(+) at cyc 0, back(-) at cyc .5
    knee: 0.12 + Math.max(0, -Math.sin(a)) * 0.5 * amp, // flexes (tucks) through swing (.5..1)
  };
}
// draw a 2-segment leg rooted at `root`, return foot point.
// footType: 'hoof' (small dark hoof) | 'pad' (flat toenailed pad) | 'none'
function _qLeg(ctx, root, upLen, loLen, ang, bendSign, w, col, dark, hoofCol, footType) {
  const hx = root[0], hy = root[1];
  const kx = hx + Math.sin(ang.hip) * upLen;
  const ky = hy + Math.cos(ang.hip) * upLen;
  const fa = ang.hip - ang.knee * bendSign;
  const fx = kx + Math.sin(fa) * loLen;
  const fy = ky + Math.cos(fa) * loLen;
  // fill the two tapered segments WITHOUT per-segment outline (no cap rings)
  limb(ctx, [hx, hy], [kx, ky], w[0], w[1], col, dark, null);
  limb(ctx, [kx, ky], [fx, fy], w[1], w[2], col, dark, null);
  // ONE continuous tapered ink contour along the outer silhouette (hip→knee→
  // foot down one side, arc around the foot, back up the other) — like humans.
  const per = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [-dy / L, dx / L]; };
  const nA = per([hx, hy], [kx, ky]), nB = per([kx, ky], [fx, fy]);
  ctx.strokeStyle = _INK; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hx + nA[0] * w[0], hy + nA[1] * w[0]);
  ctx.lineTo(kx + nA[0] * w[1], ky + nA[1] * w[1]);
  ctx.lineTo(kx + nB[0] * w[1], ky + nB[1] * w[1]);
  ctx.lineTo(fx + nB[0] * w[2], fy + nB[1] * w[2]);
  ctx.arc(fx, fy, w[2], Math.atan2(nB[1], nB[0]), Math.atan2(-nB[1], -nB[0]));   // round foot cap
  ctx.lineTo(kx - nB[0] * w[1], ky - nB[1] * w[1]);
  ctx.lineTo(kx - nA[0] * w[1], ky - nA[1] * w[1]);
  ctx.lineTo(hx - nA[0] * w[0], hy - nA[1] * w[0]);
  ctx.stroke();
  if (footType === 'pad') {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(fx, fy - w[2] * 0.1, w[2] * 1.28, w[2] * 0.72, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = _INK; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = hoofCol;
    for (let n = -1; n <= 1; n++) { ctx.beginPath(); ctx.ellipse(fx + n * w[2] * 0.66, fy + w[2] * 0.42, w[2] * 0.26, w[2] * 0.34, 0, 0, TAU); ctx.fill(); }
  } else if (footType !== 'none') {
    ctx.fillStyle = hoofCol;
    ctx.beginPath(); ctx.ellipse(fx + w[2] * 0.2, fy - w[2] * 0.1, w[2] * 1.05, w[2] * 0.88, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = _INK; ctx.lineWidth = 1.1; ctx.stroke();
  }
  return [fx, fy];
}

// almond animal eye
function _animEye(ctx, x, y, r, dir) {
  ctx.fillStyle = '#fff4e2'; ctx.beginPath(); ctx.ellipse(x, y, r * 1.15, r, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#140a04'; ctx.beginPath(); ctx.arc(x + (dir || 0) * r * 0.3, y, r * 0.66, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.3, r * 0.22, 0, TAU); ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(x, y, r * 1.15, r, 0, 0, TAU); ctx.stroke();
}

// ── HORSE ──
function drawHorse(ctx, o) {
  const s = o.s === undefined ? 1 : o.s, t = o.t || 0, seed = o.seed || 1;
  const g = _gaitCfg(o.gait || 'idle');
  const coat = o.coat || '#7a4a24', coatD = _hx(coat, -0.4), coatL = _hx(coat, 0.14);
  const mane = o.mane || '#241206', hoof = '#2a1c12';
  ctx.save();
  ctx.translate(o.x, o.y); ctx.scale(s * (o.facing || 1), s);
  contactShadow(ctx, -10, 4, 260, 0.3);

  // leg roots (fixed to ground): fore near chest, hind near rump
  const foreN = [128, -300], foreF = [150, -300];
  const hindN = [-158, -292], hindF = [-178, -292];
  const upLen = 150, loLen = 150;
  const cyc = i => t * g.rate + g.ph[i];
  const legW = [17, 12, 8.5];
  const brB = Math.sin(t * 1.4 + seed) * 2;

  // far legs (behind body) — darker
  _qLeg(ctx, foreF, upLen, loLen, _legAng(cyc(2), g.amp), 1, legW.map(w => w * 0.92), _hx(coat, -0.12), coatD, _hx(hoof, -0.1));
  _qLeg(ctx, hindF, upLen, loLen, _legAng(cyc(3), g.amp), -1, legW.map(w => w * 0.92), _hx(coat, -0.12), coatD, _hx(hoof, -0.1));

  // tail (behind rump)
  const swish = sfbm1(t * 0.9, seed + 4) * 26;
  ctx.strokeStyle = mane; ctx.lineWidth = 26; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-196, -292); ctx.quadraticCurveTo(-236 + swish * 0.4, -200, -220 + swish, -70); ctx.stroke();
  ctx.strokeStyle = _hx(mane, 0.12); ctx.lineWidth = 8;
  for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-196, -292); ctx.quadraticCurveTo(-232 + swish * 0.4 + i * 8, -200, -216 + swish + i * 12, -66); ctx.stroke(); }

  // body barrel
  ctx.save();
  ctx.translate(0, -brB);
  const body = [
    [188, -300],                 // chest top / base of neck
    [150, -348], [40, -366], [-120, -356], [-196, -318],  // back line to croup
    [-200, -270], [-176, -220],  // rump
    [-120, -196], [0, -186], [110, -196],   // belly
    [170, -230], [190, -270],    // chest/brisket
  ];
  ctx.beginPath(); smoothPath(ctx, body, true);
  const bg = ctx.createLinearGradient(0, -366, 0, -186);
  bg.addColorStop(0, coatL); bg.addColorStop(0.5, coat); bg.addColorStop(1, coatD);
  ctx.fillStyle = bg; ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 2.6; ctx.stroke();
  // belly shadow + muscle hint
  ctx.save(); ctx.beginPath(); smoothPath(ctx, body, true); ctx.clip();
  ctx.fillStyle = 'rgba(20,10,4,0.28)';
  ctx.beginPath(); ctx.ellipse(-40, -196, 170, 44, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(20,10,4,0.3)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(150, -300); ctx.quadraticCurveTo(120, -250, 150, -210); ctx.stroke(); // shoulder
  ctx.beginPath(); ctx.moveTo(-150, -300); ctx.quadraticCurveTo(-120, -250, -150, -216); ctx.stroke(); // haunch
  ctx.restore();
  ctx.restore();

  // neck + head
  ctx.save(); ctx.translate(0, -brB);
  const neck = [
    [172, -318], [210, -382], [258, -430], [300, -452],   // top (crest)
    [318, -430], [300, -392], [250, -352], [196, -300],   // throat
  ];
  ctx.beginPath(); smoothPath(ctx, neck, true);
  ctx.fillStyle = coat; ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 2.6; ctx.stroke();
  // head (muzzle at +x)
  ctx.save();
  ctx.translate(300, -440); ctx.rotate(0.15);
  const head = [
    [-6, -18], [40, -8], [66, 18], [70, 48], [58, 70], [30, 78], [4, 66], [-8, 30],
  ];
  ctx.beginPath(); smoothPath(ctx, head, true);
  ctx.fillStyle = coat; ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 2.4; ctx.stroke();
  // muzzle shade + nostril
  ctx.fillStyle = coatD; ctx.beginPath(); ctx.ellipse(52, 62, 16, 14, 0.2, 0, TAU); ctx.fill();
  ctx.fillStyle = '#160c06'; ctx.beginPath(); ctx.ellipse(56, 60, 5, 7, 0.2, 0, TAU); ctx.fill();
  // ears (secondary flick)
  const earFlick = Math.sin(t * 2.1 + seed) * 0.12;
  for (const es of [0, 1]) {
    ctx.save(); ctx.translate(-2 + es * 12, -14); ctx.rotate(-0.5 + es * 0.5 + earFlick * (es ? 1 : -1));
    ctx.fillStyle = es ? coatD : coat;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-6, -34, 6, -30); ctx.quadraticCurveTo(12, -12, 8, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = _INK; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
  }
  _animEye(ctx, 26, 20, 7, 0.4);
  // forelock + mane along the crest
  ctx.restore();
  ctx.strokeStyle = mane; ctx.lineWidth = 4; ctx.lineCap = 'round';
  const mSway = sfbm1(t * 1.1, seed + 2) * 6;
  for (let i = 0; i < 12; i++) {
    const u = i / 11;
    const bx = lerp(196, 300, u), by = lerp(-322, -450, u);
    ctx.strokeStyle = i % 2 ? _hx(mane, 0.14) : mane;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - 20, by + 26, bx - 30 + mSway * u, by + 52); ctx.stroke();
  }
  ctx.restore();

  // ── ornament: caparison (saddle-cloth), browband, reins ──
  if (o.ornament) {
    ctx.save(); ctx.translate(0, -brB);
    // jhul saddle cloth over back
    ctx.fillStyle = '#9a1f2c';
    ctx.beginPath();
    ctx.moveTo(120, -352); ctx.lineTo(-150, -344);
    ctx.lineTo(-176, -232); ctx.lineTo(-120, -228);
    ctx.lineTo(-96, -300); ctx.lineTo(60, -308); ctx.lineTo(96, -238); ctx.lineTo(150, -244);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 4; ctx.stroke();
    // tassels
    ctx.fillStyle = GOLD_L;
    for (let i = 0; i < 5; i++) { const tx = lerp(-150, -100, i / 4); ctx.beginPath(); ctx.moveTo(tx, -228); ctx.lineTo(tx - 4, -206); ctx.lineTo(tx + 4, -206); ctx.closePath(); ctx.fill(); }
    // saddle pad diamonds
    ctx.fillStyle = GOLD_D;
    for (let i = 0; i < 4; i++) { const dx = -110 + i * 60; ctx.beginPath(); ctx.moveTo(dx, -300); ctx.lineTo(dx + 12, -286); ctx.lineTo(dx, -272); ctx.lineTo(dx - 12, -286); ctx.closePath(); ctx.fill(); }
    // reins from muzzle to withers
    ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(346, -392); ctx.quadraticCurveTo(280, -360, 190, -336); ctx.stroke();
    // browband + plume
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(300, -420); ctx.lineTo(320, -404); ctx.stroke();
    ctx.fillStyle = '#c11f2c';
    ctx.beginPath(); ctx.moveTo(300, -452); ctx.quadraticCurveTo(288, -496, 306, -500); ctx.quadraticCurveTo(316, -472, 312, -452); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // near legs (in front) — full color
  _qLeg(ctx, hindN, upLen, loLen, _legAng(cyc(1), g.amp), -1, legW, coat, coatD, hoof);
  _qLeg(ctx, foreN, upLen, loLen, _legAng(cyc(0), g.amp), 1, legW, coat, coatD, hoof);
  ctx.restore();
}

// ── ELEPHANT ──
function drawElephant(ctx, o) {
  const s = o.s === undefined ? 1 : o.s, t = o.t || 0, seed = o.seed || 1;
  const g = _gaitCfg(o.gait || 'idle');
  const skin = o.coat || '#8a8894', skinD = _hx(skin, -0.34), skinL = _hx(skin, 0.12);
  const nail = '#e8dcc4';
  ctx.save();
  ctx.translate(o.x, o.y); ctx.scale(s * (o.facing || 1), s);
  contactShadow(ctx, 0, 6, 380, 0.32);

  const foreN = [190, -430], foreF = [214, -430];
  const hindN = [-210, -420], hindF = [-234, -420];
  const upLen = 200, loLen = 220;                 // stout pillar legs
  const cyc = i => t * g.rate + g.ph[i];
  const legW = [40, 36, 34];
  const brB = Math.sin(t * 1.1 + seed) * 3;

  // far legs (stout pillars — minimal swing)
  _qLeg(ctx, foreF, upLen, loLen, _legAng(cyc(2), g.amp * 0.3), 1, legW.map(w => w * 0.94), _hx(skin, -0.1), skinD, _hx(nail, -0.2), 'pad');
  _qLeg(ctx, hindF, upLen, loLen, _legAng(cyc(3), g.amp * 0.3), -1, legW.map(w => w * 0.94), _hx(skin, -0.1), skinD, _hx(nail, -0.2), 'pad');

  // tail
  const tsw = sfbm1(t * 0.8, seed + 5) * 18;
  ctx.strokeStyle = skinD; ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-262, -420); ctx.quadraticCurveTo(-300 + tsw * 0.4, -300, -286 + tsw, -170); ctx.stroke();
  ctx.strokeStyle = '#241a12'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-286 + tsw, -180); ctx.lineTo(-294 + tsw, -140); ctx.stroke();

  // body — big domed barrel
  ctx.save(); ctx.translate(0, -brB);
  const body = [
    [232, -470], [120, -560], [-60, -580], [-220, -556], [-286, -486],
    [-300, -420], [-270, -330], [-160, -300], [0, -292], [150, -300], [244, -350], [258, -430],
  ];
  ctx.beginPath(); smoothPath(ctx, body, true);
  const bg = ctx.createLinearGradient(0, -580, 0, -292);
  bg.addColorStop(0, skinL); bg.addColorStop(0.5, skin); bg.addColorStop(1, skinD);
  ctx.fillStyle = bg; ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 3; ctx.stroke();
  // skin folds + belly shade
  ctx.save(); ctx.beginPath(); smoothPath(ctx, body, true); ctx.clip();
  ctx.fillStyle = 'rgba(20,18,26,0.26)'; ctx.beginPath(); ctx.ellipse(-30, -300, 220, 44, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(30,26,34,0.3)'; ctx.lineWidth = 2.4;
  for (let i = 0; i < 5; i++) { const yy = -470 + i * 40; ctx.beginPath(); ctx.moveTo(200, yy); ctx.quadraticCurveTo(150, yy + 20, 120, yy + 30); ctx.stroke(); }
  ctx.restore();
  ctx.restore();

  // ornament: caparison over back + face (draw before near legs but after body)
  if (o.ornament) {
    ctx.save(); ctx.translate(0, -brB);
    ctx.fillStyle = '#a11e2c';
    ctx.beginPath();
    ctx.moveTo(180, -520); ctx.lineTo(-220, -520); ctx.lineTo(-250, -420); ctx.lineTo(-190, -412);
    ctx.lineTo(-150, -470); ctx.lineTo(140, -470); ctx.lineTo(180, -418); ctx.lineTo(232, -430);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = GOLD_D;
    for (let i = 0; i < 6; i++) { const dx = -180 + i * 66; ctx.beginPath(); ctx.arc(dx, -462, 9, 0, TAU); ctx.fill(); }
    // bells fringe
    ctx.fillStyle = GOLD_L;
    for (let i = 0; i < 7; i++) { const tx = lerp(-240, -180, i / 6); ctx.beginPath(); ctx.arc(tx, -410, 5, 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  // head + trunk + ear (front side)
  ctx.save(); ctx.translate(0, -brB);
  // head dome
  const head = [
    [230, -470], [300, -510], [352, -486], [372, -430], [366, -360], [330, -320], [270, -320], [232, -366],
  ];
  ctx.beginPath(); smoothPath(ctx, head, true);
  ctx.fillStyle = skin; ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 2.6; ctx.stroke();
  // ear (large, flaps slowly)
  const earFlap = Math.sin(t * 1.3 + seed) * 0.06 + 0.02;
  ctx.save(); ctx.translate(250, -430);
  ctx.rotate(earFlap);
  ctx.fillStyle = _hx(skin, -0.06);
  ctx.beginPath();
  ctx.moveTo(0, -70); ctx.quadraticCurveTo(-120, -80, -150, 30);
  ctx.quadraticCurveTo(-140, 120, -40, 130); ctx.quadraticCurveTo(10, 90, 10, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 2.4; ctx.stroke();
  ctx.strokeStyle = 'rgba(30,26,34,0.3)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-8, -40); ctx.quadraticCurveTo(-90, -30, -120, 40); ctx.stroke();
  if (o.ornament) { ctx.fillStyle = '#c11f2c'; ctx.beginPath(); ctx.arc(-70, 60, 16, 0, TAU); ctx.fill(); ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.stroke(); }
  ctx.restore();
  // eye
  _animEye(ctx, 320, -412, 8, 0.3);
  // tusk
  ctx.fillStyle = nail;
  ctx.beginPath(); ctx.moveTo(340, -350); ctx.quadraticCurveTo(392, -320, 404, -272); ctx.quadraticCurveTo(388, -300, 340, -330); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = _INKS; ctx.lineWidth = 1.4; ctx.stroke();
  // trunk (curls, secondary sway)
  const curl = ((o.gait || 'idle') === 'idle' ? Math.sin(t * 0.8 + seed) * 0.5 : 0.2);
  ctx.strokeStyle = skin; ctx.lineWidth = 46; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(348, -420);
  ctx.quadraticCurveTo(392, -300, 372, -180);
  ctx.quadraticCurveTo(360, -90, 400 + curl * 40, -50 - curl * 20);
  ctx.stroke();
  // trunk taper tip
  ctx.strokeStyle = skin; ctx.lineWidth = 30;
  ctx.beginPath(); ctx.moveTo(372, -180); ctx.quadraticCurveTo(360, -90, 400 + curl * 40, -50 - curl * 20); ctx.stroke();
  ctx.strokeStyle = _INK; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(348, -420); ctx.quadraticCurveTo(392, -300, 372, -180); ctx.quadraticCurveTo(356, -80, 400 + curl * 40, -46 - curl * 20); ctx.stroke();
  // trunk ridges
  ctx.strokeStyle = 'rgba(30,26,34,0.28)'; ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) { const u = i / 7; const px = lerp(352, 380, u), py = lerp(-400, -140, u); ctx.beginPath(); ctx.moveTo(px - 20, py); ctx.quadraticCurveTo(px, py + 8, px + 20, py); ctx.stroke(); }
  ctx.restore();

  // howdah (seat) option — on top of the back
  if (o.howdah) {
    ctx.save(); ctx.translate(0, -brB);
    const hw = '#7c4a1e';
    ctx.fillStyle = '#caa54a';
    ctx.fillRect(-160, -580, 300, 18);          // base board
    ctx.fillStyle = hw;
    ctx.fillRect(-150, -690, 20, 110);            // posts
    ctx.fillRect(120, -690, 20, 110);
    ctx.fillRect(-16, -700, 20, 120);
    // canopy
    ctx.fillStyle = '#8c1f28';
    ctx.beginPath();
    ctx.moveTo(-180, -690); ctx.quadraticCurveTo(-10, -760, 168, -690);
    ctx.lineTo(150, -670); ctx.quadraticCurveTo(-10, -730, -160, -670); ctx.closePath(); ctx.fill();
    goldLine(ctx, -172, -684, 160, -684, 4);
    // rail + cushion
    ctx.strokeStyle = GOLD; ctx.lineWidth = 4; ctx.strokeRect(-150, -600, 290, 30);
    ctx.fillStyle = '#d8b25a'; ctx.fillRect(-140, -592, 270, 16);
    ctx.restore();
  }

  // near legs
  _qLeg(ctx, hindN, upLen, loLen, _legAng(cyc(1), g.amp * 0.3), -1, legW, skin, skinD, nail, 'pad');
  _qLeg(ctx, foreN, upLen, loLen, _legAng(cyc(0), g.amp * 0.3), 1, legW, skin, skinD, nail, 'pad');
  ctx.restore();
}

// ── DEER (spotted, graceful) ──
function drawDeer(ctx, o) {
  const s = o.s === undefined ? 1 : o.s, t = o.t || 0, seed = o.seed || 1;
  const g = _gaitCfg(o.gait || 'idle');
  const coat = o.coat || '#b5793c', coatD = _hx(coat, -0.4), coatL = _hx(coat, 0.16), belly = '#f0e4cf';
  const hoof = '#241209';
  ctx.save();
  ctx.translate(o.x, o.y); ctx.scale(s * (o.facing || 1), s);
  contactShadow(ctx, -6, 3, 150, 0.28);

  const foreN = [78, -190], foreF = [92, -190];
  const hindN = [-96, -184], hindF = [-110, -184];
  const upLen = 96, loLen = 96;
  const cyc = i => t * g.rate + g.ph[i];
  const legW = [8.5, 5.5, 3.8];             // slender
  const brB = Math.sin(t * 1.6 + seed) * 1.4;

  _qLeg(ctx, foreF, upLen, loLen, _legAng(cyc(2), g.amp), 1, legW.map(w => w * 0.9), _hx(coat, -0.12), coatD, _hx(hoof, -0.1));
  _qLeg(ctx, hindF, upLen, loLen, _legAng(cyc(3), g.amp), -1, legW.map(w => w * 0.9), _hx(coat, -0.12), coatD, _hx(hoof, -0.1));

  // short tail
  ctx.fillStyle = coat; ctx.beginPath(); ctx.moveTo(-118, -196); ctx.quadraticCurveTo(-138, -180, -128, -150); ctx.quadraticCurveTo(-118, -170, -108, -186); ctx.closePath(); ctx.fill();
  ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(-124, -168, 7, 14, -0.2, 0, TAU); ctx.fill();

  // body
  ctx.save(); ctx.translate(0, -brB);
  const body = [
    [116, -196], [86, -232], [-10, -244], [-100, -232], [-128, -196],
    [-118, -150], [-70, -128], [10, -122], [86, -130], [118, -156],
  ];
  ctx.beginPath(); smoothPath(ctx, body, true);
  const bg = ctx.createLinearGradient(0, -244, 0, -122);
  bg.addColorStop(0, coatL); bg.addColorStop(0.55, coat); bg.addColorStop(1, coatD);
  ctx.fillStyle = bg; ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 2.2; ctx.stroke();
  // white belly + spots
  ctx.save(); ctx.beginPath(); smoothPath(ctx, body, true); ctx.clip();
  ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(-6, -124, 88, 18, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,246,224,0.85)';
  for (let i = 0; i < 16; i++) {
    const sx = -110 + hash1(seed + i) * 210, sy = -230 + hash1(seed * 3 + i) * 80;
    ctx.beginPath(); ctx.arc(sx, sy, 3.4, 0, TAU); ctx.fill();
  }
  ctx.restore();
  ctx.restore();

  // neck + head
  ctx.save(); ctx.translate(0, -brB);
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(96, -212); ctx.quadraticCurveTo(120, -270, 150, -320);
  ctx.quadraticCurveTo(168, -318, 156, -300); ctx.quadraticCurveTo(134, -258, 122, -200);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 2.2; ctx.stroke();
  // head
  ctx.save(); ctx.translate(150, -324); ctx.rotate(0.1);
  const head = [[-8, -8], [24, -6], [44, 6], [46, 22], [34, 32], [8, 30], [-6, 16]];
  ctx.beginPath(); smoothPath(ctx, head, true);
  ctx.fillStyle = coat; ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#160c06'; ctx.beginPath(); ctx.ellipse(40, 22, 4, 5, 0, 0, TAU); ctx.fill();
  // big ear
  const earFlick = Math.sin(t * 2.4 + seed) * 0.14;
  ctx.save(); ctx.translate(-2, -6); ctx.rotate(-0.7 + earFlick);
  ctx.fillStyle = coatL;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-14, -34, 4, -40); ctx.quadraticCurveTo(18, -20, 10, 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(2, -18, 5, 14, 0.1, 0, TAU); ctx.fill();
  ctx.restore();
  // small antlers
  ctx.strokeStyle = '#c9a86a'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
  for (const sgn of [0, 1]) {
    ctx.save(); ctx.translate(6 + sgn * 6, -6);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(6, -30, 2, -54); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3, -26); ctx.lineTo(-10, -40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, -42); ctx.lineTo(14, -54); ctx.stroke();
    ctx.restore();
  }
  _animEye(ctx, 24, 16, 6, 0.3);
  ctx.restore();
  ctx.restore();

  _qLeg(ctx, hindN, upLen, loLen, _legAng(cyc(1), g.amp), -1, legW, coat, coatD, hoof);
  _qLeg(ctx, foreN, upLen, loLen, _legAng(cyc(0), g.amp), 1, legW, coat, coatD, hoof);
  ctx.restore();
}

// ── COW (humped zebu, dewlap, horns) ──
function drawCow(ctx, o) {
  const s = o.s === undefined ? 1 : o.s, t = o.t || 0, seed = o.seed || 1;
  const g = _gaitCfg(o.gait || 'idle');
  const coat = o.coat || '#c9b79a', coatD = _hx(coat, -0.34), coatL = _hx(coat, 0.12);
  const hoof = '#2a1c12', horn = '#e6d8bc';
  ctx.save();
  ctx.translate(o.x, o.y); ctx.scale(s * (o.facing || 1), s);
  contactShadow(ctx, -6, 4, 220, 0.3);

  const foreN = [120, -250], foreF = [138, -250];
  const hindN = [-140, -248], hindF = [-158, -248];
  const upLen = 124, loLen = 124;
  const cyc = i => t * g.rate + g.ph[i];
  const legW = [15, 11, 8];
  const brB = Math.sin(t * 1.3 + seed) * 1.8;

  _qLeg(ctx, foreF, upLen, loLen, _legAng(cyc(2), g.amp), 1, legW.map(w => w * 0.9), _hx(coat, -0.12), coatD, _hx(hoof, -0.1));
  _qLeg(ctx, hindF, upLen, loLen, _legAng(cyc(3), g.amp), -1, legW.map(w => w * 0.9), _hx(coat, -0.12), coatD, _hx(hoof, -0.1));

  // tuft tail
  const tsw = sfbm1(t * 0.9, seed + 4) * 14;
  ctx.strokeStyle = coatD; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-168, -250); ctx.quadraticCurveTo(-190 + tsw * 0.4, -160, -178 + tsw, -70); ctx.stroke();
  ctx.fillStyle = '#3a2a18'; ctx.beginPath(); ctx.ellipse(-178 + tsw, -60, 8, 18, 0, 0, TAU); ctx.fill();

  // body with shoulder hump
  ctx.save(); ctx.translate(0, -brB);
  const body = [
    [152, -260], [150, -300], [120, -336], [96, -300],   // shoulder + zebu hump
    [10, -300], [-110, -288], [-168, -258],
    [-172, -196], [-120, -142], [0, -134], [112, -144], [158, -186],  // deeper belly
  ];
  ctx.beginPath(); smoothPath(ctx, body, true);
  const bg = ctx.createLinearGradient(0, -336, 0, -134);
  bg.addColorStop(0, coatL); bg.addColorStop(0.5, coat); bg.addColorStop(1, coatD);
  ctx.fillStyle = bg; ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.save(); ctx.beginPath(); smoothPath(ctx, body, true); ctx.clip();
  ctx.fillStyle = 'rgba(20,10,4,0.24)'; ctx.beginPath(); ctx.ellipse(-30, -150, 152, 32, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.restore();

  // neck + dewlap + head
  ctx.save(); ctx.translate(0, -brB);
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(126, -284); ctx.quadraticCurveTo(168, -300, 206, -300);   // neck top
  ctx.quadraticCurveTo(206, -250, 176, -232);                          // to head
  ctx.quadraticCurveTo(150, -222, 150, -200);                          // dewlap hang
  ctx.quadraticCurveTo(128, -224, 122, -262);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 2.3; ctx.stroke();
  // dewlap folds
  ctx.strokeStyle = 'rgba(30,18,8,0.3)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(150, -238); ctx.quadraticCurveTo(160, -224, 150, -204); ctx.stroke();
  // head (larger, rounder for a calf)
  ctx.save(); ctx.translate(196, -300); ctx.rotate(0.12); if (o.calf) ctx.scale(1.16, 1.16);
  const head = [[-6, -18], [30, -14], [52, 4], [54, 32], [40, 46], [12, 44], [-6, 20]];
  ctx.beginPath(); smoothPath(ctx, head, true);
  ctx.fillStyle = coat; ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.fillStyle = coatD; ctx.beginPath(); ctx.ellipse(42, 34, 12, 9, 0.1, 0, TAU); ctx.fill();
  ctx.fillStyle = '#160c06'; ctx.beginPath(); ctx.arc(44, 32, 3, 0, TAU); ctx.fill();
  // horns (nubs for a calf)
  if (o.calf) {
    ctx.fillStyle = horn;
    ctx.beginPath(); ctx.arc(6, -14, 5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(22, -12, 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = _INKS; ctx.lineWidth = 1.2; ctx.stroke();
  } else {
    ctx.strokeStyle = horn; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(2, -14); ctx.quadraticCurveTo(-6, -44, 14, -58); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14, -12); ctx.quadraticCurveTo(24, -40, 44, -46); ctx.stroke();
  }
  // ear
  const earFlick = Math.sin(t * 2.0 + seed) * 0.12;
  ctx.save(); ctx.translate(-4, 2); ctx.rotate(-0.4 + earFlick);
  ctx.fillStyle = coatL;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-24, -6, -30, 12); ctx.quadraticCurveTo(-20, 22, 2, 12); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.restore();
  _animEye(ctx, 30, 18, 6.5, 0.2);
  // tilak on forehead (sacred cow)
  ctx.fillStyle = '#c92f1d'; ctx.beginPath(); ctx.ellipse(18, 2, 4, 8, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.restore();

  _qLeg(ctx, hindN, upLen, loLen, _legAng(cyc(1), g.amp), -1, legW, coat, coatD, hoof);
  _qLeg(ctx, foreN, upLen, loLen, _legAng(cyc(0), g.amp), 1, legW, coat, coatD, hoof);
  ctx.restore();
}

// ── BIRD (heron / crane-like wader; also small perched) ──
// gait: idle = standing, walk = wading step, run = flapping/taking off.
function drawBird(ctx, o) {
  const s = o.s === undefined ? 1 : o.s, t = o.t || 0, seed = o.seed || 1;
  const gait = o.gait || 'idle';
  const body = o.coat || '#e6e2d6', bodyD = _hx(body, -0.3), wingC = '#b8b2a2';
  const legC = '#3a2c18', beak = '#d8b23a';
  ctx.save();
  ctx.translate(o.x, o.y); ctx.scale(s * (o.facing || 1), s);
  contactShadow(ctx, 0, 3, 90, 0.24);

  const flap = gait === 'run' ? Math.sin(t * 8) : 0;   // wing beat
  const step = gait === 'walk' ? Math.sin(t * 2.4) : 0;
  const bob = gait === 'idle' ? sfbm1(t * 0.6, seed) * 3 : Math.abs(step) * 6;

  // long legs (2-segment, wading)
  const hipY = -150;
  for (const side of [0.9, 1.0]) {                       // far, near
    const far = side < 1;
    const ph = far ? Math.PI : 0;
    const swing = gait === 'walk' ? Math.sin(t * 2.4 + ph) * 0.5 : (gait === 'run' ? 0.3 : 0.04);
    const kneeB = 0.6 + Math.max(0, Math.sin(t * 2.4 + ph)) * (gait === 'walk' ? 0.5 : 0);
    const hx = -6 + (far ? -8 : 0), hy = hipY;
    const kx = hx + Math.sin(swing) * 60;
    const ky = hy + Math.cos(swing) * 60;
    const fa = swing + kneeB;                             // knee bends forward (bird stifle)
    const fx = kx - Math.sin(fa) * 62;
    const fy = ky + Math.cos(fa) * 62;
    const col = far ? _hx(legC, 0.1) : legC;
    ctx.strokeStyle = col; ctx.lineWidth = far ? 4.5 : 5.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    // foot (3 toes)
    ctx.lineWidth = far ? 2.5 : 3;
    for (const d of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + 16 * d + 6, fy + 4); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx - 12, fy + 3); ctx.stroke();
  }

  ctx.save(); ctx.translate(0, -bob);
  // body (egg, tilted)
  ctx.save(); ctx.rotate(-0.15);
  const bg = ctx.createLinearGradient(0, -50, 0, 40);
  bg.addColorStop(0, _hx(body, 0.1)); bg.addColorStop(1, bodyD);
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(0, -150, 62, 42, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.restore();

  // wing (folded, or spread when running/flying)
  ctx.save(); ctx.translate(-6, -150);
  if (gait === 'run') {
    ctx.rotate(-0.5 + flap * 0.6);
    ctx.fillStyle = wingC;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-90, -30 - flap * 40, -150, 10 - flap * 30);
    ctx.quadraticCurveTo(-90, 30, 0, 20); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = _INK; ctx.lineWidth = 2; ctx.stroke();
    // primaries
    ctx.strokeStyle = bodyD; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { const u = i / 4; ctx.beginPath(); ctx.moveTo(-40 - u * 90, 4 - flap * 24 * u); ctx.lineTo(-52 - u * 96, 18); ctx.stroke(); }
  } else {
    ctx.fillStyle = wingC;
    ctx.beginPath(); ctx.moveTo(30, -10); ctx.quadraticCurveTo(-30, -20, -66, 8); ctx.quadraticCurveTo(-30, 24, 34, 16); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = _INK; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.strokeStyle = bodyD; ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(10 - i * 18, -6); ctx.quadraticCurveTo(-20 - i * 12, 4, -40 - i * 8, 12); ctx.stroke(); }
    // tail plume
    ctx.strokeStyle = wingC; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-40, 6); ctx.quadraticCurveTo(-80, 10, -104, 26); ctx.stroke();
  }
  ctx.restore();

  // S-neck + head + long beak
  const neckSway = sfbm1(t * 0.9, seed + 2) * 0.08;
  ctx.save(); ctx.translate(28, -172);
  ctx.strokeStyle = body; ctx.lineWidth = 15; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.quadraticCurveTo(40, -10, 26, -60 + neckSway * 40);       // up
  ctx.quadraticCurveTo(20, -84, 44, -96);                       // head base
  ctx.stroke();
  ctx.strokeStyle = _INK; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-6, 22); ctx.quadraticCurveTo(34, -10, 20, -60 + neckSway * 40);
  ctx.stroke();
  // head
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(46, -98, 17, 13, 0.2, 0, TAU); ctx.fill();
  ctx.strokeStyle = _INK; ctx.lineWidth = 1.8; ctx.stroke();
  // crest plume
  ctx.strokeStyle = bodyD; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(40, -108); ctx.quadraticCurveTo(20, -120, 4, -116); ctx.stroke();
  // beak (long dagger)
  ctx.fillStyle = beak;
  ctx.beginPath(); ctx.moveTo(58, -102); ctx.lineTo(118, -92); ctx.lineTo(58, -92); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = _INKS; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.strokeStyle = 'rgba(40,26,8,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(58, -96); ctx.lineTo(116, -92); ctx.stroke();
  // eye
  _animEye(ctx, 50, -100, 4, 0.4);
  ctx.restore();
  ctx.restore();
  ctx.restore();
}

// three ready cow coats (white/grey, brown, black) — read well under lamplight.
const COW_COATS = ['#d8ccb4', '#9a6636', '#4a4038'];

// ═══════════════════════════════════════════════════════════════════
//  WEATHER — layered rain (slanted streak layers + ground splashes).
//  o: {t, seed, intensity:0..1, angle(rad slant), region:[x,y,w,h],
//      groundY?:number, color?}
// ═══════════════════════════════════════════════════════════════════
function drawRain(ctx, o) {
  const t = o.t || 0, seed = o.seed || 1, I = o.intensity == null ? 1 : o.intensity;
  if (I <= 0.01) return;
  const ang = o.angle == null ? 0.26 : o.angle;
  const region = o.region || [0, 0, W, H];
  const rx = region[0], ry = region[1], rw = region[2], rh = region[3];
  const sa = Math.sin(ang), ca = Math.cos(ang);
  const base = o.color || '218,232,248';
  ctx.save();
  // 3 depth layers — far (faint/short/slow) → near (bright/long/fast)
  const layers = [[Math.round(70 * I), 0.45, 70, 0.14, 1.0], [Math.round(90 * I), 0.72, 120, 0.22, 1.6], [Math.round(60 * I), 1.0, 200, 0.32, 2.4]];
  for (let L = 0; L < layers.length; L++) {
    const n = layers[L][0], spd = layers[L][1], len = layers[L][2], a = layers[L][3], lw = layers[L][4];
    ctx.strokeStyle = `rgba(${base},${a})`; ctx.lineWidth = lw;
    for (let i = 0; i < n; i++) {
      const speed = (620 + hash1(seed * 2 + i) * 520) * spd;
      const ph = (hash1(seed * 3 + i + L * 17) + t * speed / rh) % 1;
      const x = rx + hash1(seed + i * 13 + L * 31) * (rw + rh * sa) + ph * sa * rh - rh * sa;
      const y = ry + ph * rh;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - sa * len, y + ca * len); ctx.stroke();
    }
  }
  // ground splash ticks
  if (o.groundY != null) {
    for (let i = 0; i < Math.round(46 * I); i++) {
      const sx = rx + hash1(seed * 7 + i) * rw;
      const cyc = (hash1(seed * 5 + i) + t * 2.2) % 1;
      if (cyc < 0.32) {
        const k = cyc / 0.32, r = 3 + k * 9, a = (1 - k) * 0.5;
        ctx.strokeStyle = `rgba(${base},${a})`; ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(sx - r, o.groundY); ctx.lineTo(sx - r - 3, o.groundY - 5 - k * 4);
        ctx.moveTo(sx + r, o.groundY); ctx.lineTo(sx + r + 3, o.groundY - 5 - k * 4);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}
