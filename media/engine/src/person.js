// ── person.js ── the cast rig + class hierarchy (character system v2).
// Hand-built vector humans in the Rajput/Pahari miniature manner: strong
// profile-to-frontal faces, kohl-rimmed almond eyes, gold ornament, modelled
// skin over flat grounds.
//
// Head-local space: origin = skull centre, 1 unit = head radius, +x = facing.
// Figure-local space: origin = ground between feet, y up is negative,
// total height ≈ 400 units; caller scales.
//
// Depends on: core.js, paint.js, acting.js, wardrobe.js.
//
// LEGACY FREE FUNCTIONS (unchanged signatures + behaviour for existing styles):
//   drawFigure(ctx, o)                      o:{x,y,s,facing,style,pose,t,seed,shadow[,rig]}
//   drawSeated(ctx, o)
//   drawHead(ctx, R, style, face, t, seed[, rig])
// CLASS API (globals):
//   Person → Man / Woman → Deity / Sage / Rakshasa
//   Person.of(styleOrName) → resolves archetypes (ARCH) + CHARACTERS registry
//   p.draw(ctx,{x,y,s,facing,pose,t,seed,shadow});  p.drawSeated(ctx,{…})
//   pose may be a POSES name (string) or a pose object.
// Overridable pipeline methods: aura, drawTorso, drawOrnaments, drawHeadgear,
//   drawFacialHair. Base implementations delegate to the free helpers, so the
//   class path and the legacy free path render identically by default.
'use strict';

function rgbaC(hex, a) { return rgba(hex, a); }

// Figure metrics (units; height ≈ 400 × build)
const FIG = {
  headR: 27, neck: 20, shoulderY: 318, shoulderW: 40, chestW: 46,
  waistY: 240, waistW: 27, hipY: 222, hipW: 33,
  upperArm: 62, foreArm: 56, hand: 20,
  thigh: 95, shin: 92, footL: 30,
};

// FK chain for one arm; returns joints in figure space (ported)
function armChain(shx, shy, a, build) {
  const ua = FIG.upperArm * build, fa = FIG.foreArm * build;
  const a1 = Math.PI / 2 * 0 + a.sh;
  const ex = shx + Math.sin(a1) * ua, ey = shy - (-Math.cos(a1) * ua);
  const a2 = a1 + a.el;
  const wx = ex + Math.sin(a2) * fa, wy = ey + Math.cos(a2) * fa;
  return { sh: [shx, shy], el: [ex, ey], wr: [wx, wy], a1, a2 };
}

function limb(ctx, p0, p1, w0, w1, skin, dark, outline) {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  ctx.beginPath();
  ctx.moveTo(p0[0] + nx * w0, p0[1] + ny * w0);
  ctx.quadraticCurveTo(p0[0] + dx * 0.5 + nx * (w0 + w1) * 0.56, p0[1] + dy * 0.5 + ny * (w0 + w1) * 0.56,
    p1[0] + nx * w1, p1[1] + ny * w1);
  ctx.arc(p1[0], p1[1], w1, Math.atan2(ny, nx), Math.atan2(-ny, -nx));
  ctx.quadraticCurveTo(p0[0] + dx * 0.5 - nx * (w0 + w1) * 0.56, p0[1] + dy * 0.5 - ny * (w0 + w1) * 0.56,
    p0[0] - nx * w0, p0[1] - ny * w0);
  ctx.arc(p0[0], p0[1], w0, Math.atan2(-ny, -nx), Math.atan2(ny, nx));
  ctx.closePath();
  ctx.fillStyle = skin; ctx.fill();
  if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = 1.3; ctx.stroke(); }
  ctx.save(); ctx.clip();
  const g = ctx.createLinearGradient(p0[0] + nx * w0, p0[1] + ny * w0, p0[0] - nx * w0, p0[1] - ny * w0);
  g.addColorStop(0, 'rgba(255,240,210,0.12)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, rgba(dark, 0.42));
  ctx.fillStyle = g;
  ctx.fillRect(Math.min(p0[0], p1[0]) - w0 * 2, Math.min(p0[1], p1[1]) - w0 * 2, Math.abs(dx) + w0 * 4, Math.abs(dy) + w0 * 4);
  ctx.restore();
}

function jointPatch(ctx, p, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.fill();
}

// PAINTED LIMB: a whole joint chain (shoulder→elbow→wrist, or hip→knee→ankle)
// rendered as ONE tapering form with a SINGLE continuous calligraphic contour —
// no capsule seams, no joint dots. Reads as one painted stroke, not a puppet.
function limbChain(ctx, joints, ws, skin, dark, outline) {
  const spine = [], W = [], seg = joints.length - 1, N = 5;
  for (let s = 0; s < seg; s++) for (let k = 0; k < N; k++) {
    const u = k / N;
    spine.push([lerp(joints[s][0], joints[s + 1][0], u), lerp(joints[s][1], joints[s + 1][1], u)]);
    W.push(lerp(ws[s], ws[s + 1], u));
  }
  spine.push(joints[seg]); W.push(ws[seg]);
  const n = spine.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const p = spine[i], q = spine[Math.min(i + 1, n - 1)], r = spine[Math.max(i - 1, 0)];
    let dx = q[0] - r[0], dy = q[1] - r[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    L.push([p[0] - dy * W[i], p[1] + dx * W[i]]);
    R.push([p[0] + dy * W[i], p[1] - dx * W[i]]);
  }
  const s0 = spine[0], sN = spine[n - 1];
  let e0x = spine[1][0] - s0[0], e0y = spine[1][1] - s0[1]; { const l = Math.hypot(e0x, e0y) || 1; e0x /= l; e0y /= l; }
  let eNx = sN[0] - spine[n - 2][0], eNy = sN[1] - spine[n - 2][1]; { const l = Math.hypot(eNx, eNy) || 1; eNx /= l; eNy /= l; }
  const nS = [-e0y, e0x], nE = [-eNy, eNx];
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
    ctx.arc(sN[0], sN[1], W[n - 1], Math.atan2(nE[1], nE[0]), Math.atan2(-nE[1], -nE[0]));
    for (let i = n - 2; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.arc(s0[0], s0[1], W[0], Math.atan2(-nS[1], -nS[0]), Math.atan2(nS[1], nS[0]));
    ctx.closePath();
  };
  path(); ctx.fillStyle = skin; ctx.fill();
  // modelled shading (light one edge, shadow the other, along the chain)
  ctx.save(); path(); ctx.clip();
  const g = ctx.createLinearGradient(L[0][0], L[0][1], R[0][0], R[0][1]);
  g.addColorStop(0, 'rgba(255,240,210,0.14)'); g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(1, rgba(dark, 0.42));
  ctx.fillStyle = g;
  let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
  for (const p of L.concat(R)) { mnx = Math.min(mnx, p[0]); mxx = Math.max(mxx, p[0]); mny = Math.min(mny, p[1]); mxy = Math.max(mxy, p[1]); }
  ctx.fillRect(mnx - 4, mny - 4, mxx - mnx + 8, mxy - mny + 8);
  ctx.restore();
  if (outline) {
    path();
    ctx.strokeStyle = outline; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 1.7;
    ctx.stroke();
  }
}

// ─────────────────────────── HANDS ───────────────────────────
// Reworked: real palm + 3 grouped fingers + thumb, knuckle curves, per-kind
// articulation. Hand-local: origin = wrist, +y = down the hand (finger side).
// kinds: relaxed | fist | hold | open | bless | point | namaste | claw
function _finger(ctx, x0, y0, x1, y1, w0, w1, skin, dark, claw) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  ctx.beginPath();
  ctx.moveTo(x0 + nx * w0, y0 + ny * w0);
  ctx.lineTo(x1 + nx * w1, y1 + ny * w1);
  ctx.arc(x1, y1, w1, Math.atan2(ny, nx), Math.atan2(-ny, -nx));
  ctx.lineTo(x0 - nx * w0, y0 - ny * w0);
  ctx.closePath();
  ctx.fillStyle = skin; ctx.fill();
  ctx.strokeStyle = rgba('#241005', 0.55); ctx.lineWidth = 0.7; ctx.stroke();
  // shading down the far edge + a knuckle crease
  ctx.strokeStyle = rgba(dark, 0.4); ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(x0 - nx * w0 * 0.6 + ux * L * 0.4, y0 - ny * w0 * 0.6 + uy * L * 0.4);
  ctx.lineTo(x1 - nx * w1 * 0.6, y1 - ny * w1 * 0.6); ctx.stroke();
  ctx.beginPath(); ctx.arc(x0 + ux * L * 0.42, y0 + uy * L * 0.42, w0 * 0.85, Math.atan2(ny, nx) - 0.5, Math.atan2(ny, nx) + 0.5); ctx.stroke();
  if (claw) {
    ctx.fillStyle = '#efe7d4';
    ctx.beginPath();
    ctx.moveTo(x1 + nx * w1 * 0.8, y1 + ny * w1 * 0.8);
    ctx.lineTo(x1 + ux * w1 * 2.3, y1 + uy * w1 * 2.3);
    ctx.lineTo(x1 - nx * w1 * 0.8, y1 - ny * w1 * 0.8);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#241005', 0.5); ctx.lineWidth = 0.5; ctx.stroke();
  }
}

