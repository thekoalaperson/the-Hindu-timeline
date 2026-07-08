// ── wardrobe.js ── garments, jewelry, headgear (character system v2).
// Extracted & upgraded from people.js. Miniature-painting register:
// flat colour fields modelled with soft gradients, kohl outlines, gold trim.
//
// API (globals):
//   TEXTILE PATTERNS (applied via clip inside a garment path):
//     applyPattern(ctx, pat, bounds, seed, accent)
//       pat: 'stripes'|'bandhani'|'paisley'|'temple' | {kind,color,color2,scale,angle,alpha}
//   CLOSED-FORM CLOTH (deterministic; reproducible for any absolute t):
//     clothChain(ax, ay, ang, len, nodes, t, seed, opts) → [[x,y]…]
//     drawClothTail(ctx, ax, ay, ang, len, t, seed, opts) → draws + returns points
//   GARMENTS / ORNAMENT / HEADGEAR (ported, back-compatible):
//     sleeve, drawLowerGarment, drawCrown, drawTorsoOrnaments
//
// Back-compat: for any legacy style object (no `pattern`/`clothSim` keys) these
// render byte-for-byte as the people.js originals. New behaviour is opt-in.
'use strict';

// ─────────────────────── textile patterns ───────────────────────
// A pattern fills `bounds`=[x0,y0,x1,y1]; the caller has already clipped to the
// garment path so motifs never spill past cloth edges.

function patternStripes(ctx, b, col, col2, scale, ang) {
  const s = scale || 22; ang = ang == null ? 0 : ang;
  const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  const span = Math.hypot(b[2] - b[0], b[3] - b[1]) + s * 2;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.translate(-cx, -cy);
  ctx.strokeStyle = col; ctx.lineWidth = s * 0.34;
  for (let x = cx - span; x < cx + span; x += s) { ctx.beginPath(); ctx.moveTo(x, cy - span); ctx.lineTo(x, cy + span); ctx.stroke(); }
  if (col2) {
    ctx.strokeStyle = col2; ctx.lineWidth = s * 0.1;
    for (let x = cx - span + s * 0.5; x < cx + span; x += s) { ctx.beginPath(); ctx.moveTo(x, cy - span); ctx.lineTo(x, cy + span); ctx.stroke(); }
  }
  ctx.restore();
}

function patternBandhani(ctx, b, col, col2, scale) {
  const s = scale || 24;
  for (let j = 0, y = b[1] + s * 0.5; y < b[3]; y += s * 0.72, j++) {
    for (let x = b[0] + (j % 2 ? s * 0.5 : 0) + s * 0.3; x < b[2]; x += s) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, s * 0.12, 0, TAU); ctx.fill();
      ctx.fillStyle = col2 || 'rgba(255,248,225,0.75)'; ctx.beginPath(); ctx.arc(x, y, s * 0.048, 0, TAU); ctx.fill();
    }
  }
}

// a single stamped paisley (buta): pointed hooked tail, unit-ish scale r
function _paisleyStamp(ctx, x, y, r, col, col2) {
  ctx.save(); ctx.translate(x, y); ctx.scale(r, r);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(0.12, -0.95);
  ctx.bezierCurveTo(1.02, -0.68, 0.92, 0.55, 0.08, 0.9);
  ctx.bezierCurveTo(-0.52, 1.12, -0.86, 0.5, -0.6, 0.02);
  ctx.bezierCurveTo(-0.44, -0.3, -0.04, -0.55, 0.12, -0.95);
  ctx.closePath(); ctx.fill();
  // inner void + dot for the classic paisley eye
  ctx.fillStyle = col2 || 'rgba(255,250,235,0.85)';
  ctx.beginPath();
  ctx.moveTo(0.08, -0.5);
  ctx.bezierCurveTo(0.5, -0.32, 0.44, 0.35, 0.02, 0.52);
  ctx.bezierCurveTo(-0.28, 0.62, -0.44, 0.22, -0.28, -0.08);
  ctx.bezierCurveTo(-0.18, -0.28, 0.0, -0.4, 0.08, -0.5);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(0.0, 0.06, 0.14, 0, TAU); ctx.fill();
  ctx.restore();
}

