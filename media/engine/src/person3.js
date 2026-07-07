// ── person3.js ── figure renderer v3: LOOK-DEV SPIKE (iteration 2).
// Drawing-construction approach: round cranium + short jaw, features on the
// eye line at mid-skull, large almond kohl eyes, profile built from feature
// steps that blend in with turn, FK limbs (same sh/el angle semantics as v2)
// rendered as ONE tapered ribbon each — no capsule joints.
// Exposes drawHead3 / drawFigure3 for side-by-side comparison; the port
// swaps these in as drawHead / drawFigure once approved.
'use strict';

// ───────────────────────── HEAD v3 ─────────────────────────
// face: {turn 0(front)..1(profile), smile -1..1, eyeOpen 0..1.2, gaze{x,y},
//        brow -1(anger)..1(raised), lipsPart 0..1, lowered 0..1}
function drawHead3(ctx, R, style, face, t, seed) {
  const f = Object.assign({ turn: 0.5, smile: 0.1, eyeOpen: 1, gaze: { x: 0, y: 0 }, brow: 0, lipsPart: 0, lowered: 0 }, face);
  const tn = clamp(f.turn, 0, 1);
  const skin = style.skin, dark = style.skinShade || shade(skin, -0.28);
  const hairC = style.hairColor || '#170d08';
  const INKA = rgba('#26130a', 0.9);
  const female = !!style.female;

  ctx.save();
  ctx.scale(R, R);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // blink
  const cyc = (t * 0.29 + hash1(seed) * 7) % 4.6;
  const blink = cyc < 0.13 ? Math.sin(cyc / 0.13 * Math.PI) : 0;
  const open = clamp(f.eyeOpen - blink * 1.2, 0.06, 1.2);

  // ── construction ──
  // facing +x. P() interpolates front(0)→profile(1); d blends profile
  // feature steps (brow ridge / nose / lips) into the face edge.
  const P = (front, prof) => lerp(front, prof, tn);
  const d = smooth(norm(tn, 0.25, 0.92));

  const E = (fx, px) => lerp(fx, px, d);   // face-edge blend front→profile depth
  const chin = [P(0.14, 0.36), 1.10];
  const chinB = [P(-0.12, 0.10), 1.14];

  const headPath = () => {
    ctx.beginPath();
    ctx.moveTo(P(0.0, 0.06), -1.10);                              // crown
    ctx.quadraticCurveTo(P(0.52, 0.62), -1.04, P(0.66, 0.76), -0.76); // forehead
    ctx.quadraticCurveTo(P(0.86, 0.96), -0.58, E(0.84, 0.94), -0.30); // to brow
    // face edge: smooth curve segments through feature landmarks;
    // sharp only at the nose tip and the lip notch
    ctx.quadraticCurveTo(E(0.86, 0.89), -0.18, E(0.86, 0.91), -0.04); // brow ridge → bridge root
    ctx.quadraticCurveTo(E(0.87, 0.97), 0.12, E(0.86, 1.12), 0.30);   // bridge slope
    ctx.lineTo(E(0.855, 1.17), 0.345);                                // NOSE TIP
    ctx.quadraticCurveTo(E(0.845, 1.00), 0.42, E(0.83, 0.92), 0.455); // under-nose
    ctx.quadraticCurveTo(E(0.815, 0.91), 0.50, E(0.80, 0.97), 0.575); // philtrum → upper lip
    ctx.quadraticCurveTo(E(0.78, 0.98), 0.635, E(0.765, 0.88), 0.695);// lip notch
    ctx.quadraticCurveTo(E(0.74, 0.97), 0.755, E(0.71, 0.93), 0.83);  // lower lip
    ctx.quadraticCurveTo(E(0.67, 0.82), 0.895, E(0.60, 0.90), 0.99);  // chin crease → chin ball back out
    ctx.quadraticCurveTo(E(0.45, 0.74), 1.12, chin[0], chin[1]);  // under the chin ball → chin front
    ctx.quadraticCurveTo(P(0.02, 0.24), 1.16, chinB[0], chinB[1]);// chin round
    ctx.quadraticCurveTo(P(-0.44, -0.24), 1.04, P(-0.64, -0.44), 0.64); // jaw
    ctx.quadraticCurveTo(-0.84, 0.40, -0.88, 0.05);               // ear-side cheek
    ctx.quadraticCurveTo(-0.99, -0.22, -0.94, -0.48);             // skull back
    ctx.quadraticCurveTo(-0.90, -0.88, -0.56, -0.96);             // back-top
    ctx.quadraticCurveTo(-0.22, -1.12, P(0.0, 0.06), -1.10);      // close crown
    ctx.closePath();
  };

  // back hair silhouette behind skull
  hair3Back(ctx, style, t, seed, tn);

  headPath(); ctx.fillStyle = skin; ctx.fill();

  // modelling: narrow core-shadow band along the back edge + cheek blush
  ctx.save(); headPath(); ctx.clip();
  ctx.fillStyle = rgba(dark, 0.20);
  ctx.beginPath();
  ctx.moveTo(-0.95, -0.70);
  ctx.quadraticCurveTo(-0.52, -0.30, -0.52, 0.30);
  ctx.quadraticCurveTo(-0.50, 0.85, -0.05, 1.16);
  ctx.quadraticCurveTo(-0.70, 1.10, -1.0, 0.35);
  ctx.closePath(); ctx.fill();
  // cheek blush
  ctx.fillStyle = rgba('#d96a4a', female ? 0.15 : 0.09);
  ctx.beginPath(); ctx.ellipse(P(0.42, 0.62), 0.44, 0.24, 0.15, -0.1, 0, TAU); ctx.fill();
  // forehead light
  ctx.fillStyle = 'rgba(255,244,214,0.13)';
  ctx.beginPath(); ctx.ellipse(P(0.16, 0.36), -0.52, 0.50, 0.32, 0.15, 0, TAU); ctx.fill();
  // chin/lower-lip shadow
  ctx.fillStyle = rgba(dark, 0.16);
  ctx.beginPath(); ctx.ellipse(P(0.05, 0.45), 0.90, 0.17, 0.06, 0, 0, TAU); ctx.fill();
  ctx.restore();

  headPath(); ctx.strokeStyle = INKA; ctx.lineWidth = 0.055; ctx.stroke();

  // ── ear: rides the back silhouette edge near-front, drifts to mid-skull in profile ──
  if (tn > 0.12) {
    const ea = Math.min(1, norm(tn, 0.12, 0.32));
    const ex = P(-0.84, -0.38), ey = 0.10;
    ctx.save(); ctx.globalAlpha = ea;
    ctx.fillStyle = skin;
    const earOuter = () => {
      ctx.beginPath();
      ctx.moveTo(ex + 0.10, ey - 0.14);                                  // attach, top
      ctx.quadraticCurveTo(ex - 0.06, ey - 0.32, ex - 0.19, ey - 0.18);  // helix top-back
      ctx.quadraticCurveTo(ex - 0.27, ey + 0.02, ex - 0.13, ey + 0.20);  // back curve
      ctx.quadraticCurveTo(ex - 0.03, ey + 0.29, ex + 0.08, ey + 0.20);  // lobe → attach
    };
    earOuter(); ctx.closePath(); ctx.fill();
    earOuter(); ctx.strokeStyle = INKA; ctx.lineWidth = 0.042; ctx.stroke(); // outer edge only — no seam at the attach side
    ctx.strokeStyle = rgba(dark, 0.6); ctx.lineWidth = 0.03;
    ctx.beginPath(); ctx.arc(ex - 0.07, ey - 0.02, 0.09, -2.5, 0.7); ctx.stroke();
    if (style.earring) {
      ctx.fillStyle = GOLD;
      ctx.beginPath(); ctx.arc(ex - 0.03, ey + 0.32, 0.05, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fdf6ec';
      ctx.beginPath(); ctx.arc(ex - 0.045, ey + 0.305, 0.015, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ── eyes on the mid-skull line: large almond, kohl-lined ──
  const eyeY = 0.06 + f.lowered * 0.05;
  const nearX = P(0.36, 0.56);
  const farX = P(-0.36, -0.06);
  const eyeW = 0.30 * P(1, 0.78), eyeH = 0.155;
  eye3(ctx, nearX, eyeY, eyeW, eyeH, open, f, style, 1, tn);
  if (tn < 0.72) {
    ctx.save();
    if (tn > 0.5) ctx.globalAlpha = norm(0.72, tn, 0.5) ? 1 - norm(tn, 0.5, 0.72) : 1;
    eye3(ctx, farX, eyeY, eyeW * P(1, 0.7), eyeH, open, f, style, -1, tn);
    ctx.restore();
  }
  // brows: the expression carriers
  brow3(ctx, nearX, eyeY - 0.20, 0.36, f.brow, f.smile, 1);
  if (tn < 0.72) {
    ctx.save();
    if (tn > 0.5) ctx.globalAlpha = 1 - norm(tn, 0.5, 0.72);
    brow3(ctx, farX, eyeY - 0.20, 0.32, f.brow * 0.9, f.smile, -1);
    ctx.restore();
  }

  // ── nose: inside-silhouette bracket, fading as the silhouette takes over ──
  const nA = 1 - norm(d, 0.35, 0.7);
  if (nA > 0.02) {
    ctx.strokeStyle = rgba('#26130a', 0.55 * nA); ctx.lineWidth = 0.042;
    const nx0 = P(0.08, 0.34);
    ctx.beginPath();
    ctx.moveTo(nx0, 0.14);
    ctx.quadraticCurveTo(nx0 + 0.08, 0.32, nx0 + 0.045, 0.42);
    ctx.stroke();
    // nostril flicks
    ctx.beginPath(); ctx.arc(nx0 - 0.09, 0.415, 0.05, 0.5, 2.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(nx0 + 0.075, 0.43, 0.045, 0.9, 2.5); ctx.stroke();
  }

  // ── mouth (in profile it slides back to meet the lip step in the silhouette) ──
  const mx = P(0.05, 0.62), mw = 0.34 * P(1, 0.72);
  const my = 0.68, sm = f.smile;
  const lipC = style.lip || (female ? '#a83a30' : '#8a4030');
  if (f.lipsPart > 0.08) {
    // open mouth
    const oh = 0.07 + f.lipsPart * 0.14;
    ctx.fillStyle = '#5c201a';
    ctx.beginPath();
    ctx.moveTo(mx - mw * 0.62, my - sm * 0.06);
    ctx.quadraticCurveTo(mx, my - 0.05 - sm * 0.07, mx + mw * 0.62, my - sm * 0.055);
    ctx.quadraticCurveTo(mx + mw * 0.42, my + oh, mx, my + oh + 0.02);
    ctx.quadraticCurveTo(mx - mw * 0.42, my + oh, mx - mw * 0.62, my - sm * 0.06);
    ctx.fill();
    ctx.strokeStyle = rgba('#26130a', 0.75); ctx.lineWidth = 0.038; ctx.stroke();
    if (f.lipsPart > 0.3) { // upper teeth
      ctx.fillStyle = '#f4ead8';
      ctx.beginPath();
      ctx.moveTo(mx - mw * 0.48, my - sm * 0.05 + 0.005);
      ctx.quadraticCurveTo(mx, my - 0.03 - sm * 0.06, mx + mw * 0.48, my - sm * 0.045 + 0.005);
      ctx.quadraticCurveTo(mx + mw * 0.36, my + 0.045, mx, my + 0.05);
      ctx.quadraticCurveTo(mx - mw * 0.36, my + 0.045, mx - mw * 0.48, my - sm * 0.05 + 0.005);
      ctx.closePath(); ctx.fill();
    }
  } else {
    // closed: one expressive line, upper-lip hint, fuller colored lower lip
    ctx.strokeStyle = rgba(lipC, female ? 0.9 : 0.55);
    ctx.lineWidth = female ? 0.10 : 0.075;
    ctx.beginPath();
    ctx.moveTo(mx - mw * 0.48, my - sm * 0.055 + 0.02);
    ctx.quadraticCurveTo(mx, my + sm * 0.055 + 0.05, mx + mw * 0.48, my - sm * 0.05 + 0.02);
    ctx.stroke();
    ctx.strokeStyle = rgba('#26130a', 0.8); ctx.lineWidth = 0.045;
    ctx.beginPath();
    ctx.moveTo(mx - mw * 0.58, my - sm * 0.07);
    ctx.quadraticCurveTo(mx, my + sm * 0.09, mx + mw * 0.58, my - sm * 0.06);
    ctx.stroke();
    // corner dimples when smiling
    if (sm > 0.3) {
      ctx.lineWidth = 0.032;
      ctx.beginPath(); ctx.arc(mx - mw * 0.66, my - sm * 0.075 + 0.02, 0.035, -1.7, -0.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(mx + mw * 0.64, my - sm * 0.06 + 0.02, 0.035, -2.9, -1.5); ctx.stroke();
    }
  }

  // marks
  if (style.tilak) tilak3(ctx, P(0.02, 0.42), -0.44, style.tilak);
  if (style.bindi) { ctx.fillStyle = '#c92f1d'; ctx.beginPath(); ctx.arc(P(0.01, 0.40), -0.42, 0.055, 0, TAU); ctx.fill(); }

  // facial hair
  if (style.moustache) {
    const mc = style.beard === 'white' ? '#ddd4c4' : (style.beard === 'grey' ? '#9a9084' : hairC);
    const lift = style.moustache === 2 ? 0.07 : 0;
    const backR = P(1, 0.45), frontR = P(1, 0.8); // far lobe shrinks toward profile
    ctx.fillStyle = mc;
    ctx.beginPath();
    ctx.moveTo(mx, my - 0.085);
    ctx.quadraticCurveTo(mx - mw * 0.55 * backR, my - 0.22, mx - mw * 0.95 * backR, my - 0.13 - lift);
    ctx.quadraticCurveTo(mx - mw * 0.5 * backR, my - 0.085, mx, my - 0.02);
    ctx.quadraticCurveTo(mx + mw * 0.5 * frontR, my - 0.085, mx + mw * 0.9 * frontR, my - 0.125 - lift * 0.6);
    ctx.quadraticCurveTo(mx + mw * 0.5 * frontR, my - 0.21, mx, my - 0.085);
    ctx.closePath(); ctx.fill();
  }
  if (style.beard) {
    const bc = style.beard === 'white' ? '#e8e0d2' : (style.beard === 'grey' ? '#9a9084' : hairC);
    const len = (style.beardLen || 0.3) * 0.9;
    ctx.fillStyle = bc;
    ctx.beginPath();
    ctx.moveTo(P(-0.62, -0.42), 0.52);
    ctx.quadraticCurveTo(P(-0.5, -0.28), 1.05, P(-0.16, 0.04), 1.20 + len * 0.55);
    ctx.quadraticCurveTo(P(0.10, 0.30), 1.28 + len, P(0.34, 0.52), 1.16 + len * 0.5);
    ctx.quadraticCurveTo(P(0.52, 0.72), 0.98, P(0.56, 0.80), 0.72);
    ctx.quadraticCurveTo(P(0.34, 0.56), 0.86, P(0.05, 0.40), 0.86);
    ctx.quadraticCurveTo(P(-0.36, -0.16), 0.82, P(-0.62, -0.42), 0.52);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#26130a', 0.4); ctx.lineWidth = 0.035; ctx.stroke();
    // a few comb strokes
    ctx.strokeStyle = rgba(shade(bc, -0.25), 0.5); ctx.lineWidth = 0.028;
    for (let i = 0; i < 3; i++) {
      const u = (i + 1) / 4;
      ctx.beginPath();
      ctx.moveTo(P(lerp(-0.4, 0.4, u), lerp(-0.2, 0.6, u)), 0.9);
      ctx.quadraticCurveTo(P(lerp(-0.35, 0.42, u), lerp(-0.14, 0.62, u)), 1.05, P(lerp(-0.2, 0.35, u), lerp(0.0, 0.55, u)), 1.14 + len * 0.6);
      ctx.stroke();
    }
  }

  // front hair + headgear
  hair3Front(ctx, style, t, seed, tn);
  if (style.crown === 'mukut') crown3Mukut(ctx, tn);
  else if (style.crown === 'tiara') crown3Tiara(ctx, tn);
  else if (style.crown === 'turban') crown3Turban(ctx, style, tn);
  if (style.peacock) peacock3(ctx, tn, t, seed);

  ctx.restore();
}

// almond eye with kohl wing. side: +1 near (face side), -1 far.
function eye3(ctx, x, y, w, h, open, f, style, side, tn) {
  const o = clamp(open, 0.06, 1.2);
  const inX = -side * w * 0.5, outX = side * w * 0.55; // inner corner toward nose
  ctx.save(); ctx.translate(x, y);
  // white
  ctx.beginPath();
  ctx.moveTo(inX, 0.015);
  ctx.quadraticCurveTo(side * w * 0.08, -h * o, outX, -h * 0.12);
  ctx.quadraticCurveTo(side * w * 0.10, h * (0.45 + 0.5 * o), inX, 0.015);
  ctx.closePath();
  ctx.fillStyle = '#f8f0e2'; ctx.fill();
  ctx.save(); ctx.clip();
  // iris: large, warm
  const ix = clamp(f.gaze.x + tn * 0.35, -1, 1) * w * 0.22 * (side === 1 ? 1 : 0.8);
  const iy = clamp(f.gaze.y + f.lowered * 0.8, -1, 1) * h * 0.5;
  ctx.fillStyle = style.iris || '#4a2c10';
  ctx.beginPath(); ctx.arc(ix, iy + h * 0.08, w * 0.30, 0, TAU); ctx.fill();
  ctx.fillStyle = '#150b04';
  ctx.beginPath(); ctx.arc(ix, iy + h * 0.08, w * 0.155, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath(); ctx.arc(ix - w * 0.09, iy - h * 0.08, w * 0.06, 0, TAU); ctx.fill();
  // upper-lid soft shadow
  ctx.fillStyle = 'rgba(90,50,25,0.20)';
  ctx.fillRect(-w * 0.6, -h * 1.3, w * 1.25, h * (1.3 - o * 0.72));
  ctx.restore();
  // kohl lash line + wing
  ctx.strokeStyle = '#1b0d05'; ctx.lineCap = 'round';
  ctx.lineWidth = h * 0.40;
  ctx.beginPath();
  ctx.moveTo(inX, 0.01);
  ctx.quadraticCurveTo(side * w * 0.08, -h * (o + 0.18), outX, -h * 0.14);
  ctx.stroke();
  ctx.lineWidth = h * 0.30;
  ctx.beginPath();
  ctx.moveTo(outX, -h * 0.14);
  ctx.lineTo(outX + side * w * 0.18, -h * 0.34);
  ctx.stroke();
  // lower lid: faint
  ctx.strokeStyle = rgba('#1b0d05', 0.25); ctx.lineWidth = h * 0.13;
  ctx.beginPath();
  ctx.moveTo(inX * 0.85, h * 0.28);
  ctx.quadraticCurveTo(side * w * 0.08, h * (0.42 + 0.3 * o), outX * 0.85, h * 0.22);
  ctx.stroke();
  ctx.restore();
}

// brow: arched, tapered toward the inner end; raise>0 lifts, <0 knits (anger)
function brow3(ctx, x, y, len, raise, smile, side) {
  const inX = x - side * len * 0.45;   // toward nose
  const outX = x + side * len * 0.55;  // toward face edge / temple
  const inY = y + (raise < 0 ? 0.11 * -raise : -raise * 0.09);
  const peakX = x + side * len * 0.12;
  const peakY = y - 0.075 - Math.max(raise, 0) * 0.07 - smile * 0.012;
  ctx.strokeStyle = '#20100a'; ctx.lineCap = 'round';
  ctx.lineWidth = 0.085;
  ctx.beginPath();
  ctx.moveTo(outX, y + 0.015);
  ctx.quadraticCurveTo(peakX, peakY, lerp(peakX, inX, 0.6), lerp(peakY, inY, 0.65));
  ctx.stroke();
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(lerp(peakX, inX, 0.55), lerp(peakY, inY, 0.6));
  ctx.lineTo(inX, inY);
  ctx.stroke();
}

function tilak3(ctx, x, y, kind) {
  if (kind === 'urdhva') {
    ctx.strokeStyle = '#e8dfc8'; ctx.lineWidth = 0.045;
    ctx.beginPath(); ctx.moveTo(x - 0.08, y - 0.12); ctx.quadraticCurveTo(x - 0.01, y + 0.14, x, y + 0.09); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 0.09, y - 0.12); ctx.quadraticCurveTo(x + 0.03, y + 0.12, x, y + 0.09); ctx.stroke();
    ctx.strokeStyle = '#c92f1d';
    ctx.beginPath(); ctx.moveTo(x + 0.005, y - 0.10); ctx.lineTo(x + 0.005, y + 0.06); ctx.stroke();
  } else if (kind === 'tripundra') {
    ctx.strokeStyle = '#e0d6bd'; ctx.lineWidth = 0.04;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(x - 0.2, y + i * 0.08); ctx.quadraticCurveTo(x, y + i * 0.08 + 0.025, x + 0.21, y + i * 0.08); ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#c92f1d';
    ctx.beginPath(); ctx.ellipse(x, y, 0.04, 0.09, 0, 0, TAU); ctx.fill();
  }
}

function hair3Back(ctx, style, t, seed, tn) {
  const c = style.hairColor || '#170d08';
  const mode = style.hairstyle;
  ctx.fillStyle = c;
  if (mode === 'braid' || mode === 'long') {
    ctx.beginPath();
    ctx.moveTo(-0.1, -1.06);
    ctx.quadraticCurveTo(-1.12, -0.76, -1.06, 0.3);
    ctx.quadraticCurveTo(-1.02, 1.4, -0.74, 2.5 + sfbm1(t * 0.5, seed) * 0.08);
    ctx.quadraticCurveTo(-0.52, 2.72, -0.44, 2.3);
    ctx.quadraticCurveTo(-0.54, 1.2, -0.58, 0.3);
    ctx.quadraticCurveTo(-0.64, -0.5, 0.05, -0.94);
    ctx.closePath(); ctx.fill();
    if (mode === 'braid') {
      ctx.strokeStyle = 'rgba(255,235,200,0.20)'; ctx.lineWidth = 0.05;
      for (let i = 0; i < 6; i++) {
        const u = i / 6, yy = 0.5 + u * 1.7;
        ctx.beginPath();
        ctx.arc(-0.70 + sfbm1(u * 4, seed) * 0.03, yy, 0.13, -0.9, 1.6);
        ctx.stroke();
      }
    }
  } else if (mode === 'sagebun' || mode === 'bun') {
    ctx.beginPath(); ctx.ellipse(-0.55, -0.85, 0.4, 0.34, -0.45, 0, TAU); ctx.fill();
  }
}

function hair3Front(ctx, style, t, seed, tn) {
  const c = style.hairColor || '#170d08';
  const cHi = shade(c, 0.16);
  const mode = style.hairstyle;
  const P = (front, prof) => lerp(front, prof, tn);
  if (mode === 'veil') {
    if (style.veil) {
      ctx.fillStyle = style.veil;
      ctx.beginPath();
      ctx.moveTo(P(0.66, 0.82), -0.56);
      ctx.quadraticCurveTo(0.1, -1.30, -0.72, -1.0);
      ctx.quadraticCurveTo(-1.24, -0.5, -1.14, 0.5);
      ctx.quadraticCurveTo(-1.09, 1.1, -0.94, 1.5);
      ctx.lineTo(-0.70, 1.4);
      ctx.quadraticCurveTo(-0.90, 0.5, -0.85, -0.2);
      ctx.quadraticCurveTo(-0.72, -0.90, -0.02, -0.94);
      ctx.quadraticCurveTo(0.4, -0.90, P(0.58, 0.74), -0.48);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba('#26130a', 0.5); ctx.lineWidth = 0.04; ctx.stroke();
    }
    // hair peek: smooth arc under the veil
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(P(0.56, 0.72), -0.44);
    ctx.quadraticCurveTo(0.0, -0.84, -0.60, -0.62);
    ctx.quadraticCurveTo(0.0, -0.66, P(0.50, 0.66), -0.36);
    ctx.closePath(); ctx.fill();
    return;
  }
  if (style.crown === 'turban') return; // turban replaces hair entirely
  // one solid cap: outer edge rides just above the skull, inner edge = hairline
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(P(0.80, 0.92), -0.36);                                // temple, face side
  ctx.quadraticCurveTo(P(0.55, 0.72), -0.72, P(0.08, 0.28), -0.80); // hairline over forehead
  ctx.quadraticCurveTo(-0.56, -0.88, -0.86, -0.50);                // hairline to back
  ctx.lineTo(-0.97, -0.44);                                        // out past silhouette
  ctx.quadraticCurveTo(-1.02, -0.98, -0.34, -1.18);                // back crown, proud of skull
  ctx.quadraticCurveTo(P(0.40, 0.62), -1.14, P(0.72, 0.86), -0.66);// over the top
  ctx.quadraticCurveTo(P(0.82, 0.94), -0.50, P(0.80, 0.92), -0.36);// down to temple
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba('#26130a', 0.45); ctx.lineWidth = 0.04; ctx.stroke();
  // single sheen band
  ctx.strokeStyle = rgba(cHi, 0.45); ctx.lineWidth = 0.09; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(-0.10, -0.20, 0.80, -2.15, -1.45); ctx.stroke();
  if (mode === 'topknot') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(-0.16, -1.24, 0.27, 0.21, -0.18, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(cHi, 0.5); ctx.lineWidth = 0.05;
    ctx.beginPath(); ctx.arc(-0.18, -1.24, 0.16, -2.6, -1.0); ctx.stroke();
    ctx.strokeStyle = '#8a2f1d'; ctx.lineWidth = 0.055;
    ctx.beginPath(); ctx.arc(-0.16, -1.09, 0.15, -0.5, 0.8); ctx.stroke();
  } else if (mode === 'sagebun') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(-0.06, -1.20, 0.34, 0.26, -0.12, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(cHi, 0.4); ctx.lineWidth = 0.04;
    ctx.beginPath(); ctx.arc(-0.06, -1.20, 0.24, 2.6, 5.6); ctx.stroke();
  } else if (mode === 'braid' || mode === 'long') {
    ctx.strokeStyle = rgba('#000', 0.35); ctx.lineWidth = 0.03;
    ctx.beginPath(); ctx.moveTo(P(0.3, 0.44), -0.86); ctx.quadraticCurveTo(-0.1, -1.06, -0.48, -0.90); ctx.stroke();
    if (style.hairFlowers) {
      ctx.fillStyle = '#fdf4e0';
      for (let i = 0; i < 4; i++) {
        const u = i / 3;
        ctx.beginPath();
        ctx.arc(lerp(-0.76, -0.42, u), lerp(-0.05, -0.88, u), 0.05, 0, TAU);
        ctx.fill();
      }
    }
  }
}

function crown3Mukut(ctx, tn) {
  const P = (front, prof) => lerp(front, prof, tn);
  const g = ctx.createLinearGradient(-0.5, -1.6, 0.5, -0.6);
  g.addColorStop(0, GOLD_D); g.addColorStop(0.5, GOLD_L); g.addColorStop(1, GOLD_D);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(P(0.72, 0.86), -0.52);
  ctx.quadraticCurveTo(P(0.55, 0.68), -1.14, P(0.16, 0.24), -1.26);
  ctx.lineTo(P(0.0, 0.08), -1.66);
  ctx.lineTo(-0.32, -1.28);
  ctx.quadraticCurveTo(-0.85, -1.14, -0.94, -0.52);
  ctx.quadraticCurveTo(-0.1, -0.94, P(0.72, 0.86), -0.52);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba('#5c3a08', 0.9); ctx.lineWidth = 0.04; ctx.stroke();
  // band hugging the hairline
  ctx.strokeStyle = GOLD_D; ctx.lineWidth = 0.11; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(P(0.74, 0.88), -0.48); ctx.quadraticCurveTo(-0.1, -0.92, -0.92, -0.48); ctx.stroke();
  ctx.fillStyle = '#b41f2e'; ctx.beginPath(); ctx.arc(P(-0.06, 0.14), -1.22, 0.085, 0, TAU); ctx.fill();
  ctx.fillStyle = GOLD_L; ctx.beginPath(); ctx.arc(P(0.0, 0.08), -1.70, 0.05, 0, TAU); ctx.fill();
}
function crown3Tiara(ctx, tn) {
  const P = (front, prof) => lerp(front, prof, tn);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 0.055; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(P(0.62, 0.78), -0.50);
  ctx.quadraticCurveTo(-0.05, -1.02, -0.74, -0.60);
  ctx.stroke();
  ctx.fillStyle = '#f6ecd8';
  for (let i = 1; i < 5; i++) {
    const u = i / 5;
    ctx.beginPath();
    ctx.arc(lerp(P(0.62, 0.78), -0.74, u), -0.52 + Math.sin(u * Math.PI) * -0.26, 0.028, 0, TAU);
    ctx.fill();
  }
  // maang tikka on the hair parting
  ctx.strokeStyle = GOLD; ctx.lineWidth = 0.028;
  ctx.beginPath(); ctx.moveTo(P(0.02, 0.30), -0.90); ctx.quadraticCurveTo(P(0.01, 0.36), -0.64, P(0.01, 0.40), -0.52); ctx.stroke();
  ctx.fillStyle = GOLD_L; ctx.beginPath(); ctx.arc(P(0.01, 0.40), -0.48, 0.052, 0, TAU); ctx.fill();
  ctx.fillStyle = '#b41f2e'; ctx.beginPath(); ctx.arc(P(0.01, 0.40), -0.48, 0.025, 0, TAU); ctx.fill();
}
function crown3Turban(ctx, style, tn) {
  const P = (front, prof) => lerp(front, prof, tn);
  const c1 = style.turbanColor || '#b3452c';
  // dome covering the whole crown
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.moveTo(P(0.86, 0.98), -0.30);
  ctx.quadraticCurveTo(P(0.80, 0.92), -0.98, P(0.10, 0.24), -1.24);
  ctx.quadraticCurveTo(-0.70, -1.30, -0.96, -0.66);
  ctx.quadraticCurveTo(-1.06, -0.34, -0.94, -0.16);
  ctx.quadraticCurveTo(-0.4, -0.52, P(0.30, 0.44), -0.52);
  ctx.quadraticCurveTo(P(0.66, 0.80), -0.44, P(0.86, 0.98), -0.30);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba('#26130a', 0.7); ctx.lineWidth = 0.045; ctx.stroke();
  // wrap bands
  ctx.strokeStyle = rgba('#000', 0.20); ctx.lineWidth = 0.05;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-0.10 + i * 0.05, -0.42, 0.80 - i * 0.15, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
  }
  ctx.fillStyle = GOLD;
  ctx.beginPath(); ctx.arc(P(0.36, 0.52), -0.94, 0.075, 0, TAU); ctx.fill();
}
function peacock3(ctx, tn, t, seed) {
  ctx.save();
  ctx.translate(-0.18, -1.12); ctx.rotate(-0.45 + sfbm1(t * 0.7, seed) * 0.05);
  ctx.strokeStyle = '#2e6b2e'; ctx.lineWidth = 0.03;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0.08, -0.3, 0.04, -0.54); ctx.stroke();
  const g = ctx.createRadialGradient(0.04, -0.64, 0.01, 0.04, -0.64, 0.26);
  g.addColorStop(0, '#0d2c6e'); g.addColorStop(0.5, '#1f7a4d'); g.addColorStop(1, 'rgba(46,168,106,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0.04, -0.64, 0.18, 0.28, 0.08, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0d2c6e'; ctx.beginPath(); ctx.ellipse(0.04, -0.62, 0.06, 0.1, 0.08, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c98f1e'; ctx.beginPath(); ctx.ellipse(0.04, -0.58, 0.028, 0.04, 0.08, 0, TAU); ctx.fill();
  ctx.restore();
}

// ───────────────────────── FIGURE v3 ─────────────────────────
// Same pose semantics as v2 (sh/el/hip/knee are FK joint angles), but each
// limb renders as ONE smooth tapered ribbon through the implied joint.
const FIG3 = {
  H: 400, headR: 30, neck: 15,
  shoulderW: 47, waistW: 29, hipW: 35,
  upperArm: 63, foreArm: 57,
  thigh: 97, shin: 93, footL: 30,
};

function armChain3(shx, shy, a, build) {
  const ua = FIG3.upperArm * build, fa = FIG3.foreArm * build;
  const a1 = a.sh || 0;
  const ex = shx + Math.sin(a1) * ua, ey = shy + Math.cos(a1) * ua;
  const a2 = a1 + (a.el || 0);
  const wx = ex + Math.sin(a2) * fa, wy = ey + Math.cos(a2) * fa;
  return { sh: [shx, shy], el: [ex, ey], wr: [wx, wy], a1, a2 };
}

// one ribbon through sh→el→wr (or hip→knee→ankle); rounded elbow, no seams
function limbRibbon3(ctx, ch, w0, w1, w2, col, dark, noStroke) {
  const spine = [
    ch.sh,
    [lerp(ch.sh[0], ch.el[0], 0.55), lerp(ch.sh[1], ch.el[1], 0.55)],
    ch.el,
    [lerp(ch.el[0], ch.wr[0], 0.45), lerp(ch.el[1], ch.wr[1], 0.45)],
    ch.wr,
  ];
  ribbon(ctx, spine, u => u < 0.5 ? lerp(w0, w1, smooth(u * 2)) : lerp(w1, w2, smooth((u - 0.5) * 2)));
  ctx.fillStyle = col; ctx.fill();
  ctx.save(); ctx.clip();
  const dx = ch.wr[0] - ch.sh[0], dy = ch.wr[1] - ch.sh[1];
  const L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const g = ctx.createLinearGradient(ch.el[0] + nx * w1 * 1.4, ch.el[1] + ny * w1 * 1.4, ch.el[0] - nx * w1 * 1.4, ch.el[1] - ny * w1 * 1.4);
  g.addColorStop(0, 'rgba(255,240,210,0.10)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, rgba(dark, 0.32));
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  if (!noStroke) { ctx.strokeStyle = rgba('#26130a', 0.55); ctx.lineWidth = 1.9; ctx.stroke(); }
}

// shaped hand library (unit ≈ 20px at s=1)
function hand3(ctx, x, y, ang, s, skin, kind, dark) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  ctx.fillStyle = skin;
  ctx.strokeStyle = rgba('#26130a', 0.62); ctx.lineWidth = 1.5 / s;
  ctx.beginPath();
  if (kind === 'fist' || kind === 'hold') {
    ctx.moveTo(-6, -1);
    ctx.quadraticCurveTo(-8, 6, -4, 10.5);
    ctx.quadraticCurveTo(1, 14, 6, 10);
    ctx.quadraticCurveTo(8.5, 5, 6, 0);
    ctx.quadraticCurveTo(0, -3.5, -6, -1);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = rgba(dark, 0.5); ctx.lineWidth = 1.1 / s;
    ctx.beginPath(); ctx.moveTo(-3.5, 3); ctx.quadraticCurveTo(0.5, 5, 4.5, 3.4); ctx.stroke();
    // thumb across
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-5.5, 2); ctx.quadraticCurveTo(-2, 7.5, 2.5, 6.5);
    ctx.quadraticCurveTo(-1, 9.5, -4.5, 7);
    ctx.quadraticCurveTo(-6.5, 5, -5.5, 2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#26130a', 0.5); ctx.stroke();
  } else if (kind === 'open' || kind === 'bless') {
    ctx.moveTo(-5.5, -1);
    ctx.quadraticCurveTo(-7.5, 7, -4, 14);
    ctx.quadraticCurveTo(-1, 17.5, 2.5, 16);
    ctx.quadraticCurveTo(7, 13, 6.5, 5);
    ctx.quadraticCurveTo(6, -1, 3, -2);
    ctx.quadraticCurveTo(-2, -3.5, -5.5, -1);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // finger cuts (two)
    ctx.strokeStyle = rgba(dark, 0.55); ctx.lineWidth = 1.0 / s;
    ctx.beginPath(); ctx.moveTo(-1.4, 4); ctx.lineTo(-1.8, 13.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2.2, 3.5); ctx.lineTo(2.4, 12.5); ctx.stroke();
    // thumb
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-5, 0); ctx.quadraticCurveTo(-9.5, 3.5, -8.5, 8);
    ctx.quadraticCurveTo(-6.5, 8.5, -5, 6);
    ctx.quadraticCurveTo(-4.2, 3, -5, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#26130a', 0.55); ctx.stroke();
  } else if (kind === 'point') {
    ctx.moveTo(-5.5, -1);
    ctx.quadraticCurveTo(-7, 5, -3.5, 9.5);
    ctx.quadraticCurveTo(1, 12.5, 5, 9);
    ctx.quadraticCurveTo(7, 5.5, 5.5, 1.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // index finger
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(1, 8); ctx.quadraticCurveTo(2.8, 15.5, 2.2, 18.5);
    ctx.quadraticCurveTo(0.4, 19.6, -0.6, 18);
    ctx.quadraticCurveTo(-1.5, 12, -2.2, 8.6);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#26130a', 0.55); ctx.stroke();
  } else if (kind === 'namaste') {
    ctx.moveTo(-3.5, -2);
    ctx.quadraticCurveTo(-5.5, 6, -3, 16);
    ctx.quadraticCurveTo(0, 19.5, 3, 16);
    ctx.quadraticCurveTo(5.5, 6, 3.5, -2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = rgba(dark, 0.5); ctx.lineWidth = 1.0 / s;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 15); ctx.stroke();
  } else { // relaxed: soft mitt, slight curl
    ctx.moveTo(-5.5, -1.5);
    ctx.quadraticCurveTo(-7, 6, -3.5, 12.5);
    ctx.quadraticCurveTo(-0.5, 16, 3, 13.5);
    ctx.quadraticCurveTo(6.5, 9.5, 5, 2.5);
    ctx.quadraticCurveTo(3.5, -2.5, -5.5, -1.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = rgba(dark, 0.5); ctx.lineWidth = 1.0 / s;
    ctx.beginPath(); ctx.moveTo(-0.6, 4.5); ctx.quadraticCurveTo(0.2, 9, -0.4, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2.6, 3.6); ctx.quadraticCurveTo(3.4, 7.5, 2.6, 10.6); ctx.stroke();
  }
  ctx.restore();
}

function foot3(ctx, x, y, s, facing, skin, dark) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * facing, s);
  ctx.fillStyle = skin;
  ctx.strokeStyle = rgba('#26130a', 0.62); ctx.lineWidth = 1.5 / s;
  ctx.beginPath();
  ctx.moveTo(-7, -13);                       // ankle back
  ctx.quadraticCurveTo(-9.5, -4, -7.5, -1);  // heel
  ctx.quadraticCurveTo(-2, 1.5, 10, 0.8);    // sole → toes
  ctx.quadraticCurveTo(15.5, 0.2, 15, -2.6); // toe tip
  ctx.quadraticCurveTo(9, -6.5, 2, -8.5);    // instep
  ctx.quadraticCurveTo(-2, -10, -2.5, -13);  // ankle front
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = rgba(dark, 0.45); ctx.lineWidth = 1.0 / s;
  ctx.beginPath(); ctx.moveTo(8.5, -1.2); ctx.lineTo(8.2, -3.4); ctx.stroke();
  ctx.restore();
}

// main figure: same opts contract as drawFigure
function drawFigure3(ctx, o) {
  const st = o.style, pose = Object.assign(typeof defaultPose === 'function' ? defaultPose() : {}, o.pose);
  const build = st.build || 1;
  const vS = st.heightScale || 1;
  const shMul = st.shoulderScale || 1;
  const female = !!st.female;
  const t = o.t || 0, seed = o.seed || 1;
  const skin = st.skin, dark = st.skinShade || shade(skin, -0.3);
  const OUT = rgba('#26130a', 0.55);

  if (o.shadow !== false) contactShadow(ctx, o.x, o.y + 4, 92 * o.s * build, 0.32);

  ctx.save();
  ctx.translate(o.x, o.y - (pose.bob || 0));
  ctx.scale(o.s * (o.facing || 1), o.s);
  ctx.scale(1, vS);

  const br = Math.sin(t * 1.5 + seed * 3) * 0.5 + 0.5;   // breath
  const headR = FIG3.headR * build * (female ? 0.95 : 1);
  const shW = FIG3.shoulderW * build * (female ? 0.8 : 1) * shMul;
  const hipW = FIG3.hipW * build * (female ? 1.1 : 1);
  const lean = pose.lean || 0;
  const chestDx = Math.sin(lean) * 95;                   // line of action: chest leads
  const hipDx = -chestDx * 0.25;                         // hips counter

  const hipY = -(FIG3.thigh + FIG3.shin) * build - 14;
  const shoulderY = hipY - 122 * build - br * 1.4;
  const waistY = lerp(shoulderY, hipY, 0.62);

  const shC = [chestDx, shoulderY + 6];                  // shoulder centre
  const hipC = [hipDx, hipY];

  const skirted = st.garb === 'sari' || st.garb === 'robe';
  const bare = !female && (st.garb === 'dhoti' || st.garb === 'royal');
  const armW = 10.5 * build * (female ? 0.78 : 1);
  const cm = st.clothMain || (female ? '#8c1f28' : '#ece2c8');

  // draws one full arm (ribbon + sleeve + ornaments + hand)
  function arm3(a, side) {  // side +1 near, -1 far
    const shx = shC[0] + shW * (side > 0 ? 0.60 : -0.58);
    const shy = shC[1] + (side > 0 ? 9 : 7);
    const col = side > 0 ? skin : shade(skin, -0.14);
    const ch = armChain3(shx, shy, a, build);
    limbRibbon3(ctx, ch, armW * 1.14, armW * 0.82, armW * 0.55, col, dark);
    // deltoid cap: hides the ribbon/torso seam, adds painterly form
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(shx, shy + 1, armW * 1.02, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(dark, side > 0 ? 0.20 : 0.28);
    ctx.beginPath(); ctx.arc(shx + 2, shy + 4, armW * 0.9, -0.3, 1.9); ctx.fill();
    // sari blouse sleeve over the upper arm
    if (female && st.garb === 'sari') {
      const sc = side > 0 ? cm : shade(cm, -0.16);
      const sl = { sh: ch.sh, el: [lerp(ch.sh[0], ch.el[0], 0.62), lerp(ch.sh[1], ch.el[1], 0.62)] };
      ribbon(ctx, [sl.sh, [lerp(sl.sh[0], sl.el[0], 0.5), lerp(sl.sh[1], sl.el[1], 0.5)], sl.el],
        u => lerp(armW * 1.3, armW * 0.95, u));
      ctx.fillStyle = sc; ctx.fill();
      ctx.strokeStyle = rgba('#26130a', 0.45); ctx.lineWidth = 1.4; ctx.stroke();
      if (st.clothAccent) {
        ctx.strokeStyle = st.clothAccent; ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(sl.el[0], sl.el[1], armW * 0.9, ch.a1 + Math.PI / 2 - 1.1, ch.a1 + Math.PI / 2 + 1.1);
        ctx.stroke();
      }
    }
    if (st.armlets) {
      ctx.fillStyle = side > 0 ? GOLD : GOLD_D;
      ctx.beginPath();
      ctx.ellipse(lerp(ch.sh[0], ch.el[0], 0.48), lerp(ch.sh[1], ch.el[1], 0.48), armW * 1.0, 4.4, ch.a1, 0, TAU);
      ctx.fill();
    }
    if (female && st.bangles) {
      ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const u = 0.76 + i * 0.075;
        ctx.beginPath();
        ctx.ellipse(lerp(ch.el[0], ch.wr[0], u), lerp(ch.el[1], ch.wr[1], u), armW * 0.66, 2.8, ch.a2 + Math.PI / 2, 0, TAU);
        ctx.stroke();
      }
    }
    hand3(ctx, ch.wr[0], ch.wr[1], -ch.a2 + (a.wr || 0), build * (female ? 0.82 : 0.95), col, a.hand || 'relaxed', dark);
    return ch;
  }

  // one full leg as a single ribbon + foot
  function leg3(Lg, front) {
    const L = Lg || { hip: 0, knee: 0 };
    const hx = hipC[0] + (front ? 7 : -8), hy = hipC[1] + 8;
    const th = FIG3.thigh * build, sh2 = FIG3.shin * build;
    const kx = hx + Math.sin(L.hip || 0) * th;
    const ky = hy + Math.cos(L.hip || 0) * th;
    const ax = kx + Math.sin((L.hip || 0) - (L.knee || 0)) * sh2;
    const ay = Math.min(ky + Math.cos((L.hip || 0) - (L.knee || 0)) * sh2, -13);
    const col = front ? skin : shade(skin, -0.12);
    const wTh = 15.5 * build * (female ? 1.02 : 1), wAn = 6.8 * build;
    if (!skirted) {
      limbRibbon3(ctx, { sh: [hx, hy], el: [kx, ky], wr: [ax, ay] }, wTh, wTh * 0.62, wAn, col, dark);
      if (female && st.anklets) {
        ctx.strokeStyle = GOLD; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(ax - 7, ay - 1); ctx.lineTo(ax + 7, ay - 1); ctx.stroke();
      }
      foot3(ctx, ax + 2, ay + 13, build, 1, col, dark);
    } else {
      foot3(ctx, ax + 2, Math.min(ay + 13, -1), build, 1, col, dark);
    }
    return [ax, ay];
  }

  // ── far arm, far leg (behind) ──
  arm3(pose.armB || { sh: -0.1, el: 0.12 }, -1);
  leg3(pose.legB, false);

  // ── torso: one vase silhouette shoulders→waist→hips ──
  const torsoPath = () => {
    ctx.beginPath();
    ctx.moveTo(shC[0] - shW, shC[1] + 2);
    ctx.quadraticCurveTo(chestDx - shW * 1.0, lerp(shoulderY, waistY, 0.45), lerp(chestDx, hipDx, 0.6) - FIG3.waistW * build, waistY);
    ctx.quadraticCurveTo(hipDx - hipW * 1.04, lerp(waistY, hipY, 0.6), hipDx - hipW, hipY + 8);
    ctx.quadraticCurveTo(hipDx, hipY + 15, hipDx + hipW, hipY + 8);
    ctx.quadraticCurveTo(hipDx + hipW * 1.04, lerp(waistY, hipY, 0.6), lerp(chestDx, hipDx, 0.6) + FIG3.waistW * build, waistY);
    ctx.quadraticCurveTo(chestDx + shW * 1.0, lerp(shoulderY, waistY, 0.45), shC[0] + shW, shC[1] + 2);
    // shoulder top: gentle trapezius into the neck
    ctx.quadraticCurveTo(chestDx + shW * 0.6, shC[1] - 13, chestDx + 11 * build, shC[1] - 15);
    ctx.lineTo(chestDx - 11 * build, shC[1] - 15);
    ctx.quadraticCurveTo(chestDx - shW * 0.6, shC[1] - 13, shC[0] - shW, shC[1] + 2);
    ctx.closePath();
  };
  torsoPath();
  const torsoCol = bare ? skin : cm;
  ctx.fillStyle = torsoCol; ctx.fill();
  ctx.save(); ctx.clip();
  const tg = ctx.createLinearGradient(chestDx - shW, 0, chestDx + shW, 0);
  tg.addColorStop(0, rgba(bare ? dark : shade(torsoCol, -0.4), 0.38));
  tg.addColorStop(0.42, 'rgba(0,0,0,0)');
  tg.addColorStop(1, 'rgba(255,240,205,0.10)');
  ctx.fillStyle = tg; ctx.fillRect(chestDx - shW * 1.6, shC[1] - 16, shW * 3.2, hipY - shC[1] + 40);
  if (bare) {
    ctx.strokeStyle = rgba(dark, 0.5); ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.moveTo(chestDx - shW * 0.42, shC[1] + 24); ctx.quadraticCurveTo(chestDx, shC[1] + 30, chestDx + shW * 0.42, shC[1] + 23); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(chestDx + 2, shC[1] + 36); ctx.quadraticCurveTo(lerp(chestDx, hipDx, 0.5), waistY - 12, hipDx + 1, waistY + 6); ctx.stroke();
    if (st.sacredThread) {
      ctx.strokeStyle = '#f5ead2'; ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(chestDx - shW * 0.6, shC[1] + 10);
      ctx.quadraticCurveTo(lerp(chestDx, hipDx, 0.5) + 8, waistY - 26, hipDx + FIG3.waistW * build * 0.75, waistY + 4);
      ctx.stroke();
    }
  }
  ctx.restore();
  torsoPath(); ctx.strokeStyle = rgba('#26130a', 0.6); ctx.lineWidth = 1.9; ctx.stroke();

  // ── lower garment (defines the figure's lower silhouette) ──
  garment3(ctx, st, hipC, hipY, hipW, build, t, seed, female, pose);

  // ── near leg (over the dhoti wrap edge) ──
  leg3(pose.legF, true);

  // ── ornaments ──
  const lv = st.ornaments || 0;
  if (lv >= 1) {
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(chestDx - 17, shC[1] + 5); ctx.quadraticCurveTo(chestDx, shC[1] + 23, chestDx + 17, shC[1] + 5); ctx.stroke();
  }
  if (lv >= 2) {
    beadArc(ctx, chestDx, shC[1] + 1, 27, Math.PI * 0.25, Math.PI * 0.75, 7, 2.2, '#f6e7bf');
  }
  if (st.mala) {
    ctx.strokeStyle = '#6d4423'; ctx.lineWidth = 2.8; ctx.setLineDash([3.2, 3]);
    ctx.beginPath(); ctx.moveTo(chestDx - 16, shC[1] + 7); ctx.quadraticCurveTo(chestDx, waistY - 14, chestDx + 16, shC[1] + 7); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── near arm ──
  arm3(pose.armF || { sh: 0.12, el: 0.15 }, +1);

  // ── neck + head ──
  const headCy = shoulderY - FIG3.neck * build - headR * 0.9;
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(chestDx - 10 * build, shoulderY - 12);
  ctx.quadraticCurveTo(chestDx - 9 * build, headCy + headR * 0.7, chestDx - 8 * build, headCy + headR * 0.5);
  ctx.lineTo(chestDx + 9 * build, headCy + headR * 0.5);
  ctx.quadraticCurveTo(chestDx + 10 * build, headCy + headR * 0.7, chestDx + 11 * build, shoulderY - 12);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba('#26130a', 0.4); ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = rgba(dark, 0.3);
  ctx.beginPath(); ctx.ellipse(chestDx + 0.5, headCy + headR * 0.62, 9.5 * build, 4, 0, 0, TAU); ctx.fill();

  ctx.save();
  ctx.translate(chestDx + Math.sin(pose.headTilt || 0) * 4, headCy);
  ctx.rotate((pose.headNod || 0) * 0.8 + (pose.headTilt || 0) * 0.4);
  const face = Object.assign({ turn: pose.headTurn == null ? 0.5 : clamp(pose.headTurn * 1.6, 0, 1) }, pose.face);
  drawHead3(ctx, headR, st, face, t, seed);
  ctx.restore();

  if (st.wearGarland) {
    garlandStrand(ctx, chestDx - 24, shC[1] + 10, chestDx + 24, shC[1] + 10, 66, t, seed + 4, 0.72);
  }

  ctx.restore();
}

// lower garments v3: garment shapes ARE the silhouette
function garment3(ctx, st, hipC, hipY, hipW, build, t, seed, female, pose) {
  const sway = sfbm1(t * 0.65, seed + 2) * 5 + (pose.clothSway || 0);
  const spread = Math.abs(((pose.legF && pose.legF.hip) || 0) - ((pose.legB && pose.legB.hip) || 0));
  if (st.garb === 'sari' || st.garb === 'robe') {
    const cm = st.clothMain || '#8c1f28';
    // A-line skirt with drape S-curves
    ctx.beginPath();
    ctx.moveTo(hipC[0] - hipW - 1, hipY + 6);
    ctx.quadraticCurveTo(hipC[0] - hipW - 14, hipY + 90, hipC[0] - hipW - 22 + sway, -8);
    ctx.quadraticCurveTo(hipC[0] - hipW * 0.3, 4 + Math.abs(sway) * 0.4, hipC[0] + hipW * 0.6 + sway * 0.5, 2);
    ctx.quadraticCurveTo(hipC[0] + hipW + 20 + sway, -2, hipC[0] + hipW + 24 + sway, -10);
    ctx.quadraticCurveTo(hipC[0] + hipW + 13, hipY + 92, hipC[0] + hipW + 1, hipY + 6);
    ctx.quadraticCurveTo(hipC[0], hipY + 13, hipC[0] - hipW - 1, hipY + 6);
    ctx.closePath();
    const g = ctx.createLinearGradient(hipC[0] - hipW - 18, 0, hipC[0] + hipW + 20, 0);
    g.addColorStop(0, shade(cm, -0.3)); g.addColorStop(0.48, cm); g.addColorStop(1, shade(cm, -0.16));
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = rgba('#26130a', 0.62); ctx.lineWidth = 1.8; ctx.stroke();
    // drape folds: 3 S-curves
    ctx.strokeStyle = rgba('#000', 0.16); ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const u = (i + 0.6) / 3.4, x0 = lerp(hipC[0] - hipW * 0.7, hipC[0] + hipW * 0.7, u);
      ctx.beginPath();
      ctx.moveTo(x0, hipY + 16);
      ctx.quadraticCurveTo(x0 - 8 + sway * 0.4, hipY * 0.5, x0 + 10 * (u - 0.5) * 4 + sway, -12);
      ctx.stroke();
    }
    // hem
    ctx.strokeStyle = st.clothAccent || GOLD; ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(hipC[0] - hipW - 21 + sway, -10);
    ctx.quadraticCurveTo(hipC[0], 3 + Math.abs(sway) * 0.4, hipC[0] + hipW + 23 + sway, -12);
    ctx.stroke();
    // pallu (sari only): diagonal drape from shoulder, falling behind the hip
    if (female && st.garb === 'sari' && st.pallu !== false) {
      const shY = hipY - 150 * build; // approx chest
      const fl = sfbm1(t * 0.7, seed + 9);
      ctx.fillStyle = shade(cm, 0.07);
      ctx.beginPath();
      ctx.moveTo(hipC[0] + hipW * 0.7, hipY - 6);
      ctx.quadraticCurveTo(hipC[0] + 6, shY + 60, hipC[0] - hipW * 0.62, shY + 4);
      ctx.quadraticCurveTo(hipC[0] - hipW * 1.05, shY + 44 + fl * 6, hipC[0] - hipW * 1.02 + fl * 8, shY + 150);
      ctx.quadraticCurveTo(hipC[0] - hipW * 0.96 + fl * 10, shY + 208, hipC[0] - hipW * 0.7 + fl * 8, hipY + 40);
      ctx.quadraticCurveTo(hipC[0] - hipW * 0.2, hipY - 16, hipC[0] + hipW * 0.55, hipY - 18);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba('#26130a', 0.4); ctx.lineWidth = 1.4; ctx.stroke();
      ctx.strokeStyle = st.clothAccent || GOLD; ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(hipC[0] + hipW * 0.68, hipY - 8);
      ctx.quadraticCurveTo(hipC[0] + 4, shY + 58, hipC[0] - hipW * 0.60, shY + 3);
      ctx.stroke();
    }
  } else {
    // dhoti v3: one wrap around both legs; slit + pleat; hem responds to stance
    const cm = st.clothMain || '#ece2c8';
    const len = st.dhotiLen || 205;
    const hem = Math.min(-10, hipY + len);
    const spreadW = 10 + spread * 46;
    ctx.beginPath();
    ctx.moveTo(hipC[0] - hipW - 2, hipY + 4);
    ctx.quadraticCurveTo(hipC[0] - hipW - 8, hipY + len * 0.6, hipC[0] - hipW * 0.9 - spreadW * 0.4 + sway * 0.5, hem);
    ctx.quadraticCurveTo(hipC[0] - hipW * 0.2, hem + 7, hipC[0] + 4, hem + 2);        // hem valley between legs
    ctx.quadraticCurveTo(hipC[0] + hipW * 0.5, hem + 6, hipC[0] + hipW * 0.9 + spreadW * 0.5 + sway, hem - 2);
    ctx.quadraticCurveTo(hipC[0] + hipW + 9, hipY + len * 0.55, hipC[0] + hipW + 2, hipY + 4);
    ctx.quadraticCurveTo(hipC[0], hipY + 11, hipC[0] - hipW - 2, hipY + 4);
    ctx.closePath();
    const g = ctx.createLinearGradient(hipC[0] - hipW, 0, hipC[0] + hipW + 8, 0);
    g.addColorStop(0, shade(cm, -0.26)); g.addColorStop(0.45, cm); g.addColorStop(1, shade(cm, -0.12));
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = rgba('#26130a', 0.62); ctx.lineWidth = 1.8; ctx.stroke();
    // centre pleat fan (3 lines)
    ctx.strokeStyle = rgba('#000', 0.14); ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(hipC[0] + i * 4, hipY + 12);
      ctx.quadraticCurveTo(hipC[0] + i * 9 + sway * 0.4, hipY + len * 0.6, hipC[0] + i * 13 + sway * 0.7, hem + 2);
      ctx.stroke();
    }
    if (st.clothAccent) {
      ctx.strokeStyle = st.clothAccent; ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(hipC[0] - hipW * 0.9 - spreadW * 0.4 + sway * 0.5, hem + 1);
      ctx.quadraticCurveTo(hipC[0], hem + 8, hipC[0] + hipW * 0.9 + spreadW * 0.5 + sway, hem - 1);
      ctx.stroke();
    }
    // kamarband
    ctx.fillStyle = st.sash || shade(cm, -0.38);
    ctx.beginPath();
    ctx.moveTo(hipC[0] - hipW - 2, hipY + 2);
    ctx.quadraticCurveTo(hipC[0], hipY + 10, hipC[0] + hipW + 2, hipY + 2);
    ctx.lineTo(hipC[0] + hipW + 1, hipY + 11);
    ctx.quadraticCurveTo(hipC[0], hipY + 19, hipC[0] - hipW - 1, hipY + 11);
    ctx.closePath(); ctx.fill();
  }
}
