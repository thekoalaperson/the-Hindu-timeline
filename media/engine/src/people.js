// ── people.js ── the cast. Hand-built vector humans in the manner of
// Rajput/Pahari miniature painting: strong profile lines, kohl-rimmed
// almond eyes, gold ornament, modelled skin over flat grounds.
//
// Head-local space: origin = skull centre, 1 unit = head radius, +x = facing.
// Figure-local space: origin = ground between feet, y up is negative,
// total height ≈ 400 units; caller scales.
'use strict';

// ─────────────────────────── HEAD ───────────────────────────
// face: {turn(0=profile→1=front), smile, eyeOpen, gaze:{x,y}, brow, lipsPart, lowered(eyes downcast)}
function _drawHeadV1(ctx, R, style, face, t, seed) {
  const f = Object.assign({ turn: 0.28, smile: 0.12, eyeOpen: 1, gaze: { x: 0, y: 0 }, brow: 0, lipsPart: 0, lowered: 0 }, face);
  const skin = style.skin, dark = style.skinShade || shade(skin, -0.28);
  const hairC = style.hairColor || '#170d08';
  const tn = clamp(f.turn, 0, 0.62);           // supported range
  const P = (px, fx) => lerp(px, fx, tn / 0.62); // profile→front interp

  ctx.save();
  ctx.scale(R, R);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // blink phase (double-blink occasionally, deterministic)
  const bl = (() => {
    const cyc = (t * 0.31 + hash1(seed) * 7) % 4.2;
    const b = cyc < 0.12 ? Math.sin(cyc / 0.12 * Math.PI) : 0;
    return clamp(f.eyeOpen - b * 1.2, 0.04, 1.25);
  })();

  // ── silhouette path (the profile line is the soul of the face) ──
  const nose = (1.18 - tn * 0.34) * (style.noseScale || 1); // nose tip x
  const sil = [
    [P(-0.02, 0.0), -1.06],                    // crown
    [P(0.62, 0.52), -0.86],                    // forehead top
    [P(0.80, 0.66), -0.52],                    // forehead
    [P(0.88, 0.72), -0.26],                    // brow ridge
    [P(0.86, 0.70), -0.16],                    // bridge dip
    [P(nose * 0.94, nose * 0.94), 0.02],       // nose slope
    [P(nose, nose), 0.115],                    // nose tip
    [P(0.88, 0.74), 0.205],                    // nose base
    [P(0.92, 0.76), 0.315 - f.smile * 0.012],  // upper lip
    [P(0.86, 0.70), 0.40],                     // lip part
    [P(0.91, 0.73), 0.50 + f.lipsPart * 0.03], // lower lip
    [P(0.84, 0.66), 0.60],                     // lip-chin crease
    [P(0.83, 0.62), 0.78],                     // chin
    [P(0.45, 0.34), 0.98],                     // jaw
    [P(-0.10, -0.14), 1.00],                   // jaw back → under ear
    [-0.62, 0.62],                             // behind ear
    [-0.98, 0.10],                             // skull back
    [-0.86, -0.62],                            // skull top-back
  ];
  const headPath = () => { ctx.beginPath(); smoothPath(ctx, sil, true); };

  // back hair mass first (behind skull)
  drawBackHair(ctx, style, t, seed);

  headPath();
  ctx.fillStyle = skin; ctx.fill();

  // modelled shading, clipped to the face
  ctx.save();
  headPath(); ctx.clip();
  // shadow crescent along back of skull & jaw
  let g = ctx.createRadialGradient(0.45, -0.1, 0.3, 0, 0, 1.35);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, rgbaC(dark, 0.5));
  ctx.fillStyle = g; ctx.fillRect(-1.4, -1.3, 2.9, 2.6);
  // forehead / nose-bridge light
  g = ctx.createRadialGradient(0.55, -0.42, 0.05, 0.55, -0.42, 0.9);
  g.addColorStop(0, 'rgba(255,244,214,0.30)'); g.addColorStop(1, 'rgba(255,244,214,0)');
  ctx.fillStyle = g; ctx.fillRect(-1.4, -1.3, 2.9, 2.6);
  // cheek warmth
  g = ctx.createRadialGradient(P(0.42, 0.30), 0.28, 0.02, P(0.42, 0.30), 0.28, 0.42);
  g.addColorStop(0, 'rgba(224,96,66,0.22)'); g.addColorStop(1, 'rgba(224,96,66,0)');
  ctx.fillStyle = g; ctx.fillRect(-1.4, -1.3, 2.9, 2.6);
  // under-chin shade
  ctx.fillStyle = rgbaC(dark, 0.30);
  ctx.beginPath(); ctx.ellipse(P(0.3, 0.24), 0.86, 0.5, 0.2, 0.25, 0, TAU); ctx.fill();
  ctx.restore();

  // outline
  headPath();
  ctx.strokeStyle = rgbaC('#241005', 0.85); ctx.lineWidth = 0.045; ctx.stroke();

  // ── ear + earring (visible except near-frontal) ──
  if (tn < 0.55) {
    const ex = -0.26 + tn * 0.08, ey = 0.08;
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.ellipse(ex, ey, 0.125, 0.21, -0.12, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgbaC('#241005', 0.7); ctx.lineWidth = 0.04; ctx.stroke();
    ctx.strokeStyle = rgbaC(dark, 0.8); ctx.lineWidth = 0.03;
    ctx.beginPath(); ctx.arc(ex + 0.015, ey - 0.02, 0.06, -2.4, 0.6); ctx.stroke();
    if (style.earring) {
      // jhumka: stud + bell + tiny pearl
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(ex, ey + 0.20, 0.05, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(ex - 0.075, ey + 0.26); ctx.quadraticCurveTo(ex, ey + 0.40, ex + 0.075, ey + 0.26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = GOLD_L; ctx.beginPath(); ctx.arc(ex - 0.018, ey + 0.19, 0.018, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fdf6ec'; ctx.beginPath(); ctx.arc(ex, ey + 0.435, 0.032, 0, TAU); ctx.fill();
    }
  }

  // ── brows & eyes ──
  const eyeY = -0.10 + f.lowered * 0.03;
  const nearEx = P(0.52, 0.34);
  const gz = { x: clamp(f.gaze.x, -1, 1), y: clamp(f.gaze.y + f.lowered * 0.9, -1, 1) };
  drawEye(ctx, nearEx, eyeY, 0.30, bl, gz, style, f, 1);
  // far eye fades in with turn
  if (tn > 0.22) {
    const k = norm(tn, 0.22, 0.55);
    ctx.save(); ctx.globalAlpha = k;
    drawEye(ctx, P(-0.35, -0.26), eyeY + 0.005, 0.30 * (0.55 + 0.45 * k) * 0.9, bl, gz, style, f, -1);
    ctx.restore();
  }
  // brows: long, arched, tapering (miniature style)
  ctx.strokeStyle = '#1d0f06';
  browStroke(ctx, nearEx, eyeY - 0.20 - f.brow * 0.07, 0.34, f.brow, 1);
  if (tn > 0.22) {
    ctx.save(); ctx.globalAlpha = norm(tn, 0.22, 0.55);
    browStroke(ctx, P(-0.35, -0.26), eyeY - 0.20 - f.brow * 0.06, 0.30, f.brow * 0.8, -1);
    ctx.restore();
  }

  // nostril
  ctx.strokeStyle = rgbaC('#241005', 0.65); ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.arc(P(0.80, 0.62), 0.19, 0.055, Math.PI * 0.25, Math.PI * 1.05); ctx.stroke();
  if (style.noseRing) {
    ctx.strokeStyle = GOLD; ctx.lineWidth = 0.035;
    ctx.beginPath(); ctx.arc(P(0.86, 0.70), 0.21, 0.075, Math.PI * 0.15, Math.PI * 0.95); ctx.stroke();
  }

  // ── lips (two-tone) ──
  const lipC = style.lip || '#a3402e';
  const mth = P(0.87, 0.70), mw = 0.20 + tn * 0.14, my = 0.405;
  const sm = f.smile * 0.05, part = f.lipsPart * 0.05;
  ctx.fillStyle = shade(lipC, -0.18);
  ctx.beginPath(); // upper
  ctx.moveTo(mth - mw, my - sm);
  ctx.quadraticCurveTo(mth - mw * 0.3, my - 0.055 - sm * 0.4, mth + 0.02, my - 0.045);
  ctx.quadraticCurveTo(mth + 0.05, my - 0.02, mth + 0.055, my);
  ctx.quadraticCurveTo(mth - mw * 0.4, my + 0.012, mth - mw, my - sm);
  ctx.fill();
  ctx.fillStyle = lipC;
  ctx.beginPath(); // lower
  ctx.moveTo(mth - mw * 0.92, my + 0.005 - sm);
  ctx.quadraticCurveTo(mth - mw * 0.3, my + 0.10 + part, mth + 0.03, my + 0.055 + part * 0.5);
  ctx.quadraticCurveTo(mth - mw * 0.45, my + 0.028, mth - mw * 0.92, my + 0.005 - sm);
  ctx.fill();
  if (part > 0.02) { ctx.fillStyle = '#4a1410'; ctx.beginPath(); ctx.ellipse(mth - mw * 0.35, my + 0.01, mw * 0.5, part * 0.5, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.ellipse(mth - mw * 0.35, my + 0.055, mw * 0.28, 0.018, 0, 0, TAU); ctx.fill();
  // mouth-corner accent
  ctx.fillStyle = rgbaC('#241005', 0.5);
  ctx.beginPath(); ctx.arc(mth - mw, my - sm, 0.022, 0, TAU); ctx.fill();

  // ── facial hair ──
  if (style.beard) {
    // full beard hugging the jaw from below the ear to the chin, hanging by beardLen
    const bc = style.beard === 'white' ? '#e8e0d2' : (style.beard === 'grey' ? '#9a8f80' : hairC);
    const len = style.beardLen || 0.3;
    ctx.fillStyle = bc;
    ctx.beginPath();
    ctx.moveTo(P(0.88, 0.72), 0.47);                       // beside lower lip
    ctx.quadraticCurveTo(P(0.95, 0.78), 0.66, P(0.80, 0.62), 0.84); // over chin front
    ctx.quadraticCurveTo(P(0.72, 0.55), 1.05 + len, P(0.30, 0.20), 1.12 + len); // hang
    ctx.quadraticCurveTo(P(-0.05, -0.1), 1.10 + len * 0.9, P(-0.22, -0.24), 0.78); // back up
    ctx.quadraticCurveTo(P(-0.28, -0.28), 0.45, P(-0.20, -0.22), 0.32);            // to below ear
    ctx.quadraticCurveTo(P(0.15, 0.10), 0.92, P(0.60, 0.48), 0.62);                // inner jaw line
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgbaC('#241005', 0.35); ctx.lineWidth = 0.028; ctx.stroke();
    // strands
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

  // ── front hair & headgear ──
  drawFrontHair(ctx, style, tn, t, seed);
  if (style.tilak) drawTilak(ctx, P(0.64, 0.53), -0.44, style.tilak);
  if (style.bindi) { ctx.fillStyle = '#c92f1d'; ctx.beginPath(); ctx.arc(P(0.62, 0.51), -0.44, 0.05, 0, TAU); ctx.fill(); }
  if (style.crown) drawCrown(ctx, style, tn);
  if (style.peacock) drawPeacockFeather(ctx, tn, t, seed);

  ctx.restore();
}

function rgbaC(hex, a) { return rgba(hex, a); }

function drawEye(ctx, ex, ey, s, open, gaze, style, f, side) {
  const o = clamp(open, 0.04, 1.25);
  ctx.save(); ctx.translate(ex, ey);
  // kohl-lined almond; wing extends toward the ear (−x)
  const w = s, hUp = s * 0.34 * o, hDn = s * 0.30 * (0.6 + 0.4 * o);
  // sclera
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
  // upper-lid soft shadow
  ctx.fillStyle = 'rgba(90,50,25,0.30)';
  ctx.fillRect(-w * 1.1, -hUp, 2.2 * w, hUp * 0.45);
  ctx.restore();
  // kohl rims
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
  // wing
  ctx.lineWidth = s * 0.09;
  ctx.beginPath(); ctx.moveTo(-w * 1.02, 0.02); ctx.lineTo(-w * 1.38, -s * 0.10); ctx.stroke();
  ctx.restore();
}

function browStroke(ctx, x, y, len, raise, side) {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + len * 0.62, y + 0.02 + raise * 0.01);
  ctx.quadraticCurveTo(x, y - 0.10 - raise * 0.05, x - len, y + 0.05 - raise * 0.08);
  ctx.lineWidth = 0.065; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + len * 0.62, y + 0.02 + raise * 0.01);
  ctx.quadraticCurveTo(x, y - 0.095 - raise * 0.05, x - len * 0.5, y - 0.02 - raise * 0.06);
  ctx.lineWidth = 0.09; ctx.stroke();
}

function drawTilak(ctx, x, y, kind) {
  if (kind === 'urdhva') { // Vaishnava U
    ctx.strokeStyle = '#e8dfc8'; ctx.lineWidth = 0.05;
    ctx.beginPath(); ctx.moveTo(x - 0.09, y - 0.14); ctx.quadraticCurveTo(x - 0.02, y + 0.16, x + 0.0, y + 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 0.11, y - 0.14); ctx.quadraticCurveTo(x + 0.05, y + 0.13, x + 0.0, y + 0.1); ctx.stroke();
    ctx.strokeStyle = '#c92f1d';
    ctx.beginPath(); ctx.moveTo(x + 0.01, y - 0.12); ctx.lineTo(x + 0.01, y + 0.08); ctx.stroke();
  } else if (kind === 'tripundra') { // Shaiva three lines
    ctx.strokeStyle = '#e0d6bd'; ctx.lineWidth = 0.045;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(x - 0.22, y + i * 0.09); ctx.quadraticCurveTo(x, y + i * 0.09 + 0.03, x + 0.24, y + i * 0.09); ctx.stroke();
    }
  } else { // simple red
    ctx.fillStyle = '#c92f1d';
    ctx.beginPath(); ctx.ellipse(x, y, 0.045, 0.1, 0, 0, TAU); ctx.fill();
  }
}

function drawBackHair(ctx, style, t, seed) {
  const c = style.hairColor || '#150c06';
  const mode = style.hairstyle;
  ctx.fillStyle = c;
  if (mode === 'braid' || mode === 'long') {
    // long fall behind the back
    ctx.beginPath();
    ctx.moveTo(-0.2, -1.05);
    ctx.quadraticCurveTo(-1.25, -0.6, -1.12, 0.6);
    ctx.quadraticCurveTo(-1.05, 1.6, -0.8, 2.6 + sfbm1(t * 0.6, seed) * 0.1);
    ctx.quadraticCurveTo(-0.45, 2.8, -0.42, 2.2);
    ctx.quadraticCurveTo(-0.55, 1.2, -0.42, 0.4);
    ctx.quadraticCurveTo(-0.5, -0.4, 0.1, -0.92);
    ctx.closePath(); ctx.fill();
    if (mode === 'braid') { // plait ridges
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
  const P = (a, b) => lerp(a, b, tn / 0.62);
  ctx.fillStyle = c;
  if (mode === 'veil') {
    // just a soft parting of hair visible under the veil edge
    ctx.beginPath();
    ctx.moveTo(P(0.60, 0.50), -0.70);
    ctx.quadraticCurveTo(0.0, -1.0, -0.55, -0.72);
    ctx.quadraticCurveTo(0.0, -0.82, P(0.52, 0.44), -0.60);
    ctx.closePath(); ctx.fill();
    // head-cloth cap so close-ups read as veiled
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
    // thin sideburn wisp only — the turban covers the crown
    ctx.strokeStyle = c; ctx.lineWidth = 0.055; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.30, -0.22);
    ctx.quadraticCurveTo(-0.40, 0.02, -0.36, 0.26);
    ctx.stroke();
    return;
  }
  // hairline cap common to most styles
  ctx.beginPath();
  ctx.moveTo(P(0.66, 0.56), -0.78);
  ctx.quadraticCurveTo(P(0.86, 0.8), -0.55, P(0.62, 0.52), -0.44);   // temple sweep
  ctx.quadraticCurveTo(P(0.7, 0.62), -0.7, P(0.2, 0.15), -0.78);
  ctx.quadraticCurveTo(-0.7, -1.0, -1.02, -0.25);
  ctx.quadraticCurveTo(-1.12, 0.35, -0.75, 0.75);
  ctx.quadraticCurveTo(-0.85, 0.1, -0.72, -0.35);
  ctx.quadraticCurveTo(-0.35, -0.72, 0.25, -0.62);
  ctx.quadraticCurveTo(P(0.5, 0.42), -0.6, P(0.66, 0.56), -0.78);
  ctx.closePath(); ctx.fill();
  // crown mass
  ctx.beginPath();
  ctx.ellipse(-0.12, -0.72, 0.95, 0.5, 0.08, Math.PI * 0.95, Math.PI * 2.02);
  ctx.quadraticCurveTo(P(0.3, 0.2), -0.5, -0.12, -0.5);
  ctx.closePath(); ctx.fill();
  // sheen
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
    // tie
    ctx.strokeStyle = '#8a2f1d'; ctx.lineWidth = 0.06;
    ctx.beginPath(); ctx.arc(-0.15, -1.06, 0.16, -0.6, 0.9); ctx.stroke();
  }
  if (mode === 'sagebun') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(-0.05, -1.18, 0.4, 0.3, -0.15, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.035;
    ctx.beginPath(); ctx.arc(-0.05, -1.18, 0.3, 2.5, 5.8); ctx.stroke();
    // rudraksha bead across bun
    ctx.fillStyle = '#6d4423';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-0.35 + i * 0.2, -1.02, 0.05, 0, TAU); ctx.fill(); }
  }
  if (mode === 'braid' || mode === 'long') {
    // centre parting + flowers at the parting for bridal
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

function drawCrown(ctx, style, tn) {
  const P = (a, b) => lerp(a, b, tn / 0.62);
  const kind = style.crown;
  ctx.save();
  if (kind === 'mukut') { // pointed royal crown
    const g = ctx.createLinearGradient(-0.6, -1.6, 0.6, -0.7);
    g.addColorStop(0, GOLD_D); g.addColorStop(0.5, GOLD_L); g.addColorStop(1, GOLD_D);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(P(0.72, 0.62), -0.62);
    ctx.quadraticCurveTo(P(0.55, 0.48), -1.15, P(0.18, 0.12), -1.28);
    ctx.lineTo(0.02, -1.72);                              // centre spire
    ctx.lineTo(-0.35, -1.30);
    ctx.quadraticCurveTo(-0.9, -1.2, -0.98, -0.55);
    ctx.quadraticCurveTo(-0.4, -0.9, P(0.3, 0.25), -0.8);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgbaC('#5c3a08', 0.9); ctx.lineWidth = 0.04; ctx.stroke();
    // band
    ctx.fillStyle = GOLD_D;
    ctx.beginPath();
    ctx.moveTo(P(0.75, 0.64), -0.60); ctx.quadraticCurveTo(0, -0.98, -1.0, -0.52);
    ctx.quadraticCurveTo(0, -0.78, P(0.75, 0.64), -0.48); ctx.closePath(); ctx.fill();
    // gems
    ctx.fillStyle = '#b41f2e'; ctx.beginPath(); ctx.arc(0.02, -1.3, 0.09, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1f5c78'; ctx.beginPath(); ctx.arc(-0.42, -1.06, 0.06, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0.0, -1.34, 0.025, 0, TAU); ctx.fill();
    // pearl drop at spire
    ctx.fillStyle = GOLD_L; ctx.beginPath(); ctx.arc(0.02, -1.76, 0.05, 0, TAU); ctx.fill();
  } else if (kind === 'tiara') { // delicate circlet along the hairline + maang tikka
    ctx.strokeStyle = GOLD; ctx.lineWidth = 0.055; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(P(0.60, 0.50), -0.70);
    ctx.quadraticCurveTo(-0.05, -1.06, -0.68, -0.72);
    ctx.stroke();
    // small pearls along the circlet
    ctx.fillStyle = '#f6ecd8';
    for (let i = 1; i < 6; i++) {
      const u = i / 6;
      const qx = lerp(P(0.60, 0.50), -0.68, u), qy = -0.70 + Math.sin(u * Math.PI) * -0.26;
      ctx.beginPath(); ctx.arc(qx, qy, 0.028, 0, TAU); ctx.fill();
    }
    // tikka pendant hanging onto the brow from the parting
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
    ctx.strokeStyle = rgbaC('#000', 0.28); ctx.lineWidth = 0.05;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-0.1 + i * 0.06, -0.55, 0.85 - i * 0.14, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    }
    ctx.strokeStyle = rgbaC('#241005', 0.8); ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.ellipse(-0.08, -0.72, 1.0, 0.62, 0.05, Math.PI * 0.92, Math.PI * 2.08);
    ctx.stroke();
    // brooch
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(P(0.45, 0.38), -0.98, 0.09, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(P(0.43, 0.36), -1.0, 0.03, 0, TAU); ctx.fill();
  }
  ctx.restore();
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

// ─────────────────────────── BODY ───────────────────────────
// Figure metrics (units; height ≈ 400 × build)
const FIG = {
  headR: 27, neck: 20, shoulderY: 318, shoulderW: 40, chestW: 46,
  waistY: 240, waistW: 27, hipY: 222, hipW: 33,
  upperArm: 62, foreArm: 56, hand: 20,
  thigh: 95, shin: 92, footL: 30,
};

// default standing pose; angles in radians. Arm angles: from straight down,
// positive swings forward (+x, the facing direction).
function defaultPose() {
  return {
    lean: 0, bend: 0, headTurn: 0.3, headNod: 0, headTilt: 0,
    armF: { sh: 0.12, el: 0.15, wr: 0 },   // near/front arm
    armB: { sh: -0.10, el: 0.12, wr: 0 },  // far/back arm
    legF: { hip: 0.03, knee: 0.02 }, legB: { hip: -0.05, knee: 0.04 },
    face: {}, grounded: true,
  };
}

// FK chain for one arm; returns joints in figure space
function armChain(shx, shy, a, build) {
  const ua = FIG.upperArm * build, fa = FIG.foreArm * build;
  const a1 = Math.PI / 2 * 0 + a.sh;   // measured from downward vertical
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
  // rim shade on the lower edge
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

// choli sleeve over the upper-arm segment
function sleeve(ctx, arm, armW, color, trim) {
  const u = 0.62; // sleeve length along upper arm
  const ex = lerp(arm.sh[0], arm.el[0], u), ey = lerp(arm.sh[1], arm.el[1], u);
  limb(ctx, arm.sh, [ex, ey], armW * 1.32, armW * 1.02, color, shade(color, -0.35), rgba('#241005', 0.4));
  if (trim) {
    ctx.strokeStyle = trim; ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(ex, ey, armW * 1.02, 3.4, arm.a1 + Math.PI / 2, 0, TAU);
    ctx.stroke();
  }
}

// hand: kind = relaxed | fist | hold | point | open | bless
function drawHand(ctx, x, y, ang, s, skin, kind, dark) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  ctx.fillStyle = skin;
  ctx.strokeStyle = rgba('#241005', 0.6); ctx.lineWidth = 0.9 / s;
  if (kind === 'fist' || kind === 'hold') {
    // compact curled hand: palm + wrapped fingers + thumb over
    ctx.beginPath();
    ctx.moveTo(-5.5, -1);
    ctx.quadraticCurveTo(-7.5, 6, -3.5, 10.5);
    ctx.quadraticCurveTo(1, 13.5, 5, 10);
    ctx.quadraticCurveTo(7.5, 5.5, 5.5, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = rgba(dark, 0.55); ctx.lineWidth = 0.9 / s;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(0.2 + i * 1.6, 8.5 - i * 0.4, 3.6 - i * 0.4, 0.6, 2.6); ctx.stroke();
    }
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.ellipse(-3.2, 4.5, 2.2, 4.4, 0.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(dark, 0.4); ctx.lineWidth = 0.8 / s; ctx.stroke();
  } else if (kind === 'open' || kind === 'bless') {
    ctx.beginPath();
    ctx.moveTo(-5, -2);
    ctx.quadraticCurveTo(-8, 8, -3, 15);
    ctx.quadraticCurveTo(2, 19, 6, 14);
    ctx.quadraticCurveTo(9, 8, 6, -1);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = rgba(dark, 0.55); ctx.lineWidth = 0.8 / s;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-3 + i * 3.4, 2); ctx.lineTo(-3.5 + i * 3.6, 13); ctx.stroke(); }
  } else { // relaxed: gentle taper with finger hints
    ctx.beginPath();
    ctx.moveTo(-5.5, -2);
    ctx.quadraticCurveTo(-6.5, 8, -2, 16);
    ctx.quadraticCurveTo(0.5, 19.5, 3.5, 16);
    ctx.quadraticCurveTo(7, 9, 5, -2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = rgba(dark, 0.5); ctx.lineWidth = 0.8 / s;
    for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(-2.4 + i * 3.2, 6); ctx.quadraticCurveTo(-2 + i * 3.2, 12, -1.2 + i * 3, 15); ctx.stroke(); }
  }
  ctx.restore();
}

// ── main figure ──
// opts: {x, y(ground), s(scale), facing(1|-1), style, pose, t, seed, shadow}
function _drawFigureV1(ctx, o) {
  const st = o.style, pose = Object.assign(defaultPose(), o.pose);
  const build = st.build || 1;
  const female = st.female;
  const t = o.t || 0, seed = o.seed || 1;
  const skin = st.skin, dark = st.skinShade || shade(skin, -0.3);
  const OUT = rgba('#241005', 0.4);

  if (o.shadow !== false) contactShadow(ctx, o.x, o.y + 4, 95 * o.s * build, 0.34);

  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(o.s * (o.facing || 1), o.s);

  // breathing
  const br = Math.sin(t * 1.55 + seed * 3) * 0.5 + 0.5;

  const shW = FIG.shoulderW * build * (female ? 0.82 : 1);
  const hipW = FIG.hipW * build * (female ? 1.12 : 1);
  const shoulderY = -FIG.shoulderY * build - br * 1.2;
  const waistY = -FIG.waistY * build, hipY = -FIG.hipY * build;
  const leanDx = Math.sin(pose.lean) * 90;

  // ---- legs (skirted figures skip visible legs; draw under-cloth legs anyway for males) ----
  const skirted = st.garb === 'sari' || st.garb === 'robe';
  const groundY = 0;
  function leg(Lg, front) {
    const hx = leanDx * 0.15 + (front ? 6 : -8), hy = hipY + 6;
    const th = FIG.thigh * build, sh = FIG.shin * build;
    const a1 = Math.PI + Lg.hip;                     // from hip downward
    const kx = hx + Math.sin(a1) * -th * 0, ky = hy + th; // simple vertical thigh + knee offsets
    const kx2 = hx + Math.sin(Lg.hip) * th;
    const ky2 = hy + Math.cos(Lg.hip) * th;
    const ax = kx2 + Math.sin(Lg.hip - Lg.knee) * sh;
    const ay = ky2 + Math.cos(Lg.hip - Lg.knee) * sh;
    const wTh = 16 * build * (female ? 1.05 : 1), wSh = 9.5 * build;
    limb(ctx, [hx, hy], [kx2, ky2], wTh, wTh * 0.72, front ? skin : shade(skin, -0.13), dark, OUT);
    limb(ctx, [kx2, ky2], [ax, Math.min(ay, groundY - 6)], wTh * 0.7, wSh * 0.75, front ? skin : shade(skin, -0.13), dark, OUT);
    jointPatch(ctx, [kx2, ky2], wTh * 0.66, front ? skin : shade(skin, -0.13));
    // foot
    ctx.fillStyle = front ? skin : shade(skin, -0.13);
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

  // ---- far arm behind everything ----
  const shBx = leanDx * 0.8 - shW * 0.55, shBy = shoulderY + 6;
  const armB = armChain(shBx, shBy, pose.armB, build);
  const armW = (female ? 7.5 : 10) * build;
  limb(ctx, armB.sh, armB.el, armW * 1.15, armW * 0.8, shade(skin, -0.15), dark, OUT);
  limb(ctx, armB.el, armB.wr, armW * 0.8, armW * 0.6, shade(skin, -0.15), dark, OUT);
  jointPatch(ctx, armB.el, armW * 0.83, shade(skin, -0.15));
  jointPatch(ctx, armB.sh, armW * 1.18, shade(skin, -0.15));
  if (female && st.garb === 'sari') sleeve(ctx, armB, armW, shade(st.clothMain || '#8c1f28', -0.16), st.clothAccent);
  drawHand(ctx, armB.wr[0], armB.wr[1], -armB.a2 + (pose.armB.wr || 0), build * (female ? 0.85 : 1), shade(skin, -0.15), pose.armB.hand || 'relaxed', dark);
  if (st.armlets) { ctx.fillStyle = GOLD_D; ctx.beginPath(); ctx.ellipse(lerp(armB.sh[0], armB.el[0], 0.45), lerp(armB.sh[1], armB.el[1], 0.45), armW * 1.02, 4.4, armB.a1, 0, TAU); ctx.fill(); }

  // ---- legs ----
  if (!skirted) { leg(pose.legB, false); }

  // ---- torso ----
  const chestTop = shoulderY - 8;
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
  if (bare) {
    ctx.fillStyle = skin; ctx.fill();
    ctx.save(); ctx.clip();
    let g = ctx.createLinearGradient(-shW, 0, shW, 0);
    g.addColorStop(0, rgba(dark, 0.5)); g.addColorStop(0.35, 'rgba(0,0,0,0)');
    g.addColorStop(0.75, 'rgba(255,240,205,0.12)'); g.addColorStop(1, rgba(dark, 0.35));
    ctx.fillStyle = g; ctx.fillRect(-shW - 20 + leanDx, chestTop - 10, shW * 2 + 40, -chestTop);
    // collarbone + pec hints
    ctx.strokeStyle = rgba(dark, 0.6); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(leanDx * 0.8 - shW * 0.5, chestTop + 16); ctx.quadraticCurveTo(leanDx * 0.8, chestTop + 21, leanDx * 0.8 + shW * 0.5, chestTop + 15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(leanDx * 0.8 + 2, chestTop + 30); ctx.quadraticCurveTo(leanDx * 0.7, waistY - 24, leanDx * 0.3, waistY - 4); ctx.stroke();
    ctx.beginPath(); ctx.arc(leanDx * 0.4, waistY - 12, 3.0, 0.3, 2.4); ctx.stroke(); // navel
    ctx.restore();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
    // sacred thread (yajñopavīta) for brahmin disguise
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
    // clothed torso: blouse / robe / armour
    const cm = st.clothMain || '#7a4a2e';
    ctx.fillStyle = cm; ctx.fill();
    ctx.save(); ctx.clip();
    let g = ctx.createLinearGradient(-shW, 0, shW + 14, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.38)'); g.addColorStop(0.45, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(255,235,200,0.14)');
    ctx.fillStyle = g; ctx.fillRect(-shW - 24 + leanDx, chestTop - 10, shW * 2 + 52, -chestTop);
    if (st.garb === 'armor') {
      // gilded cuirass bands + sun medallion (Karṇa)
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
      // choli midriff: skin band between blouse and skirt
      ctx.fillStyle = skin;
      ctx.fillRect(leanDx * 0.3 - FIG.waistW * build, waistY - 12, FIG.waistW * 2 * build, waistY * 0.001 + 26);
      ctx.fillStyle = rgba(dark, 0.25);
      ctx.fillRect(leanDx * 0.3 - FIG.waistW * build, waistY + 8, FIG.waistW * 2 * build, 6);
    }
    ctx.restore();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
  }

  // ---- lower garment ----
  drawLowerGarment(ctx, st, pose, hipY, hipW, build, t, seed, female);

  // ---- near leg over dhoti? (no; dhoti covers) ----
  if (!skirted) leg(pose.legF, true);
  // re-hem: dhoti hem swings over front leg slightly — skip for clarity

  // ---- necklaces / uttariya over torso ----
  drawTorsoOrnaments(ctx, st, shoulderY, waistY, shW, leanDx, t, seed, female, build);

  // ---- near arm ----
  const shFx = leanDx * 0.8 + shW * 0.62, shFy = shoulderY + 8;
  const armF = armChain(shFx, shFy, pose.armF, build);
  limb(ctx, armF.sh, armF.el, armW * 1.2, armW * 0.82, skin, dark, OUT);
  limb(ctx, armF.el, armF.wr, armW * 0.82, armW * 0.62, skin, dark, OUT);
  jointPatch(ctx, armF.el, armW * 0.86, skin);
  jointPatch(ctx, armF.sh, armW * 1.22, skin);
  // deltoid shade so the shoulder reads as a form, not a disc
  ctx.fillStyle = rgba(dark, 0.22);
  ctx.beginPath(); ctx.arc(armF.sh[0] + 2, armF.sh[1] + 4, armW * 0.95, -0.4, 1.8); ctx.fill();
  // elbow crease (only when the arm is meaningfully bent)
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
  drawHand(ctx, armF.wr[0], armF.wr[1], -armF.a2 + (pose.armF.wr || 0), build * (female ? 0.85 : 1), skin, pose.armF.hand || 'relaxed', dark);

  // ---- neck & head ----
  const neckX = leanDx * 0.9, headCy = shoulderY - FIG.neck * build - FIG.headR * 0.72;
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
  drawHead(ctx, FIG.headR * build * (female ? 0.94 : 1), st, face, t, seed);
  ctx.restore();

  // garland worn (after head so it sits on chest)
  if (st.wearGarland) {
    ctx.save();
    const gx = neckX, gy = shoulderY + 10;
    garlandStrand(ctx, gx - 26, gy, gx + 26, gy, 74 + Math.sin(t * 2 + seed) * 2, t, seed + 4, 0.75);
    ctx.restore();
  }

  ctx.restore();
}

function drawLowerGarment(ctx, st, pose, hipY, hipW, build, t, seed, female) {
  const OUT = rgba('#241005', 0.62);
  const sway = sfbm1(t * 0.7, seed + 2) * 6 + (pose.clothSway || 0);
  if (st.garb === 'sari' || st.garb === 'robe') {
    const cm = st.clothMain || '#8c1f28', acc = st.clothAccent || GOLD;
    // A-line skirt to ankles
    ctx.beginPath();
    ctx.moveTo(-hipW - 2, hipY + 4);
    ctx.quadraticCurveTo(-hipW - 16, -110, -hipW - 26 + sway, -6);
    ctx.quadraticCurveTo(0, 6 + Math.abs(sway) * 0.4, hipW + 30 + sway, -4);
    ctx.quadraticCurveTo(hipW + 16, -110, hipW + 2, hipY + 4);
    ctx.closePath();
    const g = ctx.createLinearGradient(-hipW - 20, 0, hipW + 24, 0);
    g.addColorStop(0, shade(cm, -0.3)); g.addColorStop(0.5, cm); g.addColorStop(1, shade(cm, -0.18));
    ctx.fillStyle = g; ctx.fill();
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
    const len = st.dhotiLen || 210; // from hip downward
    const hem = -Math.max(6, (-hipY) - len);
    ctx.beginPath();
    ctx.moveTo(-hipW - 3, hipY + 2);
    ctx.quadraticCurveTo(-hipW - 12, hipY + len * 0.55, -hipW - 6 + sway * 0.6, hem);
    ctx.quadraticCurveTo(0, hem + 8, hipW + 8 + sway, hem - 2);
    ctx.quadraticCurveTo(hipW + 13, hipY + len * 0.5, hipW + 3, hipY + 2);
    ctx.closePath();
    const g = ctx.createLinearGradient(-hipW, 0, hipW + 10, 0);
    g.addColorStop(0, shade(cm, -0.28)); g.addColorStop(0.45, cm); g.addColorStop(1, shade(cm, -0.12));
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
    // centre pleat fan
    ctx.strokeStyle = rgba('#000', 0.18); ctx.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 3, hipY + 8);
      ctx.quadraticCurveTo(i * 8 + sway * 0.4, hipY + len * 0.6, i * 12 + sway * 0.8, hem + 4);
      ctx.stroke();
    }
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

function drawTorsoOrnaments(ctx, st, shoulderY, waistY, shW, leanDx, t, seed, female, build) {
  // necklace tiers
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
  if (lv >= 3) { // long haar
    ctx.strokeStyle = rgba('#e8b64c', 0.9); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(nx - 16, shoulderY + 10); ctx.quadraticCurveTo(nx, waistY - 30, nx + 16, shoulderY + 10); ctx.stroke();
  }
  // rudraksha mala for sages
  if (st.mala) {
    ctx.strokeStyle = '#6d4423'; ctx.lineWidth = 3; ctx.setLineDash([3.4, 3]);
    ctx.beginPath(); ctx.moveTo(nx - 18, shoulderY + 6); ctx.quadraticCurveTo(nx, waistY - 20, nx + 18, shoulderY + 6); ctx.stroke();
    ctx.setLineDash([]);
  }
  // uttarīya / angavastram: scarf over shoulder with flutter
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
    // trailing end behind the far shoulder — slim, fluttering
    ctx.fillStyle = rgba(sc, 0.85);
    ctx.beginPath();
    ctx.moveTo(nx - shW * 0.95, shoulderY - 6);
    ctx.quadraticCurveTo(nx - shW * 1.35, shoulderY + 45 + fl * 12, nx - shW * 1.28 + fl * 12, shoulderY + 108 + fl * 16);
    ctx.quadraticCurveTo(nx - shW * 1.32 + fl * 14, shoulderY + 124 + fl * 16, nx - shW * 1.12 + fl * 10, shoulderY + 120 + fl * 14);
    ctx.quadraticCurveTo(nx - shW * 1.02, shoulderY + 60, nx - shW * 0.82, shoulderY + 14);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // sari pallu: across torso over far shoulder, trailing, animated
  if (female && st.garb === 'sari' && st.pallu !== false) {
    const cm = st.clothMain || '#8c1f28';
    const fl = sfbm1(t * 0.8, seed + 9), fl2 = sfbm1(t * 0.65 + 3, seed + 11);
    ctx.save();
    ctx.fillStyle = shade(cm, 0.06);
    ctx.beginPath();
    ctx.moveTo(nx + shW * 0.75, waistY + 14);
    ctx.quadraticCurveTo(nx + shW * 0.3, shoulderY + 46, nx - shW * 0.72, shoulderY + 4);
    ctx.quadraticCurveTo(nx - shW * 1.15, shoulderY + 40 + fl * 8, nx - shW * 1.35 + fl * 12, shoulderY + 150 + fl2 * 22);
    ctx.quadraticCurveTo(nx - shW * 1.5 + fl * 14, shoulderY + 210 + fl2 * 26, nx - shW * 1.05 + fl2 * 10, shoulderY + 228 + fl * 18);
    ctx.quadraticCurveTo(nx - shW * 0.7, shoulderY + 160, nx - shW * 0.55, shoulderY + 60);
    ctx.quadraticCurveTo(nx + shW * 0.1, shoulderY + 70, nx + shW * 0.5, waistY + 22);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#241005', 0.35); ctx.lineWidth = 1.3; ctx.stroke();
    // gold border along pallu edge
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
  // veil (Kunti): cloth over head handled in head hair mode 'veil' + here shoulder drape
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

// ─────────────────────── v3 RENDERER (person3.js) ───────────────────────
// The Draupadī film now renders its cast through drawHead3/drawFigure3 (the
// director-approved v3 look), loaded before this file via story.json engineFiles.
// drawHead/drawFigure below are thin delegating wrappers; the v1 bodies are
// preserved as _drawHeadV1/_drawFigureV1 and every other v1 helper (drawHand,
// limb, drawCrown, sleeve, drawLowerGarment, drawTorsoOrnaments, defaultPose,
// armChain, FIG …) stays live — world.js's drawSeated still uses them.
//
// Head turn: legacy face.turn (0=profile … frontal) is remapped to v3's native
// turn (0=frontal … 1=profile) with the SAME ×1.6 curve drawFigure3 applies to
// pose.headTurn, so a standalone drawHead matches a figured head.
function drawHead(ctx, R, style, face, t, seed) {
  const f = face || {};
  const v3face = Object.assign({}, f, { turn: clamp((f.turn == null ? 0.3 : f.turn) * 1.6, 0, 1) });
  return drawHead3(ctx, R, style, v3face, t, seed);
}
function drawFigure(ctx, o) { return drawFigure3(ctx, o); }