function patternPaisley(ctx, b, col, col2, scale, seed) {
  const s = scale || 42;
  let row = 0;
  for (let y = b[1] + s * 0.6; y < b[3]; y += s * 1.02, row++) {
    for (let i = 0, x = b[0] + (row % 2 ? s * 0.6 : 0) + s * 0.3; x < b[2]; x += s * 1.12, i++) {
      const rot = ((row + i) % 2 ? 0.32 : -0.32);
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      _paisleyStamp(ctx, 0, 0, s * 0.4, col, col2);
      ctx.restore();
    }
  }
}

// temple-border zigzag: tiled chevron courses (gopuram border feel)
function patternTempleBorder(ctx, b, col, col2, scale) {
  const s = scale || 26;
  ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, s * 0.11); ctx.lineJoin = 'miter';
  for (let y = b[1] + s; y < b[3]; y += s * 1.35) {
    ctx.beginPath(); let up = true;
    for (let x = b[0]; x <= b[2] + s; x += s) {
      const yy = up ? y : y - s * 0.55;
      if (x === b[0]) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      up = !up;
    }
    ctx.stroke();
  }
  if (col2) {
    ctx.fillStyle = col2;
    for (let y = b[1] + s * 0.55, k = 0; y < b[3]; y += s * 1.35, k++)
      for (let x = b[0] + (k % 2 ? s : 0); x < b[2]; x += s * 2) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s * 0.5, y - s * 0.5); ctx.lineTo(x + s, y); ctx.closePath(); ctx.fill();
      }
  }
}

function applyPattern(ctx, pat, b, seed, accent) {
  if (!pat) return;
  const o = typeof pat === 'string' ? { kind: pat } : pat;
  const col = o.color || accent || GOLD;
  const col2 = o.color2 || null;
  const scale = o.scale || 24;
  ctx.save();
  ctx.globalAlpha = o.alpha == null ? 0.92 : o.alpha;
  const k = o.kind;
  if (k === 'stripes') patternStripes(ctx, b, col, col2, scale, o.angle || 0);
  else if (k === 'bandhani' || k === 'dots') patternBandhani(ctx, b, col, col2, scale);
  else if (k === 'paisley') patternPaisley(ctx, b, col, col2, scale, seed || 1);
  else if (k === 'temple' || k === 'zigzag' || k === 'templeBorder') patternTempleBorder(ctx, b, col, col2, scale);
  ctx.restore();
}

// ─────────────────────── closed-form cloth ───────────────────────
// Deterministic "verlet-feel" chain WITHOUT stateful integration: each node's
// position is a base curve (anchor + direction + gravity sag) plus a seeded
// sfbm1 sway with a per-node PHASE LAG, so a wave visibly travels down the cloth
// and the free end flutters most. Because it is a pure function of the absolute
// query time t, any frame is reproducible with no warm-up.
function clothChain(ax, ay, ang, len, nodes, t, seed, o) {
  o = o || {}; t = t || 0; seed = seed || 1;
  const grav = o.grav == null ? 0.55 : o.grav;
  const amp = o.amp == null ? 26 : o.amp;
  const lag = o.lag == null ? 1.6 : o.lag;
  const speed = o.speed == null ? 0.9 : o.speed;
  const stiff = o.stiff == null ? 0.12 : o.stiff;   // anchored end barely moves
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const px = -dy, py = dx;                            // perpendicular
  const pts = [];
  for (let i = 0; i <= nodes; i++) {
    const u = i / nodes;
    let bx = ax + dx * len * u;
    let by = ay + dy * len * u + grav * len * u * u; // gravity sag ∝ u²
    const ph = t * speed - u * lag + seed * 0.61;
    const s1 = sfbm1(ph, seed, 3);
    const s2 = sfbm1(ph * 0.55 + 7, seed + 4, 2);
    const env = stiff + (1 - stiff) * u * u;          // stiffness → flutter
    const off = (s1 * 0.72 + s2 * 0.28) * amp * env;
    bx += px * off; by += py * off * 0.35 + Math.abs(off) * 0.04;
    pts.push([bx, by]);
  }
  return pts;
}

function _ribbonEdges(pts, wfn) {
  const L = [], R = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[Math.min(i + 1, n - 1)], r = pts[Math.max(i - 1, 0)];
    let dx = q[0] - r[0], dy = q[1] - r[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const w = wfn(i / (n - 1));
    L.push([p[0] - dy * w, p[1] + dx * w]);
    R.push([p[0] + dy * w, p[1] - dx * w]);
  }
  return { L, R };
}