function _knuckle(ctx, x, y, r, skin, dark) {
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba('#241005', 0.55); ctx.lineWidth = 0.6; ctx.stroke();
  ctx.strokeStyle = rgba(dark, 0.5); ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.arc(x, y - r * 0.2, r * 0.72, 0.5, 2.6); ctx.stroke();
}

function drawHand(ctx, x, y, ang, s, skin, kind, dark, opt) {
  opt = opt || {};
  const claw = !!opt.claw || kind === 'claw';
  if (kind === 'claw') kind = 'open';
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const OUT = rgba('#241005', 0.6);
  const pW = 6.2, pTop = 6.3, pWr = 4.6, pH = 8.5;
  const palm = () => {
    ctx.beginPath();
    ctx.moveTo(-pWr, -2.6);
    ctx.quadraticCurveTo(-pW - 0.4, pH * 0.5, -pTop, pH);
    ctx.quadraticCurveTo(0, pH + 1.7, pTop, pH);
    ctx.quadraticCurveTo(pW + 0.4, pH * 0.5, pWr, -2.6);
    ctx.quadraticCurveTo(0, -4.1, -pWr, -2.6);
    ctx.closePath();
  };

  // thumb drawn first for fist/hold so fingers wrap over it; else after
  const thumbOver = (kind === 'fist' || kind === 'hold');
  const drawThumb = () => {
    if (thumbOver) {
      _finger(ctx, -pW + 1.2, pH * 0.62, pTop * 0.28, pH * 0.5, 2.4, 1.7, skin, dark, false);
    } else if (kind === 'namaste') {
      _finger(ctx, -pW + 1.0, 1.0, -pW - 0.6, -3.2, 2.3, 1.5, skin, dark, false);
    } else {
      const tx = kind === 'point' ? -pW - 0.6 : -pW - 2.4;
      _finger(ctx, -pW + 1.4, 1.8, tx, 3.2, 2.5, 1.7, skin, dark, claw);
    }
  };

  if (thumbOver) drawThumb();

  // palm
  palm(); ctx.fillStyle = skin; ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = 0.7; ctx.stroke();
  ctx.save(); palm(); ctx.clip();
  const pg = ctx.createLinearGradient(-pW, 0, pW, 0);
  pg.addColorStop(0, rgba(dark, 0.35)); pg.addColorStop(0.5, 'rgba(0,0,0,0)'); pg.addColorStop(1, 'rgba(255,240,210,0.16)');
  ctx.fillStyle = pg; ctx.fillRect(-pW - 2, -3.4, pW * 2 + 4, pH + 6);
  // palm heel crease
  ctx.strokeStyle = rgba(dark, 0.3); ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.arc(-1.5, 1, 4, 0.3, 1.5); ctx.stroke();
  ctx.restore();

  // three grouped fingers along the knuckle line (near-touching, gentle splay)
  const fX = [-3.4, -0.3, 2.9], fLen = [10, 11.6, 9.6], fSpread = [-0.11, 0.0, 0.11], fW = [2.3, 2.45, 2.25];
  const curlOf = { open: 0, bless: 0, namaste: 0, point: 0, hold: 1, fist: 1, relaxed: 0.42 };
  const cu = curlOf[kind] == null ? 0.3 : curlOf[kind];
  const knuckY = pH - 1.5;
  for (let i = 0; i < 3; i++) {
    const isPoint = kind === 'point';
    if (isPoint && i !== 1) { _knuckle(ctx, fX[i], knuckY, 2.0 - i * 0.08, skin, dark); continue; }
    if (cu >= 1) { _knuckle(ctx, fX[i], knuckY, 2.15, skin, dark); continue; }
    let dir = fSpread[i];
    if (kind === 'namaste') dir *= 0.25;                // fingers together, upright
    if (claw) dir *= 1.5;                               // claws splay a little
    const L = fLen[i] * (1 - cu * 0.5) * (isPoint ? 1.18 : 1);
    const bx = fX[i], by = knuckY;
    const tx = bx + Math.sin(dir) * L;
    const ty = by + Math.cos(dir) * L - cu * 2.2;
    _finger(ctx, bx, by, tx, ty, fW[i], fW[i] * 0.7, skin, dark, claw);
  }

  if (!thumbOver) drawThumb();
  ctx.restore();
}

// ─────────────────────────── HEAD ───────────────────────────
function drawEye(ctx, ex, ey, s, open, gaze, style, f, side) {
  const o = clamp(open, 0.04, 1.25);
  ctx.save(); ctx.translate(ex, ey);
  const w = s, hUp = s * 0.34 * o, hDn = s * 0.30 * (0.6 + 0.4 * o);
  ctx.beginPath();
  ctx.moveTo(-w * 1.05, 0.02);
  ctx.quadraticCurveTo(-w * 0.2, -hUp, w * 0.55, -hUp * 0.35);
  ctx.quadraticCurveTo(w * 0.7, 0, w * 0.5, hDn * 0.3);
  ctx.quadraticCurveTo(-w * 0.2, hDn, -w * 1.05, 0.02);
  ctx.closePath();
  ctx.fillStyle = '#f7ecdc'; ctx.fill();
  ctx.save(); ctx.clip();
  const ix = gaze.x * s * 0.22 + s * 0.05, iy = gaze.y * s * 0.14;
  ctx.fillStyle = style.iris || '#37200e';
  ctx.beginPath(); ctx.arc(ix, iy, s * 0.26, 0, TAU); ctx.fill();
  ctx.fillStyle = '#120a04';
  ctx.beginPath(); ctx.arc(ix, iy, s * 0.13, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.arc(ix - s * 0.07, iy - s * 0.08, s * 0.045, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(90,50,25,0.30)';
  ctx.fillRect(-w * 1.1, -hUp, 2.2 * w, hUp * 0.45);
  ctx.restore();
  ctx.strokeStyle = '#170b04';
  ctx.lineWidth = s * 0.10; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-w * 1.05, 0.02);
  ctx.quadraticCurveTo(-w * 0.2, -hUp * 1.06, w * 0.55, -hUp * 0.38);
  ctx.stroke();
  ctx.lineWidth = s * 0.05;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, hDn * 0.32);
  ctx.quadraticCurveTo(-w * 0.25, hDn * 1.02, -w * 1.02, 0.03);
  ctx.stroke();
  ctx.lineWidth = s * 0.09;
  ctx.beginPath(); ctx.moveTo(-w * 1.02, 0.02); ctx.lineTo(-w * 1.38, -s * 0.10); ctx.stroke();
  ctx.restore();
}

function browStroke(ctx, x, y, len, raise, side, tilt, heavy) {
  tilt = tilt || 0; const hv = heavy ? 1.6 : 1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + len * 0.62, y + 0.02 + raise * 0.01);
  ctx.quadraticCurveTo(x, y - 0.10 - raise * 0.05, x - len, y + 0.05 - raise * 0.08 - tilt);
  ctx.lineWidth = 0.065 * hv; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + len * 0.62, y + 0.02 + raise * 0.01);
  ctx.quadraticCurveTo(x, y - 0.095 - raise * 0.05, x - len * 0.5, y - 0.02 - raise * 0.06 - tilt * 0.6);
  ctx.lineWidth = 0.09 * hv; ctx.stroke();
}

function drawTilak(ctx, x, y, kind) {
  if (kind === 'urdhva') {
    ctx.strokeStyle = '#e8dfc8'; ctx.lineWidth = 0.05;
    ctx.beginPath(); ctx.moveTo(x - 0.09, y - 0.14); ctx.quadraticCurveTo(x - 0.02, y + 0.16, x + 0.0, y + 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 0.11, y - 0.14); ctx.quadraticCurveTo(x + 0.05, y + 0.13, x + 0.0, y + 0.1); ctx.stroke();
    ctx.strokeStyle = '#c92f1d';
    ctx.beginPath(); ctx.moveTo(x + 0.01, y - 0.12); ctx.lineTo(x + 0.01, y + 0.08); ctx.stroke();
  } else if (kind === 'tripundra') {
    ctx.strokeStyle = '#e0d6bd'; ctx.lineWidth = 0.045;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(x - 0.22, y + i * 0.09); ctx.quadraticCurveTo(x, y + i * 0.09 + 0.03, x + 0.24, y + i * 0.09); ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#c92f1d';
    ctx.beginPath(); ctx.ellipse(x, y, 0.045, 0.1, 0, 0, TAU); ctx.fill();
  }
}

