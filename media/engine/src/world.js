// ── world.js ── sets, props, crowds, and pose/walk helpers.
'use strict';

// ── acting helpers ──
// walking pose at phase ph (radians-ish), amp 0..1
function walkPose(ph, amp) {
  const a = amp === undefined ? 1 : amp;
  const s = Math.sin(ph), c = Math.sin(ph + Math.PI);
  return {
    legF: { hip: s * 0.4 * a, knee: Math.max(0, -s) * 0.5 * a + 0.05 },
    legB: { hip: c * 0.4 * a, knee: Math.max(0, -c) * 0.5 * a + 0.05 },
    armF: { sh: c * 0.22 * a + 0.08, el: 0.18 + Math.max(0, c) * 0.12 * a },
    armB: { sh: s * 0.22 * a - 0.05, el: 0.15 + Math.max(0, s) * 0.12 * a },
    bob: Math.abs(Math.cos(ph)) * 4 * a,
  };
}
// blend two poses (shallow per key)
function posemix(p1, p2, k) {
  const out = {};
  const keys = new Set([...Object.keys(p1), ...Object.keys(p2)]);
  for (const key of keys) {
    const a = p1[key], b = p2[key];
    if (a === undefined) { out[key] = b; continue; }
    if (b === undefined) { out[key] = a; continue; }
    if (typeof a === 'number') out[key] = lerp(a, b, k);
    else if (typeof a === 'object') out[key] = posemix(a, b, k);
    else out[key] = k < 0.5 ? a : b;
  }
  return out;
}

// seated figure (cross-legged) — for crowds and court
function drawSeated(ctx, o) {
  const st = o.style, t = o.t || 0, seed = o.seed || 1;
  const skin = st.skin, dark = st.skinShade || shade(skin, -0.3);
  const s = o.s, female = st.female;
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(s * (o.facing || 1), s);
  const build = st.build || 1;
  const br = Math.sin(t * 1.5 + seed * 3) * 1.2;
  // folded legs base (dhoti mound)
  const cm = st.garb === 'sari' ? (st.clothMain || '#8c1f28') : (st.clothMain || '#ece2c8');
  ctx.fillStyle = cm;
  ctx.beginPath();
  ctx.moveTo(-66 * build, 0);
  ctx.quadraticCurveTo(-60 * build, -66, -30 * build, -78);
  ctx.lineTo(30 * build, -78);
  ctx.quadraticCurveTo(62 * build, -64, 66 * build, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba('#241005', 0.4); ctx.lineWidth = 1.4; ctx.stroke();
  ctx.strokeStyle = rgba('#000', 0.18); ctx.lineWidth = 1.4;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(i * 9, -74); ctx.quadraticCurveTo(i * 16, -36, i * 22, -2); ctx.stroke();
  }
  // torso
  const shW = 38 * build * (female ? 0.85 : 1);
  const shY = -160 * build - br;
  ctx.beginPath();
  ctx.moveTo(-shW, shY + 8);
  ctx.quadraticCurveTo(-shW - 4, shY + 46, -24 * build, -74);
  ctx.lineTo(24 * build, -74);
  ctx.quadraticCurveTo(shW + 4, shY + 44, shW, shY + 8);
  ctx.quadraticCurveTo(0, shY - 6, -shW, shY + 8);
  ctx.closePath();
  const bare = !female && st.garb !== 'robe' && st.garb !== 'armor';
  ctx.fillStyle = bare ? skin : (st.garb === 'armor' ? st.clothMain : (female ? st.clothMain : st.clothMain));
  if (bare) ctx.fillStyle = skin;
  ctx.fill();
  ctx.save(); ctx.clip();
  const g = ctx.createLinearGradient(-shW, 0, shW, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.34)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(255,240,200,0.10)');
  ctx.fillStyle = g; ctx.fillRect(-shW - 8, shY - 10, shW * 2 + 16, -shY);
  ctx.restore();
  ctx.strokeStyle = rgba('#241005', 0.4); ctx.lineWidth = 1.4; ctx.stroke();
  if (bare && st.sacredThread) {
    ctx.strokeStyle = '#f5ead2'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-shW * 0.6, shY + 12); ctx.quadraticCurveTo(6, shY + 60, 20 * build, -76); ctx.stroke();
  }
  // simple resting arms: hands on knees
  const aw = (female ? 6.5 : 8.5) * build;
  limb(ctx, [-shW * 0.9, shY + 14], [-46 * build, -66], aw * 1.1, aw * 0.7, shade(skin, -0.12), dark, rgba('#241005', 0.35));
  limb(ctx, [shW * 0.9, shY + 14], [46 * build, -66], aw * 1.1, aw * 0.7, skin, dark, rgba('#241005', 0.35));
  drawHand(ctx, -46 * build, -64, 2.6, build * 0.9, shade(skin, -0.12), 'relaxed', dark);
  drawHand(ctx, 46 * build, -64, -2.6 + Math.PI, build * 0.9, skin, 'relaxed', dark);
  // ornaments
  if (st.ornaments >= 1) {
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-16, shY + 8); ctx.quadraticCurveTo(0, shY + 26, 16, shY + 8); ctx.stroke();
  }
  if (st.scarf) {
    ctx.fillStyle = rgba(st.scarf, 0.9);
    ctx.beginPath();
    ctx.moveTo(-shW * 0.9, shY + 4);
    ctx.quadraticCurveTo(0, shY + 40, shW * 0.55, -80);
    ctx.lineTo(shW * 0.95, -74);
    ctx.quadraticCurveTo(0, shY + 56, -shW * 0.7, shY + 18);
    ctx.closePath(); ctx.fill();
  }
  // neck + head
  ctx.fillStyle = skin;
  ctx.fillRect(-8 * build, shY - 18, 17 * build, 22);
  ctx.save();
  ctx.translate(0, shY - 18 - FIG.headR * 0.62 * build);
  const face = Object.assign({ turn: 0.3 }, o.face);
  drawHead(ctx, FIG.headR * build * 0.96 * (female ? 0.94 : 1), st, face, t, seed);
  ctx.restore();
  ctx.restore();
}

// ── props ──
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

// crowd of seated nobles/brahmins — cached to an offscreen strip
function crowdStrip(key, n, kindFn, scale) {
  return cached(key, Math.round(n * 120 * scale), Math.round(320 * scale), (g, w, h) => {
    for (let i = 0; i < n; i++) {
      const st = kindFn(i);
      drawSeated(g, {
        x: (i + 0.5) * 120 * scale + snoise1(i * 7.7, 3) * 14 * scale,
        y: h - 6 * scale,
        s: scale * (0.92 + hash1(i * 13) * 0.1),
        facing: 1, style: st, t: hash1(i) * 9, seed: i * 17 + 2,
        face: { turn: 0.25 + hash1(i * 3) * 0.2, smile: 0.05, gaze: { x: -0.3, y: 0.1 } },
      });
    }
  });
}