// draw a fluttering cloth tail (pallu / dupatta / uttariya / sash) from anchor.
// opts: {color, accent, w0, w1, nodes, pattern, patternColor, amp, lag, grav, speed, stiff}
function drawClothTail(ctx, ax, ay, ang, len, t, seed, o) {
  o = o || {};
  const nodes = o.nodes || 10;
  const col = o.color || '#a11e2c';
  const w0 = o.w0 == null ? 26 : o.w0, w1 = o.w1 == null ? 22 : o.w1;
  const pts = clothChain(ax, ay, ang, len, nodes, t, seed, o);
  const wfn = u => lerp(w0, w1, u) * (0.9 + 0.25 * Math.sin(u * Math.PI));
  const { L, R } = _ribbonEdges(pts, wfn);
  const outline = () => { ctx.beginPath(); smoothPath(ctx, L); for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]); ctx.closePath(); };
  ctx.save();
  outline();
  const g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[nodes][0], pts[nodes][1]);
  g.addColorStop(0, shade(col, -0.04)); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, -0.24));
  ctx.fillStyle = g; ctx.fill();
  if (o.pattern) {
    ctx.save(); outline(); ctx.clip();
    let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
    for (const p of L.concat(R)) { mnx = Math.min(mnx, p[0]); mxx = Math.max(mxx, p[0]); mny = Math.min(mny, p[1]); mxy = Math.max(mxy, p[1]); }
    applyPattern(ctx, o.pattern, [mnx, mny, mxx, mxy], seed, o.patternColor || o.accent);
    ctx.restore();
  }
  // soft fold shading along the ribbon
  ctx.save(); outline(); ctx.clip();
  const sg = ctx.createLinearGradient(0, pts[0][1], 0, pts[nodes][1]);
  sg.addColorStop(0, 'rgba(255,240,205,0.12)'); sg.addColorStop(0.5, 'rgba(0,0,0,0)'); sg.addColorStop(1, rgba(shade(col, -0.4), 0.3));
  ctx.fillStyle = sg; ctx.fillRect(mnBounds(pts).x - 40, mnBounds(pts).y - 20, 400, 600);
  ctx.restore();
  ctx.strokeStyle = rgba('#241005', 0.42); ctx.lineWidth = 1.3;
  ctx.beginPath(); smoothPath(ctx, L); ctx.stroke();
  ctx.beginPath(); smoothPath(ctx, R); ctx.stroke();
  if (o.accent) {
    ctx.strokeStyle = o.accent; ctx.lineWidth = 3;
    ctx.beginPath(); smoothPath(ctx, L); ctx.stroke();
    ctx.beginPath(); smoothPath(ctx, R); ctx.stroke();
    const a = L[L.length - 1], b = R[R.length - 1];
    ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    // little fringe tassels at the hem
    ctx.lineWidth = 1.6; ctx.strokeStyle = o.accent;
    for (let i = 0; i <= 5; i++) {
      const u = i / 5, hx = lerp(a[0], b[0], u), hy = lerp(a[1], b[1], u);
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(ang) * 9, hy + Math.sin(ang) * 9 + 6); ctx.stroke();
    }
  }
  ctx.restore();
  return pts;
}
function mnBounds(pts) { let x = 1e9, y = 1e9; for (const p of pts) { x = Math.min(x, p[0]); y = Math.min(y, p[1]); } return { x, y }; }

// ─────────────────────── sleeves ───────────────────────
// choli sleeve over the upper-arm segment (ported)
function sleeve(ctx, arm, armW, color, trim) {
  const u = 0.62;
  const ex = lerp(arm.sh[0], arm.el[0], u), ey = lerp(arm.sh[1], arm.el[1], u);
  limb(ctx, arm.sh, [ex, ey], armW * 1.32, armW * 1.02, color, shade(color, -0.35), rgba('#241005', 0.4));
  if (trim) {
    ctx.strokeStyle = trim; ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(ex, ey, armW * 1.02, 3.4, arm.a1 + Math.PI / 2, 0, TAU);
    ctx.stroke();
  }
}