function drawBackHair(ctx, style, t, seed) {
  const c = style.hairColor || '#150c06';
  const mode = style.hairstyle;
  ctx.fillStyle = c;
  if (style.mane) {
    // wild rakshasa mane — jagged mass behind the skull
    ctx.beginPath(); ctx.moveTo(0.1, -1.0);
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * (0.5 + i / 12 * 1.15);
      const r = 1.15 + sfbm1(i * 1.7 + t * 0.4, seed) * 0.45;
      ctx.lineTo(Math.cos(a) * r - 0.15, Math.sin(a) * r * 1.25 + 0.2);
    }
    ctx.closePath(); ctx.fill();
    return;
  }
  if (mode === 'braid' || mode === 'long') {
    ctx.beginPath();
    ctx.moveTo(-0.2, -1.05);
    ctx.quadraticCurveTo(-1.25, -0.6, -1.12, 0.6);
    ctx.quadraticCurveTo(-1.05, 1.6, -0.8, 2.6 + sfbm1(t * 0.6, seed) * 0.1);
    ctx.quadraticCurveTo(-0.45, 2.8, -0.42, 2.2);
    ctx.quadraticCurveTo(-0.55, 1.2, -0.42, 0.4);
    ctx.quadraticCurveTo(-0.5, -0.4, 0.1, -0.92);
    ctx.closePath(); ctx.fill();
    if (mode === 'braid') {
      ctx.strokeStyle = 'rgba(60,38,20,0.8)'; ctx.lineWidth = 0.045;
      for (let i = 0; i < 7; i++) {
        const u = i / 7, yy = 0.3 + u * 2.0;
        ctx.beginPath();
        ctx.arc(-0.78 - sfbm1(u * 3, seed) * 0.06, yy, 0.16, -0.7, 1.9);
        ctx.stroke();
      }
    }
  } else if (mode === 'sagebun' || mode === 'bun') {
    ctx.beginPath(); ctx.ellipse(-0.55, -0.85, 0.42, 0.36, -0.5, 0, TAU); ctx.fill();
  }
}

function drawFrontHair(ctx, style, tn, t, seed) {
  const c = style.hairColor || '#150c06';
  const mode = style.hairstyle;
  const P = (a, b) => lerp(a, b, Math.min(tn, 0.62) / 0.62);
  ctx.fillStyle = c;
  if (style.mane) {
    // spiky forehead hairline + temple tufts
    ctx.beginPath();
    ctx.moveTo(P(0.66, 0.56), -0.7);
    for (let i = 0; i <= 6; i++) {
      const u = i / 6;
      const zx = lerp(P(0.62, 0.5), -0.95, u);
      const zy = -0.55 - (i % 2 ? 0.28 : 0.05) - sfbm1(i * 2 + t * 0.3, seed) * 0.12;
      ctx.lineTo(zx, zy);
      ctx.lineTo(lerp(P(0.6, 0.48), -0.9, u + 0.06), -0.5);
    }
    ctx.quadraticCurveTo(-0.9, -0.3, -0.72, 0.4);
    ctx.quadraticCurveTo(-0.4, -0.4, P(0.5, 0.42), -0.55);
    ctx.closePath(); ctx.fill();
    return;
  }
  if (mode === 'veil') {
    ctx.beginPath();
    ctx.moveTo(P(0.60, 0.50), -0.70);
    ctx.quadraticCurveTo(0.0, -1.0, -0.55, -0.72);
    ctx.quadraticCurveTo(0.0, -0.82, P(0.52, 0.44), -0.60);
    ctx.closePath(); ctx.fill();
    if (style.veil) {
      ctx.fillStyle = style.veil;
      ctx.beginPath();
      ctx.moveTo(P(0.66, 0.56), -0.72);
      ctx.quadraticCurveTo(0.15, -1.28, -0.75, -0.98);
      ctx.quadraticCurveTo(-1.25, -0.55, -1.18, 0.35);
      ctx.quadraticCurveTo(-1.1, 0.9, -0.95, 1.15);
      ctx.lineTo(-0.72, 1.05);
      ctx.quadraticCurveTo(-0.95, 0.3, -0.88, -0.30);
      ctx.quadraticCurveTo(-0.75, -0.92, -0.05, -0.98);
      ctx.quadraticCurveTo(0.45, -0.92, P(0.60, 0.50), -0.62);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgbaC('#241005', 0.45); ctx.lineWidth = 0.035; ctx.stroke();
    }
    return;
  }
  if (style.crown === 'turban') {
    ctx.strokeStyle = c; ctx.lineWidth = 0.055; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.30, -0.22);
    ctx.quadraticCurveTo(-0.40, 0.02, -0.36, 0.26);
    ctx.stroke();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(P(0.66, 0.56), -0.78);
  ctx.quadraticCurveTo(P(0.86, 0.8), -0.55, P(0.62, 0.52), -0.44);
  ctx.quadraticCurveTo(P(0.7, 0.62), -0.7, P(0.2, 0.15), -0.78);
  ctx.quadraticCurveTo(-0.7, -1.0, -1.02, -0.25);
  ctx.quadraticCurveTo(-1.12, 0.35, -0.75, 0.75);
  ctx.quadraticCurveTo(-0.85, 0.1, -0.72, -0.35);
  ctx.quadraticCurveTo(-0.35, -0.72, 0.25, -0.62);
  ctx.quadraticCurveTo(P(0.5, 0.42), -0.6, P(0.66, 0.56), -0.78);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-0.12, -0.72, 0.95, 0.5, 0.08, Math.PI * 0.95, Math.PI * 2.02);
  ctx.quadraticCurveTo(P(0.3, 0.2), -0.5, -0.12, -0.5);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(120,90,150,0.30)'; ctx.lineWidth = 0.05; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(-0.1, -0.35, 0.72, -1.9, -1.15); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.03;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.arc(-0.1, -0.3 + i * 0.02, 0.78 - i * 0.05, -1.95 + i * 0.12, -0.9 - i * 0.1); ctx.stroke();
  }
  if (mode === 'topknot') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(-0.15, -1.22, 0.30, 0.24, -0.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,90,150,0.3)'; ctx.lineWidth = 0.04;
    ctx.beginPath(); ctx.arc(-0.18, -1.22, 0.2, -2.6, -0.9); ctx.stroke();
    ctx.strokeStyle = '#8a2f1d'; ctx.lineWidth = 0.06;
    ctx.beginPath(); ctx.arc(-0.15, -1.06, 0.16, -0.6, 0.9); ctx.stroke();
  }
  if (mode === 'sagebun') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(-0.05, -1.18, 0.4, 0.3, -0.15, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.035;
    ctx.beginPath(); ctx.arc(-0.05, -1.18, 0.3, 2.5, 5.8); ctx.stroke();
    ctx.fillStyle = '#6d4423';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-0.35 + i * 0.2, -1.02, 0.05, 0, TAU); ctx.fill(); }
  }
  if (mode === 'braid' || mode === 'long') {
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.03;
    ctx.beginPath(); ctx.moveTo(P(0.4, 0.33), -0.86); ctx.quadraticCurveTo(-0.1, -1.1, -0.5, -0.95); ctx.stroke();
    if (style.hairFlowers) {
      ctx.fillStyle = '#fdf4e0';
      for (let i = 0; i < 5; i++) {
        const u = i / 4;
        ctx.beginPath();
        ctx.arc(lerp(-0.85, -0.55, u), lerp(-0.15, -0.95, u) + 0.03 * Math.sin(i * 9), 0.055, 0, TAU);
        ctx.fill();
      }
    }
  }
}

function drawPeacockFeather(ctx, tn, t, seed) {
  ctx.save();
  const sway = sfbm1(t * 0.8, seed) * 0.06;
  ctx.translate(-0.25, -1.05); ctx.rotate(-0.5 + sway);
  ctx.strokeStyle = '#2e6b2e'; ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0.1, -0.35, 0.05, -0.62); ctx.stroke();
  const g = ctx.createRadialGradient(0.05, -0.72, 0.01, 0.05, -0.72, 0.3);
  g.addColorStop(0, '#0d2c6e'); g.addColorStop(0.45, '#1f7a4d'); g.addColorStop(0.8, '#2ea86a'); g.addColorStop(1, 'rgba(46,168,106,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0.05, -0.72, 0.22, 0.34, 0.1, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0d2c6e';
  ctx.beginPath(); ctx.ellipse(0.05, -0.70, 0.075, 0.12, 0.1, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c98f1e';
  ctx.beginPath(); ctx.ellipse(0.05, -0.66, 0.035, 0.05, 0.1, 0, TAU); ctx.fill();
  ctx.restore();
}

// rakshasa horns (head-local)
function drawHorns(ctx, P, front) {
  const g = ctx.createLinearGradient(0, -1.3, 0, -0.6);
  g.addColorStop(0, '#3a2a1c'); g.addColorStop(1, '#6a5238');
  ctx.fillStyle = g; ctx.strokeStyle = rgba('#1a0f06', 0.6); ctx.lineWidth = 0.04;
  const horn = (bx, dir) => {
    ctx.beginPath();
    ctx.moveTo(bx, -0.66);
    ctx.quadraticCurveTo(bx + dir * 0.5, -1.15, bx + dir * 0.62, -1.6);
    ctx.quadraticCurveTo(bx + dir * 0.34, -1.2, bx + dir * 0.16, -0.78);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,210,0.18)';
    ctx.beginPath(); ctx.ellipse(bx + dir * 0.36, -1.1, 0.05, 0.18, dir * 0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = g;
  };
  horn(lerp(P(0.42, 0.34), 0.26, front), 1);
  horn(lerp(-0.34, -0.26, front), -1);
}

// facial hair (beard + moustache), plus rakshasa tusks. Ported; back-compatible.
function drawFacialHair(ctx, style, f, tn, mouth) {
  const P = (a, b) => lerp(a, b, Math.min(tn, 0.62) / 0.62);
  const hairC = style.hairColor || '#170d08';
  const mth = mouth.mth, mw = mouth.mw, my = mouth.my;
  if (style.beard) {
    const bc = style.beard === 'white' ? '#e8e0d2' : (style.beard === 'grey' ? '#9a8f80' : hairC);
    const len = style.beardLen || 0.3;
    ctx.fillStyle = bc;
    ctx.beginPath();
    ctx.moveTo(P(0.88, 0.72), 0.47);
    ctx.quadraticCurveTo(P(0.95, 0.78), 0.66, P(0.80, 0.62), 0.84);
    ctx.quadraticCurveTo(P(0.72, 0.55), 1.05 + len, P(0.30, 0.20), 1.12 + len);
    ctx.quadraticCurveTo(P(-0.05, -0.1), 1.10 + len * 0.9, P(-0.22, -0.24), 0.78);
    ctx.quadraticCurveTo(P(-0.28, -0.28), 0.45, P(-0.20, -0.22), 0.32);
    ctx.quadraticCurveTo(P(0.15, 0.10), 0.92, P(0.60, 0.48), 0.62);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgbaC('#241005', 0.35); ctx.lineWidth = 0.028; ctx.stroke();
    ctx.strokeStyle = rgbaC(style.beard === 'white' || style.beard === 'grey' ? '#8a8072' : '#000', 0.35);
    ctx.lineWidth = 0.02;
    for (let i = 0; i < 4; i++) {
      const u = i / 3;
      ctx.beginPath();
      ctx.moveTo(lerp(P(0.72, 0.56), P(-0.05, -0.1), u), 0.75 + 0.06 * Math.sin(i * 5));
      ctx.quadraticCurveTo(lerp(P(0.66, 0.5), P(0.0, -0.05), u), 0.95 + len * 0.5,
        lerp(P(0.55, 0.42), P(0.08, 0.0), u), 1.06 + len * (0.92 - 0.1 * u));
      ctx.stroke();
    }
  }
  if (style.moustache) {
    const bc = style.beard === 'white' ? '#ddd4c4' : (style.beard === 'grey' ? '#8f8478' : hairC);
    ctx.strokeStyle = bc; ctx.lineWidth = 0.07; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(mth + 0.04, my - 0.08);
    ctx.quadraticCurveTo(mth - mw * 0.7, my - 0.115, mth - mw - 0.11, my - 0.17 - (style.moustache === 2 ? 0.06 : 0));
    ctx.stroke();
  }
  if (style.tusks) {
    ctx.fillStyle = '#efe7d2'; ctx.strokeStyle = rgba('#241005', 0.5); ctx.lineWidth = 0.025;
    // short fangs rooted at the lower lip, curving up-and-out from each corner
    const tusk = (cx, dir) => {
      ctx.beginPath();
      ctx.moveTo(cx, my + 0.075);
      ctx.quadraticCurveTo(cx + dir * 0.055, my + 0.0, cx + dir * 0.05, my - 0.10);
      ctx.quadraticCurveTo(cx + dir * 0.006, my - 0.02, cx - dir * 0.028, my + 0.065);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    };
    tusk(mth - mw * 0.62, 1);
    tusk(mth - mw * 0.02, -1);
  }
}

// composite headgear: tilak, bindi, horns, crown, peacock. Back-compatible.
function drawHeadgear(ctx, style, tn, t, seed) {
  const tnP = Math.min(tn, 0.62), front = norm(tn, 0.62, 0.85);
  const P = (a, b) => lerp(a, b, tnP / 0.62);
  if (style.tilak) drawTilak(ctx, lerp(P(0.64, 0.53), 0.0, front), -0.44, style.tilak);
  if (style.bindi) { ctx.fillStyle = '#c92f1d'; ctx.beginPath(); ctx.arc(lerp(P(0.62, 0.51), 0.0, front), -0.44, 0.05, 0, TAU); ctx.fill(); }
  if (style.horns) drawHorns(ctx, P, front);
  if (style.crown) drawCrown(ctx, style, tn);
  if (style.peacock) drawPeacockFeather(ctx, tn, t, seed);
}

// face: {turn(0=profile→0.85 near-front), smile, eyeOpen, gaze{x,y}, brow,
//        lipsPart, lowered, rage, laugh, weep}
function drawHead(ctx, R, style, face, t, seed, rig) {
  const f = Object.assign({ turn: 0.28, smile: 0.12, eyeOpen: 1, gaze: { x: 0, y: 0 }, brow: 0, lipsPart: 0, lowered: 0, rage: 0, laugh: 0, weep: 0 }, face);
  const skin = style.skin, dark = style.skinShade || shade(skin, -0.28);
  const tn = clamp(f.turn, 0, 0.85);
  const tnP = Math.min(tn, 0.62);
  const P = (px, fx) => lerp(px, fx, tnP / 0.62);   // profile→¾ (identical to legacy for tn≤0.62)
  const front = norm(tn, 0.62, 0.85);               // 0 in legacy range → 1 near-frontal
  const hooks = rig || {};

  ctx.save();
  ctx.scale(R, R);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  const bl = (() => {
    const cyc = (t * 0.31 + hash1(seed) * 7) % 4.2;
    const b = cyc < 0.12 ? Math.sin(cyc / 0.12 * Math.PI) : 0;
    return clamp(f.eyeOpen - b * 1.2, 0.04, 1.25);
  })();

  // nose tip x — foreshortens toward centre as the face turns frontal
  const nose = (1.18 - tn * 0.34) * (1 - front * 0.3) * (style.noseScale || 1);
  // profile silhouette (x via P → identical to legacy at front=0)
  const pr = [
    [P(-0.02, 0.0), -1.06], [P(0.62, 0.52), -0.86], [P(0.80, 0.66), -0.52],
    [P(0.88, 0.72), -0.26], [P(0.86, 0.70), -0.16], [P(nose * 0.94, nose * 0.94), 0.02],
    [P(nose, nose), 0.115], [P(0.88, 0.74), 0.205], [P(0.92, 0.76), 0.315 - f.smile * 0.012],
    [P(0.86, 0.70), 0.40], [P(0.91, 0.73), 0.50 + f.lipsPart * 0.03], [P(0.84, 0.66), 0.60],
    [P(0.83, 0.62), 0.78], [P(0.45, 0.34), 0.98], [P(-0.10, -0.14), 1.00],
    [-0.62, 0.62], [-0.98, 0.10], [-0.86, -0.62],
  ];
  // frontal targets: a symmetric oval (cheek edges take over where the nose was)
  const frT = [
    [0.0, -1.06], [0.72, -0.82], [0.82, -0.5], [0.84, -0.24], [0.82, -0.12],
    [0.8, 0.02], [0.82, 0.12], [0.8, 0.24], [0.74, 0.35], [0.7, 0.43], [0.66, 0.52],
    [0.5, 0.64], [0.3, 0.82], [0.12, 0.96], [-0.2, 0.95], [-0.8, 0.55], [-0.9, -0.06], [-0.74, -0.8],
  ];
  const sil = front > 0 ? pr.map((p, i) => [lerp(p[0], frT[i][0], front), lerp(p[1], frT[i][1], front)]) : pr;
  const headPath = () => { ctx.beginPath(); smoothPath(ctx, sil, true); };

  drawBackHair(ctx, style, t, seed);

  headPath();
  ctx.fillStyle = skin; ctx.fill();

  ctx.save();
  headPath(); ctx.clip();
  let g = ctx.createRadialGradient(0.45, -0.1, 0.3, 0, 0, 1.35);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, rgbaC(dark, 0.5));
  ctx.fillStyle = g; ctx.fillRect(-1.4, -1.3, 2.9, 2.6);
  g = ctx.createRadialGradient(lerp(0.55, 0.15, front), -0.42, 0.05, lerp(0.55, 0.15, front), -0.42, 0.9);
  g.addColorStop(0, 'rgba(255,244,214,0.30)'); g.addColorStop(1, 'rgba(255,244,214,0)');
  ctx.fillStyle = g; ctx.fillRect(-1.4, -1.3, 2.9, 2.6);
  g = ctx.createRadialGradient(P(0.42, 0.30), 0.28, 0.02, P(0.42, 0.30), 0.28, 0.42);
  g.addColorStop(0, 'rgba(224,96,66,0.22)'); g.addColorStop(1, 'rgba(224,96,66,0)');
  ctx.fillStyle = g; ctx.fillRect(-1.4, -1.3, 2.9, 2.6);
  if (front > 0.25) { // symmetric far cheek warmth
    g = ctx.createRadialGradient(-0.42 * front, 0.28, 0.02, -0.42 * front, 0.28, 0.42);
    g.addColorStop(0, `rgba(224,96,66,${0.22 * front})`); g.addColorStop(1, 'rgba(224,96,66,0)');
    ctx.fillStyle = g; ctx.fillRect(-1.4, -1.3, 2.9, 2.6);
  }
  ctx.fillStyle = rgbaC(dark, 0.30);
  ctx.beginPath(); ctx.ellipse(P(0.3, 0.24), 0.86, 0.5, 0.2, 0.25, 0, TAU); ctx.fill();
  ctx.restore();

  headPath();
  ctx.strokeStyle = rgbaC('#241005', 0.85); ctx.lineWidth = 0.045; ctx.stroke();

  // ── ears ──
  const earOne = (ex, ey, mirror) => {
    ctx.save(); if (mirror) { ctx.translate(ex, 0); ctx.scale(-1, 1); ex = 0; }
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.ellipse(ex, ey, 0.125, 0.21, -0.12, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgbaC('#241005', 0.7); ctx.lineWidth = 0.04; ctx.stroke();
    ctx.strokeStyle = rgbaC(dark, 0.8); ctx.lineWidth = 0.03;
    ctx.beginPath(); ctx.arc(ex + 0.015, ey - 0.02, 0.06, -2.4, 0.6); ctx.stroke();
    if (style.earring) {
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(ex, ey + 0.20, 0.05, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(ex - 0.075, ey + 0.26); ctx.quadraticCurveTo(ex, ey + 0.40, ex + 0.075, ey + 0.26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = GOLD_L; ctx.beginPath(); ctx.arc(ex - 0.018, ey + 0.19, 0.018, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fdf6ec'; ctx.beginPath(); ctx.arc(ex, ey + 0.435, 0.032, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };
  if (front < 0.4 && tn < 0.55) earOne(-0.26 + tn * 0.08, 0.08, false);
  if (front > 0.35) { ctx.save(); ctx.globalAlpha = norm(front, 0.35, 0.7); earOne(0.78, 0.06, false); earOne(-0.78, 0.06, true); ctx.restore(); }

  // ── brows & eyes ──
  const eyeY = -0.10 + f.lowered * 0.03;
  const nearEx = P(0.52, 0.34);
  const gz = { x: clamp(f.gaze.x, -1, 1), y: clamp(f.gaze.y + f.lowered * 0.9, -1, 1) };
  drawEye(ctx, nearEx, eyeY, 0.30, bl, gz, style, f, 1);
  if (tn > 0.22) {
    const k = norm(tn, 0.22, 0.55);
    const farEx = lerp(P(-0.35, -0.26), -nearEx, front);
    const sz = lerp(0.30 * (0.55 + 0.45 * k) * 0.9, 0.30, front);
    ctx.save(); ctx.globalAlpha = front > 0.25 ? 1 : Math.max(k, front);
    if (front > 0.25) { ctx.translate(farEx, 0); ctx.scale(-1, 1); drawEye(ctx, 0, eyeY, sz, bl, { x: -gz.x, y: gz.y }, style, f, -1); }
    else drawEye(ctx, farEx, eyeY + 0.005, sz, bl, gz, style, f, -1);
    ctx.restore();
  }
  // brows (rage compresses/lowers, weep tilts inner ends up)
  const heavy = !!style.heavyBrow;
  const browTilt = f.weep * 0.06 - f.rage * 0.05;
  const browY = f.rage * 0.05;
  ctx.strokeStyle = '#1d0f06';
  browStroke(ctx, nearEx, eyeY - 0.20 - f.brow * 0.07 + browY, 0.34 * (1 - front * 0.18), f.brow - f.rage * 0.6, 1, browTilt, heavy);
  if (tn > 0.22) {
    const farBx = lerp(P(-0.35, -0.26), -nearEx, front);
    ctx.save(); ctx.globalAlpha = front > 0.25 ? 1 : Math.max(norm(tn, 0.22, 0.55), front);
    if (front > 0.25) { ctx.translate(farBx, 0); ctx.scale(-1, 1); browStroke(ctx, 0, eyeY - 0.20 - f.brow * 0.06 + browY, 0.32 * (1 - front * 0.18), f.brow - f.rage * 0.6, -1, browTilt, heavy); }
    else browStroke(ctx, farBx, eyeY - 0.20 - f.brow * 0.06, 0.30, f.brow * 0.8, -1, browTilt, heavy);
    ctx.restore();
  }

  // ── nostril(s) ──
  ctx.strokeStyle = rgbaC('#241005', 0.65); ctx.lineWidth = 0.035;
  if (front < 0.6) {
    ctx.save(); ctx.globalAlpha = 1 - front * 0.9;
    ctx.beginPath(); ctx.arc(P(0.80, 0.62), 0.19, 0.055 * (1 + f.rage * 0.4), Math.PI * 0.25, Math.PI * 1.05); ctx.stroke();
    ctx.restore();
  }
  if (front > 0.3) {
    ctx.save(); ctx.globalAlpha = front;
    // slim refined nose: faint under-tip shadow + small comma nostrils, not a snout
    ctx.fillStyle = rgbaC(dark, 0.16);
    ctx.beginPath(); ctx.ellipse(0.0, 0.19, 0.1, 0.05, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgbaC('#241005', 0.5); ctx.lineWidth = 0.028; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0.075, 0.185, 0.032, Math.PI * 0.15, Math.PI * 1.0); ctx.stroke();
    ctx.beginPath(); ctx.arc(-0.075, 0.185, 0.032, Math.PI * 0.0, Math.PI * 0.85); ctx.stroke();
    // both nose ridges (slim, tapering to the brows) + soft ridge light
    ctx.strokeStyle = rgbaC(dark, 0.26); ctx.lineWidth = 0.024;
    ctx.beginPath(); ctx.moveTo(0.055, -0.2); ctx.quadraticCurveTo(0.04, -0.02, 0.09, 0.16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.055, -0.2); ctx.quadraticCurveTo(-0.04, -0.02, -0.09, 0.16); ctx.stroke();
    ctx.fillStyle = 'rgba(255,244,214,0.26)'; ctx.beginPath(); ctx.ellipse(0.0, 0.04, 0.04, 0.14, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  if (style.noseRing) {
    ctx.strokeStyle = GOLD; ctx.lineWidth = 0.035;
    ctx.beginPath(); ctx.arc(lerp(P(0.86, 0.70), 0.16, front), lerp(0.21, 0.24, front), 0.075, Math.PI * 0.15, Math.PI * 0.95); ctx.stroke();
  }

  // ── lips (two-tone; laugh widens & opens) ──
  const lipC = style.lip || '#a3402e';
  const mth = lerp(P(0.87, 0.70), 0.0, front), mw = 0.20 + tn * 0.14, my = 0.405;
  const sm = (f.smile + f.laugh * 0.6) * 0.05, part = (f.lipsPart + f.laugh * 0.5) * 0.05;
  ctx.fillStyle = shade(lipC, -0.18);
  ctx.beginPath();
  ctx.moveTo(mth - mw, my - sm);
  ctx.quadraticCurveTo(mth - mw * 0.3, my - 0.055 - sm * 0.4, mth + 0.02, my - 0.045);
  ctx.quadraticCurveTo(mth + 0.05, my - 0.02, mth + 0.055, my);
  ctx.quadraticCurveTo(mth - mw * 0.4, my + 0.012, mth - mw, my - sm);
  ctx.fill();
  ctx.fillStyle = lipC;
  ctx.beginPath();
  ctx.moveTo(mth - mw * 0.92, my + 0.005 - sm);
  ctx.quadraticCurveTo(mth - mw * 0.3, my + 0.10 + part, mth + 0.03, my + 0.055 + part * 0.5);
  ctx.quadraticCurveTo(mth - mw * 0.45, my + 0.028, mth - mw * 0.92, my + 0.005 - sm);
  ctx.fill();
  if (part > 0.02) { ctx.fillStyle = '#4a1410'; ctx.beginPath(); ctx.ellipse(mth - mw * 0.35, my + 0.01, mw * 0.5, part * 0.5, 0, 0, TAU); ctx.fill(); }
  // bared / laughing teeth
  if (f.laugh > 0.05 || f.rage > 0.05) {
    const show = Math.max(f.laugh, f.rage * 0.9);
    const tw = mw * 0.62, th = 0.035 + part + show * 0.03;
    ctx.save();
    ctx.fillStyle = '#f3ead9';
    ctx.beginPath(); ctx.ellipse(mth - mw * 0.35, my + 0.02, tw, th, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba('#b3a081', 0.55); ctx.lineWidth = 0.016;
    for (let i = -2; i <= 2; i++) { const tx = mth - mw * 0.35 + i * tw * 0.34; ctx.beginPath(); ctx.moveTo(tx, my + 0.02 - th); ctx.lineTo(tx, my + 0.02 + th * 0.5); ctx.stroke(); }
    if (f.rage > 0.05) { ctx.strokeStyle = rgba('#241005', 0.55); ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(mth - mw * 0.85, my + 0.02); ctx.lineTo(mth + 0.05, my + 0.02); ctx.stroke(); }
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.ellipse(mth - mw * 0.35, my + 0.055, mw * 0.28, 0.018, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = rgbaC('#241005', 0.5);
  ctx.beginPath(); ctx.arc(mth - mw, my - sm, 0.022, 0, TAU); ctx.fill();

  // ── tears (weep) ──
  if (f.weep > 0.05) {
    const tear = (tx, ty) => {
      ctx.fillStyle = 'rgba(196,222,240,0.72)';
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + 0.045, ty + 0.12, tx, ty + 0.2); ctx.quadraticCurveTo(tx - 0.045, ty + 0.12, tx, ty); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(tx - 0.014, ty + 0.11, 0.02, 0, TAU); ctx.fill();
    };
    tear(nearEx + 0.02, eyeY + 0.16);
    if (front > 0.3) tear(-nearEx - 0.02, eyeY + 0.16);
  }

  // ── facial hair (hookable) ──
  const mouth = { mth, mw, my };
  (hooks.drawFacialHair ? hooks.drawFacialHair.bind(hooks) : drawFacialHair)(ctx, style, f, tn, mouth);

  // ── front hair & headgear (hookable) ──
  drawFrontHair(ctx, style, tnP, t, seed);
  (hooks.drawHeadgear ? hooks.drawHeadgear.bind(hooks) : drawHeadgear)(ctx, style, tn, t, seed);

  ctx.restore();
}

// ─────────────────────────── BODY ───────────────────────────
function defaultPoseLocal() { return (typeof defaultPose === 'function') ? defaultPose() : {}; }

// clothed/bare torso body (extracted so the class path & legacy path share it)
function drawTorsoBody(ctx, st, M) {
  const { shoulderY, waistY, hipY, chestTop, shW, hipW, leanDx, skin, dark, female, build, OUT, seed } = M;
  ctx.beginPath();
  ctx.moveTo(leanDx * 0.8 - shW, chestTop + 10);
  ctx.quadraticCurveTo(leanDx * 0.8 - shW - 4, shoulderY + 26, leanDx * 0.3 - FIG.waistW * build, waistY);
  ctx.quadraticCurveTo(-hipW - 2, hipY - 4, -hipW, hipY + 10);
  ctx.lineTo(hipW, hipY + 10);
  ctx.quadraticCurveTo(hipW + 2, hipY - 6, leanDx * 0.3 + FIG.waistW * build, waistY);
  ctx.quadraticCurveTo(leanDx * 0.8 + shW + 5, shoulderY + 24, leanDx * 0.8 + shW, chestTop + 10);
  ctx.quadraticCurveTo(leanDx * 0.8, chestTop - 4, leanDx * 0.8 - shW, chestTop + 10);
  ctx.closePath();
  const bare = !female && (st.garb === 'dhoti' || st.garb === 'royal');
  const torsoPath = () => {
    ctx.beginPath();
    ctx.moveTo(leanDx * 0.8 - shW, chestTop + 10);
    ctx.quadraticCurveTo(leanDx * 0.8 - shW - 4, shoulderY + 26, leanDx * 0.3 - FIG.waistW * build, waistY);
    ctx.quadraticCurveTo(-hipW - 2, hipY - 4, -hipW, hipY + 10);
    ctx.lineTo(hipW, hipY + 10);
    ctx.quadraticCurveTo(hipW + 2, hipY - 6, leanDx * 0.3 + FIG.waistW * build, waistY);
    ctx.quadraticCurveTo(leanDx * 0.8 + shW + 5, shoulderY + 24, leanDx * 0.8 + shW, chestTop + 10);
    ctx.quadraticCurveTo(leanDx * 0.8, chestTop - 4, leanDx * 0.8 - shW, chestTop + 10);
    ctx.closePath();
  };
  if (bare) {
    ctx.fillStyle = skin; ctx.fill();
    ctx.save(); ctx.clip();
    let g = ctx.createLinearGradient(-shW, 0, shW, 0);
    g.addColorStop(0, rgba(dark, 0.5)); g.addColorStop(0.35, 'rgba(0,0,0,0)');
    g.addColorStop(0.75, 'rgba(255,240,205,0.12)'); g.addColorStop(1, rgba(dark, 0.35));
    ctx.fillStyle = g; ctx.fillRect(-shW - 20 + leanDx, chestTop - 10, shW * 2 + 40, -chestTop);
    ctx.strokeStyle = rgba(dark, 0.6); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(leanDx * 0.8 - shW * 0.5, chestTop + 16); ctx.quadraticCurveTo(leanDx * 0.8, chestTop + 21, leanDx * 0.8 + shW * 0.5, chestTop + 15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(leanDx * 0.8 + 2, chestTop + 30); ctx.quadraticCurveTo(leanDx * 0.7, waistY - 24, leanDx * 0.3, waistY - 4); ctx.stroke();
    ctx.beginPath(); ctx.arc(leanDx * 0.4, waistY - 12, 3.0, 0.3, 2.4); ctx.stroke();
    if (st.build && st.build >= 1.2) { // heavy pectoral / belly modelling for rakshasa & giants
      ctx.strokeStyle = rgba(dark, 0.5); ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(leanDx * 0.8 - shW * 0.35, chestTop + 34, shW * 0.4, -0.2, 1.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(leanDx * 0.8 + shW * 0.35, chestTop + 34, shW * 0.4, 1.6, 3.3); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
    if (st.sacredThread) {
      ctx.strokeStyle = '#f5ead2'; ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(leanDx * 0.8 - shW * 0.62, chestTop + 12);
      ctx.quadraticCurveTo(leanDx * 0.4 + 10, waistY - 40, leanDx * 0.3 + FIG.waistW * build * 0.8, waistY + 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leanDx * 0.8 - shW * 0.62, chestTop + 13);
      ctx.quadraticCurveTo(leanDx * 0.4 + 10, waistY - 39, leanDx * 0.3 + FIG.waistW * build * 0.8, waistY + 3);
      ctx.stroke();
    }
  } else {
    const cm = st.clothMain || '#7a4a2e';
    ctx.fillStyle = cm; ctx.fill();
    if (st.pattern) { ctx.save(); torsoPath(); ctx.clip(); applyPattern(ctx, st.pattern, [-shW - 4, chestTop, shW + 4, hipY + 10], seed + 5, st.clothAccent || GOLD); ctx.restore(); }
    ctx.save(); ctx.clip();
    let g = ctx.createLinearGradient(-shW, 0, shW + 14, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.38)'); g.addColorStop(0.45, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(255,235,200,0.14)');
    ctx.fillStyle = g; ctx.fillRect(-shW - 24 + leanDx, chestTop - 10, shW * 2 + 52, -chestTop);
    if (st.garb === 'armor') {
      ctx.strokeStyle = rgba('#5c3a08', 0.55); ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(leanDx * 0.8 - shW, chestTop + 26 + i * 22);
        ctx.quadraticCurveTo(leanDx * 0.6, chestTop + 40 + i * 22, leanDx * 0.3 + shW, chestTop + 26 + i * 22);
        ctx.stroke();
      }
      const mx = leanDx * 0.7, myy = chestTop + 46;
      const mg = ctx.createRadialGradient(mx, myy, 1, mx, myy, 11);
      mg.addColorStop(0, GOLD_L); mg.addColorStop(1, GOLD_D);
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, myy, 10, 0, TAU); ctx.fill();
      ctx.strokeStyle = GOLD_D; ctx.lineWidth = 1.6;
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU;
        ctx.beginPath(); ctx.moveTo(mx + Math.cos(a) * 12, myy + Math.sin(a) * 12);
        ctx.lineTo(mx + Math.cos(a) * 16, myy + Math.sin(a) * 16); ctx.stroke();
      }
    }
    if (female) {
      ctx.fillStyle = skin;
      ctx.fillRect(leanDx * 0.3 - FIG.waistW * build, waistY - 12, FIG.waistW * 2 * build, waistY * 0.001 + 26);
      ctx.fillStyle = rgba(dark, 0.25);
      ctx.fillRect(leanDx * 0.3 - FIG.waistW * build, waistY + 8, FIG.waistW * 2 * build, 6);
    }
    ctx.restore();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
  }
}

// one extra arm (for multi-armed deities): drawn deep, slightly desaturated
function _extraArm(ctx, shx, shy, a, build, skin, dark, OUT, armW, hand, wr) {
  const arm = armChain(shx, shy, a, build);
  const sk = shade(skin, -0.1);
  limbChain(ctx, [arm.sh, arm.el, arm.wr], [armW * 1.04, armW * 0.76, armW * 0.55], sk, dark, OUT);
  drawHand(ctx, arm.wr[0], arm.wr[1], -arm.a2 + (wr || 0), build * 0.95, sk, hand || 'open', dark);
  return arm;
}

// main figure. opts: {x, y(ground), s(scale), facing(1|-1), style, pose, t, seed, shadow[, rig]}
function drawFigure(ctx, o) {
  const st = o.style, pose = Object.assign(defaultPoseLocal(), o.pose);
  const build = st.build || 1;
  const vS = st.heightScale || 1;        // per-instance height (±), kills clone silhouettes
  const shMul = st.shoulderScale || 1;   // shoulder breadth (broad warriors / giants)
  const female = st.female;
  const t = o.t || 0, seed = o.seed || 1;
  const skin = st.skin, dark = st.skinShade || shade(skin, -0.3);
  const OUT = rgba('#241005', 0.4);
  const hooks = o.rig || null;

  if (o.shadow !== false) contactShadow(ctx, o.x, o.y + 4, 95 * o.s * build, 0.34);

  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(o.s * (o.facing || 1), o.s);

  const br = Math.sin(t * 1.55 + seed * 3) * 0.5 + 0.5;

  const shW = FIG.shoulderW * build * shMul * (female ? 0.82 : 1);
  const hipW = FIG.hipW * build * (female ? 1.12 : 1);
  const shoulderY = -FIG.shoulderY * build * vS - br * 1.2;
  const waistY = -FIG.waistY * build * vS, hipY = -FIG.hipY * build * vS;
  const leanDx = Math.sin(pose.lean) * 90;
  const chestTop = shoulderY - 8;
  const M = { shoulderY, waistY, hipY, chestTop, shW, hipW, leanDx, skin, dark, female, build, OUT, t, seed };

  // aura (class path only; Deity → halo/prabhavali). Behind everything.
  if (hooks && hooks.aura) hooks.aura(ctx, M);

  const armW = (female ? 7.5 : 10) * build;

  // extra deity arms — deepest, behind the main pair
  if (st.arms >= 4) {
    _extraArm(ctx, leanDx * 0.8 - shW * 0.82, shoulderY + 24, pose.armB2 || { sh: -0.85, el: 0.55 }, build, skin, dark, OUT, armW, (pose.armB2 && pose.armB2.hand) || 'open', pose.armB2 && pose.armB2.wr);
    _extraArm(ctx, leanDx * 0.8 + shW * 0.86, shoulderY + 26, pose.armF2 || { sh: 0.95, el: 0.55 }, build, skin, dark, OUT, armW, (pose.armF2 && pose.armF2.hand) || 'bless', pose.armF2 && pose.armF2.wr);
  }

  const skirted = st.garb === 'sari' || st.garb === 'robe';
  const groundY = 0;
  function leg(Lg, front) {
    const hx = leanDx * 0.15 + (front ? 6 : -8), hy = hipY + 6;
    const th = FIG.thigh * build * vS, sh = FIG.shin * build * vS;
    const kx2 = hx + Math.sin(Lg.hip) * th;
    const ky2 = hy + Math.cos(Lg.hip) * th;
    const ax = kx2 + Math.sin(Lg.hip - Lg.knee) * sh;
    const ay = ky2 + Math.cos(Lg.hip - Lg.knee) * sh;
    const wTh = 16 * build * (female ? 1.05 : 1), wSh = 9.5 * build;
    const legC = front ? skin : shade(skin, -0.13);
    limbChain(ctx, [[hx, hy], [kx2, ky2], [ax, Math.min(ay, groundY - 6)]], [wTh, wTh * 0.71, wSh * 0.78], legC, dark, OUT);
    ctx.fillStyle = legC;
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.3;
    ctx.beginPath();
    const fy = Math.min(ay, groundY - 2);
    ctx.moveTo(ax - 8, fy - 8);
    ctx.quadraticCurveTo(ax + FIG.footL * 0.9, fy - 7, ax + FIG.footL, fy - 1);
    ctx.quadraticCurveTo(ax + 4, fy + 2.5, ax - 9, fy + 0.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (female && st.anklets) {
      ctx.strokeStyle = GOLD; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(ax - 8, fy - 12); ctx.lineTo(ax + 6, fy - 12); ctx.stroke();
    }
    return [ax, fy];
  }

  // far arm behind everything
  const shBx = leanDx * 0.8 - shW * 0.55, shBy = shoulderY + 6;
  const armB = armChain(shBx, shBy, pose.armB, build);
  limbChain(ctx, [armB.sh, armB.el, armB.wr], [armW * 1.12, armW * 0.82, armW * 0.58], shade(skin, -0.15), dark, OUT);
  if (female && st.garb === 'sari') sleeve(ctx, armB, armW, shade(st.clothMain || '#8c1f28', -0.16), st.clothAccent);
  drawHand(ctx, armB.wr[0], armB.wr[1], -armB.a2 + (pose.armB.wr || 0), build * (female ? 0.85 : 1), shade(skin, -0.15), pose.armB.hand || 'relaxed', dark, { claw: st.claws });
  if (st.armlets) { ctx.fillStyle = GOLD_D; ctx.beginPath(); ctx.ellipse(lerp(armB.sh[0], armB.el[0], 0.45), lerp(armB.sh[1], armB.el[1], 0.45), armW * 1.02, 4.4, armB.a1, 0, TAU); ctx.fill(); }

  if (!skirted) { leg(pose.legB, false); }

  // torso (hookable)
  (hooks && hooks.drawTorso ? hooks.drawTorso.bind(hooks) : drawTorsoBody)(ctx, st, M);

  drawLowerGarment(ctx, st, pose, hipY, hipW, build, t, seed, female);

  if (!skirted) leg(pose.legF, true);

  // ornaments / drapes (hookable)
  (hooks && hooks.drawOrnaments ? hooks.drawOrnaments.bind(hooks) : drawTorsoOrnaments)(ctx, st, shoulderY, waistY, shW, leanDx, t, seed, female, build);

  // near arm
  const shFx = leanDx * 0.8 + shW * 0.62, shFy = shoulderY + 8;
  const armF = armChain(shFx, shFy, pose.armF, build);
  limbChain(ctx, [armF.sh, armF.el, armF.wr], [armW * 1.18, armW * 0.85, armW * 0.6], skin, dark, OUT);
  // deltoid modelling so the shoulder reads as a form (painterly, not a disc)
  ctx.fillStyle = rgba(dark, 0.22);
  ctx.beginPath(); ctx.arc(armF.sh[0] + 2, armF.sh[1] + 4, armW * 0.95, -0.4, 1.8); ctx.fill();
  if ((pose.armF.el || 0) > 0.45) {
    ctx.strokeStyle = rgba(dark, 0.45); ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(armF.el[0], armF.el[1], armW * 0.5, armF.a2 - 0.4, armF.a2 + 0.6);
    ctx.stroke();
  }
  if (female && st.garb === 'sari') sleeve(ctx, armF, armW, st.clothMain || '#8c1f28', st.clothAccent);
  if (st.armlets) { ctx.fillStyle = GOLD; ctx.beginPath(); ctx.ellipse(lerp(armF.sh[0], armF.el[0], 0.45), lerp(armF.sh[1], armF.el[1], 0.45), armW * 1.06, 4.6, armF.a1, 0, TAU); ctx.fill(); }
  if (female && st.bangles) {
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const u = 0.78 + i * 0.07;
      ctx.beginPath();
      ctx.ellipse(lerp(armF.el[0], armF.wr[0], u), lerp(armF.el[1], armF.wr[1], u), armW * 0.72, 3, armF.a2 + Math.PI / 2, 0, TAU);
      ctx.stroke();
    }
  }
  drawHand(ctx, armF.wr[0], armF.wr[1], -armF.a2 + (pose.armF.wr || 0), build * (female ? 0.85 : 1), skin, pose.armF.hand || 'relaxed', dark, { claw: st.claws });

  // neck & head
  const neckX = leanDx * 0.9, headCy = shoulderY - FIG.neck * build * vS - FIG.headR * 0.72;
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(neckX - 10 * build, shoulderY + 6);
  ctx.lineTo(neckX - 8 * build, headCy + FIG.headR * 0.5);
  ctx.lineTo(neckX + 9 * build, headCy + FIG.headR * 0.5);
  ctx.lineTo(neckX + 11 * build, shoulderY + 6);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba(dark, 0.35);
  ctx.beginPath(); ctx.ellipse(neckX, headCy + FIG.headR * 0.72, 10 * build, 5, 0, 0, TAU); ctx.fill();

  ctx.save();
  ctx.translate(neckX + Math.sin(pose.headTilt) * 4, headCy + FIG.headR * 0.02);
  ctx.rotate(pose.headNod + pose.headTilt * 0.4);
  const face = Object.assign({ turn: pose.headTurn }, pose.face);
  drawHead(ctx, FIG.headR * build * (female ? 0.94 : 1), st, face, t, seed, hooks);
  ctx.restore();

  if (st.wearGarland) {
    ctx.save();
    const gx = neckX, gy = shoulderY + 10;
    garlandStrand(ctx, gx - 26, gy, gx + 26, gy, 74 + Math.sin(t * 2 + seed) * 2, t, seed + 4, 0.75);
    ctx.restore();
  }

  ctx.restore();
}

// seated figure (cross-legged) — ported from world.js; accepts optional rig
function drawSeated(ctx, o) {
  const st = o.style, t = o.t || 0, seed = o.seed || 1;
  const skin = st.skin, dark = st.skinShade || shade(skin, -0.3);
  const s = o.s, female = st.female;
  const hooks = o.rig || null;
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(s * (o.facing || 1), s);
  const build = st.build || 1;
  const br = Math.sin(t * 1.5 + seed * 3) * 1.2;
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
  ctx.fillStyle = bare ? skin : st.clothMain;
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
  const aw = (female ? 6.5 : 8.5) * build;
  limb(ctx, [-shW * 0.9, shY + 14], [-46 * build, -66], aw * 1.1, aw * 0.7, shade(skin, -0.12), dark, rgba('#241005', 0.35));
  limb(ctx, [shW * 0.9, shY + 14], [46 * build, -66], aw * 1.1, aw * 0.7, skin, dark, rgba('#241005', 0.35));
  drawHand(ctx, -46 * build, -64, 2.6, build * 0.9, shade(skin, -0.12), 'relaxed', dark, { claw: st.claws });
  drawHand(ctx, 46 * build, -64, -2.6 + Math.PI, build * 0.9, skin, 'relaxed', dark, { claw: st.claws });
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
  ctx.fillStyle = skin;
  ctx.fillRect(-8 * build, shY - 18, 17 * build, 22);
  ctx.save();
  ctx.translate(0, shY - 18 - FIG.headR * 0.62 * build);
  const face = Object.assign({ turn: 0.3 }, o.face);
  drawHead(ctx, FIG.headR * build * 0.96 * (female ? 0.94 : 1), st, face, t, seed, hooks);
  ctx.restore();
  ctx.restore();
}

// halo / prabhāvalī for deities (drawn behind the figure by aura())
function drawHalo(ctx, M, style) {
  const build = M.build, cx = M.leanDx * 0.9;
  const cy = M.shoulderY - FIG.neck * build - FIG.headR * 0.72 * build;
  const R = FIG.headR * build * 2.15;
  ctx.save();
  if (style.prabhavali) {
    // full-body flaming mandorla
    const bx = 0, by = (M.hipY + M.shoulderY) / 2, hh = (M.shoulderY - M.hipY) * -1 + 260 * build, ww = M.shW * 2.4 + 40;
    const fg = ctx.createRadialGradient(bx, by, 20, bx, by, hh);
    fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(0.72, 'rgba(0,0,0,0)'); fg.addColorStop(0.86, rgba('#e8801a', 0.5)); fg.addColorStop(1, 'rgba(232,128,26,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(bx, by, ww, hh, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(GOLD_D, 0.7); ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(bx, by, ww * 0.92, hh * 0.92, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = rgba('#f2a41f', 0.8);
    const n = 40;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU;
      const rr = 0.92 + 0.05 * (i % 2);
      const x1 = bx + Math.cos(a) * ww * rr, y1 = by + Math.sin(a) * hh * rr;
      const x2 = bx + Math.cos(a) * ww * (rr + 0.06 + 0.03 * Math.sin(M.t * 3 + i)), y2 = by + Math.sin(a) * hh * (rr + 0.06 + 0.03 * Math.sin(M.t * 3 + i));
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - 6, y2); ctx.lineTo(x2 + 6, y2); ctx.closePath(); ctx.fill();
    }
  }
  // radiant halo disc behind the head
  let g = ctx.createRadialGradient(cx, cy, R * 0.18, cx, cy, R);
  g.addColorStop(0, rgba(style.haloColor || '#ffe9a8', 0.92));
  g.addColorStop(0.45, rgba(GOLD, 0.5)); g.addColorStop(0.78, rgba(GOLD_D, 0.22)); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(GOLD_L, 0.85); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(cx, cy, R * 0.8, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(GOLD, 0.6); ctx.lineWidth = 1.6;
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * TAU + (M.t || 0) * 0.04;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * R * 0.82, cy + Math.sin(a) * R * 0.82);
    ctx.lineTo(cx + Math.cos(a) * R * 0.97, cy + Math.sin(a) * R * 0.97);
    ctx.stroke();
  }
  ctx.restore();
}

// ─────────────────────────── CLASSES ───────────────────────────
class Person {
  constructor(style) { this.style = Object.assign({}, style); }
  _resolvePose(o) {
    let pose = o.pose;
    if (typeof pose === 'string') pose = POSES[pose] ? POSES[pose](o.poseK == null ? 1 : o.poseK, o.t || 0, o.seed || 1) : undefined;
    else if (pose && pose.name) pose = POSES[pose.name] ? POSES[pose.name](pose.k == null ? 1 : pose.k, o.t || 0, o.seed || 1) : undefined;
    return pose;
  }
  draw(ctx, o) {
    drawFigure(ctx, { x: o.x, y: o.y, s: o.s, facing: o.facing, style: this.style, pose: this._resolvePose(o), t: o.t, seed: o.seed, shadow: o.shadow, rig: this });
  }
  drawSeated(ctx, o) {
    const pose = this._resolvePose(o);
    drawSeated(ctx, { x: o.x, y: o.y, s: o.s, facing: o.facing, style: this.style, face: (pose && pose.face) || o.face, t: o.t, seed: o.seed, rig: this });
  }
  // ── overridable pipeline; base implementations delegate to the free helpers ──
  aura() {}
  drawTorso(ctx, st, M) { return drawTorsoBody(ctx, st, M); }
  drawOrnaments(ctx, st, shoulderY, waistY, shW, leanDx, t, seed, female, build) { return drawTorsoOrnaments(ctx, st, shoulderY, waistY, shW, leanDx, t, seed, female, build); }
  drawHeadgear(ctx, style, tn, t, seed) { return drawHeadgear(ctx, style, tn, t, seed); }
  drawFacialHair(ctx, style, f, tn, mouth) { return drawFacialHair(ctx, style, f, tn, mouth); }
}

class Man extends Person {
  constructor(style) { super(Object.assign({ build: 1.0, garb: 'dhoti', hairstyle: 'topknot' }, style)); }
}
class Woman extends Person {
  constructor(style) { super(Object.assign({ female: true, build: 0.94, garb: 'sari', hairstyle: 'braid' }, style)); }
}
class Deity extends Person {
  constructor(style) {
    super(Object.assign({ build: 1.0, garb: 'dhoti', hairstyle: 'topknot', halo: true, ornaments: 3, armlets: true, earring: true }, style));
  }
  aura(ctx, M) { if (this.style.halo !== false) drawHalo(ctx, M, this.style); }
}
class Sage extends Man {
  constructor(style) { super(Object.assign({ hairstyle: 'sagebun', beard: 'white', beardLen: 0.6, garb: 'robe', mala: true, tilak: 'tripundra', build: 0.98 }, style)); }
}
class Rakshasa extends Man {
  constructor(style) {
    super(Object.assign({
      build: 1.32, shoulderScale: 1.3, skin: '#7a5a44', skinShade: '#3f2c1e', hairColor: '#241109',
      tusks: true, mane: true, heavyBrow: true, claws: true, hairstyle: 'mane',
      garb: 'dhoti', clothMain: '#5a3324', clothAccent: '#8a5a2c', sash: '#3a2016',
      lip: '#5c2a22', iris: '#7a1e12', ornaments: 1,
    }, style));
  }
  drawFacialHair(ctx, style, f, tn, mouth) { drawFacialHair(ctx, Object.assign({}, style, { tusks: true }), f, tn, mouth); }
}

// resolve a data archetype (ARCH) or named character (CHARACTERS registry) or a
// raw style object, and instantiate the right behaviour class.
Person.of = function (sel) {
  let style = {}, form = null;
  if (typeof sel === 'string') {
    // 'name:form' → resolve base, then apply style.forms[form] overrides (e.g. 'arjuna:brahmin')
    if (sel.indexOf(':') > 0) { const parts = sel.split(':'); sel = parts[0]; form = parts[1]; }
    if (typeof CHARACTERS !== 'undefined' && CHARACTERS[sel]) style = Object.assign({}, CHARACTERS[sel]);
    else if (typeof ARCH !== 'undefined' && ARCH[sel]) style = Object.assign({}, ARCH[sel]);
    else style = { archetype: sel };
    // registry entries are overrides on top of their archetype preset
    if (style.archetype && typeof ARCH !== 'undefined' && ARCH[style.archetype])
      style = Object.assign({}, ARCH[style.archetype], style);
    if (form && style.forms && style.forms[form]) style = Object.assign({}, style, style.forms[form]);
  } else if (sel && typeof sel === 'object') {
    if (sel.archetype && typeof ARCH !== 'undefined' && ARCH[sel.archetype]) style = Object.assign({}, ARCH[sel.archetype], sel);
    else style = Object.assign({}, sel);
  }
  const a = style.archetype, kind = style.kind;
  let Cls = Man;
  if (kind === 'deity' || a === 'deity' || style.deity) Cls = Deity;
  else if (kind === 'sage' || a === 'sage') Cls = Sage;
  else if (kind === 'rakshasa' || a === 'rakshasa') Cls = Rakshasa;
  else if (style.female || a === 'queen' || a === 'princess' || a === 'girl') Cls = Woman;
  return new Cls(style);
};