// ─────────────────────── lower garment ───────────────────────
// dhoti (wrapped) or sari/robe (A-line skirt). Ported; adds an opt-in textile
// pattern pass (st.pattern) clipped to the garment — off for legacy styles.
function drawLowerGarment(ctx, st, pose, hipY, hipW, build, t, seed, female) {
  const OUT = rgba('#241005', 0.62);
  const sway = sfbm1(t * 0.7, seed + 2) * 6 + (pose.clothSway || 0);
  if (st.garb === 'sari' || st.garb === 'robe') {
    const cm = st.clothMain || '#8c1f28', acc = st.clothAccent || GOLD;
    const skirtPath = () => {
      ctx.beginPath();
      ctx.moveTo(-hipW - 2, hipY + 4);
      ctx.quadraticCurveTo(-hipW - 16, -110, -hipW - 26 + sway, -6);
      ctx.quadraticCurveTo(0, 6 + Math.abs(sway) * 0.4, hipW + 30 + sway, -4);
      ctx.quadraticCurveTo(hipW + 16, -110, hipW + 2, hipY + 4);
      ctx.closePath();
    };
    skirtPath();
    const g = ctx.createLinearGradient(-hipW - 20, 0, hipW + 24, 0);
    g.addColorStop(0, shade(cm, -0.3)); g.addColorStop(0.5, cm); g.addColorStop(1, shade(cm, -0.18));
    ctx.fillStyle = g; ctx.fill();
    if (st.pattern) { ctx.save(); skirtPath(); ctx.clip(); applyPattern(ctx, st.pattern, [-hipW - 28, hipY - 110, hipW + 32, hipY + 6], seed, acc); ctx.restore(); }
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
    // pleat lines
    ctx.strokeStyle = rgba('#000', 0.22); ctx.lineWidth = 1.6;
    for (let i = 0; i < 6; i++) {
      const u = (i + 0.5) / 6, x0 = lerp(-hipW, hipW, u);
      ctx.beginPath();
      ctx.moveTo(x0, hipY + 10);
      ctx.quadraticCurveTo(x0 * 1.5 + sway * 0.4, hipY * 0.4, x0 * 1.7 + sway, -8);
      ctx.stroke();
    }
    // soft drape folds — broad, low-alpha ink; painters mark folds, mannequins don't
    ctx.strokeStyle = rgba(shade(cm, -0.4), 0.16); ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const u = (i + 0.3) / 3, x0 = lerp(-hipW * 0.8, hipW * 0.8, u);
      ctx.beginPath();
      ctx.moveTo(x0 * 0.9, hipY - 2);
      ctx.quadraticCurveTo(x0 * 1.5 + sway * 0.5, hipY * 0.35, x0 * 1.9 + sway + Math.sin(i * 4 + seed) * 5, -6);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    // gold hem
    ctx.strokeStyle = acc; ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-hipW - 25 + sway, -8);
    ctx.quadraticCurveTo(0, 4 + Math.abs(sway) * 0.4, hipW + 29 + sway, -6);
    ctx.stroke();
    ctx.strokeStyle = rgba('#7a4b12', 0.8); ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-hipW - 25 + sway, -13);
    ctx.quadraticCurveTo(0, -1, hipW + 29 + sway, -11);
    ctx.stroke();
    // waistband + kamarband
    ctx.fillStyle = shade(cm, -0.35);
    ctx.fillRect(-hipW - 2, hipY, hipW * 2 + 4, 8);
    if (st.ornaments >= 2) { ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-hipW, hipY + 9); ctx.quadraticCurveTo(0, hipY + 16, hipW, hipY + 9); ctx.stroke(); }
  } else {
    // dhoti: wrapped, knee-or-ankle length
    const cm = st.clothMain || '#ece2c8';
    const len = st.dhotiLen || 210;
    const hem = -Math.max(6, (-hipY) - len);
    const dhotiPath = () => {
      ctx.beginPath();
      ctx.moveTo(-hipW - 3, hipY + 2);
      ctx.quadraticCurveTo(-hipW - 12, hipY + len * 0.55, -hipW - 6 + sway * 0.6, hem);
      ctx.quadraticCurveTo(0, hem + 8, hipW + 8 + sway, hem - 2);
      ctx.quadraticCurveTo(hipW + 13, hipY + len * 0.5, hipW + 3, hipY + 2);
      ctx.closePath();
    };
    dhotiPath();
    const g = ctx.createLinearGradient(-hipW, 0, hipW + 10, 0);
    g.addColorStop(0, shade(cm, -0.28)); g.addColorStop(0.45, cm); g.addColorStop(1, shade(cm, -0.12));
    ctx.fillStyle = g; ctx.fill();
    if (st.pattern) { ctx.save(); dhotiPath(); ctx.clip(); applyPattern(ctx, st.pattern, [-hipW - 12, hem - 4, hipW + 14, hipY + 4], seed, st.clothAccent || GOLD); ctx.restore(); }
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
    // centre pleat fan
    ctx.strokeStyle = rgba('#000', 0.18); ctx.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 3, hipY + 8);
      ctx.quadraticCurveTo(i * 8 + sway * 0.4, hipY + len * 0.6, i * 12 + sway * 0.8, hem + 4);
      ctx.stroke();
    }
    // soft drape folds — broad, low-alpha ink for painterly volume
    ctx.strokeStyle = rgba(shade(cm, -0.42), 0.15); ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const s2 = i ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(s2 * hipW * 0.42, hipY + 6);
      ctx.quadraticCurveTo(s2 * hipW * 0.85 + sway * 0.4, hipY + len * 0.5, s2 * hipW * 0.55 + sway * 0.8, hem + 6);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    // hem border
    if (st.clothAccent) {
      ctx.strokeStyle = st.clothAccent; ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-hipW - 6 + sway * 0.6, hem + 1);
      ctx.quadraticCurveTo(0, hem + 9, hipW + 8 + sway, hem - 1);
      ctx.stroke();
    }
    // waist sash
    ctx.fillStyle = st.sash || shade(cm, -0.4);
    ctx.fillRect(-hipW - 3, hipY, hipW * 2 + 6, 9);
  }
}

// ─────────────────────── headgear (crowns) ───────────────────────
// mukut / tiara / turban (ported verbatim; back-compatible)
function drawCrown(ctx, style, tn) {
  const P = (a, b) => lerp(a, b, Math.min(tn, 0.62) / 0.62);
  const kind = style.crown;
  ctx.save();
  if (kind === 'mukut') {
    const g = ctx.createLinearGradient(-0.6, -1.6, 0.6, -0.7);
    g.addColorStop(0, GOLD_D); g.addColorStop(0.5, GOLD_L); g.addColorStop(1, GOLD_D);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(P(0.72, 0.62), -0.62);
    ctx.quadraticCurveTo(P(0.55, 0.48), -1.15, P(0.18, 0.12), -1.28);
    ctx.lineTo(0.02, -1.72);
    ctx.lineTo(-0.35, -1.30);
    ctx.quadraticCurveTo(-0.9, -1.2, -0.98, -0.55);
    ctx.quadraticCurveTo(-0.4, -0.9, P(0.3, 0.25), -0.8);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#5c3a08', 0.9); ctx.lineWidth = 0.04; ctx.stroke();
    ctx.fillStyle = GOLD_D;
    ctx.beginPath();
    ctx.moveTo(P(0.75, 0.64), -0.60); ctx.quadraticCurveTo(0, -0.98, -1.0, -0.52);
    ctx.quadraticCurveTo(0, -0.78, P(0.75, 0.64), -0.48); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b41f2e'; ctx.beginPath(); ctx.arc(0.02, -1.3, 0.09, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1f5c78'; ctx.beginPath(); ctx.arc(-0.42, -1.06, 0.06, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0.0, -1.34, 0.025, 0, TAU); ctx.fill();
    ctx.fillStyle = GOLD_L; ctx.beginPath(); ctx.arc(0.02, -1.76, 0.05, 0, TAU); ctx.fill();
  } else if (kind === 'tiara') {
    ctx.strokeStyle = GOLD; ctx.lineWidth = 0.055; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(P(0.60, 0.50), -0.70);
    ctx.quadraticCurveTo(-0.05, -1.06, -0.68, -0.72);
    ctx.stroke();
    ctx.fillStyle = '#f6ecd8';
    for (let i = 1; i < 6; i++) {
      const u = i / 6;
      const qx = lerp(P(0.60, 0.50), -0.68, u), qy = -0.70 + Math.sin(u * Math.PI) * -0.26;
      ctx.beginPath(); ctx.arc(qx, qy, 0.028, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = GOLD; ctx.lineWidth = 0.03;
    ctx.beginPath(); ctx.moveTo(P(0.18, 0.14), -0.94); ctx.quadraticCurveTo(P(0.42, 0.35), -0.82, P(0.52, 0.44), -0.62); ctx.stroke();
    ctx.fillStyle = GOLD_L; ctx.beginPath(); ctx.arc(P(0.53, 0.45), -0.585, 0.06, 0, TAU); ctx.fill();
    ctx.fillStyle = '#b41f2e'; ctx.beginPath(); ctx.arc(P(0.53, 0.45), -0.585, 0.03, 0, TAU); ctx.fill();
  } else if (kind === 'turban') {
    const c1 = style.turbanColor || '#b3452c';
    ctx.fillStyle = c1;
    ctx.beginPath();
    ctx.ellipse(-0.08, -0.72, 1.0, 0.62, 0.05, Math.PI * 0.9, Math.PI * 2.1);
    ctx.quadraticCurveTo(P(0.5, 0.4), -0.45, -1.0, -0.35);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#000', 0.28); ctx.lineWidth = 0.05;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-0.1 + i * 0.06, -0.55, 0.85 - i * 0.14, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba('#241005', 0.8); ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.ellipse(-0.08, -0.72, 1.0, 0.62, 0.05, Math.PI * 0.92, Math.PI * 2.08);
    ctx.stroke();
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(P(0.45, 0.38), -0.98, 0.09, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(P(0.43, 0.36), -1.0, 0.03, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ─────────────────────── torso ornaments & drapes ───────────────────────
// necklaces, mala, uttariya/scarf, sari pallu, veil (ported). Opt-in: textile
// pattern on pallu (st.pattern) and closed-form flutter on the scarf/pallu tail
// (st.clothSim) — both unset for legacy styles ⇒ identical output.
function drawTorsoOrnaments(ctx, st, shoulderY, waistY, shW, leanDx, t, seed, female, build) {
  const lv = st.ornaments || 0;
  const nx = leanDx * 0.8;
  if (lv >= 1) {
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(nx - 20, shoulderY + 6); ctx.quadraticCurveTo(nx, shoulderY + 26, nx + 20, shoulderY + 6); ctx.stroke();
  }
  if (lv >= 2) {
    beadArc(ctx, nx, shoulderY - 2, 32, Math.PI * 0.22, Math.PI * 0.78, 9, 2.4, '#f6e7bf');
    ctx.fillStyle = GOLD_L;
    ctx.beginPath(); ctx.arc(nx, shoulderY + 30, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#b41f2e'; ctx.beginPath(); ctx.arc(nx, shoulderY + 30, 2.4, 0, TAU); ctx.fill();
  }
  if (lv >= 3) {
    ctx.strokeStyle = rgba('#e8b64c', 0.9); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(nx - 16, shoulderY + 10); ctx.quadraticCurveTo(nx, waistY - 30, nx + 16, shoulderY + 10); ctx.stroke();
  }
  if (st.mala) {
    ctx.strokeStyle = '#6d4423'; ctx.lineWidth = 3; ctx.setLineDash([3.4, 3]);
    ctx.beginPath(); ctx.moveTo(nx - 18, shoulderY + 6); ctx.quadraticCurveTo(nx, waistY - 20, nx + 18, shoulderY + 6); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (st.scarf) {
    const sc = st.scarf;
    ctx.save();
    const fl = sfbm1(t * 0.9, seed + 7);
    ctx.fillStyle = rgba(sc, 0.94);
    ctx.beginPath();
    ctx.moveTo(nx - shW * 0.95, shoulderY - 2);
    ctx.quadraticCurveTo(nx - shW * 0.4, shoulderY + 40, nx + shW * 0.55, waistY - 10);
    ctx.lineTo(nx + shW * 0.85, waistY + 4);
    ctx.quadraticCurveTo(nx - shW * 0.2, shoulderY + 60, nx - shW * 0.75, shoulderY + 16 + fl * 4);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#241005', 0.4); ctx.lineWidth = 1.2; ctx.stroke();
    if (st.clothSim) {
      // fluttering closed-form tail behind the far shoulder
      drawClothTail(ctx, nx - shW * 0.95, shoulderY + 6, Math.PI * 0.52, 150 * build, t, seed + 21,
        { color: sc, accent: st.clothAccent, w0: shW * 0.34, w1: shW * 0.26, nodes: 9, amp: 22, lag: 1.5, pattern: st.pattern });
    } else {
      ctx.fillStyle = rgba(sc, 0.85);
      ctx.beginPath();
      ctx.moveTo(nx - shW * 0.95, shoulderY - 6);
      ctx.quadraticCurveTo(nx - shW * 1.35, shoulderY + 45 + fl * 12, nx - shW * 1.28 + fl * 12, shoulderY + 108 + fl * 16);
      ctx.quadraticCurveTo(nx - shW * 1.32 + fl * 14, shoulderY + 124 + fl * 16, nx - shW * 1.12 + fl * 10, shoulderY + 120 + fl * 14);
      ctx.quadraticCurveTo(nx - shW * 1.02, shoulderY + 60, nx - shW * 0.82, shoulderY + 14);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  if (female && st.garb === 'sari' && st.pallu !== false) {
    const cm = st.clothMain || '#8c1f28';
    const fl = sfbm1(t * 0.8, seed + 9), fl2 = sfbm1(t * 0.65 + 3, seed + 11);
    ctx.save();
    const palluBody = () => {
      ctx.beginPath();
      ctx.moveTo(nx + shW * 0.75, waistY + 14);
      ctx.quadraticCurveTo(nx + shW * 0.3, shoulderY + 46, nx - shW * 0.72, shoulderY + 4);
      ctx.quadraticCurveTo(nx - shW * 1.15, shoulderY + 40 + fl * 8, nx - shW * 1.35 + fl * 12, shoulderY + 150 + fl2 * 22);
      ctx.quadraticCurveTo(nx - shW * 1.5 + fl * 14, shoulderY + 210 + fl2 * 26, nx - shW * 1.05 + fl2 * 10, shoulderY + 228 + fl * 18);
      ctx.quadraticCurveTo(nx - shW * 0.7, shoulderY + 160, nx - shW * 0.55, shoulderY + 60);
      ctx.quadraticCurveTo(nx + shW * 0.1, shoulderY + 70, nx + shW * 0.5, waistY + 22);
      ctx.closePath();
    };
    palluBody();
    ctx.fillStyle = shade(cm, 0.06); ctx.fill();
    if (st.pattern) { ctx.save(); palluBody(); ctx.clip(); applyPattern(ctx, st.pattern, [nx - shW * 1.5, shoulderY, nx + shW * 0.8, shoulderY + 230], seed + 2, st.clothAccent); ctx.restore(); }
    ctx.strokeStyle = rgba('#241005', 0.35); ctx.lineWidth = 1.3; ctx.stroke();
    ctx.strokeStyle = st.clothAccent || GOLD; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(nx + shW * 0.72, waistY + 12);
    ctx.quadraticCurveTo(nx + shW * 0.28, shoulderY + 44, nx - shW * 0.70, shoulderY + 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(nx - shW * 1.32 + fl * 12, shoulderY + 152 + fl2 * 22);
    ctx.quadraticCurveTo(nx - shW * 1.48 + fl * 14, shoulderY + 208 + fl2 * 26, nx - shW * 1.03 + fl2 * 10, shoulderY + 226 + fl * 18);
    ctx.stroke();
    ctx.restore();
  }
  if (st.veil) {
    const vc = st.veil;
    ctx.save();
    const headCy = shoulderY - FIG.neck * build - FIG.headR * 1.15;
    ctx.fillStyle = rgba(vc, 0.96);
    ctx.beginPath();
    ctx.moveTo(nx + FIG.headR * 0.9, headCy + 6);
    ctx.quadraticCurveTo(nx + FIG.headR * 0.6, headCy - FIG.headR * 1.15, nx - FIG.headR * 0.75, headCy - FIG.headR * 0.95);
    ctx.quadraticCurveTo(nx - FIG.headR * 1.9, headCy - FIG.headR * 0.1, nx - FIG.headR * 1.8, shoulderY + 60);
    ctx.quadraticCurveTo(nx - FIG.headR * 1.7, shoulderY + 130, nx - FIG.headR * 1.35, shoulderY + 160);
    ctx.lineTo(nx - FIG.headR * 0.4, shoulderY + 30);
    ctx.quadraticCurveTo(nx - FIG.headR * 0.9, headCy + FIG.headR, nx + FIG.headR * 0.55, headCy + FIG.headR * 0.55);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#241005', 0.4); ctx.lineWidth = 1.3; ctx.stroke();
    ctx.restore();
  }
}
